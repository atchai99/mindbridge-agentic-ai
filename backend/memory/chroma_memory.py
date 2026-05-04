import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from datetime import datetime
from collections import Counter
import json
from typing import List, Dict
import os

class ChromaMemoryStore:
    """
    Long-term memory storage using ChromaDB for RAG.
    Stores conversation history, emotional patterns, and therapeutic insights.
    All data persisted to ./chroma_db/
    """

    def __init__(self, persist_directory="./chroma_db"):
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        self._init_collections()

    def _init_collections(self):
        """Initialize ChromaDB collections safely"""
        self.conversation_collection = self._get_or_create_collection(
            "conversations", "User conversation history"
        )
        self.emotion_collection = self._get_or_create_collection(
            "emotional_patterns", "User emotional patterns over time"
        )
        self.insights_collection = self._get_or_create_collection(
            "therapeutic_insights", "Key therapeutic insights and themes"
        )

    def _get_or_create_collection(self, name: str, description: str):
        """Safely get or create a ChromaDB collection"""
        try:
            return self.client.get_collection(name)
        except ValueError:
            return self.client.create_collection(
                name=name,
                metadata={"description": description}
            )

    def add_conversation_turn(self, user_id: str, user_message: str,
                              agent_response: str, emotion: str,
                              intensity: str, therapeutic_style: str,
                              effectiveness_score: int, themes: List[str]):
        """Store a conversation turn with rich metadata"""
        embedding = self.embedding_model.encode(user_message).tolist()
        turn_id = f"{user_id}_{datetime.now().timestamp()}"

        self.conversation_collection.add(
            embeddings=[embedding],
            documents=[user_message],
            metadatas=[{
                "user_id": user_id,
                "timestamp": datetime.now().isoformat(),
                "emotion": emotion,
                "intensity": intensity,
                "therapeutic_style": therapeutic_style,
                "effectiveness_score": int(effectiveness_score),
                "themes": json.dumps(themes),
                "agent_response": agent_response[:500]
            }],
            ids=[turn_id]
        )

        self._store_emotion_pattern(user_id, emotion, intensity, user_message)

        if themes:
            self._store_therapeutic_insights(user_id, themes, user_message, agent_response)

    def _store_emotion_pattern(self, user_id: str, emotion: str,
                               intensity: str, message: str):
        embedding = self.embedding_model.encode(f"{emotion} {intensity}").tolist()
        pattern_id = f"emotion_{user_id}_{datetime.now().timestamp()}"

        self.emotion_collection.add(
            embeddings=[embedding],
            documents=[message],
            metadatas=[{
                "user_id": user_id,
                "emotion": emotion,
                "intensity": intensity,
                "timestamp": datetime.now().isoformat()
            }],
            ids=[pattern_id]
        )

    def _store_therapeutic_insights(self, user_id: str, themes: List[str],
                                    user_message: str, agent_response: str):
        themes_text = " ".join(themes)
        embedding = self.embedding_model.encode(themes_text).tolist()
        insight_id = f"insight_{user_id}_{datetime.now().timestamp()}"

        self.insights_collection.add(
            embeddings=[embedding],
            documents=[themes_text],
            metadatas=[{
                "user_id": user_id,
                "themes": json.dumps(themes),
                "timestamp": datetime.now().isoformat(),
                "context_snippet": user_message[:200]
            }],
            ids=[insight_id]
        )

    def retrieve_similar_conversations(self, user_id: str,
                                       current_message: str,
                                       n_results: int = 5) -> str:
        """RAG: Retrieve similar past conversations for context"""
        query_embedding = self.embedding_model.encode(current_message).tolist()

        try:
            results = self.conversation_collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where={"user_id": user_id}
            )
        except Exception:
            return "No previous conversations found."

        if not results['documents'] or len(results['documents'][0]) == 0:
            return "No previous conversations found."

        context_parts = []
        for i, (doc, metadata) in enumerate(zip(results['documents'][0],
                                                results['metadatas'][0])):
            context_parts.append(
                f"Previous conversation {i + 1}:\n"
                f"User said: {doc}\n"
                f"Emotion: {metadata['emotion']} ({metadata['intensity']})\n"
                f"Style used: {metadata['therapeutic_style']}\n"
                f"Effectiveness: {metadata['effectiveness_score']}/10\n"
            )

        return "\n".join(context_parts)

    def retrieve_emotional_patterns(self, user_id: str,
                                    n_results: int = 10) -> Dict:
        """Analyze user's emotional patterns over time"""
        try:
            results = self.emotion_collection.query(
                query_embeddings=[self.embedding_model.encode("emotion").tolist()],
                n_results=n_results,
                where={"user_id": user_id}
            )
        except Exception:
            return self._empty_patterns()

        if not results['metadatas'] or len(results['metadatas'][0]) == 0:
            return self._empty_patterns()

        emotions = [m['emotion'] for m in results['metadatas'][0]]
        intensities = [m['intensity'] for m in results['metadatas'][0]]
        emotion_freq = Counter(emotions)

        return {
            "dominant_emotion": emotion_freq.most_common(1)[0][0],
            "emotion_frequency": dict(emotion_freq),
            "intensity_trend": self._analyze_intensity_trend(intensities),
            "recent_emotions": emotions[:5]
        }

    def _empty_patterns(self) -> Dict:
        return {
            "dominant_emotion": "neutral",
            "emotion_frequency": {},
            "intensity_trend": "stable",
            "recent_emotions": []
        }

    def _analyze_intensity_trend(self, intensities: List[str]) -> str:
        intensity_map = {"low": 1, "medium": 2, "high": 3}
        values = [intensity_map.get(i, 2) for i in intensities]

        if len(values) < 3:
            return "stable"

        recent_avg = sum(values[:3]) / 3
        older_avg = sum(values[3:]) / len(values[3:]) if len(values) > 3 else recent_avg

        if recent_avg > older_avg + 0.5:
            return "increasing"
        elif recent_avg < older_avg - 0.5:
            return "decreasing"
        return "stable"

    def retrieve_therapeutic_insights(self, user_id: str,
                                      n_results: int = 3) -> List[str]:
        """Retrieve recurring therapeutic themes"""
        try:
            results = self.insights_collection.query(
                query_embeddings=[self.embedding_model.encode("themes").tolist()],
                n_results=n_results,
                where={"user_id": user_id}
            )
        except Exception:
            return []

        if not results['documents'] or len(results['documents'][0]) == 0:
            return []

        return results['documents'][0]

    def get_user_statistics(self, user_id: str) -> Dict:
        """Get comprehensive user statistics"""
        try:
            conv_results = self.conversation_collection.get(
                where={"user_id": user_id}
            )
        except Exception:
            conv_results = {"ids": [], "metadatas": []}

        total_conversations = len(conv_results['ids']) if conv_results['ids'] else 0
        emotional_patterns = self.retrieve_emotional_patterns(user_id, n_results=20)

        metadatas = conv_results.get('metadatas', []) or []
        avg_effectiveness = 0.0
        if metadatas:
            scores = [m.get('effectiveness_score', 0) for m in metadatas]
            avg_effectiveness = round(sum(scores) / len(scores), 2) if scores else 0.0

        return {
            "total_conversations": total_conversations,
            "emotional_patterns": emotional_patterns,
            "average_effectiveness": avg_effectiveness,
            "most_used_style": self._get_most_used_style(metadatas)
        }

    def _get_most_used_style(self, metadatas: List[Dict]) -> str:
        if not metadatas:
            return "none"
        styles = [m.get('therapeutic_style', 'unknown') for m in metadatas]
        style_counts = Counter(styles)
        return style_counts.most_common(1)[0][0] if style_counts else "none"

    def reset_user_data(self, user_id: str):
        """Clear all data for a specific user"""
        for collection in [self.conversation_collection,
                           self.emotion_collection,
                           self.insights_collection]:
            try:
                results = collection.get(where={"user_id": user_id})
                if results['ids']:
                    collection.delete(ids=results['ids'])
            except Exception:
                pass
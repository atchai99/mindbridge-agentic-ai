from memory.chroma_memory import ChromaMemoryStore
from langchain_core.prompts import ChatPromptTemplate
from agents.llm_config import llm

class RAGAgent:
    """
    Enhanced RAG with ChromaDB long-term memory.
    Retrieves similar conversations and emotional patterns,
    then injects them into the agent state as:
      - retrieved_context  (similar past conversations)
      - long_term_context  (emotional patterns + recurring themes)
    """

    def __init__(self):
        self.memory_store = ChromaMemoryStore()

        self.rag_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are analyzing conversation context from memory.

Retrieved Similar Conversations:
{retrieved_context}

Emotional Patterns:
{emotional_patterns}

Recurring Themes:
{themes}

Current User Message: {user_message}

Extract:
1. Key contextual insights relevant to current message
2. Emotional patterns that might inform response
3. Any recurring themes or concerns

Format as: "Context: [insights] | Patterns: [patterns] | Themes: [themes]"
"""),
            ("human", "{user_message}")
        ])

    def retrieve_and_inject(self, user_id: str, state: dict) -> dict:
        """
        Retrieve memory and inject retrieved_context + long_term_context into state.
        This is what gets called as a node in the graph.
        """
        user_message = state["user_message"]

        # Retrieve similar past conversations (vector similarity search)
        similar_convos = self.memory_store.retrieve_similar_conversations(
            user_id, user_message, n_results=5
        )

        # Retrieve emotional patterns
        emotional_patterns = self.memory_store.retrieve_emotional_patterns(user_id)
        patterns_text = (
            f"Dominant emotion: {emotional_patterns['dominant_emotion']} | "
            f"Recent: {', '.join(emotional_patterns['recent_emotions'])} | "
            f"Trend: {emotional_patterns['intensity_trend']}"
        )

        # Retrieve recurring themes
        themes = self.memory_store.retrieve_therapeutic_insights(user_id)
        themes_text = ", ".join(themes) if themes else "No recurring themes yet"

        # Use LLM to synthesize a concise long-term context summary
        chain = self.rag_prompt | llm
        result = chain.invoke({
            "retrieved_context": similar_convos,
            "emotional_patterns": patterns_text,
            "themes": themes_text,
            "user_message": user_message
        })

        return {
            **state,
            "retrieved_context": similar_convos,
            "long_term_context": result.content
        }

    def store_conversation(self, user_id: str, user_message: str,
                           agent_response: str, emotion: str,
                           intensity: str, therapeutic_style: str,
                           effectiveness_score: int, themes: list):
        """Store a completed conversation turn in ChromaDB"""
        self.memory_store.add_conversation_turn(
            user_id=user_id,
            user_message=user_message,
            agent_response=agent_response,
            emotion=emotion,
            intensity=intensity,
            therapeutic_style=therapeutic_style,
            effectiveness_score=effectiveness_score,
            themes=themes
        )

    def get_user_stats(self, user_id: str) -> dict:
        """Get comprehensive user statistics"""
        return self.memory_store.get_user_statistics(user_id)
from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Optional

from agents.emotion_agent import emotion_agent
from agents.empathetic_agent import empathetic_agent
from agents.cognitive_agent import cognitive_agent
from agents.behavioral_agent import behavioral_agent
from agents.meta_agent import meta_agent
from agents.scoring_agent import DetailedScoringAgent
from rag.rag_agent import RAGAgent


# ─────────────────────────────────────────────
# State Schema
# ─────────────────────────────────────────────

class MindBridgeState(TypedDict):
    user_message: str
    user_id: str
    chat_history: List[dict]

    primary_emotion: str
    intensity: str
    therapeutic_style: str
    key_themes: List[str]

    retrieved_context: str
    long_term_context: str

    agent_response: str

    effectiveness_score: int
    style_working: bool
    recommended_adjustment: str

    detailed_scores: Optional[dict]


# ─────────────────────────────────────────────
# Singletons
# ─────────────────────────────────────────────

rag_agent = RAGAgent()
scoring_agent = DetailedScoringAgent()


# ─────────────────────────────────────────────
# RAG Node
# ─────────────────────────────────────────────

def rag_node(state: MindBridgeState) -> MindBridgeState:
    return rag_agent.retrieve_and_inject(
        user_id=state["user_id"],
        state=state
    )


# ─────────────────────────────────────────────
# Therapy Response Node
# ─────────────────────────────────────────────

def therapy_node(state: MindBridgeState) -> MindBridgeState:
    style = state.get("therapeutic_style", "empathetic_listening")

    if style == "empathetic_listening":
        result = empathetic_agent(state)

    elif style == "cognitive_reflection":
        result = cognitive_agent(state)

    elif style == "behavioral_coach":
        result = behavioral_agent(state)

    else:
        # Safe fallback
        result = empathetic_agent(state)

    return {
        **state,
        "agent_response": result.get("agent_response", "")
    }


# ─────────────────────────────────────────────
# Scoring Node
# ─────────────────────────────────────────────

def scoring_node(state: MindBridgeState) -> MindBridgeState:
    scores = scoring_agent.calculate_detailed_scores(
        user_message=state["user_message"],
        emotion=state["primary_emotion"],
        intensity=state["intensity"],
        agent_response=state["agent_response"],
        therapeutic_style=state["therapeutic_style"]
    )

    effectiveness_score = int(
        round(scores.get("overall_score", 5))
    )

    return {
        **state,
        "detailed_scores": scores,
        "effectiveness_score": effectiveness_score
    }


# ─────────────────────────────────────────────
# Persist Node
# ─────────────────────────────────────────────

def persist_node(state: MindBridgeState) -> MindBridgeState:
    try:
        rag_agent.store_conversation(
            user_id=state["user_id"],
            user_message=state["user_message"],
            agent_response=state["agent_response"],
            emotion=state["primary_emotion"],
            intensity=state["intensity"],
            therapeutic_style=state["therapeutic_style"],
            effectiveness_score=state.get("effectiveness_score", 5),
            themes=state.get("key_themes", [])
        )
    except Exception as e:
        print("Memory persistence warning:", str(e))

    return state


# ─────────────────────────────────────────────
# Build Graph
# ─────────────────────────────────────────────

def build_graph():
    builder = StateGraph(MindBridgeState)

    # Core nodes only
    builder.add_node("emotion", emotion_agent)
    builder.add_node("rag", rag_node)
    builder.add_node("meta", meta_agent)
    builder.add_node("therapy", therapy_node)
    builder.add_node("scoring", scoring_node)
    builder.add_node("persist", persist_node)

    # Correct sequential flow
    builder.set_entry_point("emotion")

    builder.add_edge("emotion", "rag")
    builder.add_edge("rag", "meta")
    builder.add_edge("meta", "therapy")
    builder.add_edge("therapy", "scoring")
    builder.add_edge("scoring", "persist")
    builder.add_edge("persist", END)

    return builder.compile()


# ─────────────────────────────────────────────
# Graph Instance
# ─────────────────────────────────────────────

mindbridge_graph = build_graph()


# ─────────────────────────────────────────────
# Runner
# ─────────────────────────────────────────────

def run_mindbridge(
    user_message: str,
    user_id: str = "default_user",
    chat_history: list = None
) -> dict:

    initial_state: MindBridgeState = {
        "user_message": user_message,
        "user_id": user_id,
        "chat_history": chat_history or [],

        "primary_emotion": "",
        "intensity": "",
        "therapeutic_style": "",
        "key_themes": [],

        "retrieved_context": "",
        "long_term_context": "",

        "agent_response": "",

        "effectiveness_score": 5,
        "style_working": True,
        "recommended_adjustment": "none",

        "detailed_scores": None
    }

    try:
        result = mindbridge_graph.invoke(initial_state)
        return result

    except Exception as e:
        print("WORKFLOW ERROR:", str(e))

        return {
            **initial_state,
            "agent_response": "I'm having trouble connecting right now. Please try again in a moment.",
            "primary_emotion": "neutral",
            "intensity": "medium",
            "therapeutic_style": "supportive_companion",
            "effectiveness_score": 5,
            "recommended_adjustment": "none"
        }
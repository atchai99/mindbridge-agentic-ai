from typing import TypedDict, List, Optional


class MindBridgeState(TypedDict):
    # ─────────────────────────────────────────────
    # Required at graph entry
    # ─────────────────────────────────────────────

    user_id: str
    user_message: str
    chat_history: List[dict]

    # ─────────────────────────────────────────────
    # Set by emotion_agent
    # ─────────────────────────────────────────────

    primary_emotion: str
    intensity: str
    therapeutic_style: str
    key_themes: List[str]

    # ─────────────────────────────────────────────
    # Set by RAG retrieval
    # ─────────────────────────────────────────────

    retrieved_context: str
    long_term_context: str

    # ─────────────────────────────────────────────
    # Set by therapy agent
    # ─────────────────────────────────────────────

    agent_response: str

    # ─────────────────────────────────────────────
    # Set by scoring/meta reflection
    # ─────────────────────────────────────────────

    detailed_scores: Optional[dict]

    effectiveness_score: int
    style_working: bool
    recommended_adjustment: str
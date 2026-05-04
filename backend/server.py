"""
MindBridge FastAPI Backend
Run with: uvicorn server:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

from graph.workflow import run_mindbridge

app = FastAPI(title="MindBridge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    user_id: str
    message: str
    chat_history: Optional[List[ChatMessage]] = []


@app.get("/")
def root():
    return {"status": "MindBridge API running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat")
def chat(req: ChatRequest):
    history = [{"role": m.role, "content": m.content} for m in req.chat_history]

    result = run_mindbridge(
        user_message=req.message,
        user_id=req.user_id,
        chat_history=history
    )

    return {
        "response":               result.get("agent_response", ""),
        "emotion":                result.get("primary_emotion", "neutral"),
        "intensity":              result.get("intensity", "low"),
        "therapeutic_style":      result.get("therapeutic_style", "supportive_companion"),
        "effectiveness_score":    result.get("effectiveness_score", 5),
        "detailed_scores":        result.get("detailed_scores"),
        "recommended_adjustment": result.get("recommended_adjustment", "none"),
        "key_themes":             result.get("key_themes", []),
        "style_working":          result.get("style_working", True),
    }


@app.get("/stats/{user_id}")
def get_stats(user_id: str):
    from rag.rag_agent import RAGAgent
    rag = RAGAgent()
    return rag.get_user_stats(user_id)


if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
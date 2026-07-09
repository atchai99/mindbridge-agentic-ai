MindBridge: Agentic Mental Health AI
=====================================

MindBridge is a multi-agent framework for AI-assisted mental health support,
built around a graph of specialized agents that analyze, respond to, and
score every message in a conversation. Rather than a single prompt driving a
single response, MindBridge routes each message through a pipeline of agents
that assess emotional state, retrieve relevant history, select an
appropriate therapeutic approach, generate a response, and then critique
that response for quality and safety before it reaches the user.

MindBridge runs entirely locally, with no cloud dependency for its memory or
data storage — conversation history, emotional patterns, and therapeutic
insights are all persisted on-disk via ChromaDB. The only external calls are
to an LLM provider (currently Groq) for language generation.

**This is a research/learning project, not a clinical tool.** It is not a
substitute for professional mental health care, and its safety systems,
while actively developed, should not be relied upon as a sole safeguard in
any real deployment involving vulnerable users.


Architecture
------------

Each incoming message flows through a sequential graph of agents
(built with [LangGraph](https://github.com/langchain-ai/langgraph)):

```
 user message
      │
      ▼
 ┌─────────────┐
 │  Emotion    │   Classifies primary emotion + intensity
 │  Agent      │
 └──────┬──────┘
        ▼
 ┌─────────────┐
 │  RAG /      │   Retrieves similar past conversations, recurring
 │  Memory     │   emotional patterns, and therapeutic themes from
 │  Retrieval  │   ChromaDB for this user
 └──────┬──────┘
        ▼
 ┌─────────────┐
 │  Meta       │   Routes to the therapeutic style best suited to
 │  Agent      │   the message: empathetic listening, cognitive
 └──────┬──────┘   reflection, or behavioral coaching
        ▼
 ┌─────────────┐
 │  Therapy    │   Generates the actual response, using the style
 │  Agent      │   chosen above and any retrieved context
 └──────┬──────┘
        ▼
 ┌─────────────┐
 │  Scoring    │   Scores the response across 7 dimensions (safety,
 │  Agent      │   empathy, therapeutic alignment, etc.) and runs a
 └──────┬──────┘   dedicated risk-classification pass on the user's
        ▼          message
 ┌─────────────┐
 │  Persist    │   Stores the turn (message, response, scores,
 │  Node       │   emotion, themes) back into long-term memory
 └─────────────┘
```

### Agents

| Agent | File | Responsibility |
|---|---|---|
| Emotion Agent | `agents/emotion_agent.py` | Classifies the user's dominant emotion (stress, anxiety, sadness, anger, etc.) |
| RAG Agent | `rag/rag_agent.py` | Retrieves similar past conversations and long-term emotional/therapeutic context from ChromaDB |
| Meta Agent | `agents/meta_agent.py` | Routes the conversation to a therapeutic style based on the message and detected emotion |
| Empathetic Agent | `agents/empathetic_agent.py` | Warm, validating, emotionally-attuned responses |
| Cognitive Agent | `agents/cognitive_agent.py` | CBT-style responses that identify and reframe distorted thinking |
| Behavioral Agent | `agents/behavioral_agent.py` | Practical, action-oriented responses focused on small achievable steps |
| Scoring Agent | `agents/scoring_agent.py` | Scores every response for quality and safety; runs independent risk classification on the user's message |

### Safety & scoring system

The scoring agent (`agents/scoring_agent.py`) is the most safety-critical
component in the pipeline. It scores every turn across seven dimensions —
emotional validation, empathy, therapeutic alignment, engagement quality,
safety appropriateness, response relevance, and depth of insight — and
layers several independent signals to catch risk that a single check would
miss:

1. **Keyword matching** against a curated list of explicit high-risk
   phrases, for fast, deterministic detection with no LLM round-trip.
2. **A calibrated 3-tier risk classifier** (`NONE` / `MODERATE` / `HIGH`)
   that judges intent and tone rather than relying on exact phrasing —
   distinguishing an explicit statement of intent from general
   hopelessness or sadness, so the two aren't scored identically.
3. **Response-side inspection**: if the therapy agent's own reply contains
   refusal or crisis-redirect language (e.g. mentioning a crisis hotline),
   that's treated as an independent, authoritative signal, since the
   upstream generation model has already made its own judgment call.

A `HIGH` risk classification, or a response that flags itself, forces a
hard safety override on the score and sets `recommended_adjustment` to
`crisis_intervention_required`, regardless of what the rest of the pipeline
produced. `MODERATE` risk flows through normal scoring with a capped safety
ceiling and a `monitor_closely` flag, rather than being forced into the
same static override.

### Memory & RAG

MindBridge maintains three ChromaDB collections per user
(`memory/chroma_memory.py`):

- **Conversations** — full turn history with embeddings for similarity search
- **Emotional patterns** — emotion + intensity over time, used to compute
  trends (increasing / decreasing / stable)
- **Therapeutic insights** — recurring themes extracted across sessions

All of this is persisted to `./chroma_db/` on disk. There is no external
vector database or cloud memory service involved.


Repository Structure
---------------------

```
mindbridge-agentic-ai/
├── backend/
│   ├── agents/              # Emotion, meta, therapy, and scoring agents
│   ├── api/                 # (reserved for future route modules)
│   ├── graph/               # LangGraph state schema + workflow definition
│   ├── memory/              # ChromaDB-backed long-term memory
│   ├── rag/                 # Retrieval-augmented context injection
│   ├── server.py            # FastAPI app + /chat, /health, /stats endpoints
│   ├── evaluator.py         # Standalone CLI tool for comparing agent outputs
│   └── test.py              # Basic end-to-end smoke test for the pipeline
└── frontend/
    └── src/App.js           # React chat UI, pipeline visualization, score panels
```


Tech Stack
----------

**Backend:** Python, FastAPI, LangGraph, LangChain, Groq (LLM inference),
ChromaDB, Sentence-Transformers (embeddings)

**Frontend:** React, Axios

**Storage:** ChromaDB (local, persistent, on-disk — no cloud dependency)


Install
-------

Requires Python 3.10+ and Node.js 18+.

### Backend

1. Create and activate a virtual environment:

   ```sh
   cd backend
   python3 -m venv venv
   source venv/bin/activate    # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:

   ```sh
   pip install -r requirements.txt
   ```

3. Create a `.env` file in `backend/` (see `.env.example`) with:

   ```
   GROQ_API_KEY=your_groq_api_key_here
   ```

   Get a free API key at [console.groq.com](https://console.groq.com/).

### Frontend

```sh
cd frontend
npm install
```


Running
-------

### Backend

```sh
cd backend
uvicorn server:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Visit `/health` to
confirm it's running.

### Frontend

```sh
cd frontend
npm start
```

The chat UI will be available at `http://localhost:3000`.

### Command-line smoke test

To exercise the full pipeline without the frontend:

```sh
cd backend
python test.py
```

### Agent comparison tool

To compare how the three therapeutic styles respond to the same prompt
side-by-side:

```sh
cd backend
python evaluator.py
```


API Reference
--------------

### `POST /chat`

Runs a message through the full agent pipeline.

**Request:**

```json
{
  "user_id": "user_abc123",
  "message": "I've been feeling really overwhelmed lately.",
  "chat_history": [
    { "role": "human", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Response:**

```json
{
  "response": "...",
  "emotion": "stress",
  "intensity": "medium",
  "therapeutic_style": "empathetic_listening",
  "effectiveness_score": 8,
  "detailed_scores": {
    "overall_score": 8.1,
    "emotional_validation": 8.0,
    "empathy_level": 8.0,
    "therapeutic_alignment": 8.0,
    "engagement_quality": 7.0,
    "safety_appropriateness": 9.0,
    "response_relevance": 8.0,
    "depth_of_insight": 7.0,
    "strengths": "...",
    "areas_for_improvement": "...",
    "crisis_detected": false,
    "recommended_adjustment": "none"
  },
  "recommended_adjustment": "none",
  "key_themes": [],
  "style_working": true
}
```

### `GET /stats/{user_id}`

Returns aggregate statistics for a user from long-term memory: total
conversations, average effectiveness score, most-used therapeutic style,
and emotional pattern trends.

### `GET /health`

Basic liveness check.


Configuration
-------------

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | API key for Groq, used for all LLM calls (agent responses, emotion/style classification, and scoring) |

Two models are configured in `agents/llm_config.py`:

- `llm` (`llama-3.3-70b-versatile`) — used for agent responses and the
  scoring agent's risk classification, where more careful judgment matters.
- `llm_precise` (`llama-3.1-8b-instant`, low temperature) — used for
  faster, more constrained tasks like emotion labeling and response
  scoring.


Known Limitations & Roadmap
-----------------------------

- **`memory/mem0_manager.py`** is a placeholder for a future
  [Mem0](https://mem0.ai/) integration; all memory currently runs through
  ChromaDB.
- **`evaluator.py`** uses simple heuristic scoring (response length,
  keyword overlap) for its standalone comparison tool — it is a
  development aid, not the safety-scoring system used in production
  (that's `agents/scoring_agent.py`).
- **`rag/retriever.py`** is a deprecated stub kept only to avoid breaking
  legacy imports; all RAG logic now lives in `rag/rag_agent.py` and
  `memory/chroma_memory.py`.
- The scoring agent's risk classification is an actively-developed safety
  layer, not a clinically validated system. It should not be treated as a
  substitute for a real crisis-response pipeline in any production context.
- **Docker support is planned but not yet implemented.** The current ML
  dependencies (`torch`, `sentence-transformers`) are heavy enough that a
  naive container build would be slow and bloated; this needs a deliberate
  multi-stage build and a proper volume-mounted `chroma_db/` before it's
  worth shipping, rather than a quick `docker init`.


Developing
----------

See `DEVELOPING.md` for project structure details, guidance on adding new
therapeutic agents, notes on safely modifying the scoring agent, and
contribution conventions.


Author
------

MindBridge is developed by [Akshay Tirunelveli Sriram](https://github.com/atchai99).


License
-------

MindBridge is licensed under the MIT License. See `LICENSE` for details.

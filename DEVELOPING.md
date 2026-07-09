Developer Documentation
========================

This document covers project structure, development workflow, testing, and
conventions for working on MindBridge. For installation and running
instructions, see `README.md`.


Project Structure
------------------

- **`backend/agents/`** — Each agent is a standalone function (or class, in
  the scoring agent's case) that takes the shared pipeline state and returns
  an updated version of it. Agents don't call each other directly; they're
  wired together in `graph/workflow.py`.
- **`backend/graph/`** — `state.py` defines the `MindBridgeState` TypedDict
  shared across the whole pipeline. `workflow.py` wires the agents into a
  LangGraph `StateGraph` and defines the node order.
- **`backend/memory/`** — `chroma_memory.py` is the only implemented memory
  backend; it owns all reads/writes to the three ChromaDB collections
  (conversations, emotional patterns, insights). `mem0_manager.py` is an
  unimplemented placeholder — do not import it expecting working code.
- **`backend/rag/`** — `rag_agent.py` is the real retrieval logic, called as
  a graph node. `retriever.py` is a deprecated stub kept only so old imports
  don't break; don't add new logic there.
- **`backend/server.py`** — The only FastAPI entry point. `main.py` is
  explicitly deprecated (see its docstring) — don't run it.
- **`frontend/src/App.js`** — The entire chat UI lives in this one file:
  the message list, the pipeline-stage animation, and the `ScorePanel` /
  `ScoreBar` components that render `detailed_scores`. If you change a key
  name in `scoring_agent.py`'s return dict, update `SCORE_METRICS` in
  `App.js` to match, or that metric will silently render as `0`.


Development Setup
------------------

Follow the `README.md` install steps first. For active development:

```sh
cd backend
uvicorn server:app --reload --port 8000
```

`--reload` picks up most backend changes automatically. If you edit
`agents/llm_config.py` or add a new module-level import, restart the
process manually — reload doesn't always catch dependency graph changes
cleanly.

For the frontend, `npm start` already runs a dev server with hot reload.


Adding a New Therapeutic Agent
--------------------------------

To add a new therapeutic style (beyond empathetic listening, cognitive
reflection, and behavioral coaching):

1. Create `agents/your_agent.py` following the existing pattern: accept
   `state: dict`, return `{**state, "agent_response": ...}`, and wrap the
   LLM call in a `try`/`except` with a safe fallback string (see
   `empathetic_agent.py` for the reference shape).
2. Add a branch for it in `therapy_node()` in `graph/workflow.py`.
3. Update the routing instructions in `agents/meta_agent.py`'s prompt so
   the meta-agent knows when to select it.
4. Add a corresponding entry to `modeConfig` in `frontend/src/App.js` so
   the UI has a label/icon/color for it — otherwise it'll render with
   blank styling.


Working on the Scoring Agent
-------------------------------

`agents/scoring_agent.py` is the most safety-sensitive file in the
codebase. A few things to keep in mind before changing it:

- **Don't change the returned dict's key names** without also updating
  `SCORE_METRICS` in `frontend/src/App.js` and the `MindBridgeState`
  fields it feeds into in `graph/workflow.py` — a renamed key silently
  breaks the corresponding UI bar rather than raising an error.
- **Test risk classification changes against real conversation turns**,
  not just isolated strings. The risk classifier and the response-marker
  check both look at content produced elsewhere in the pipeline
  (`emotion`, `agent_response`), so a change that looks correct against a
  hand-written test string can still behave differently once it's wired
  into an actual multi-agent turn.
- **Prefer 3+ way classifications over binary yes/no** for anything
  risk-related. A binary check pushed toward "fail conservative" tends to
  over-trigger on ordinary sadness; a genuine 3-tier system (e.g.
  none/moderate/high) lets you calibrate each tier independently instead
  of collapsing everything into one hardcoded override.
- Watch your terminal output when testing — both the scoring agent and
  the other agents `print()` on LLM call failures (e.g. `"Scoring Agent
  Error:"`, `"Risk Classifier Error..."`). If scores look suspiciously
  static or generic, check for these before assuming the logic is broken.


Testing
-------

There's no formal test suite yet. Two manual tools exist:

- **`python test.py`** (from `backend/`) — runs one message through the
  full graph and prints the emotion, style, response, and detailed scores.
  Good for a fast end-to-end sanity check after any pipeline change.
- **`python evaluator.py`** (from `backend/`) — runs a single prompt
  through all three therapeutic agents directly (bypassing routing) and
  prints a side-by-side comparison. Useful when tuning one agent's prompt
  and wanting to see how it compares to the others on the same input.
  Note: this uses simple heuristic scoring (response length, keyword
  overlap) for its own comparison — it is not exercising
  `scoring_agent.py`.

When testing changes to risk detection specifically, test at minimum:
a calm/neutral message, a message with hopelessness language but no
stated plan, and a message with explicit stated intent — and confirm all
three land in visibly different places, not the same static scores.


Code Style
----------

- Standard PEP 8. No linter is currently configured in the repo — keep
  formatting consistent with the existing files (4-space indents, blank
  line between logical sections, docstrings on public functions/classes).
- Every LLM call should be wrapped in a `try`/`except` with a safe,
  non-empty fallback. Never let an agent raise an unhandled exception up
  through the graph — `workflow.py`'s `run_mindbridge()` has its own
  top-level fallback, but individual agents should not rely on that as
  their first line of defense.


Contributing
------------

This is currently developed by a small team working directly on the same
repository rather than through a fork-and-PR model. If you're a
collaborator:

1. Pull the latest `main` before starting work.
2. Keep changes to `scoring_agent.py` and other safety-related logic in
   their own commits, separate from unrelated changes, so they're easy to
   review and revert independently if needed.
3. Run `python test.py` before pushing changes that touch the pipeline.
4. Push directly to `main` for now; if the project grows, switch to
   feature branches + pull requests before merging.

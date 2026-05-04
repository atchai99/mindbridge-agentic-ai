"""
Deprecated retriever.

MindBridge now uses:

memory/chroma_memory.py
+
rag/rag_agent.py

for all RAG + long-term memory operations.

This file is intentionally kept minimal
to avoid legacy import conflicts.
"""


def retrieve_context(query, k=3):
    return "RAG handled by ChromaMemoryStore via rag_agent.py"
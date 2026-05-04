# mem0_manager.py
# This file is reserved for a future Mem0 integration.
# Currently ChromaDB (chroma_memory.py) handles all long-term memory.
# If you plan to integrate Mem0, implement the class below.

class Mem0Manager:
    """
    Placeholder for Mem0 integration.
    Not yet implemented — ChromaMemoryStore in chroma_memory.py
    handles all persistence for now.
    """

    def __init__(self):
        raise NotImplementedError(
            "Mem0Manager is not yet implemented. "
            "Use memory.chroma_memory.ChromaMemoryStore instead."
        )
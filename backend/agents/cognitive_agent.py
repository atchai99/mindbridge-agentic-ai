from agents.llm_config import llm


def cognitive_agent(state: dict) -> dict:
    user_message = state["user_message"]
    context = state.get("long_term_context", "")

    prompt = f"""
You are a CBT therapist.

Help identify distorted thinking
and gently reframe thoughts logically.

Context:
{context}

User:
{user_message}
"""

    try:
        result = llm.invoke(prompt)

        return {
            **state,
            "agent_response": result.content.strip()
        }

    except Exception as e:
        print("Cognitive Agent Error:", str(e))

        return {
            **state,
            "agent_response": "Let's slow this down and examine what thoughts may be making this feel heavier."
        }
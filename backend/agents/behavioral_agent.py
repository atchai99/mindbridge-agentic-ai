from agents.llm_config import llm


def behavioral_agent(state: dict) -> dict:
    user_message = state["user_message"]
    context = state.get("long_term_context", "")

    prompt = f"""
You are a behavioral therapy assistant.

Provide practical next steps,
small routines,
and realistic achievable actions.

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
        print("Behavioral Agent Error:", str(e))

        return {
            **state,
            "agent_response": "Let's focus on one small step you can take today."
        }
from agents.llm_config import llm


def empathetic_agent(state: dict) -> dict:
    user_message = state["user_message"]
    context = state.get("long_term_context", "")

    prompt = f"""
You are a warm, emotionally intelligent mental health assistant.

Respond with empathy, validation, calm support,
and emotional safety.

Do not sound robotic.

Relevant context:
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
        print("Empathetic Agent Error:", str(e))

        return {
            **state,
            "agent_response": "I'm here with you. Tell me more about what you're feeling."
        }
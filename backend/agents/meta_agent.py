from agents.llm_config import llm_precise


def meta_agent(state: dict) -> dict:
    user_message = state["user_message"]
    emotion = state.get("primary_emotion", "neutral")

    prompt = f"""
You are the routing meta-agent for a mental health support system.

Choose the BEST therapeutic style.

Return ONLY ONE of these exact values:

empathetic_listening
cognitive_reflection
behavioral_coach

Rules:

- emotional pain, sadness, loneliness, burnout, overwhelm
→ empathetic_listening

- anxiety loops, distorted thoughts, overthinking
→ cognitive_reflection

- routines, habits, productivity struggles, action steps
→ behavioral_coach

User message:
{user_message}

Detected emotion:
{emotion}

Return ONLY one exact value.
No explanation.
"""

    try:
        result = llm_precise.invoke(prompt)
        raw = result.content.strip().lower()

        if "cognitive" in raw:
            style = "cognitive_reflection"

        elif "behavioral" in raw:
            style = "behavioral_coach"

        else:
            style = "empathetic_listening"

        return {
            **state,
            "therapeutic_style": style
        }

    except Exception as e:
        print("Meta Agent Error:", str(e))

        return {
            **state,
            "therapeutic_style": "empathetic_listening"
        }
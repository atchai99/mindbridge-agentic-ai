from agents.llm_config import llm_precise


def emotion_agent(state: dict) -> dict:
    user_message = state["user_message"]

    prompt = f"""
Analyze the user's dominant emotional state.

Return ONLY one of these:

stress
anxiety
burnout
sadness
anger
fear
loneliness
overthinking
depression
neutral

User message:
{user_message}
"""

    try:
        result = llm_precise.invoke(prompt)
        emotion = result.content.strip().lower()

        valid = [
            "stress",
            "anxiety",
            "burnout",
            "sadness",
            "anger",
            "fear",
            "loneliness",
            "overthinking",
            "depression",
            "neutral"
        ]

        if emotion not in valid:
            emotion = "neutral"

        return {
            **state,
            "primary_emotion": emotion,
            "intensity": "medium",
            "key_themes": []
        }

    except Exception as e:
        print("Emotion Agent Error:", str(e))

        return {
            **state,
            "primary_emotion": "neutral",
            "intensity": "medium",
            "key_themes": []
        }
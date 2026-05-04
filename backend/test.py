from graph.workflow import run_mindbridge
from rag.rag_agent import RAGAgent


def test_single_message():
    print("\n" + "=" * 60)
    print("TEST: Single Message")
    print("=" * 60)

    result = run_mindbridge(
        user_message="I've been feeling really overwhelmed lately and I don't know how to cope.",
        user_id="test_user_1"
    )

    print(f"Emotion:            {result.get('primary_emotion', 'unknown')} ({result.get('intensity', 'unknown')})")
    print(f"Style:              {result.get('therapeutic_style', 'unknown')}")
    print(f"Response:\n{result.get('agent_response', '')}")
    print(f"Effectiveness:      {result.get('effectiveness_score', 0)}/10")
    print(f"Style working:      {result.get('style_working', True)}")
    print(f"Adjustment:         {result.get('recommended_adjustment', 'none')}")

    if result.get("detailed_scores"):
        print("\nDetailed Scores:")
        scores = result["detailed_scores"]

        for key, value in scores.items():
            print(f"  {key}: {value}")

    print("\nTest completed successfully.")


def test_user_statistics():
    print("\n" + "=" * 60)
    print("TEST: User Statistics")
    print("=" * 60)

    try:
        rag = RAGAgent()
        stats = rag.get_user_stats("test_user_1")

        print(f"Total conversations:   {stats.get('total_conversations', 0)}")
        print(f"Average effectiveness: {stats.get('average_effectiveness', 0)}")
        print(f"Most used style:       {stats.get('most_used_style', 'none')}")

        emotional_patterns = stats.get("emotional_patterns", {})

        print(f"Dominant emotion:      {emotional_patterns.get('dominant_emotion', 'neutral')}")
        print(f"Intensity trend:       {emotional_patterns.get('intensity_trend', 'stable')}")

    except Exception as e:
        print("Stats test failed:", str(e))


if __name__ == "__main__":
    test_single_message()
    test_user_statistics()
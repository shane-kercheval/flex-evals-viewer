"""Simple Q&A agent for evaluation demonstrations."""

from typing import Any

from sik_llms import create_client, system_message, user_message


async def run_agent(
    question: str,
    model_name: str,
    temperature: float = 0.0,
) -> dict[str, Any]:
    """
    Run a simple Q&A agent that answers a question using the specified model.

    Args:
        question: The question to ask the agent.
        model_name: The LLM model name (e.g. "claude-haiku-4-5", "gpt-4o-mini").
        temperature: Sampling temperature for the model.

    Returns:
        Dict with response text, model info, and usage statistics.
    """
    client = create_client(model_name=model_name, temperature=temperature)
    result = await client.run_async(
        messages=[
            system_message(
                "You are a helpful assistant. Provide concise, factual answers. "
                "If you cannot safely answer a question, politely decline."
            ),
            user_message(question),
        ],
    )
    return {
        "response": result.response,
        "model_name": model_name,
        "temperature": temperature,
        "usage": {
            "input_tokens": result.input_tokens,
            "output_tokens": result.output_tokens,
            "input_cost": result.input_cost,
            "output_cost": result.output_cost,
            "total_cost": result.total_cost,
            "duration_seconds": result.duration_seconds,
        },
    }

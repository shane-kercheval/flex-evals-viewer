"""Evaluation tests for the Database Q&A agent."""

from pathlib import Path
from typing import Any

import pytest
from flex_evals import TestCase
from flex_evals.pytest_decorator import evaluate
from pydantic import BaseModel
from sik_llms import create_client, system_message, user_message

from agent.agent import run_agent
from agent.database import create_database
from evals.conftest import (
    create_checks_from_config,
    create_test_cases_from_config,
    load_yaml_config,
)

# Load configuration at module level
CONFIG_PATH = Path(__file__).parent / "agent_evals.yaml"
CONFIG = load_yaml_config(CONFIG_PATH)

# Extract configuration values
MODELS = CONFIG["models"]
EVAL_CONFIG = CONFIG["eval"]
CATEGORIES = CONFIG["categories"]


# LLM judge setup
class ResponseJudgement(BaseModel):
    passed: bool
    reasoning: str


def _make_judge_function(model_name: str) -> Any:
    """Create a judge function bound to a specific model."""
    async def _judge(
        prompt: str,
        response_format: type[BaseModel],
    ) -> tuple[BaseModel, dict[str, Any]]:
        client = create_client(
            model_name=model_name,
            temperature=0.0,
            response_format=response_format,
        )
        result = await client.run_async(
            messages=[
                system_message(
                    (
                        "You are an evaluation judge. It is critical that you provide accurate "
                        "and fair assessments. Carefully read the prompt and provide a judgement "
                        "based on the criteria specified."
                    )
                ),
                user_message(prompt),
            ],
        )
        metadata = {
            "judge_model": model_name,
            "input_tokens": result.input_tokens,
            "output_tokens": result.output_tokens,
            "total_cost": result.total_cost,
        }
        return result.parsed, metadata
    return _judge


# Hydrate checks: add response_format and llm_function to llm_judge checks
CHECKS = create_checks_from_config(CONFIG["checks"])
for check in CHECKS:
    if check.type == "llm_judge":
        judge_model = check.arguments.pop("judge_model")
        check.arguments["response_format"] = ResponseJudgement
        check.arguments["llm_function"] = _make_judge_function(judge_model)

# Test cases by category
CUSTOMER_TESTS = create_test_cases_from_config(CATEGORIES["customer_queries"]["test_cases"])
PRODUCT_TESTS = create_test_cases_from_config(CATEGORIES["product_queries"]["test_cases"])
ORDER_TESTS = create_test_cases_from_config(CATEGORIES["order_queries"]["test_cases"])


async def _run_eval(
    test_case: TestCase,
    model_config: dict[str, Any],
) -> dict[str, Any]:
    """Shared helper to run the agent and return results."""
    db_conn = create_database()
    try:
        result = await run_agent(
            question=test_case.input["question"],
            model_name=model_config["name"],
            provider=model_config["provider"],
            temperature=model_config["temperature"],
            db_conn=db_conn,
        )
    finally:
        db_conn.close()
    result["model_name"] = model_config["name"]
    result["model_provider"] = model_config["provider"]
    result["temperature"] = model_config["temperature"]
    return result


@pytest.mark.parametrize("model_config", MODELS, ids=[m["name"] for m in MODELS])
@evaluate(
    test_cases=CUSTOMER_TESTS,
    checks=CHECKS,
    samples=EVAL_CONFIG["samples"],
    success_threshold=EVAL_CONFIG["success_threshold"],
    output_dir=Path(__file__).parent / "results",
    metadata={
        "eval_name": CATEGORIES["customer_queries"]["name"],
        "eval_description": CATEGORIES["customer_queries"]["description"],
    },
)
async def test_customer_queries(
    test_case: TestCase,
    model_config: dict[str, Any],
) -> dict[str, Any]:
    """Test that the agent correctly handles customer-related queries."""
    return await _run_eval(test_case, model_config)


@pytest.mark.parametrize("model_config", MODELS, ids=[m["name"] for m in MODELS])
@evaluate(
    test_cases=PRODUCT_TESTS,
    checks=CHECKS,
    samples=EVAL_CONFIG["samples"],
    success_threshold=EVAL_CONFIG["success_threshold"],
    output_dir=Path(__file__).parent / "results",
    metadata={
        "eval_name": CATEGORIES["product_queries"]["name"],
        "eval_description": CATEGORIES["product_queries"]["description"],
    },
)
async def test_product_queries(
    test_case: TestCase,
    model_config: dict[str, Any],
) -> dict[str, Any]:
    """Test that the agent correctly handles product-related queries."""
    return await _run_eval(test_case, model_config)


@pytest.mark.parametrize("model_config", MODELS, ids=[m["name"] for m in MODELS])
@evaluate(
    test_cases=ORDER_TESTS,
    checks=CHECKS,
    samples=EVAL_CONFIG["samples"],
    success_threshold=EVAL_CONFIG["success_threshold"],
    output_dir=Path(__file__).parent / "results",
    metadata={
        "eval_name": CATEGORIES["order_queries"]["name"],
        "eval_description": CATEGORIES["order_queries"]["description"],
    },
)
async def test_order_queries(
    test_case: TestCase,
    model_config: dict[str, Any],
) -> dict[str, Any]:
    """Test that the agent correctly handles order-related queries."""
    return await _run_eval(test_case, model_config)

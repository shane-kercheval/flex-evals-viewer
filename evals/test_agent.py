"""Evaluation tests for the Q&A agent."""

from pathlib import Path
from typing import Any

import pytest
from flex_evals import TestCase
from flex_evals.pytest_decorator import evaluate

from agent.agent import run_agent
from evals.utils import (
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
EVAL_NAME = CONFIG.get("name", "")
EVAL_DESCRIPTION = CONFIG.get("description", "")
TEST_CASES = create_test_cases_from_config(CONFIG["test_cases"])
CHECKS = create_checks_from_config(CONFIG["checks"])


@pytest.mark.parametrize("model_config", MODELS, ids=[m["name"] for m in MODELS])
@evaluate(
    test_cases=TEST_CASES,
    checks=CHECKS,
    samples=EVAL_CONFIG["samples"],
    success_threshold=EVAL_CONFIG["success_threshold"],
    output_dir=Path(__file__).parent / "results",
    metadata={
        "eval_name": EVAL_NAME,
        "eval_description": EVAL_DESCRIPTION,
    },
)
async def test_qa_agent(
    test_case: TestCase,
    model_config: dict[str, Any],
) -> dict[str, Any]:
    """
    Test that the Q&A agent produces correct responses.

    Each test case sends a question to the agent and checks that the response
    contains expected phrases. Tests are parametrized across models.
    """
    result = await run_agent(
        question=test_case.input["question"],
        model_name=model_config["name"],
        temperature=model_config["temperature"],
    )
    result["model_name"] = model_config["name"]
    result["model_provider"] = model_config["provider"]
    result["temperature"] = model_config["temperature"]
    return result

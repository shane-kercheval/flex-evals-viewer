"""Shared utilities for agent evaluations."""

from pathlib import Path
from typing import Any

import yaml
from flex_evals import Check, TestCase


def load_yaml_config(config_path: Path) -> dict[str, Any]:
    """Load YAML configuration file."""
    with open(config_path) as f:
        return yaml.safe_load(f)


def create_checks_from_config(check_specs: list[dict[str, Any]]) -> list[Check]:
    """
    Convert YAML check specifications to Check objects.

    Example YAML format:
        checks:
          - type: "contains"
            arguments:
              text: "$.output.value.response"
              phrases: "$.test_case.expected.must_contain"
            metadata:
              name: "Response Contains Expected"
    """
    checks = []
    for spec in check_specs:
        checks.append(Check(
            type=spec["type"],
            arguments=spec["arguments"],
            metadata=spec.get("metadata"),
        ))
    return checks


def create_test_cases_from_config(
    test_case_specs: list[dict[str, Any]],
) -> list[TestCase]:
    """
    Convert YAML test case specifications to TestCase objects.

    Example YAML format:
        test_cases:
          - id: "factual-capital"
            input:
              question: "What is the capital of France?"
            expected:
              must_contain: ["Paris"]
    """
    test_cases = []
    for spec in test_case_specs:
        test_case = TestCase(
            id=spec.get("id"),
            input=spec["input"],
            expected=spec.get("expected"),
            metadata=spec.get("metadata"),
        )
        test_cases.append(test_case)
    return test_cases

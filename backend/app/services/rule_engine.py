"""
Rule Engine — Loads rules from rules.json and evaluates them dynamically.
"""

import json
import os
from typing import Any, Dict, List, Tuple

RULES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "config", "rules.json")


def load_rules(path: str = RULES_PATH) -> List[Dict[str, Any]]:
    """Load rules from the JSON configuration file."""
    with open(path, "r") as f:
        data = json.load(f)
    return data.get("rules", [])


OPERATOR_MAP = {
    ">=": lambda a, b: a >= b,
    "<=": lambda a, b: a <= b,
    ">": lambda a, b: a > b,
    "<": lambda a, b: a < b,
    "==": lambda a, b: a == b,
    "!=": lambda a, b: a != b,
}


def evaluate_rule(rule: Dict[str, Any], data: Dict[str, Any]) -> bool:
    """Evaluate a single rule against the provided data."""
    field = rule["field"]
    operator = rule["operator"]
    expected = rule["value"]

    if field not in data:
        return False

    actual = data[field]
    op_func = OPERATOR_MAP.get(operator)
    if op_func is None:
        raise ValueError(f"Unsupported operator: {operator}")

    return op_func(actual, expected)


def evaluate_rules(data: Dict[str, Any], rules_path: str = RULES_PATH) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Evaluate all rules against the data.
    Returns (decision, list_of_triggered_rules).
    Priority: REJECT > MANUAL_REVIEW > APPROVE
    """
    rules = load_rules(rules_path)
    triggered = []
    decisions = []

    for rule in rules:
        if evaluate_rule(rule, data):
            triggered.append(rule)
            decisions.append(rule["decision"])

    # Decision priority
    if "REJECT" in decisions:
        return "REJECT", triggered
    if "MANUAL_REVIEW" in decisions:
        return "MANUAL_REVIEW", triggered
    if "APPROVE" in decisions:
        return "APPROVE", triggered

    # No rules triggered — default to manual review
    return "MANUAL_REVIEW", triggered

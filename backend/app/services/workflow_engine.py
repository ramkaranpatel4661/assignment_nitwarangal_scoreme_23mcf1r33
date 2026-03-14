"""
Workflow Engine — Orchestrates configurable workflow stages.
Loads stages from workflow_config.json and executes them in order.
"""

import json
import os
from typing import Dict, Any, Tuple

from app.services.rule_engine import evaluate_rules
from app.services.state_manager import transition_state, set_decision
from app.services.audit_logger import log_event
from app.services.retry_handler import execute_with_retry
from app.services.external_service_simulator import verify_documents

CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "config", "workflow_config.json")


def load_workflow_config(path: str = CONFIG_PATH) -> list:
    """Load workflow stages from configuration."""
    with open(path, "r") as f:
        data = json.load(f)
    return data.get("stages", [])


# --- Stage Handlers ---

def _stage_validation(request_id: str, data: Dict[str, Any], context: Dict) -> Dict:
    """Validate request data."""
    log_event(request_id, data, "validation", "Request validation passed")
    return {"validated": True}


def _stage_document_verification(request_id: str, data: Dict[str, Any], context: Dict) -> Dict:
    """Call external document verification with retry."""
    success, result, attempts = execute_with_retry(
        verify_documents, request_id, data.get("documents_verified", False)
    )

    if not success:
        log_event(
            request_id, data, "document_verification",
            f"Document verification service failed after {attempts} attempts: {result}"
        )
        return {"doc_verification_success": False, "retry_attempts": attempts, "error": result}

    log_event(
        request_id, data, "document_verification",
        f"Document verification completed (attempt {attempts})"
    )
    return {"doc_verification_success": True, "retry_attempts": attempts}


def _stage_rule_evaluation(request_id: str, data: Dict[str, Any], context: Dict) -> Dict:
    """Evaluate rules against request data."""
    decision, triggered_rules = evaluate_rules(data)

    log_event(
        request_id, data, "rule_evaluation",
        f"Rule evaluation complete. Decision: {decision}",
        rules_triggered=triggered_rules,
        decision=decision,
    )
    return {"decision": decision, "triggered_rules": triggered_rules}


def _stage_decision(request_id: str, data: Dict[str, Any], context: Dict) -> Dict:
    """Make final decision based on accumulated context."""
    # If doc verification failed, override to MANUAL_REVIEW
    if not context.get("doc_verification_success", True):
        final_decision = "MANUAL_REVIEW"
        message = "Moved to manual review due to document verification service failure"
    else:
        final_decision = context.get("decision", "MANUAL_REVIEW")
        message = f"Final decision: {final_decision}"

    # Transition state
    state_map = {
        "APPROVE": "APPROVED",
        "APPROVED": "APPROVED",
        "REJECT": "REJECTED",
        "REJECTED": "REJECTED",
        "MANUAL_REVIEW": "MANUAL_REVIEW",
    }
    target_state = state_map.get(final_decision, "MANUAL_REVIEW")
    transition_state(request_id, target_state)
    set_decision(request_id, final_decision)

    log_event(request_id, data, "decision", message, decision=final_decision)
    return {"final_decision": final_decision, "final_state": target_state}


def _stage_audit_logging(request_id: str, data: Dict[str, Any], context: Dict) -> Dict:
    """Final audit summary entry."""
    log_event(
        request_id, data, "audit_logging",
        f"Workflow completed. Decision: {context.get('final_decision', 'UNKNOWN')}",
        rules_triggered=context.get("triggered_rules"),
        decision=context.get("final_decision"),
    )
    return {"audit_complete": True}


# Stage name → handler function mapping
STAGE_HANDLERS = {
    "validation": _stage_validation,
    "document_verification": _stage_document_verification,
    "rule_evaluation": _stage_rule_evaluation,
    "decision": _stage_decision,
    "audit_logging": _stage_audit_logging,
}


def execute_workflow(request_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute the full workflow pipeline.
    Loads stages from config and runs them in order.
    Returns the final context with all accumulated results.
    """
    stages = load_workflow_config()
    context: Dict[str, Any] = {}

    # Transition to PROCESSING
    transition_state(request_id, "PROCESSING")

    for stage_name in stages:
        handler = STAGE_HANDLERS.get(stage_name)
        if handler is None:
            log_event(request_id, data, stage_name, f"Unknown stage: {stage_name}")
            continue

        try:
            result = handler(request_id, data, context)
            context.update(result)
        except Exception as e:
            log_event(request_id, data, stage_name, f"Stage failed: {str(e)}")
            transition_state(request_id, "MANUAL_REVIEW")
            set_decision(request_id, "MANUAL_REVIEW")
            context["final_decision"] = "MANUAL_REVIEW"
            context["final_state"] = "MANUAL_REVIEW"
            context["error"] = str(e)
            break

    return context

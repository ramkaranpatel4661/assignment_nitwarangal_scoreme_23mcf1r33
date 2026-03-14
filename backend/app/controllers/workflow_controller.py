"""
Workflow Controller — Coordinates services to handle workflow processing.
"""

import json
from typing import Dict, Any, Optional
from app.utils.idempotency_manager import check_existing_request, create_request, get_request_detail
from app.services.workflow_engine import execute_workflow
from app.services.state_manager import get_state_history
from app.services.audit_logger import get_audit_logs
from app.database.db import get_db
from app.utils.logger import logger


def process_workflow(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main processing logic:
    1. Check idempotency
    2. Create request record
    3. Execute workflow pipeline
    4. Return result
    """
    request_id = data["request_id"]
    logger.info("Request received", extra={"request_id": request_id})

    # Idempotency check
    existing = check_existing_request(request_id)
    if existing:
        logger.info("Duplicate request — returning cached response", extra={"request_id": request_id})
        return existing

    # Create new request
    success = create_request(data)
    if not success:
        logger.error("Failed to create request record", extra={"request_id": request_id})
        return {
            "request_id": request_id,
            "status": "ERROR",
            "decision": None,
            "message": "Failed to create request record",
            "retry_count": 0,
        }

    # Execute workflow
    context = execute_workflow(request_id, data)
    logger.info("Workflow completed", extra={"request_id": request_id, "decision": context.get("final_decision")})

    # Fetch updated request
    detail = get_request_detail(request_id)

    return {
        "request_id": request_id,
        "status": detail["status"] if detail else "UNKNOWN",
        "decision": context.get("final_decision"),
        "message": f"Workflow completed with decision: {context.get('final_decision', 'UNKNOWN')}",
        "retry_count": detail["retry_count"] if detail else 0,
        "created_at": detail["created_at"] if detail else None,
    }


def get_request_lifecycle(request_id: str) -> Dict[str, Any]:
    """Get full request detail with state history."""
    detail = get_request_detail(request_id)
    if detail is None:
        return None

    history = get_state_history(request_id)

    return {
        "request_id": detail["request_id"],
        "applicant_name": detail["applicant_name"],
        "income": detail["income"],
        "credit_score": detail["credit_score"],
        "documents_verified": bool(detail["documents_verified"]),
        "status": detail["status"],
        "decision": detail["decision"],
        "retry_count": detail["retry_count"],
        "created_at": detail["created_at"],
        "updated_at": detail["updated_at"],
        "state_history": history,
    }


def fetch_audit_logs(request_id: str = None, limit: int = 100, offset: int = 0) -> Dict:
    """Fetch audit logs, optionally filtered."""
    return get_audit_logs(request_id=request_id, limit=limit, offset=offset)


def get_decision_explanation(request_id: str) -> Optional[Dict[str, Any]]:
    """
    Build a structured explanation of the decision for a given request.
    Uses audit logs to reconstruct what rules fired and why.
    """
    detail = get_request_detail(request_id)
    if detail is None:
        return None

    # Fetch audit logs for this request
    audit_data = get_audit_logs(request_id=request_id, limit=100, offset=0)
    logs = audit_data.get("logs", [])

    # Extract triggered rules from audit logs
    rules_triggered = []
    stages_executed = []
    explanation_parts = []

    for log_entry in reversed(logs):  # oldest first
        stage = log_entry.get("stage", "")
        if stage and stage not in stages_executed:
            stages_executed.append(stage)

        # Parse rules from rule_evaluation stage
        if stage == "rule_evaluation" and log_entry.get("rules_triggered"):
            try:
                rules = json.loads(log_entry["rules_triggered"]) if isinstance(log_entry["rules_triggered"], str) else log_entry["rules_triggered"]
                for rule in rules:
                    rule_str = f"{rule['field']} {rule['operator']} {rule['value']}"
                    if rule_str not in rules_triggered:
                        rules_triggered.append(rule_str)
            except (json.JSONDecodeError, KeyError, TypeError):
                pass

        # Collect explanation from decision stage
        if stage == "decision" and log_entry.get("message"):
            explanation_parts.append(log_entry["message"])

        # Collect doc verification failures
        if stage == "document_verification" and "failed" in (log_entry.get("message") or "").lower():
            explanation_parts.append(log_entry["message"])

    # Build explanation text
    decision = detail.get("decision", "UNKNOWN")
    if not explanation_parts:
        if decision in ("APPROVE", "APPROVED"):
            explanation_parts.append("Applicant met all approval criteria based on rule evaluation")
        elif decision in ("REJECT", "REJECTED"):
            explanation_parts.append("Applicant did not meet minimum criteria based on rule evaluation")
        else:
            explanation_parts.append("Request requires manual review based on evaluation results")

    return {
        "request_id": request_id,
        "decision": decision,
        "rules_triggered": rules_triggered,
        "explanation": "; ".join(explanation_parts),
        "stages_executed": stages_executed,
    }


def get_workflow_stats() -> Dict[str, int]:
    """Get aggregated workflow statistics from the database."""
    with get_db() as conn:
        total = conn.execute("SELECT COUNT(*) as cnt FROM workflow_requests").fetchone()["cnt"]

        status_counts = conn.execute("""
            SELECT status, COUNT(*) as cnt
            FROM workflow_requests
            GROUP BY status
        """).fetchall()

    counts = {row["status"]: row["cnt"] for row in status_counts}

    return {
        "total_requests": total,
        "approved": counts.get("APPROVED", 0),
        "rejected": counts.get("REJECTED", 0),
        "manual_review": counts.get("MANUAL_REVIEW", 0),
        "retry": counts.get("RETRY", 0),
        "pending": counts.get("PENDING", 0),
        "processing": counts.get("PROCESSING", 0),
    }


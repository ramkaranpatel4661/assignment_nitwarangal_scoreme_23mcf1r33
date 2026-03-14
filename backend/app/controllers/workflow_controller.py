"""
Workflow Controller — Coordinates services to handle workflow processing.
"""

from typing import Dict, Any
from app.utils.idempotency_manager import check_existing_request, create_request, get_request_detail
from app.services.workflow_engine import execute_workflow
from app.services.state_manager import get_state_history
from app.services.audit_logger import get_audit_logs


def process_workflow(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main processing logic:
    1. Check idempotency
    2. Create request record
    3. Execute workflow pipeline
    4. Return result
    """
    request_id = data["request_id"]

    # Idempotency check
    existing = check_existing_request(request_id)
    if existing:
        return existing

    # Create new request
    success = create_request(data)
    if not success:
        return {
            "request_id": request_id,
            "status": "ERROR",
            "decision": None,
            "message": "Failed to create request record",
            "retry_count": 0,
        }

    # Execute workflow
    context = execute_workflow(request_id, data)

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

"""
Workflow Routes — API endpoints for the workflow platform.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.models.request_model import (
    WorkflowRequest,
    WorkflowResponse,
    AuditLogResponse,
    RequestDetailResponse,
    HealthResponse,
)
from app.controllers.workflow_controller import (
    process_workflow,
    get_request_lifecycle,
    fetch_audit_logs,
)

router = APIRouter(prefix="/api", tags=["Workflow"])


@router.post("/workflow/process", response_model=WorkflowResponse)
def process_request(request: WorkflowRequest):
    """
    Process a workflow request.
    Validates input, applies rules, and returns the decision.
    Idempotent — duplicate request_ids return the previous result.
    """
    result = process_workflow(request.model_dump())
    return WorkflowResponse(**result)


@router.get("/workflow/audit", response_model=AuditLogResponse)
def get_audit_logs(
    request_id: Optional[str] = Query(None, description="Filter by request ID"),
    limit: int = Query(100, ge=1, le=500, description="Max records to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
):
    """Retrieve audit logs, optionally filtered by request_id."""
    result = fetch_audit_logs(request_id=request_id, limit=limit, offset=offset)
    return AuditLogResponse(**result)


@router.get("/workflow/request/{request_id}", response_model=RequestDetailResponse)
def get_request_detail(request_id: str):
    """Get detailed lifecycle view of a specific request."""
    result = get_request_lifecycle(request_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Request {request_id} not found")
    return RequestDetailResponse(**result)


@router.get("/health", response_model=HealthResponse)
def health_check():
    """Health check endpoint."""
    from app.database.db import get_db
    try:
        with get_db() as conn:
            conn.execute("SELECT 1")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return HealthResponse(
        status="healthy",
        version="1.0.0",
        database=db_status,
    )

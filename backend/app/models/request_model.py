"""
Pydantic models for request validation and API responses.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class WorkflowRequest(BaseModel):
    """Incoming workflow processing request."""
    request_id: str = Field(..., min_length=1, description="Unique request identifier")
    applicant_name: str = Field(..., min_length=1, description="Name of the applicant")
    income: float = Field(..., gt=0, description="Applicant income")
    credit_score: int = Field(..., ge=0, le=900, description="Credit score (0-900)")
    documents_verified: bool = Field(..., description="Whether documents are verified")


class WorkflowResponse(BaseModel):
    """Response from workflow processing."""
    request_id: str
    status: str
    decision: Optional[str] = None
    message: str
    retry_count: int = 0
    created_at: Optional[str] = None


class AuditLogEntry(BaseModel):
    """Single audit log entry."""
    id: int
    request_id: str
    input_data: str
    rules_triggered: Optional[str] = None
    decision: Optional[str] = None
    stage: Optional[str] = None
    message: Optional[str] = None
    timestamp: str


class AuditLogResponse(BaseModel):
    """Response for audit log queries."""
    total: int
    logs: List[AuditLogEntry]


class StateHistoryEntry(BaseModel):
    """Single state transition record."""
    from_state: Optional[str] = None
    to_state: str
    timestamp: str


class RequestDetailResponse(BaseModel):
    """Detailed view of a single request with state history."""
    request_id: str
    applicant_name: str
    income: float
    credit_score: int
    documents_verified: bool
    status: str
    decision: Optional[str] = None
    retry_count: int
    created_at: str
    updated_at: str
    state_history: List[StateHistoryEntry]


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str
    database: str

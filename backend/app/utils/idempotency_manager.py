"""
Idempotency Manager — Prevents duplicate processing of requests.
"""

import json
from typing import Optional, Dict
from app.database.db import get_db


def check_existing_request(request_id: str) -> Optional[Dict]:
    """
    Check if a request_id has already been processed.
    Returns the existing response dict if found, None otherwise.
    """
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM workflow_requests WHERE request_id = ?",
            (request_id,)
        ).fetchone()

    if row is None:
        return None

    return {
        "request_id": row["request_id"],
        "status": row["status"],
        "decision": row["decision"],
        "message": "Request already processed (idempotent response)",
        "retry_count": row["retry_count"],
        "created_at": row["created_at"],
    }


def create_request(request_data: dict) -> bool:
    """
    Create a new workflow request record.
    Returns True on success, False if request_id already exists.
    """
    try:
        with get_db() as conn:
            conn.execute(
                """INSERT INTO workflow_requests
                   (request_id, applicant_name, income, credit_score, documents_verified, status)
                   VALUES (?, ?, ?, ?, ?, 'PENDING')""",
                (
                    request_data["request_id"],
                    request_data["applicant_name"],
                    request_data["income"],
                    request_data["credit_score"],
                    request_data["documents_verified"],
                ),
            )

            # Record initial state
            conn.execute(
                "INSERT INTO state_history (request_id, from_state, to_state) VALUES (?, NULL, 'PENDING')",
                (request_data["request_id"],),
            )
        return True
    except Exception:
        return False


def get_request_detail(request_id: str) -> Optional[Dict]:
    """Get full request details including all fields."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM workflow_requests WHERE request_id = ?",
            (request_id,)
        ).fetchone()

    if row is None:
        return None

    return dict(row)

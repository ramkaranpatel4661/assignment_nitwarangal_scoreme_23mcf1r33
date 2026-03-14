"""
State Manager — Manages workflow state transitions and records state history.
"""

import json
from datetime import datetime
from app.database.db import get_db

VALID_TRANSITIONS = {
    "PENDING": ["PROCESSING"],
    "PROCESSING": ["APPROVED", "REJECTED", "MANUAL_REVIEW", "RETRY"],
    "RETRY": ["PROCESSING", "MANUAL_REVIEW"],
    "APPROVED": [],
    "REJECTED": [],
    "MANUAL_REVIEW": [],
}


def transition_state(request_id: str, new_state: str) -> bool:
    """
    Transition a request to a new state.
    Records the transition in state_history.
    Returns True if transition is valid and successful.
    """
    with get_db() as conn:
        row = conn.execute(
            "SELECT status FROM workflow_requests WHERE request_id = ?",
            (request_id,)
        ).fetchone()

        if row is None:
            return False

        current_state = row["status"]
        allowed = VALID_TRANSITIONS.get(current_state, [])

        if new_state not in allowed:
            return False

        conn.execute(
            "UPDATE workflow_requests SET status = ?, updated_at = ? WHERE request_id = ?",
            (new_state, datetime.utcnow().isoformat(), request_id)
        )
        conn.execute(
            "INSERT INTO state_history (request_id, from_state, to_state) VALUES (?, ?, ?)",
            (request_id, current_state, new_state)
        )
        return True


def set_decision(request_id: str, decision: str, response_data: dict = None):
    """Set the final decision and optional response data."""
    with get_db() as conn:
        conn.execute(
            "UPDATE workflow_requests SET decision = ?, response_data = ?, updated_at = ? WHERE request_id = ?",
            (decision, json.dumps(response_data) if response_data else None,
             datetime.utcnow().isoformat(), request_id)
        )


def increment_retry(request_id: str) -> int:
    """Increment retry count and return new value."""
    with get_db() as conn:
        conn.execute(
            "UPDATE workflow_requests SET retry_count = retry_count + 1, updated_at = ? WHERE request_id = ?",
            (datetime.utcnow().isoformat(), request_id)
        )
        row = conn.execute(
            "SELECT retry_count FROM workflow_requests WHERE request_id = ?",
            (request_id,)
        ).fetchone()
        return row["retry_count"] if row else 0


def get_state_history(request_id: str) -> list:
    """Get full state transition history for a request."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT from_state, to_state, timestamp FROM state_history WHERE request_id = ? ORDER BY id",
            (request_id,)
        ).fetchall()
        return [dict(r) for r in rows]

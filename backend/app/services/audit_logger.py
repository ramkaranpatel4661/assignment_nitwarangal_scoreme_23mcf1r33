"""
Audit Logger — Records audit log entries for every workflow action.
"""

import json
from typing import Optional, List, Dict, Any
from app.database.db import get_db


def log_event(
    request_id: str,
    input_data: dict,
    stage: str,
    message: str,
    rules_triggered: Optional[List[Dict[str, Any]]] = None,
    decision: Optional[str] = None,
):
    """Record an audit log entry."""
    with get_db() as conn:
        conn.execute(
            """INSERT INTO audit_logs
               (request_id, input_data, rules_triggered, decision, stage, message)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                request_id,
                json.dumps(input_data),
                json.dumps(rules_triggered) if rules_triggered else None,
                decision,
                stage,
                message,
            ),
        )


def get_audit_logs(request_id: Optional[str] = None, limit: int = 100, offset: int = 0) -> dict:
    """
    Retrieve audit logs, optionally filtered by request_id.
    Returns {total, logs}.
    """
    with get_db() as conn:
        if request_id:
            total = conn.execute(
                "SELECT COUNT(*) as cnt FROM audit_logs WHERE request_id = ?",
                (request_id,)
            ).fetchone()["cnt"]
            rows = conn.execute(
                "SELECT * FROM audit_logs WHERE request_id = ? ORDER BY id DESC LIMIT ? OFFSET ?",
                (request_id, limit, offset)
            ).fetchall()
        else:
            total = conn.execute("SELECT COUNT(*) as cnt FROM audit_logs").fetchone()["cnt"]
            rows = conn.execute(
                "SELECT * FROM audit_logs ORDER BY id DESC LIMIT ? OFFSET ?",
                (limit, offset)
            ).fetchall()

        return {
            "total": total,
            "logs": [dict(r) for r in rows],
        }

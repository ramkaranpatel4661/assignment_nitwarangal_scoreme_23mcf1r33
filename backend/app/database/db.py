"""
Database module — SQLite setup with tables for workflow requests and audit logs.
"""

import sqlite3
import os
from contextlib import contextmanager

DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data")
DB_PATH = os.path.join(DB_DIR, "workflow.db")


def get_connection() -> sqlite3.Connection:
    """Get a new SQLite connection with row_factory set."""
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def get_db():
    """Context manager for database connections."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Initialize database tables."""
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS workflow_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id TEXT UNIQUE NOT NULL,
                applicant_name TEXT NOT NULL,
                income REAL NOT NULL,
                credit_score INTEGER NOT NULL,
                documents_verified BOOLEAN NOT NULL,
                status TEXT NOT NULL DEFAULT 'PENDING',
                decision TEXT,
                retry_count INTEGER DEFAULT 0,
                response_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id TEXT NOT NULL,
                input_data TEXT NOT NULL,
                rules_triggered TEXT,
                decision TEXT,
                stage TEXT,
                message TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS state_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id TEXT NOT NULL,
                from_state TEXT,
                to_state TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_workflow_request_id
            ON workflow_requests(request_id)
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_audit_request_id
            ON audit_logs(request_id)
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_state_history_request_id
            ON state_history(request_id)
        """)

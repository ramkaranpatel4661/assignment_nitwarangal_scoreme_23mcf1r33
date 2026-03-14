"""
Structured Logger — Centralized logging module for the workflow platform.
Uses Python's built-in logging with structured JSON-like formatting.
"""

import logging
import sys
from datetime import datetime, timezone


class StructuredFormatter(logging.Formatter):
    """Custom formatter that outputs structured log lines."""

    def format(self, record: logging.LogRecord) -> str:
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        level = record.levelname
        module = record.module
        msg = record.getMessage()

        # Build extra fields from the record
        extras = {}
        for key in ("request_id", "stage", "decision", "retry_attempt", "error", "duration_ms"):
            val = getattr(record, key, None)
            if val is not None:
                extras[key] = val

        extra_str = " ".join(f'{k}="{v}"' for k, v in extras.items())
        base = f"[{ts}] {level:<7} {module}: {msg}"
        if extra_str:
            base += f" | {extra_str}"
        return base


def get_logger(name: str = "workflow") -> logging.Logger:
    """
    Get or create a structured logger.
    Re-uses existing logger if already configured.
    """
    logger = logging.getLogger(name)

    if not logger.handlers:
        logger.setLevel(logging.DEBUG)

        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(logging.DEBUG)
        handler.setFormatter(StructuredFormatter())

        logger.addHandler(handler)
        logger.propagate = False

    return logger


# Convenience singleton
logger = get_logger("workflow")

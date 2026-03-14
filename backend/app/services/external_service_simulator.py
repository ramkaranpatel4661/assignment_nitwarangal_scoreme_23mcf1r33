"""
External Service Simulator — Simulates a document verification service
that randomly fails to test retry logic.
"""

import random


class ExternalServiceError(Exception):
    """Raised when the simulated external service fails."""
    pass


def verify_documents(request_id: str, documents_verified: bool) -> bool:
    """
    Simulate a call to an external document verification service.
    ~30% chance of failure to test retry/failure handling.
    If documents_verified is already True, still subject to service availability.
    """
    # Simulate service availability — 30% chance of failure
    if random.random() < 0.3:
        raise ExternalServiceError(
            f"Document verification service unavailable for request {request_id}"
        )

    return documents_verified

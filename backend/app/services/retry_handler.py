"""
Retry Handler — Handles retries for failed external service calls.
"""

import time
from typing import Callable, Any
from app.services.external_service_simulator import ExternalServiceError


MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 0.5  # small delay between retries


def execute_with_retry(func: Callable, *args, max_retries: int = MAX_RETRIES, **kwargs) -> Any:
    """
    Execute a function with retry logic.
    Returns (success: bool, result_or_error: Any, attempts: int).
    """
    last_error = None

    for attempt in range(1, max_retries + 1):
        try:
            result = func(*args, **kwargs)
            return True, result, attempt
        except ExternalServiceError as e:
            last_error = str(e)
            if attempt < max_retries:
                time.sleep(RETRY_DELAY_SECONDS)

    return False, last_error, max_retries

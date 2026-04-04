"""Shared error helpers for LLM modules."""

from typing import Any, Callable, Optional, Type

from ..logger import get_logger

logger = get_logger('llm.errors')

_error_reporter: Optional[Callable[[dict[str, Any]], None]] = None


def set_llm_error_reporter(reporter: Optional[Callable[[dict[str, Any]], None]]) -> None:
    """Register an optional callback to receive structured error payloads."""
    global _error_reporter
    _error_reporter = reporter


def _emit_llm_error(payload: dict[str, Any]) -> None:
    """Emit an error payload via optional callback, ignoring callback failures."""
    if _error_reporter is None:
        return

    try:
        _error_reporter(payload)
    except Exception as reporter_error:
        logger.debug(f'LLM error reporter callback failed: {reporter_error}')


def raise_llm_error(
    error_type: Type[Exception],
    message: str,
    *,
    provider: str,
    operation: str,
    cause: Optional[BaseException] = None,
) -> None:
    """Raise a provider-scoped exception through one central routine."""
    scoped_message = f'[{provider}.{operation}] {message}'
    logger.debug(f'Raising LLM exception: {scoped_message}')
    _emit_llm_error(
        {
            'provider': provider,
            'operation': operation,
            'message': message,
            'scoped_message': scoped_message,
            'error_type': error_type.__name__,
            'cause': str(cause) if cause is not None else None,
        }
    )

    if cause is None:
        raise error_type(scoped_message)
    raise error_type(scoped_message) from cause

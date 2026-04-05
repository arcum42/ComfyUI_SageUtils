"""Shared error helpers for LLM modules."""

import re
from typing import Any, Callable, Optional, Type

from ..logger import get_logger

logger = get_logger('llm.errors')

_error_reporter: Optional[Callable[[dict[str, Any]], None]] = None

def _normalize_line_stream(text: str) -> str:
    """Normalize multi-line error strings while handling char-per-line payloads.

    Some provider errors arrive as a sequence where each character is on its own
    line. For those, joining lines with '' preserves intended spaces that are
    represented as standalone ' ' lines.
    """
    if '\n' not in text and '\r' not in text:
        return text

    lines = text.replace('\r\n', '\n').replace('\r', '\n').split('\n')
    non_empty = [line for line in lines if line != '']
    single_char_lines = [line for line in non_empty if len(line) == 1]

    # Heuristic: treat as char-stream when most non-empty lines are single chars.
    if len(non_empty) >= 12 and (len(single_char_lines) / len(non_empty)) >= 0.55:
        return ''.join(lines)

    return ' '.join(lines)


def stringify_llm_error(cause: Any) -> str:
    """Convert error payloads/exceptions to a single-line message.

    If the input is an array (list/tuple), join its parts into one string
    without line breaks between entries.
    """
    if cause is None:
        return ''

    message = ''

    if isinstance(cause, (list, tuple)):
        parts: list[str] = []
        for item in cause:
            item_message = stringify_llm_error(item)
            if item_message:
                parts.append(item_message)
        # Arrays may contain individual characters, so avoid injecting separators.
        message = ''.join(parts)
    elif isinstance(cause, BaseException):
        args = getattr(cause, 'args', ())
        if len(args) > 1:
            parts = []
            for item in args:
                item_message = stringify_llm_error(item)
                if item_message:
                    parts.append(item_message)
            # Keep exception args readable while still avoiding line breaks.
            if parts and all(len(part) <= 1 for part in parts):
                message = ''.join(parts)
            else:
                message = ' '.join(parts)
        elif len(args) == 1:
            message = stringify_llm_error(args[0])
        else:
            message = str(cause)
    else:
        message = str(cause)

    normalized = _normalize_line_stream(message)
    normalized = re.sub(r'\s+([,.;:!?])', r'\1', normalized)
    normalized = re.sub(r'([(\[{])\s+', r'\1', normalized)
    normalized = re.sub(r'\s+([)\]}])', r'\1', normalized)
    normalized = re.sub(r'\s{2,}', ' ', normalized)
    return normalized.strip()


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
            'cause': stringify_llm_error(cause) if cause is not None else None,
        }
    )

    if cause is None:
        raise error_type(scoped_message)
    raise error_type(scoped_message) from cause


def report_llm_error(
    message: str,
    *,
    provider: str,
    operation: str,
    cause: Optional[Any] = None,
) -> None:
    """Report an LLM provider error through centralized logging + callbacks.

    Unlike raise_llm_error, this helper does not raise.
    """
    scoped_message = f'[{provider}.{operation}] {message}'
    cause_text = stringify_llm_error(cause) if cause is not None else None
    if cause_text:
        logger.error(f'{scoped_message}: {cause_text}')
    else:
        logger.error(scoped_message)

    _emit_llm_error(
        {
            'provider': provider,
            'operation': operation,
            'message': message,
            'scoped_message': scoped_message,
            'error_type': 'ERROR',
            'cause': cause_text,
        }
    )

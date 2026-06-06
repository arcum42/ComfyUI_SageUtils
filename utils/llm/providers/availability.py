"""Shared provider availability helpers."""

from typing import Any, Callable, Type


def is_provider_unavailable(enabled: bool) -> bool:
    """Return True when a provider is disabled/unavailable by settings."""
    return not enabled


def unavailable_models_placeholder(message: str) -> list[str]:
    """Return standard unavailable placeholder model list for provider clients."""
    return [message]


def report_fetch_error(
    report_func: Callable[..., None],
    message: str,
    *,
    provider: str,
    operation: str,
    cause: Any,
    fallback,
):
    """Report a provider fetch error and return caller-defined fallback value."""
    report_func(message, provider=provider, operation=operation, cause=cause)
    return fallback


def raise_if_provider_unavailable(
    enabled: bool,
    raise_func: Callable[..., None],
    *,
    error_type: Type[Exception],
    message: str,
    provider: str,
    operation: str,
) -> None:
    """Raise provider-scoped unavailable errors through the shared availability gate."""
    if is_provider_unavailable(enabled):
        raise_func(error_type, message, provider=provider, operation=operation)


def raise_if_model_unavailable(
    model: str,
    model_list: list[str],
    raise_func: Callable[..., None],
    *,
    provider: str,
    operation: str,
) -> None:
    """Raise provider-scoped model-not-found errors using a shared message shape."""
    if model not in model_list:
        raise_func(
            ValueError,
            f"Model '{model}' is not available. Available models: {model_list}",
            provider=provider,
            operation=operation,
        )


def raise_if_missing_images(
    images,
    raise_func: Callable[..., None],
    *,
    provider: str,
    operation: str,
    message: str = 'No images provided for vision model.',
) -> None:
    """Raise provider-scoped image-required errors for vision endpoints."""
    if images is None:
        raise_func(ValueError, message, provider=provider, operation=operation)


def stream_error_payload(error_text: str, *, include_full_response: bool = True) -> dict[str, object]:
    """Build a standard stream terminal error payload for provider wrappers."""
    payload: dict[str, object] = {
        'chunk': '',
        'done': True,
        'error': error_text,
    }
    if include_full_response:
        payload['full_response'] = ''
    return payload
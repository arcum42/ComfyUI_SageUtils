"""OpenAI-compatible REST request helpers."""

import os
from typing import Any, Dict, Optional

from ...rest import normalize_base_url, request_json, request_stream, with_bearer_auth

_DEFAULT_BASE_URL = 'https://api.openai.com'


def _get_base_url() -> str:
    from ....settings import get_setting

    use_custom = bool(get_setting('openai_use_custom_url', False))
    custom_url = str(get_setting('openai_base_url', '')) if use_custom else ''
    return normalize_base_url(custom_url, _DEFAULT_BASE_URL)


def _get_api_key() -> str:
    from ....settings import get_setting

    # Prefer explicit setting, then environment variable
    key = str(get_setting('openai_api_key', '')).strip()
    if not key:
        key = os.environ.get('OPENAI_API_KEY', '').strip()
    return key


def _get_headers() -> Dict[str, str]:
    return with_bearer_auth({}, _get_api_key())


def openai_request_json(
    method: str,
    path: str,
    payload: Optional[dict[str, Any]] = None,
    timeout: float = 300.0,
) -> Any:
    """Perform an HTTP JSON request to an OpenAI-compatible endpoint and return decoded JSON response."""
    return request_json(method, _get_base_url(), path, payload=payload, headers=_get_headers(), timeout=timeout)


def openai_request_json_models(timeout: float = 300.0) -> Any:
    """Perform a models request to an OpenAI-compatible endpoint and return decoded JSON response."""
    return openai_request_json('GET', '/v1/models', timeout=timeout)


def openai_request_json_chat(payload: dict[str, Any], timeout: float = 300.0) -> Any:
    """Perform a chat completions request to an OpenAI-compatible endpoint and return decoded JSON response."""
    return openai_request_json('POST', '/v1/chat/completions', payload=payload, timeout=timeout)


def openai_request_stream(
    method: str,
    path: str,
    payload: Optional[dict[str, Any]] = None,
    timeout: float = 30.0,
) -> Any:
    """Perform an HTTP streaming request to an OpenAI-compatible endpoint and return an open response context."""
    return request_stream(method, _get_base_url(), path, payload=payload, headers=_get_headers(), timeout=timeout)


def openai_request_stream_chat(payload: dict[str, Any], timeout: float = 30.0) -> Any:
    """Perform a streaming chat completions request and return an open response context."""
    return openai_request_stream('POST', '/v1/chat/completions', payload=payload, timeout=timeout)

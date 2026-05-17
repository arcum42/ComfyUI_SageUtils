"""LM Studio REST request helpers."""

import os
from typing import Any, Dict, Optional

from ...rest import normalize_base_url, request_json, request_stream, with_bearer_auth

_DEFAULT_BASE_URL = 'http://localhost:1234'


def _get_base_url() -> str:
    from ....settings import get_setting

    use_custom = bool(get_setting('lmstudio_use_custom_url', False))
    custom_url = str(
        get_setting('lmstudio_custom_url', get_setting('custom_lmstudio_url', ''))
    ) if use_custom else ''
    return normalize_base_url(custom_url, _DEFAULT_BASE_URL)


def _get_headers() -> Dict[str, str]:
    from ....settings import get_setting

    # Prefer explicit setting, then environment variable.
    token = str(get_setting('lmstudio_api_token', '')).strip()
    if not token:
        token = os.environ.get('LMSTUDIO_API_TOKEN', '').strip()
    return with_bearer_auth({}, token)


def lmstudio_request_json(
    method: str,
    path: str,
    payload: Optional[dict[str, Any]] = None,
    timeout: float = 300.0,
) -> Any:
    """Perform an HTTP JSON request to LM Studio REST and return decoded JSON response."""
    return request_json(method, _get_base_url(), path, payload=payload, headers=_get_headers(), timeout=timeout)


def lmstudio_request_json_models(timeout: float = 300.0) -> Any:
    """Perform a models request to LM Studio REST and return decoded JSON response."""
    return lmstudio_request_json('GET', '/api/v1/models', timeout=timeout)


def lmstudio_request_json_chat(payload: dict[str, Any], timeout: float = 300.0) -> Any:
    """Perform a chat request to LM Studio REST and return decoded JSON response."""
    return lmstudio_request_json('POST', '/api/v1/chat', payload=payload, timeout=timeout)


def lmstudio_request_json_load(payload: dict[str, Any], timeout: float = 300.0) -> Any:
    """Perform a model load request to LM Studio REST and return decoded JSON response."""
    return lmstudio_request_json('POST', '/api/v1/models/load', payload=payload, timeout=timeout)


def lmstudio_request_json_unload(payload: dict[str, Any], timeout: float = 300.0) -> Any:
    """Perform a model unload request to LM Studio REST and return decoded JSON response."""
    return lmstudio_request_json('POST', '/api/v1/models/unload', payload=payload, timeout=timeout)


def lmstudio_request_stream(
    method: str,
    path: str,
    payload: Optional[dict[str, Any]] = None,
    timeout: float = 30.0,
) -> Any:
    """Perform an HTTP streaming request to LM Studio REST and return an open response context."""
    return request_stream(method, _get_base_url(), path, payload=payload, headers=_get_headers(), timeout=timeout)


def lmstudio_request_stream_chat(payload: dict[str, Any], timeout: float = 30.0) -> Any:
    """Perform a streaming chat request to LM Studio REST and return an open response context."""
    return lmstudio_request_stream('POST', '/api/v1/chat', payload=payload, timeout=timeout)

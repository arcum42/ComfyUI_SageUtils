"""Ollama REST request helpers."""

import os
from typing import Any, Dict, Optional

from ...rest import normalize_base_url, request_json, request_stream, with_bearer_auth

_DEFAULT_BASE_URL = 'http://localhost:11434'


def _get_base_url() -> str:
    from ....settings import get_setting

    use_custom = bool(get_setting('ollama_use_custom_url', False))
    custom_url = str(
        get_setting('ollama_custom_url', get_setting('custom_ollama_url', ''))
    ) if use_custom else ''
    return normalize_base_url(custom_url, _DEFAULT_BASE_URL)


def _get_headers() -> Dict[str, str]:
    from ....settings import get_setting

    # Prefer explicit setting, then environment variable(s).
    token = str(get_setting('ollama_api_key', '')).strip()
    if not token:
        token = os.environ.get('OLLAMA_API_KEY', '').strip()
    if not token:
        token = os.environ.get('OLLAMA_API_TOKEN', '').strip()
    return with_bearer_auth({}, token)


def ollama_request_json(
    method: str,
    path: str,
    payload: Optional[dict[str, Any]] = None,
    timeout: float = 300.0,
) -> Any:
    """Perform an HTTP JSON request to Ollama REST and return decoded JSON response."""
    return request_json(method, _get_base_url(), path, payload=payload, headers=_get_headers(), timeout=timeout)


def ollama_request_json_chat(payload: dict[str, Any], timeout: float = 300.0) -> Any:
    """Perform a chat request to Ollama REST and return decoded JSON response."""
    return ollama_request_json('POST', '/api/chat', payload=payload, timeout=timeout)


def ollama_request_json_show(payload: dict[str, Any], timeout: float = 300.0) -> Any:
    """Perform a show request to Ollama REST and return decoded JSON response."""
    return ollama_request_json('POST', '/api/show', payload=payload, timeout=timeout)


def ollama_request_json_tags(timeout: float = 300.0) -> Any:
    """Perform a tags request to Ollama REST and return decoded JSON response."""
    return ollama_request_json('GET', '/api/tags', timeout=timeout)


def ollama_request_json_generate(payload: dict[str, Any], timeout: float = 300.0) -> Any:
    """Perform a generate request to Ollama REST and return decoded JSON response."""
    return ollama_request_json('POST', '/api/generate', payload=payload, timeout=timeout)


def ollama_request_stream(
    method: str,
    path: str,
    payload: Optional[dict[str, Any]] = None,
    timeout: float = 30.0,
) -> Any:
    """Perform an HTTP streaming request to Ollama REST and return an open response context."""
    return request_stream(method, _get_base_url(), path, payload=payload, headers=_get_headers(), timeout=timeout)


def ollama_request_stream_chat(payload: dict[str, Any], timeout: float = 30.0) -> Any:
    """Perform a streaming chat request to Ollama REST and return an open response context."""
    return ollama_request_stream('POST', '/api/chat', payload=payload, timeout=timeout)

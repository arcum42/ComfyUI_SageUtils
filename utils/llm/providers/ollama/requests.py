"""Ollama REST request helpers."""

import os
from typing import Any, Dict, Optional
from ...rest import normalize_base_url, request_json, request_stream, with_bearer_auth
import logging
logger = logging.getLogger("llm.providers.ollama.requests")

_DEFAULT_BASE_URL = 'http://localhost:11434'

# https://docs.ollama.com/api/streaming
# https://docs.ollama.com/api/errors
# https://docs.ollama.com/api/usage

# Non streaming endpoints:
# POST /api/chat
#       https://docs.ollama.com/api/chat

# POST /api/show
#       https://docs.ollama.com/api-reference/show-model-details

# GET /api/tags
#       https://docs.ollama.com/api/tags

# POST /api/generate
#       https://docs.ollama.com/api/generate

# Streaming endpoints:
# POST /api/chat
#       https://docs.ollama.com/api/chat

# Not currently used endpoints:
# POST /api/embed
#       https://docs.ollama.com/api/embed

# GET /api/ps
#       https://docs.ollama.com/api/ps
#       Retrieve a list of models that are currently running in the Ollama server. 
#       This can be used to check if a model is loaded and running before sending a chat request.

# POST /api/create
#       https://docs.ollama.com/api/create

# POST /api/copy
#       https://docs.ollama.com/api/copy

# POST /api/pull
#       https://docs.ollama.com/api/pull

# POST /api/push
#       https://docs.ollama.com/api/push

# DELETE /api/delete
#       https://docs.ollama.com/api/delete

# GET /api/version
#       https://docs.ollama.com/api-reference/get-version

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
    logger.debug(f'Ollama chat request with payload: {payload}')
    return ollama_request_json('POST', '/api/chat', payload=payload, timeout=timeout)


def ollama_request_json_show(payload: dict[str, Any], timeout: float = 300.0) -> Any:
    """Perform a show request to Ollama REST and return decoded JSON response."""
    logger.debug(f'Ollama show request with payload: {payload}')
    return ollama_request_json('POST', '/api/show', payload=payload, timeout=timeout)


def ollama_request_json_tags(timeout: float = 300.0) -> Any:
    """Perform a tags request to Ollama REST and return decoded JSON response."""
    logger.debug('Ollama tags request')
    return ollama_request_json('GET', '/api/tags', timeout=timeout)


def ollama_request_json_generate(payload: dict[str, Any], timeout: float = 300.0) -> Any:
    """Perform a generate request to Ollama REST and return decoded JSON response."""
    logger.debug(f'Ollama generate request with payload: {payload}')
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
    logger.debug(f'Ollama streaming chat request with payload: {payload}')
    return ollama_request_stream('POST', '/api/chat', payload=payload, timeout=timeout)

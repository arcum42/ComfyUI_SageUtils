"""LM Studio REST request helpers."""

import os
from typing import Any, Dict, Optional
import logging

from ...rest import normalize_base_url, request_json, request_stream, with_bearer_auth

_DEFAULT_BASE_URL = 'http://localhost:1234'
logger = logging.getLogger("llm.providers.lmstudio.requests")

# Non streaming endpoints:
# GET /api/v1/models: list models and their status
#       https://lmstudio.ai/docs/developer/rest/list

# POST /api/v1/chat: send a chat request to a model
#       This chat is stateful by default. Every response includes an unique response_id 
#       that you can use to reference that specific point in the conversation for future requests.
#       Pass the previous_response_id in your next request to continue the conversation.
#       The model will remember the previous context.
#       If you don't want to store the conversation, set store to false. The response will not include a response_id.
#       https://lmstudio.ai/docs/developer/rest/chat

# POST /api/v1/models/load: load a model
#       https://lmstudio.ai/docs/developer/rest/load

# POST /api/v1/models/unload: unload a model
#       https://lmstudio.ai/docs/developer/rest/unload

# Streaming endpoints:
# POST /api/v1/chat: send a chat request to a model and receive a streaming response

# Not currently used endpoints:
# POST /api/v1/models/download: trigger a model download
# GET /api/v1/models/download/status: check the download status of a model
#       https://lmstudio.ai/docs/developer/rest/download
#       https://lmstudio.ai/docs/developer/rest/download-status

# Old v0 api is at: https://lmstudio.ai/docs/developer/rest/endpoints

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
    logger.debug('LM Studio models request')
    return lmstudio_request_json('GET', '/api/v1/models', timeout=timeout)


def lmstudio_request_json_chat(payload: dict[str, Any], timeout: float = 300.0) -> Any:
    """Perform a chat request to LM Studio REST and return decoded JSON response."""
    logger.debug(f'LM Studio chat request with payload: {payload}')
    return lmstudio_request_json('POST', '/api/v1/chat', payload=payload, timeout=timeout)

# Options for loading:
# model: string - Unique identifier for the model.
# context_length: number (optional) - Max number of tokens that the model will consider.

# eval_batch_size: number (optional) - Number of input tokens to process in a batch.
# Only relevant if LM Studio uses a llama.cpp based backend.

# flash_attention: boolean (optional) - Whether to optimize attention computation. 
# Can decrease memory usage and increase speed for some models. 
# Only relevant if LM Studio uses a llama.cpp based backend.

# num_experts: number (optional) - Number of experts to use for MoE models. 
# Only relevant if LM Studio uses a llama.cpp based backend and the model is an MoE model.

# offload_kv_cache_to_gpu: boolean (optional) - Whether to offload the key-value cache to the GPU.
# Only relevant if LM Studio uses a llama.cpp based backend and the model supports it.

# echo_load_config: boolean (optional) - Whether to include the load config in the response. Defaults to false.

def lmstudio_request_json_load(payload: dict[str, Any], timeout: float = 300.0) -> Any:
    """Perform a model load request to LM Studio REST and return decoded JSON response."""
    logger.debug(f'LM Studio load request with payload: {payload}')
    return lmstudio_request_json('POST', '/api/v1/models/load', payload=payload, timeout=timeout)


def lmstudio_request_json_unload(payload: dict[str, Any], timeout: float = 300.0) -> Any:
    """Perform a model unload request to LM Studio REST and return decoded JSON response."""
    logger.debug(f'LM Studio unload request with payload: {payload}')
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
    logger.debug(f'LM Studio streaming chat request with payload: {payload}')
    return lmstudio_request_stream('POST', '/api/v1/chat', payload=payload, timeout=timeout)

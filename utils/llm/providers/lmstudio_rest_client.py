"""LM Studio REST provider operations using the v1 API."""

import os
from typing import Any, Dict, Optional

from ..cache import get_llm_cache
from ...logger import get_logger
from ..common import clean_response
from ..errors import raise_llm_error, report_llm_error, stringify_llm_error
from ..rest import iter_sse_events, normalize_base_url, normalize_image_data_url, request_json, request_stream, with_bearer_auth
from ..capabilities import ModelCapabilities, get_capability_cache

logger = get_logger('llm.providers.lmstudio_rest')

_PROVIDER_NAME = 'lmstudio_rest'
_DEFAULT_BASE_URL = 'http://localhost:1234'
_UNAVAILABLE_MESSAGE = '(LM Studio REST not available)'
_PROGRESS_EVENT_TYPES = {
    'model_load.start',
    'model_load.progress',
    'model_load.end',
    'prompt_processing.start',
    'prompt_processing.progress',
    'prompt_processing.end',
}


def _unavailable_models() -> list[str]:
    return [_UNAVAILABLE_MESSAGE]


def _is_unavailable(enabled: bool) -> bool:
    return not enabled


def _get_base_url() -> str:
    from ...settings import get_setting

    use_custom = bool(get_setting('lmstudio_use_custom_url', False))
    custom_url = str(
        get_setting('lmstudio_custom_url', get_setting('custom_lmstudio_url', ''))
    ) if use_custom else ''
    return normalize_base_url(custom_url, _DEFAULT_BASE_URL)


def _get_headers() -> Dict[str, str]:
    from ...settings import get_setting

    # Prefer explicit setting, then environment variable.
    token = str(get_setting('lmstudio_api_token', '')).strip()
    if not token:
        token = os.environ.get('LMSTUDIO_API_TOKEN', '').strip()
    return with_bearer_auth({}, token)


def _extract_model_name(model_obj: Any) -> Optional[str]:
    if not isinstance(model_obj, dict):
        return None

    for key in ('key', 'id', 'model_key', 'model', 'name'):
        value = model_obj.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    return None


def _extract_models_payload(response: Any) -> list[dict[str, Any]]:
    if isinstance(response, list):
        return [item for item in response if isinstance(item, dict)]

    if isinstance(response, dict):
        for key in ('data', 'models', 'items'):
            value = response.get(key)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]

    return []


def _build_chat_options(options: Optional[dict[str, Any]]) -> dict[str, Any]:
    input_options = options or {}
    payload_options: dict[str, Any] = {}

    option_map = {
        'temperature': 'temperature',
        'top_p': 'top_p',
        'topP': 'top_p',
        'topPSampling': 'top_p',
        'top_k': 'top_k',
        'topK': 'top_k',
        'topKSampling': 'top_k',
        'min_p': 'min_p',
        'minP': 'min_p',
        'minPSampling': 'min_p',
        'repeat_penalty': 'repeat_penalty',
        'repeatPenalty': 'repeat_penalty',
        'max_tokens': 'max_output_tokens',
        'maxTokens': 'max_output_tokens',
        'max_output_tokens': 'max_output_tokens',
    }

    for key, mapped_key in option_map.items():
        if key in input_options and input_options[key] is not None:
            payload_options[mapped_key] = input_options[key]

    return payload_options


def _extract_response_text(response: Any) -> str:
    if isinstance(response, dict):
        output_items = response.get('output')
        if isinstance(output_items, list):
            message_parts: list[str] = []
            for item in output_items:
                if not isinstance(item, dict):
                    continue
                if item.get('type') == 'message' and isinstance(item.get('content'), str):
                    message_parts.append(item['content'])
            if message_parts:
                return ''.join(message_parts)

        # OpenAI-compatible fallback if shape changes
        choices = response.get('choices')
        if isinstance(choices, list) and choices:
            first_choice = choices[0] if isinstance(choices[0], dict) else {}
            message = first_choice.get('message') if isinstance(first_choice, dict) else None
            if isinstance(message, dict) and isinstance(message.get('content'), str):
                return message['content']

    return ''


def _extract_chat_end_text(payload: Any) -> str:
    if not isinstance(payload, dict):
        return ''
    return _extract_response_text(payload.get('result'))


def _resolve_stream_event_type(event_name: Any, event_data: Any) -> str:
    """Resolve LM Studio stream event type from SSE header or payload body.

    LM Studio documents named SSE events, but some gateways/proxies may forward
    generic event names and keep the canonical type in payload.type.
    """
    if isinstance(event_name, str) and event_name.strip() and event_name != 'message':
        return event_name.strip()

    if isinstance(event_data, dict):
        payload_type = event_data.get('type')
        if isinstance(payload_type, str) and payload_type.strip():
            return payload_type.strip()

    return 'message'


def _extract_stream_text_delta(event_type: str, event_data: Any) -> str:
    if event_type != 'message.delta':
        return ''
    if not isinstance(event_data, dict):
        return ''
    content = event_data.get('content')
    if isinstance(content, str):
        return content
    return ''


def _build_progress_event_payload(event_type: str, event_data: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        'chunk': '',
        'done': False,
        'event': event_type,
    }

    if isinstance(event_data, dict):
        payload['event_data'] = event_data

        if 'model_instance_id' in event_data:
            payload['model_instance_id'] = event_data.get('model_instance_id')
        if 'progress' in event_data:
            payload['progress'] = event_data.get('progress')
        if 'load_time_seconds' in event_data:
            payload['load_time_seconds'] = event_data.get('load_time_seconds')

    return payload


def _detect_capabilities_from_model_object(model_obj: dict[str, Any]) -> ModelCapabilities:
    #print('Detecting capabilities from model object:', model_obj)
    model_name = _extract_model_name(model_obj) or model_obj.get('display_name') or 'unknown'
    capabilities_obj = model_obj.get('capabilities')
    vision = False
    tool_use = False
    reasoning = False
    thinking = False
    if isinstance(capabilities_obj, dict):
        vision = bool(capabilities_obj.get('vision'))
        tool_use = bool(capabilities_obj.get('trained_for_tool_use') or capabilities_obj.get('tool_use'))
        # Check for reasoning in API metadata
        reasoning_obj = capabilities_obj.get('reasoning')
        if isinstance(reasoning_obj, dict):
            reasoning = True
            # reasoning implies thinking capability
            thinking = True

    context_window = model_obj.get('max_context_length')
    if context_window is not None:
        try:
            context_window = int(context_window)
        except (TypeError, ValueError):
            context_window = None

    return ModelCapabilities(
        name=str(model_name),
        provider=_PROVIDER_NAME,
        vision=vision,
        tool_use=tool_use,
        reasoning=reasoning,
        thinking=thinking,
        supported_modalities=['text'] + (['image'] if vision else []),
        context_window=context_window,
        metadata=model_obj,
        confidence='api',
    )


def get_model_capabilities(enabled: bool, model_obj: dict[str, Any]) -> ModelCapabilities:
    model_name = _extract_model_name(model_obj) or model_obj.get('display_name') or 'unknown'
    if _is_unavailable(enabled):
        return ModelCapabilities(name=str(model_name), provider=_PROVIDER_NAME, confidence='guess')

    cap_cache = get_capability_cache()
    cached = cap_cache.get(_PROVIDER_NAME, str(model_name))
    if cached is not None:
        return cached

    capabilities = _detect_capabilities_from_model_object(model_obj)
    cap_cache.set(capabilities)
    return capabilities


def get_model_capabilities_map(enabled: bool) -> dict[str, ModelCapabilities]:
    if _is_unavailable(enabled):
        return {}

    try:
        response = request_json('GET', _get_base_url(), '/api/v1/models', headers=_get_headers())
        models_payload = _extract_models_payload(response)
        capabilities_map: dict[str, ModelCapabilities] = {}
        for model_obj in models_payload:
            model_name = _extract_model_name(model_obj)
            if not model_name:
                continue
            capabilities_map[model_name] = get_model_capabilities(enabled, model_obj)
        return capabilities_map
    except Exception as e:
        report_llm_error('Error retrieving model capabilities from LM Studio REST', provider='lmstudio_rest', operation='get_model_capabilities_map', cause=e)
        return {}


def _stream_chat_response(payload: dict[str, Any], operation: str):
    full_response = ''
    upstream_error_message = ''
    stream_payload = payload.copy()
    stream_payload['stream'] = True

    with request_stream(
        'POST',
        _get_base_url(),
        '/api/v1/chat',
        payload=stream_payload,
        headers=_get_headers(),
    ) as response:
        for event in iter_sse_events(response):
            event_name = event.get('event') or 'message'
            event_data = event.get('data') or {}
            event_type = _resolve_stream_event_type(event_name, event_data)

            chunk = _extract_stream_text_delta(event_type, event_data)
            if chunk:
                full_response += chunk
                yield {'chunk': chunk, 'done': False}
                continue

            if event_type in _PROGRESS_EVENT_TYPES:
                yield _build_progress_event_payload(event_type, event_data)
                continue

            if event_type == 'error':
                error_payload = event_data.get('error') if isinstance(event_data, dict) else None
                if isinstance(error_payload, dict):
                    upstream_error_message = str(error_payload.get('message') or '').strip()
                if not upstream_error_message:
                    upstream_error_message = 'Upstream LM Studio REST streaming error.'
                yield {
                    'chunk': '',
                    'done': False,
                    'event': 'error',
                    'error': upstream_error_message,
                    'event_data': event_data if isinstance(event_data, dict) else {},
                }
                continue

            if isinstance(event_data, dict) and event_data.get('raw') == '[DONE]':
                # Defensive fallback for OpenAI-style done sentinels.
                yield {'chunk': '', 'done': True, 'full_response': clean_response(full_response)}
                return

            if event_type == 'chat.end':
                final_text = clean_response(_extract_chat_end_text(event_data) or full_response)
                final_payload = {'chunk': '', 'done': True, 'full_response': final_text}
                if upstream_error_message:
                    final_payload['error'] = upstream_error_message
                yield final_payload
                return

    # Fallback if upstream closes without chat.end. Preserve any partial text.
    fallback_payload = {'chunk': '', 'done': True, 'full_response': clean_response(full_response)}
    if upstream_error_message:
        fallback_payload['error'] = upstream_error_message
    yield fallback_payload


def is_running(enabled: bool) -> bool:
    """Check if LM Studio REST server is reachable."""
    if _is_unavailable(enabled):
        return False

    try:
        request_json('GET', _get_base_url(), '/api/v1/models', headers=_get_headers(), timeout=5.0)
        return True
    except Exception:
        return False


def get_models(enabled: bool) -> list[str]:
    """Retrieve a list of available models from LM Studio REST."""
    if _is_unavailable(enabled):
        return _unavailable_models()

    def _fetch_models() -> list[str]:
        try:
            response = request_json('GET', _get_base_url(), '/api/v1/models', headers=_get_headers())
            models_payload = _extract_models_payload(response)
            models: list[str] = []
            for model_obj in models_payload:
                model_name = _extract_model_name(model_obj)
                if model_name:
                    models.append(model_name)
            return models
        except Exception as e:
            report_llm_error('Error retrieving models from LM Studio REST', provider='lmstudio_rest', operation='get_models', cause=e)
            return _unavailable_models()

    cache = get_llm_cache()
    return cache.get_model_list(
        _PROVIDER_NAME,
        'models',
        _fetch_models,
        label='LM Studio REST models',
    )


def get_vision_models(enabled: bool) -> list[str]:
    """Retrieve a list of available vision models from LM Studio REST."""
    if _is_unavailable(enabled):
        return _unavailable_models()

    def _fetch_vision_models(cache_instance) -> list[str]:
        try:
            response = request_json('GET', _get_base_url(), '/api/v1/models', headers=_get_headers())
            models_payload = _extract_models_payload(response)
            vision_models: list[str] = []

            for model_obj in models_payload:
                model_name = _extract_model_name(model_obj)
                if not model_name:
                    continue

                capabilities = get_model_capabilities(enabled, model_obj)
                cache_instance.set_model_capability(_PROVIDER_NAME, model_name, capabilities.vision)
                if capabilities.vision:
                    vision_models.append(model_name)

            return vision_models
        except Exception as e:
            report_llm_error('Error retrieving vision models from LM Studio REST', provider='lmstudio_rest', operation='get_vision_models', cause=e)
            return []

    cache = get_llm_cache()
    return cache.get_model_list(
        _PROVIDER_NAME,
        'vision_models',
        _fetch_vision_models,
        label='LM Studio REST vision models',
        pass_self=True,
    )


def get_tool_models(enabled: bool) -> list[str]:
    if _is_unavailable(enabled):
        return _unavailable_models()

    capabilities_map = get_model_capabilities_map(enabled)
    return sorted([name for name, capabilities in capabilities_map.items() if capabilities.tool_use])


def get_reasoning_models(enabled: bool) -> list[str]:
    if _is_unavailable(enabled):
        return _unavailable_models()

    capabilities_map = get_model_capabilities_map(enabled)
    return sorted([name for name, capabilities in capabilities_map.items() if capabilities.reasoning])


def load_model(enabled: bool, model: str, keep_alive: int = 0) -> bool:
    """Ask LM Studio REST server to load a model."""
    if _is_unavailable(enabled):
        raise_llm_error(RuntimeError, 'LM Studio REST is not enabled.', provider='lmstudio_rest', operation='load_model')

    # LM Studio REST /api/v1/models/load currently accepts only "model".
    # keep_alive is intentionally ignored for compatibility.
    payload: dict[str, Any] = {'model': model}

    try:
        request_json('POST', _get_base_url(), '/api/v1/models/load', payload=payload, headers=_get_headers())
        return True
    except Exception as e:
        raise_llm_error(RuntimeError, f"Failed to load model '{model}' via LM Studio REST", provider='lmstudio_rest', operation='load_model', cause=RuntimeError(stringify_llm_error(e)))
        return False


def unload_model(enabled: bool, model: str) -> bool:
    """Ask LM Studio REST server to unload a model."""
    if _is_unavailable(enabled):
        return False

    try:
        request_json('POST', _get_base_url(), '/api/v1/models/unload', payload={'model': model}, headers=_get_headers())
        return True
    except Exception as e:
        report_llm_error('Error unloading model via LM Studio REST', provider='lmstudio_rest', operation='unload_model', cause=e)
        return False


def generate(enabled: bool, model: str, prompt: str, options=None, system_prompt: str = '') -> str:
    """Generate a response from LM Studio REST using /api/v1/chat."""
    if _is_unavailable(enabled):
        raise_llm_error(ImportError, 'LM Studio REST is not enabled.', provider='lmstudio_rest', operation='generate')

    model_list = get_models(enabled)
    if model not in model_list:
        raise_llm_error(ValueError, f"Model '{model}' is not available. Available models: {model_list}", provider='lmstudio_rest', operation='generate')

    payload = {
        'model': model,
        'input': prompt,
        'stream': False,
    }
    if system_prompt:
        payload['system_prompt'] = system_prompt
    payload.update(_build_chat_options(options))

    try:
        response = request_json('POST', _get_base_url(), '/api/v1/chat', payload=payload, headers=_get_headers())
        response_text = _extract_response_text(response)
        if not response_text:
            raise_llm_error(ValueError, 'No valid response received from LM Studio REST.', provider='lmstudio_rest', operation='generate')
        return clean_response(response_text)
    except Exception as e:
        report_llm_error('Error generating response from LM Studio REST', provider='lmstudio_rest', operation='generate', cause=e)
        return ''


def generate_vision(enabled: bool, model: str, prompt: str, images, options=None, system_prompt: str = '') -> str:
    """Generate a vision response from LM Studio REST using /api/v1/chat."""
    if _is_unavailable(enabled):
        raise_llm_error(ImportError, 'LM Studio REST is not enabled.', provider='lmstudio_rest', operation='generate_vision')

    if images is None:
        raise_llm_error(ValueError, 'No images provided for vision model.', provider='lmstudio_rest', operation='generate_vision')

    model_list = get_vision_models(enabled)
    if model not in model_list:
        raise_llm_error(ValueError, f"Model '{model}' is not available. Available models: {model_list}", provider='lmstudio_rest', operation='generate_vision')

    image_entries = images if isinstance(images, list) else [images]
    input_items = [{'type': 'text', 'content': prompt}]
    for image_data in image_entries:
        input_items.append(
            {
                'type': 'image',
                'data_url': normalize_image_data_url(str(image_data)),
            }
        )

    payload = {
        'model': model,
        'input': input_items,
        'stream': False,
    }
    if system_prompt:
        payload['system_prompt'] = system_prompt
    payload.update(_build_chat_options(options))

    try:
        response = request_json('POST', _get_base_url(), '/api/v1/chat', payload=payload, headers=_get_headers())
        response_text = _extract_response_text(response)
        if not response_text:
            raise_llm_error(ValueError, 'No valid response received from LM Studio REST.', provider='lmstudio_rest', operation='generate_vision')
        return clean_response(response_text)
    except Exception as e:
        report_llm_error('Error generating vision response from LM Studio REST', provider='lmstudio_rest', operation='generate_vision', cause=e)
        return ''


def generate_stream(enabled: bool, model: str, prompt: str, options=None, system_prompt: str = ''):
    """Generate a real streaming response from LM Studio REST."""
    try:
        if _is_unavailable(enabled):
            raise_llm_error(ImportError, 'LM Studio REST is not enabled.', provider='lmstudio_rest', operation='generate_stream')

        model_list = get_models(enabled)
        if model not in model_list:
            raise_llm_error(ValueError, f"Model '{model}' is not available. Available models: {model_list}", provider='lmstudio_rest', operation='generate_stream')

        payload = {
            'model': model,
            'input': prompt,
        }
        if system_prompt:
            payload['system_prompt'] = system_prompt
        payload.update(_build_chat_options(options))

        for chunk_data in _stream_chat_response(payload, 'generate_stream'):
            yield chunk_data
    except Exception as e:
        report_llm_error('Error streaming response from LM Studio REST', provider='lmstudio_rest', operation='generate_stream', cause=e)
        yield {'chunk': '', 'done': True, 'error': stringify_llm_error(e)}


def generate_vision_stream(enabled: bool, model: str, prompt: str, images, options=None, system_prompt: str = ''):
    """Generate a real streaming vision response from LM Studio REST."""
    try:
        if _is_unavailable(enabled):
            raise_llm_error(ImportError, 'LM Studio REST is not enabled.', provider='lmstudio_rest', operation='generate_vision_stream')

        if images is None:
            raise_llm_error(ValueError, 'No images provided for vision model.', provider='lmstudio_rest', operation='generate_vision_stream')

        model_list = get_vision_models(enabled)
        if model not in model_list:
            raise_llm_error(ValueError, f"Model '{model}' is not available. Available models: {model_list}", provider='lmstudio_rest', operation='generate_vision_stream')

        image_entries = images if isinstance(images, list) else [images]
        input_items = [{'type': 'text', 'content': prompt}]
        for image_data in image_entries:
            input_items.append(
                {
                    'type': 'image',
                    'data_url': normalize_image_data_url(str(image_data)),
                }
            )

        payload = {
            'model': model,
            'input': input_items,
        }
        if system_prompt:
            payload['system_prompt'] = system_prompt
        payload.update(_build_chat_options(options))

        for chunk_data in _stream_chat_response(payload, 'generate_vision_stream'):
            yield chunk_data
    except Exception as e:
        report_llm_error('Error streaming vision response from LM Studio REST', provider='lmstudio_rest', operation='generate_vision_stream', cause=e)
        yield {'chunk': '', 'done': True, 'error': stringify_llm_error(e)}

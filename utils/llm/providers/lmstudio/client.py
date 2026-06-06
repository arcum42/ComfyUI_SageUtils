"""LM Studio REST provider main orchestration and public API."""
from typing import Any, Optional

from ...common import clean_response
from ...cache import get_llm_cache
from ...rest import iter_sse_events, normalize_image_data_url
from ...errors import llm_report, llm_raise, llm_stringify
from ..availability import (
    is_provider_unavailable,
    unavailable_models_placeholder,
    report_fetch_error,
    raise_if_provider_unavailable,
    raise_if_model_unavailable,
    raise_if_missing_images,
    stream_error_payload,
)

from .requests import (
    lmstudio_request_json_models,
    lmstudio_request_json_chat,
    lmstudio_request_json_load,
    lmstudio_request_json_unload,
    lmstudio_request_stream_chat
)

from .capabilities import (
    get_model_capabilities,
    get_model_capabilities_map
)

from .extract import (
    _extract_models_payload, 
    _extract_model_name, 
    _extract_response_text, 
    _extract_chat_end_text, 
    _extract_error_message, 
    _extract_stream_text_delta
)

_PROVIDER_NAME = 'lmstudio_rest'

_UNAVAILABLE_MESSAGE = '(LM Studio REST not available)'

_LMSTUDIO_OPTION_KEY_MAP = (
    ('temperature', 'temperature'),
    ('max_tokens', 'maxTokens'),
    ('topKSampling', 'topKSampling'),
    ('topPSampling', 'topPSampling'),
    ('repeatPenalty', 'repeatPenalty'),
    ('minPSampling', 'minPSampling'),
)

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
        'context_length': 'context_length',
        'reasoning': 'reasoning',
    }

    for key, mapped_key in option_map.items():
        if key in input_options and input_options[key] is not None:
            payload_options[mapped_key] = input_options[key]

    integrations = input_options.get('integrations')
    if isinstance(integrations, list):
        payload_options['integrations'] = integrations

    return payload_options


def _build_lmstudio_stream_payload(
    model: str,
    input_value,
    *,
    options: Optional[dict[str, Any]] = None,
    system_prompt: str = '',
) -> dict[str, Any]:
    payload = {
        'model': model,
        'input': input_value,
    }
    if system_prompt:
        payload['system_prompt'] = system_prompt
    payload.update(_build_chat_options(options))
    return payload

def build_lmstudio_config(options: dict) -> dict:
    """Build LM Studio configuration from options dictionary."""
    config = {}

    if not options:
        return config

    for source_key, target_key in _LMSTUDIO_OPTION_KEY_MAP:
        if source_key in options:
            config[target_key] = options[source_key]

    return config

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

def is_running(enabled: bool) -> bool:
    """Check if LM Studio REST server is reachable."""
    if is_provider_unavailable(enabled):
        return False

    try:
        lmstudio_request_json_models(timeout=5.0)
        return True
    except Exception:
        return False

def get_models(enabled: bool) -> list[str]:
    """Retrieve a list of available models from LM Studio REST."""
    if is_provider_unavailable(enabled):
        return unavailable_models_placeholder(_UNAVAILABLE_MESSAGE)

    def _fetch_models() -> list[str]:
        try:
            response = lmstudio_request_json_models()
            models_payload = _extract_models_payload(response)
            models: list[str] = []
            for model_obj in models_payload:
                model_name = _extract_model_name(model_obj)
                if model_name:
                    models.append(model_name)
            return models
        except Exception as e:
            return report_fetch_error(
                llm_report,
                'Error retrieving models from LM Studio REST',
                provider=_PROVIDER_NAME,
                operation='get_models',
                cause=e,
                fallback=unavailable_models_placeholder(_UNAVAILABLE_MESSAGE),
            )

    cache = get_llm_cache()
    return cache.get_model_list(
        _PROVIDER_NAME,
        'models',
        _fetch_models,
        label='LM Studio REST models',
    )

def get_vision_models(enabled: bool) -> list[str]:
    """Retrieve a list of available vision models from LM Studio REST."""
    if is_provider_unavailable(enabled):
        return unavailable_models_placeholder(_UNAVAILABLE_MESSAGE)

    def _fetch_vision_models(cache_instance) -> list[str]:
        try:
            response = lmstudio_request_json_models()
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
            return report_fetch_error(
                llm_report,
                'Error retrieving vision models from LM Studio REST',
                provider=_PROVIDER_NAME,
                operation='get_vision_models',
                cause=e,
                fallback=[],
            )

    cache = get_llm_cache()
    return cache.get_model_list(
        _PROVIDER_NAME,
        'vision_models',
        _fetch_vision_models,
        label='LM Studio REST vision models',
        pass_self=True,
    )

def get_tool_models(enabled: bool) -> list[str]:
    if is_provider_unavailable(enabled):
        return unavailable_models_placeholder(_UNAVAILABLE_MESSAGE)

    capabilities_map = get_model_capabilities_map(enabled)
    return sorted([name for name, capabilities in capabilities_map.items() if capabilities.tool_use])

def get_reasoning_models(enabled: bool) -> list[str]:
    if is_provider_unavailable(enabled):
        return unavailable_models_placeholder(_UNAVAILABLE_MESSAGE)

    capabilities_map = get_model_capabilities_map(enabled)
    return sorted([name for name, capabilities in capabilities_map.items() if capabilities.reasoning])

def load_model(enabled: bool, model: str, keep_alive: int = 0) -> bool:
    """Ask LM Studio REST server to load a model."""
    raise_if_provider_unavailable(
        enabled,
        llm_raise,
        error_type=RuntimeError,
        message='LM Studio REST is not enabled.',
        provider=_PROVIDER_NAME,
        operation='load_model',
    )

    # keep_alive is not currently used by LM Studio REST.
    payload: dict[str, Any] = {'model': model}

    try:
        lmstudio_request_json_load(payload)
        return True
    except Exception as e:
        llm_raise(RuntimeError, f"Failed to load model '{model}' via LM Studio REST", provider=_PROVIDER_NAME, operation='load_model', cause=RuntimeError(llm_stringify(e)))
        return False

def unload_model(enabled: bool, model: str) -> bool:
    """Ask LM Studio REST server to unload a model."""
    if is_provider_unavailable(enabled):
        return False

    try:
        lmstudio_request_json_unload({'model': model})
        return True
    except Exception as e:
        llm_report('Error unloading model via LM Studio REST', provider=_PROVIDER_NAME, operation='unload_model', cause=e)
        return False


_PROGRESS_EVENT_TYPES = {
    'model_load.start',
    'model_load.progress',
    'model_load.end',
    'prompt_processing.start',
    'prompt_processing.progress',
    'prompt_processing.end',
}

def _stream_chat_response(payload: dict[str, Any], operation: str):
    full_response = ''
    upstream_error_message = ''
    stream_payload = payload.copy()
    stream_payload['stream'] = True

    with lmstudio_request_stream_chat(stream_payload) as response:
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

            is_error_event = event_type == 'error' or event_type.endswith('.error')
            error_message = _extract_error_message(event_data)

            if is_error_event or error_message:
                if error_message:
                    upstream_error_message = error_message
                if not upstream_error_message:
                    upstream_error_message = 'Upstream LM Studio REST streaming error.'
                yield {
                    'chunk': '',
                    'done': True,
                    'event': 'error',
                    'error': upstream_error_message,
                    'event_data': event_data if isinstance(event_data, dict) else {},
                }
                return

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
    cleaned_response = clean_response(full_response)
    fallback_payload = {'chunk': '', 'done': True, 'full_response': cleaned_response}
    if upstream_error_message:
        fallback_payload['error'] = upstream_error_message
    elif not cleaned_response:
        fallback_payload['error'] = (
            'LM Studio stream ended before completion. '
            'The model may have failed to load or ran out of VRAM.'
        )
    yield fallback_payload

def generate_stream(enabled: bool, model: str, prompt: str, options=None, system_prompt: str = ''):
    """Generate a real streaming response from LM Studio REST."""
    try:
        raise_if_provider_unavailable(
            enabled,
            llm_raise,
            error_type=ImportError,
            message='LM Studio REST is not enabled.',
            provider=_PROVIDER_NAME,
            operation='generate_stream',
        )

        model_list = get_models(enabled)
        raise_if_model_unavailable(
            model,
            model_list,
            llm_raise,
            provider=_PROVIDER_NAME,
            operation='generate_stream',
        )

        payload = _build_lmstudio_stream_payload(
            model,
            prompt,
            options=options,
            system_prompt=system_prompt,
        )

        for chunk_data in _stream_chat_response(payload, 'generate_stream'):
            yield chunk_data
    except Exception as e:
        llm_report('Error streaming response from LM Studio REST', provider=_PROVIDER_NAME, operation='generate_stream', cause=e)
        yield stream_error_payload(llm_stringify(e), include_full_response=False)


def generate_vision_stream(enabled: bool, model: str, prompt: str, images, options=None, system_prompt: str = ''):
    """Generate a real streaming vision response from LM Studio REST."""
    try:
        raise_if_provider_unavailable(
            enabled,
            llm_raise,
            error_type=ImportError,
            message='LM Studio REST is not enabled.',
            provider=_PROVIDER_NAME,
            operation='generate_vision_stream',
        )

        raise_if_missing_images(
            images,
            llm_raise,
            provider=_PROVIDER_NAME,
            operation='generate_vision_stream',
        )

        model_list = get_vision_models(enabled)
        raise_if_model_unavailable(
            model,
            model_list,
            llm_raise,
            provider=_PROVIDER_NAME,
            operation='generate_vision_stream',
        )

        image_entries = images if isinstance(images, list) else [images]
        input_items = [{'type': 'text', 'content': prompt}]
        for image_data in image_entries:
            input_items.append(
                {
                    'type': 'image',
                    'data_url': normalize_image_data_url(str(image_data)),
                }
            )

        payload = _build_lmstudio_stream_payload(
            model,
            input_items,
            options=options,
            system_prompt=system_prompt,
        )

        for chunk_data in _stream_chat_response(payload, 'generate_vision_stream'):
            yield chunk_data
    except Exception as e:
        llm_report('Error streaming vision response from LM Studio REST', provider=_PROVIDER_NAME, operation='generate_vision_stream', cause=e)
        yield stream_error_payload(llm_stringify(e), include_full_response=False)

def generate_with_stream(enabled: bool, model: str, prompt: str, options=None, system_prompt: str = '') -> str:
    """Generate a response using the streaming API and return the full result when finished or on error."""
    stream = generate_stream(enabled, model, prompt, options, system_prompt)
    result = ''
    error = None
    for chunk in stream:
        #print(f"DEBUG: Received stream chunk: {chunk}")
        if chunk.get('chunk'):
            result += chunk['chunk']
        if chunk.get('error'):
            error = chunk['error']
            break
        if chunk.get('done'):
            break
    if error:
        llm_raise(RuntimeError, f"Streaming error: {error}", provider=_PROVIDER_NAME, operation='generate_with_stream')
    return clean_response(result)

def generate_vision_with_stream(enabled: bool, model: str, prompt: str, images, options=None, system_prompt: str = '') -> str:
    """Generate a vision response using the streaming API and return the full result when finished or on error."""
    stream = generate_vision_stream(enabled, model, prompt, images, options, system_prompt)
    result = ''
    error = None
    for chunk in stream:
        #print(f"DEBUG: Received stream chunk: {chunk}")
        if chunk.get('chunk'):
            result += chunk['chunk']
        if chunk.get('error'):
            error = chunk['error']
            break
        if chunk.get('done'):
            break
    if error:
        llm_raise(RuntimeError, f"Streaming error: {error}", provider=_PROVIDER_NAME, operation='generate_vision_with_stream')
    return clean_response(result)

"""OpenAI-compatible REST provider main orchestration and public API."""

from .requests import *
from .capabilities import *
from .extract import (
    _extract_model_id,
    _extract_models_payload,
    _extract_response_text,
    _extract_stream_delta
)

from typing import Any, Optional

from ...common import clean_response
from ...cache import get_llm_cache
from ....logger import get_logger
from ...errors import llm_raise, llm_report, llm_stringify
from ...rest import iter_sse_events, normalize_image_data_url
from ..availability import (
    is_provider_unavailable,
    unavailable_models_placeholder,
    report_fetch_error,
    raise_if_provider_unavailable,
    raise_if_missing_images,
    stream_error_payload,
)

logger = get_logger('llm.providers.openai')

_PROVIDER_NAME = 'openai'
_UNAVAILABLE_MESSAGE = '(OpenAI not available)'

# Progress event types tracked during OpenAI streaming
_PROGRESS_EVENT_TYPES = {'generation.start', 'generation.progress', 'generation.end'}

def _build_messages(prompt: str, system_prompt: str = '') -> list[dict[str, Any]]:
    messages = []
    if system_prompt:
        messages.append({'role': 'system', 'content': system_prompt})
    messages.append({'role': 'user', 'content': prompt})
    return messages

def _build_vision_messages(prompt: str, images, system_prompt: str = '') -> list[dict[str, Any]]:
    """Build OpenAI-format messages with inline images."""
    messages = []
    if system_prompt:
        messages.append({'role': 'system', 'content': system_prompt})

    image_entries = images if isinstance(images, list) else [images]

    content_parts: list[dict[str, Any]] = [{'type': 'text', 'text': prompt}]
    for img in image_entries:
        data_url = normalize_image_data_url(str(img))
        content_parts.append({'type': 'image_url', 'image_url': {'url': data_url}})

    messages.append({'role': 'user', 'content': content_parts})
    return messages


def _build_openai_vision_payload(
    model: str,
    prompt: str,
    images,
    *,
    options=None,
    system_prompt: str = '',
    include_stream_field: bool = False,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        'model': model,
        'messages': _build_vision_messages(prompt, images, system_prompt),
    }
    if include_stream_field:
        payload['stream'] = False
    payload.update(_build_options(options))
    return payload

def _build_options(options: Optional[dict[str, Any]]) -> dict[str, Any]:
    input_options = options or {}
    result: dict[str, Any] = {}

    option_map = {
        'temperature': 'temperature',
        'top_p': 'top_p',
        'topP': 'top_p',
        'topPSampling': 'top_p',
        'max_tokens': 'max_completion_tokens',
        'maxTokens': 'max_completion_tokens',
        'max_output_tokens': 'max_completion_tokens',
        'max_completion_tokens': 'max_completion_tokens',
        'seed': 'seed',
        'presence_penalty': 'presence_penalty',
        'frequency_penalty': 'frequency_penalty',
    }

    for key, mapped_key in option_map.items():
        if key in input_options and input_options[key] is not None:
            result[mapped_key] = input_options[key]

    return result

def _build_generation_event_payload(event_type: str, token_count: int = 0) -> dict[str, Any]:
    """Build a progress event payload for OpenAI streaming.
    
    Args:
        event_type: One of 'generation.start', 'generation.progress', 'generation.end'
        token_count: Approximate token count (used for progress calculation)
    
    Returns:
        Event payload with event type and progress metadata
    """
    payload: dict[str, Any] = {'event': event_type, 'type': event_type}
    
    if event_type == 'generation.progress' and token_count > 0:
        # Estimate progress as tokens generated (0.0 to 0.95, reserving 5% for final chunk)
        payload['progress'] = min(0.95, token_count / 100.0)
    
    return payload

def _stream_chat_response(payload: dict[str, Any], operation: str):
    full_response = ''
    token_count = 0
    generation_started = False
    upstream_error_message = None
    
    stream_payload = payload.copy()
    stream_payload['stream'] = True

    with openai_request_stream_chat(stream_payload) as response:
        for event in iter_sse_events(response):
            event_data = event.get('data') or {}

            # Detect terminal [DONE] marker
            if event_data == {'raw': '[DONE]'}:
                if generation_started:
                    # Emit generation.end event
                    yield _build_generation_event_payload('generation.end')
                yield {'chunk': '', 'done': True, 'full_response': clean_response(full_response)}
                return

            if isinstance(event_data, dict):
                # Check for error event
                if event_data.get('error'):
                    error_msg = str(event_data.get('error'))
                    upstream_error_message = error_msg
                    # Emit error event payload
                    yield {'event': 'error', 'type': 'error', 'error': error_msg}
                    # Continue to allow other events, but mark we hit an error
                    continue

                # Extract text delta from this event
                chunk = _extract_stream_delta(event_data)
                
                # Emit generation.start on first chunk with content
                if chunk and not generation_started:
                    generation_started = True
                    yield _build_generation_event_payload('generation.start')
                
                # Process the text chunk
                if chunk:
                    full_response += chunk
                    token_count += 1  # Rough approximation: 1 token per chunk event
                    
                    # Emit text chunk
                    yield {'chunk': chunk, 'done': False}
                    
                    # Emit progress event on every chunk
                    yield _build_generation_event_payload('generation.progress', token_count)

                # Check for completion via finish_reason
                choices = event_data.get('choices')
                if isinstance(choices, list) and choices:
                    first = choices[0]
                    if isinstance(first, dict) and first.get('finish_reason'):
                        # Emit generation.end if not already sent
                        if generation_started:
                            yield _build_generation_event_payload('generation.end')
                        yield {'chunk': '', 'done': True, 'full_response': clean_response(full_response)}
                        return
                continue

    # Fallback completion if stream closed without [DONE]
    if generation_started:
        yield _build_generation_event_payload('generation.end')
    yield {'chunk': '', 'done': True, 'full_response': clean_response(full_response)}


def is_running(enabled: bool) -> bool:
    """Check if the OpenAI-compatible server is reachable."""
    if is_provider_unavailable(enabled):
        return False

    try:
        openai_request_json_models(timeout=10.0)
        return True
    except Exception:
        return False

def get_models(enabled: bool) -> list[str]:
    """Retrieve a list of available models from the OpenAI-compatible endpoint."""
    if is_provider_unavailable(enabled):
        return unavailable_models_placeholder(_UNAVAILABLE_MESSAGE)

    def _fetch_models() -> list[str]:
        try:
            response = openai_request_json_models()
            models_payload = _extract_models_payload(response)
            models: list[str] = []
            for model_obj in models_payload:
                model_id = _extract_model_id(model_obj)
                if model_id:
                    models.append(model_id)
            return sorted(models)
        except Exception as e:
            return report_fetch_error(
                llm_report,
                'Error retrieving models from OpenAI',
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
        label='OpenAI models',
    )

def get_vision_models(enabled: bool) -> list[str]:
    """Retrieve a list of available vision models from the OpenAI-compatible endpoint."""
    if is_provider_unavailable(enabled):
        return unavailable_models_placeholder(_UNAVAILABLE_MESSAGE)

    def _fetch_vision_models(cache_instance) -> list[str]:
        try:
            response = openai_request_json_models()
            models_payload = _extract_models_payload(response)
            vision_models: list[str] = []

            for model_obj in models_payload:
                model_id = _extract_model_id(model_obj)
                if not model_id:
                    continue

                capabilities = get_model_capabilities(enabled, model_obj, model_id)
                cache_instance.set_model_capability(_PROVIDER_NAME, model_id, capabilities.vision)
                if capabilities.vision:
                    vision_models.append(model_id)

            return sorted(vision_models)
        except Exception as e:
            return report_fetch_error(
                llm_report,
                'Error retrieving vision models from OpenAI',
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
        label='OpenAI vision models',
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

def generate(enabled: bool, model: str, prompt: str, options=None, system_prompt: str = '') -> str:
    """Generate a response from an OpenAI-compatible model using /v1/chat/completions."""
    raise_if_provider_unavailable(
        enabled,
        llm_raise,
        error_type=ImportError,
        message='OpenAI provider is not enabled.',
        provider=_PROVIDER_NAME,
        operation='generate',
    )

    payload: dict[str, Any] = {
        'model': model,
        'messages': _build_messages(prompt, system_prompt),
        'stream': False,
    }
    payload.update(_build_options(options))

    try:
        response = openai_request_json_chat(payload)
        response_text = _extract_response_text(response)
        if not response_text:
            llm_raise(ValueError, 'No valid response received from OpenAI.', provider=_PROVIDER_NAME, operation='generate')
        return clean_response(response_text)
    except Exception as e:
        llm_report('Error generating response from OpenAI', provider=_PROVIDER_NAME, operation='generate', cause=e)
        return ''

def generate_vision(enabled: bool, model: str, prompt: str, images=None, options=None, system_prompt: str = '') -> str:
    """Generate a vision response from an OpenAI-compatible model."""
    raise_if_provider_unavailable(
        enabled,
        llm_raise,
        error_type=ImportError,
        message='OpenAI provider is not enabled.',
        provider=_PROVIDER_NAME,
        operation='generate_vision',
    )

    raise_if_missing_images(
        images,
        llm_raise,
        provider=_PROVIDER_NAME,
        operation='generate_vision',
    )

    payload = _build_openai_vision_payload(
        model,
        prompt,
        images,
        options=options,
        system_prompt=system_prompt,
        include_stream_field=True,
    )

    try:
        response = openai_request_json_chat(payload)
        response_text = _extract_response_text(response)
        if not response_text:
            llm_raise(ValueError, 'No valid response received from OpenAI.', provider=_PROVIDER_NAME, operation='generate_vision')
        return clean_response(response_text)
    except Exception as e:
        llm_report('Error generating vision response from OpenAI', provider=_PROVIDER_NAME, operation='generate_vision', cause=e)
        return ''

def generate_stream(enabled: bool, model: str, prompt: str, options=None, system_prompt: str = ''):
    """Generate a real streaming response from an OpenAI-compatible model."""
    try:
        raise_if_provider_unavailable(
            enabled,
            llm_raise,
            error_type=ImportError,
            message='OpenAI provider is not enabled.',
            provider=_PROVIDER_NAME,
            operation='generate_stream',
        )

        payload: dict[str, Any] = {
            'model': model,
            'messages': _build_messages(prompt, system_prompt),
        }
        payload.update(_build_options(options))

        for chunk_data in _stream_chat_response(payload, 'generate_stream'):
            yield chunk_data
    except Exception as e:
        llm_report('Error in OpenAI streaming', provider=_PROVIDER_NAME, operation='generate_stream', cause=e)
        yield stream_error_payload(llm_stringify(e), include_full_response=True)


def generate_vision_stream(enabled: bool, model: str, prompt: str, images=None, options=None, system_prompt: str = ''):
    """Generate a real streaming vision response from an OpenAI-compatible model."""
    try:
        raise_if_provider_unavailable(
            enabled,
            llm_raise,
            error_type=ImportError,
            message='OpenAI provider is not enabled.',
            provider=_PROVIDER_NAME,
            operation='generate_vision_stream',
        )

        raise_if_missing_images(
            images,
            llm_raise,
            provider=_PROVIDER_NAME,
            operation='generate_vision_stream',
        )

        payload = _build_openai_vision_payload(
            model,
            prompt,
            images,
            options=options,
            system_prompt=system_prompt,
            include_stream_field=False,
        )

        for chunk_data in _stream_chat_response(payload, 'generate_vision_stream'):
            yield chunk_data
    except Exception as e:
        llm_report('Error in OpenAI vision streaming', provider=_PROVIDER_NAME, operation='generate_vision_stream', cause=e)
        yield stream_error_payload(llm_stringify(e), include_full_response=True)

"""Ollama REST provider main orchestration and public API."""

from .requests import *
from .capabilities import *
from .tools import *
from .extract import ( 
    _extract_model_name,
    _extract_models_payload,
    _extract_response_text
)

from ...common import clean_response
from ...cache import get_llm_cache
from ...rest import iter_json_lines, normalize_raw_image_base64
from ...errors import llm_raise, llm_report, llm_stringify
from ..availability import (
    is_provider_unavailable,
    unavailable_models_placeholder,
    report_fetch_error,
    raise_if_provider_unavailable,
    raise_if_model_unavailable,
    raise_if_missing_images,
    stream_error_payload,
)
from ...tensor import tensor_to_base64_safe

_PROVIDER_NAME = 'ollama_rest'
_UNAVAILABLE_MESSAGE = '(Ollama REST not available)'
_MAX_TOOL_ITERATIONS = 4

def _get_request_timeout() -> float:
    """Return request timeout seconds for generation calls.

    Uses settings key ollama_rest_timeout_seconds when available.
    Falls back to 180s to accommodate slower first-token/model-load paths.
    """
    from ....settings import get_setting

    raw = get_setting('ollama_rest_timeout_seconds', 240)
    try:
        timeout = float(raw)
    except (TypeError, ValueError):
        return 240.0
    return timeout if timeout > 0 else 240.0

def _build_options(options: Optional[dict[str, Any]]) -> dict[str, Any]:
    input_options = options or {}
    result: dict[str, Any] = {}

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
        'max_tokens': 'num_predict',
        'maxTokens': 'num_predict',
        'max_output_tokens': 'num_predict',
        'num_predict': 'num_predict',
        'num_ctx': 'num_ctx',
        'seed': 'seed',
    }

    for key, mapped_key in option_map.items():
        if key in input_options and input_options[key] is not None:
            result[mapped_key] = input_options[key]

    return result

def _apply_top_level_controls(payload: dict[str, Any], options: Optional[dict[str, Any]]) -> None:
    """Apply non-options controls that Ollama expects at top-level request fields."""
    input_options = options or {}

    think_value = input_options.get('think')
    if think_value is not None:
        payload['think'] = think_value

    tools_value = input_options.get('tools')
    if isinstance(tools_value, list):
        payload['tools'] = tools_value

def _build_messages(prompt: str, system_prompt: str = '', raw_images=None) -> list[dict[str, Any]]:
    messages = []
    if system_prompt:
        messages.append({'role': 'system', 'content': system_prompt})

    user_message: dict[str, Any] = {'role': 'user', 'content': prompt}
    if raw_images:
        user_message['images'] = raw_images
    messages.append(user_message)
    return messages

def _build_ollama_payload(model: str, messages: list[dict[str, Any]], options=None, keep_alive: str = '5m', stream: bool = False) -> dict[str, Any]:
    payload: dict[str, Any] = {
        'model': model,
        'messages': messages,
        'stream': stream,
    }
    if keep_alive:
        payload['keep_alive'] = keep_alive

    _apply_top_level_controls(payload, options)

    built_options = _build_options(options)
    if built_options:
        payload['options'] = built_options

    return payload


def _build_ollama_vision_payload(
    model: str,
    prompt: str,
    images,
    *,
    options=None,
    system_prompt: str = '',
    keep_alive: str = '5m',
    include_stream_field: bool = False,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        'model': model,
        'messages': _build_messages(prompt, system_prompt, raw_images=_normalize_raw_images(images)),
    }
    if include_stream_field:
        payload['stream'] = False
    if keep_alive:
        payload['keep_alive'] = keep_alive

    _apply_top_level_controls(payload, options)

    built_options = _build_options(options)
    if built_options:
        payload['options'] = built_options

    return payload

def _chat_once(payload: dict[str, Any], operation: str) -> dict[str, Any]:
    response = ollama_request_json_chat(payload, timeout=_get_request_timeout())

    if not isinstance(response, dict):
        llm_raise(
            ValueError,
            'Invalid response received from Ollama REST.',
            provider=_PROVIDER_NAME,
            operation=operation,
        )

    if response.get('error'):
        llm_raise(
            RuntimeError,
            str(response.get('error')),
            provider=_PROVIDER_NAME,
            operation=operation,
        )

    return response

def _normalize_raw_images(images=None) -> list[str]:
    if images is None:
        return []

    image_entries = images if isinstance(images, list) else [images]
    raw_images: list[str] = []
    for img in image_entries:
        raw_images.append(normalize_raw_image_base64(str(img)))
    return raw_images

def _stream_chat_response(payload: dict[str, Any], operation: str):
    full_response = ''
    stream_payload = payload.copy()
    stream_payload['stream'] = True

    with ollama_request_stream_chat(stream_payload, timeout=_get_request_timeout()) as response:
        for item in iter_json_lines(response):
            if not isinstance(item, dict):
                continue

            message = item.get('message')
            chunk = ''
            if isinstance(message, dict):
                content = message.get('content')
                if isinstance(content, str):
                    chunk = content

            if chunk:
                full_response += chunk
                yield {'chunk': chunk, 'done': False}

            if item.get('error'):
                llm_raise(RuntimeError, str(item.get('error')), provider=_PROVIDER_NAME, operation=operation)

            if item.get('done'):
                yield {'chunk': '', 'done': True, 'full_response': clean_response(full_response)}
                return

    yield {'chunk': '', 'done': True, 'full_response': clean_response(full_response)}

def is_running(enabled: bool) -> bool:
    """Check if the Ollama REST server is reachable."""
    if is_provider_unavailable(enabled):
        return False

    try:
        ollama_request_json_tags(timeout=5.0)
        return True
    except Exception:
        return False

def get_models(enabled: bool) -> list[str]:
    """Retrieve a list of available models from Ollama REST."""
    if is_provider_unavailable(enabled):
        return unavailable_models_placeholder(_UNAVAILABLE_MESSAGE)

    def _fetch_models() -> list[str]:
        try:
            response = ollama_request_json_tags(timeout=_get_request_timeout())
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
                'Error retrieving models from Ollama REST',
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
        label='Ollama REST models',
    )

def get_vision_models(enabled: bool) -> list[str]:
    """Retrieve a list of available vision models from Ollama REST."""
    if is_provider_unavailable(enabled):
        return unavailable_models_placeholder(_UNAVAILABLE_MESSAGE)

    def _fetch_vision_models(cache_instance) -> list[str]:
        try:
            response = ollama_request_json_tags(timeout=_get_request_timeout())
            models_payload = _extract_models_payload(response)
            vision_models: list[str] = []

            for model_obj in models_payload:
                model_name = _extract_model_name(model_obj)
                if not model_name:
                    continue

                capabilities = get_model_capabilities(enabled, model_name, model_obj)
                cache_instance.set_model_capability(_PROVIDER_NAME, model_name, capabilities.vision)
                if capabilities.vision:
                    vision_models.append(model_name)

            return vision_models
        except Exception as e:
            return report_fetch_error(
                llm_report,
                'Error retrieving vision models from Ollama REST',
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
        label='Ollama REST vision models',
        pass_self=True,
    )

def get_tool_models(enabled: bool) -> list[str]:
    if is_provider_unavailable(enabled):
        return unavailable_models_placeholder(_UNAVAILABLE_MESSAGE)

    capabilities_map = get_model_capabilities_map(enabled, model_names=get_models(enabled))
    return sorted([name for name, capabilities in capabilities_map.items() if capabilities.tool_use])

def get_reasoning_models(enabled: bool) -> list[str]:
    if is_provider_unavailable(enabled):
        return unavailable_models_placeholder(_UNAVAILABLE_MESSAGE)

    capabilities_map = get_model_capabilities_map(enabled, model_names=get_models(enabled))
    return sorted([name for name, capabilities in capabilities_map.items() if capabilities.reasoning])

def load_model(enabled: bool, model: str, keep_alive: int = 60) -> bool:
    """Warm-load an Ollama model via /api/generate with an empty prompt."""
    raise_if_provider_unavailable(
        enabled,
        llm_raise,
        error_type=ImportError,
        message='Ollama REST is not enabled.',
        provider=_PROVIDER_NAME,
        operation='load_model',
    )

    try:
        keep_alive_seconds = max(0, int(keep_alive))
    except (TypeError, ValueError):
        keep_alive_seconds = 60

    payload = {
        'model': model,
        'prompt': '',
        'stream': False,
        'keep_alive': f'{keep_alive_seconds}s',
    }

    try:
        response = ollama_request_json_generate(payload, timeout=_get_request_timeout())
        if isinstance(response, dict) and response.get('error'):
            llm_raise(RuntimeError, str(response.get('error')), provider=_PROVIDER_NAME, operation='load_model')
        return True
    except Exception as e:
        llm_report('Error preloading model via Ollama REST', provider=_PROVIDER_NAME, operation='load_model', cause=e)
        return False

def generate(enabled: bool, model: str, prompt: str, options=None, system_prompt: str = '', keep_alive: str = '5m') -> str:
    """Generate a response from Ollama REST using /api/chat."""
    raise_if_provider_unavailable(
        enabled,
        llm_raise,
        error_type=ImportError,
        message='Ollama REST is not enabled.',
        provider=_PROVIDER_NAME,
        operation='generate',
    )

    messages = _build_messages(prompt, system_prompt)

    try:
        if is_tool_loop_enabled(options):
            response_text, _ = generate_with_tool_loop(
                model,
                messages,
                options=options,
                keep_alive=keep_alive,
                operation='generate',
                max_iterations=_MAX_TOOL_ITERATIONS,
                build_payload=_build_ollama_payload,
                chat_once=_chat_once,
                extract_response_text=_extract_response_text,
            )
        else:
            payload = _build_ollama_payload(model, messages, options=options, keep_alive=keep_alive, stream=False)
            response = _chat_once(payload, 'generate')
            response_text = _extract_response_text(response)

        if not response_text:
            llm_raise(ValueError, 'No valid response received from Ollama REST.', provider=_PROVIDER_NAME, operation='generate')

        return clean_response(response_text)
    except Exception as e:
        llm_report('Error generating response from Ollama REST', provider=_PROVIDER_NAME, operation='generate', cause=e)
        return ''

def generate_vision(enabled: bool, model: str, prompt: str, images=None, options=None, system_prompt: str = '', keep_alive: str = '5m') -> str:
    """Generate a vision response from Ollama REST using /api/chat with inline images."""
    raise_if_provider_unavailable(
        enabled,
        llm_raise,
        error_type=ImportError,
        message='Ollama REST is not enabled.',
        provider=_PROVIDER_NAME,
        operation='generate_vision',
    )

    raise_if_missing_images(
        images,
        llm_raise,
        provider=_PROVIDER_NAME,
        operation='generate_vision',
    )

    payload = _build_ollama_vision_payload(
        model,
        prompt,
        images,
        options=options,
        system_prompt=system_prompt,
        keep_alive=keep_alive,
        include_stream_field=True,
    )

    try:
        response = ollama_request_json_chat(payload, timeout=_get_request_timeout())
        response_text = _extract_response_text(response)
        if not response_text:
            llm_raise(ValueError, 'No valid response received from Ollama REST.', provider=_PROVIDER_NAME, operation='generate_vision')
        return clean_response(response_text)
    except Exception as e:
        llm_report('Error generating vision response from Ollama REST', provider=_PROVIDER_NAME, operation='generate_vision', cause=e)
        return ''

def generate_stream(enabled: bool, model: str, prompt: str, options=None, system_prompt: str = '', keep_alive: str = '5m'):
    """Generate a real streaming response from Ollama REST."""
    try:
        raise_if_provider_unavailable(
            enabled,
            llm_raise,
            error_type=ImportError,
            message='Ollama REST is not enabled.',
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

        messages = _build_messages(prompt, system_prompt)

        if is_tool_loop_enabled(options):
            yield {'event': 'tool_loop.start', 'done': False}
            final_text, tool_events = generate_with_tool_loop(
                model,
                messages,
                options=options,
                keep_alive=keep_alive,
                operation='generate_stream',
                max_iterations=_MAX_TOOL_ITERATIONS,
                build_payload=_build_ollama_payload,
                chat_once=_chat_once,
                extract_response_text=_extract_response_text,
            )
            for event_payload in tool_events:
                yield event_payload

            if final_text:
                yield {'chunk': final_text, 'done': False}

            yield {'event': 'tool_loop.end', 'done': True, 'full_response': clean_response(final_text)}
            return

        payload = _build_ollama_payload(model, messages, options=options, keep_alive=keep_alive, stream=False)
        for chunk_data in _stream_chat_response(payload, 'generate_stream'):
            yield chunk_data
    except Exception as e:
        llm_report('Error in Ollama REST streaming', provider=_PROVIDER_NAME, operation='generate_stream', cause=e)
        yield stream_error_payload(llm_stringify(e), include_full_response=True)

def generate_vision_stream(enabled: bool, model: str, prompt: str, images=None, options=None, system_prompt: str = '', keep_alive: str = '5m'):
    """Generate a real streaming vision response from Ollama REST."""
    try:
        raise_if_provider_unavailable(
            enabled,
            llm_raise,
            error_type=ImportError,
            message='Ollama REST is not enabled.',
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

        payload = _build_ollama_vision_payload(
            model,
            prompt,
            images,
            options=options,
            system_prompt=system_prompt,
            keep_alive=keep_alive,
            include_stream_field=False,
        )

        for chunk_data in _stream_chat_response(payload, 'generate_vision_stream'):
            yield chunk_data
    except Exception as e:
        llm_report('Error in Ollama REST vision streaming', provider=_PROVIDER_NAME, operation='generate_vision_stream', cause=e)
        yield stream_error_payload(llm_stringify(e), include_full_response=True)

def build_response_parameters(model: str, prompt: str, keep_alive: float, options: dict, system_prompt: str, images) -> dict:
    """Build the response parameters for Ollama generate call."""
    response_parameters = {
        'model': model,
        'prompt': prompt,
        'stream': False,
        'keep_alive': keep_alive,
    }
    if system_prompt and isinstance(system_prompt, str) and system_prompt != '':
        response_parameters['system'] = system_prompt

    if options and isinstance(options, dict):
        response_parameters['options'] = options

    if images is not None:
        response_parameters['images'] = tensor_to_base64_safe(images)

    return response_parameters

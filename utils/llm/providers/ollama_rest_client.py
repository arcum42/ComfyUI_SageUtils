"""Ollama REST provider operations using the native HTTP API (no SDK required)."""

import os
from typing import Any, Dict, Optional

from ..cache import get_llm_cache
from ...logger import get_logger
from ..common import clean_response
from ..errors import raise_llm_error, report_llm_error, stringify_llm_error
from ..rest import iter_text_chunks, normalize_base_url, normalize_image_data_url, request_json, with_bearer_auth

logger = get_logger('llm.providers.ollama_rest')

_PROVIDER_NAME = 'ollama_rest'
_DEFAULT_BASE_URL = 'http://localhost:11434'
_UNAVAILABLE_MESSAGE = '(Ollama REST not available)'


def _unavailable_models() -> list[str]:
    return [_UNAVAILABLE_MESSAGE]


def _is_unavailable(enabled: bool) -> bool:
    return not enabled


def _get_base_url() -> str:
    from ...settings import get_setting

    use_custom = bool(get_setting('ollama_use_custom_url', False))
    custom_url = str(
        get_setting('ollama_custom_url', get_setting('custom_ollama_url', ''))
    ) if use_custom else ''
    return normalize_base_url(custom_url, _DEFAULT_BASE_URL)


def _get_headers() -> Dict[str, str]:
    token = os.environ.get('OLLAMA_API_TOKEN', '')
    return with_bearer_auth({}, token)


def _extract_model_name(model_obj: Any) -> Optional[str]:
    if not isinstance(model_obj, dict):
        return None

    for key in ('name', 'model', 'id'):
        value = model_obj.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    return None


def _extract_models_payload(response: Any) -> list[dict[str, Any]]:
    if isinstance(response, dict):
        for key in ('models', 'data', 'items'):
            value = response.get(key)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]

    if isinstance(response, list):
        return [item for item in response if isinstance(item, dict)]

    return []


def _is_vision_model(model_obj: dict[str, Any], model_name: str) -> bool:
    """Detect vision capability from Ollama model metadata."""
    details = model_obj.get('details')
    if isinstance(details, dict):
        families = details.get('families')
        if isinstance(families, list):
            lowered_families = [str(f).lower() for f in families]
            if any(f in ('clip', 'vision') for f in lowered_families):
                return True

    lowered = model_name.lower()
    vision_markers = ('llava', 'vision', 'bakllava', 'minicpm-v', 'qwen2-vl', 'qwen2.5-vl', '-vl-', 'moondream')
    return any(marker in lowered for marker in vision_markers)


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


def _extract_response_text(response: Any) -> str:
    """Extract text from an Ollama /api/chat response."""
    if isinstance(response, dict):
        message = response.get('message')
        if isinstance(message, dict):
            content = message.get('content')
            if isinstance(content, str):
                return content

    return ''


def is_running(enabled: bool) -> bool:
    """Check if the Ollama REST server is reachable."""
    if _is_unavailable(enabled):
        return False

    try:
        request_json('GET', _get_base_url(), '/api/tags', headers=_get_headers(), timeout=5.0)
        return True
    except Exception:
        return False


def get_models(enabled: bool) -> list[str]:
    """Retrieve a list of available models from Ollama REST."""
    if _is_unavailable(enabled):
        return _unavailable_models()

    def _fetch_models() -> list[str]:
        try:
            response = request_json('GET', _get_base_url(), '/api/tags', headers=_get_headers())
            models_payload = _extract_models_payload(response)
            models: list[str] = []
            for model_obj in models_payload:
                model_name = _extract_model_name(model_obj)
                if model_name:
                    models.append(model_name)
            return models
        except Exception as e:
            report_llm_error('Error retrieving models from Ollama REST', provider=_PROVIDER_NAME, operation='get_models', cause=e)
            return _unavailable_models()

    cache = get_llm_cache()
    return cache.get_model_list(
        _PROVIDER_NAME,
        'models',
        _fetch_models,
        label='Ollama REST models',
    )


def get_vision_models(enabled: bool) -> list[str]:
    """Retrieve a list of available vision models from Ollama REST."""
    if _is_unavailable(enabled):
        return _unavailable_models()

    def _fetch_vision_models(cache_instance) -> list[str]:
        try:
            response = request_json('GET', _get_base_url(), '/api/tags', headers=_get_headers())
            models_payload = _extract_models_payload(response)
            vision_models: list[str] = []

            for model_obj in models_payload:
                model_name = _extract_model_name(model_obj)
                if not model_name:
                    continue

                cached_vision = cache_instance.get_model_capability(_PROVIDER_NAME, model_name)
                if cached_vision is not None:
                    if cached_vision:
                        vision_models.append(model_name)
                    continue

                is_vision = _is_vision_model(model_obj, model_name)
                cache_instance.set_model_capability(_PROVIDER_NAME, model_name, is_vision)
                if is_vision:
                    vision_models.append(model_name)

            return vision_models
        except Exception as e:
            report_llm_error('Error retrieving vision models from Ollama REST', provider=_PROVIDER_NAME, operation='get_vision_models', cause=e)
            return []

    cache = get_llm_cache()
    return cache.get_model_list(
        _PROVIDER_NAME,
        'vision_models',
        _fetch_vision_models,
        label='Ollama REST vision models',
        pass_self=True,
    )


def generate(enabled: bool, model: str, prompt: str, options=None, system_prompt: str = '', keep_alive: str = '5m') -> str:
    """Generate a response from Ollama REST using /api/chat."""
    if _is_unavailable(enabled):
        raise_llm_error(ImportError, 'Ollama REST is not enabled.', provider=_PROVIDER_NAME, operation='generate')

    messages = []
    if system_prompt:
        messages.append({'role': 'system', 'content': system_prompt})
    messages.append({'role': 'user', 'content': prompt})

    payload: dict[str, Any] = {
        'model': model,
        'messages': messages,
        'stream': False,
    }
    if keep_alive:
        payload['keep_alive'] = keep_alive

    built_options = _build_options(options)
    if built_options:
        payload['options'] = built_options

    try:
        response = request_json('POST', _get_base_url(), '/api/chat', payload=payload, headers=_get_headers())
        response_text = _extract_response_text(response)
        if not response_text:
            raise_llm_error(ValueError, 'No valid response received from Ollama REST.', provider=_PROVIDER_NAME, operation='generate')
        return clean_response(response_text)
    except Exception as e:
        report_llm_error('Error generating response from Ollama REST', provider=_PROVIDER_NAME, operation='generate', cause=e)
        return ''


def generate_vision(enabled: bool, model: str, prompt: str, images=None, options=None, system_prompt: str = '', keep_alive: str = '5m') -> str:
    """Generate a vision response from Ollama REST using /api/chat with inline images."""
    if _is_unavailable(enabled):
        raise_llm_error(ImportError, 'Ollama REST is not enabled.', provider=_PROVIDER_NAME, operation='generate_vision')

    if images is None:
        raise_llm_error(ValueError, 'No images provided for vision model.', provider=_PROVIDER_NAME, operation='generate_vision')

    image_entries = images if isinstance(images, list) else [images]

    # Ollama expects base64-encoded strings (no data URL prefix)
    raw_images = []
    for img in image_entries:
        img_str = str(img)
        if img_str.startswith('data:'):
            # Strip the data URL prefix: "data:image/png;base64,<data>"
            if ',' in img_str:
                img_str = img_str.split(',', 1)[1]
        raw_images.append(img_str)

    messages = []
    if system_prompt:
        messages.append({'role': 'system', 'content': system_prompt})
    messages.append({'role': 'user', 'content': prompt, 'images': raw_images})

    payload: dict[str, Any] = {
        'model': model,
        'messages': messages,
        'stream': False,
    }
    if keep_alive:
        payload['keep_alive'] = keep_alive

    built_options = _build_options(options)
    if built_options:
        payload['options'] = built_options

    try:
        response = request_json('POST', _get_base_url(), '/api/chat', payload=payload, headers=_get_headers())
        response_text = _extract_response_text(response)
        if not response_text:
            raise_llm_error(ValueError, 'No valid response received from Ollama REST.', provider=_PROVIDER_NAME, operation='generate_vision')
        return clean_response(response_text)
    except Exception as e:
        report_llm_error('Error generating vision response from Ollama REST', provider=_PROVIDER_NAME, operation='generate_vision', cause=e)
        return ''


def generate_stream(enabled: bool, model: str, prompt: str, options=None, system_prompt: str = '', keep_alive: str = '5m'):
    """Generate a simulated streaming response from Ollama REST."""
    try:
        response_text = generate(enabled, model, prompt, options=options, system_prompt=system_prompt, keep_alive=keep_alive)
        for chunk in iter_text_chunks(response_text, chunk_size=5):
            yield {'chunk': chunk, 'done': False}
        yield {'chunk': '', 'done': True, 'full_response': response_text}
    except Exception as e:
        report_llm_error('Error in Ollama REST streaming', provider=_PROVIDER_NAME, operation='generate_stream', cause=e)
        yield {'chunk': '', 'done': True, 'full_response': '', 'error': stringify_llm_error(e)}


def generate_vision_stream(enabled: bool, model: str, prompt: str, images=None, options=None, system_prompt: str = '', keep_alive: str = '5m'):
    """Generate a simulated streaming vision response from Ollama REST."""
    try:
        response_text = generate_vision(enabled, model, prompt, images=images, options=options, system_prompt=system_prompt, keep_alive=keep_alive)
        for chunk in iter_text_chunks(response_text, chunk_size=5):
            yield {'chunk': chunk, 'done': False}
        yield {'chunk': '', 'done': True, 'full_response': response_text}
    except Exception as e:
        report_llm_error('Error in Ollama REST vision streaming', provider=_PROVIDER_NAME, operation='generate_vision_stream', cause=e)
        yield {'chunk': '', 'done': True, 'full_response': '', 'error': stringify_llm_error(e)}

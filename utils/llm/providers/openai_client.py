"""OpenAI-compatible REST provider using the /v1 API.

Works with OpenAI, Azure OpenAI, and any other OpenAI-compatible endpoint
(e.g., LocalAI, vLLM, Groq, Together AI, etc.).
"""

import os
from typing import Any, Dict, Optional

from ..cache import get_llm_cache
from ...logger import get_logger
from ..common import clean_response
from ..errors import raise_llm_error, report_llm_error, stringify_llm_error
from ..rest import iter_sse_events, normalize_base_url, normalize_image_data_url, request_json, request_stream, with_bearer_auth
from ..capabilities import ModelCapabilities, get_capability_cache

logger = get_logger('llm.providers.openai')

_PROVIDER_NAME = 'openai'
_DEFAULT_BASE_URL = 'https://api.openai.com'
_UNAVAILABLE_MESSAGE = '(OpenAI not available)'

# Models known to support vision (image input). This list is supplemented by
# name-based heuristics so it doesn't need to be exhaustive.
_KNOWN_VISION_MODEL_PREFIXES = (
    'gpt-4o',
    'gpt-4-turbo',
    'gpt-4-vision',
    'glm-4.6v',
    'o1',
    'o3',
    'o4',
    'claude-',
    'gemini-',
    'llava',
    'vision',
    'minicpm-v',
    'qwen-vl',
    'qwen2-vl',
    'qwen2.5-vl',
    'qwen3-vl',
    'qwen3.5-vl',
    'qwen3.6',
    'gemma-3',
    'gemma-4',
    'llama-joycaption'
)

_OPENAI_MODEL_CAPABILITIES: dict[str, dict[str, bool]] = {
    'gpt-4o': {'vision': True, 'tool_use': True, 'reasoning': False, 'thinking': False},
    'gpt-4o-mini': {'vision': True, 'tool_use': True, 'reasoning': False, 'thinking': False},
    'gpt-4-turbo': {'vision': True, 'tool_use': True, 'reasoning': False, 'thinking': False},
    'gpt-4-vision-preview': {'vision': True, 'tool_use': False, 'reasoning': False, 'thinking': False},
    'gpt-4': {'vision': False, 'tool_use': True, 'reasoning': False, 'thinking': False},
    'gpt-3.5-turbo': {'vision': False, 'tool_use': True, 'reasoning': False, 'thinking': False},
    'o1': {'vision': False, 'tool_use': False, 'reasoning': True, 'thinking': True},
    'o1-mini': {'vision': False, 'tool_use': False, 'reasoning': True, 'thinking': True},
    'o3': {'vision': False, 'tool_use': False, 'reasoning': True, 'thinking': True},
    'o3-mini': {'vision': False, 'tool_use': False, 'reasoning': True, 'thinking': True},
}


def _unavailable_models() -> list[str]:
    return [_UNAVAILABLE_MESSAGE]


def _is_unavailable(enabled: bool) -> bool:
    return not enabled


def _get_base_url() -> str:
    from ...settings import get_setting

    use_custom = bool(get_setting('openai_use_custom_url', False))
    custom_url = str(get_setting('openai_base_url', '')) if use_custom else ''
    return normalize_base_url(custom_url, _DEFAULT_BASE_URL)


def _get_api_key() -> str:
    from ...settings import get_setting

    # Prefer explicit setting, then environment variable
    key = str(get_setting('openai_api_key', '')).strip()
    if not key:
        key = os.environ.get('OPENAI_API_KEY', '').strip()
    return key


def _get_headers() -> Dict[str, str]:
    return with_bearer_auth({}, _get_api_key())


def _extract_model_id(model_obj: Any) -> Optional[str]:
    if not isinstance(model_obj, dict):
        return None

    for key in ('id', 'model', 'name'):
        value = model_obj.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    return None


def _extract_models_payload(response: Any) -> list[dict[str, Any]]:
    """Extract model list from OpenAI /v1/models response."""
    if isinstance(response, dict):
        for key in ('data', 'models', 'items'):
            value = response.get(key)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]

    if isinstance(response, list):
        return [item for item in response if isinstance(item, dict)]

    return []


def _is_vision_model(model_obj: dict[str, Any], model_name: str) -> bool:
    """Fallback heuristic for vision capability when provider metadata is incomplete."""
    # Some compatible endpoints expose a capabilities field
    capabilities = model_obj.get('capabilities') or model_obj.get('features') or []
    if isinstance(capabilities, list):
        if any(str(c).lower() in ('vision', 'image_input', 'images') for c in capabilities):
            return True
    if isinstance(capabilities, dict):
        if capabilities.get('vision') is True or capabilities.get('image_input') is True:
            return True

    lowered = model_name.lower()
    return any(prefix in lowered for prefix in _KNOWN_VISION_MODEL_PREFIXES)


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


def _extract_response_text(response: Any) -> str:
    """Extract assistant content from an OpenAI /v1/chat/completions response."""
    if isinstance(response, dict):
        choices = response.get('choices')
        if isinstance(choices, list) and choices:
            first = choices[0]
            if isinstance(first, dict):
                message = first.get('message')
                if isinstance(message, dict):
                    content = message.get('content')
                    if isinstance(content, str):
                        return content

    return ''


def _extract_stream_delta(payload: Any) -> str:
    if not isinstance(payload, dict):
        return ''

    choices = payload.get('choices')
    if not isinstance(choices, list) or not choices:
        return ''

    first = choices[0]
    if not isinstance(first, dict):
        return ''

    delta = first.get('delta')
    if isinstance(delta, dict):
        content = delta.get('content')
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts: list[str] = []
            for item in content:
                if isinstance(item, dict) and item.get('type') == 'text' and isinstance(item.get('text'), str):
                    parts.append(item['text'])
            return ''.join(parts)

    return ''


def _match_openai_capability_profile(model_name: str) -> Optional[dict[str, bool]]:
    lowered = model_name.lower()
    for known_name, profile in _OPENAI_MODEL_CAPABILITIES.items():
        known_lower = known_name.lower()
        if lowered == known_lower or lowered.startswith(f'{known_lower}-'):
            return profile
    return None


def _detect_capabilities_from_metadata(model_obj: dict[str, Any], model_name: str) -> ModelCapabilities:
    capabilities_obj = model_obj.get('capabilities') or model_obj.get('features') or {}
    if isinstance(capabilities_obj, dict):
        vision = bool(capabilities_obj.get('vision') or capabilities_obj.get('image_input'))
        tool_use = bool(capabilities_obj.get('tool_use') or capabilities_obj.get('function_calling'))
        reasoning = bool(capabilities_obj.get('reasoning'))
        thinking = bool(capabilities_obj.get('thinking'))
        if any((vision, tool_use, reasoning, thinking)):
            return ModelCapabilities(
                name=model_name,
                provider=_PROVIDER_NAME,
                vision=vision,
                tool_use=tool_use,
                reasoning=reasoning,
                thinking=thinking,
                supported_modalities=['text'] + (['image'] if vision else []),
                metadata=model_obj,
                confidence='api',
            )
    if isinstance(capabilities_obj, list):
        normalized = {str(item).lower() for item in capabilities_obj}
        vision = any(flag in normalized for flag in ('vision', 'image_input', 'images'))
        tool_use = any(flag in normalized for flag in ('tool_use', 'function_calling', 'tools'))
        reasoning = 'reasoning' in normalized
        thinking = 'thinking' in normalized
        if any((vision, tool_use, reasoning, thinking)):
            return ModelCapabilities(
                name=model_name,
                provider=_PROVIDER_NAME,
                vision=vision,
                tool_use=tool_use,
                reasoning=reasoning,
                thinking=thinking,
                supported_modalities=['text'] + (['image'] if vision else []),
                metadata=model_obj,
                confidence='api',
            )

    profile = _match_openai_capability_profile(model_name)
    if profile is not None:
        vision = bool(profile.get('vision'))
        return ModelCapabilities(
            name=model_name,
            provider=_PROVIDER_NAME,
            vision=vision,
            tool_use=bool(profile.get('tool_use')),
            reasoning=bool(profile.get('reasoning')),
            thinking=bool(profile.get('thinking')),
            supported_modalities=['text'] + (['image'] if vision else []),
            metadata=model_obj,
            confidence='heuristic',
        )

    vision = _is_vision_model(model_obj, model_name)
    lowered = model_name.lower()
    reasoning = any(marker in lowered for marker in ('o1', 'o3', 'o4', 'reasoning', 'deepseek-r1', 'qwq'))
    return ModelCapabilities(
        name=model_name,
        provider=_PROVIDER_NAME,
        vision=vision,
        tool_use=not reasoning,
        reasoning=reasoning,
        thinking=reasoning,
        supported_modalities=['text'] + (['image'] if vision else []),
        metadata=model_obj,
        confidence='heuristic',
    )


def get_model_capabilities(enabled: bool, model_obj: dict[str, Any], model_name: str) -> ModelCapabilities:
    if _is_unavailable(enabled):
        return ModelCapabilities(name=model_name, provider=_PROVIDER_NAME, confidence='guess')

    cap_cache = get_capability_cache()
    cached = cap_cache.get(_PROVIDER_NAME, model_name)
    if cached is not None:
        return cached

    capabilities = _detect_capabilities_from_metadata(model_obj, model_name)
    cap_cache.set(capabilities)
    return capabilities


def get_model_capabilities_map(enabled: bool) -> dict[str, ModelCapabilities]:
    if _is_unavailable(enabled):
        return {}

    try:
        response = request_json('GET', _get_base_url(), '/v1/models', headers=_get_headers())
        models_payload = _extract_models_payload(response)
        capabilities_map: dict[str, ModelCapabilities] = {}
        for model_obj in models_payload:
            model_id = _extract_model_id(model_obj)
            if not model_id:
                continue
            capabilities_map[model_id] = get_model_capabilities(enabled, model_obj, model_id)
        return capabilities_map
    except Exception as e:
        report_llm_error('Error retrieving model capabilities from OpenAI', provider=_PROVIDER_NAME, operation='get_model_capabilities_map', cause=e)
        return {}


def _stream_chat_response(payload: dict[str, Any], operation: str):
    full_response = ''
    stream_payload = payload.copy()
    stream_payload['stream'] = True

    with request_stream(
        'POST',
        _get_base_url(),
        '/v1/chat/completions',
        payload=stream_payload,
        headers=_get_headers(),
    ) as response:
        for event in iter_sse_events(response):
            event_data = event.get('data') or {}

            if event_data == {'raw': '[DONE]'}:
                yield {'chunk': '', 'done': True, 'full_response': clean_response(full_response)}
                return

            if isinstance(event_data, dict):
                if event_data.get('error'):
                    raise_llm_error(RuntimeError, str(event_data.get('error')), provider=_PROVIDER_NAME, operation=operation)

                chunk = _extract_stream_delta(event_data)
                if chunk:
                    full_response += chunk
                    yield {'chunk': chunk, 'done': False}

                choices = event_data.get('choices')
                if isinstance(choices, list) and choices:
                    first = choices[0]
                    if isinstance(first, dict) and first.get('finish_reason'):
                        yield {'chunk': '', 'done': True, 'full_response': clean_response(full_response)}
                        return
                continue

    yield {'chunk': '', 'done': True, 'full_response': clean_response(full_response)}


def is_running(enabled: bool) -> bool:
    """Check if the OpenAI-compatible server is reachable."""
    if _is_unavailable(enabled):
        return False

    try:
        request_json('GET', _get_base_url(), '/v1/models', headers=_get_headers(), timeout=10.0)
        return True
    except Exception:
        return False


def get_models(enabled: bool) -> list[str]:
    """Retrieve a list of available models from the OpenAI-compatible endpoint."""
    if _is_unavailable(enabled):
        return _unavailable_models()

    def _fetch_models() -> list[str]:
        try:
            response = request_json('GET', _get_base_url(), '/v1/models', headers=_get_headers())
            models_payload = _extract_models_payload(response)
            models: list[str] = []
            for model_obj in models_payload:
                model_id = _extract_model_id(model_obj)
                if model_id:
                    models.append(model_id)
            return sorted(models)
        except Exception as e:
            report_llm_error('Error retrieving models from OpenAI', provider=_PROVIDER_NAME, operation='get_models', cause=e)
            return _unavailable_models()

    cache = get_llm_cache()
    return cache.get_model_list(
        _PROVIDER_NAME,
        'models',
        _fetch_models,
        label='OpenAI models',
    )


def get_vision_models(enabled: bool) -> list[str]:
    """Retrieve a list of available vision models from the OpenAI-compatible endpoint."""
    if _is_unavailable(enabled):
        return _unavailable_models()

    def _fetch_vision_models(cache_instance) -> list[str]:
        try:
            response = request_json('GET', _get_base_url(), '/v1/models', headers=_get_headers())
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
            report_llm_error('Error retrieving vision models from OpenAI', provider=_PROVIDER_NAME, operation='get_vision_models', cause=e)
            return []

    cache = get_llm_cache()
    return cache.get_model_list(
        _PROVIDER_NAME,
        'vision_models',
        _fetch_vision_models,
        label='OpenAI vision models',
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


def generate(enabled: bool, model: str, prompt: str, options=None, system_prompt: str = '') -> str:
    """Generate a response from an OpenAI-compatible model using /v1/chat/completions."""
    if _is_unavailable(enabled):
        raise_llm_error(ImportError, 'OpenAI provider is not enabled.', provider=_PROVIDER_NAME, operation='generate')

    payload: dict[str, Any] = {
        'model': model,
        'messages': _build_messages(prompt, system_prompt),
        'stream': False,
    }
    payload.update(_build_options(options))

    try:
        response = request_json('POST', _get_base_url(), '/v1/chat/completions', payload=payload, headers=_get_headers())
        response_text = _extract_response_text(response)
        if not response_text:
            raise_llm_error(ValueError, 'No valid response received from OpenAI.', provider=_PROVIDER_NAME, operation='generate')
        return clean_response(response_text)
    except Exception as e:
        report_llm_error('Error generating response from OpenAI', provider=_PROVIDER_NAME, operation='generate', cause=e)
        return ''


def generate_vision(enabled: bool, model: str, prompt: str, images=None, options=None, system_prompt: str = '') -> str:
    """Generate a vision response from an OpenAI-compatible model."""
    if _is_unavailable(enabled):
        raise_llm_error(ImportError, 'OpenAI provider is not enabled.', provider=_PROVIDER_NAME, operation='generate_vision')

    if images is None:
        raise_llm_error(ValueError, 'No images provided for vision model.', provider=_PROVIDER_NAME, operation='generate_vision')

    payload: dict[str, Any] = {
        'model': model,
        'messages': _build_vision_messages(prompt, images, system_prompt),
        'stream': False,
    }
    payload.update(_build_options(options))

    try:
        response = request_json('POST', _get_base_url(), '/v1/chat/completions', payload=payload, headers=_get_headers())
        response_text = _extract_response_text(response)
        if not response_text:
            raise_llm_error(ValueError, 'No valid response received from OpenAI.', provider=_PROVIDER_NAME, operation='generate_vision')
        return clean_response(response_text)
    except Exception as e:
        report_llm_error('Error generating vision response from OpenAI', provider=_PROVIDER_NAME, operation='generate_vision', cause=e)
        return ''


def generate_stream(enabled: bool, model: str, prompt: str, options=None, system_prompt: str = ''):
    """Generate a real streaming response from an OpenAI-compatible model."""
    try:
        if _is_unavailable(enabled):
            raise_llm_error(ImportError, 'OpenAI provider is not enabled.', provider=_PROVIDER_NAME, operation='generate_stream')

        payload: dict[str, Any] = {
            'model': model,
            'messages': _build_messages(prompt, system_prompt),
        }
        payload.update(_build_options(options))

        for chunk_data in _stream_chat_response(payload, 'generate_stream'):
            yield chunk_data
    except Exception as e:
        report_llm_error('Error in OpenAI streaming', provider=_PROVIDER_NAME, operation='generate_stream', cause=e)
        yield {'chunk': '', 'done': True, 'full_response': '', 'error': stringify_llm_error(e)}


def generate_vision_stream(enabled: bool, model: str, prompt: str, images=None, options=None, system_prompt: str = ''):
    """Generate a real streaming vision response from an OpenAI-compatible model."""
    try:
        if _is_unavailable(enabled):
            raise_llm_error(ImportError, 'OpenAI provider is not enabled.', provider=_PROVIDER_NAME, operation='generate_vision_stream')

        if images is None:
            raise_llm_error(ValueError, 'No images provided for vision model.', provider=_PROVIDER_NAME, operation='generate_vision_stream')

        payload: dict[str, Any] = {
            'model': model,
            'messages': _build_vision_messages(prompt, images, system_prompt),
        }
        payload.update(_build_options(options))

        for chunk_data in _stream_chat_response(payload, 'generate_vision_stream'):
            yield chunk_data
    except Exception as e:
        report_llm_error('Error in OpenAI vision streaming', provider=_PROVIDER_NAME, operation='generate_vision_stream', cause=e)
        yield {'chunk': '', 'done': True, 'full_response': '', 'error': stringify_llm_error(e)}

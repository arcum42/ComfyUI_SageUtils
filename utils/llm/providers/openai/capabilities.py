"""OpenAI-compatible capability detection helpers."""

from typing import Any, Optional

from ...errors import llm_report
from ...capabilities import ModelCapabilities, get_capability_cache
from .requests import openai_request_json_models

_PROVIDER_NAME = 'openai'

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
    'llama-joycaption',
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


def _extract_model_id(model_obj: Any) -> Optional[str]:
    if not isinstance(model_obj, dict):
        return None

    for key in ('id', 'model', 'name'):
        value = model_obj.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    return None


def _extract_models_payload(response: Any) -> list[dict[str, Any]]:
    if isinstance(response, dict):
        for key in ('data', 'models', 'items'):
            value = response.get(key)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]

    if isinstance(response, list):
        return [item for item in response if isinstance(item, dict)]

    return []


def _is_vision_model(model_obj: dict[str, Any], model_name: str) -> bool:
    capabilities = model_obj.get('capabilities') or model_obj.get('features') or []
    if isinstance(capabilities, list):
        if any(str(c).lower() in ('vision', 'image_input', 'images') for c in capabilities):
            return True
    if isinstance(capabilities, dict):
        if capabilities.get('vision') is True or capabilities.get('image_input') is True:
            return True

    lowered = model_name.lower()
    return any(prefix in lowered for prefix in _KNOWN_VISION_MODEL_PREFIXES)


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
    if not enabled:
        return ModelCapabilities(name=model_name, provider=_PROVIDER_NAME, confidence='guess')

    cap_cache = get_capability_cache()
    cached = cap_cache.get(_PROVIDER_NAME, model_name)
    if cached is not None:
        return cached

    capabilities = _detect_capabilities_from_metadata(model_obj, model_name)
    cap_cache.set(capabilities)
    return capabilities


def get_model_capabilities_map(enabled: bool) -> dict[str, ModelCapabilities]:
    if not enabled:
        return {}

    try:
        response = openai_request_json_models()
        models_payload = _extract_models_payload(response)
        capabilities_map: dict[str, ModelCapabilities] = {}
        for model_obj in models_payload:
            model_id = _extract_model_id(model_obj)
            if not model_id:
                continue
            capabilities_map[model_id] = get_model_capabilities(enabled, model_obj, model_id)
        return capabilities_map
    except Exception as e:
        llm_report(
            'Error retrieving model capabilities from OpenAI',
            provider=_PROVIDER_NAME,
            operation='get_model_capabilities_map',
            cause=e,
        )
        return {}

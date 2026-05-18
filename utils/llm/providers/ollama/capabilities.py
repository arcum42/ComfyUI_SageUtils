"""Ollama REST capability detection helpers."""

from typing import Any, Optional

from ....logger import get_logger
from ...capabilities import ModelCapabilities, get_capability_cache
from .requests import (
    ollama_request_json_show,
    ollama_request_json_tags,
)

logger = get_logger('llm.providers.ollama_rest')

_PROVIDER_NAME = 'ollama_rest'


def _get_request_timeout() -> float:
    from ....settings import get_setting

    raw = get_setting('ollama_rest_timeout_seconds', 240)
    try:
        timeout = float(raw)
    except (TypeError, ValueError):
        return 240.0
    return timeout if timeout > 0 else 240.0


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


def _safe_get(mapping_or_obj: Any, key: str, default=None):
    if isinstance(mapping_or_obj, dict):
        return mapping_or_obj.get(key, default)
    return getattr(mapping_or_obj, key, default)


def _query_model_metadata(model_name: str) -> dict[str, Any]:
    try:
        response = ollama_request_json_show({'name': model_name}, timeout=_get_request_timeout())
        return response if isinstance(response, dict) else {}
    except Exception as e:
        logger.debug(f"Failed to query /api/show for '{model_name}': {e}")
        return {}


def _detect_capabilities_from_metadata(model_name: str, model_obj: Any, show_response: dict[str, Any]) -> ModelCapabilities:
    capabilities_obj = _safe_get(model_obj, 'capabilities', None)
    capabilities_list: list[str] = []
    if isinstance(capabilities_obj, list):
        capabilities_list = [str(item).lower() for item in capabilities_obj]

    show_capabilities = _safe_get(show_response, 'capabilities', None)
    if isinstance(show_capabilities, list):
        for item in show_capabilities:
            lowered = str(item).lower()
            if lowered not in capabilities_list:
                capabilities_list.append(lowered)

    details = _safe_get(show_response, 'details', None)
    families_lower: list[str] = []
    if isinstance(details, dict):
        families = details.get('families')
        if isinstance(families, list):
            families_lower = [str(f).lower() for f in families]

    template = str(show_response.get('template', '')).lower()
    model_lower = model_name.lower()

    vision = ('vision' in capabilities_list) or ('vision' in families_lower) or ('clip' in families_lower)
    tool_use = any(token in capabilities_list for token in ('tools', 'tool_use', 'function_calling'))
    thinking = '<think>' in template
    if 'thinking' in capabilities_list:
        thinking = True

    reasoning = 'thinking' in capabilities_list or thinking
    if not reasoning:
        reasoning = any(marker in model_lower for marker in ('deepseek-r1', 'qwq', 'o1', 'o3', 'reasoning'))

    context_window: Optional[int] = None
    model_info = show_response.get('model_info')
    if isinstance(model_info, dict):
        for key, value in model_info.items():
            if 'context_length' in str(key).lower():
                try:
                    context_window = int(value)
                    break
                except (TypeError, ValueError):
                    continue

    has_api_metadata = bool(capabilities_list or families_lower or template or context_window)
    confidence = 'api' if has_api_metadata else 'heuristic'

    return ModelCapabilities(
        name=model_name,
        provider=_PROVIDER_NAME,
        vision=vision,
        tool_use=tool_use,
        reasoning=reasoning,
        thinking=thinking,
        supported_modalities=['text'] + (['image'] if vision else []),
        context_window=context_window,
        metadata={
            'capabilities': capabilities_list,
            'details': details if isinstance(details, dict) else {},
            'template': template,
        },
        confidence=confidence,
    )


def get_model_capabilities(enabled: bool, model_name: str, model_obj: Any = None) -> ModelCapabilities:
    if not enabled:
        return ModelCapabilities(name=model_name, provider=_PROVIDER_NAME, confidence='guess')

    cap_cache = get_capability_cache()
    cached = cap_cache.get(_PROVIDER_NAME, model_name)
    if cached is not None:
        return cached

    metadata = _query_model_metadata(model_name)
    if metadata:
        capabilities = _detect_capabilities_from_metadata(model_name, model_obj or {}, metadata)
    else:
        is_vision = False
        capabilities = ModelCapabilities(
            name=model_name,
            provider=_PROVIDER_NAME,
            vision=is_vision,
            tool_use=False,
            reasoning=False,
            thinking=False,
            supported_modalities=['text'] + (['image'] if is_vision else []),
            confidence='heuristic',
        )

    cap_cache.set(capabilities)
    return capabilities


def get_model_capabilities_map(enabled: bool, model_names: Optional[list[str]] = None) -> dict[str, ModelCapabilities]:
    if not enabled:
        return {}

    names = model_names or []
    if not names:
        try:
            response = ollama_request_json_tags(timeout=_get_request_timeout())
            models_payload = _extract_models_payload(response)
            for model_obj in models_payload:
                model_name = _extract_model_name(model_obj)
                if model_name:
                    names.append(model_name)
        except Exception:
            return {}

    capabilities_map: dict[str, ModelCapabilities] = {}
    for model_name in names:
        if model_name.startswith('('):
            continue
        capabilities_map[model_name] = get_model_capabilities(enabled, model_name)
    return capabilities_map

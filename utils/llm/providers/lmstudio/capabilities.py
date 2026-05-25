"""LM Studio REST capability detection helpers."""

from typing import Any, Optional

from ...errors import llm_report
from ...capabilities import ModelCapabilities, get_capability_cache
from .requests import lmstudio_request_json_models
from .extract import _extract_model_name, _extract_models_payload

_PROVIDER_NAME = 'lmstudio_rest'

def _detect_capabilities_from_model_object(model_obj: dict[str, Any]) -> ModelCapabilities:
    model_name = _extract_model_name(model_obj) or model_obj.get('display_name') or 'unknown'
    capabilities_obj = model_obj.get('capabilities')
    vision = False
    tool_use = False
    reasoning = False
    thinking = False
    if isinstance(capabilities_obj, dict):
        vision = bool(capabilities_obj.get('vision'))
        tool_use = bool(capabilities_obj.get('trained_for_tool_use') or capabilities_obj.get('tool_use'))
        reasoning_obj = capabilities_obj.get('reasoning')
        if isinstance(reasoning_obj, dict):
            reasoning = True
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
    if not enabled:
        return ModelCapabilities(name=str(model_name), provider=_PROVIDER_NAME, confidence='guess')

    cap_cache = get_capability_cache()
    cached = cap_cache.get(_PROVIDER_NAME, str(model_name))
    if cached is not None:
        return cached

    capabilities = _detect_capabilities_from_model_object(model_obj)
    cap_cache.set(capabilities)
    return capabilities

def get_model_capabilities_map(enabled: bool) -> dict[str, ModelCapabilities]:
    if not enabled:
        return {}

    try:
        response = lmstudio_request_json_models()
        models_payload = _extract_models_payload(response)
        capabilities_map: dict[str, ModelCapabilities] = {}
        for model_obj in models_payload:
            model_name = _extract_model_name(model_obj)
            if not model_name:
                continue
            capabilities_map[model_name] = get_model_capabilities(enabled, model_obj)
        return capabilities_map
    except Exception as e:
        llm_report(
            'Error retrieving model capabilities from LM Studio REST',
            provider=_PROVIDER_NAME,
            operation='get_model_capabilities_map',
            cause=e,
        )
        return {}

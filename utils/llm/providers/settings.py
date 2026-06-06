"""Provider availability checks extracted from llm/service.py."""


def _is_provider_enabled(feature_key: str) -> bool:
    """Check whether a provider feature flag is enabled, with legacy fallback."""
    try:
        from ...settings import is_feature_enabled

        return is_feature_enabled(feature_key)
    except ImportError:
        try:
            from ... import config_manager

            config = config_manager.settings_manager.data or {}
            return config.get(feature_key, True)
        except Exception:
            return True


def is_lmstudio_rest_enabled() -> bool:
    """Check if LM Studio REST provider is enabled in settings."""
    return _is_provider_enabled('enable_lmstudio_rest')


def is_ollama_rest_enabled() -> bool:
    """Check if Ollama REST provider is enabled in settings."""
    return _is_provider_enabled('enable_ollama_rest')


def is_openai_enabled() -> bool:
    """Check if OpenAI (or compatible) provider is enabled in settings."""
    return _is_provider_enabled('enable_openai')

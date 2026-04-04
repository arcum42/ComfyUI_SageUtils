"""Provider availability checks extracted from llm_wrapper.py."""


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


def is_ollama_enabled() -> bool:
    """Check if Ollama is enabled in settings."""
    return _is_provider_enabled('enable_ollama')


def is_lmstudio_enabled() -> bool:
    """Check if LM Studio is enabled in settings."""
    return _is_provider_enabled('enable_lmstudio')

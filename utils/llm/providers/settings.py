"""Provider availability checks extracted from llm_wrapper.py."""


def is_ollama_enabled() -> bool:
    """Check if Ollama is enabled in settings."""
    try:
        from ...settings import is_feature_enabled

        return is_feature_enabled('enable_ollama')
    except ImportError:
        try:
            from ... import config_manager

            config = config_manager.settings_manager.data or {}
            return config.get('enable_ollama', True)
        except Exception:
            return True


def is_lmstudio_enabled() -> bool:
    """Check if LM Studio is enabled in settings."""
    try:
        from ...settings import is_feature_enabled

        return is_feature_enabled('enable_lmstudio')
    except ImportError:
        try:
            from ... import config_manager

            config = config_manager.settings_manager.data or {}
            return config.get('enable_lmstudio', True)
        except Exception:
            return True

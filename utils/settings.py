"""
Settings management for SageUtils.

This module provides a centralized way to manage settings with:
- Default values and types via a Pydantic model
- Automatic type coercion and validation
- Automatic migration of missing/deprecated settings
- Clear documentation of all available settings
"""

from typing import Any, Dict, Literal, Optional
from pydantic import BaseModel, Field, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict
from .config_manager import ConfigManager
from .settings_crypto import (
    decrypt_sensitive_value,
    encrypt_sensitive_value,
    is_encrypted_value,
    is_sensitive_setting_key,
)

from .logger import get_logger
logger = get_logger('settings')


class SageSettingsModel(BaseModel):
    """Pydantic model defining all SageUtils settings with defaults and validation."""

    # LLM Integration Settings
    enable_lmstudio_rest: bool = Field(True, description="Enable LM Studio REST v1 LLM integration")
    enable_ollama_rest: bool = Field(True, description="Enable Ollama REST LLM integration (HTTP API, no SDK required)")
    enable_openai: bool = Field(False, description="Enable OpenAI (or compatible) LLM integration")
    openai_api_key: str = Field("", description="API key for OpenAI or compatible endpoint (can also be set via OPENAI_API_KEY env var)")
    openai_use_custom_url: bool = Field(False, description="Use a custom base URL for the OpenAI-compatible endpoint")
    openai_base_url: str = Field("", description="Custom base URL for OpenAI-compatible endpoint (e.g., 'http://localhost:8080' for LocalAI)")
    ollama_use_custom_url: bool = Field(False, description="Use a custom URL for Ollama instead of the default")
    ollama_custom_url: str = Field("", description="Custom URL for Ollama service (e.g., 'http://localhost:11434')")
    ollama_api_key: str = Field("", description="API key for Ollama endpoint authentication (can also be set via OLLAMA_API_KEY env var)")
    lmstudio_use_custom_url: bool = Field(False, description="Use a custom URL for LM Studio instead of the default")
    lmstudio_custom_url: str = Field("", description="Custom URL for LM Studio service (e.g., 'http://localhost:1234')")
    lmstudio_api_token: str = Field("", description="API token for LM Studio REST endpoint (can also be set via LMSTUDIO_API_TOKEN env var)")
    default_llm_provider: Literal["lmstudio", "ollama", "lmstudio_rest", "ollama_rest", "openai", "native"] = Field(
        "lmstudio_rest", description="Default LLM provider for the LLM sidebar and provider-switching LLM v3 nodes"
    )
    llm_raise_node_exceptions: bool = Field(False, description="When enabled, LLM nodes re-raise provider load/generation exceptions after logging")

    # Sidebar Tab Visibility Settings
    show_models_tab: bool = Field(True, description="Show Models tab in sidebar")
    show_files_tab: bool = Field(True, description="Show Files tab in sidebar")
    show_search_tab: bool = Field(True, description="Show Search (Civitai) tab in sidebar")
    show_gallery_tab: bool = Field(True, description="Show Gallery tab in sidebar")
    show_prompts_tab: bool = Field(True, description="Show Prompts (Prompt Builder) tab in sidebar")
    show_llm_tab: bool = Field(True, description="Show LLM tab in sidebar")

    model_config = {"extra": "ignore"}  # silently drop deprecated/unknown keys on load


class SageSettingsEnv(BaseSettings):
    """Environment-variable overlay for SageUtils settings."""

    enable_lmstudio_rest: Optional[bool] = None
    enable_ollama_rest: Optional[bool] = None
    enable_openai: Optional[bool] = None
    openai_api_key: Optional[str] = None
    openai_use_custom_url: Optional[bool] = None
    openai_base_url: Optional[str] = None
    ollama_use_custom_url: Optional[bool] = None
    ollama_custom_url: Optional[str] = None
    ollama_api_key: Optional[str] = None
    lmstudio_use_custom_url: Optional[bool] = None
    lmstudio_custom_url: Optional[str] = None
    lmstudio_api_token: Optional[str] = None
    default_llm_provider: Optional[Literal["lmstudio", "ollama", "lmstudio_rest", "ollama_rest", "openai", "native"]] = None
    llm_raise_node_exceptions: Optional[bool] = None
    show_models_tab: Optional[bool] = None
    show_files_tab: Optional[bool] = None
    show_search_tab: Optional[bool] = None
    show_gallery_tab: Optional[bool] = None
    show_prompts_tab: Optional[bool] = None
    show_llm_tab: Optional[bool] = None

    model_config = SettingsConfigDict(
        env_prefix="",
        case_sensitive=False,
        extra="ignore",
        env_ignore_empty=True,
    )


class SageSettings:
    """Settings manager for SageUtils backed by a Pydantic model."""

    def __init__(self):
        self._config_manager = ConfigManager("config")
        self._model: SageSettingsModel = SageSettingsModel()
        self.load_and_validate()

    def load_and_validate(self) -> None:
        """Load settings from disk, decrypt sensitive values, and validate via Pydantic."""
        raw_settings: Dict[str, Any] = self._config_manager.load() or {}

        # Decrypt sensitive values before Pydantic sees the data.
        decrypted: Dict[str, Any] = {}
        needs_save = False
        for key, raw_value in raw_settings.items():
            decrypted[key] = decrypt_sensitive_value(key, raw_value)
            # Flag plaintext secrets for encryption on next save.
            if (
                is_sensitive_setting_key(key)
                and isinstance(raw_value, str)
                and raw_value.strip()
                and not is_encrypted_value(raw_value)
            ):
                needs_save = True
                logger.info(f"Setting '{key}' will be migrated to encrypted storage.")

        # Environment variables are the top-most layer and override file-backed values.
        env_overrides = SageSettingsEnv().model_dump(exclude_none=True)

        # model_validate handles type coercion, defaults for missing keys,
        # and silently drops unknown/deprecated keys (extra="ignore").
        try:
            merged_settings = {**decrypted, **env_overrides}
            self._model = SageSettingsModel.model_validate(merged_settings)
        except ValidationError as e:
            logger.warning(f"Settings validation error, falling back to defaults: {e}")
            self._model = SageSettingsModel()
            needs_save = True

        if needs_save:
            self.save()
            logger.info("Settings updated and saved.")

    def get(self, key: str, default: Any = None) -> Any:
        """Get a setting value with optional default fallback."""
        return getattr(self._model, key, default)

    def set(self, key: str, value: Any) -> bool:
        """Set a setting value with validation."""
        if not hasattr(self._model, key):
            logger.warning(f"Unknown setting key '{key}'.")
            return False
        try:
            updated = {**self._model.model_dump(), key: value}
            self._model = SageSettingsModel.model_validate(updated)
            logger.info(f"Setting '{key}' updated to: {getattr(self._model, key)}")
            return True
        except ValidationError as e:
            logger.warning(f"Invalid value for setting '{key}': {e}")
            return False

    def save(self) -> bool:
        """Save current settings to file, encrypting sensitive values."""
        try:
            data = self._model.model_dump()
            persisted = {k: encrypt_sensitive_value(k, v) for k, v in data.items()}
            self._config_manager.data = persisted
            return self._config_manager.save()
        except Exception as e:
            logger.error(f"Failed to save settings: {e}")
            return False

    # Used in settings and server_routes.
    def reset_to_defaults(self) -> None:
        """Reset all settings to their default values."""
        self._model = SageSettingsModel()
        self.save()
        logger.info("All settings reset to defaults.")

    def get_setting_info(self, key: str) -> Optional[Dict[str, Any]]:
        """Get information about a setting including description and current value."""
        field = SageSettingsModel.model_fields.get(key)
        if field is None:
            return None
        return {
            "description": field.description or "",
            "default": field.default,
            "type": type(field.default).__name__,
            "current_value": self.get(key),
        }

    # Used in settings and server_routes.
    def list_all_settings(self) -> Dict[str, Dict[str, Any]]:
        """Get information about all settings."""
        return {key: self.get_setting_info(key) for key in SageSettingsModel.model_fields}

    def is_feature_enabled(self, feature: str) -> bool:
        """Check if a feature is enabled. Convenience method for boolean settings."""
        return bool(self.get(feature, False))

    @property
    def all_settings(self) -> Dict[str, Any]:
        """Get a copy of all current settings."""
        return self._model.model_dump()


# Global settings instance
_settings_instance: Optional[SageSettings] = None


def get_settings() -> SageSettings:
    """Get the global settings instance, creating it if necessary."""
    global _settings_instance
    if _settings_instance is None:
        _settings_instance = SageSettings()
    return _settings_instance


def get_setting(key: str, default: Any = None) -> Any:
    """Convenience function to get a setting value."""
    return get_settings().get(key, default)


def set_setting(key: str, value: Any) -> bool:
    """Convenience function to set a setting value."""
    return get_settings().set(key, value)


def is_feature_enabled(feature: str) -> bool:
    """Convenience function to check if a feature is enabled."""
    return get_settings().is_feature_enabled(feature)


def save_settings() -> bool:
    """Convenience function to save settings."""
    return get_settings().save()


# Backwards compatibility - provide the same interface as before
def get_sage_config() -> Dict[str, Any]:
    """Get settings in the same format as the old sage_config."""
    return get_settings().all_settings


# Compatibility shims for callers that still import these by name.
def is_known_setting(key: str) -> bool:
    """Return True when key is a recognised SageUtils setting."""
    return key in SageSettingsModel.model_fields


def get_setting_schema_default(key: str) -> Any:
    """Return the default value for a known setting key."""
    field = SageSettingsModel.model_fields.get(key)
    if field is None:
        raise KeyError(f"Unknown setting: '{key}'")
    return field.default


# Compatibility dict mirroring the old SETTINGS_SCHEMA shape, built from model_fields.
SETTINGS_SCHEMA: Dict[str, Dict[str, Any]] = {
    key: {
        "default": field.default,
        "type": type(field.default),
        "description": field.description or "",
    }
    for key, field in SageSettingsModel.model_fields.items()
}


# For backwards compatibility, we'll also update the old config_manager module
# to use the new settings system
def _update_config_manager():
    """Update the config_manager module to use the new settings system."""
    try:
        from . import config_manager
        # Replace the old settings_manager data with our new system
        config_manager.settings_manager.data = get_settings().all_settings
        config_manager.sage_config = get_settings().all_settings
    except ImportError:
        pass  # Module might not be available during import

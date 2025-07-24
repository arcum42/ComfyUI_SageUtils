"""
Settings management for SageUtils.

This module provides a centralized way to manage settings with:
- Default values and types
- Validation and type checking
- Automatic migration of missing settings
- Clear documentation of all available settings
"""

from typing import Any, Dict, List, Union, Optional, Callable
from .config_manager import ConfigManager
import logging

# Define the schema for all SageUtils settings
SETTINGS_SCHEMA = {
    # LLM Integration Settings
    "enable_ollama": {
        "default": True,
        "type": bool,
        "description": "Enable Ollama LLM integration"
    },
    "enable_lmstudio": {
        "default": True, 
        "type": bool,
        "description": "Enable LM Studio LLM integration"
    },
    "ollama_use_custom_url": {
        "default": False,
        "type": bool,
        "description": "Use a custom URL for Ollama instead of the default"
    },
    "ollama_custom_url": {
        "default": "",
        "type": str,
        "description": "Custom URL for Ollama service (e.g., 'http://localhost:11434')"
    },
    "lmstudio_use_custom_url": {
        "default": False,
        "type": bool,
        "description": "Use a custom URL for LM Studio instead of the default"
    },
    "lmstudio_custom_url": {
        "default": "",
        "type": str,
        "description": "Custom URL for LM Studio service (e.g., 'http://localhost:1234')"
    }
}


class SettingsValidator:
    """Validates settings values against the schema."""
    
    @staticmethod
    def validate_value(key: str, value: Any, schema_entry: Dict[str, Any]) -> Any:
        """Validate a single setting value against its schema."""
        expected_type = schema_entry.get("type", str)
        valid_values = schema_entry.get("valid_values")
        
        # Type checking
        if not isinstance(value, expected_type):
            try:
                # Attempt type conversion
                if expected_type == bool:
                    if isinstance(value, str):
                        value = value.lower() in ('true', '1', 'yes', 'on')
                    else:
                        value = bool(value)
                elif expected_type == int:
                    value = int(value)
                elif expected_type == float:
                    value = float(value)
                elif expected_type == str:
                    value = str(value)
                else:
                    raise TypeError(f"Cannot convert {type(value)} to {expected_type}")
            except (ValueError, TypeError) as e:
                logging.warning(f"Setting '{key}': Invalid type. Expected {expected_type.__name__}, got {type(value).__name__}. Using default.")
                return schema_entry["default"]
        
        # Valid values checking
        if valid_values and value not in valid_values:
            logging.warning(f"Setting '{key}': Invalid value '{value}'. Must be one of {valid_values}. Using default.")
            return schema_entry["default"]
        
        return value


class SageSettings:
    """Enhanced settings manager for SageUtils with validation and defaults."""
    
    def __init__(self):
        self._config_manager = ConfigManager("config")
        self._settings: Dict[str, Any] = {}
        self._validator = SettingsValidator()
        self.load_and_validate()
    
    def load_and_validate(self) -> None:
        """Load settings from config manager and validate against schema."""
        # Load current settings
        current_settings = self._config_manager.load() or {}
        
        # Start with defaults and update with current values
        self._settings = {}
        settings_updated = False
        
        for key, schema_entry in SETTINGS_SCHEMA.items():
            if key in current_settings:
                # Validate existing setting
                validated_value = self._validator.validate_value(
                    key, current_settings[key], schema_entry
                )
                self._settings[key] = validated_value
                
                # Check if validation changed the value
                if validated_value != current_settings[key]:
                    settings_updated = True
                    logging.info(f"Setting '{key}' corrected to: {validated_value}")
            else:
                # Use default for missing settings
                self._settings[key] = schema_entry["default"]
                settings_updated = True
                logging.info(f"Setting '{key}' added with default value: {schema_entry['default']}")
        
        # Remove any settings not in schema (cleanup old/deprecated settings)
        for key in current_settings:
            if key not in SETTINGS_SCHEMA:
                logging.warning(f"Removing deprecated setting: '{key}'")
                settings_updated = True
        
        # Save if any changes were made
        if settings_updated:
            self.save()
            logging.info("Settings updated and saved.")
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get a setting value with optional default fallback."""
        if key in SETTINGS_SCHEMA:
            return self._settings.get(key, SETTINGS_SCHEMA[key]["default"])
        return self._settings.get(key, default)
    
    def set(self, key: str, value: Any) -> bool:
        """Set a setting value with validation."""
        if key not in SETTINGS_SCHEMA:
            logging.warning(f"Setting unknown key '{key}'. Consider adding it to SETTINGS_SCHEMA.")
            self._settings[key] = value
            return True
        
        schema_entry = SETTINGS_SCHEMA[key]
        validated_value = self._validator.validate_value(key, value, schema_entry)
        
        if self._settings.get(key) != validated_value:
            self._settings[key] = validated_value
            logging.info(f"Setting '{key}' updated to: {validated_value}")
            return True
        
        return False
    
    def save(self) -> bool:
        """Save current settings to file."""
        try:
            self._config_manager.data = self._settings.copy()
            return self._config_manager.save()
        except Exception as e:
            logging.error(f"Failed to save settings: {e}")
            return False
    
    def reset_to_defaults(self) -> None:
        """Reset all settings to their default values."""
        self._settings = {key: entry["default"] for key, entry in SETTINGS_SCHEMA.items()}
        self.save()
        logging.info("All settings reset to defaults.")
    
    def get_setting_info(self, key: str) -> Optional[Dict[str, Any]]:
        """Get information about a setting including description and current value."""
        if key not in SETTINGS_SCHEMA:
            return None
        
        schema_entry = SETTINGS_SCHEMA[key].copy()
        schema_entry["current_value"] = self._settings.get(key)
        return schema_entry
    
    def list_all_settings(self) -> Dict[str, Dict[str, Any]]:
        """Get information about all settings."""
        result = {}
        for key in SETTINGS_SCHEMA.keys():
            setting_info = self.get_setting_info(key)
            if setting_info is not None:
                result[key] = setting_info
        return result
    
    def is_feature_enabled(self, feature: str) -> bool:
        """Check if a feature is enabled. Convenience method for boolean settings."""
        return bool(self.get(feature, False))
    
    @property
    def all_settings(self) -> Dict[str, Any]:
        """Get a copy of all current settings."""
        return self._settings.copy()


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

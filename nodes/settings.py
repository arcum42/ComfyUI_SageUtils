"""
Settings management node for SageUtils.

This node provides a way to view and manage SageUtils settings from within ComfyUI.
"""

from typing import Tuple
import logging

try:
    from ..utils.settings import get_settings, SETTINGS_SCHEMA
    ENHANCED_SETTINGS_AVAILABLE = True
except ImportError:
    get_settings = None
    SETTINGS_SCHEMA = {}
    ENHANCED_SETTINGS_AVAILABLE = False


class Sage_SettingsManager:
    """Node for viewing and managing SageUtils settings."""
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {},
            "optional": {
                "refresh": ("BOOLEAN", {"default": False, "label_on": "Refresh", "label_off": "No Refresh"})
            }
        }
    
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("settings_info",)
    FUNCTION = "get_settings_info"
    CATEGORY = "SageUtils/Utility"
    OUTPUT_NODE = True

    def get_settings_info(self, refresh: bool = False) -> Tuple[str]:
        """Get formatted information about all SageUtils settings."""
        
        if not ENHANCED_SETTINGS_AVAILABLE:
            error_msg = (
                "Enhanced Settings System Not Available\n"
                "=" * 50 + "\n\n"
                "The enhanced settings system could not be loaded.\n"
                "SageUtils is running with basic settings only.\n\n"
                "This might be due to:\n"
                "- Import errors during initialization\n"
                "- Missing dependencies\n"
                "- Configuration file issues\n\n"
                "Check the console logs for more details."
            )
            return (error_msg,)
        
        try:
            if get_settings is None:
                raise ImportError("get_settings function not available")
                
            settings = get_settings()
            
            if refresh:
                settings.load_and_validate()
                logging.info("Settings refreshed from files.")
            
            # Build formatted output
            lines = []
            lines.append("SageUtils Settings Overview")
            lines.append("=" * 50)
            lines.append("")
            
            # Group settings by category
            categories = {
                "LLM Integration": ["enable_ollama", "enable_lmstudio", "ollama_use_custom_url", 
                                  "ollama_custom_url", "lmstudio_use_custom_url", "lmstudio_custom_url"]
            }
            
            for category, setting_keys in categories.items():
                lines.append(f"\n{category}")
                lines.append("-" * len(category))
                
                for key in setting_keys:
                    if key in SETTINGS_SCHEMA:
                        info = settings.get_setting_info(key)
                        if info:
                            current_value = info["current_value"]
                            default_value = info["default"]
                            description = info["description"]
                            
                            # Format the value display
                            if isinstance(current_value, bool):
                                value_display = "✅ Enabled" if current_value else "❌ Disabled"
                            elif isinstance(current_value, str) and current_value == "":
                                value_display = "(empty)"
                            else:
                                value_display = str(current_value)
                            
                            # Show if value differs from default
                            default_marker = ""
                            if current_value != default_value:
                                default_marker = f" (default: {default_value})"
                            
                            lines.append(f"  {key}: {value_display}{default_marker}")
                            lines.append(f"    └─ {description}")
                        else:
                            lines.append(f"  {key}: (info not available)")
            
            # Add summary information
            lines.append(f"\nSummary")
            lines.append("-" * 7)
            all_settings = settings.all_settings
            lines.append(f"Total settings: {len(all_settings)}")
            lines.append(f"Schema version: {len(SETTINGS_SCHEMA)} defined settings")
            
            # Check for any settings not in schema (deprecated/unknown)
            unknown_settings = set(all_settings.keys()) - set(SETTINGS_SCHEMA.keys())
            if unknown_settings:
                lines.append(f"Unknown/deprecated settings: {len(unknown_settings)}")
                for key in unknown_settings:
                    lines.append(f"  - {key}: {all_settings[key]}")
            
            lines.append("")
            lines.append("💡 Tip: Use 'refresh' input to reload settings from files.")
            lines.append("⚙️  Settings are automatically saved when changed via the API.")
            
            return ("\n".join(lines),)
            
        except Exception as e:
            error_msg = f"Error getting settings information: {str(e)}"
            logging.error(error_msg)
            return (error_msg,)


class Sage_SettingsReset:
    """Node for resetting SageUtils settings to defaults."""
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "confirm_reset": ("BOOLEAN", {
                    "default": False, 
                    "label_on": "RESET TO DEFAULTS", 
                    "label_off": "Safety Lock"
                })
            }
        }
    
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("result",)
    FUNCTION = "reset_settings"
    CATEGORY = "SageUtils/Utility"
    OUTPUT_NODE = True

    def reset_settings(self, confirm_reset: bool = False) -> Tuple[str]:
        """Reset all settings to their default values."""
        
        if not ENHANCED_SETTINGS_AVAILABLE:
            return ("Enhanced settings system not available. Cannot reset settings.",)
        
        if not confirm_reset:
            safety_msg = (
                "Settings Reset - SAFETY LOCK ENGAGED\n"
                "=" * 50 + "\n\n"
                "To reset all SageUtils settings to defaults:\n"
                "1. Set 'confirm_reset' to True\n"
                "2. Execute the node\n\n"
                "⚠️  WARNING: This will overwrite all your custom settings!\n"
                "Make sure you have backups if needed."
            )
            return (safety_msg,)
        
        try:
            if get_settings is None:
                raise ImportError("get_settings function not available")
                
            settings = get_settings()
            settings.reset_to_defaults()
            
            result = (
                "Settings Reset Complete\n"
                "=" * 25 + "\n\n"
                "All SageUtils settings have been reset to their default values.\n"
                "The changes have been saved to the configuration file.\n\n"
                "You may need to restart ComfyUI for some changes to take full effect.\n\n"
                "✅ Reset completed successfully."
            )
            
            logging.info("SageUtils settings reset to defaults via SettingsReset node.")
            return (result,)
            
        except Exception as e:
            error_msg = f"Error resetting settings: {str(e)}"
            logging.error(error_msg)
            return (error_msg,)

"""
Settings Routes Module
Handles settings management endpoints.
"""

import json
import logging
from aiohttp import web
from .base import route_error_handler, success_response, error_response

# Route list for documentation and registration tracking
_route_list = []


def register_routes(routes_instance):
    """
    Register settings-related routes.
    
    Args:
        routes_instance: The PromptServer routes instance
        
    Returns:
        int: Number of routes registered
    """
    global _route_list
    _route_list.clear()
    
    @routes_instance.get('/sage_utils/settings')
    @route_error_handler
    async def get_sage_settings(request):
        """
        Returns all SageUtils settings with their current values and schema information.
        """
        try:
            from ..utils.settings import get_settings
            
            settings = get_settings()
            settings_info = settings.list_all_settings()
            
            # Double-check that the result is JSON serializable
            json.dumps(settings_info)  # This will raise an exception if not serializable
            
            # Return in the format expected by the frontend: {"success": true, "settings": {...}}
            return web.json_response({
                "success": True,
                "settings": settings_info
            })
            
        except (TypeError, ValueError) as e:
            logging.error(f"Settings JSON serialization error: {str(e)}")
            return error_response(f"JSON serialization error: {str(e)}", status=500)
        except Exception as e:
            logging.error(f"Settings retrieval error: {str(e)}")
            return error_response(f"Failed to retrieve settings: {str(e)}", status=500)

    @routes_instance.post('/sage_utils/settings')
    @route_error_handler
    async def update_sage_settings(request):
        """
        Updates SageUtils settings. Expects JSON body with setting key-value pairs.
        """
        try:
            from ..utils.settings import get_settings, SETTINGS_SCHEMA
            
            data = await request.json()
            settings = get_settings()
            
            updated_settings = []
            errors = []
            
            for key, value in data.items():
                if key in SETTINGS_SCHEMA:
                    try:
                        if settings.set(key, value):
                            updated_settings.append(key)
                    except Exception as e:
                        errors.append(f"Failed to set '{key}': {str(e)}")
                else:
                    errors.append(f"Unknown setting: '{key}'")
            
            # Save if any settings were updated
            if updated_settings:
                if settings.save():
                    # Check if LLM-related settings were updated and trigger lazy initialization
                    llm_settings = {'enable_ollama', 'enable_lmstudio', 'custom_ollama_url', 'custom_lmstudio_url'}
                    if any(setting in llm_settings for setting in updated_settings):
                        try:
                            from ..utils.llm_wrapper import ensure_llm_initialized
                            ensure_llm_initialized()
                        except Exception as llm_e:
                            errors.append(f"Warning: Failed to initialize LLM services: {str(llm_e)}")
                    
                    return success_response(
                        data={
                            "updated": updated_settings,
                            "errors": errors
                        },
                        message=f"Updated {len(updated_settings)} setting(s)"
                    )
                else:
                    return error_response(
                        "Failed to save settings",
                        status=500,
                        updated=updated_settings,
                        errors=errors
                    )
            else:
                # No settings needed updating - this is actually a success case
                # All settings were either already at correct values or invalid
                if errors:
                    # There were invalid settings, so this is an error
                    return error_response(
                        "No valid settings to update",
                        status=400,
                        errors=errors
                    )
                else:
                    # All settings were already at correct values - this is success
                    return success_response(
                        data={
                            "updated": [],
                            "errors": []
                        },
                        message="All settings already at requested values"
                    )
                
        except Exception as e:
            logging.error(f"Settings update error: {str(e)}")
            return error_response(f"Failed to update settings: {str(e)}", status=500)

    @routes_instance.post('/sage_utils/settings/reset')
    @route_error_handler
    async def reset_sage_settings(request):
        """
        Resets all SageUtils settings to their default values.
        """
        try:
            from ..utils.settings import get_settings
            
            settings = get_settings()
            settings.reset_to_defaults()
            
            return success_response(message="All settings reset to defaults")
            
        except Exception as e:
            logging.error(f"Settings reset error: {str(e)}")
            return error_response(f"Failed to reset settings: {str(e)}", status=500)

    # Track registered routes
    _route_list.extend([
        {"method": "GET", "path": "/sage_utils/settings", "description": "Get all settings"},
        {"method": "POST", "path": "/sage_utils/settings", "description": "Update settings"},
        {"method": "POST", "path": "/sage_utils/settings/reset", "description": "Reset settings to defaults"}
    ])
    
    return len(_route_list)


def get_route_list():
    """Get list of registered routes for this module."""
    return _route_list.copy()

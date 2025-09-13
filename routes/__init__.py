"""
SageUtils Routes Module
Centralizes route registration and provides backwards compatibility.
"""

import logging
from .base import route_error_handler

# Track initialization for performance monitoring
_routes_initialized = False
_registered_routes = []


def register_routes(routes_instance):
    """
    Register all SageUtils routes with the PromptServer instance.
    
    Args:
        routes_instance: The PromptServer routes instance to register with
        
    Returns:
        int: Number of routes registered
    """
    global _routes_initialized, _registered_routes
    
    if _routes_initialized:
        logging.warning("Routes already initialized, skipping re-registration")
        return len(_registered_routes)
    
    try:
        # Import route modules (will be implemented in later phases)
        from . import settings_routes
        from . import cache_routes
        from . import scanning_routes
        from . import notes_routes
        from . import gallery_routes
        from . import wildcard_routes
        from . import utility_routes
        
        # Track successful registrations
        route_count = 0
        
        # Register each route group
        route_groups = [
            ("Settings", settings_routes),
            ("Cache", cache_routes),
            ("Scanning", scanning_routes),
            ("Notes", notes_routes),
            ("Gallery", gallery_routes),
            ("Wildcard", wildcard_routes),
            ("Utility", utility_routes)
        ]
        
        for group_name, route_module in route_groups:
            try:
                if hasattr(route_module, 'register_routes'):
                    group_count = route_module.register_routes(routes_instance)
                    route_count += group_count
                    _registered_routes.extend(route_module.get_route_list() if hasattr(route_module, 'get_route_list') else [])
                    logging.info(f"Registered {group_count} {group_name} routes")
                else:
                    logging.warning(f"Route module {group_name} missing register_routes function")
            except ImportError as e:
                logging.warning(f"Could not import {group_name} routes: {e}")
            except Exception as e:
                logging.error(f"Error registering {group_name} routes: {e}")
        
        _routes_initialized = True
        logging.info(f"SageUtils routes initialization complete: {route_count} routes registered")
        return route_count
        
    except Exception as e:
        logging.error(f"Failed to initialize SageUtils routes: {e}")
        return 0


def get_registered_routes():
    """
    Get a list of all registered routes for debugging/documentation.
    
    Returns:
        list: List of registered route information
    """
    return _registered_routes.copy()


def is_initialized():
    """
    Check if routes have been initialized.
    
    Returns:
        bool: True if routes are initialized
    """
    return _routes_initialized


# Backwards compatibility: keep the original route registration pattern
def setup_legacy_routes(routes_instance):
    """
    Setup routes using the original server_routes.py pattern for backwards compatibility.
    This is a fallback in case the new modular system has issues.
    
    Args:
        routes_instance: The PromptServer routes instance
        
    Returns:
        bool: True if legacy routes were set up successfully
    """
    try:
        # Import the original server routes module
        from .. import server_routes
        
        # Check if the old routes are still available
        if hasattr(server_routes, 'routes') and server_routes.routes:
            logging.info("Using legacy server_routes.py for backwards compatibility")
            return True
        else:
            logging.warning("Legacy server_routes.py not available or empty")
            return False
            
    except ImportError as e:
        logging.warning(f"Could not import legacy server_routes: {e}")
        return False
    except Exception as e:
        logging.error(f"Error setting up legacy routes: {e}")
        return False


# Route metadata for documentation and debugging
ROUTE_GROUPS = {
    'settings': {
        'description': 'Settings management and configuration',
        'endpoints': 3,
        'module': 'settings_routes'
    },
    'cache': {
        'description': 'Cache information and management',
        'endpoints': 5,
        'module': 'cache_routes'
    },
    'scanning': {
        'description': 'Model scanning and metadata operations',
        'endpoints': 5,
        'module': 'scanning_routes'
    },
    'notes': {
        'description': 'Notes file management and serving',
        'endpoints': 5,
        'module': 'notes_routes'
    },
    'gallery': {
        'description': 'Image gallery and file management',
        'endpoints': 8,
        'module': 'gallery_routes'
    },
    'wildcard': {
        'description': 'Wildcard system and prompt generation',
        'endpoints': 5,
        'module': 'wildcard_routes'
    },
    'utility': {
        'description': 'Utility functions and miscellaneous endpoints',
        'endpoints': 3,
        'module': 'utility_routes'
    }
}


def get_route_documentation():
    """
    Get documentation for all route groups.
    
    Returns:
        dict: Route group documentation
    """
    return ROUTE_GROUPS.copy()


# Export commonly used utilities
from .base import (
    route_error_handler,
    validate_json_body,
    validate_query_params,
    validate_file_path,
    get_secure_path,
    format_api_response,
    get_file_info,
    format_file_size,
    success_response,
    error_response,
    not_found_response,
    bad_request_response,
    server_error_response,
    SecurityError
)

__all__ = [
    'register_routes',
    'get_registered_routes',
    'is_initialized',
    'setup_legacy_routes',
    'get_route_documentation',
    'ROUTE_GROUPS',
    # Base utilities
    'route_error_handler',
    'validate_json_body',
    'validate_query_params',
    'validate_file_path',
    'get_secure_path',
    'format_api_response',
    'get_file_info',
    'format_file_size',
    'success_response',
    'error_response',
    'not_found_response',
    'bad_request_response',
    'server_error_response',
    'SecurityError'
]

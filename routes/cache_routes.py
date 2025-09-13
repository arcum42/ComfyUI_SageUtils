"""
Cache Routes Module
Handles cache information and management endpoints.
"""

import logging
# Note: aiohttp and web imports will be added when implementing actual routes
# from aiohttp import web
# from .base import route_error_handler, validate_json_body, success_response, error_response

# Route list for documentation and registration tracking
_route_list = []


def register_routes(routes_instance):
    """
    Register cache-related routes.
    
    Args:
        routes_instance: The PromptServer routes instance
        
    Returns:
        int: Number of routes registered
    """
    global _route_list
    _route_list.clear()
    
    # TODO: Implement cache routes in Phase 2
    logging.info("Cache routes module loaded (routes will be implemented in Phase 2)")
    return 0


def get_route_list():
    """Get list of registered routes for this module."""
    return _route_list.copy()

"""
Gallery Routes Module
Handles image gallery and file management.
"""

import logging
# Note: base imports will be added when implementing actual routes
# from .base import route_error_handler

# Route list for documentation and registration tracking
_route_list = []


def register_routes(routes_instance):
    """
    Register gallery-related routes.
    
    Args:
        routes_instance: The PromptServer routes instance
        
    Returns:
        int: Number of routes registered
    """
    global _route_list
    _route_list.clear()
    
    # TODO: Implement gallery routes in Phase 2
    logging.info("Gallery routes module loaded (routes will be implemented in Phase 2)")
    return 0


def get_route_list():
    """Get list of registered routes for this module."""
    return _route_list.copy()

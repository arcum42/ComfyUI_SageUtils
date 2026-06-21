"""
Base utilities and shared functionality for SageUtils routes.
Provides decorators, common utilities, and error handling patterns.
"""

from ..utils.logger import get_logger
from functools import wraps
from aiohttp import web
import traceback

logger = get_logger('routes.base')


def route_error_handler(func):
    """Decorator for consistent error handling across all routes."""
    @wraps(func)
    async def wrapper(request):
        try:
            return await func(request)
        except Exception as e:
            error_details = traceback.format_exc()
            logger.error(f"Route error in {func.__name__}: {error_details}")
            return web.json_response(
                {"success": False, "error": f"Internal server error: {str(e)}"},
                status=500
            )
    return wrapper


def validate_json_body(*required_fields):
    """Decorator that validates JSON body contains required fields.
    Usage: @validate_json_body('filename', 'content')
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(request):
            try:
                data = await request.json()
            except Exception:
                return web.json_response(
                    {"success": False, "error": "Invalid JSON body"}, status=400
                )
            missing_fields = [f for f in required_fields if not data.get(f)]
            if missing_fields:
                return web.json_response(
                    {"success": False, "error": f"Missing required fields: {', '.join(missing_fields)}"},
                    status=400
                )
            request.json_data = data
            return await func(request)
        return wrapper
    return decorator


def validate_query_params(*required_params):
    """Decorator that validates query parameters contain required fields.
    Usage: @validate_query_params('filename', 'type')
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(request):
            missing_params = [p for p in required_params if not request.query.get(p)]
            if missing_params:
                return web.json_response(
                    {"success": False, "error": f"Missing required query parameters: {', '.join(missing_params)}"},
                    status=400
                )
            return await func(request)
        return wrapper
    return decorator


def success_response(data=None, message=None):
    """Return a standardized success JSON response."""
    body = {"success": True}
    if data is not None:
        body["data"] = data
    if message:
        body["message"] = message
    return web.json_response(body)


def error_response(message, status=400):
    """Return a standardized error JSON response."""
    return web.json_response(
        {"success": False, "error": message},
        status=status
    )


__all__ = [
    'route_error_handler',
    'validate_json_body',
    'validate_query_params',
    'success_response',
    'error_response',
]

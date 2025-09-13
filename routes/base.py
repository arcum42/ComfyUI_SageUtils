"""
Base utilities and shared functionality for SageUtils routes.
Provides decorators, common utilities, and error handling patterns.
"""

import logging
import pathlib
from functools import wraps
from aiohttp import web
import traceback


def route_error_handler(func):
    """
    Decorator for consistent error handling across all routes.
    Catches exceptions and returns standardized error responses.
    """
    @wraps(func)
    async def wrapper(request):
        try:
            return await func(request)
        except Exception as e:
            # Log the full error for debugging
            error_details = traceback.format_exc()
            logging.error(f"Route error in {func.__name__}: {error_details}")
            
            # Return user-friendly error response
            return web.json_response(
                {
                    "success": False, 
                    "error": f"Internal server error: {str(e)}"
                }, 
                status=500
            )
    return wrapper


def validate_json_body(*required_fields):
    """
    Decorator that validates JSON body contains required fields.
    Usage: @validate_json_body('filename', 'content')
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(request):
            try:
                data = await request.json()
            except Exception:
                return web.json_response(
                    {"success": False, "error": "Invalid JSON body"}, 
                    status=400
                )
            
            # Check for required fields
            missing_fields = []
            for field in required_fields:
                if field not in data or not data[field]:
                    missing_fields.append(field)
            
            if missing_fields:
                return web.json_response(
                    {
                        "success": False, 
                        "error": f"Missing required fields: {', '.join(missing_fields)}"
                    }, 
                    status=400
                )
            
            # Add the parsed data to the request for easy access
            request.json_data = data
            return await func(request)
        return wrapper
    return decorator


def validate_query_params(*required_params):
    """
    Decorator that validates query parameters contain required fields.
    Usage: @validate_query_params('filename', 'type')
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(request):
            # Check for required query parameters
            missing_params = []
            for param in required_params:
                if param not in request.query or not request.query[param]:
                    missing_params.append(param)
            
            if missing_params:
                return web.json_response(
                    {
                        "success": False, 
                        "error": f"Missing required query parameters: {', '.join(missing_params)}"
                    }, 
                    status=400
                )
            
            return await func(request)
        return wrapper
    return decorator


def validate_file_path(base_path_getter):
    """
    Decorator for secure file path validation.
    base_path_getter should be a function that returns the allowed base path.
    
    Usage: @validate_file_path(lambda: path_manager.notes_path)
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(request):
            # Get the base path
            try:
                base_path = base_path_getter()
                if isinstance(base_path, str):
                    base_path = pathlib.Path(base_path)
            except Exception as e:
                return web.json_response(
                    {"success": False, "error": f"Invalid base path: {str(e)}"}, 
                    status=500
                )
            
            # Get filename from either JSON body or query params
            filename = None
            if request.method == 'GET':
                filename = request.query.get('filename', '')
            else:
                try:
                    data = await request.json()
                    filename = data.get('filename', '')
                except Exception:
                    return web.json_response(
                        {"success": False, "error": "Could not parse filename"}, 
                        status=400
                    )
            
            if not filename:
                return web.json_response(
                    {"success": False, "error": "Filename is required"}, 
                    status=400
                )
            
            # Validate the file path
            try:
                file_path = get_secure_path(base_path, filename)
                request.secure_file_path = file_path
                request.filename = filename
                return await func(request)
            except SecurityError as e:
                return web.json_response(
                    {"success": False, "error": str(e)}, 
                    status=400
                )
        return wrapper
    return decorator


class SecurityError(Exception):
    """Custom exception for security-related path errors."""
    pass


def get_secure_path(base_path, requested_path):
    """
    Safely resolve a file path within a base directory.
    Prevents directory traversal attacks.
    
    Args:
        base_path (pathlib.Path): The allowed base directory
        requested_path (str): The requested file path (relative to base)
        
    Returns:
        pathlib.Path: The resolved secure path
        
    Raises:
        SecurityError: If the path is outside the base directory
    """
    if not isinstance(base_path, pathlib.Path):
        base_path = pathlib.Path(base_path)
    
    # Construct the target path
    target_path = (base_path / requested_path).resolve()
    
    # Security check: ensure the file is within the base directory
    try:
        target_path.relative_to(base_path.resolve())
    except ValueError:
        raise SecurityError("Access denied: path is outside allowed directory")
    
    return target_path


def format_api_response(success, data=None, error=None, message=None, **kwargs):
    """
    Standardized API response format.
    
    Args:
        success (bool): Whether the operation was successful
        data: Any data to include in the response
        error (str): Error message if success=False
        message (str): Success message if success=True
        **kwargs: Additional fields to include in response
        
    Returns:
        dict: Formatted response dictionary
    """
    response = {"success": success}
    
    if success:
        if data is not None:
            response["data"] = data
        if message:
            response["message"] = message
    else:
        if error:
            response["error"] = error
    
    # Add any additional fields
    response.update(kwargs)
    
    return response


def get_file_info(file_path):
    """
    Extract common file information.
    
    Args:
        file_path (pathlib.Path): Path to the file
        
    Returns:
        dict: File information including size, dates, etc.
    """
    import time
    
    try:
        stat = file_path.stat()
        return {
            "filename": file_path.name,
            "path": str(file_path),
            "size": stat.st_size,
            "size_human": format_file_size(stat.st_size),
            "created": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(stat.st_ctime)),
            "modified": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(stat.st_mtime)),
            "extension": file_path.suffix.lower(),
            "exists": True
        }
    except (OSError, PermissionError) as e:
        return {
            "filename": file_path.name,
            "path": str(file_path),
            "exists": False,
            "error": str(e)
        }


def format_file_size(size_bytes):
    """
    Format file size in human-readable format.
    
    Args:
        size_bytes (int): File size in bytes
        
    Returns:
        str: Formatted file size (e.g., "1.5 MB")
    """
    if size_bytes == 0:
        return "0 B"
    
    import math
    size_names = ["B", "KB", "MB", "GB", "TB"]
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return f"{s} {size_names[i]}"


def get_mime_type(file_path):
    """
    Get MIME type for a file based on its extension.
    
    Args:
        file_path (pathlib.Path): Path to the file
        
    Returns:
        str: MIME type string
    """
    import mimetypes
    
    content_type, _ = mimetypes.guess_type(str(file_path))
    if content_type is None:
        return 'application/octet-stream'
    return content_type


def is_image_file(file_path):
    """
    Check if a file is an image based on its extension.
    
    Args:
        file_path (pathlib.Path): Path to the file
        
    Returns:
        bool: True if the file appears to be an image
    """
    image_extensions = {
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
        '.tiff', '.tif', '.ico', '.heic', '.heif', '.avif',
        '.raw', '.cr2', '.nef', '.arw', '.dng', '.orf', 
        '.pef', '.sr2', '.srw', '.x3f'
    }
    return file_path.suffix.lower() in image_extensions


def is_video_file(file_path):
    """
    Check if a file is a video based on its extension.
    
    Args:
        file_path (pathlib.Path): Path to the file
        
    Returns:
        bool: True if the file appears to be a video
    """
    video_extensions = {
        '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', 
        '.mkv', '.m4v', '.3gp', '.ogv'
    }
    return file_path.suffix.lower() in video_extensions


def is_text_file(file_path):
    """
    Check if a file is a text file based on its extension.
    
    Args:
        file_path (pathlib.Path): Path to the file
        
    Returns:
        bool: True if the file appears to be a text file
    """
    text_extensions = {
        '.txt', '.md', '.markdown', '.py', '.js', '.html', '.css',
        '.json', '.yaml', '.yml', '.xml', '.csv', '.log'
    }
    return file_path.suffix.lower() in text_extensions


def create_file_response(file_path, content_type=None):
    """
    Create an aiohttp Response for serving a file.
    
    Args:
        file_path (pathlib.Path): Path to the file to serve
        content_type (str): Optional content type override
        
    Returns:
        web.Response: Response object for serving the file
    """
    if not file_path.exists():
        return web.json_response(
            {"success": False, "error": "File not found"}, 
            status=404
        )
    
    if content_type is None:
        content_type = get_mime_type(file_path)
    
    try:
        # Determine read mode based on content type
        if content_type.startswith(('image/', 'video/', 'audio/')):
            # Binary mode for media files
            with open(file_path, 'rb') as file:
                content = file.read()
            
            headers = {'Content-Length': str(len(content))}
            
            # Add special headers for video files to support streaming
            if content_type.startswith('video/'):
                headers.update({
                    'Accept-Ranges': 'bytes',
                    'Cache-Control': 'no-cache'
                })
            else:
                headers['Cache-Control'] = 'max-age=3600'  # Cache images for 1 hour
            
            return web.Response(body=content, content_type=content_type, headers=headers)
        else:
            # Text mode for other files
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()
            return web.Response(text=content, content_type=content_type)
            
    except (OSError, PermissionError, UnicodeDecodeError) as e:
        return web.json_response(
            {"success": False, "error": f"Failed to read file: {str(e)}"}, 
            status=500
        )


# Common HTTP status code responses
def success_response(data=None, message=None, **kwargs):
    """Create a successful JSON response."""
    return web.json_response(
        format_api_response(True, data=data, message=message, **kwargs)
    )


def error_response(error, status=400, **kwargs):
    """Create an error JSON response."""
    return web.json_response(
        format_api_response(False, error=error, **kwargs),
        status=status
    )


def not_found_response(message="Resource not found"):
    """Create a 404 not found response."""
    return error_response(message, status=404)


def bad_request_response(message="Bad request"):
    """Create a 400 bad request response."""
    return error_response(message, status=400)


def server_error_response(message="Internal server error"):
    """Create a 500 server error response."""
    return error_response(message, status=500)

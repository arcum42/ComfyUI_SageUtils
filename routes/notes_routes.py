"""
Notes Routes Module
Handles notes file management including CRUD operations and file serving.
Consolidates legacy duplicate routes into a cleaner API.
"""

import logging
import mimetypes
from pathlib import Path
from aiohttp import web
from .base import route_error_handler, validate_query_params, validate_json_body, success_response, error_response

# Route list for documentation and registration tracking
_route_list = []


def _validate_notes_path(path_manager, filename):
    """
    Validates that a filename is safe and within the notes directory.
    
    Args:
        path_manager: The path manager instance
        filename: The filename to validate
        
    Returns:
        tuple: (is_valid, notes_file_path, error_message)
    """
    if not filename:
        return False, None, "Filename is required"
    
    # Basic filename validation - prevent directory traversal and invalid characters
    if any(char in filename for char in ['/', '\\', '..', '<', '>', ':', '"', '|', '?', '*']):
        return False, None, "Invalid filename characters"
    
    notes_file_path = path_manager.notes_path / filename
    
    # Security check: ensure the path is within the notes directory
    try:
        if not str(notes_file_path.resolve()).startswith(str(path_manager.notes_path.resolve())):
            return False, None, "Invalid file path"
    except (OSError, ValueError):
        return False, None, "Invalid file path"
    
    return True, notes_file_path, None


def register_routes(routes_instance):
    """
    Register notes management routes.
    
    Args:
        routes_instance: The PromptServer routes instance
        
    Returns:
        int: Number of routes registered
    """
    global _route_list
    _route_list.clear()
    
    @routes_instance.get('/sage_utils/list_notes')
    @route_error_handler
    async def list_notes(request):
        """
        Returns a list of all notes files in the notes directory.
        
        Response:
            JSON with files array containing filenames
        """
        try:
            # Dynamic import to avoid ComfyUI dependency issues
            from ..utils.path_manager import path_manager
            
            notes_path = path_manager.notes_path
            files = []
            
            if notes_path.exists():
                files = [f.name for f in notes_path.iterdir() if f.is_file()]
                files.sort()  # Sort alphabetically
            
            return web.json_response({
                "success": True,
                "files": files
            })
            
        except Exception as e:
            logging.error(f"List notes error: {e}")
            return error_response(f"Failed to list notes: {str(e)}", status=500)

    @routes_instance.post('/sage_utils/read_note')
    @route_error_handler
    @validate_json_body('filename')
    async def read_note_content(request):
        """
        Reads the content of a specific notes file and returns as JSON.
        For text content reading via API calls.
        
        Request Body:
            filename: Name of the notes file to read
            
        Response:
            JSON with content, filename
        """
        try:
            # Dynamic import to avoid ComfyUI dependency issues
            from ..utils.path_manager import path_manager
            
            data = request.json_data
            filename = data.get('filename', '')
            
            # Validate the file path
            is_valid, notes_file_path, error_msg = _validate_notes_path(path_manager, filename)
            if not is_valid:
                return error_response(error_msg, status=400)
            
            if not notes_file_path.exists() or not notes_file_path.is_file():
                return error_response(f"File '{filename}' not found", status=404)
            
            # Read the content as text
            try:
                with open(notes_file_path, 'r', encoding='utf-8') as file:
                    content = file.read()
                
                return web.json_response({
                    "success": True,
                    "content": content,
                    "filename": filename
                })
            except UnicodeDecodeError:
                return error_response(
                    f"File '{filename}' is not a text file or uses unsupported encoding", 
                    status=400
                )
            
        except Exception as e:
            logging.error(f"Read note error: {e}")
            return error_response(f"Failed to read note: {str(e)}", status=500)

    @routes_instance.get('/sage_utils/read_note')
    @route_error_handler
    @validate_query_params('filename')
    async def serve_note_file(request):
        """
        Serves a notes file directly with appropriate content type.
        Supports text, images, and video files with proper headers.
        For direct file serving to browsers.
        
        Query Parameters:
            filename: Name of the notes file to serve
            
        Response:
            Direct file content with appropriate MIME type
        """
        try:
            # Dynamic import to avoid ComfyUI dependency issues
            from ..utils.path_manager import path_manager
            
            filename = request.query.get('filename', '')
            
            # Validate the file path
            is_valid, notes_file_path, error_msg = _validate_notes_path(path_manager, filename)
            if not is_valid:
                return web.Response(text=error_msg, status=400)
            
            if not notes_file_path.exists() or not notes_file_path.is_file():
                return web.Response(text=f"File '{filename}' not found", status=404)
            
            # Determine content type
            content_type, _ = mimetypes.guess_type(str(notes_file_path))
            if content_type is None:
                content_type = 'application/octet-stream'
            
            # Read file in appropriate mode based on content type
            if content_type.startswith(('image/', 'video/', 'audio/')):
                # Binary mode for media files
                with open(notes_file_path, 'rb') as file:
                    content = file.read()
                
                headers = {
                    'Cache-Control': 'max-age=3600',  # Cache for 1 hour
                    'Content-Disposition': f'inline; filename="{filename}"'
                }
                
                # For videos, add headers to support range requests and streaming
                if content_type.startswith('video/'):
                    headers['Accept-Ranges'] = 'bytes'
                    
                    # Handle range requests for video streaming
                    range_header = request.headers.get('Range')
                    if range_header:
                        return _handle_range_request(notes_file_path, range_header, content_type)
                
                return web.Response(body=content, content_type=content_type, headers=headers)
                
            else:
                # Text mode for other files
                try:
                    with open(notes_file_path, 'r', encoding='utf-8') as file:
                        content = file.read()
                    return web.Response(text=content, content_type=content_type)
                except UnicodeDecodeError:
                    # If text decoding fails, treat as binary
                    with open(notes_file_path, 'rb') as file:
                        content = file.read()
                    return web.Response(
                        body=content, 
                        content_type='application/octet-stream',
                        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
                    )
                    
        except Exception as e:
            logging.error(f"Serve note file error: {e}")
            return web.Response(text=f"Failed to read file: {str(e)}", status=500)

    @routes_instance.post('/sage_utils/save_note')
    @route_error_handler
    @validate_json_body('filename', 'content')
    async def save_note(request):
        """
        Saves content to a notes file.
        
        Request Body:
            filename: Name of the file to save
            content: Text content to save
            
        Response:
            JSON with success message
        """
        try:
            # Dynamic import to avoid ComfyUI dependency issues
            from ..utils.path_manager import path_manager
            
            data = request.json_data
            filename = data.get('filename', '').strip()
            content = data.get('content', '')
            
            # Validate the file path
            is_valid, notes_file_path, error_msg = _validate_notes_path(path_manager, filename)
            if not is_valid:
                return error_response(error_msg, status=400)
            
            # Ensure notes directory exists
            path_manager.notes_path.mkdir(parents=True, exist_ok=True)
            
            # Save the file
            with open(notes_file_path, 'w', encoding='utf-8') as file:
                file.write(content)
            
            return success_response(message=f"File '{filename}' saved successfully")
            
        except Exception as e:
            logging.error(f"Save note error: {e}")
            return error_response(f"Failed to save note: {str(e)}", status=500)

    @routes_instance.post('/sage_utils/delete_note')
    @route_error_handler
    @validate_json_body('filename')
    async def delete_note(request):
        """
        Deletes a notes file.
        
        Request Body:
            filename: Name of the file to delete
            
        Response:
            JSON with success message
        """
        try:
            # Dynamic import to avoid ComfyUI dependency issues
            from ..utils.path_manager import path_manager
            
            data = request.json_data
            filename = data.get('filename', '')
            
            # Validate the file path
            is_valid, notes_file_path, error_msg = _validate_notes_path(path_manager, filename)
            if not is_valid:
                return error_response(error_msg, status=400)
            
            if not notes_file_path.exists() or not notes_file_path.is_file():
                return error_response(f"File '{filename}' not found", status=404)
            
            # Delete the file
            notes_file_path.unlink()
            
            return success_response(message=f"File '{filename}' deleted successfully")
            
        except Exception as e:
            logging.error(f"Delete note error: {e}")
            return error_response(f"Failed to delete note: {str(e)}", status=500)

    def _handle_range_request(file_path, range_header, content_type):
        """
        Handle HTTP range requests for video streaming.
        
        Args:
            file_path: Path to the file
            range_header: The Range header value
            content_type: MIME type of the file
            
        Returns:
            web.Response with partial content
        """
        try:
            file_size = file_path.stat().st_size
            
            # Parse range header (format: "bytes=start-end")
            range_match = range_header.replace('bytes=', '').split('-')
            start = int(range_match[0]) if range_match[0] else 0
            end = int(range_match[1]) if range_match[1] else file_size - 1
            
            # Ensure end doesn't exceed file size
            end = min(end, file_size - 1)
            content_length = end - start + 1
            
            # Read the requested range
            with open(file_path, 'rb') as file:
                file.seek(start)
                data = file.read(content_length)
            
            headers = {
                'Content-Range': f'bytes {start}-{end}/{file_size}',
                'Accept-Ranges': 'bytes',
                'Content-Length': str(content_length),
                'Cache-Control': 'no-cache'
            }
            
            return web.Response(
                body=data,
                status=206,  # Partial Content
                content_type=content_type,
                headers=headers
            )
            
        except Exception as e:
            logging.error(f"Range request error: {e}")
            # Fall back to full file if range request fails
            with open(file_path, 'rb') as file:
                content = file.read()
            return web.Response(body=content, content_type=content_type)

    # Track registered routes
    _route_list.extend([
        {"method": "GET", "path": "/sage_utils/list_notes", "description": "List all notes files"},
        {"method": "POST", "path": "/sage_utils/read_note", "description": "Read note content as JSON"},
        {"method": "GET", "path": "/sage_utils/read_note", "description": "Serve note file directly"},
        {"method": "POST", "path": "/sage_utils/save_note", "description": "Save note content"},
        {"method": "POST", "path": "/sage_utils/delete_note", "description": "Delete note file"}
    ])
    
    logging.info("Notes routes registered successfully")
    return len(_route_list)


def get_route_list():
    """Get list of registered routes for this module."""
    return _route_list.copy()

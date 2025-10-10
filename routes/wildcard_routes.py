"""
Wildcard Routes Module
Handles wildcard system and prompt generation.
"""

import logging
from pathlib import Path
from aiohttp import web
from .base import route_error_handler, validate_json_body, success_response, error_response

# Route list for documentation and registration tracking
_route_list = []


def _get_secure_wildcard_path(sage_wildcard_path, requested_path=""):
    """
    Validates and constructs a secure path within the wildcard directory.
    
    Args:
        sage_wildcard_path: Base wildcard directory path
        requested_path: Requested relative path
        
    Returns:
        tuple: (is_valid, secure_path, error_message)
    """
    try:
        wildcard_path = Path(sage_wildcard_path)
        
        if requested_path:
            target_path = wildcard_path / requested_path
            # Security check: ensure the path is within the wildcard directory
            if not str(target_path.resolve()).startswith(str(wildcard_path.resolve())):
                return False, None, "Invalid path - outside wildcard directory"
        else:
            target_path = wildcard_path
            
        return True, target_path, None
        
    except Exception as e:
        return False, None, f"Path validation error: {str(e)}"


def register_routes(routes_instance):
    """
    Register wildcard system routes.
    
    Args:
        routes_instance: The PromptServer routes instance
        
    Returns:
        int: Number of routes registered
    """
    global _route_list
    _route_list.clear()
    
    @routes_instance.get('/sage_utils/wildcard_path')
    @route_error_handler
    async def get_wildcard_path(request):
        """
        Gets the wildcard directory path.
        
        Response:
            JSON with path to wildcard directory
        """
        try:
            # Dynamic import to avoid ComfyUI dependency issues
            from ..utils import sage_wildcard_path
            
            return success_response(data={"path": str(sage_wildcard_path)})
            
        except Exception as e:
            logging.error(f"Get wildcard path error: {e}")
            return error_response(f"Failed to get wildcard path: {str(e)}", status=500)

    @routes_instance.get('/sage_utils/wildcard_files')
    @route_error_handler
    async def list_wildcard_files(request):
        """
        Lists all wildcard files in the wildcard directory with folder support.
        
        Query Parameters:
            path (optional): Subdirectory path relative to wildcard root
            
        Response:
            JSON with files array containing file/directory information
        """
        try:
            # Dynamic import to avoid ComfyUI dependency issues
            from ..utils import sage_wildcard_path
            
            # Get the requested path from query parameters
            requested_path = request.query.get('path', '')
            
            # Validate and construct secure path
            is_valid, target_path, error_msg = _get_secure_wildcard_path(sage_wildcard_path, requested_path)
            if not is_valid:
                return error_response(error_msg, status=400)
            
            if not target_path.exists():
                return web.json_response({
                    "success": True,
                    "files": [],
                    "total_files": 0,
                    "current_path": requested_path,
                    "message": "Directory does not exist"
                })
            
            files = []
            
            # List directories and files in the current directory
            for item in target_path.iterdir():
                wildcard_path = Path(sage_wildcard_path)
                
                if item.is_dir():
                    # Add directories
                    rel_path = item.relative_to(wildcard_path)
                    files.append({
                        "name": item.name,
                        "path": str(rel_path),
                        "type": "directory",
                        "size": 0
                    })
                elif item.is_file():
                    # Add files with supported extensions
                    supported_extensions = ['.txt', '.py', '.yaml', '.yml', '.json', '.md', '.markdown']
                    if any(item.name.lower().endswith(ext) for ext in supported_extensions):
                        rel_path = item.relative_to(wildcard_path)
                        files.append({
                            "name": item.name,
                            "path": str(rel_path),
                            "type": "file",
                            "size": item.stat().st_size
                        })
            
            # Sort: directories first, then files, both alphabetically
            files.sort(key=lambda x: (x['type'] != 'directory', x['name'].lower()))
            
            return web.json_response({
                "success": True,
                "files": files,
                "total_files": len(files),
                "current_path": requested_path
            })
            
        except Exception as e:
            logging.error(f"List wildcard files error: {e}")
            return error_response(f"Failed to list wildcard files: {str(e)}", status=500)

    @routes_instance.post('/sage_utils/generate_wildcard')
    @route_error_handler
    @validate_json_body('prompt')
    async def generate_wildcard_prompt(request):
        """
        Generates a prompt using the wildcard system.
        
        Request Body:
            prompt: Text with __wildcards__ to be processed
            seed (optional): Random seed for generation
            
        Response:
            JSON with generated prompt result
        """
        try:
            # Dynamic imports to avoid ComfyUI dependency issues
            from ..utils import sage_wildcard_path
            
            data = request.json_data
            prompt = data.get('prompt', '')
            seed = data.get('seed', 0)
            
            if not prompt:
                return error_response("Prompt is required", status=400)
            
            # Dynamic import of wildcard dependencies
            try:
                from dynamicprompts.generators import RandomPromptGenerator
                from dynamicprompts.wildcards.wildcard_manager import WildcardManager
            except ImportError as e:
                return error_response(
                    f"Wildcard system dependencies not available: {str(e)}", 
                    status=503
                )
            
            # Initialize the wildcard manager
            wildcard_manager = WildcardManager(sage_wildcard_path)
            
            # Generate a random prompt using the wildcard manager
            generator = RandomPromptGenerator(wildcard_manager, seed=seed)
            
            # Replace wildcards in the string
            gen_result = generator.generate(prompt)
            
            # Handle the result (same logic as the Python node)
            result = ""
            if not gen_result:
                result = ""
            elif isinstance(gen_result, list):
                result = gen_result[0] if gen_result else ""
            else:
                result = gen_result
            
            return success_response(data={
                "result": result,
                "original_prompt": prompt,
                "seed": seed
            })
            
        except Exception as e:
            logging.error(f"Generate wildcard prompt error: {e}")
            return error_response(f"Failed to generate wildcard prompt: {str(e)}", status=500)

    @routes_instance.get('/sage_utils/wildcard_file/{filename:.*}')
    @route_error_handler
    async def get_wildcard_file_content(request):
        """
        Gets the content of a specific wildcard file.
        
        Path Parameters:
            filename: Path to the wildcard file relative to wildcard root
            
        Response:
            JSON with file content and metadata
        """
        try:
            # Dynamic import to avoid ComfyUI dependency issues
            from ..utils import sage_wildcard_path
            
            filename = request.match_info.get('filename', '')
            if not filename:
                return error_response("Filename is required", status=400)
            
            # Validate and construct secure path
            is_valid, file_path, error_msg = _get_secure_wildcard_path(sage_wildcard_path, filename)
            if not is_valid:
                return error_response(error_msg, status=403)
            
            if not file_path.exists() or not file_path.is_file():
                return error_response(f"File not found: {filename}", status=404)
            
            # Read file content
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                return web.json_response({
                    "success": True,
                    "content": content,
                    "filename": filename,
                    "size": len(content)
                })
            except UnicodeDecodeError:
                return error_response(
                    f"File '{filename}' is not a text file or uses unsupported encoding", 
                    status=400
                )
            
        except Exception as e:
            logging.error(f"Get wildcard file content error: {e}")
            return error_response(f"Failed to read wildcard file: {str(e)}", status=500)

    @routes_instance.post('/sage_utils/wildcard/file/save')
    @route_error_handler
    @validate_json_body('filename', 'content')
    async def save_wildcard_file(request):
        """
        Saves content to a wildcard file.
        
        Request Body:
            filename: Path to the file relative to wildcard root
            content: Text content to save
            
        Response:
            JSON with success message and file metadata
        """
        try:
            # Dynamic import to avoid ComfyUI dependency issues
            from ..utils import sage_wildcard_path
            
            data = request.json_data
            filename = data.get('filename', '')
            content = data.get('content', '')
            
            if not filename:
                return error_response("Filename is required", status=400)
            
            # Validate and construct secure path
            is_valid, file_path, error_msg = _get_secure_wildcard_path(sage_wildcard_path, filename)
            if not is_valid:
                return error_response(error_msg, status=403)
            
            # Ensure parent directory exists
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write file content
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return success_response(
                message=f"File '{filename}' saved successfully",
                data={
                    "filename": filename,
                    "size": len(content)
                }
            )
            
        except Exception as e:
            logging.error(f"Save wildcard file error: {e}")
            return error_response(f"Failed to save wildcard file: {str(e)}", status=500)

    # Track registered routes
    _route_list.extend([
        {"method": "GET", "path": "/sage_utils/wildcard_path", "description": "Get wildcard directory path"},
        {"method": "GET", "path": "/sage_utils/wildcard_files", "description": "List wildcard files and directories"},
        {"method": "POST", "path": "/sage_utils/generate_wildcard", "description": "Generate prompt using wildcards"},
        {"method": "GET", "path": "/sage_utils/wildcard_file/{filename:.*}", "description": "Get wildcard file content"},
        {"method": "POST", "path": "/sage_utils/wildcard/file/save", "description": "Save wildcard file content"}
    ])
    
    return len(_route_list)


def get_route_list():
    """Get list of registered routes for this module."""
    return _route_list.copy()

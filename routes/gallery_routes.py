"""
Gallery and image management routes for SageUtils.

This module handles:
- CivitAI image fetching with rate limiting
- Image listing and folder browsing
- Thumbnail generation with caching
- Image metadata extraction (EXIF, generation params)
- Dataset text file management for image annotation

Routes:
- POST /sage_utils/civitai_images - Fetch images from CivitAI API by model hash
- POST /sage_utils/list_images - List images in folders (notes/input/output/custom)
- POST /sage_utils/thumbnail - Generate and serve image thumbnails
- POST /sage_utils/image_metadata - Extract comprehensive image metadata
- POST /sage_utils/check_dataset_text - Check if text file exists for image
- POST /sage_utils/read_dataset_text - Read dataset text file content
- POST /sage_utils/save_dataset_text - Save dataset text file content
"""

import asyncio
import time
import logging
from .base import route_error_handler, validate_json_body, success_response, error_response

# Route list for documentation and registration tracking
_route_list = []

# Rate limiting for CivitAI API
_last_request_time = 0
_min_request_interval = 1.0  # 1 second between requests

async def _rate_limit():
    """Enforce rate limiting for external API calls."""
    global _last_request_time
    current_time = time.time()
    time_since_last = current_time - _last_request_time
    
    if time_since_last < _min_request_interval:
        await asyncio.sleep(_min_request_interval - time_since_last)
    
    _last_request_time = time.time()

def _format_file_size(size_bytes):
    """Helper function to format file size in human-readable format."""
    if size_bytes == 0:
        return "0 B"
    size_names = ["B", "KB", "MB", "GB", "TB"]
    import math
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return f"{s} {size_names[i]}"

def register_routes(routes_instance):
    """
    Register gallery management routes.
    
    Args:
        routes_instance: The PromptServer routes instance
        
    Returns:
        int: Number of routes registered
    """
    global _route_list
    _route_list.clear()
    
    @routes_instance.post('/sage_utils/civitai_images')
    @route_error_handler
    async def civitai_images(request):
        """
        Fetch images from CivitAI API by model hash.
        Body: { "hash": "model_hash_string" }
        """
        try:
            import aiohttp
            from aiohttp import web
            
            await _rate_limit()  # Enforce rate limiting
            
            data = await request.json()
            hash_param = data.get('hash', '').strip()
            
            if not hash_param:
                return web.json_response({
                    "success": False,
                    "error": "Hash parameter is required"
                })
            
            # Set up headers for CivitAI API
            headers = {
                'User-Agent': 'SageUtils/1.0'
            }
            
            async with aiohttp.ClientSession(headers=headers) as session:
                civitai_url = f"https://civitai.com/api/v1/model-versions/by-hash/{hash_param}"
                try:
                    async with session.get(civitai_url, timeout=aiohttp.ClientTimeout(total=15)) as response:
                        if response.status == 200:
                            data = await response.json()
                            images = data.get('images', [])
                            
                            # Filter for appropriate images (nsfwLevel <= 1)
                            safe_images = [img for img in images if img.get('nsfwLevel', 0) <= 1]
                            
                            return web.json_response({
                                "success": True,
                                "images": safe_images
                            })
                        elif response.status == 429:
                            return web.json_response({
                                "success": False,
                                "error": "Rate limited by Civitai API"
                            })
                        else:
                            return web.json_response({
                                "success": False,
                                "error": f"Civitai API returned status {response.status}"
                            })
                except asyncio.TimeoutError:
                    return web.json_response({
                        "success": False,
                        "error": "Request to Civitai API timed out"
                    })
                except Exception as e:
                    return web.json_response({
                        "success": False,
                        "error": f"Failed to fetch from Civitai: {str(e)}"
                    })
                    
        except Exception as e:
            from aiohttp import web
            return web.json_response(
                {"success": False, "error": f"Failed to process request: {str(e)}"}, 
                status=500
            )
    
    @routes_instance.post('/sage_utils/list_images')
    @route_error_handler
    async def list_images(request):
        """
        Returns a list of all images in a specified folder.
        Body: { "folder": "notes|input|output|custom", "path": "/custom/path" }
        """
        try:
            import os
            import pathlib
            import time
            from aiohttp import web
            
            # Dynamic imports to avoid ComfyUI dependency issues
            import folder_paths
            from ..utils.path_manager import path_manager
            
            data = await request.json()
            folder_type = data.get('folder', 'notes')
            custom_path = data.get('path', '')
            
            # Determine the base path
            if folder_type == 'notes':
                base_path = path_manager.notes_path
            elif folder_type == 'input':
                base_path = pathlib.Path(folder_paths.get_input_directory())
            elif folder_type == 'output':
                base_path = pathlib.Path(folder_paths.get_output_directory())
            elif folder_type == 'custom':
                if not custom_path:
                    return web.json_response(
                        {"success": False, "error": "Custom path is required for custom folder type"}, 
                        status=400
                    )
                base_path = pathlib.Path(custom_path)
                # Security check: ensure the path exists and is accessible
                if not base_path.exists() or not base_path.is_dir():
                    return web.json_response(
                        {"success": False, "error": f"Path does not exist or is not a directory: {custom_path}"}, 
                        status=400
                    )
            else:
                return web.json_response(
                    {"success": False, "error": f"Invalid folder type: {folder_type}"}, 
                    status=400
                )
            
            if not base_path.exists():
                return web.json_response({
                    "success": True,
                    "images": [],
                    "folders": [],
                    "folder": folder_type,
                    "path": str(base_path)
                })
            
            # Supported image extensions
            image_extensions = {
                '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
                '.tiff', '.tif', '.ico', '.heic', '.heif', '.avif',
                '.raw', '.cr2', '.nef', '.arw', '.dng', '.orf', 
                '.pef', '.sr2', '.srw', '.x3f'
            }
            
            images = []
            folders = []
            try:
                # Only scan the current directory (not recursive)
                for item_path in base_path.iterdir():
                    if item_path.is_file() and item_path.suffix.lower() in image_extensions:
                        try:
                            stat = item_path.stat()
                            
                            # Get relative path from base
                            relative_path = item_path.relative_to(base_path)
                            
                            # Try to get image dimensions with proper interruption handling
                            dimensions = None
                            try:
                                from PIL import Image
                                with Image.open(item_path) as img:
                                    dimensions = {"width": img.width, "height": img.height}
                            except KeyboardInterrupt:
                                # Handle server shutdown gracefully
                                raise  # Re-raise to stop processing
                            except Exception:
                                # If we can't get dimensions, that's ok
                                dimensions = None
                            
                            image_info = {
                                "filename": item_path.name,
                                "path": str(item_path),
                                "relative_path": str(relative_path),
                                "size": stat.st_size,
                                "modified": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(stat.st_mtime)),
                                "dimensions": dimensions
                            }
                            images.append(image_info)
                        except (OSError, PermissionError):
                            # Skip files we can't access
                            continue
                    elif item_path.is_dir():
                        # Add subdirectory info
                        try:
                            stat = item_path.stat()
                            folder_info = {
                                "name": item_path.name,
                                "path": str(item_path),
                                "relative_path": str(item_path.relative_to(base_path)),
                                "modified": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(stat.st_mtime)),
                                "type": "folder"
                            }
                            folders.append(folder_info)
                        except (OSError, PermissionError):
                            # Skip folders we can't access
                            continue
                            
            except PermissionError:
                return web.json_response(
                    {"success": False, "error": f"Permission denied accessing directory: {base_path}"}, 
                    status=403
                )
            
            return web.json_response({
                "success": True,
                "images": images,
                "folders": folders,
                "folder": folder_type,
                "path": str(base_path),
                "image_count": len(images),
                "folder_count": len(folders)
            })
            
        except Exception as e:
            from aiohttp import web
            return web.json_response(
                {"success": False, "error": f"Failed to list images: {str(e)}"}, 
                status=500
            )
    
    @routes_instance.post('/sage_utils/thumbnail')
    @route_error_handler
    async def get_thumbnail(request):
        """
        Generate and serve thumbnail for an image.
        Body: { "image_path": "/full/path/to/image", "size": "small|medium|large" }
        """
        try:
            import os
            import pathlib
            from PIL import Image
            import io
            import hashlib
            import tempfile
            from aiohttp import web
            
            # Get path and size from request body
            data = await request.json()
            image_path = data.get('image_path', '')
            size_param = data.get('size', 'medium')
            
            if not image_path:
                return web.Response(text="Image path is required", status=400)
            
            # Convert to pathlib Path
            image_path = pathlib.Path(image_path)
            
            # Security check: ensure the file exists
            if not image_path.exists() or not image_path.is_file():
                return web.Response(text="Image not found", status=404)
            
            # Define thumbnail sizes
            thumbnail_sizes = {
                'small': (120, 120),
                'medium': (200, 200),
                'large': (300, 300)
            }
            
            size = thumbnail_sizes.get(size_param, thumbnail_sizes['medium'])
            
            # Create cache directory
            cache_dir = pathlib.Path(tempfile.gettempdir()) / "sageutils_thumbnails"
            cache_dir.mkdir(exist_ok=True)
            
            # Create cache key from file path, size, and modification time
            stat = image_path.stat()
            cache_key = hashlib.md5(f"{image_path}_{size}_{stat.st_mtime}".encode()).hexdigest()
            cache_file = cache_dir / f"{cache_key}.jpg"
            
            # Check if thumbnail exists in cache
            if cache_file.exists():
                with open(cache_file, 'rb') as f:
                    thumbnail_data = f.read()
            else:
                # Generate thumbnail
                try:
                    with Image.open(image_path) as img:
                        # Convert to RGB if necessary
                        if img.mode in ('RGBA', 'LA', 'P'):
                            # Create a white background
                            background = Image.new('RGB', img.size, (255, 255, 255))
                            if img.mode == 'P':
                                img = img.convert('RGBA')
                            background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                            img = background
                        elif img.mode != 'RGB':
                            img = img.convert('RGB')
                        
                        # Create thumbnail
                        img.thumbnail(size, Image.Resampling.LANCZOS)
                        
                        # Save to bytes
                        output = io.BytesIO()
                        img.save(output, format='JPEG', quality=85, optimize=True)
                        thumbnail_data = output.getvalue()
                        
                        # Cache the thumbnail
                        try:
                            with open(cache_file, 'wb') as f:
                                f.write(thumbnail_data)
                        except Exception:
                            # If caching fails, continue without caching
                            pass
                            
                except Exception as e:
                    return web.Response(text=f"Failed to generate thumbnail: {str(e)}", status=500)
            
            return web.Response(
                body=thumbnail_data,
                content_type='image/jpeg',
                headers={
                    'Cache-Control': 'max-age=86400',  # Cache for 24 hours
                    'Content-Length': str(len(thumbnail_data))
                }
            )
            
        except Exception as e:
            from aiohttp import web
            return web.Response(text=f"Failed to serve thumbnail: {str(e)}", status=500)
    
    @routes_instance.post('/sage_utils/image_metadata')
    @route_error_handler
    async def get_image_metadata(request):
        """
        Extract metadata from an image file.
        Body: { "image_path": "/path/to/image.jpg" }
        """
        try:
            import pathlib
            from PIL import Image
            from PIL.ExifTags import TAGS
            import json
            import os
            import time
            from aiohttp import web
            
            data = await request.json()
            image_path_str = data.get('image_path', '')
            
            if not image_path_str:
                return web.json_response(
                    {"success": False, "error": "Image path is required"}, 
                    status=400
                )
            
            image_path = pathlib.Path(image_path_str)
            
            # Security check: ensure the file exists
            if not image_path.exists() or not image_path.is_file():
                return web.json_response(
                    {"success": False, "error": "Image not found"}, 
                    status=404
                )
            
            metadata = {
                "file_info": {},
                "exif": {},
                "generation_params": {}
            }
            
            try:
                # File information
                stat = image_path.stat()
                metadata["file_info"] = {
                    "filename": image_path.name,
                    "path": str(image_path),
                    "size": stat.st_size,
                    "size_human": _format_file_size(stat.st_size),
                    "created": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(stat.st_ctime)),
                    "modified": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(stat.st_mtime)),
                    "extension": image_path.suffix.lower()
                }
                
                # Image information and EXIF data
                with Image.open(image_path) as img:
                    metadata["file_info"]["dimensions"] = {
                        "width": img.width,
                        "height": img.height
                    }
                    metadata["file_info"]["format"] = img.format
                    metadata["file_info"]["mode"] = img.mode
                    
                    # Extract EXIF data
                    if hasattr(img, '_getexif') and img._getexif() is not None:
                        exif_data = img._getexif()
                        if exif_data:
                            for tag_id, value in exif_data.items():
                                tag = TAGS.get(tag_id, tag_id)
                                try:
                                    # Convert bytes to string if needed
                                    if isinstance(value, bytes):
                                        try:
                                            value = value.decode('utf-8')
                                        except UnicodeDecodeError:
                                            value = str(value)
                                    # Handle PIL IFDRational and other non-JSON-serializable types
                                    elif hasattr(value, 'numerator') and hasattr(value, 'denominator'):
                                        # This is likely an IFDRational object
                                        if value.denominator == 0:
                                            value = "undefined"
                                        else:
                                            value = float(value.numerator) / float(value.denominator)
                                    elif not isinstance(value, (str, int, float, bool, list, dict, type(None))):
                                        # Convert other non-serializable types to string
                                        value = str(value)
                                    
                                    metadata["exif"][tag] = value
                                except Exception as exif_error:
                                    # If we can't process this EXIF tag, skip it or store as string
                                    try:
                                        metadata["exif"][tag] = str(value)
                                    except Exception:
                                        # If even string conversion fails, store the error
                                        metadata["exif"][tag] = f"<Error processing tag: {str(exif_error)}>"
                    
                    # Check for ComfyUI/Stable Diffusion generation parameters
                    if hasattr(img, 'text') and img.text:
                        # PNG text chunks
                        for key, value in img.text.items():
                            if key.lower() in ['parameters', 'prompt', 'workflow', 'comfyui']:
                                try:
                                    # Try to parse as JSON
                                    parsed_value = json.loads(value)
                                    metadata["generation_params"][key] = parsed_value
                                except (json.JSONDecodeError, TypeError):
                                    # Store as string if not JSON
                                    metadata["generation_params"][key] = value
                    
                    # Check info attribute (some PNG files store data here)
                    if hasattr(img, 'info') and img.info:
                        for key, value in img.info.items():
                            if key not in metadata["generation_params"]:
                                if isinstance(value, (str, int, float)):
                                    metadata["generation_params"][key] = value
                                else:
                                    metadata["generation_params"][key] = str(value)
            
            except Exception as img_error:
                metadata["file_info"]["error"] = f"Failed to process image: {str(img_error)}"
            
            return web.json_response({
                "success": True,
                "metadata": metadata
            })
            
        except Exception as e:
            from aiohttp import web
            return web.json_response(
                {"success": False, "error": f"Failed to extract metadata: {str(e)}"}, 
                status=500
            )
    
    @routes_instance.post('/sage_utils/check_dataset_text')
    @route_error_handler
    async def check_dataset_text(request):
        """
        Check if a text file exists for an image (for dataset annotation).
        Body: { "image_path": "/path/to/image.jpg" }
        Returns: { "success": True, "exists": bool, "text_path": "path" }
        """
        try:
            import pathlib
            from aiohttp import web
            
            data = await request.json()
            image_path_str = data.get('image_path', '')
            
            if not image_path_str:
                return web.json_response(
                    {"success": False, "error": "Image path is required"}, 
                    status=400
                )
            
            image_path = pathlib.Path(image_path_str)
            
            # Security check: ensure the image file exists
            if not image_path.exists() or not image_path.is_file():
                return web.json_response(
                    {"success": False, "error": "Image not found"}, 
                    status=404
                )
            
            # Generate corresponding text file path
            text_path = image_path.with_suffix('.txt')
            
            return web.json_response({
                "success": True,
                "exists": text_path.exists(),
                "text_path": str(text_path),
                "image_path": str(image_path)
            })
            
        except Exception as e:
            from aiohttp import web
            return web.json_response(
                {"success": False, "error": f"Failed to check text file: {str(e)}"}, 
                status=500
            )
    
    @routes_instance.post('/sage_utils/read_dataset_text')
    @route_error_handler
    async def read_dataset_text(request):
        """
        Read the content of a dataset text file for an image.
        Body: { "image_path": "/path/to/image.jpg" }
        Returns: { "success": True, "content": "text content", "text_path": "path" }
        """
        try:
            import pathlib
            from aiohttp import web
            
            data = await request.json()
            image_path_str = data.get('image_path', '')
            
            if not image_path_str:
                return web.json_response(
                    {"success": False, "error": "Image path is required"}, 
                    status=400
                )
            
            image_path = pathlib.Path(image_path_str)
            text_path = image_path.with_suffix('.txt')
            
            # Security check: ensure files exist
            if not image_path.exists() or not image_path.is_file():
                return web.json_response(
                    {"success": False, "error": "Image not found"}, 
                    status=404
                )
            
            if not text_path.exists():
                return web.json_response(
                    {"success": False, "error": "Text file not found"}, 
                    status=404
                )
            
            try:
                with open(text_path, 'r', encoding='utf-8') as file:
                    content = file.read()
            except UnicodeDecodeError:
                # Try with different encoding if UTF-8 fails
                with open(text_path, 'r', encoding='latin-1') as file:
                    content = file.read()
            
            return web.json_response({
                "success": True,
                "content": content,
                "text_path": str(text_path),
                "image_path": str(image_path)
            })
            
        except Exception as e:
            from aiohttp import web
            return web.json_response(
                {"success": False, "error": f"Failed to read text file: {str(e)}"}, 
                status=500
            )
    
    @routes_instance.post('/sage_utils/save_dataset_text')
    @route_error_handler
    async def save_dataset_text(request):
        """
        Save content to a dataset text file for an image.
        Body: { "image_path": "/path/to/image.jpg", "content": "text content" }
        Returns: { "success": True, "text_path": "path" }
        """
        try:
            import pathlib
            from aiohttp import web
            
            data = await request.json()
            image_path_str = data.get('image_path', '')
            content = data.get('content', '')
            
            if not image_path_str:
                return web.json_response(
                    {"success": False, "error": "Image path is required"}, 
                    status=400
                )
            
            image_path = pathlib.Path(image_path_str)
            text_path = image_path.with_suffix('.txt')
            
            # Security check: ensure the image file exists
            if not image_path.exists() or not image_path.is_file():
                return web.json_response(
                    {"success": False, "error": "Image not found"}, 
                    status=404
                )
            
            # Security check: ensure the text file is in the same directory as the image
            if text_path.parent != image_path.parent:
                return web.json_response(
                    {"success": False, "error": "Invalid file path"}, 
                    status=400
                )
            
            # Save the text file
            with open(text_path, 'w', encoding='utf-8') as file:
                file.write(content)
            
            return web.json_response({
                "success": True,
                "message": f"Text file saved successfully",
                "text_path": str(text_path),
                "image_path": str(image_path)
            })
            
        except Exception as e:
            from aiohttp import web
            return web.json_response(
                {"success": False, "error": f"Failed to save text file: {str(e)}"}, 
                status=500
            )

    @routes_instance.post('/sage_utils/browse_folder')
    @route_error_handler
    async def browse_folder(request):
        """
        Browse and validate a custom folder path.
        Body: { "path": "/custom/folder/path" }
        """
        import pathlib
        import os
        from aiohttp import web
        
        data = await request.json()
        folder_path_str = data.get('path', '')
        
        if not folder_path_str:
            return web.json_response(
                {"success": False, "error": "Path is required"}, 
                status=400
            )
        
        folder_path = pathlib.Path(folder_path_str).resolve()
        
        # Check if path exists and is a directory
        if not folder_path.exists():
            return web.json_response({
                "success": False,
                "valid": False,
                "error": "Path does not exist",
                "path": str(folder_path)
            })
        
        if not folder_path.is_dir():
            return web.json_response({
                "success": False,
                "valid": False,
                "error": "Path is not a directory",
                "path": str(folder_path)
            })
        
        # Check if we can access the directory
        try:
            # Try to list the directory
            list(folder_path.iterdir())
            accessible = True
        except PermissionError:
            accessible = False
        
        # Count images in the directory
        image_count = 0
        if accessible:
            image_extensions = {
                '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
                '.tiff', '.tif', '.ico', '.heic', '.heif', '.avif',
                '.raw', '.cr2', '.nef', '.arw', '.dng', '.orf', 
                '.pef', '.sr2', '.srw', '.x3f'
            }
            
            try:
                for file_path in folder_path.rglob('*'):
                    if file_path.is_file() and file_path.suffix.lower() in image_extensions:
                        image_count += 1
            except (PermissionError, OSError):
                # If we can't count, set to unknown
                image_count = -1
        
        return web.json_response({
            "success": True,
            "valid": True,
            "accessible": accessible,
            "image_count": image_count,
            "path": str(folder_path)
        })

    @routes_instance.post('/sage_utils/browse_directory_tree')
    @route_error_handler
    async def browse_directory_tree(request):
        """
        Browse directory tree for folder selection.
        Body: { "path": "/current/path", "depth": 2 }
        Returns: { "success": true, "current_path": "/path", "directories": [...] }
        """
        import pathlib
        import os
        import platform
        from aiohttp import web
        
        data = await request.json()
        current_path_str = data.get('path', os.path.expanduser('~'))
        max_depth = data.get('depth', 2)  # Limit depth to prevent performance issues
        
        # Expand Windows environment variables if present
        if platform.system() == 'Windows':
            current_path_str = os.path.expandvars(current_path_str)
        
        # Handle Windows vs Unix paths properly
        if platform.system() == 'Windows':
            current_path = pathlib.WindowsPath(current_path_str).resolve()
            restricted_paths = {
                'C:\\Windows\\System32', 'C:\\Windows\\SysWOW64', 
                'C:\\$Recycle.Bin', 'C:\\System Volume Information'
            }
        else:
            current_path = pathlib.PosixPath(current_path_str).resolve()
            restricted_paths = {
                '/proc', '/sys', '/dev', '/run', '/tmp/.X11-unix'
            }
        
        # Check if current path is in restricted areas
        path_str = str(current_path)
        is_restricted = any(path_str.startswith(restricted) for restricted in restricted_paths)
        
        if is_restricted:
            # If trying to access restricted path, default to home directory
            current_path = pathlib.Path.home()
        
        # Ensure the path exists and is a directory
        if not current_path.exists():
            # If path doesn't exist, try going to parent or default to home
            while current_path != current_path.parent and not current_path.exists():
                current_path = current_path.parent
            if not current_path.exists():
                current_path = pathlib.Path.home()
                
        if not current_path.is_dir():
            current_path = current_path.parent
        
        directories = []
        
        # Add parent directory (..) if not at root
        if current_path != current_path.parent:
            directories.append({
                "name": "..",
                "path": str(current_path.parent),
                "type": "parent",
                "accessible": True,
                "image_count": 0
            })
        
        # Get subdirectories
        try:
            for item in sorted(current_path.iterdir(), key=lambda p: p.name.lower()):
                if item.is_dir():
                    try:
                        # Check if we can access the directory
                        accessible = True
                        image_count = 0
                        
                        try:
                            # Quick count of image files
                            image_extensions = {
                                '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
                                '.tiff', '.tif', '.ico', '.heic', '.heif', '.avif'
                            }
                            
                            for file_item in item.iterdir():
                                if file_item.is_file() and file_item.suffix.lower() in image_extensions:
                                    image_count += 1
                                    if image_count >= 10:  # Stop counting at 10 for performance
                                        break
                                        
                        except (PermissionError, OSError):
                            accessible = False
                            image_count = -1
                        
                        directories.append({
                            "name": item.name,
                            "path": str(item),
                            "type": "directory",
                            "accessible": accessible,
                            "image_count": image_count if image_count >= 0 else "Unknown"
                        })
                        
                    except (OSError, PermissionError):
                        # Skip directories we can't access
                        continue
                        
        except PermissionError:
            # If we can't read the current directory, go up one level
            return web.json_response({
                "success": False,
                "error": f"Permission denied accessing directory: {current_path}",
                "suggested_path": str(current_path.parent)
            })
        
        return web.json_response({
            "success": True,
            "current_path": str(current_path),
            "directories": directories,
            "total_directories": len([d for d in directories if d["type"] == "directory"])
        })

    @routes_instance.post('/sage_utils/copy_image')
    @route_error_handler
    async def copy_image_to_clipboard(request):
        """
        Copy full-resolution image to system clipboard.
        Body: { "image_path": "/path/to/image.jpg" }
        """
        import pathlib
        import subprocess
        import platform
        import tempfile
        import os
        from PIL import Image
        from aiohttp import web
        
        data = await request.json()
        image_path_str = data.get('image_path', '')
        
        if not image_path_str:
            return web.json_response(
                {"success": False, "error": "Image path is required"}, 
                status=400
            )
        
        image_path = pathlib.Path(image_path_str)
        
        # Security check: ensure the file exists
        if not image_path.exists() or not image_path.is_file():
            return web.json_response(
                {"success": False, "error": "Image not found"}, 
                status=404
            )
        
        system = platform.system().lower()
        
        if system == "windows":
            # Windows implementation using PowerShell
            try:
                powershell_script = f'''
                Add-Type -AssemblyName System.Windows.Forms
                Add-Type -AssemblyName System.Drawing
                $image = [System.Drawing.Image]::FromFile("{image_path}")
                [System.Windows.Forms.Clipboard]::SetImage($image)
                $image.Dispose()
                '''
                
                result = subprocess.run(
                    ["powershell", "-Command", powershell_script],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                
                if result.returncode == 0:
                    return web.json_response({"success": True, "message": "Image copied to clipboard"})
                else:
                    return web.json_response(
                        {"success": False, "error": f"PowerShell error: {result.stderr}"}, 
                        status=500
                    )
            except subprocess.TimeoutExpired:
                return web.json_response(
                    {"success": False, "error": "Clipboard operation timed out"}, 
                    status=500
                )
        
        elif system == "darwin":  # macOS
            try:
                # Convert image to PNG for clipboard
                with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as temp_file:
                    temp_path = temp_file.name
                    
                # Convert image to PNG
                with Image.open(image_path) as img:
                    img.save(temp_path, 'PNG')
                
                # Copy to clipboard using osascript
                result = subprocess.run([
                    "osascript", "-e",
                    f'set the clipboard to (read file POSIX file "{temp_path}" as «class PNGf»)'
                ], capture_output=True, text=True, timeout=10)
                
                # Clean up temp file
                os.unlink(temp_path)
                
                if result.returncode == 0:
                    return web.json_response({"success": True, "message": "Image copied to clipboard"})
                else:
                    return web.json_response(
                        {"success": False, "error": f"macOS clipboard error: {result.stderr}"}, 
                        status=500
                    )
            except subprocess.TimeoutExpired:
                return web.json_response(
                    {"success": False, "error": "Clipboard operation timed out"}, 
                    status=500
                )
        
        elif system == "linux":
            try:
                # Try xclip first
                result = subprocess.run(["which", "xclip"], capture_output=True, timeout=5)
                if result.returncode == 0:
                    with open(image_path, 'rb') as img_file:
                        subprocess.run([
                            "xclip", "-selection", "clipboard", "-t", "image/png"
                        ], input=img_file.read(), timeout=10)
                    return web.json_response({"success": True, "message": "Image copied to clipboard"})
                
                # Try xsel as fallback
                result = subprocess.run(["which", "xsel"], capture_output=True, timeout=5)
                if result.returncode == 0:
                    with open(image_path, 'rb') as img_file:
                        subprocess.run([
                            "xsel", "--clipboard", "--input"
                        ], input=img_file.read(), timeout=10)
                    return web.json_response({"success": True, "message": "Image copied to clipboard"})
                
                return web.json_response(
                    {"success": False, "error": "No clipboard utility found (xclip or xsel required)"}, 
                    status=500
                )
            except subprocess.TimeoutExpired:
                return web.json_response(
                    {"success": False, "error": "Clipboard operation timed out"}, 
                    status=500
                )
        
        else:
            return web.json_response(
                {"success": False, "error": f"Clipboard operations not supported on {system}"}, 
                status=500
            )

    @routes_instance.post('/sage_utils/image')
    @route_error_handler
    async def get_full_image(request):
        """
        Serve full resolution image.
        Body: { "image_path": "/full/path/to/image" }
        """
        import pathlib
        import os
        from aiohttp import web
        
        # Get path from request body
        data = await request.json()
        image_path = data.get('image_path', '')
        
        # Validate path security
        if not image_path or '..' in image_path:
            return web.Response(text="Invalid path", status=400)
        
        # Check if file exists and is an image
        if not os.path.exists(image_path):
            return web.Response(text="Image not found", status=404)
        
        if not image_path.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.tiff', '.tif')):
            return web.Response(text="Not an image file", status=400)
        
        # Determine content type
        ext = pathlib.Path(image_path).suffix.lower()
        content_type_map = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg', 
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.webp': 'image/webp',
            '.tiff': 'image/tiff',
            '.tif': 'image/tiff'
        }
        content_type = content_type_map.get(ext, 'application/octet-stream')
        
        # Read and serve the image
        with open(image_path, 'rb') as f:
            image_data = f.read()
        
        return web.Response(
            body=image_data,
            content_type=content_type,
            headers={
                'Cache-Control': 'public, max-age=3600',  # Cache for 1 hour
                'Content-Length': str(len(image_data))
            }
        )
    
    @routes_instance.post('/sage_utils/find_duplicates')
    @route_error_handler
    async def find_duplicates(request):
        """
        Find duplicate images in a folder by computing image hashes.
        Body: { "folder_path": "/path/to/folder", "include_subfolders": true }
        Returns: { "success": true, "duplicates": [[img1, img2], [img3, img4, img5]], "total_images": 100, "total_duplicates": 5 }
        """
        import pathlib
        import hashlib
        from collections import defaultdict
        from aiohttp import web
        
        data = await request.json()
        folder_path_str = data.get('folder_path', '')
        include_subfolders = data.get('include_subfolders', False)
        
        if not folder_path_str:
            return web.json_response(
                {"success": False, "error": "Folder path is required"}, 
                status=400
            )
        
        folder_path = pathlib.Path(folder_path_str)
        
        # Security check: ensure the folder exists
        if not folder_path.exists() or not folder_path.is_dir():
            return web.json_response(
                {"success": False, "error": "Folder not found or is not a directory"}, 
                status=404
            )
        
        # Supported image extensions
        image_extensions = {
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp',
            '.tiff', '.tif', '.ico', '.heic', '.heif', '.avif'
        }
        
        # Hash map: hash -> [image_paths]
        hash_map = defaultdict(list)
        total_images = 0
        
        try:
            # Get all image files
            if include_subfolders:
                image_files = [
                    f for f in folder_path.rglob('*') 
                    if f.is_file() and f.suffix.lower() in image_extensions
                ]
            else:
                image_files = [
                    f for f in folder_path.iterdir() 
                    if f.is_file() and f.suffix.lower() in image_extensions
                ]
            
            total_images = len(image_files)
            
            # Calculate hash for each image
            for image_file in image_files:
                try:
                    # Use MD5 hash of file content for duplicate detection
                    hasher = hashlib.md5()
                    with open(image_file, 'rb') as f:
                        # Read in chunks for memory efficiency
                        for chunk in iter(lambda: f.read(8192), b''):
                            hasher.update(chunk)
                    
                    file_hash = hasher.hexdigest()
                    
                    # Get file stats
                    stat = image_file.stat()
                    
                    image_info = {
                        'path': str(image_file),
                        'filename': image_file.name,
                        'size': stat.st_size,
                        'size_human': _format_file_size(stat.st_size),
                        'hash': file_hash
                    }
                    
                    hash_map[file_hash].append(image_info)
                    
                except (OSError, PermissionError) as e:
                    # Skip files we cannot read
                    continue
            
            # Extract groups with duplicates (more than 1 image with same hash)
            duplicate_groups = [
                images for images in hash_map.values() if len(images) > 1
            ]
            
            # Count total duplicate images (excluding one original from each group)
            total_duplicates = sum(len(group) - 1 for group in duplicate_groups)
            
            return web.json_response({
                "success": True,
                "duplicates": duplicate_groups,
                "total_images": total_images,
                "total_duplicates": total_duplicates,
                "duplicate_groups": len(duplicate_groups)
            })
            
        except PermissionError:
            return web.json_response(
                {"success": False, "error": f"Permission denied accessing folder: {folder_path}"}, 
                status=403
            )
        except Exception as e:
            return web.json_response(
                {"success": False, "error": f"Failed to find duplicates: {str(e)}"}, 
                status=500
            )
    
    @routes_instance.post('/sage_utils/delete_images')
    @route_error_handler
    async def delete_images(request):
        """
        Delete multiple images.
        Body: { "image_paths": ["/path/to/image1.jpg", "/path/to/image2.jpg"] }
        Returns: { "success": true, "deleted": 2, "failed": 0, "errors": [] }
        """
        import pathlib
        import os
        from aiohttp import web
        
        data = await request.json()
        image_paths = data.get('image_paths', [])
        
        if not image_paths or not isinstance(image_paths, list):
            return web.json_response(
                {"success": False, "error": "image_paths must be a non-empty array"}, 
                status=400
            )
        
        deleted_count = 0
        failed_count = 0
        errors = []
        
        for image_path_str in image_paths:
            try:
                image_path = pathlib.Path(image_path_str)
                
                # Security check: ensure the file exists and is a file
                if not image_path.exists():
                    errors.append({
                        'path': image_path_str,
                        'error': 'File not found'
                    })
                    failed_count += 1
                    continue
                
                if not image_path.is_file():
                    errors.append({
                        'path': image_path_str,
                        'error': 'Path is not a file'
                    })
                    failed_count += 1
                    continue
                
                # Delete the file
                os.remove(image_path)
                deleted_count += 1
                
            except PermissionError:
                errors.append({
                    'path': image_path_str,
                    'error': 'Permission denied'
                })
                failed_count += 1
            except Exception as e:
                errors.append({
                    'path': image_path_str,
                    'error': str(e)
                })
                failed_count += 1
        
        return web.json_response({
            "success": True,
            "deleted": deleted_count,
            "failed": failed_count,
            "errors": errors
        })
    
    # Track registered routes
    _route_list.extend([
        "POST /sage_utils/civitai_images",
        "POST /sage_utils/list_images", 
        "POST /sage_utils/thumbnail",
        "POST /sage_utils/image_metadata",
        "POST /sage_utils/check_dataset_text",
        "POST /sage_utils/read_dataset_text",
        "POST /sage_utils/save_dataset_text",
        "POST /sage_utils/browse_folder",
        "POST /sage_utils/browse_directory_tree",
        "POST /sage_utils/copy_image",
        "POST /sage_utils/image",
        "POST /sage_utils/find_duplicates",
        "POST /sage_utils/delete_images"
    ])
    
    return len(_route_list)

def get_route_list():
    """Get list of registered routes for this module."""
    return _route_list.copy()

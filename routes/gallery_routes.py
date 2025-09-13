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
    
    # Track registered routes
    _route_list.extend([
        "POST /sage_utils/civitai_images",
        "POST /sage_utils/list_images", 
        "POST /sage_utils/thumbnail",
        "POST /sage_utils/image_metadata",
        "POST /sage_utils/check_dataset_text",
        "POST /sage_utils/read_dataset_text",
        "POST /sage_utils/save_dataset_text"
    ])
    
    logging.info("Gallery routes registered successfully")
    return len(_route_list)

def get_route_list():
    """Get list of registered routes for this module."""
    return _route_list.copy()

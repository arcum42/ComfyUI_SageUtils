"""
Custom routes for SageUtils to expose cache data and settings via HTTP endpoints.
This file now uses a modular route system for better maintainability.
"""

import logging
from .utils.performance_timer import server_timer, record_initialization_milestone, timer_context

# Record server routes initialization start
record_initialization_milestone("SERVER_ROUTES_START", server_timer)

try:
    from server import PromptServer
    from aiohttp import web
    from .utils.model_cache import cache
    from .utils.settings import get_settings, SETTINGS_SCHEMA
    
    # Try to import the new modular route system
    try:
        from .routes import register_routes, is_initialized
        _modular_routes_available = True
    except ImportError as e:
        print(f"SageUtils: Modular routes not available ({e}), using legacy routes only")
        _modular_routes_available = False
    
    record_initialization_milestone("SERVER_IMPORTS_COMPLETE", server_timer)

    # Check if PromptServer instance is available
    if hasattr(PromptServer, 'instance') and PromptServer.instance is not None:
        # Get the PromptServer instance
        routes = PromptServer.instance.routes
        record_initialization_milestone("PROMPT_SERVER_READY", server_timer)
        
        # Try to use the new modular route system (when available and working)
        if _modular_routes_available:
            try:
                route_count = register_routes(routes)
                if route_count > 0:
                    print(f"SageUtils: Registered {route_count} additional routes using modular system")
                    record_initialization_milestone("MODULAR_ROUTES_REGISTERED", server_timer)
                else:
                    print("SageUtils: Modular system loaded but no routes registered yet (Phase 2)")
            except Exception as modular_error:
                print(f"SageUtils: Error with modular routes ({modular_error}), continuing with legacy routes")
                record_initialization_milestone("MODULAR_ROUTES_ERROR", server_timer)

        # Settings management routes
        @routes.get('/sage_utils/settings')
        async def get_sage_settings(request):
            """
            Returns all SageUtils settings with their current values and schema information.
            """
            try:
                import json
                settings = get_settings()
                settings_info = settings.list_all_settings()
                
                # Double-check that the result is JSON serializable
                json.dumps(settings_info)  # This will raise an exception if not serializable
                
                return web.json_response({
                    "success": True,
                    "settings": settings_info
                })
            except (TypeError, ValueError) as e:
                return web.json_response(
                    {"success": False, "error": f"JSON serialization error: {str(e)}"}, 
                    status=500
                )
            except Exception as e:
                import traceback
                error_details = traceback.format_exc()
                print(f"SageUtils settings error: {error_details}")
                return web.json_response(
                    {"success": False, "error": f"Failed to retrieve settings: {str(e)}", "details": error_details}, 
                    status=500
                )

        @routes.post('/sage_utils/settings')
        async def update_sage_settings(request):
            """
            Updates SageUtils settings. Expects JSON body with setting key-value pairs.
            """
            try:
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
                                from .utils.llm_wrapper import ensure_llm_initialized
                                ensure_llm_initialized()
                            except Exception as llm_e:
                                errors.append(f"Warning: Failed to initialize LLM services: {str(llm_e)}")
                        
                        return web.json_response({
                            "success": True,
                            "updated": updated_settings,
                            "errors": errors,
                            "message": f"Updated {len(updated_settings)} setting(s)"
                        })
                    else:
                        return web.json_response({
                            "success": False,
                            "error": "Failed to save settings",
                            "updated": updated_settings,
                            "errors": errors
                        }, status=500)
                else:
                    # No settings needed updating - this could be success or error
                    if errors:
                        # There were invalid settings, so this is an error
                        return web.json_response({
                            "success": False,
                            "error": "No valid settings to update",
                            "errors": errors
                        }, status=400)
                    else:
                        # All settings were already at correct values - this is success
                        return web.json_response({
                            "success": True,
                            "updated": [],
                            "errors": [],
                            "message": "All settings already at requested values"
                        })
                    
            except Exception as e:
                return web.json_response(
                    {"success": False, "error": f"Failed to update settings: {str(e)}"}, 
                    status=500
                )

        @routes.post('/sage_utils/settings/reset')
        async def reset_sage_settings(request):
            """
            Resets all SageUtils settings to their default values.
            """
            try:
                settings = get_settings()
                settings.reset_to_defaults()
                return web.json_response({
                    "success": True,
                    "message": "All settings reset to defaults"
                })
            except Exception as e:
                return web.json_response(
                    {"success": False, "error": f"Failed to reset settings: {str(e)}"}, 
                    status=500
                )

        @routes.get('/sage_cache/info')
        async def get_sage_cache_info(request):
            """
            Returns the contents of SageCache.info as JSON.
            This contains model metadata, civitai information, and cache details.
            """
            try:
                # Ensure cache is loaded
                cache.load()
                return web.json_response(cache.info)
            except Exception as e:
                return web.json_response(
                    {"error": f"Failed to retrieve cache info: {str(e)}"}, 
                    status=500
                )

        @routes.get('/sage_cache/hash')
        async def get_sage_cache_hash(request):
            """
            Returns the contents of SageCache.hash as JSON.
            This contains the mapping from file paths to their SHA256 hashes.
            """
            try:
                # Ensure cache is loaded
                cache.load()
                return web.json_response(cache.hash)
            except Exception as e:
                return web.json_response(
                    {"error": f"Failed to retrieve cache hash: {str(e)}"}, 
                    status=500
                )

        @routes.get('/sage_cache/stats')
        async def get_sage_cache_stats(request):
            """
            Returns statistics about the SageCache.
            """
            try:
                # Ensure cache is loaded
                cache.load()
                
                stats = {
                    "total_files": len(cache.hash),
                    "total_info_entries": len(cache.info),
                    "cache_files": {
                        "hash_path": str(cache.hash_path),
                        "info_path": str(cache.info_path),
                        "main_path": str(cache.main_path),
                        "ollama_models_path": str(cache.ollama_models_path)
                    }
                }
                
                # Count files by civitai status
                civitai_found = 0
                civitai_not_found = 0
                
                for info_data in cache.info.values():
                    civitai_status = info_data.get("civitai", "False")
                    if isinstance(civitai_status, str):
                        if civitai_status.lower() in ["true", "1"]:
                            civitai_found += 1
                        else:
                            civitai_not_found += 1
                    elif civitai_status is True:
                        civitai_found += 1
                    else:
                        civitai_not_found += 1
                
                stats["civitai_stats"] = {
                    "found_on_civitai": civitai_found,
                    "not_found_on_civitai": civitai_not_found
                }
                
                return web.json_response(stats)
            except Exception as e:
                return web.json_response(
                    {"error": f"Failed to retrieve cache stats: {str(e)}"}, 
                    status=500
                )

        @routes.get('/sage_cache/file/{file_hash}')
        async def get_sage_cache_file_info(request):
            """
            Returns information for a specific file hash.
            """
            try:
                file_hash = request.match_info.get('file_hash', '')
                if not file_hash:
                    return web.json_response(
                        {"error": "No file hash provided"}, 
                        status=400
                    )
                
                # Ensure cache is loaded
                cache.load()
                
                file_info = cache.info.get(file_hash)
                if file_info is None:
                    return web.json_response(
                        {"error": f"No information found for hash: {file_hash}"}, 
                        status=404
                    )
                
                # Also include which file paths use this hash
                file_paths = [path for path, hash_val in cache.hash.items() if hash_val == file_hash]
                
                result = {
                    "hash": file_hash,
                    "info": file_info,
                    "file_paths": file_paths
                }
                
                return web.json_response(result)
            except Exception as e:
                return web.json_response(
                    {"error": f"Failed to retrieve file info: {str(e)}"}, 
                    status=500
                )

        @routes.get('/sage_cache/path')
        async def get_sage_cache_path_info(request):
            """
            Returns information for a file by its path.
            Uses the file path to look up the hash in cache.hash, 
            then retrieves the info from cache.info.
            """
            try:
                # Get file path from query parameter
                file_path = request.rel_url.query.get('file_path', '')
                if not file_path:
                    return web.json_response(
                        {"error": "No file_path parameter provided. Use ?file_path=/path/to/file"}, 
                        status=400
                    )
                
                # Ensure cache is loaded
                cache.load()
                
                # Look up hash for this file path
                file_hash = cache.hash.get(file_path)
                if file_hash is None:
                    return web.json_response(
                        {"error": f"No hash found for file path: {file_path}"}, 
                        status=404
                    )
                
                # Get the info for this hash
                file_info = cache.info.get(file_hash)
                if file_info is None:
                    return web.json_response(
                        {"error": f"No information found for hash {file_hash} (path: {file_path})"}, 
                        status=404
                    )
                
                # Also include all file paths that use this same hash (duplicates)
                all_file_paths = [path for path, hash_val in cache.hash.items() if hash_val == file_hash]
                
                result = {
                    "file_path": file_path,
                    "hash": file_hash,
                    "info": file_info,
                    "all_paths_with_same_hash": all_file_paths
                }
                
                return web.json_response(result)
            except Exception as e:
                return web.json_response(
                    {"error": f"Failed to retrieve path info: {str(e)}"}, 
                    status=500
                )

        @routes.post('/sage_utils/pull_metadata')
        async def pull_metadata_route(request):
            """
            Pulls metadata for a specific file using the pull_metadata function from helpers.py.
            Expects JSON body with 'file_path' field and optional 'force' field.
            """
            try:
                from .utils.helpers import pull_metadata
                
                # Parse request body
                data = await request.json()
                file_path = data.get('file_path')
                force = data.get('force', False)
                
                if not file_path:
                    return web.json_response(
                        {"error": "file_path is required"}, 
                        status=400
                    )
                
                # Call the pull_metadata function
                try:
                    pull_metadata(file_path, force_all=force)
                    
                    return web.json_response({
                        "success": True,
                        "message": f"Metadata pulled successfully for {file_path}"
                    })
                    
                except Exception as pull_error:
                    return web.json_response(
                        {"success": False, "error": f"Failed to pull metadata: {str(pull_error)}"}, 
                        status=500
                    )
                
            except Exception as e:
                return web.json_response(
                    {"success": False, "error": f"Request processing error: {str(e)}"}, 
                    status=500
                )

        @routes.post('/sage_utils/update_cache_info')
        async def update_cache_info_route(request):
            """
            Updates cache info for a specific file hash.
            Expects JSON body with 'hash' and 'info' fields.
            """
            try:
                # Parse request body
                data = await request.json()
                hash_value = data.get('hash')
                info = data.get('info')
                
                if not hash_value or not info:
                    return web.json_response(
                        {"error": "Both 'hash' and 'info' are required"}, 
                        status=400
                    )
                
                # Update the cache info
                try:
                    cache.load()
                    cache.info[hash_value] = info
                    cache.save()
                    
                    return web.json_response({
                        "success": True,
                        "message": f"Cache info updated successfully for hash {hash_value}"
                    })
                    
                except Exception as update_error:
                    return web.json_response(
                        {"success": False, "error": f"Failed to update cache info: {str(update_error)}"}, 
                        status=500
                    )
                
            except Exception as e:
                return web.json_response(
                    {"success": False, "error": f"Request processing error: {str(e)}"}, 
                    status=500
                )

        @routes.get('/sage_utils/cache_info_images')
        async def get_cache_info_images(request):
            """
            Returns image data associated with a cached model's Civitai information.
            Expects 'hash' query parameter.
            """
            try:
                hash_value = request.query.get('hash')
                if not hash_value:
                    return web.json_response(
                        {"success": False, "error": "Hash parameter required"}, 
                        status=400
                    )

                # Get info from cache
                info = cache.info.get(hash_value)
                
                if not info:
                    return web.json_response(
                        {"success": False, "error": "No cache info found for hash"}, 
                        status=404
                    )

                # Extract images from Civitai data
                images = []
                
                # Check for images in various possible locations in the info structure
                if isinstance(info, dict):
                    # Direct images array
                    if 'images' in info and isinstance(info['images'], list):
                        images.extend(info['images'])
                    
                    # Images in nested structures (common in Civitai data)
                    for key in ['version', 'model', 'data']:
                        if key in info and isinstance(info[key], dict):
                            nested_data = info[key]
                            if 'images' in nested_data and isinstance(nested_data['images'], list):
                                images.extend(nested_data['images'])
                    
                    # Legacy: check for direct image properties
                    for img_key in ['image', 'preview', 'thumbnail']:
                        if img_key in info and info[img_key]:
                            img_data = info[img_key]
                            if isinstance(img_data, str):
                                # Direct URL
                                images.append({
                                    'url': img_data,
                                    'nsfw': 'Unknown',
                                    'type': img_key
                                })
                            elif isinstance(img_data, dict) and 'url' in img_data:
                                # Image object with URL
                                images.append({
                                    'url': img_data['url'],
                                    'nsfw': img_data.get('nsfw', 'Unknown'),
                                    'type': img_key
                                })

                # Format images for frontend consumption
                formatted_images = []
                for img in images:
                    if isinstance(img, dict) and 'url' in img:
                        formatted_images.append({
                            'url': img['url'],
                            'nsfw': img.get('nsfw', 'Unknown'),
                            'type': img.get('type', 'preview'),
                            'width': img.get('width'),
                            'height': img.get('height'),
                            'meta': img.get('meta', {})
                        })
                    elif isinstance(img, str):
                        # Direct URL string
                        formatted_images.append({
                            'url': img,
                            'nsfw': 'Unknown',
                            'type': 'preview'
                        })

                return web.json_response({
                    "success": True,
                    "images": formatted_images,
                    "count": len(formatted_images)
                })

            except Exception as e:
                logging.error(f"Error getting cache info images: {e}")
                return web.json_response(
                    {"success": False, "error": f"Request processing error: {str(e)}"}, 
                    status=500
                )

        @routes.get('/sage_utils/file_size')
        async def get_file_size(request):
            """
            Returns the file size for a given file path.
            Expects 'path' query parameter.
            """
            try:
                file_path = request.query.get('path')
                if not file_path:
                    return web.json_response(
                        {"success": False, "error": "Path parameter required"}, 
                        status=400
                    )

                import os
                if not os.path.exists(file_path):
                    return web.json_response(
                        {"success": False, "error": "File not found"}, 
                        status=404
                    )

                try:
                    file_size = os.path.getsize(file_path)
                    return web.json_response({
                        "success": True,
                        "file_size": file_size,
                        "file_path": file_path
                    })
                except OSError as e:
                    return web.json_response(
                        {"success": False, "error": f"Cannot access file: {str(e)}"}, 
                        status=403
                    )

            except Exception as e:
                logging.error(f"Error getting file size: {e}")
                return web.json_response(
                    {"success": False, "error": f"Request processing error: {str(e)}"}, 
                    status=500
                )

        # Notes management routes

                # Gallery management routes

        # Gallery management routes
        @routes.post('/sage_utils/list_images')
        async def list_images(request):
            """
            Returns a list of all images in a specified folder.
            Body: { "folder": "notes|input|output|custom", "path": "/custom/path" }
            """
            try:
                import os
                import pathlib
                from .utils.path_manager import path_manager
                import folder_paths
                import time
                
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
                return web.json_response(
                    {"success": False, "error": f"Failed to list images: {str(e)}"}, 
                    status=500
                )

        @routes.post('/sage_utils/thumbnail')
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
                return web.Response(text=f"Failed to serve thumbnail: {str(e)}", status=500)

        @routes.post('/sage_utils/image_metadata')
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
                return web.json_response(
                    {"success": False, "error": f"Failed to extract metadata: {str(e)}"}, 
                    status=500
                )

        @routes.post('/sage_utils/check_dataset_text')
        async def check_dataset_text(request):
            """
            Check if a text file exists for an image (for dataset annotation).
            Body: { "image_path": "/path/to/image.jpg" }
            Returns: { "success": True, "exists": bool, "text_path": "path" }
            """
            try:
                import pathlib
                
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
                return web.json_response(
                    {"success": False, "error": f"Failed to check text file: {str(e)}"}, 
                    status=500
                )

        @routes.post('/sage_utils/read_dataset_text')
        async def read_dataset_text(request):
            """
            Read the content of a dataset text file for an image.
            Body: { "image_path": "/path/to/image.jpg" }
            Returns: { "success": True, "content": "text content", "text_path": "path" }
            """
            try:
                import pathlib
                
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
                return web.json_response(
                    {"success": False, "error": f"Failed to read text file: {str(e)}"}, 
                    status=500
                )

        @routes.post('/sage_utils/save_dataset_text')
        async def save_dataset_text(request):
            """
            Save content to a dataset text file for an image.
            Body: { "image_path": "/path/to/image.jpg", "content": "text content" }
            Returns: { "success": True, "text_path": "path" }
            """
            try:
                import pathlib
                
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
                return web.json_response(
                    {"success": False, "error": f"Failed to save text file: {str(e)}"}, 
                    status=500
                )

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

        @routes.post('/sage_utils/browse_folder')
        async def browse_folder(request):
            """
            Browse and validate a custom folder path.
            Body: { "path": "/custom/folder/path" }
            """
            try:
                import pathlib
                import os
                
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
                
            except Exception as e:
                return web.json_response(
                    {"success": False, "error": f"Failed to browse folder: {str(e)}"}, 
                    status=500
                )

        print("SageUtils custom routes loaded successfully!")
        record_initialization_milestone("ROUTES_REGISTERED", server_timer)
        
        # Complete server timer initialization
        from .utils.performance_timer import complete_initialization
        server_init_time = complete_initialization(server_timer)
        print(f"SageUtils server initialization completed in {server_init_time:.4f}s")
    else:
        print("Warning: PromptServer instance not available, skipping route registration")
        record_initialization_milestone("PROMPT_SERVER_UNAVAILABLE", server_timer)

except ImportError as e:
    print(f"Warning: Could not import required modules for SageUtils routes: {e}")
except Exception as e:
    print(f"Warning: Error setting up SageUtils routes: {e}")

"""
Custom routes for SageUtils to expose cache data and settings via HTTP endpoints.
"""

import logging
try:
    from server import PromptServer
    from aiohttp import web
    from .utils.model_cache import cache
    from .utils.settings import get_settings, SETTINGS_SCHEMA

    # Check if PromptServer instance is available
    if hasattr(PromptServer, 'instance') and PromptServer.instance is not None:
        # Get the PromptServer instance
        routes = PromptServer.instance.routes

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
                    return web.json_response({
                        "success": False,
                        "error": "No valid settings to update",
                        "errors": errors
                    }, status=400)
                    
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

        @routes.get('/sage_utils/read_notes_file')
        async def read_notes_file_get(request):
            """
            Serves notes files (including images) via GET request.
            Query parameters: filename (required), type (optional: 'image' or 'text')
            """
            try:
                from .utils.path_manager import path_manager
                import mimetypes
                
                # Get filename from query parameters
                filename = request.query.get('filename')
                file_type = request.query.get('type', 'text')
                
                if not filename:
                    return web.json_response(
                        {"error": "Filename is required"}, 
                        status=400
                    )
                
                # Construct the full file path
                notes_file_path = path_manager.notes_path / filename
                
                # Security check: ensure the path is within the notes directory
                if not str(notes_file_path.resolve()).startswith(str(path_manager.notes_path.resolve())):
                    return web.json_response(
                        {"error": "Invalid file path"}, 
                        status=400
                    )
                
                # Check if file exists
                if not notes_file_path.exists() or not notes_file_path.is_file():
                    return web.json_response(
                        {"error": f"File '{filename}' not found in notes directory"}, 
                        status=404
                    )
                
                # For images, serve as binary data with appropriate content type
                if file_type == 'image':
                    # Guess the MIME type based on file extension
                    content_type, _ = mimetypes.guess_type(str(notes_file_path))
                    if not content_type or not content_type.startswith('image/'):
                        # Default to a common image type if we can't determine it
                        content_type = 'image/jpeg'
                    
                    # Read and serve the image file
                    with open(notes_file_path, 'rb') as file:
                        image_data = file.read()
                    
                    return web.Response(
                        body=image_data,
                        content_type=content_type,
                        headers={
                            'Cache-Control': 'max-age=3600',  # Cache for 1 hour
                            'Content-Disposition': f'inline; filename="{filename}"'
                        }
                    )
                elif file_type == 'video':
                    # Guess the MIME type based on file extension
                    content_type, _ = mimetypes.guess_type(str(notes_file_path))
                    if not content_type or not content_type.startswith('video/'):
                        # Default to MP4 if we can't determine it
                        content_type = 'video/mp4'
                    
                    # Get file size for range requests
                    file_size = notes_file_path.stat().st_size
                    
                    # Handle range requests for video streaming
                    range_header = request.headers.get('Range')
                    if range_header:
                        # Parse range header
                        range_match = range_header.replace('bytes=', '').split('-')
                        start = int(range_match[0]) if range_match[0] else 0
                        end = int(range_match[1]) if range_match[1] else file_size - 1
                        
                        # Ensure end doesn't exceed file size
                        end = min(end, file_size - 1)
                        content_length = end - start + 1
                        
                        # Read the requested range
                        with open(notes_file_path, 'rb') as file:
                            file.seek(start)
                            video_data = file.read(content_length)
                        
                        return web.Response(
                            body=video_data,
                            status=206,  # Partial Content
                            content_type=content_type,
                            headers={
                                'Content-Range': f'bytes {start}-{end}/{file_size}',
                                'Accept-Ranges': 'bytes',
                                'Content-Length': str(content_length),
                                'Cache-Control': 'max-age=3600'
                            }
                        )
                    else:
                        # Serve entire video file
                        with open(notes_file_path, 'rb') as file:
                            video_data = file.read()
                        
                        return web.Response(
                            body=video_data,
                            content_type=content_type,
                            headers={
                                'Accept-Ranges': 'bytes',
                                'Content-Length': str(file_size),
                                'Cache-Control': 'max-age=3600',
                                'Content-Disposition': f'inline; filename="{filename}"'
                            }
                        )
                else:
                    # For text files, return JSON response
                    with open(notes_file_path, 'r', encoding='utf-8') as file:
                        content = file.read()
                    
                    return web.json_response({
                        "filename": filename,
                        "content": content
                    })
                
            except Exception as e:
                return web.json_response(
                    {"error": f"Failed to read notes file: {str(e)}"}, 
                    status=500
                )

        @routes.post('/sage_utils/read_notes_file')
        async def read_notes_file(request):
            """
            Reads the content of a notes file by filename.
            Expects JSON body with 'filename' field.
            """
            try:
                from .utils.path_manager import path_manager
                
                # Parse request body
                data = await request.json()
                filename = data.get('filename')
                
                if not filename:
                    return web.json_response(
                        {"error": "Filename is required"}, 
                        status=400
                    )
                
                # Construct the full file path
                notes_file_path = path_manager.notes_path / filename
                
                # Security check: ensure the path is within the notes directory
                if not str(notes_file_path.resolve()).startswith(str(path_manager.notes_path.resolve())):
                    return web.json_response(
                        {"error": "Invalid file path"}, 
                        status=400
                    )
                
                # Check if file exists
                if not notes_file_path.exists() or not notes_file_path.is_file():
                    return web.json_response(
                        {"error": f"File '{filename}' not found in notes directory"}, 
                        status=404
                    )
                
                # Read file content
                with open(notes_file_path, 'r', encoding='utf-8') as file:
                    content = file.read()
                
                return web.json_response({
                    "filename": filename,
                    "content": content
                })
                
            except Exception as e:
                return web.json_response(
                    {"error": f"Failed to read notes file: {str(e)}"}, 
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
                    pull_metadata(file_path, timestamp=True, force_all=force)
                    
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
        @routes.get('/sage_utils/list_notes')
        async def list_notes(request):
            """
            Returns a list of all notes files in the notes directory.
            """
            try:
                from .utils.path_manager import path_manager
                
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
                return web.json_response(
                    {"success": False, "error": f"Failed to list notes: {str(e)}"}, 
                    status=500
                )

        @routes.post('/sage_utils/read_note')
        async def read_note(request):
            """
            Reads the content of a specific notes file.
            """
            try:
                from .utils.path_manager import path_manager
                data = await request.json()
                filename = data.get('filename', '')
                
                if not filename:
                    return web.json_response(
                        {"success": False, "error": "Filename is required"}, 
                        status=400
                    )
                
                notes_file_path = path_manager.notes_path / filename
                
                # Security check: ensure the file is within the notes directory
                if not str(notes_file_path.resolve()).startswith(str(path_manager.notes_path.resolve())):
                    return web.json_response(
                        {"success": False, "error": "Invalid file path"}, 
                        status=400
                    )
                
                if not notes_file_path.exists() or not notes_file_path.is_file():
                    return web.json_response(
                        {"success": False, "error": f"File '{filename}' not found"}, 
                        status=404
                    )
                
                with open(notes_file_path, 'r', encoding='utf-8') as file:
                    content = file.read()
                
                return web.json_response({
                    "success": True,
                    "content": content,
                    "filename": filename
                })
            except Exception as e:
                return web.json_response(
                    {"success": False, "error": f"Failed to read note: {str(e)}"}, 
                    status=500
                )

        @routes.get('/sage_utils/read_note')
        async def read_note_get(request):
            """
            Serves a notes file directly - supports text, images, and video files.
            """
            try:
                from .utils.path_manager import path_manager
                import mimetypes
                
                filename = request.query.get('filename', '')
                
                if not filename:
                    return web.Response(text="Filename is required", status=400)
                
                notes_file_path = path_manager.notes_path / filename
                
                # Security check: ensure the file is within the notes directory
                if not str(notes_file_path.resolve()).startswith(str(path_manager.notes_path.resolve())):
                    return web.Response(text="Invalid file path", status=400)
                
                if not notes_file_path.exists() or not notes_file_path.is_file():
                    return web.Response(text=f"File '{filename}' not found", status=404)
                
                # Determine content type
                content_type, _ = mimetypes.guess_type(str(notes_file_path))
                if content_type is None:
                    content_type = 'application/octet-stream'
                
                # Read file in appropriate mode
                if content_type.startswith(('image/', 'video/')):
                    # Binary mode for images and videos
                    with open(notes_file_path, 'rb') as file:
                        content = file.read()
                    
                    # For videos, add headers to support range requests and streaming
                    headers = {}
                    if content_type.startswith('video/'):
                        headers['Accept-Ranges'] = 'bytes'
                        headers['Cache-Control'] = 'no-cache'
                    
                    return web.Response(body=content, content_type=content_type, headers=headers)
                else:
                    # Text mode for other files
                    with open(notes_file_path, 'r', encoding='utf-8') as file:
                        content = file.read()
                    return web.Response(text=content, content_type=content_type)
                    
            except Exception as e:
                return web.Response(text=f"Failed to read file: {str(e)}", status=500)

        @routes.post('/sage_utils/save_note')
        async def save_note(request):
            """
            Saves content to a notes file.
            """
            try:
                from .utils.path_manager import path_manager
                import os
                data = await request.json()
                filename = data.get('filename', '').strip()
                content = data.get('content', '')
                
                if not filename:
                    return web.json_response(
                        {"success": False, "error": "Filename is required"}, 
                        status=400
                    )
                
                # Basic filename validation
                if any(char in filename for char in ['/', '\\', '..', '<', '>', ':', '"', '|', '?', '*']):
                    return web.json_response(
                        {"success": False, "error": "Invalid filename characters"}, 
                        status=400
                    )
                
                notes_file_path = path_manager.notes_path / filename
                
                # Security check: ensure the file is within the notes directory
                if not str(notes_file_path.resolve()).startswith(str(path_manager.notes_path.resolve())):
                    return web.json_response(
                        {"success": False, "error": "Invalid file path"}, 
                        status=400
                    )
                
                # Ensure notes directory exists
                path_manager.notes_path.mkdir(parents=True, exist_ok=True)
                
                with open(notes_file_path, 'w', encoding='utf-8') as file:
                    file.write(content)
                
                return web.json_response({
                    "success": True,
                    "message": f"File '{filename}' saved successfully"
                })
            except Exception as e:
                return web.json_response(
                    {"success": False, "error": f"Failed to save note: {str(e)}"}, 
                    status=500
                )

        @routes.post('/sage_utils/delete_note')
        async def delete_note(request):
            """
            Deletes a notes file.
            """
            try:
                from .utils.path_manager import path_manager
                data = await request.json()
                filename = data.get('filename', '')
                
                if not filename:
                    return web.json_response(
                        {"success": False, "error": "Filename is required"}, 
                        status=400
                    )
                
                notes_file_path = path_manager.notes_path / filename
                
                # Security check: ensure the file is within the notes directory
                if not str(notes_file_path.resolve()).startswith(str(path_manager.notes_path.resolve())):
                    return web.json_response(
                        {"success": False, "error": "Invalid file path"}, 
                        status=400
                    )
                
                if not notes_file_path.exists() or not notes_file_path.is_file():
                    return web.json_response(
                        {"success": False, "error": f"File '{filename}' not found"}, 
                        status=404
                    )
                
                notes_file_path.unlink()
                
                return web.json_response({
                    "success": True,
                    "message": f"File '{filename}' deleted successfully"
                })
            except Exception as e:
                return web.json_response(
                    {"success": False, "error": f"Failed to delete note: {str(e)}"}, 
                    status=500
                )

        @routes.get('/sage_utils/civitai_images')
        async def get_civitai_images(request):
            """
            Proxy endpoint to fetch Civitai images for a model hash, avoiding CORS issues.
            Includes basic rate limiting to avoid overwhelming Civitai API.
            """
            try:
                import aiohttp
                import asyncio
                import time
                
                hash_param = request.query.get('hash')
                if not hash_param:
                    return web.json_response(
                        {"success": False, "error": "Hash parameter required"}, 
                        status=400
                    )
                
                # Basic rate limiting - don't make requests more than once every 2 seconds
                if not hasattr(get_civitai_images, 'last_request_time'):
                    get_civitai_images.last_request_time = 0
                
                current_time = time.time()
                if current_time - get_civitai_images.last_request_time < 2.0:
                    await asyncio.sleep(2.0 - (current_time - get_civitai_images.last_request_time))
                
                get_civitai_images.last_request_time = time.time()
                
                # Use aiohttp to make the request to Civitai
                headers = {
                    'User-Agent': 'SageUtils/1.0 ComfyUI Extension'
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
                return web.json_response(
                    {"success": False, "error": f"Failed to process request: {str(e)}"}, 
                    status=500
                )

        print("SageUtils custom routes loaded successfully!")
    else:
        print("Warning: PromptServer instance not available, skipping route registration")

except ImportError as e:
    print(f"Warning: Could not import required modules for SageUtils routes: {e}")
except Exception as e:
    print(f"Warning: Error setting up SageUtils routes: {e}")

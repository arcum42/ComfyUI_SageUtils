"""
Custom routes for SageUtils to expose cache data and settings via HTTP endpoints.
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
    
    record_initialization_milestone("SERVER_IMPORTS_COMPLETE", server_timer)

    # Check if PromptServer instance is available
    if hasattr(PromptServer, 'instance') and PromptServer.instance is not None:
        # Get the PromptServer instance
        routes = PromptServer.instance.routes
        record_initialization_milestone("PROMPT_SERVER_READY", server_timer)

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

        @routes.get('/sage_cache/scan_model_folders')
        async def scan_model_folders(request):
            """
            Scans ComfyUI model folders for files and returns filesystem information.
            Accepts optional folder_type filter in JSON body.
            """
            try:
                import os
                import json
                from pathlib import Path
                import folder_paths
                
                # Parse query parameters for folder type filter
                folder_type_filter = request.query.get('folderType', 'all')
                
                # Define model file extensions
                MODEL_FILE_EXTENSIONS = {
                    '.ckpt', '.pt', '.pt2', '.bin', '.pth', '.safetensors', '.pkl', '.sft', '.gguf', '.nf4'
                }
                
                def has_model_extension(filename):
                    return any(filename.lower().endswith(ext) for ext in MODEL_FILE_EXTENSIONS)
                
                def get_folder_type_from_path(file_path):
                    """Determine folder type based on file path"""
                    path_parts = Path(file_path).parts
                    
                    # Look for ComfyUI model folder names in the path
                    for part in reversed(path_parts):
                        part_lower = part.lower()
                        if 'checkpoint' in part_lower:
                            return 'checkpoints'
                        elif 'lora' in part_lower:
                            return 'loras'  
                        elif part_lower in ['vae', 'vae_approx']:
                            return 'vae'
                        elif 'text_encoder' in part_lower or part_lower in ['clip', 't5']:
                            return 'text_encoders'
                        elif 'diffusion' in part_lower or part_lower in ['unet']:
                            return 'diffusion_models'
                    
                    return 'unknown'
                
                scanned_files = []
                
                # Get ComfyUI folder mappings
                folder_mappings = {
                    'checkpoints': ['checkpoints'],
                    'loras': ['loras'],
                    'vae': ['vae', 'vae_approx'],
                    'text_encoders': ['text_encoders', 'clip', 't5'],
                    'diffusion_models': ['diffusion_models', 'unet']
                }
                
                # Scan specified folder types or all if 'all'
                folders_to_scan = []
                if folder_type_filter == 'all':
                    for folder_keys in folder_mappings.values():
                        folders_to_scan.extend(folder_keys)
                else:
                    folders_to_scan = folder_mappings.get(folder_type_filter, [])
                
                for folder_key in folders_to_scan:
                    try:
                        # Get folder paths using ComfyUI's folder_paths
                        if hasattr(folder_paths, 'get_folder_paths'):
                            folder_list = folder_paths.get_folder_paths(folder_key)
                        else:
                            # Fallback method
                            folder_list = getattr(folder_paths, f'folder_names_and_paths', {}).get(folder_key, [[]])[0]
                        
                        if not folder_list:
                            continue
                            
                        for folder_path in folder_list:
                            if not os.path.exists(folder_path):
                                continue
                                
                            # Recursively scan folder for model files
                            for root, dirs, files in os.walk(folder_path):
                                for file in files:
                                    if has_model_extension(file):
                                        full_path = os.path.join(root, file)
                                        relative_path = os.path.relpath(full_path, folder_path)
                                        folder_type = get_folder_type_from_path(full_path)
                                        
                                        # Skip if filtering by folder type and doesn't match
                                        if folder_type_filter != 'all' and folder_type != folder_type_filter:
                                            continue
                                            
                                        file_info = {
                                            'fileName': file,
                                            'fullPath': full_path,
                                            'relativePath': relative_path,
                                            'folderType': folder_type,
                                            'folderKey': folder_key,
                                            'size': os.path.getsize(full_path) if os.path.exists(full_path) else 0
                                        }
                                        scanned_files.append(file_info)
                                        
                    except Exception as folder_error:
                        print(f"Error scanning folder '{folder_key}': {str(folder_error)}")
                        continue
                
                return web.json_response({
                    'success': True,
                    'files': scanned_files,
                    'folder_type': folder_type_filter,
                    'total_files': len(scanned_files)
                })
                
            except Exception as e:
                import traceback
                error_details = traceback.format_exc()
                print(f"SageUtils scan model folders error: {error_details}")
                return web.json_response(
                    {"success": False, "error": f"Failed to scan model folders: {str(e)}"}, 
                    status=500
                )

        @routes.get('/sage_cache/available_folders')
        async def get_available_model_folders(request):
            """
            Returns a list of available model folders with file counts.
            Used by the scan dialog to show folder selection options.
            """
            try:
                import os
                import folder_paths
                from pathlib import Path
                
                # Define model file extensions
                MODEL_FILE_EXTENSIONS = {
                    '.ckpt', '.pt', '.pt2', '.bin', '.pth', '.safetensors', '.pkl', '.sft', '.gguf', '.nf4'
                }
                
                def has_model_extension(filename):
                    return any(filename.lower().endswith(ext) for ext in MODEL_FILE_EXTENSIONS)
                
                def count_model_files(folder_path):
                    """Count model files in a folder recursively"""
                    count = 0
                    try:
                        for root, dirs, files in os.walk(folder_path):
                            for file in files:
                                if has_model_extension(file):
                                    count += 1
                    except Exception:
                        pass
                    return count
                
                folders_info = []
                
                # Get ComfyUI folder mappings
                folder_mappings = {
                    'checkpoints': ['checkpoints'],
                    'loras': ['loras'],
                    'vae': ['vae', 'vae_approx'],
                    'text_encoders': ['text_encoders', 'clip', 't5'],
                    'diffusion_models': ['diffusion_models', 'unet']
                }
                
                # Group folders by category to avoid duplicates
                category_data = {}
                
                for category, folder_keys in folder_mappings.items():
                    category_paths = []
                    total_count = 0
                    
                    for folder_key in folder_keys:
                        try:
                            # Get folder paths using ComfyUI's folder_paths
                            if hasattr(folder_paths, 'get_folder_paths'):
                                folder_list = folder_paths.get_folder_paths(folder_key)
                            else:
                                # Fallback method
                                folder_list = getattr(folder_paths, f'folder_names_and_paths', {}).get(folder_key, [[]])[0]
                            
                            if not folder_list:
                                continue
                                
                            for folder_path in folder_list:
                                if not os.path.exists(folder_path):
                                    continue
                                    
                                file_count = count_model_files(folder_path)
                                if file_count > 0:  # Only include folders with model files
                                    category_paths.append(folder_path)
                                    total_count += file_count
                                        
                        except Exception as folder_error:
                            print(f"Error processing folder '{folder_key}': {str(folder_error)}")
                            continue
                    
                    # Add category entry if it has any valid paths
                    if category_paths and total_count > 0:
                        category_data[category] = {
                            'name': category,
                            'paths': category_paths,
                            'count': total_count
                        }
                
                # Convert to final format for frontend
                for category, data in category_data.items():
                    folders_info.append({
                        'name': data['name'],
                        'paths': data['paths'],  # Array of all paths for this category
                        'count': data['count']
                    })
                
                return web.json_response({
                    'success': True,
                    'folders': folders_info,
                    'total_folders': len(folders_info)
                })
                
            except Exception as e:
                import traceback
                error_details = traceback.format_exc()
                print(f"SageUtils get available folders error: {error_details}")
                return web.json_response(
                    {"success": False, "error": f"Failed to get available folders: {str(e)}"}, 
                    status=500
                )

        # Global scan progress storage
        scan_progress_store = {
            'active': False,
            'current': 0,
            'total': 0,
            'status': 'idle',
            'error': None,
            'current_file': '',
            'start_time': None
        }

        @routes.get('/sage_cache/scan_progress')
        async def get_scan_progress(request):
            """
            Returns the current progress of any active model scan.
            """
            try:
                import time
                progress = scan_progress_store.copy()
                
                # Calculate elapsed time if scan is active
                if progress['active'] and progress['start_time']:
                    progress['elapsed_time'] = time.time() - progress['start_time']
                else:
                    progress['elapsed_time'] = 0
                
                return web.json_response({
                    'success': True,
                    'progress': progress
                })
                
            except Exception as e:
                import traceback
                error_details = traceback.format_exc()
                print(f"SageUtils scan progress error: {error_details}")
                return web.json_response(
                    {"success": False, "error": f"Failed to get scan progress: {str(e)}"}, 
                    status=500
                )

        @routes.post('/sage_cache/scan_model_folders')
        async def perform_model_scan(request):
            """
            Starts actual model scanning and metadata pulling in the background.
            Expects JSON body with optional 'folders', 'force', and 'include_cached' fields.
            Uses progress tracking for real-time updates.
            """
            try:
                import folder_paths
                import os
                import time
                import asyncio
                
                # Check if a scan is already in progress
                if scan_progress_store['active']:
                    return web.json_response({
                        "success": False,
                        "error": "A scan is already in progress"
                    }, status=409)
                
                # Parse request body
                data = await request.json()
                folders = data.get('folders', [])
                force = data.get('force', False)
                include_cached = data.get('include_cached', True)
                
                # Initialize progress tracking
                scan_progress_store.update({
                    'active': True,
                    'current': 0,
                    'total': 0,
                    'status': 'initializing',
                    'error': None,
                    'current_file': '',
                    'start_time': time.time()
                })
                
                # Start background scan task
                asyncio.create_task(background_scan_task(folders, force, include_cached))
                
                # Return immediately while scan runs in background
                return web.json_response({
                    "success": True,
                    "message": "Scan started successfully",
                    "status": "Scan is running in the background. Use /sage_cache/scan_progress to monitor progress."
                })
                
            except Exception as e:
                scan_progress_store.update({
                    'active': False,
                    'status': 'error',
                    'error': str(e)
                })
                
                import traceback
                error_details = traceback.format_exc()
                print(f"SageUtils perform model scan error: {error_details}")
                return web.json_response(
                    {"success": False, "error": f"Failed to perform model scan: {str(e)}"}, 
                    status=500
                )

        async def background_scan_task(folders, force, include_cached):
            """Background task that performs the actual scanning with progress updates"""
            try:
                import folder_paths
                import os
                import asyncio
                
                # If no specific folders provided, get all model folders
                if not folders:
                    scan_progress_store['status'] = 'discovering_folders'
                    folder_mappings = {
                        'checkpoints': ['checkpoints'],
                        'loras': ['loras'],
                        'vae': ['vae', 'vae_approx'],
                        'text_encoders': ['text_encoders', 'clip', 't5'],
                        'diffusion_models': ['diffusion_models', 'unet']
                    }
                    
                    folders = []
                    for folder_keys in folder_mappings.values():
                        for folder_key in folder_keys:
                            try:
                                if hasattr(folder_paths, 'get_folder_paths'):
                                    folder_list = folder_paths.get_folder_paths(folder_key)
                                else:
                                    folder_list = getattr(folder_paths, f'folder_names_and_paths', {}).get(folder_key, [[]])[0]
                                
                                for folder_path in folder_list:
                                    if os.path.exists(folder_path):
                                        folders.append(folder_path)
                            except Exception:
                                continue
                
                # Remove duplicates and filter existing paths
                folders = list(set(folder for folder in folders if os.path.exists(folder)))
                
                if not folders:
                    scan_progress_store.update({
                        'active': False,
                        'status': 'error',
                        'error': 'No valid model folders found to scan'
                    })
                    return
                
                # Start manual scanning with progress tracking
                scan_progress_store['status'] = 'scanning_files'
                
                from .utils.helpers import pull_metadata
                import pathlib
                from .utils.constants import MODEL_FILE_EXTENSIONS
                
                # First pass: count all model files
                model_list = []
                for dir_path in folders:
                    scan_progress_store['current_file'] = f"Scanning {os.path.basename(dir_path)}..."
                    result = list(p.resolve() for p in pathlib.Path(dir_path).glob("**/*") if p.suffix in MODEL_FILE_EXTENSIONS)
                    model_list.extend(result)
                    # Allow other async tasks to run
                    await asyncio.sleep(0.01)

                model_list = list(set(model_list))
                model_list = [str(x) for x in model_list]
                scan_progress_store['total'] = len(model_list)
                scan_progress_store['status'] = 'processing_metadata'
                
                print(f"Found {len(model_list)} models to process")
                
                # Process files with progress updates
                processed_count = 0
                for file_path in model_list:
                    if not scan_progress_store['active']:  # Check if cancelled
                        print(f"Scan cancelled, stopping at {processed_count}/{len(model_list)} files")
                        break
                        
                    file_name = os.path.basename(file_path)
                    scan_progress_store['current_file'] = file_name
                    scan_progress_store['current'] = processed_count
                    
                    # Debug progress update
                    if processed_count % 10 == 0:  # Log every 10 files
                        print(f"Progress: {processed_count}/{len(model_list)} files processed ({(processed_count/len(model_list)*100):.1f}%)")
                    
                    try:
                        # Process single file without updating timestamp
                        pull_metadata(file_path, timestamp=False, force_all=force)
                        processed_count += 1
                    except Exception as file_error:
                        print(f"Error processing {file_path}: {file_error}")
                        # Continue with other files
                        processed_count += 1
                    
                    # Allow other async tasks to run (important for progress updates)
                    await asyncio.sleep(0.01)
                
                # Mark scan as complete
                scan_progress_store.update({
                    'active': False,
                    'current': processed_count,
                    'status': 'completed',
                    'current_file': 'Scan completed'
                })
                
                print(f"Background scan completed: {processed_count} files processed")
                
            except Exception as scan_error:
                scan_progress_store.update({
                    'active': False,
                    'status': 'error',
                    'error': str(scan_error)
                })
                
                import traceback
                error_details = traceback.format_exc()
                print(f"Background scan execution error: {error_details}")

        @routes.post('/sage_cache/cancel_scan')
        async def cancel_model_scan(request):
            """
            Cancels any active model scan.
            """
            try:
                if scan_progress_store['active']:
                    scan_progress_store.update({
                        'active': False,
                        'status': 'cancelled',
                        'current_file': 'Scan cancelled by user'
                    })
                    
                    return web.json_response({
                        "success": True,
                        "message": "Scan cancelled successfully"
                    })
                else:
                    return web.json_response({
                        "success": False,
                        "message": "No active scan to cancel"
                    })
                    
            except Exception as e:
                import traceback
                error_details = traceback.format_exc()
                print(f"SageUtils cancel scan error: {error_details}")
                return web.json_response(
                    {"success": False, "error": f"Failed to cancel scan: {str(e)}"}, 
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

        @routes.post('/sage_utils/browse_directory_tree')
        async def browse_directory_tree(request):
            """
            Browse directory tree for folder selection.
            Body: { "path": "/current/path", "depth": 2 }
            Returns: { "success": true, "current_path": "/path", "directories": [...] }
            """
            try:
                import pathlib
                import os
                import platform
                
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
                
            except Exception as e:
                return web.json_response(
                    {"success": False, "error": f"Failed to browse directory tree: {str(e)}"}, 
                    status=500
                )

        @routes.post('/sage_utils/copy_image')
        async def copy_image_to_clipboard(request):
            """
            Copy full-resolution image to system clipboard.
            Body: { "image_path": "/path/to/image.jpg" }
            """
            try:
                import pathlib
                import subprocess
                import platform
                import tempfile
                import os
                from PIL import Image
                
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
                
            except Exception as e:
                return web.json_response(
                    {"success": False, "error": f"Failed to copy image: {str(e)}"}, 
                    status=500
                )

        @routes.post('/sage_utils/image')
        async def get_full_image(request):
            """
            Serve full resolution image.
            Body: { "image_path": "/full/path/to/image" }
            """
            try:
                import pathlib
                import os
                
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
            
            except Exception as e:
                return web.Response(text=f"Failed to serve image: {str(e)}", status=500)

        @routes.post('/sage_utils/timing_data')
        async def receive_timing_data(request):
            """
            Receive timing data from JavaScript side for analysis and reporting.
            """
            try:
                data = await request.json()
                source = data.get('source', 'unknown')
                timing_data = data.get('data', {})
                
                # Log the timing data
                print(f"\\n=== Timing Data from {source.upper()} ===")
                if 'initializationTimes' in timing_data:
                    print("Initialization Times:")
                    for milestone, time_ms in timing_data['initializationTimes'].items():
                        if milestone != '__complete__':
                            print(f"  {milestone}: {time_ms:.4f}ms")
                    
                    if '__complete__' in timing_data['initializationTimes']:
                        total = timing_data['initializationTimes']['__complete__']
                        print(f"  TOTAL: {total:.4f}ms")
                
                if 'runtimeStats' in timing_data:
                    print("Runtime Statistics:")
                    for operation, stats in timing_data['runtimeStats'].items():
                        if stats:
                            print(f"  {operation}: {stats.get('count', 0)} calls, "
                                f"{stats.get('total', 0):.4f}ms total, "
                                f"{stats.get('average', 0):.4f}ms avg")
                
                # Store timing data for potential analysis
                if not hasattr(receive_timing_data, 'timing_store'):
                    receive_timing_data.timing_store = []
                
                receive_timing_data.timing_store.append({
                    'timestamp': data.get('timestamp'),
                    'source': source,
                    'data': timing_data
                })
                
                # Keep only the last 10 entries to avoid memory issues
                if len(receive_timing_data.timing_store) > 10:
                    receive_timing_data.timing_store = receive_timing_data.timing_store[-10:]
                
                return web.json_response({
                    "success": True,
                    "message": f"Timing data received from {source}"
                })
                
            except Exception as e:
                return web.json_response(
                    {"success": False, "error": f"Failed to process timing data: {str(e)}"}, 
                    status=500
                )

        @routes.get('/sage_utils/timing_report')
        async def get_timing_report(request):
            """
            Get a combined timing report from both Python and JavaScript sides.
            """
            try:
                from .utils.performance_timer import python_timer, server_timer
                
                report = {
                    "python_timing": python_timer.export_to_dict(),
                    "server_timing": server_timer.export_to_dict(),
                    "javascript_timing": None
                }
                
                # Include recent JavaScript timing data if available
                if hasattr(receive_timing_data, 'timing_store') and receive_timing_data.timing_store:
                    # Get the most recent JavaScript timing data
                    js_data = None
                    for entry in reversed(receive_timing_data.timing_store):
                        if entry['source'] == 'javascript':
                            js_data = entry['data']
                            break
                    report["javascript_timing"] = js_data
                
                return web.json_response({
                    "success": True,
                    "timing_report": report
                })
                
            except Exception as e:
                return web.json_response(
                    {"success": False, "error": f"Failed to generate timing report: {str(e)}"}, 
                    status=500
                )

        @routes.get('/sage_utils/wildcard_path')
        async def get_wildcard_path(request):
            """
            Gets the wildcard directory path.
            Returns: { "success": true, "path": "/path/to/wildcards" }
            """
            try:
                from .utils import sage_wildcard_path
                return web.json_response({
                    "success": True,
                    "path": str(sage_wildcard_path)
                })
            except Exception as e:
                return web.json_response(
                    {"success": False, "error": f"Failed to get wildcard path: {str(e)}"}, 
                    status=500
                )

        @routes.get('/sage_utils/wildcard_files')
        async def list_wildcard_files(request):
            """
            Lists all wildcard files in the wildcard directory with folder support.
            Query params: path (optional) - subdirectory path
            Returns: { "success": true, "files": [{"name": "file.txt", "path": "/full/path", "type": "file|directory"}] }
            """
            try:
                from .utils import sage_wildcard_path
                import pathlib
                
                # Get the requested path from query parameters
                requested_path = request.query.get('path', '')
                
                wildcard_path = pathlib.Path(sage_wildcard_path)
                
                # Construct the target directory
                if requested_path:
                    target_path = wildcard_path / requested_path
                    # Security check: ensure the path is within the wildcard directory
                    if not str(target_path.resolve()).startswith(str(wildcard_path.resolve())):
                        return web.json_response(
                            {"success": False, "error": "Invalid path"}, 
                            status=400
                        )
                else:
                    target_path = wildcard_path
                
                if not target_path.exists():
                    return web.json_response({
                        "success": True,
                        "files": [],
                        "message": "Directory does not exist"
                    })
                
                files = []
                
                # List directories and files in the current directory
                for item in target_path.iterdir():
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
                return web.json_response(
                    {"success": False, "error": f"Failed to list wildcard files: {str(e)}"}, 
                    status=500
                )

        @routes.post('/sage_utils/generate_wildcard')
        async def generate_wildcard_prompt(request):
            """
            Generates a prompt using the wildcard system.
            Body: { "prompt": "text with __wildcards__", "seed": 0 }
            Returns: { "success": true, "result": "generated text" }
            """
            try:
                from .utils import sage_wildcard_path
                from dynamicprompts.generators import RandomPromptGenerator
                from dynamicprompts.wildcards.wildcard_manager import WildcardManager
                
                data = await request.json()
                prompt = data.get('prompt', '')
                seed = data.get('seed', 0)
                
                if not prompt:
                    return web.json_response(
                        {"success": False, "error": "Prompt is required"}, 
                        status=400
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
                
                return web.json_response({
                    "success": True,
                    "result": result,
                    "original_prompt": prompt,
                    "seed": seed
                })
                
            except Exception as e:
                return web.json_response(
                    {"success": False, "error": f"Failed to generate wildcard prompt: {str(e)}"}, 
                    status=500
                )

        @routes.get('/sage_utils/wildcard_file/{filename:.*}')
        async def get_wildcard_file_content(request):
            """
            Gets the content of a specific wildcard file.
            Returns: { "success": true, "content": "file content", "filename": "file.txt" }
            """
            try:
                from .utils import sage_wildcard_path
                import pathlib
                
                filename = request.match_info.get('filename', '')
                if not filename:
                    return web.json_response(
                        {"success": False, "error": "Filename is required"}, 
                        status=400
                    )
                
                # Construct safe path within wildcard directory
                wildcard_path = pathlib.Path(sage_wildcard_path)
                file_path = (wildcard_path / filename).resolve()
                
                # Security check: ensure file is within wildcard directory
                if not str(file_path).startswith(str(wildcard_path.resolve())):
                    return web.json_response(
                        {"success": False, "error": "Access denied: file outside wildcard directory"}, 
                        status=403
                    )
                
                if not file_path.exists() or not file_path.is_file():
                    return web.json_response(
                        {"success": False, "error": f"File not found: {filename}"}, 
                        status=404
                    )
                
                # Read file content
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                return web.json_response({
                    "success": True,
                    "content": content,
                    "filename": filename,
                    "size": len(content)
                })
                
            except Exception as e:
                return web.json_response(
                    {"success": False, "error": f"Failed to read wildcard file: {str(e)}"}, 
                    status=500
                )

        @routes.post('/sage_utils/wildcard/file/save')
        async def save_wildcard_file(request):
            """
            Saves content to a wildcard file.
            Body: { "filename": "path/to/file.txt", "content": "file content" }
            Returns: { "success": true, "message": "File saved successfully" }
            """
            try:
                from .utils import sage_wildcard_path
                import pathlib
                
                # Parse request body
                data = await request.json()
                filename = data.get('filename', '')
                content = data.get('content', '')
                
                if not filename:
                    return web.json_response(
                        {"success": False, "error": "Filename is required"}, 
                        status=400
                    )
                
                # Construct safe path within wildcard directory
                wildcard_path = pathlib.Path(sage_wildcard_path)
                file_path = (wildcard_path / filename).resolve()
                
                # Security check: ensure file is within wildcard directory
                if not str(file_path).startswith(str(wildcard_path.resolve())):
                    return web.json_response(
                        {"success": False, "error": "Access denied: file outside wildcard directory"}, 
                        status=403
                    )
                
                # Ensure parent directory exists
                file_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Write file content
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                return web.json_response({
                    "success": True,
                    "message": f"File '{filename}' saved successfully",
                    "filename": filename,
                    "size": len(content)
                })
                
            except Exception as e:
                return web.json_response(
                    {"success": False, "error": f"Failed to save wildcard file: {str(e)}"}, 
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

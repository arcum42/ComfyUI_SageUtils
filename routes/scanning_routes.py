"""
SageUtils Scanning Routes
========================

Handles model folder scanning and metadata operations including:
- scan_model_folders (GET/POST): Folder discovery and model scanning
- scan_progress: Real-time progress tracking
- cancel_scan: Scan cancellation
- available_folders: Available model folder discovery

Contains global scan progress store for real-time tracking.
"""

try:
    from aiohttp import web
    import os
    import time
    import asyncio
    import pathlib
    import logging
    
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

    # Route list for documentation and registration tracking
    _route_list = []

    def register_routes(routes_instance):
        """
        Register scanning-related routes.
        
        Args:
            routes_instance: The PromptServer routes instance
            
        Returns:
            int: Number of routes registered
        """
        global _route_list
        _route_list.clear()
        
        @routes_instance.get('/sage_cache/scan_model_folders')
        async def get_available_folders(request):
            """
            Returns information about available model folders that can be scanned.
            Groups folders by category (checkpoints, loras, vae, etc.) with file counts.
            """
            try:
                # Dynamic import to avoid ComfyUI dependency issues
                import folder_paths
                
                def has_model_extension(filename):
                    """Check if file has a model extension"""
                    from ..utils.constants import MODEL_FILE_EXTENSIONS
                    return any(filename.lower().endswith(ext) for ext in MODEL_FILE_EXTENSIONS)
                
                def count_model_files(folder_path):
                    """Count model files in a folder"""
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
                            logging.error(f"Error processing folder '{folder_key}': {str(folder_error)}")
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
                logging.error(f"SageUtils get available folders error: {error_details}")
                return web.json_response(
                    {"success": False, "error": f"Failed to get available folders: {str(e)}"}, 
                    status=500
                )
        
        @routes_instance.get('/sage_cache/scan_progress')
        async def get_scan_progress(request):
            """
            Returns the current progress of any active model scan.
            """
            try:
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
                logging.error(f"SageUtils scan progress error: {error_details}")
                return web.json_response(
                    {"success": False, "error": f"Failed to get scan progress: {str(e)}"}, 
                    status=500
                )
        
        @routes_instance.post('/sage_cache/scan_model_folders')
        async def perform_model_scan(request):
            """
            Starts actual model scanning and metadata pulling in the background.
            Expects JSON body with optional 'folders', 'force', and 'include_cached' fields.
            Uses progress tracking for real-time updates.
            """
            try:
                # Dynamic import to avoid ComfyUI dependency issues
                import folder_paths
                
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
                logging.error(f"SageUtils perform model scan error: {error_details}")
                return web.json_response(
                    {"success": False, "error": f"Failed to perform model scan: {str(e)}"}, 
                    status=500
                )

        @routes_instance.post('/sage_cache/cancel_scan')
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
                logging.error(f"SageUtils cancel scan error: {error_details}")
                return web.json_response(
                    {"success": False, "error": f"Failed to cancel scan: {str(e)}"}, 
                    status=500
                )
        
        # Add routes to tracking list
        _route_list.extend([
            {'method': 'GET', 'path': '/sage_cache/scan_model_folders', 'handler': 'get_available_folders'},
            {'method': 'GET', 'path': '/sage_cache/scan_progress', 'handler': 'get_scan_progress'},
            {'method': 'POST', 'path': '/sage_cache/scan_model_folders', 'handler': 'perform_model_scan'},
            {'method': 'POST', 'path': '/sage_cache/cancel_scan', 'handler': 'cancel_model_scan'}
        ])
        
        return len(_route_list)

    # Configuration constant for checkpoint interval
    SCAN_CHECKPOINT_INTERVAL = 100  # Save every N files during scan

    async def background_scan_task(folders, force, include_cached):
        """Background task that performs the actual scanning with progress updates"""
        try:
            # Dynamic import to avoid ComfyUI dependency issues
            import folder_paths
            
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
            
            # Dynamic import of helpers, constants, and cache
            from ..utils.helpers import pull_metadata
            from ..utils.constants import MODEL_FILE_EXTENSIONS
            from ..utils.model_cache import cache
            
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
            
            logging.info(f"Found {len(model_list)} models to process")
            
            # Enable batch mode for reduced I/O during bulk operations
            cache.begin_batch()
            
            try:
                # Process files with progress updates and checkpoint saves
                processed_count = 0
                for file_path in model_list:
                    if not scan_progress_store['active']:  # Check if cancelled
                        logging.info(f"Scan cancelled, stopping at {processed_count}/{len(model_list)} files")
                        break
                        
                    file_name = os.path.basename(file_path)
                    scan_progress_store['current_file'] = file_name
                    scan_progress_store['current'] = processed_count
                    
                    # Debug progress update
                    if processed_count % 10 == 0:  # Log every 10 files
                        logging.debug(f"Progress: {processed_count}/{len(model_list)} files processed ({(processed_count/len(model_list)*100):.1f}%)")
                    
                    try:
                        # Process single file without updating timestamp
                        pull_metadata(file_path, timestamp=False, force_all=force)
                        processed_count += 1
                    except Exception as file_error:
                        logging.error(f"Error processing {file_path}: {file_error}")
                        # Continue with other files
                        processed_count += 1
                    
                    # Checkpoint save: Save every N files to prevent data loss
                    if processed_count % SCAN_CHECKPOINT_INTERVAL == 0:
                        cache.end_batch(force_save=True)
                        scan_progress_store['current_file'] = f"Checkpoint save ({processed_count} files)..."
                        logging.info(f"Checkpoint save at {processed_count}/{len(model_list)} files")
                        cache.begin_batch()
                    
                    # Allow other async tasks to run (important for progress updates)
                    await asyncio.sleep(0.01)
                
            finally:
                # Always end batch mode and perform final save, even on cancellation or error
                cache.end_batch(force_save=True)
                logging.info(f"Final batch save completed")
            
            # Mark scan as complete
            scan_progress_store.update({
                'active': False,
                'current': processed_count,
                'status': 'completed',
                'current_file': 'Scan completed'
            })
            
            logging.info(f"Background scan completed: {processed_count} files processed")
            
        except Exception as scan_error:
            scan_progress_store.update({
                'active': False,
                'status': 'error',
                'error': str(scan_error)
            })
            
            import traceback
            error_details = traceback.format_exc()
            logging.error(f"Background scan execution error: {error_details}")

    def get_route_list():
        """Get list of registered routes for this module."""
        return _route_list.copy()

except ImportError as e:
    import logging
    logging.error(f"SageUtils scanning routes import error: {e}")
    
    # Route list for documentation and registration tracking
    _route_list = []

    def register_routes(routes_instance):
        """Fallback when aiohttp is not available"""
        return 0
    
    def get_route_list():
        """Get list of registered routes for this module."""
        return _route_list.copy()

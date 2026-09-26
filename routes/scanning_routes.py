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
    from ..utils.logger import get_logger
    import os
    import time
    import asyncio
    import pathlib
    import json
    
    logger = get_logger('routes.scanning')
    from ..utils.path_manager import file_manager, path_manager

    SCAN_HISTORY_LIMIT = 20
    scan_history_path = path_manager.get_user_file_path('sage_scan_history.json')
    
    # Global scan progress storage
    scan_progress_store = {
        'active': False,
        'cancel_requested': False,
        'current': 0,
        'total': 0,
        'discovered': 0,
        'skipped': 0,
        'processed': 0,
        'errors': 0,
        'matched': 0,
        'unmatched': 0,
        'temporary_errors': 0,
        'error_details': [],
        'status': 'idle',
        'error': None,
        'current_file': '',
        'current_file_progress': 0,
        'start_time': None,
        'scan_options': {},
    }

    def load_scan_history():
        """Load bounded scan history without touching model cache files."""
        data = file_manager.load_json_file(scan_history_path, 'scan history')
        return data if isinstance(data, list) else []

    def save_scan_history(history):
        file_manager.atomic_write_json(scan_history_path, history[-SCAN_HISTORY_LIMIT:])

    def persist_scan_summary(status, error=None):
        summary = {
            'started_at': scan_progress_store.get('start_time'),
            'finished_at': time.time(),
            'status': status,
            'error': error,
            'options': scan_progress_store.get('scan_options', {}),
            'discovered': scan_progress_store.get('discovered', 0),
            'skipped': scan_progress_store.get('skipped', 0),
            'processed': scan_progress_store.get('processed', 0),
            'errors': scan_progress_store.get('errors', 0),
            'matched': scan_progress_store.get('matched', 0),
            'unmatched': scan_progress_store.get('unmatched', 0),
            'temporary_errors': scan_progress_store.get('temporary_errors', 0),
            'error_details': list(scan_progress_store.get('error_details', [])),
        }
        history = load_scan_history()
        history.append(summary)
        save_scan_history(history)
        return summary

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
                
                folder_mappings = get_scan_folder_groups(folder_paths)
                
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
                            logger.error(f"Error processing folder '{folder_key}': {str(folder_error)}")
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
                logger.error(f"SageUtils get available folders error: {error_details}")
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
                logger.error(f"SageUtils scan progress error: {error_details}")
                return web.json_response(
                    {"success": False, "error": f"Failed to get scan progress: {str(e)}"}, 
                    status=500
                )

        @routes_instance.get('/sage_cache/scan_history')
        async def get_scan_history(request):
            """Return recent durable scan summaries."""
            try:
                return web.json_response({
                    'success': True,
                    'history': load_scan_history(),
                })
            except Exception as e:
                logger.error(f"SageUtils scan history error: {e}")
                return web.json_response(
                    {'success': False, 'error': f'Failed to load scan history: {str(e)}'},
                    status=500,
                )

        @routes_instance.post('/sage_cache/scan_preview')
        async def preview_model_scan(request):
            """Estimate scan work without hashing files or changing cache data."""
            try:
                import folder_paths
                from ..utils.model_cache import cache

                data = await request.json()
                cache.load()
                inventory = build_model_inventory(folder_paths, cache)
                categories = set(data.get('categories', []))
                scan_mode = data.get('scan_mode', 'all')
                force = bool(data.get('force', False))
                include_cached = bool(data.get('include_cached', True))
                if categories:
                    inventory = [
                        item for item in inventory
                        if categories.intersection(item['registered_types'])
                    ]
                selected_paths, _, changed_paths = prepare_scan_paths(
                    [item['path'] for item in inventory if not item['stale']],
                    cache,
                    force,
                    include_cached,
                    scan_mode,
                )
                selected_set = set(selected_paths)
                inventory = [item for item in inventory if item['path'] in selected_set]
                new_files = [item for item in inventory if not item['hash']]
                changed_files = [item for item in inventory if item['path'] in changed_paths]
                hash_work = len(new_files) + len(changed_files)
                return web.json_response({
                    'success': True,
                    'preview': {
                        'selected_files': len(inventory),
                        'new_files': len(new_files),
                        'changed_files': len(changed_files),
                        'cached_files': len(inventory) - len(new_files),
                        'full_hashes': hash_work,
                        'bulk_requests': (hash_work + 99) // 100,
                        'estimated_hash_bytes': sum(item.get('size') or 0 for item in new_files + changed_files),
                    },
                })
            except Exception as e:
                logger.error(f"SageUtils scan preview error: {e}")
                return web.json_response({'success': False, 'error': str(e)}, status=500)

        @routes_instance.get('/sage_cache/reconcile')
        async def reconcile_cache(request):
            """Classify cached paths without changing cache records."""
            try:
                from ..utils.model_cache import cache

                result = reconcile_cached_paths(cache)
                return web.json_response({
                    'success': True,
                    'statuses': result,
                    'counts': {key: len(value) for key, value in result.items()},
                })
            except Exception as e:
                logger.error(f"SageUtils cache reconciliation error: {e}")
                return web.json_response(
                    {"success": False, "error": f"Failed to reconcile cache: {str(e)}"},
                    status=500
                )

        @routes_instance.get('/sage_cache/inventory')
        async def get_model_inventory(request):
            """Return live registered model files joined with cached metadata."""
            try:
                import folder_paths
                from ..utils.model_cache import cache

                cache.load()
                inventory = build_model_inventory(folder_paths, cache)
                category_counts = {}
                for item in inventory:
                    for category in item['registered_types']:
                        category_counts[category] = category_counts.get(category, 0) + 1
                return web.json_response({
                    'success': True,
                    'models': inventory,
                    'counts': {
                        'installed': sum(item['filesystem_status'] == 'present' for item in inventory),
                        'changed': sum(item['filesystem_status'] == 'changed' for item in inventory),
                        'missing': sum(item['filesystem_status'] == 'missing' for item in inventory),
                        'unreadable': sum(item['filesystem_status'] == 'unreadable' for item in inventory),
                        'unknown': sum(item['filesystem_status'] == 'unknown' for item in inventory),
                        'stale': sum(item['stale'] for item in inventory),
                        'categories': category_counts,
                    },
                })
            except Exception as e:
                logger.error(f"SageUtils model inventory error: {e}")
                return web.json_response(
                    {"success": False, "error": f"Failed to build model inventory: {str(e)}"},
                    status=500
                )

        @routes_instance.post('/sage_cache/cleanup_missing')
        async def cleanup_missing_cache_paths(request):
            """Remove explicitly selected missing paths, preserving metadata records."""
            try:
                from ..utils.model_cache import cache

                data = await request.json()
                paths = data.get('paths', [])
                if not isinstance(paths, list) or not all(isinstance(path, str) for path in paths):
                    return web.json_response({'success': False, 'error': 'paths must be a list of strings'}, status=400)
                if not data.get('confirm', False):
                    return web.json_response({'success': False, 'error': 'Cleanup requires explicit confirmation'}, status=400)

                cache.load()
                removed = remove_missing_cache_paths(cache, paths)
                cache.save()
                return web.json_response({
                    'success': True,
                    'removed': removed,
                    'metadata_preserved': True,
                })
            except Exception as e:
                logger.error(f"SageUtils cache cleanup error: {e}")
                return web.json_response(
                    {"success": False, "error": f"Failed to clean cache: {str(e)}"},
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
                categories = data.get('categories', [])
                force = data.get('force', False)
                include_cached = data.get('include_cached', True)
                scan_mode = data.get('scan_mode', 'all')
                rate_limit_delay = normalize_rate_limit_delay(data.get('rate_limit_delay'))

                if categories:
                    folder_groups = get_scan_folder_groups(folder_paths)
                    folders = [
                        folder_path
                        for category in categories
                        for folder_key in folder_groups.get(category, [])
                        for folder_path in (
                            folder_paths.get_folder_paths(folder_key)
                            if hasattr(folder_paths, 'get_folder_paths')
                            else getattr(folder_paths, 'folder_names_and_paths', {}).get(folder_key, ([], set()))[0]
                        )
                    ]
                
                # Initialize progress tracking
                scan_progress_store.update({
                    'active': True,
                    'cancel_requested': False,
                    'current': 0,
                    'total': 0,
                    'discovered': 0,
                    'skipped': 0,
                    'processed': 0,
                    'errors': 0,
                    'matched': 0,
                    'unmatched': 0,
                    'temporary_errors': 0,
                    'error_details': [],
                    'status': 'initializing',
                    'error': None,
                    'current_file': '',
                    'current_file_progress': 0,
                    'start_time': time.time(),
                    'scan_options': {
                        'folders': folders,
                        'force': bool(force),
                        'include_cached': bool(include_cached),
                        'rate_limit_delay': rate_limit_delay,
                    },
                })
                
                # Start background scan task
                asyncio.create_task(
                    background_scan_task(
                        folders,
                        force,
                        include_cached,
                        rate_limit_delay,
                        scan_mode,
                    )
                )
                
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
                logger.error(f"SageUtils perform model scan error: {error_details}")
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
                        'cancel_requested': True,
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
                logger.error(f"SageUtils cancel scan error: {error_details}")
                return web.json_response(
                    {"success": False, "error": f"Failed to cancel scan: {str(e)}"}, 
                    status=500
                )
        
        # Add routes to tracking list
        _route_list.extend([
            {'method': 'GET', 'path': '/sage_cache/scan_model_folders', 'handler': 'get_available_folders'},
            {'method': 'GET', 'path': '/sage_cache/scan_progress', 'handler': 'get_scan_progress'},
            {'method': 'GET', 'path': '/sage_cache/scan_history', 'handler': 'get_scan_history'},
            {'method': 'POST', 'path': '/sage_cache/scan_preview', 'handler': 'preview_model_scan'},
            {'method': 'GET', 'path': '/sage_cache/reconcile', 'handler': 'reconcile_cache'},
            {'method': 'GET', 'path': '/sage_cache/inventory', 'handler': 'get_model_inventory'},
            {'method': 'POST', 'path': '/sage_cache/cleanup_missing', 'handler': 'cleanup_missing_cache_paths'},
            {'method': 'POST', 'path': '/sage_cache/scan_model_folders', 'handler': 'perform_model_scan'},
            {'method': 'POST', 'path': '/sage_cache/cancel_scan', 'handler': 'cancel_model_scan'}
        ])
        
        return len(_route_list)

    # Configuration constant for checkpoint interval
    SCAN_CHECKPOINT_INTERVAL = 100  # Save every N files during scan
    DEFAULT_RATE_LIMIT_DELAY_MS = 1000
    MIN_RATE_LIMIT_DELAY_MS = 100
    MAX_RATE_LIMIT_DELAY_MS = 5000

    def get_scan_folder_groups(folder_paths):
        """Return compatibility groups plus all registered model folders."""
        from ..utils.constants import MODEL_FILE_EXTENSIONS

        registered = getattr(folder_paths, 'folder_names_and_paths', {})
        groups = {
            'checkpoints': ['checkpoints'],
            'loras': ['loras'],
            'vae': ['vae', 'vae_approx'],
            'text_encoders': ['text_encoders', 'clip'],
            'diffusion_models': ['diffusion_models', 'unet'],
        }
        grouped_keys = {key for keys in groups.values() for key in keys}

        for folder_key, (_, extensions) in registered.items():
            normalized_extensions = {str(extension).lower() for extension in extensions}
            if not normalized_extensions.intersection(MODEL_FILE_EXTENSIONS):
                continue
            if folder_key not in grouped_keys:
                groups[folder_key] = [folder_key]

        return groups

    def normalize_rate_limit_delay(value):
        """Normalize the user-controlled delay between metadata jobs."""
        try:
            delay = int(value)
        except (TypeError, ValueError):
            delay = DEFAULT_RATE_LIMIT_DELAY_MS
        return max(MIN_RATE_LIMIT_DELAY_MS, min(MAX_RATE_LIMIT_DELAY_MS, delay))

    def append_scan_error(file_path, error, phase='processing'):
        """Keep a bounded, JSON-safe list of scan errors for the UI."""
        if len(scan_progress_store['error_details']) >= 100:
            return
        scan_progress_store['error_details'].append({
            'file': str(file_path),
            'error': str(error),
            'phase': phase,
        })

    def prepare_scan_paths(model_list, cache, force, include_cached, scan_mode='all'):
        """Apply cache and blacklist selection rules before metadata processing."""
        from ..utils.file_utils import file_fingerprint_matches

        try:
            cache.load()
        except Exception:
            pass

        skipped_count = 0
        changed_paths = set()
        selected_paths = []
        for file_path in model_list:
            file_hash = cache.hash.get(file_path)
            if not file_hash:
                if scan_mode in ('all', 'new_changed'):
                    selected_paths.append(file_path)
                else:
                    skipped_count += 1
                continue

            info = cache.info.get(file_hash, {})
            fingerprint = info.get('_sageutils_file_state', {}).get(file_path)
            is_changed = bool(fingerprint) and not file_fingerprint_matches(file_path, fingerprint)
            if is_changed:
                changed_paths.add(file_path)

            provider_status = info.get('_sageutils_civitai_status', 'unknown')
            if scan_mode == 'new_changed' and file_hash and not is_changed:
                skipped_count += 1
                continue
            if scan_mode == 'unmatched' and provider_status != 'not_found_or_unpublished':
                skipped_count += 1
                continue
            if scan_mode == 'failed' and provider_status != 'temporary_error':
                skipped_count += 1
                continue

            if include_cached or is_changed:
                selected_paths.append(file_path)
            else:
                skipped_count += 1
        model_list = selected_paths

        if not force:
            filtered = []
            for file_path in model_list:
                try:
                    file_hash = cache.hash.get(file_path)
                    info = cache.info.get(file_hash, {}) if file_hash else {}
                    if info.get('blacklist', False):
                        skipped_count += 1
                        continue
                except Exception:
                    # On any error, keep the item rather than over-filtering.
                    pass
                filtered.append(file_path)
            model_list = filtered

        return model_list, skipped_count, changed_paths

    def reconcile_cached_paths(cache):
        """Classify cached paths without deleting or changing cache data."""
        from ..utils.file_utils import file_fingerprint_matches

        try:
            cache.load()
        except Exception:
            pass

        statuses = {
            'present': [],
            'changed': [],
            'missing': [],
            'unreadable': [],
            'unknown': [],
        }

        for file_path, file_hash in cache.hash.items():
            path = pathlib.Path(file_path)
            try:
                if not path.exists():
                    statuses['missing'].append(file_path)
                    continue
                if not path.is_file():
                    statuses['unreadable'].append(file_path)
                    continue
                path.stat()
            except PermissionError:
                statuses['unreadable'].append(file_path)
                continue
            except OSError:
                statuses['unreadable'].append(file_path)
                continue

            info = cache.info.get(file_hash, {})
            fingerprint = info.get('_sageutils_file_state', {}).get(file_path)
            if not fingerprint:
                statuses['unknown'].append(file_path)
            elif file_fingerprint_matches(file_path, fingerprint):
                statuses['present'].append(file_path)
            else:
                statuses['changed'].append(file_path)

        return statuses

    def build_model_inventory(folder_paths, cache):
        """Enumerate registered model files and join cache data without hashing."""
        from ..utils.file_utils import file_fingerprint_matches
        from ..utils.model_metadata import normalize_model_info

        inventory_by_path = {}
        live_paths = set()
        folder_groups = get_scan_folder_groups(folder_paths)
        from ..utils.constants import MODEL_FILE_EXTENSIONS

        for category, folder_keys in folder_groups.items():
            for folder_key in folder_keys:
                if hasattr(folder_paths, 'get_folder_paths'):
                    folder_list = folder_paths.get_folder_paths(folder_key)
                else:
                    folder_list = getattr(folder_paths, 'folder_names_and_paths', {}).get(folder_key, ([], set()))[0]
                for folder in folder_list:
                    folder_path = pathlib.Path(folder)
                    if not folder_path.is_dir():
                        continue
                    for path in folder_path.rglob('*'):
                        if not path.is_file() or path.suffix.lower() not in MODEL_FILE_EXTENSIONS:
                            continue
                        file_path = str(path.resolve())
                        live_paths.add(file_path)
                        file_stat = path.stat()
                        file_hash = cache.hash.get(file_path)
                        raw_info = cache.info.get(file_hash, {}) if file_hash else {}
                        info = normalize_model_info(raw_info)
                        fingerprint = raw_info.get('_sageutils_file_state', {}).get(file_path)
                        if not file_hash or not fingerprint:
                            filesystem_status = 'unknown'
                        elif file_fingerprint_matches(file_path, fingerprint):
                            filesystem_status = 'present'
                        else:
                            filesystem_status = 'changed'
                        record = inventory_by_path.get(file_path)
                        metadata_status = (
                            'not_scanned' if not file_hash else info.get('_sageutils_civitai_status', 'unknown')
                        )
                        if record is None:
                            inventory_by_path[file_path] = {
                                'path': file_path,
                                'registered_types': [category],
                                'exists': True,
                                'is_file': True,
                                'size': file_stat.st_size,
                                'mtime_ns': file_stat.st_mtime_ns,
                                'hash': file_hash,
                                'info': info,
                                'filesystem_status': filesystem_status,
                                'civitai_status': info.get('_sageutils_civitai_status', 'unknown'),
                                'metadata_status': metadata_status,
                                'stale': False,
                            }
                        elif category not in record['registered_types']:
                            record['registered_types'].append(category)

        reconciliation = reconcile_cached_paths(cache)
        stale_paths = set(reconciliation['missing']) | set(reconciliation['unreadable'])
        for file_path in sorted(stale_paths - live_paths):
            file_hash = cache.hash.get(file_path)
            info = normalize_model_info(cache.info.get(file_hash, {}) if file_hash else {})
            inventory_by_path[file_path] = {
                'path': file_path,
                'registered_types': [],
                'exists': False,
                'is_file': False,
                'size': None,
                'mtime_ns': None,
                'hash': file_hash,
                'info': info,
                'filesystem_status': 'missing' if file_path in reconciliation['missing'] else 'unreadable',
                'civitai_status': info.get('_sageutils_civitai_status', 'unknown'),
                'metadata_status': info.get('_sageutils_civitai_status', 'unknown'),
                'stale': True,
            }

        return list(inventory_by_path.values())

    def remove_missing_cache_paths(cache, paths):
        """Remove only missing/unreadable path mappings; keep hash metadata intact."""
        reconciliation = reconcile_cached_paths(cache)
        allowed_paths = set(reconciliation['missing'])
        allowed_paths.update(reconciliation['unreadable'])
        removed = []
        for file_path in paths:
            if file_path in allowed_paths and file_path in cache.hash:
                del cache.hash[file_path]
                removed.append(file_path)
        return removed

    def prepare_full_hash_batch(model_list, changed_paths, cache, failed_paths=None, error_callback=None, progress_callback=None):
        """Hash only new or changed files and retain legacy cache identities."""
        from ..utils.file_utils import get_file_sha256_full, get_file_fingerprint
        from ..utils.model_metadata import FULL_SHA256_KEY, record_file_fingerprint

        if failed_paths is None:
            failed_paths = set()

        full_hashes = {}
        batch_paths = []
        for file_path in model_list:
            if file_path in cache.hash and file_path not in changed_paths:
                continue

            try:
                full_hash = get_file_sha256_full(file_path, progress_callback=progress_callback)
            except (OSError, ValueError) as hash_error:
                failed_paths.add(file_path)
                if error_callback is not None:
                    error_callback(file_path, hash_error, 'hashing')
                continue
            short_hash = full_hash[:10]
            old_hash = cache.hash.get(file_path)
            if old_hash != short_hash:
                old_info = cache.info.get(old_hash, {}) if old_hash else {}
                cache.hash[file_path] = short_hash
                if short_hash not in cache.info:
                    cache.info[short_hash] = dict(old_info)
                cache.info[short_hash]['hash'] = short_hash

            info = cache.info.setdefault(short_hash, {'hash': short_hash})
            info[FULL_SHA256_KEY] = full_hash
            record_file_fingerprint(file_path, info)
            full_hashes[file_path] = full_hash
            batch_paths.append(file_path)

        return batch_paths, full_hashes

    async def prepare_full_hash_batch_async(model_list, changed_paths, cache, failed_paths=None, error_callback=None):
        """Prepare full hashes in cooperative chunks so progress polling stays responsive."""
        if failed_paths is None:
            failed_paths = set()

        batch_paths = []
        full_hashes = {}
        hash_candidates = [
            file_path for file_path in model_list
            if file_path not in cache.hash or file_path in changed_paths
        ]
        chunk_size = 1

        for start in range(0, len(hash_candidates), chunk_size):
            chunk = hash_candidates[start:start + chunk_size]
            scan_progress_store['status'] = 'hashing'
            scan_progress_store['current_file'] = chunk[0] if chunk else ''
            scan_progress_store['current_file_progress'] = 10

            def update_hash_progress(progress):
                scan_progress_store['current_file_progress'] = 10 + round(progress * 40)

            chunk_paths, chunk_hashes = prepare_full_hash_batch(
                chunk,
                changed_paths,
                cache,
                failed_paths=failed_paths,
                error_callback=error_callback,
                progress_callback=update_hash_progress,
            )
            batch_paths.extend(chunk_paths)
            full_hashes.update(chunk_hashes)
            scan_progress_store['current'] = min(start + len(chunk), len(hash_candidates))
            scan_progress_store['processed'] = scan_progress_store['current']
            scan_progress_store['current_file_progress'] = 100
            await asyncio.sleep(0)

        return batch_paths, full_hashes

    def apply_bulk_metadata_results(batch_paths, full_hashes, cache, responses):
        """Apply bulk Civitai results and return handled paths and counters."""
        from ..utils.model_metadata import (
            FULL_SHA256_KEY,
            PROVIDER_STATUS_KEY,
            update_cache_from_civitai_json,
        )

        response_by_hash = {}
        for response in responses:
            for file_entry in response.get('files', []):
                response_hash = file_entry.get('hashes', {}).get('SHA256')
                if response_hash:
                    response_by_hash[response_hash.lower()] = response

        handled_paths = set()
        matched_count = 0
        unmatched_count = 0
        for file_path in batch_paths:
            full_hash = full_hashes[file_path]
            info = cache.by_path(file_path)
            result = response_by_hash.get(full_hash.lower())
            if result is not None:
                update_cache_from_civitai_json(
                    file_path,
                    result,
                    timestamp=False,
                    check_latest=False,
                    cache_instance=cache,
                )
                matched_count += 1
            else:
                info['civitai'] = 'False'
                info['civitai_failed_count'] = info.get('civitai_failed_count', 0) + 1
                info[PROVIDER_STATUS_KEY] = 'not_found_or_unpublished'
                unmatched_count += 1
            cache.by_path(file_path)[FULL_SHA256_KEY] = full_hash
            handled_paths.add(file_path)

        return handled_paths, {
            'matched': matched_count,
            'unmatched': unmatched_count,
            'temporary_errors': 0,
        }

    async def background_scan_task(folders, force, include_cached, rate_limit_delay, scan_mode='all'):
        """Background task that performs the actual scanning with progress updates"""
        try:
            # Dynamic import to avoid ComfyUI dependency issues
            import folder_paths
            
            # If no specific folders provided, get all model folders
            if not folders:
                scan_progress_store['status'] = 'discovering_folders'
                folder_mappings = get_scan_folder_groups(folder_paths)
                
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
                persist_scan_summary('error', 'No valid model folders found to scan')
                return
            
            # Start manual scanning with progress tracking
            scan_progress_store['status'] = 'scanning_files'
            
            # Dynamic import of helpers, constants, and cache
            from ..utils.helpers import pull_metadata
            from ..utils.constants import MODEL_FILE_EXTENSIONS
            from ..utils.model_cache import cache
            from ..utils.helpers_civitai import (
                configure_civitai_request_interval,
                get_civitai_model_versions_json_by_hashes,
            )
            from ..utils.model_metadata import PROVIDER_STATUS_KEY
            
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
            scan_progress_store['discovered'] = len(model_list)

            # Exclude blacklisted models unless force is enabled
            model_list, skipped_count, changed_paths = prepare_scan_paths(
                model_list,
                cache,
                force,
                include_cached,
                scan_mode,
            )

            scan_progress_store['skipped'] = skipped_count
            scan_progress_store['total'] = len(model_list)
            scan_progress_store['status'] = 'processing_metadata'
            configure_civitai_request_interval(rate_limit_delay)

            failed_hash_paths = set()
            batch_paths, full_hashes = await prepare_full_hash_batch_async(
                model_list,
                changed_paths,
                cache,
                failed_paths=failed_hash_paths,
                error_callback=append_scan_error,
            )
            scan_progress_store['errors'] += len(failed_hash_paths)
            bulk_handled_paths = set()
            last_request_at = None
            for start in range(0, len(batch_paths), 100):
                batch = batch_paths[start:start + 100]
                if last_request_at is not None:
                    remaining_delay = (rate_limit_delay / 1000) - (time.monotonic() - last_request_at)
                    if remaining_delay > 0:
                        await asyncio.sleep(remaining_delay)
                last_request_at = time.monotonic()
                try:
                    bulk_result = get_civitai_model_versions_json_by_hashes(
                        [full_hashes[file_path] for file_path in batch]
                    )
                    if isinstance(bulk_result, list):
                        handled_paths, bulk_counts = apply_bulk_metadata_results(
                                batch,
                                full_hashes,
                                cache,
                                bulk_result,
                            )
                        bulk_handled_paths.update(handled_paths)
                        for counter, value in bulk_counts.items():
                            scan_progress_store[counter] += value
                    else:
                        scan_progress_store['temporary_errors'] += len(batch)
                except Exception as bulk_error:
                    logger.error(f"Bulk Civitai lookup failed: {bulk_error}")
                    append_scan_error(','.join(batch), bulk_error, phase='bulk_lookup')
            
            logger.info(f"Found {len(model_list)} models to process")
            
            # Enable batch mode for reduced I/O during bulk operations
            cache.begin_batch()
            
            try:
                # Process files with progress updates and checkpoint saves
                processed_count = 0
                for file_path in model_list:
                    if scan_progress_store['cancel_requested']:
                        logger.info(f"Scan cancelled, stopping at {processed_count}/{len(model_list)} files")
                        break
                        
                    file_name = os.path.basename(file_path)
                    scan_progress_store['current_file'] = file_name
                    scan_progress_store['current_file_progress'] = 0
                    scan_progress_store['current'] = processed_count
                    
                    # Debug progress update
                    if processed_count % 10 == 0:  # Log every 10 files
                        logger.debug(f"Progress: {processed_count}/{len(model_list)} files processed ({(processed_count/len(model_list)*100):.1f}%)")
                    
                    try:
                        if file_path in failed_hash_paths:
                            scan_progress_store['current_file_progress'] = 100
                            processed_count += 1
                        elif file_path in bulk_handled_paths:
                            scan_progress_store['current_file_progress'] = 100
                            pass
                        else:
                            if last_request_at is not None:
                                remaining_delay = (rate_limit_delay / 1000) - (time.monotonic() - last_request_at)
                                if remaining_delay > 0:
                                    await asyncio.sleep(remaining_delay)
                            last_request_at = time.monotonic()

                            # If this file has no cached hash, indicate hashing in progress
                            try:
                                existing_hash = cache.hash.get(file_path)
                            except Exception:
                                existing_hash = None
                            file_force = force or file_path in changed_paths or file_path in batch_paths
                            needs_hashing = file_force or (not existing_hash)
                            if needs_hashing:
                                scan_progress_store['status'] = 'hashing'
                                scan_progress_store['current_file'] = file_name
                                scan_progress_store['current_file_progress'] = 50
                                if file_force and existing_hash:
                                    logger.info(f"Recalculating hash (forced) for {file_path}")
                                else:
                                    logger.info(f"Calculating hash for {file_path}")

                            scan_progress_store['current_file_progress'] = 75
                            pull_metadata(file_path, timestamp=False, force_all=file_force)
                            scan_progress_store['current_file_progress'] = 100
                            provider_status = cache.by_path(file_path).get(PROVIDER_STATUS_KEY)
                            if provider_status == 'matched':
                                scan_progress_store['matched'] += 1
                            elif provider_status == 'not_found_or_unpublished':
                                scan_progress_store['unmatched'] += 1
                            elif provider_status == 'temporary_error':
                                scan_progress_store['temporary_errors'] += 1
                        processed_count += 1
                    except Exception as file_error:
                        logger.error(f"Error processing {file_path}: {file_error}")
                        # Continue with other files
                        scan_progress_store['errors'] += 1
                        append_scan_error(file_path, file_error)
                        processed_count += 1

                    scan_progress_store['processed'] = processed_count
                    
                    # Checkpoint save: Save every N files to prevent data loss
                    if processed_count % SCAN_CHECKPOINT_INTERVAL == 0:
                        cache.end_batch(force_save=True)
                        scan_progress_store['current_file'] = f"Checkpoint save ({processed_count} files)..."
                        logger.info(f"Checkpoint save at {processed_count}/{len(model_list)} files")
                        cache.begin_batch()
                    
                    # Restore general status after any hashing indicator
                    if not scan_progress_store['cancel_requested']:
                        scan_progress_store['status'] = 'processing_metadata'

                    # Allow other async tasks to run (important for progress updates)
                    await asyncio.sleep(0.01)
                
            finally:
                # Always end batch mode and perform final save, even on cancellation or error
                cache.end_batch(force_save=True)
                logger.info(f"Final batch save completed")
            
            was_cancelled = scan_progress_store['cancel_requested']
            scan_progress_store.update({
                'active': False,
                'current': processed_count,
                'status': 'cancelled' if was_cancelled else 'completed',
                'current_file': 'Scan cancelled' if was_cancelled else 'Scan completed'
            })
            
            logger.info(
                f"Background scan {'cancelled' if was_cancelled else 'completed'}: "
                f"{processed_count} files processed"
            )
            persist_scan_summary(scan_progress_store['status'])
            
        except Exception as scan_error:
            scan_progress_store.update({
                'active': False,
                'status': 'error',
                'error': str(scan_error)
            })
            
            import traceback
            error_details = traceback.format_exc()
            logger.error(f"Background scan execution error: {error_details}")
            persist_scan_summary('error', str(scan_error))

    def get_route_list():
        """Get list of registered routes for this module."""
        return _route_list.copy()

except ImportError as e:
    import logging
    logger = logging.getLogger('routes.scanning')
    logger.error(f"SageUtils scanning routes import error: {e}")
    
    # Route list for documentation and registration tracking
    _route_list = []

    def _register_routes_without_aiohttp(routes_instance):
        """Fallback when aiohttp is not available"""
        return 0

    def _get_route_list_without_aiohttp():
        """Get list of registered routes for this module."""
        return _route_list.copy()

    register_routes = _register_routes_without_aiohttp
    get_route_list = _get_route_list_without_aiohttp

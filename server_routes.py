"""
Custom routes for SageUtils to expose cache data via HTTP endpoints.
"""

try:
    from server import PromptServer
    from aiohttp import web
    from .utils.model_cache import cache

    # Check if PromptServer instance is available
    if hasattr(PromptServer, 'instance') and PromptServer.instance is not None:
        # Get the PromptServer instance
        routes = PromptServer.instance.routes

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

        print("SageUtils custom routes loaded successfully!")
    else:
        print("Warning: PromptServer instance not available, skipping route registration")

except ImportError as e:
    print(f"Warning: Could not import required modules for SageUtils routes: {e}")
except Exception as e:
    print(f"Warning: Error setting up SageUtils routes: {e}")

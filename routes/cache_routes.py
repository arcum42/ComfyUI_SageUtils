"""
Cache Routes Module
Handles cache information and management endpoints.
"""

import logging
from aiohttp import web
from .base import route_error_handler, validate_query_params, validate_json_body, success_response, error_response

# Route list for documentation and registration tracking
_route_list = []


def register_routes(routes_instance):
    """
    Register cache-related routes.
    
    Args:
        routes_instance: The PromptServer routes instance
        
    Returns:
        int: Number of routes registered
    """
    global _route_list
    _route_list.clear()
    
    @routes_instance.get('/sage_cache/info')
    @route_error_handler
    async def get_sage_cache_info(request):
        """
        Returns the contents of SageCache.info as JSON.
        This contains model metadata, civitai information, and cache details.
        """
        try:
            # Dynamic import to avoid issues with ComfyUI dependencies at module load time
            import sys
            import os
            
            # Ensure we can import ComfyUI's modules
            comfyui_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            if comfyui_path not in sys.path:
                sys.path.insert(0, comfyui_path)
            
            from ..utils.model_cache import cache
            
            # Ensure cache is loaded
            cache.load()
            return web.json_response(cache.info)
            
        except Exception as e:
            logging.error(f"Cache info error: {e}")
            return error_response(f"Cache system error: {str(e)}", status=503)

    @routes_instance.get('/sage_cache/hash')
    @route_error_handler
    async def get_sage_cache_hash(request):
        """
        Returns the contents of SageCache.hash as JSON.
        This contains the mapping from file paths to their SHA256 hashes.
        """
        try:
            # Dynamic import to avoid ComfyUI dependency issues
            import sys
            import os
            
            # Ensure we can import ComfyUI's modules
            comfyui_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            if comfyui_path not in sys.path:
                sys.path.insert(0, comfyui_path)
            
            from ..utils.model_cache import cache
            
            # Ensure cache is loaded
            cache.load()
            return web.json_response(cache.hash)
            
        except Exception as e:
            logging.error(f"Cache hash error: {e}")
            return error_response(f"Cache system error: {str(e)}", status=503)

    @routes_instance.get('/sage_cache/stats')
    @route_error_handler
    async def get_sage_cache_stats(request):
        """
        Returns cache statistics including:
        - Total number of cached models
        - Cache memory usage
        - Hit rate statistics
        """
        try:
            # Dynamic import to avoid ComfyUI dependency issues
            import sys
            import os
            
            # Ensure we can import ComfyUI's modules
            comfyui_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            if comfyui_path not in sys.path:
                sys.path.insert(0, comfyui_path)
            
            from ..utils.model_cache import cache
            
            # Ensure cache is loaded
            cache.load()
            stats = {
                'total_models': len(cache.info),
                'cache_status': 'loaded' if cache.info else 'empty'
            }
            return web.json_response(stats)
            
        except Exception as e:
            logging.error(f"Cache stats error: {e}")
            return error_response(f"Cache system error: {str(e)}", status=503)

    @routes_instance.get('/sage_cache/file/{file_hash}')
    @route_error_handler
    async def get_sage_cache_file_info(request):
        """
        Returns information for a specific file hash.
        """
        try:
            # Dynamic import to avoid ComfyUI dependency issues
            import sys
            import os
            
            # Ensure we can import ComfyUI's modules
            comfyui_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            if comfyui_path not in sys.path:
                sys.path.insert(0, comfyui_path)
            
            from ..utils.model_cache import cache
            
            file_hash = request.match_info.get('file_hash', '')
            if not file_hash:
                return error_response("No file hash provided", status=400)
            
            # Ensure cache is loaded
            cache.load()
            
            file_info = cache.info.get(file_hash)
            if file_info is None:
                return error_response(f"No information found for hash: {file_hash}", status=404)
            
            # Also include which file paths use this hash
            file_paths = [path for path, hash_val in cache.hash.items() if hash_val == file_hash]
            
            result = {
                "hash": file_hash,
                "info": file_info,
                "file_paths": file_paths
            }
            
            return web.json_response(result)
            
        except Exception as e:
            logging.error(f"Cache file info error: {e}")
            return error_response(f"Cache system error: {str(e)}", status=503)

    @routes_instance.get('/sage_cache/path')
    @route_error_handler
    @validate_query_params('file_path')
    async def get_sage_cache_path_info(request):
        """
        Returns information for a file by its path.
        Uses the file path to look up the hash in cache.hash, 
        then retrieves the info from cache.info.
        """
        try:
            # Dynamic import to avoid ComfyUI dependency issues
            import sys
            import os
            
            # Ensure we can import ComfyUI's modules
            comfyui_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            if comfyui_path not in sys.path:
                sys.path.insert(0, comfyui_path)
            
            from ..utils.model_cache import cache
            
            file_path = request.query.get('file_path')
            
            # Ensure cache is loaded
            cache.load()
            
            # Look up hash for this file path
            file_hash = cache.hash.get(file_path)
            if file_hash is None:
                return error_response(f"No hash found for file path: {file_path}", status=404)
            
            # Get the info for this hash
            file_info = cache.info.get(file_hash)
            if file_info is None:
                return error_response(
                    f"No information found for hash {file_hash} (path: {file_path})", 
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
            logging.error(f"Cache path info error: {e}")
            return error_response(f"Cache system error: {str(e)}", status=503)

    @routes_instance.post('/sage_utils/pull_metadata')
    @route_error_handler
    @validate_json_body('file_path')
    async def pull_metadata_route(request):
        """
        Pulls metadata for a specific file using the pull_metadata function from helpers.py.
        Expects JSON body with 'file_path' field and optional 'force' field.
        """
        try:
            # Dynamic import to avoid ComfyUI dependency issues
            import sys
            import os
            
            # Ensure we can import ComfyUI's modules
            comfyui_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            if comfyui_path not in sys.path:
                sys.path.insert(0, comfyui_path)
            
            from ..utils.helpers import pull_metadata
            
            data = request.json_data
            file_path = data.get('file_path')
            force = data.get('force', False)
            
            try:
                pull_metadata([file_path], force_all=force)
                return success_response(message=f"Metadata pulled successfully for {file_path}")
            except Exception as pull_error:
                logging.error(f"Failed to pull metadata for {file_path}: {pull_error}")
                return error_response(f"Failed to pull metadata: {str(pull_error)}", status=500)
                
        except Exception as e:
            logging.error(f"Pull metadata error: {e}")
            return error_response(f"Metadata pull system error: {str(e)}", status=503)

    @routes_instance.post('/sage_utils/update_cache_info')
    @route_error_handler
    @validate_json_body('hash', 'info')
    async def update_cache_info_route(request):
        """
        Updates cache info for a specific file hash.
        Expects JSON body with 'hash' and 'info' fields.
        """
        try:
            # Dynamic import to avoid ComfyUI dependency issues
            import sys
            import os
            
            # Ensure we can import ComfyUI's modules
            comfyui_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            if comfyui_path not in sys.path:
                sys.path.insert(0, comfyui_path)
            
            from ..utils.model_cache import cache
            
            data = request.json_data
            hash_value = data.get('hash')
            info = data.get('info')
            
            try:
                cache.load()
                cache.info[hash_value] = info
                cache.save()
                
                return success_response(message=f"Cache info updated successfully for hash {hash_value}")
            except Exception as update_error:
                logging.error(f"Failed to update cache info for {hash_value}: {update_error}")
                return error_response(f"Failed to update cache info: {str(update_error)}", status=500)
                
        except Exception as e:
            logging.error(f"Update cache info error: {e}")
            return error_response(f"Cache system error: {str(e)}", status=503)

    @routes_instance.get('/sage_utils/cache_info_images')
    @route_error_handler
    @validate_query_params('hash')
    async def get_cache_info_images(request):
        """
        Returns image data associated with a cached model's Civitai information.
        Expects 'hash' query parameter.
        """
        try:
            # Dynamic import to avoid ComfyUI dependency issues
            import sys
            import os
            
            # Ensure we can import ComfyUI's modules
            comfyui_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            if comfyui_path not in sys.path:
                sys.path.insert(0, comfyui_path)
            
            from ..utils.model_cache import cache
            
            hash_value = request.query.get('hash')
            
            # Get info from cache
            info = cache.info.get(hash_value)
            
            if not info:
                return error_response("No cache info found for hash", status=404)

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

            return success_response(data={
                "images": formatted_images,
                "count": len(formatted_images)
            })
            
        except Exception as e:
            logging.error(f"Cache info images error: {e}")
            return error_response(f"Cache system error: {str(e)}", status=503)

    # Track registered routes
    _route_list.extend([
        {"method": "GET", "path": "/sage_cache/info", "description": "Get cache info"},
        {"method": "GET", "path": "/sage_cache/hash", "description": "Get cache hash mapping"},
        {"method": "GET", "path": "/sage_cache/stats", "description": "Get cache statistics"},
        {"method": "GET", "path": "/sage_cache/file/{file_hash}", "description": "Get info for specific file hash"},
        {"method": "GET", "path": "/sage_cache/path", "description": "Get info for file by path"},
        {"method": "POST", "path": "/sage_utils/pull_metadata", "description": "Pull metadata for file"},
        {"method": "POST", "path": "/sage_utils/update_cache_info", "description": "Update cache info"},
        {"method": "GET", "path": "/sage_utils/cache_info_images", "description": "Get Civitai images for hash"}
    ])
    
    return len(_route_list)


def get_route_list():
    """Get list of registered routes for this module."""
    return _route_list.copy()

"""
Gallery and image management routes for SageUtils.

This module handles:
- CivitAI image fetching with rate limiting
- Image listing and folder browsing
- Thumbnail generation with caching
- Image metadata extraction (EXIF, generation params)
- Dataset text file management for image annotation
"""

import asyncio
import logging
import time
from aiohttp import web
from .base import route_error_handler, validate_json_body, success_response, error_response
from ..utils.gallery_service import (
    browse_directory_tree,
    browse_folder,
    check_dataset_text,
    copy_image_to_clipboard,
    delete_images,
    find_duplicates,
    get_full_image_bytes,
    get_image_metadata,
    get_thumbnail_bytes,
    list_images,
    read_dataset_text,
    save_dataset_text,
)

logger = logging.getLogger('routes.gallery')

_route_list = []
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


def register_routes(routes_instance):
    global _route_list
    _route_list.clear()

    @routes_instance.post('/sage_utils/civitai_images')
    @route_error_handler
    async def civitai_images(request):
        """Fetch images from CivitAI API by model hash."""
        try:
            import aiohttp
            data = await request.json()
            hash_param = data.get('hash', '').strip()
            if not hash_param:
                return web.json_response({"success": False, "error": "Hash parameter is required"}, status=400)

            await _rate_limit()
            headers = {'User-Agent': 'SageUtils/1.0'}
            civitai_url = f"https://civitai.com/api/v1/model-versions/by-hash/{hash_param}"

            async with aiohttp.ClientSession(headers=headers) as session:
                try:
                    async with session.get(civitai_url, timeout=aiohttp.ClientTimeout(total=15)) as response:
                        if response.status == 200:
                            result = await response.json()
                            images = result.get('images', [])
                            safe_images = [img for img in images if img.get('nsfwLevel', 0) <= 1]
                            return web.json_response({"success": True, "images": safe_images})
                        if response.status == 429:
                            return web.json_response({"success": False, "error": "Rate limited by Civitai API"}, status=429)
                        return web.json_response({"success": False, "error": f"Civitai API returned status {response.status}"}, status=response.status)
                except asyncio.TimeoutError:
                    return web.json_response({"success": False, "error": "Request to Civitai API timed out"}, status=504)
        except Exception as e:
            logger.exception('Failed to process civitai_images request')
            return web.json_response({"success": False, "error": f"Failed to process request: {str(e)}"}, status=500)

    @routes_instance.post('/sage_utils/list_images')
    @route_error_handler
    async def list_images_route(request):
        """Returns a list of all images in a specified folder."""
        try:
            data = await request.json()
            folder_type = data.get('folder', 'notes')
            custom_path = data.get('path', '')
            result = list_images(folder_type, custom_path)
            return web.json_response({"success": True, **result})
        except ValueError as e:
            return web.json_response({"success": False, "error": str(e)}, status=400)
        except FileNotFoundError as e:
            return web.json_response({"success": False, "error": str(e)}, status=404)
        except Exception as e:
            logger.exception('Failed to list images')
            return web.json_response({"success": False, "error": f"Failed to list images: {str(e)}"}, status=500)

    @routes_instance.post('/sage_utils/thumbnail')
    @route_error_handler
    async def get_thumbnail(request):
        """Generate and serve thumbnail for an image."""
        try:
            try:
                data = await request.json()
            except Exception:
                data = dict(request.query)

            image_path = (data.get('image_path') or '').strip()
            size_param = data.get('size', 'medium')
            if not image_path:
                return web.Response(text="Image path is required", status=400)

            thumbnail_data = get_thumbnail_bytes(image_path, size_param)
            return web.Response(
                body=thumbnail_data,
                content_type='image/jpeg',
                headers={
                    'Cache-Control': 'max-age=86400',
                    'Content-Length': str(len(thumbnail_data))
                }
            )
        except FileNotFoundError:
            return web.Response(text="Image not found", status=404)
        except ValueError as e:
            return web.Response(text=str(e), status=400)
        except Exception as e:
            logger.exception('Failed to serve thumbnail')
            return web.Response(text=f"Failed to serve thumbnail: {str(e)}", status=500)

    @routes_instance.post('/sage_utils/image_metadata')
    @route_error_handler
    async def get_image_metadata_route(request):
        """Extract metadata from an image file."""
        try:
            data = await request.json()
            image_path = data.get('image_path', '').strip()
            if not image_path:
                return web.json_response({"success": False, "error": "Image path is required"}, status=400)
            metadata = get_image_metadata(image_path)
            return web.json_response({"success": True, "metadata": metadata})
        except FileNotFoundError:
            return web.json_response({"success": False, "error": "Image not found"}, status=404)
        except ValueError as e:
            return web.json_response({"success": False, "error": str(e)}, status=400)
        except Exception as e:
            logger.exception('Failed to extract metadata')
            return web.json_response({"success": False, "error": f"Failed to extract metadata: {str(e)}"}, status=500)

    @routes_instance.post('/sage_utils/check_dataset_text')
    @route_error_handler
    async def check_dataset_text_route(request):
        """Check if a text file exists for an image."""
        try:
            data = await request.json()
            image_path = data.get('image_path', '').strip()
            if not image_path:
                return web.json_response({"success": False, "error": "Image path is required"}, status=400)
            result = check_dataset_text(image_path)
            return web.json_response({"success": True, **result})
        except FileNotFoundError:
            return web.json_response({"success": False, "error": "Image not found"}, status=404)
        except ValueError as e:
            return web.json_response({"success": False, "error": str(e)}, status=400)
        except Exception as e:
            logger.exception('Failed to check dataset text')
            return web.json_response({"success": False, "error": f"Failed to check text file: {str(e)}"}, status=500)

    @routes_instance.post('/sage_utils/read_dataset_text')
    @route_error_handler
    async def read_dataset_text_route(request):
        """Read the content of a dataset text file for an image."""
        try:
            data = await request.json()
            image_path = data.get('image_path', '').strip()
            if not image_path:
                return web.json_response({"success": False, "error": "Image path is required"}, status=400)
            result = read_dataset_text(image_path)
            return web.json_response({"success": True, **result})
        except FileNotFoundError as e:
            return web.json_response({"success": False, "error": str(e)}, status=404)
        except ValueError as e:
            return web.json_response({"success": False, "error": str(e)}, status=400)
        except Exception as e:
            logger.exception('Failed to read dataset text')
            return web.json_response({"success": False, "error": f"Failed to read text file: {str(e)}"}, status=500)

    @routes_instance.post('/sage_utils/save_dataset_text')
    @route_error_handler
    async def save_dataset_text_route(request):
        """Save content to a dataset text file for an image."""
        try:
            data = await request.json()
            image_path = data.get('image_path', '').strip()
            content = data.get('content', '')
            if not image_path:
                return web.json_response({"success": False, "error": "Image path is required"}, status=400)
            result = save_dataset_text(image_path, content)
            return web.json_response({"success": True, **result})
        except FileNotFoundError:
            return web.json_response({"success": False, "error": "Image not found"}, status=404)
        except ValueError as e:
            return web.json_response({"success": False, "error": str(e)}, status=400)
        except Exception as e:
            logger.exception('Failed to save dataset text')
            return web.json_response({"success": False, "error": f"Failed to save text file: {str(e)}"}, status=500)

    @routes_instance.post('/sage_utils/browse_folder')
    @route_error_handler
    async def browse_folder_route(request):
        """Browse and validate a custom folder path."""
        try:
            data = await request.json()
            folder_path = data.get('path', '').strip()
            if not folder_path:
                return web.json_response({"success": False, "error": "Path is required"}, status=400)
            result = browse_folder(folder_path)
            return web.json_response({"success": True, **result})
        except FileNotFoundError:
            return web.json_response({"success": False, "error": "Path does not exist"}, status=404)
        except ValueError as e:
            return web.json_response({"success": False, "error": str(e)}, status=400)
        except Exception as e:
            logger.exception('Failed to browse folder')
            return web.json_response({"success": False, "error": f"Failed to browse folder: {str(e)}"}, status=500)

    @routes_instance.post('/sage_utils/browse_directory_tree')
    @route_error_handler
    async def browse_directory_tree_route(request):
        """Browse directory tree for folder selection."""
        try:
            data = await request.json()
            current_path = data.get('path', None)
            max_depth = int(data.get('depth', 2) or 2)
            result = browse_directory_tree(current_path, max_depth)
            return web.json_response({"success": True, **result})
        except ValueError as e:
            return web.json_response({"success": False, "error": str(e)}, status=400)
        except Exception as e:
            logger.exception('Failed to browse directory tree')
            return web.json_response({"success": False, "error": f"Failed to browse directory tree: {str(e)}"}, status=500)

    @routes_instance.post('/sage_utils/copy_image')
    @route_error_handler
    async def copy_image_to_clipboard_route(request):
        """Copy full-resolution image to system clipboard."""
        try:
            data = await request.json()
            image_path = data.get('image_path', '').strip()
            if not image_path:
                return web.json_response({"success": False, "error": "Image path is required"}, status=400)
            result = copy_image_to_clipboard(image_path)
            return web.json_response({"success": True, **result})
        except FileNotFoundError:
            return web.json_response({"success": False, "error": "Image not found"}, status=404)
        except ValueError as e:
            return web.json_response({"success": False, "error": str(e)}, status=400)
        except Exception as e:
            logger.exception('Failed to copy image to clipboard')
            return web.json_response({"success": False, "error": f"Failed to copy image: {str(e)}"}, status=500)

    @routes_instance.post('/sage_utils/image')
    @route_error_handler
    async def get_full_image(request):
        """Serve full resolution image."""
        try:
            data = await request.json()
            image_path = data.get('image_path', '').strip()
            if not image_path:
                return web.Response(text="Image path is required", status=400)
            result = get_full_image_bytes(image_path)
            return web.Response(
                body=result['body'],
                content_type=result['content_type'],
                headers={
                    'Cache-Control': 'public, max-age=3600',
                    'Content-Length': str(len(result['body']))
                }
            )
        except FileNotFoundError:
            return web.Response(text="Image not found", status=404)
        except ValueError as e:
            return web.Response(text=str(e), status=400)
        except Exception as e:
            logger.exception('Failed to serve full image')
            return web.Response(text=f"Failed to serve image: {str(e)}", status=500)

    @routes_instance.post('/sage_utils/find_duplicates')
    @route_error_handler
    async def find_duplicates_route(request):
        """Find duplicate images in a folder by computing image hashes."""
        try:
            data = await request.json()
            folder_path = data.get('folder_path', '').strip()
            include_subfolders = bool(data.get('include_subfolders', False))
            if not folder_path:
                return web.json_response({"success": False, "error": "Folder path is required"}, status=400)
            result = find_duplicates(folder_path, include_subfolders)
            return web.json_response({"success": True, **result})
        except FileNotFoundError:
            return web.json_response({"success": False, "error": "Folder not found or is not a directory"}, status=404)
        except Exception as e:
            logger.exception('Failed to find duplicates')
            return web.json_response({"success": False, "error": f"Failed to find duplicates: {str(e)}"}, status=500)

    @routes_instance.post('/sage_utils/delete_images')
    @route_error_handler
    async def delete_images_route(request):
        """Delete multiple images."""
        try:
            data = await request.json()
            image_paths = data.get('image_paths', [])
            if not isinstance(image_paths, list) or not image_paths:
                return web.json_response({"success": False, "error": "image_paths must be a non-empty array"}, status=400)
            result = delete_images(image_paths)
            return web.json_response({"success": True, **result})
        except Exception as e:
            logger.exception('Failed to delete images')
            return web.json_response({"success": False, "error": f"Failed to delete images: {str(e)}"}, status=500)

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
    return _route_list.copy()

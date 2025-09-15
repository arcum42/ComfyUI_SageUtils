"""
Tag Management Routes Module
Handles tag library and tag set management for prompt building.
"""

import logging
import json
from pathlib import Path
from aiohttp import web
from .base import route_error_handler, validate_json_body, success_response, error_response

# Route list for documentation and registration tracking
_route_list = []


def _get_tag_library_path(sage_users_path):
    """
    Get the path to the tag library file.
    
    Args:
        sage_users_path: Base SageUtils user directory path
        
    Returns:
        Path: Path to tag library JSON file
    """
    return Path(sage_users_path) / "tag_library.json"


def _get_default_tag_library():
    """
    Returns the default tag library structure loaded from config manager.
    
    Returns:
        dict: Default tag library data
    """
    try:
        # Import the default tag library from config manager
        from ..utils.config_manager import default_tag_library
        
        if default_tag_library and default_tag_library.get('categories'):
            return default_tag_library
        else:
            # Fallback to minimal structure if no default data
            logging.warning("Default tag library is empty or not loaded")
            return {
                "version": "1.0",
                "categories": [],
                "metadata": {
                    "created": None,
                    "modified": None,
                    "total_categories": 0,
                    "total_tags": 0,
                    "total_sets": 0
                }
            }
    except Exception as e:
        logging.error(f"Error loading default tag library: {e}")
        # Return minimal fallback structure
        return {
            "version": "1.0",
            "categories": [],
            "metadata": {
                "created": None,
                "modified": None,
                "total_categories": 0,
                "total_tags": 0,
                "total_sets": 0
            }
        }


def _validate_category_data(data):
    """
    Validate category data structure.
    
    Args:
        data: Category data to validate
        
    Returns:
        tuple: (is_valid, error_message)
    """
    required_fields = ['id', 'name']
    for field in required_fields:
        if field not in data:
            return False, f"Missing required field: {field}"
    
    if not isinstance(data.get('tags', []), list):
        return False, "Tags must be a list"
    
    if not isinstance(data.get('sets', []), list):
        return False, "Sets must be a list"
    
    # Validate sets
    for tag_set in data.get('sets', []):
        if not isinstance(tag_set, dict):
            return False, "Each set must be an object"
        if 'id' not in tag_set or 'name' not in tag_set:
            return False, "Each set must have id and name"
        if not isinstance(tag_set.get('tags', []), list):
            return False, "Set tags must be a list"
    
    return True, None


def register_routes(routes_instance):
    """
    Register tag management routes.
    
    Args:
        routes_instance: The PromptServer routes instance
        
    Returns:
        int: Number of routes registered
    """
    global _route_list
    _route_list.clear()
    
    @routes_instance.get('/sage_utils/tags/library')
    @route_error_handler
    async def get_tag_library(request):
        """
        Gets the complete tag library.
        
        Response:
            JSON with tag library data including categories, tags, and sets
        """
        try:
            # Dynamic import to avoid ComfyUI dependency issues
            from ..utils import sage_users_path
            
            tag_library_path = _get_tag_library_path(sage_users_path)
            
            if not tag_library_path.exists():
                # Return default library if none exists
                default_library = _get_default_tag_library()
                return success_response(data=default_library)
            
            # Load existing library
            with open(tag_library_path, 'r', encoding='utf-8') as f:
                library_data = json.load(f)
            
            return success_response(data=library_data)
            
        except Exception as e:
            logging.error(f"Get tag library error: {e}")
            return error_response(f"Failed to get tag library: {str(e)}", status=500)

    @routes_instance.post('/sage_utils/tags/library')
    @route_error_handler
    @validate_json_body('categories')
    async def save_tag_library(request):
        """
        Saves the complete tag library.
        
        Request Body:
            categories: Array of category objects
            metadata: Optional metadata object
            
        Response:
            JSON with success message and library statistics
        """
        try:
            # Dynamic import to avoid ComfyUI dependency issues
            from ..utils import sage_users_path
            import datetime
            
            data = request.json_data
            categories = data.get('categories', [])
            metadata = data.get('metadata', {})
            
            # Update metadata
            now = datetime.datetime.now().isoformat()
            metadata.update({
                'modified': now,
                'total_categories': len(categories),
                'total_tags': sum(len(cat.get('tags', [])) for cat in categories),
                'total_sets': sum(len(cat.get('sets', [])) for cat in categories)
            })
            
            if 'created' not in metadata:
                metadata['created'] = now
            
            # Prepare library data
            library_data = {
                'version': data.get('version', '1.0'),
                'categories': categories,
                'metadata': metadata
            }
            
            # Validate categories
            for category in categories:
                is_valid, error_msg = _validate_category_data(category)
                if not is_valid:
                    return error_response(f"Invalid category data: {error_msg}", status=400)
            
            # Save to file
            tag_library_path = _get_tag_library_path(sage_users_path)
            tag_library_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(tag_library_path, 'w', encoding='utf-8') as f:
                json.dump(library_data, f, indent=2, ensure_ascii=False)
            
            return success_response(
                message="Tag library saved successfully",
                data={
                    "categories": metadata['total_categories'],
                    "tags": metadata['total_tags'],
                    "sets": metadata['total_sets'],
                    "file_size": tag_library_path.stat().st_size
                }
            )
            
        except Exception as e:
            logging.error(f"Save tag library error: {e}")
            return error_response(f"Failed to save tag library: {str(e)}", status=500)

    @routes_instance.post('/sage_utils/tags/category')
    @route_error_handler
    @validate_json_body('id', 'name')
    async def save_category(request):
        """
        Creates or updates a category in the tag library.
        
        Request Body:
            id: Category ID
            name: Category name
            description: Optional description
            color: Optional color code
            tags: Array of tag strings
            sets: Array of tag set objects
            
        Response:
            JSON with success message and updated category data
        """
        try:
            # Dynamic import to avoid ComfyUI dependency issues
            from ..utils import sage_users_path
            import datetime
            
            data = request.json_data
            
            # Validate category data
            is_valid, error_msg = _validate_category_data(data)
            if not is_valid:
                return error_response(error_msg, status=400)
            
            # Load existing library
            tag_library_path = _get_tag_library_path(sage_users_path)
            if tag_library_path.exists():
                with open(tag_library_path, 'r', encoding='utf-8') as f:
                    library_data = json.load(f)
            else:
                library_data = _get_default_tag_library()
            
            # Find and update category, or add new one
            category_id = data['id']
            category_found = False
            
            for i, category in enumerate(library_data['categories']):
                if category['id'] == category_id:
                    library_data['categories'][i] = data
                    category_found = True
                    break
            
            if not category_found:
                # Add order if not specified
                if 'order' not in data:
                    data['order'] = len(library_data['categories'])
                library_data['categories'].append(data)
            
            # Update metadata
            now = datetime.datetime.now().isoformat()
            library_data['metadata']['modified'] = now
            library_data['metadata']['total_categories'] = len(library_data['categories'])
            library_data['metadata']['total_tags'] = sum(len(cat.get('tags', [])) for cat in library_data['categories'])
            library_data['metadata']['total_sets'] = sum(len(cat.get('sets', [])) for cat in library_data['categories'])
            
            # Save updated library
            with open(tag_library_path, 'w', encoding='utf-8') as f:
                json.dump(library_data, f, indent=2, ensure_ascii=False)
            
            return success_response(
                message=f"Category '{data['name']}' {'updated' if category_found else 'created'} successfully",
                data=data
            )
            
        except Exception as e:
            logging.error(f"Save category error: {e}")
            return error_response(f"Failed to save category: {str(e)}", status=500)

    @routes_instance.delete('/sage_utils/tags/category/{category_id}')
    @route_error_handler
    async def delete_category(request):
        """
        Deletes a category from the tag library.
        
        Path Parameters:
            category_id: ID of the category to delete
            
        Response:
            JSON with success message
        """
        try:
            # Dynamic import to avoid ComfyUI dependency issues
            from ..utils import sage_users_path
            import datetime
            
            category_id = request.match_info.get('category_id', '')
            if not category_id:
                return error_response("Category ID is required", status=400)
            
            # Load existing library
            tag_library_path = _get_tag_library_path(sage_users_path)
            if not tag_library_path.exists():
                return error_response("Tag library not found", status=404)
            
            with open(tag_library_path, 'r', encoding='utf-8') as f:
                library_data = json.load(f)
            
            # Find and remove category
            category_found = False
            removed_category = None
            for i, category in enumerate(library_data['categories']):
                if category['id'] == category_id:
                    removed_category = library_data['categories'].pop(i)
                    category_found = True
                    break
            
            if not category_found:
                return error_response(f"Category '{category_id}' not found", status=404)
            
            # Update metadata
            now = datetime.datetime.now().isoformat()
            library_data['metadata']['modified'] = now
            library_data['metadata']['total_categories'] = len(library_data['categories'])
            library_data['metadata']['total_tags'] = sum(len(cat.get('tags', [])) for cat in library_data['categories'])
            library_data['metadata']['total_sets'] = sum(len(cat.get('sets', [])) for cat in library_data['categories'])
            
            # Save updated library
            with open(tag_library_path, 'w', encoding='utf-8') as f:
                json.dump(library_data, f, indent=2, ensure_ascii=False)
            
            return success_response(
                message=f"Category '{removed_category['name'] if removed_category else category_id}' deleted successfully"
            )
            
        except Exception as e:
            logging.error(f"Delete category error: {e}")
            return error_response(f"Failed to delete category: {str(e)}", status=500)

    @routes_instance.get('/sage_utils/tags/search')
    @route_error_handler
    async def search_tags(request):
        """
        Searches for tags across all categories.
        
        Query Parameters:
            q: Search query
            category: Optional category ID to limit search
            limit: Optional limit (default: 50)
            
        Response:
            JSON with search results
        """
        try:
            # Dynamic import to avoid ComfyUI dependency issues
            from ..utils import sage_users_path
            
            query = request.query.get('q', '').lower().strip()
            category_filter = request.query.get('category', '')
            limit = int(request.query.get('limit', 50))
            
            if not query:
                return error_response("Search query is required", status=400)
            
            # Load tag library
            tag_library_path = _get_tag_library_path(sage_users_path)
            if not tag_library_path.exists():
                return success_response(data={"results": [], "total": 0})
            
            with open(tag_library_path, 'r', encoding='utf-8') as f:
                library_data = json.load(f)
            
            results = []
            
            # Search through categories
            for category in library_data['categories']:
                if category_filter and category['id'] != category_filter:
                    continue
                
                # Search individual tags
                for tag in category.get('tags', []):
                    if query in tag.lower():
                        results.append({
                            'type': 'tag',
                            'text': tag,
                            'category_id': category['id'],
                            'category_name': category['name'],
                            'match_type': 'exact' if query == tag.lower() else 'partial'
                        })
                
                # Search tag sets
                for tag_set in category.get('sets', []):
                    if query in tag_set['name'].lower():
                        results.append({
                            'type': 'set',
                            'text': tag_set['name'],
                            'tags': tag_set['tags'],
                            'category_id': category['id'],
                            'category_name': category['name'],
                            'match_type': 'name'
                        })
                    
                    # Search within set tags
                    for tag in tag_set.get('tags', []):
                        if query in tag.lower():
                            results.append({
                                'type': 'set_tag',
                                'text': tag,
                                'set_name': tag_set['name'],
                                'category_id': category['id'],
                                'category_name': category['name'],
                                'match_type': 'tag_in_set'
                            })
            
            # Sort by relevance (exact matches first)
            results.sort(key=lambda x: (
                0 if x['match_type'] == 'exact' else 1,
                x['text'].lower()
            ))
            
            # Apply limit
            results = results[:limit]
            
            return success_response(data={
                "results": results,
                "total": len(results),
                "query": query,
                "limit": limit
            })
            
        except Exception as e:
            logging.error(f"Search tags error: {e}")
            return error_response(f"Failed to search tags: {str(e)}", status=500)

    @routes_instance.get('/sage_utils/tags/defaults')
    @route_error_handler
    async def get_default_tag_library(request):
        """
        Gets the default tag library structure from assets.
        
        Response:
            JSON with default tag library data
        """
        try:
            default_library = _get_default_tag_library()
            return success_response(data=default_library)
            
        except Exception as e:
            logging.error(f"Get default tag library error: {e}")
            return error_response(f"Failed to get default tag library: {str(e)}", status=500)

    # Track registered routes
    _route_list.extend([
        {"method": "GET", "path": "/sage_utils/tags/library", "description": "Get complete tag library"},
        {"method": "POST", "path": "/sage_utils/tags/library", "description": "Save complete tag library"},
        {"method": "POST", "path": "/sage_utils/tags/category", "description": "Create or update category"},
        {"method": "DELETE", "path": "/sage_utils/tags/category/{category_id}", "description": "Delete category"},
        {"method": "GET", "path": "/sage_utils/tags/search", "description": "Search tags and sets"},
        {"method": "GET", "path": "/sage_utils/tags/defaults", "description": "Get default tag library from assets"}
    ])
    
    logging.info("Tag management routes registered successfully")
    return len(_route_list)


def get_route_list():
    """Get list of registered routes for this module."""
    return _route_list.copy()

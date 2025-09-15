"""
Prompt Storage Routes Module
Handles saved prompt management for prompt building.
"""

import logging
import json
import uuid
from datetime import datetime
from pathlib import Path
from .base import route_error_handler, success_response, error_response

# Route list for documentation and registration tracking
_route_list = []


def _get_prompts_storage_path(sage_users_path):
    """Get the path to the saved prompts file."""
    return Path(sage_users_path) / "saved_prompts.json"


def _get_default_prompts_structure():
    """Returns the default prompts storage structure."""
    return {
        "prompts": [],
        "categories": ["general", "character", "style", "quality"],
        "metadata": {
            "version": "1.0",
            "total_prompts": 0,
            "created": datetime.now().isoformat(),
            "updated": datetime.now().isoformat()
        }
    }


@route_error_handler
async def save_prompt(request):
    """Save a new prompt or update existing one."""
    try:
        try:
            data = await request.json()
        except Exception as e:
            return error_response(f"Invalid JSON: {e}", 400)
        
        # Try to get sage_users_path, fall back to a default location
        sage_users_path = getattr(request.app, 'sage_users_path', None)
        if not sage_users_path:
            # Fallback to the custom_nodes directory
            sage_users_path = Path(__file__).parent.parent / "user_data"
        
        prompts_file = _get_prompts_storage_path(sage_users_path)
        
        # Load existing data or create new
        if prompts_file.exists():
            with open(prompts_file, 'r', encoding='utf-8') as f:
                prompts_data = json.load(f)
        else:
            prompts_data = _get_default_prompts_structure()
        
        # Create or update prompt
        prompt_id = data.get('id') or str(uuid.uuid4())
        
        prompt_entry = {
            "id": prompt_id,
            "name": data.get('name', 'Untitled Prompt'),
            "positive": data.get('positive', ''),
            "negative": data.get('negative', ''),
            "category": data.get('category', 'general'),
            "tags": data.get('tags', []),
            "description": data.get('description', ''),
            "created": data.get('created', datetime.now().isoformat()),
            "updated": datetime.now().isoformat(),
            "used_count": data.get('used_count', 0)
        }
        
        # Update or add prompt
        existing_index = next((i for i, p in enumerate(prompts_data['prompts']) if p['id'] == prompt_id), None)
        if existing_index is not None:
            prompts_data['prompts'][existing_index] = prompt_entry
        else:
            prompts_data['prompts'].append(prompt_entry)
        
        # Update metadata
        prompts_data['metadata']['total_prompts'] = len(prompts_data['prompts'])
        prompts_data['metadata']['updated'] = datetime.now().isoformat()
        
        # Save to file
        prompts_file.parent.mkdir(parents=True, exist_ok=True)
        with open(prompts_file, 'w', encoding='utf-8') as f:
            json.dump(prompts_data, f, indent=2, ensure_ascii=False)
        
        return success_response({"prompt": prompt_entry})
    except Exception as e:
        logging.error(f"Error in save_prompt: {e}")
        return error_response(f"Failed to save prompt: {str(e)}", 500)


async def list_prompts(request):
    """List all saved prompts with optional filtering."""
    try:
        # Try to get sage_users_path, fall back to a default location
        sage_users_path = getattr(request.app, 'sage_users_path', None)
        if not sage_users_path:
            # Fallback to the custom_nodes directory
            sage_users_path = Path(__file__).parent.parent / "user_data"
        
        prompts_file = _get_prompts_storage_path(sage_users_path)
        
        if not prompts_file.exists():
            prompts_data = _get_default_prompts_structure()
        else:
            with open(prompts_file, 'r', encoding='utf-8') as f:
                prompts_data = json.load(f)
        
        # Optional filtering
        category = request.query.get('category')
        search = request.query.get('search')
        
        prompts = prompts_data['prompts']
        
        if category:
            prompts = [p for p in prompts if p.get('category') == category]
        
        if search:
            search_lower = search.lower()
            prompts = [p for p in prompts if 
                      search_lower in p.get('name', '').lower() or
                      search_lower in p.get('positive', '').lower() or
                      search_lower in p.get('description', '').lower()]
        
        return success_response({
            "prompts": prompts,
            "categories": prompts_data.get('categories', []),
            "metadata": prompts_data.get('metadata', {})
        })
    except Exception as e:
        logging.error(f"Error in list_prompts: {e}")
        return error_response(f"Failed to load prompts: {str(e)}", 500)


@route_error_handler
async def get_prompt(request):
    """Get a specific prompt by ID."""
    prompt_id = request.match_info['id']
    sage_users_path = request.app.get('sage_users_path')
    
    if not sage_users_path:
        return error_response("SageUtils user path not configured", 500)
    
    prompts_file = _get_prompts_storage_path(sage_users_path)
    
    if not prompts_file.exists():
        return error_response("Prompt not found", 404)
    
    with open(prompts_file, 'r', encoding='utf-8') as f:
        prompts_data = json.load(f)
    
    prompt = next((p for p in prompts_data['prompts'] if p['id'] == prompt_id), None)
    
    if not prompt:
        return error_response("Prompt not found", 404)
    
    return success_response({"prompt": prompt})


@route_error_handler
async def delete_prompt(request):
    """Delete a specific prompt by ID."""
    prompt_id = request.match_info['id']
    sage_users_path = request.app.get('sage_users_path')
    
    if not sage_users_path:
        return error_response("SageUtils user path not configured", 500)
    
    prompts_file = _get_prompts_storage_path(sage_users_path)
    
    if not prompts_file.exists():
        return error_response("Prompt not found", 404)
    
    with open(prompts_file, 'r', encoding='utf-8') as f:
        prompts_data = json.load(f)
    
    original_count = len(prompts_data['prompts'])
    prompts_data['prompts'] = [p for p in prompts_data['prompts'] if p['id'] != prompt_id]
    
    if len(prompts_data['prompts']) == original_count:
        return error_response("Prompt not found", 404)
    
    # Update metadata
    prompts_data['metadata']['total_prompts'] = len(prompts_data['prompts'])
    prompts_data['metadata']['updated'] = datetime.now().isoformat()
    
    # Save to file
    with open(prompts_file, 'w', encoding='utf-8') as f:
        json.dump(prompts_data, f, indent=2, ensure_ascii=False)
    
    return success_response({"deleted": prompt_id})


@route_error_handler
async def update_prompt_usage(request):
    """Update prompt usage count."""
    prompt_id = request.match_info['id']
    sage_users_path = request.app.get('sage_users_path')
    
    if not sage_users_path:
        return error_response("SageUtils user path not configured", 500)
    
    prompts_file = _get_prompts_storage_path(sage_users_path)
    
    if not prompts_file.exists():
        return error_response("Prompt not found", 404)
    
    with open(prompts_file, 'r', encoding='utf-8') as f:
        prompts_data = json.load(f)
    
    prompt = next((p for p in prompts_data['prompts'] if p['id'] == prompt_id), None)
    
    if not prompt:
        return error_response("Prompt not found", 404)
    
    prompt['used_count'] = prompt.get('used_count', 0) + 1
    prompt['updated'] = datetime.now().isoformat()
    
    # Update metadata
    prompts_data['metadata']['updated'] = datetime.now().isoformat()
    
    # Save to file
    with open(prompts_file, 'w', encoding='utf-8') as f:
        json.dump(prompts_data, f, indent=2, ensure_ascii=False)
    
    return success_response({"prompt": prompt})


def register_routes(routes_instance):
    """
    Register prompt storage routes.
    
    Args:
        routes_instance: The PromptServer routes instance
        
    Returns:
        int: Number of routes registered
    """
    global _route_list
    _route_list.clear()

    @routes_instance.post('/sage_utils/prompts/save')
    async def save_prompt_handler(request):
        return await save_prompt(request)

    @routes_instance.get('/sage_utils/prompts/list')
    async def list_prompts_handler(request):
        return await list_prompts(request)

    @routes_instance.get('/sage_utils/prompts/{id}')
    async def get_prompt_handler(request):
        return await get_prompt(request)

    @routes_instance.delete('/sage_utils/prompts/{id}')
    async def delete_prompt_handler(request):
        return await delete_prompt(request)

    @routes_instance.post('/sage_utils/prompts/{id}/use')
    async def update_prompt_usage_handler(request):
        return await update_prompt_usage(request)

    # Update route list for documentation
    _route_list.extend([
        ('POST', '/sage_utils/prompts/save', 'Save or update a prompt'),
        ('GET', '/sage_utils/prompts/list', 'List all saved prompts'),
        ('GET', '/sage_utils/prompts/{id}', 'Get specific prompt'),
        ('DELETE', '/sage_utils/prompts/{id}', 'Delete specific prompt'),
        ('POST', '/sage_utils/prompts/{id}/use', 'Update prompt usage count'),
    ])

    return len(_route_list)


def get_route_list():
    """Get list of routes for documentation."""
    return _route_list.copy()

"""
Central utilities module for SageUtils nodes.
This module provides explicit imports that replace wildcard imports in nodes.
"""

# Core utilities that are commonly used across nodes
from .helpers import (
    str_to_bool,
    bool_to_str,
    name_from_path,
    get_path_without_base,
    get_file_extension,
    get_files_in_dir,
    get_file_sha256,
    last_used,
    days_since_last_used,
    get_file_modification_date,
    update_cache_from_civitai_json,
    update_cache_without_civitai_json,
    add_file_to_cache,
    recheck_hash,
    update_model_timestamp,
    pull_and_update_model_timestamp,
    pull_metadata,
    lora_to_string,
    lora_to_prompt,
    get_lora_hash,
    model_scan,
    get_model_list,
    get_recently_used_models,
    clean_keywords,
    clean_text,
    clean_if_needed,
    condition_text,
    get_save_file_path,
    unwrap_tuple
)

# Image utilities
from .helpers_image import (
    blank_image,
    url_to_torch_image,
    tensor_to_base64,
    tensor_to_temp_image,
    load_image_from_path,
    load_image_from_url
)

# CivitAI utilities
from .helpers_civitai import (
    get_civitai_model_version_json_by_hash,
    get_civitai_model_version_json_by_id,
    get_civitai_model_json,
    get_model_dict,
    get_latest_model_version,
    pull_lora_image_urls,
    civitai_sampler_name
)

from .helpers_graph import (
    add_ckpt_node_from_info,
    add_unet_node_from_info,
    add_clip_node_from_info,
    add_vae_node_from_info,
    create_model_shift_nodes_v2,
    create_lora_nodes_redux,
    create_lora_nodes_shift_redux,
    add_lora_stack_node
)

# LoRA utilities
from .lora_stack import (
    get_lora_keywords,
    get_lora_stack_keywords,
    add_lora_to_stack
)

# Model info utilities - import function directly to avoid circular dependency
def get_model_types(model_info):
    """Determine which model types are present in model_info."""
    model_types = []

    if not isinstance(model_info, tuple):
        model_info = (model_info,)

    for info in model_info:
        print(f"Checking model info: {info}")
        if isinstance(info, dict) and "type" in info:
            print(f"Model type found: {info['type']}")
            model_types.append(info["type"])
    return model_types

# Path and file management
from .path_manager import path_manager, file_manager

# Model cache
from .model_cache import cache

# Configuration management
from . import config_manager

# Convenience paths from sage_utils
from .sage_utils import (
    sage_users_path,
    sage_backup_path,
    sage_wildcard_path,
    sage_notes_path,
    assets_path,
    get_user_path,
    get_asset_path,
    get_backup_path,
    get_notes_path,
    get_wildcard_path,
    load_json,
    save_json,
    ensure_config_file
)

# LLM wrapper
from . import llm_wrapper as llm

__all__ = [
    # Helper functions
    'str_to_bool', 'bool_to_str', 'name_from_path', 'get_path_without_base', 'get_file_extension', 'get_file_sha256', 
    'get_files_in_dir', 'last_used', 'days_since_last_used', 'get_file_modification_date',
    'update_cache_from_civitai_json', 'update_cache_without_civitai_json',
    'add_file_to_cache', 'recheck_hash', 'pull_metadata', 'update_model_timestamp', 'pull_and_update_model_timestamp',
    'lora_to_string', 'lora_to_prompt', 'get_lora_hash', 'model_scan', 'get_model_list',
    'get_recently_used_models', 'clean_keywords', 'clean_text', 'clean_if_needed', 'condition_text',
    'get_save_file_path', 'unwrap_tuple',
    
    # Image utilities
    'blank_image', 'url_to_torch_image', 'tensor_to_base64', 'tensor_to_temp_image',
    'load_image_from_path', 'load_image_from_url',
    
    # CivitAI utilities
    'get_civitai_model_version_json_by_hash', 'get_civitai_model_version_json_by_id',
    'get_civitai_model_json', 'get_model_dict', 'get_latest_model_version',
    'pull_lora_image_urls', 'civitai_sampler_name',
    
    # Graph utilities
    'add_ckpt_node_from_info', 'add_unet_node_from_info', 'add_clip_node_from_info', 'add_vae_node_from_info',
    'create_lora_nodes_redux', 'create_lora_nodes_shift_redux', 'create_model_shift_nodes_v2',
    'add_lora_stack_node',

    # LoRA utilities
    'get_lora_keywords', 'get_lora_stack_keywords', 'add_lora_to_stack',
    
    # Core objects
    'path_manager', 'file_manager', 'cache', 'config_manager', 'llm',
    
    # Path utilities
    'sage_users_path', 'sage_backup_path', 'sage_wildcard_path', 'sage_notes_path', 'assets_path',
    'get_user_path', 'get_asset_path', 'get_backup_path', 'get_notes_path', 'get_wildcard_path',
    'load_json', 'save_json', 'ensure_config_file'
]

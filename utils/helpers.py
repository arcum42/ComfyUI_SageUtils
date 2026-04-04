"""Compatibility facade for helper utilities.

This module preserves legacy imports while delegating functionality to focused
utility modules.
"""

from .type_utils import str_to_bool, bool_to_str
from .file_utils import (
    name_from_path,
    get_path_without_base,
    get_file_extension,
    has_model_extension,
    get_file_sha256,
    get_files_in_dir,
    last_used,
    days_since_last_used,
    get_file_modification_date,
)
from .lora_utils import lora_to_string, lora_to_prompt, get_lora_hash
from .model_metadata import (
    update_cache_from_civitai_json,
    update_cache_without_civitai_json,
    add_file_to_cache,
    recheck_hash,
    pull_and_update_model_timestamp,
    update_model_timestamp,
    pull_metadata,
)
from .model_discovery import model_scan, grab_model_list, get_model_list
from .prompt_utils import (
    normalize_prompt_weights,
    clean_keywords,
    clean_text,
    clean_if_needed,
    condition_text,
    get_save_file_path,
    unwrap_tuple,
)

__all__ = [
    # Type helpers
    'str_to_bool', 'bool_to_str',
    # File/path helpers
    'name_from_path', 'get_path_without_base', 'get_file_extension', 'has_model_extension',
    'get_file_sha256', 'get_files_in_dir', 'last_used', 'days_since_last_used', 'get_file_modification_date',
    # LoRA helpers
    'lora_to_string', 'lora_to_prompt', 'get_lora_hash',
    # Model discovery helpers
    'model_scan', 'grab_model_list', 'get_model_list',
    # Prompt helpers
    'normalize_prompt_weights', 'clean_keywords', 'clean_text', 'clean_if_needed',
    'condition_text', 'get_save_file_path', 'unwrap_tuple',
    # Metadata/cache helpers
    'update_cache_from_civitai_json', 'update_cache_without_civitai_json', 'add_file_to_cache',
    'recheck_hash', 'pull_and_update_model_timestamp', 'update_model_timestamp', 'pull_metadata',
]


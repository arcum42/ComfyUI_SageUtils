"""Route helpers for LLM operations to avoid frontend-route redundancy."""

import base64
import json
import os
import tempfile
from pathlib import Path
from typing import Any, Optional

from ..logger import get_logger
from ..settings import get_setting
from . import raise_llm_error

logger = get_logger('llm.routes_helpers')


def get_compatible_models(provider: str, model_list: list[str]) -> list[str]:
    """Filter out placeholder unavailable-provider messages from model lists."""
    if not model_list:
        return []
    # Remove placeholder messages that start with '('
    return [m for m in model_list if m and not m.startswith('(')]


def decode_base64_images_to_temp(images_data: list[str]) -> list[str]:
    """Convert base64-encoded images to temporary files, return temp paths."""
    if not isinstance(images_data, list) or not images_data:
        raise_llm_error(
            ValueError,
            'Images must be a non-empty array',
            provider='routes',
            operation='decode_base64_images_to_temp',
        )

    temp_files: list[str] = []
    try:
        for img_b64 in images_data:
            img_bytes = base64.b64decode(img_b64)
            temp_fd, temp_path = tempfile.mkstemp(suffix='.png')
            os.close(temp_fd)
            with open(temp_path, 'wb') as f:
                f.write(img_bytes)
            temp_files.append(temp_path)
        return temp_files
    except Exception as e:
        # Clean up on failure
        for temp_path in temp_files:
            try:
                os.unlink(temp_path)
            except Exception:
                pass
        raise_llm_error(
            ValueError,
            f'Failed to decode images: {str(e)}',
            provider='routes',
            operation='decode_base64_images_to_temp',
            cause=stringify_llm_error(e),
        )
        # This line is unreachable but satisfies return type checker
        return []


def cleanup_temp_files(temp_files: list[str]) -> None:
    """Clean up temporary image files."""
    for temp_path in temp_files:
        try:
            os.unlink(temp_path)
        except Exception as e:
            logger.debug(f'Failed to clean up temp file {temp_path}: {e}')


def load_preset(preset_id: str) -> dict[str, Any]:
    """Load a preset from built-in or user directory."""
    from pathlib import Path
    from ...utils import sage_users_path
    
    # Built-in presets
    builtin_presets = {
        'descriptive_prompt': {
            'provider': 'ollama',
            'model': 'gemma3:12b',
            'promptTemplate': 'description/Descriptive Prompt',
            'systemPrompt': 'e621_prompt_generator',
            'settings': {
                'temperature': 0.7,
                'seed': -1,
                'maxTokens': 512,
                'keepAlive': 300,
            },
        },
        'e621_description': {
            'provider': 'ollama',
            'model': 'gemma3:12b',
            'promptTemplate': 'description/Descriptive Prompt',
            'systemPrompt': 'e621_prompt_generator',
            'settings': {
                'temperature': 0.8,
                'seed': -1,
                'maxTokens': 1024,
                'keepAlive': 300,
            },
        },
        'casual_chat': {
            'provider': 'ollama',
            'model': None,
            'promptTemplate': '',
            'systemPrompt': 'default',
            'settings': {
                'temperature': 0.9,
                'seed': -1,
                'maxTokens': 1024,
                'keepAlive': 300,
            },
        },
    }

    # Check built-in first
    if preset_id in builtin_presets:
        return builtin_presets[preset_id].copy()

    # Check user directory
    user_presets_file = Path(sage_users_path) / 'llm_presets.json'
    if user_presets_file.exists():
        try:
            with open(user_presets_file, 'r', encoding='utf-8') as f:
                custom_presets = json.load(f)
            if preset_id in custom_presets:
                return custom_presets[preset_id].copy()
        except Exception as e:
            logger.warning(f'Failed to load custom presets: {e}')

    raise_llm_error(
        ValueError,
        f"Preset '{preset_id}' not found",
        provider='routes',
        operation='load_preset',
    )
    # Unreachable, but satisfies return type
    return {}


def build_llm_options(provider: str, settings: dict[str, Any]) -> dict[str, Any]:
    """Build provider-specific options from settings."""
    options = {
        'temperature': settings.get('temperature', 0.7),
        'seed': settings.get('seed', -1),
    }

    # Add provider-specific options
    if provider == 'ollama':
        if 'top_k' in settings:
            options['top_k'] = settings['top_k']
        if 'top_p' in settings:
            options['top_p'] = settings['top_p']
        if 'repeat_penalty' in settings:
            options['repeat_penalty'] = settings['repeat_penalty']

    return options


def get_system_prompt_text(
    system_prompt_id: Optional[str],
) -> str:
    """Load system prompt text from built-in or user directory."""
    if not system_prompt_id:
        return ''

    from pathlib import Path
    from ...utils import sage_users_path

    # Built-in prompts
    if system_prompt_id == 'default':
        return 'You are a helpful AI assistant.'

    if system_prompt_id == 'e621_prompt_generator':
        current_dir = Path(__file__).parent.parent
        assets_dir = current_dir / 'assets'
        prompt_file = assets_dir / 'system_prompt.md'

        if prompt_file.exists():
            with open(prompt_file, 'r', encoding='utf-8') as f:
                return f.read()

    # Try user directory
    user_prompts_dir = Path(sage_users_path) / 'llm_system_prompts'
    prompt_file = user_prompts_dir / f'{system_prompt_id}.md'

    if prompt_file.exists():
        with open(prompt_file, 'r', encoding='utf-8') as f:
            return f.read()

    # Return empty if not found (don't raise, allow graceful fallback)
    logger.warning(f'System prompt {system_prompt_id} not found')
    return ''


def get_available_presets_full(
) -> dict[str, dict[str, Any]]:
    """Get all available LLM presets (built-in + custom) with full details."""
    from pathlib import Path
    from ...utils import sage_users_path

    # Built-in presets
    builtin_presets = {
        'descriptive_prompt': {
            'name': 'Descriptive Prompt',
            'description': 'Generate detailed image descriptions',
            'provider': 'ollama',
            'model': 'gemma3:12b',
            'promptTemplate': 'description/Descriptive Prompt',
            'systemPrompt': 'e621_prompt_generator',
            'settings': {
                'temperature': 0.7,
                'seed': -1,
                'maxTokens': 512,
                'keepAlive': 300,
                'includeHistory': False,
            },
            'isBuiltin': True,
            'category': 'description',
        },
        'e621_description': {
            'name': 'E621 Image Description',
            'description': 'Generate E621-style detailed image descriptions',
            'provider': 'ollama',
            'model': 'gemma3:12b',
            'promptTemplate': 'description/Descriptive Prompt',
            'systemPrompt': 'e621_prompt_generator',
            'settings': {
                'temperature': 0.8,
                'seed': -1,
                'maxTokens': 1024,
                'keepAlive': 300,
                'includeHistory': False,
            },
            'isBuiltin': True,
            'category': 'description',
        },
        'casual_chat': {
            'name': 'Casual Chat',
            'description': 'Friendly conversational assistant',
            'provider': 'ollama',
            'model': None,
            'promptTemplate': '',
            'systemPrompt': 'default',
            'settings': {
                'temperature': 0.9,
                'seed': -1,
                'maxTokens': 1024,
                'keepAlive': 300,
                'includeHistory': True,
                'maxHistoryMessages': 10,
            },
            'isBuiltin': True,
            'category': 'chat',
        },
    }

    # Start with built-in presets
    all_presets = builtin_presets.copy()

    # Load custom presets and overrides from user directory
    user_presets_file = Path(sage_users_path) / 'llm_presets.json'
    if user_presets_file.exists():
        try:
            with open(user_presets_file, 'r', encoding='utf-8') as f:
                custom_presets = json.load(f)

            # Override built-ins or add custom presets
            for preset_id, preset_data in custom_presets.items():
                all_presets[preset_id] = preset_data
        except Exception as e:
            logger.warning(f'Failed to load custom presets: {e}')

    return all_presets


def validate_request_fields(
    data: dict[str, Any], required_fields: list[str], request_context: str = 'request'
) -> tuple[bool, Optional[str]]:
    """
    Validate that required fields exist in request data.
    
    Args:
        data: Request data dict
        required_fields: List of required field names
        request_context: Context string for error messages
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    missing = [f for f in required_fields if f not in data]
    if missing:
        return False, f"Missing required fields in {request_context}: {', '.join(missing)}"
    return True, None


def validate_provider(provider: str) -> tuple[bool, Optional[str]]:
    """
    Validate that provider is supported.
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if provider not in ['ollama', 'lmstudio']:
        return False, f"Invalid provider: {provider}. Must be 'ollama' or 'lmstudio'"
    return True, None


def format_sse_chunk(chunk_data: dict[str, Any]) -> str:
    """Format a data chunk as Server-Sent Events (SSE) format."""
    return f"data: {json.dumps(chunk_data)}\n\n"


def validate_vision_data(
    data: dict[str, Any],
) -> tuple[bool, Optional[str]]:
    """
    Validate vision request data (provider, model, prompt, images).
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check required fields
    is_valid, error_msg = validate_request_fields(
        data, ['provider', 'model', 'prompt', 'images'], 'vision request'
    )
    if not is_valid:
        return False, error_msg

    # Validate provider
    is_valid, error_msg = validate_provider(data['provider'].lower())
    if not is_valid:
        return False, error_msg

    # Validate images
    images_data = data.get('images', [])
    if not images_data or not isinstance(images_data, list):
        return False, 'Images must be a non-empty array'

    return True, None


def validate_generation_data(
    data: dict[str, Any],
) -> tuple[bool, Optional[str]]:
    """
    Validate non-streaming generation request data (provider, model, prompt).
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check required fields
    is_valid, error_msg = validate_request_fields(
        data, ['provider', 'model', 'prompt'], 'generation request'
    )
    if not is_valid:
        return False, error_msg

    # Validate provider
    is_valid, error_msg = validate_provider(data['provider'].lower())
    if not is_valid:
        return False, error_msg

    return True, None

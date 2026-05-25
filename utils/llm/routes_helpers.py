"""Route helpers for LLM operations to avoid frontend-route redundancy."""

import base64
import json
import os
import tempfile
from pathlib import Path
from typing import Any, Optional

from ..logger import get_logger
from ..settings import get_setting
from . import llm_raise

logger = get_logger('llm.routes_helpers')


_BUILTIN_TOOL_PROFILES: dict[str, list[dict[str, Any]]] = {
    'none': [],
    'sage_core': [
        {
            'type': 'function',
            'function': {
                'name': 'sage.get_time',
                'description': 'Return current local or UTC time.',
                'parameters': {
                    'type': 'object',
                    'properties': {
                        'utc': {'type': 'boolean'},
                    },
                },
            },
        },
        {
            'type': 'function',
            'function': {
                'name': 'sage.echo',
                'description': 'Echo text back to the model.',
                'parameters': {
                    'type': 'object',
                    'properties': {
                        'text': {'type': 'string'},
                    },
                    'required': ['text'],
                },
            },
        },
        {
            'type': 'function',
            'function': {
                'name': 'sage.notes.list',
                'description': 'List notes files under SageUtils user notes directory.',
                'parameters': {
                    'type': 'object',
                    'properties': {
                        'limit': {'type': 'integer', 'minimum': 1, 'maximum': 200},
                    },
                },
            },
        },
        {
            'type': 'function',
            'function': {
                'name': 'sage.notes.read',
                'description': 'Read a note by filename from SageUtils notes directory.',
                'parameters': {
                    'type': 'object',
                    'properties': {
                        'filename': {'type': 'string'},
                        'max_chars': {'type': 'integer', 'minimum': 1, 'maximum': 20000},
                    },
                    'required': ['filename'],
                },
            },
        },
        {
            'type': 'function',
            'function': {
                'name': 'sage.notes.search',
                'description': 'Search notes content for a query string.',
                'parameters': {
                    'type': 'object',
                    'properties': {
                        'query': {'type': 'string'},
                        'limit': {'type': 'integer', 'minimum': 1, 'maximum': 100},
                    },
                    'required': ['query'],
                },
            },
        },
        {
            'type': 'function',
            'function': {
                'name': 'sage.prompts.list',
                'description': 'List saved prompt entries.',
                'parameters': {
                    'type': 'object',
                    'properties': {
                        'category': {'type': 'string'},
                        'limit': {'type': 'integer', 'minimum': 1, 'maximum': 200},
                    },
                },
            },
        },
        {
            'type': 'function',
            'function': {
                'name': 'sage.prompts.get',
                'description': 'Get one saved prompt by id.',
                'parameters': {
                    'type': 'object',
                    'properties': {
                        'id': {'type': 'string'},
                    },
                    'required': ['id'],
                },
            },
        },
        {
            'type': 'function',
            'function': {
                'name': 'sage.prompts.search',
                'description': 'Search saved prompts by text.',
                'parameters': {
                    'type': 'object',
                    'properties': {
                        'query': {'type': 'string'},
                        'limit': {'type': 'integer', 'minimum': 1, 'maximum': 100},
                    },
                    'required': ['query'],
                },
            },
        },
        {
            'type': 'function',
            'function': {
                'name': 'sage.workflow.read_latest',
                'description': 'Read the most recently modified workflow JSON from ComfyUI user workflows directory.',
                'parameters': {
                    'type': 'object',
                    'properties': {
                        'max_chars': {'type': 'integer', 'minimum': 1, 'maximum': 200000},
                    },
                },
            },
        },
    ],
}

_BUILTIN_MCP_PROFILES: dict[str, list[dict[str, Any]]] = {
    'none': [],
}


def _load_json_file_if_exists(path: Path) -> dict[str, Any]:
    if not path.exists() or not path.is_file():
        return {}
    try:
        with path.open('r', encoding='utf-8') as handle:
            data = json.load(handle)
        return data if isinstance(data, dict) else {}
    except Exception as e:
        logger.warning(f'Failed to load profile file {path}: {e}')
        return {}


def _get_profile_registry() -> dict[str, dict[str, list[dict[str, Any]]]]:
    from ...utils.path_manager import path_manager

    asset_path = path_manager.assets_path / 'llm_integration_profiles.json'
    user_path = path_manager.sage_users_path / 'llm_integration_profiles.json'

    asset_data = _load_json_file_if_exists(asset_path)
    user_data = _load_json_file_if_exists(user_path)

    tool_profiles: dict[str, list[dict[str, Any]]] = dict(_BUILTIN_TOOL_PROFILES)
    mcp_profiles: dict[str, list[dict[str, Any]]] = dict(_BUILTIN_MCP_PROFILES)

    for source in (asset_data, user_data):
        source_tool_profiles = source.get('tool_profiles')
        if isinstance(source_tool_profiles, dict):
            for profile_name, profile_value in source_tool_profiles.items():
                if isinstance(profile_value, list):
                    tool_profiles[str(profile_name)] = profile_value

        source_mcp_profiles = source.get('mcp_profiles')
        if isinstance(source_mcp_profiles, dict):
            for profile_name, profile_value in source_mcp_profiles.items():
                if isinstance(profile_value, list):
                    mcp_profiles[str(profile_name)] = profile_value

    return {
        'tool_profiles': tool_profiles,
        'mcp_profiles': mcp_profiles,
    }


def get_integration_profiles() -> dict[str, Any]:
    """Return integration profile metadata for frontend selectors."""
    registry = _get_profile_registry()

    tool_profiles = registry.get('tool_profiles', {})
    mcp_profiles = registry.get('mcp_profiles', {})

    return {
        'tool_profiles': {
            name: {
                'entry_count': len(entries) if isinstance(entries, list) else 0,
            }
            for name, entries in tool_profiles.items()
        },
        'mcp_profiles': {
            name: {
                'entry_count': len(entries) if isinstance(entries, list) else 0,
            }
            for name, entries in mcp_profiles.items()
        },
        'defaults': {
            'tool_profile': 'none',
            'mcp_profile': 'none',
        }
    }


def _resolve_profile_entries(
    profile_name: Optional[str],
    profile_map: dict[str, list[dict[str, Any]]],
    profile_kind: str,
) -> list[dict[str, Any]]:
    normalized = (profile_name or 'none').strip() or 'none'
    entries = profile_map.get(normalized)
    if isinstance(entries, list):
        return entries

    logger.warning(f"Unknown {profile_kind} profile '{normalized}', defaulting to empty")
    return []


def normalize_provider(provider: str) -> str:
    """Normalize provider aliases to canonical backend keys."""
    normalized = (provider or '').strip().lower()
    alias_map = {
        'lmstudio': 'lmstudio_rest',
        'ollama': 'ollama_rest',
    }
    return alias_map.get(normalized, normalized)


def get_compatible_models(provider: str, model_list: list[str]) -> list[str]:
    """Filter out placeholder unavailable-provider messages from model lists."""
    if not model_list:
        return []
    # Remove placeholder messages that start with '('
    return [m for m in model_list if m and not m.startswith('(')]


def decode_base64_images_to_temp(images_data: list[str]) -> list[str]:
    """Convert base64-encoded images to temporary files, return temp paths."""
    if not isinstance(images_data, list) or not images_data:
        llm_raise(
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
        llm_raise(
            ValueError,
            f'Failed to decode images: {str(e)}',
            provider='routes',
            operation='decode_base64_images_to_temp',
            cause=e,
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
            'provider': 'lmstudio_rest',
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
            'provider': 'lmstudio_rest',
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
            'provider': 'lmstudio_rest',
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

    llm_raise(
        ValueError,
        f"Preset '{preset_id}' not found",
        provider='routes',
        operation='load_preset',
    )
    # Unreachable, but satisfies return type
    return {}


def build_llm_options(provider: str, settings: dict[str, Any]) -> dict[str, Any]:
    """Build provider-specific options from settings."""
    provider = normalize_provider(provider)
    options = {
        'temperature': settings.get('temperature', 0.7),
        'seed': settings.get('seed', -1),
    }

    # Add provider-specific options
    if provider == 'ollama_rest':
        if 'top_k' in settings:
            options['top_k'] = settings['top_k']
        if 'top_p' in settings:
            options['top_p'] = settings['top_p']
        if 'repeat_penalty' in settings:
            options['repeat_penalty'] = settings['repeat_penalty']
        if 'num_ctx' in settings:
            options['num_ctx'] = settings['num_ctx']
        if 'think' in settings:
            options['think'] = settings['think']
        if 'tools' in settings and isinstance(settings.get('tools'), list):
            options['tools'] = settings['tools']

    if provider == 'lmstudio_rest':
        if 'context_length' in settings:
            options['context_length'] = settings['context_length']
        if 'reasoning' in settings:
            options['reasoning'] = settings['reasoning']
        if 'integrations' in settings and isinstance(settings.get('integrations'), list):
            options['integrations'] = settings['integrations']

    return options


def build_generation_payload_options(provider: str, data: dict[str, Any]) -> dict[str, Any]:
    """Build request options from incoming route payload with provider-specific normalization."""
    provider = normalize_provider(provider)
    options_data = data.get('options')
    options = options_data if isinstance(options_data, dict) else {}
    result: dict[str, Any] = dict(options)

    def _first_value(*keys: str):
        for key in keys:
            if key in data and data.get(key) is not None:
                return data.get(key)
            if key in result and result.get(key) is not None:
                return result.get(key)
        return None

    # Context length
    context_length = _first_value('context_length', 'contextLength')
    if context_length is not None:
        if provider == 'lmstudio_rest':
            result['context_length'] = context_length
        elif provider == 'ollama_rest':
            result['num_ctx'] = context_length

    # Reasoning/thinking controls
    reasoning_value = _first_value('reasoning', 'reasoning_level', 'reasoningLevel')
    reasoning_enabled = _first_value('reasoning_enabled', 'reasoningEnabled')
    if provider == 'lmstudio_rest':
        # Remove any unvalidated incoming reasoning value from options payload.
        result.pop('reasoning', None)

        resolved_reasoning: Any = None
        if reasoning_value is not None:
            if isinstance(reasoning_value, bool):
                resolved_reasoning = 'on' if reasoning_value else 'off'
            elif isinstance(reasoning_value, str):
                normalized = reasoning_value.strip().lower()
                if normalized in {'on', 'off', 'low', 'medium', 'high'}:
                    resolved_reasoning = normalized
            elif isinstance(reasoning_enabled, bool):
                resolved_reasoning = 'on' if reasoning_enabled else 'off'
        elif isinstance(reasoning_enabled, bool):
            resolved_reasoning = 'on' if reasoning_enabled else 'off'

        if resolved_reasoning is not None:
            result['reasoning'] = resolved_reasoning
    elif provider == 'ollama_rest':
        if reasoning_value is not None:
            value = str(reasoning_value).strip().lower() if isinstance(reasoning_value, str) else reasoning_value
            if value == 'on':
                result['think'] = True
            elif value == 'off':
                result['think'] = False
            else:
                result['think'] = reasoning_value
        elif isinstance(reasoning_enabled, bool):
            result['think'] = reasoning_enabled

    # Tool and MCP toggles
    tools_enabled = _first_value('tools_enabled', 'toolsEnabled')
    mcp_enabled = _first_value('mcp_enabled', 'mcpEnabled')
    tool_profile = _first_value('tool_profile', 'toolProfile')
    mcp_profile = _first_value('mcp_profile', 'mcpProfile')

    profile_registry = _get_profile_registry()

    tools_payload = _first_value('tools')
    if tools_enabled is False:
        result.pop('tools', None)
    elif isinstance(tools_payload, list):
        result['tools'] = tools_payload
    elif tools_enabled is True:
        resolved_tools = _resolve_profile_entries(tool_profile if isinstance(tool_profile, str) else None, profile_registry['tool_profiles'], 'tool')
        if resolved_tools:
            result['tools'] = resolved_tools

    integrations_payload = _first_value('integrations')
    if mcp_enabled is False:
        result.pop('integrations', None)
    elif isinstance(integrations_payload, list):
        result['integrations'] = integrations_payload
    elif mcp_enabled is True and provider == 'lmstudio_rest':
        resolved_integrations = _resolve_profile_entries(mcp_profile if isinstance(mcp_profile, str) else None, profile_registry['mcp_profiles'], 'mcp')
        if resolved_integrations:
            result['integrations'] = resolved_integrations

    return result


def validate_generation_payload_options(provider: str, data: dict[str, Any]) -> tuple[bool, Optional[str]]:
    """Validate provider-specific generation options before dispatch."""
    provider = normalize_provider(provider)

    if provider != 'lmstudio_rest':
        return True, None

    raw_options = data.get('options')
    options_data: dict[str, Any] = raw_options if isinstance(raw_options, dict) else {}

    reasoning_value = None
    for key in ('reasoning', 'reasoning_level', 'reasoningLevel'):
        if key in data and data.get(key) is not None:
            reasoning_value = data.get(key)
            break
        if key in options_data and options_data.get(key) is not None:
            reasoning_value = options_data.get(key)
            break

    if reasoning_value is None:
        return True, None

    if isinstance(reasoning_value, bool):
        return True, None

    if isinstance(reasoning_value, str):
        normalized = reasoning_value.strip().lower()
        if normalized in {'off', 'low', 'medium', 'high', 'on'}:
            return True, None
        return False, (
            f"Invalid LM Studio reasoning value '{reasoning_value}'. "
            "Expected one of: off, low, medium, high, on."
        )

    return False, (
        f"Invalid LM Studio reasoning type '{type(reasoning_value).__name__}'. "
        "Expected string or boolean."
    )


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
            'provider': 'lmstudio_rest',
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
            'provider': 'lmstudio_rest',
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
            'provider': 'lmstudio_rest',
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
    provider = normalize_provider(provider)
    if provider not in ['lmstudio_rest', 'ollama_rest', 'openai', 'native']:
        return False, f"Invalid provider: {provider}. Must be 'lmstudio', 'ollama', 'openai', or 'native'"
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
    is_valid, error_msg = validate_provider(normalize_provider(data['provider']))
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
    is_valid, error_msg = validate_provider(normalize_provider(data['provider']))
    if not is_valid:
        return False, error_msg

    return True, None


def check_model_vision_capability(provider: str, model: str) -> tuple[bool, Optional[str]]:
    """
    Check if a model supports vision capability before attempting vision operations.
    
    Args:
        provider: Provider name (e.g., 'ollama', 'lmstudio', 'openai')
        model: Model name
        
    Returns:
        Tuple of (supports_vision, error_message)
        - If supports_vision is True, error_message is None
        - If supports_vision is False, error_message describes why
    """
    provider = normalize_provider(provider)
    
    try:
        from . import service as llm
        # Ensure LLM services are initialized
        llm.ensure_llm_initialized()
        
        # Get capability map for the provider
        if provider == 'lmstudio_rest':
            cap_map = llm.get_lmstudio_rest_model_capabilities_map()
        elif provider == 'ollama_rest':
            cap_map = llm.get_ollama_rest_model_capabilities_map()
        elif provider == 'openai':
            cap_map = llm.get_openai_model_capabilities_map()
        else:
            return False, f"Unknown provider: {provider}"
        
        # Check if model exists and supports vision
        if not cap_map:
            return False, f"No capability data available for {provider}"
        
        if model not in cap_map:
            available = ', '.join(sorted(cap_map.keys())[:5])
            return False, f"Model '{model}' not found in {provider}. Available: {available}..."
        
        capabilities = cap_map[model]
        if not capabilities.get('vision', False):
            return False, f"Model '{model}' does not support vision capability on provider {provider}"
        
        return True, None
        
    except Exception as e:
        logger.warning(f'Error checking vision capability for {provider}:{model}: {e}')
        # Degrade gracefully. If we can't check, allow the attempt.
        return True, None

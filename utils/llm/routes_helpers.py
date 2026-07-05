"""Route helpers for LLM operations to avoid frontend-route redundancy."""

import base64
import json
import os
import tempfile
from contextvars import ContextVar
from pathlib import Path
from typing import Any, Optional

from ..logger import get_logger
from aiohttp import web
from ..settings import get_setting
from ..config_manager import llm_prompts
from . import llm_raise, presets, service as llm, system_prompts
from .provider_keys import (
    LMSTUDIO_REST_KEY,
    NATIVE_KEY,
    OLLAMA_REST_KEY,
    OPENAI_KEY,
    normalize_provider_key,
)

logger = get_logger('llm.routes_helpers')
_last_llm_error = ContextVar('sageutils_last_llm_error', default=None)


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
    return normalize_provider_key(provider)


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
    try:
        return presets.load_preset(preset_id)
    except ValueError as e:
        llm_raise(
            ValueError,
            str(e),
            provider='routes',
            operation='load_preset',
            cause=e,
        )

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


def resolve_preset_prompt_text(preset: dict[str, Any], prompt_override: str | None = None) -> str:
    """Resolve a preset prompt text from override or prompt template metadata."""
    if prompt_override:
        return prompt_override

    template_path = preset.get('promptTemplate')
    if not template_path or '/' not in str(template_path):
        return ''

    category, template_name = str(template_path).split('/', 1)
    for template in llm_prompts.get('base', {}).values():
        if template.get('category') == category and template.get('name') == template_name:
            return template.get('prompt', '') or ''

    return ''


def resolve_preset_system_prompt_text(preset: dict[str, Any], system_prompt_override: str | None = None) -> str:
    """Resolve a preset system prompt from override or preset metadata."""
    if system_prompt_override:
        return system_prompt_override

    system_prompt_id = preset.get('systemPrompt')
    if not system_prompt_id:
        return ''

    return get_system_prompt_text(system_prompt_id)


def build_preset_generation_options(
    provider: str,
    preset_settings: dict[str, Any],
    settings_override: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build options for a preset generation request."""
    merged_settings = dict(preset_settings or {})
    if isinstance(settings_override, dict):
        merged_settings.update(settings_override)
    return build_llm_options(provider, merged_settings)


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


def parse_generation_request(
    data: dict[str, Any],
    request_context: str = 'generation',
) -> tuple[bool, Optional[str], dict[str, Any]]:
    """Parse and validate a generic generation request payload."""
    is_valid, error_msg = validate_generation_data(data)
    if not is_valid:
        return False, error_msg, {}

    provider = normalize_provider(data['provider'])
    is_valid, error_msg = validate_generation_payload_options(provider, data)
    if not is_valid:
        return False, error_msg, {}

    payload = {
        'provider': provider,
        'model': data['model'],
        'prompt': data['prompt'],
        'system_prompt': data.get('system_prompt', ''),
        'options': build_generation_payload_options(provider, data),
    }
    return True, None, payload


def parse_vision_generation_request(
    data: dict[str, Any],
    request_context: str = 'vision',
) -> tuple[bool, Optional[str], dict[str, Any]]:
    """Parse and validate a vision generation request payload."""
    is_valid, error_msg = validate_vision_data(data)
    if not is_valid:
        return False, error_msg, {}

    provider = normalize_provider(data['provider'])
    is_valid, error_msg = validate_generation_payload_options(provider, data)
    if not is_valid:
        return False, error_msg, {}

    payload = {
        'provider': provider,
        'model': data['model'],
        'prompt': data['prompt'],
        'images': data['images'],
        'system_prompt': data.get('system_prompt', ''),
        'options': build_generation_payload_options(provider, data),
    }
    return True, None, payload


def parse_load_model_request(
    data: dict[str, Any],
) -> tuple[bool, Optional[str], dict[str, Any]]:
    """Parse and validate a load-model request payload."""
    is_valid, error_msg = validate_request_fields(data, ['provider', 'model'], 'load model request')
    if not is_valid:
        return False, error_msg, {}

    provider = normalize_provider(data['provider'])
    is_valid, error_msg = validate_provider(provider)
    if not is_valid:
        return False, error_msg, {}

    def _first_value(*keys: str):
        for key in keys:
            if key in data and data.get(key) is not None:
                return data.get(key)
        return None

    payload = {
        'provider': provider,
        'model': data['model'],
        'keep_alive': data.get('keep_alive', 60),
    }

    options: dict[str, Any] = {}
    context_length = _first_value('context_length', 'contextLength')
    if context_length is not None:
        options['context_length'] = context_length

    num_ctx = _first_value('num_ctx', 'numCtx')
    if num_ctx is not None:
        options['num_ctx'] = num_ctx

    if isinstance(data.get('options'), dict):
        options.update(data['options'])

    if options:
        payload['options'] = options

    return True, None, payload


def parse_system_prompt_save_request(
    data: dict[str, Any],
) -> tuple[bool, Optional[str], dict[str, Any]]:
    """Parse and validate a system prompt save request payload."""
    is_valid, error_msg = validate_request_fields(data, ['id', 'name', 'content'], 'system prompt save request')
    if not is_valid:
        return False, error_msg, {}

    payload = {
        'id': data['id'],
        'name': data['name'],
        'content': data['content'],
        'description': data.get('description', ''),
    }
    return True, None, payload


def parse_system_prompt_delete_request(
    data: dict[str, Any],
) -> tuple[bool, Optional[str], dict[str, Any]]:
    """Parse and validate a system prompt delete request payload."""
    is_valid, error_msg = validate_request_fields(data, ['id'], 'system prompt delete request')
    if not is_valid:
        return False, error_msg, {}

    return True, None, {'id': data['id']}


def parse_preset_save_request(
    data: dict[str, Any],
) -> tuple[bool, Optional[str], dict[str, Any]]:
    """Parse and validate a preset save request payload."""
    is_valid, error_msg = validate_request_fields(data, ['id', 'preset'], 'preset save request')
    if not is_valid:
        return False, error_msg, {}

    payload = {
        'id': data['id'],
        'preset': data['preset'],
    }
    return True, None, payload


def parse_preset_delete_request(
    data: dict[str, Any],
) -> tuple[bool, Optional[str], dict[str, Any]]:
    """Parse and validate a preset delete request payload."""
    is_valid, error_msg = validate_request_fields(data, ['id'], 'preset delete request')
    if not is_valid:
        return False, error_msg, {}

    return True, None, {'id': data['id']}


def parse_preset_image_generation_request(
    data: dict[str, Any],
) -> tuple[bool, Optional[str], dict[str, Any]]:
    """Parse and validate an image preset generation request payload."""
    is_valid, error_msg = validate_request_fields(data, ['preset_id', 'images'], 'preset generation request')
    if not is_valid:
        return False, error_msg, {}

    images = data['images']
    if not isinstance(images, list) or not images:
        return False, 'Images must be a non-empty array', {}

    payload = {
        'preset_id': data['preset_id'],
        'images': images,
        'prompt_override': data.get('prompt_override'),
        'system_prompt_override': data.get('system_prompt_override'),
        'settings_override': data.get('settings_override', {}),
    }
    return True, None, payload


def get_system_prompt_text(
    system_prompt_id: Optional[str],
) -> str:
    """Load system prompt text from built-in or user directory."""
    if not system_prompt_id:
        return ''

    return system_prompts.get_system_prompt_text(system_prompt_id)


def get_available_presets_full(
) -> dict[str, dict[str, Any]]:
    """Get all available LLM presets (built-in + custom) with full details."""
    return presets.get_all_presets_full()


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
    if provider not in [LMSTUDIO_REST_KEY, OLLAMA_REST_KEY, OPENAI_KEY, NATIVE_KEY]:
        return False, f"Invalid provider: {provider}. Must be 'lmstudio', 'ollama', 'openai', or 'native'"
    return True, None


def get_provider_availability_error(
    provider: str,
    operation: str,
) -> tuple[bool, Optional[str], Optional[str], Optional[int]]:
    """Return a standardized provider availability error tuple if unavailable."""
    provider = normalize_provider(provider)

    if provider == NATIVE_KEY:
        if not llm.is_provider_available(provider, force=True):
            return False, 'Native CLIP provider is not available', 'LLM_PROVIDER_UNAVAILABLE', 503
        return True, None, None, None

    if provider in {LMSTUDIO_REST_KEY, OLLAMA_REST_KEY, OPENAI_KEY}:
        if not llm.is_provider_available(provider, force=True):
            provider_name = provider.replace('_', ' ').title()
            return False, f'{provider_name} is not available', 'LLM_PROVIDER_UNAVAILABLE', 503
        return True, None, None, None

    return False, f'Invalid provider: {provider}', 'LLM_INVALID_PROVIDER', 400


def validate_native_model_availability(
    provider: str,
    model: str,
    operation: str | None = None,
) -> tuple[bool, Optional[str], Optional[str], Optional[int]]:
    """Validate that a native CLIP model is available."""
    provider = normalize_provider(provider)
    if provider != NATIVE_KEY:
        return True, None, None, None

    if not llm.is_native_model_available(model):
        return False, f"Native CLIP model '{model}' is not available", 'LLM_MODEL_NOT_FOUND', 404
    return True, None, None, None


def get_provider_and_native_error(
    provider: str,
    model: str,
    operation: str,
) -> tuple[bool, Optional[str], Optional[str], Optional[int]]:
    """Validate provider availability and native model selection in one check."""
    is_available, error_msg, error_code, status_code = get_provider_availability_error(
        provider,
        operation,
    )
    if not is_available:
        return is_available, error_msg, error_code, status_code

    return validate_native_model_availability(provider, model, operation)


def format_sse_chunk(chunk_data: dict[str, Any]) -> str:
    """Format a data chunk as Server-Sent Events (SSE) format."""
    return f"data: {json.dumps(chunk_data)}\n\n"


def format_sse_error_chunk(
    message: str,
    *,
    error_code: str = 'LLM_STREAM_ERROR',
    provider: str | None = None,
    operation: str | None = None,
    cause: str | None = None,
) -> str:
    """Create a standardized SSE error chunk payload."""
    payload = {
        'error': message,
        'error_code': error_code,
        'done': True,
    }
    if provider:
        payload['provider'] = provider
    if operation:
        payload['operation'] = operation
    if cause:
        payload['cause'] = cause
    return format_sse_chunk(payload)


async def write_sse_error_and_close(
    response: web.StreamResponse,
    message: str,
    *,
    error_code: str = 'LLM_STREAM_ERROR',
    provider: str | None = None,
    operation: str | None = None,
    cause: str | None = None,
) -> None:
    """Write an SSE error chunk and close the stream."""
    await response.write(format_sse_error_chunk(
        message,
        error_code=error_code,
        provider=provider,
        operation=operation,
        cause=cause,
    ).encode('utf-8'))
    await response.write_eof()


def set_last_llm_error(payload: Any) -> None:
    """Store the last structured LLM error payload for route error handling."""
    _last_llm_error.set(payload)


def clear_last_llm_error() -> None:
    """Clear any stale LLM error payload before route handling."""
    _last_llm_error.set(None)


def pop_last_llm_error() -> Any:
    """Retrieve and clear the last structured LLM error payload."""
    payload = _last_llm_error.get()
    _last_llm_error.set(None)
    return payload


def build_error_payload(
    message: str,
    *,
    error_code: str = 'LLM_ERROR',
    provider: str | None = None,
    operation: str | None = None,
    cause: str | None = None,
) -> dict[str, Any]:
    payload = {
        'success': False,
        'error': message,
        'error_code': error_code,
    }
    if provider:
        payload['provider'] = provider
    if operation:
        payload['operation'] = operation
    if cause:
        payload['cause'] = cause
    return payload


def error_response(
    message: str,
    status: int = 500,
    *,
    error_code: str = 'LLM_ERROR',
    provider: str | None = None,
    operation: str | None = None,
    cause: str | None = None,
) -> web.Response:
    return web.json_response(
        build_error_payload(
            message,
            error_code=error_code,
            provider=provider,
            operation=operation,
            cause=cause,
        ),
        status=status,
    )


def error_response_from_exception(
    prefix: str,
    exc: Exception,
    status: int = 500,
    default_error_code: str = 'LLM_ROUTE_ERROR',
) -> web.Response:
    payload = pop_last_llm_error()
    if payload:
        message = payload.get('scoped_message') or payload.get('message') or f'{prefix}: {str(exc)}'
        error_type = str(payload.get('error_type', 'ERROR')).upper()
        return error_response(
            message,
            status=status,
            error_code=f'LLM_{error_type}',
            provider=payload.get('provider'),
            operation=payload.get('operation'),
            cause=payload.get('cause'),
        )

    return error_response(
        f'{prefix}: {str(exc)}',
        status=status,
        error_code=default_error_code,
    )


async def write_sse_error_from_exception(
    response: web.StreamResponse,
    exc: Exception,
    operation: str,
    prefix: str = 'Stream error',
    default_error_code: str = 'LLM_STREAM_ERROR',
) -> None:
    payload = pop_last_llm_error()
    if payload:
        message = str(payload.get('scoped_message') or payload.get('message') or f'{prefix}: {str(exc)}')
        error_type = str(payload.get('error_type', 'STREAM_ERROR')).upper()
        await write_sse_error_and_close(
            response,
            message,
            error_code=f'LLM_{error_type}',
            provider=payload.get('provider'),
            operation=payload.get('operation') or operation,
            cause=payload.get('cause'),
        )
        return

    await write_sse_error_and_close(
        response,
        f'{prefix}: {str(exc)}',
        error_code=default_error_code,
        operation=operation,
    )


async def write_provider_and_native_error_if_unavailable(
    response: web.StreamResponse,
    provider: str,
    model: str,
    operation: str,
) -> bool:
    """Write a shared SSE error chunk for provider or native model availability failures."""
    is_valid, error_msg, error_code, status_code = get_provider_and_native_error(
        provider,
        model,
        operation,
    )
    if not is_valid:
        await write_sse_error_and_close(
            response,
            str(error_msg or 'Provider or model unavailable'),
            error_code=error_code or 'LLM_PROVIDER_UNAVAILABLE',
            provider=provider,
            operation=operation,
        )
        return True
    return False


async def prepare_sse_response(request: web.Request) -> web.StreamResponse:
    """Prepare a streaming SSE response with the required headers."""
    response = web.StreamResponse()
    response.headers['Content-Type'] = 'text/event-stream'
    response.headers['Cache-Control'] = 'no-cache'
    response.headers['Connection'] = 'keep-alive'
    await response.prepare(request)
    return response


async def stream_sse_chunks(response: web.StreamResponse, chunk_iterable):
    """Write SSE-formatted chunks to the response and close the stream."""
    for chunk_data in chunk_iterable:
        await response.write(format_sse_chunk(chunk_data).encode('utf-8'))
    await response.write_eof()


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
    """
    provider = normalize_provider(provider)
    return llm.is_model_vision_capable(provider, model)

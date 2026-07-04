"""LLM system prompt persistence and built-in system prompt management."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from ..logger import get_logger
from ..sage_utils import sage_users_path

logger = get_logger('llm.system_prompts')

_BUILTIN_SYSTEM_PROMPTS: dict[str, str] = {
    'default': 'You are a helpful AI assistant.',
}

_BUILTIN_ASSET_PROMPTS: dict[str, str] = {
    'e621_prompt_generator': 'system_prompt.md',
}


def _user_prompts_dir() -> Path:
    return Path(sage_users_path) / 'llm_system_prompts'


def _metadata_file() -> Path:
    return _user_prompts_dir() / '_metadata.json'


def _load_metadata() -> dict[str, Any]:
    metadata_file = _metadata_file()
    if not metadata_file.exists():
        return {}
    try:
        with metadata_file.open('r', encoding='utf-8') as handle:
            data = json.load(handle)
        return data if isinstance(data, dict) else {}
    except Exception as e:
        logger.warning(f'Failed to load system prompt metadata: {e}')
        return {}


def _save_metadata(metadata: dict[str, Any]) -> None:
    metadata_file = _metadata_file()
    metadata_file.parent.mkdir(parents=True, exist_ok=True)
    with metadata_file.open('w', encoding='utf-8') as handle:
        json.dump(metadata, handle, indent=2)


def get_system_prompt_text(system_prompt_id: str) -> str:
    """Load built-in or user-defined system prompt text."""
    if not system_prompt_id:
        return ''

    if system_prompt_id in _BUILTIN_SYSTEM_PROMPTS:
        return _BUILTIN_SYSTEM_PROMPTS[system_prompt_id]

    if system_prompt_id in _BUILTIN_ASSET_PROMPTS:
        current_dir = Path(__file__).resolve().parents[2]
        assets_dir = current_dir / 'assets'
        prompt_file = assets_dir / _BUILTIN_ASSET_PROMPTS[system_prompt_id]
        if prompt_file.exists():
            try:
                with prompt_file.open('r', encoding='utf-8') as handle:
                    return handle.read()
            except Exception as e:
                logger.warning(f'Failed to load builtin system prompt {system_prompt_id}: {e}')
                return ''
        logger.warning(f'Builtin system prompt asset not found: {prompt_file}')
        return ''

    prompt_file = _user_prompts_dir() / f'{system_prompt_id}.md'
    if prompt_file.exists():
        try:
            with prompt_file.open('r', encoding='utf-8') as handle:
                return handle.read()
        except Exception as e:
            logger.warning(f'Failed to load system prompt {system_prompt_id}: {e}')
            return ''

    logger.warning(f'System prompt {system_prompt_id} not found')
    return ''


def save_system_prompt(prompt_id: str, name: str, content: str, description: str = '') -> dict[str, Any]:
    """Save a custom system prompt."""
    if not prompt_id or not name or not content:
        raise ValueError('prompt_id, name, and content are required')

    user_dir = _user_prompts_dir()
    user_dir.mkdir(parents=True, exist_ok=True)

    prompt_file = user_dir / f'{prompt_id}.md'
    with prompt_file.open('w', encoding='utf-8') as handle:
        handle.write(content)

    metadata = _load_metadata()
    now = __import__('datetime').datetime.now().isoformat()
    metadata[prompt_id] = {
        'name': name,
        'description': description,
        'created': metadata.get(prompt_id, {}).get('created', now),
        'updated': now,
    }
    _save_metadata(metadata)
    return metadata[prompt_id]


def delete_system_prompt(prompt_id: str) -> bool:
    """Delete a custom system prompt."""
    prompt_file = _user_prompts_dir() / f'{prompt_id}.md'
    if not prompt_file.exists():
        return False
    prompt_file.unlink()

    metadata = _load_metadata()
    if prompt_id in metadata:
        metadata.pop(prompt_id)
        _save_metadata(metadata)

    return True


def list_system_prompts() -> dict[str, Any]:
    """Return built-in and custom system prompts metadata."""
    prompts: dict[str, Any] = {
        'default': {
            'name': 'Default',
            'description': 'Basic helpful assistant',
            'isBuiltin': True,
        },
        'e621_prompt_generator': {
            'name': 'E621 Prompt Generator',
            'description': 'Advanced image description for E621-style prompts',
            'isBuiltin': True,
        },
    }

    metadata = _load_metadata()
    for prompt_id, meta in metadata.items():
        prompts[prompt_id] = {
            'name': meta.get('name', prompt_id),
            'description': meta.get('description', ''),
            'isBuiltin': False,
        }

    return prompts

"""LLM preset persistence and built-in preset management."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from ..logger import get_logger
from ..sage_utils import sage_users_path

logger = get_logger('llm.presets')

_BUILTIN_PRESETS: dict[str, dict[str, Any]] = {
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


def _user_presets_file() -> Path:
    return Path(sage_users_path) / 'llm_presets.json'


def _load_user_presets() -> dict[str, Any]:
    user_presets_file = _user_presets_file()
    if not user_presets_file.exists():
        return {}

    try:
        with user_presets_file.open('r', encoding='utf-8') as handle:
            data = json.load(handle)
        return data if isinstance(data, dict) else {}
    except Exception as e:
        logger.warning(f'Failed to load custom presets: {e}')
        return {}


def _save_user_presets(presets: dict[str, Any]) -> None:
    user_presets_file = _user_presets_file()
    user_presets_file.parent.mkdir(parents=True, exist_ok=True)
    with user_presets_file.open('w', encoding='utf-8') as handle:
        json.dump(presets, handle, indent=2)


def get_user_presets() -> dict[str, Any]:
    """Return user-defined preset entries."""
    return _load_user_presets()


def get_all_presets_full() -> dict[str, dict[str, Any]]:
    """Return all presets, including built-ins and custom overrides."""
    presets = {preset_id: preset.copy() for preset_id, preset in _BUILTIN_PRESETS.items()}
    presets.update(_load_user_presets())
    return presets


def load_preset(preset_id: str) -> dict[str, Any]:
    """Load a single preset from built-in or user presets."""
    if preset_id in _BUILTIN_PRESETS:
        return _BUILTIN_PRESETS[preset_id].copy()

    user_presets = _load_user_presets()
    preset = user_presets.get(preset_id)
    if isinstance(preset, dict):
        return preset.copy()

    raise ValueError(f"Preset '{preset_id}' not found")


def save_preset(preset_id: str, preset_data: dict[str, Any]) -> dict[str, Any]:
    """Save or update a user preset."""
    if not preset_id or not isinstance(preset_data, dict):
        raise ValueError('Preset id and preset data are required')

    presets = _load_user_presets()
    now = __import__('datetime').datetime.now().isoformat()
    preset_data = preset_data.copy()
    preset_data['updatedAt'] = now
    if preset_id not in presets:
        preset_data['createdAt'] = now

    presets[preset_id] = preset_data
    _save_user_presets(presets)
    return preset_data


def delete_preset(preset_id: str) -> bool:
    """Delete a user preset by id."""
    presets = _load_user_presets()
    if preset_id not in presets:
        return False
    presets.pop(preset_id)
    _save_user_presets(presets)
    return True


def list_presets() -> dict[str, Any]:
    """List only user-defined presets."""
    return _load_user_presets()

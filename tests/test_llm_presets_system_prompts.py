"""Tests for LLM preset and system prompt persistence helpers."""

from pathlib import Path

from comfyui_sageutils.utils.llm import presets, system_prompts


def test_presets_save_load_delete(tmp_path, monkeypatch):
    monkeypatch.setattr(presets, 'sage_users_path', str(tmp_path))

    preset_id = 'test_preset'
    preset_data = {
        'provider': 'lmstudio_rest',
        'model': 'gemma3:12b',
        'promptTemplate': 'description/Descriptive Prompt',
        'systemPrompt': 'default',
        'settings': {'temperature': 0.5},
    }

    saved = presets.save_preset(preset_id, preset_data)
    assert saved['updatedAt']
    assert preset_id in presets.list_presets()

    loaded = presets.load_preset(preset_id)
    assert loaded['provider'] == preset_data['provider']
    assert loaded['model'] == preset_data['model']

    deleted = presets.delete_preset(preset_id)
    assert deleted is True
    assert preset_id not in presets.list_presets()

    deleted_again = presets.delete_preset(preset_id)
    assert deleted_again is False


def test_presets_list_returns_builtin_and_custom(tmp_path, monkeypatch):
    monkeypatch.setattr(presets, 'sage_users_path', str(tmp_path))

    # Custom presets should be empty by default.
    listed = presets.list_presets()
    assert isinstance(listed, dict)
    assert listed == {}

    builtin = presets.get_all_presets_full()
    assert 'descriptive_prompt' in builtin
    assert 'casual_chat' in builtin


def test_system_prompts_save_load_delete(tmp_path, monkeypatch):
    monkeypatch.setattr(system_prompts, 'sage_users_path', str(tmp_path))

    prompt_id = 'custom_test_prompt'
    name = 'Custom Prompt'
    content = 'You are a custom test assistant.'
    description = 'A test prompt entry.'

    saved = system_prompts.save_system_prompt(prompt_id, name, content, description)
    assert saved['name'] == name
    assert prompt_id in system_prompts.list_system_prompts()

    loaded_text = system_prompts.get_system_prompt_text(prompt_id)
    assert loaded_text == content

    deleted = system_prompts.delete_system_prompt(prompt_id)
    assert deleted is True
    assert prompt_id not in system_prompts.list_system_prompts()

    deleted_again = system_prompts.delete_system_prompt(prompt_id)
    assert deleted_again is False


def test_system_prompts_builtins_are_available():
    assert system_prompts.get_system_prompt_text('default') == 'You are a helpful AI assistant.'
    e621_text = system_prompts.get_system_prompt_text('e621_prompt_generator')
    assert isinstance(e621_text, str)
    assert len(e621_text) > 0
    assert 'prompt' in e621_text.lower() or 'assistant' in e621_text.lower()

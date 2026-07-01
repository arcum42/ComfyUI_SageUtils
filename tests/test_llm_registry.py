"""Unit tests for utils/llm/registry.py."""

from comfyui_sageutils.utils.llm.registry import ProviderDescriptor, ProviderRegistry


def test_registry_registers_descriptor_and_default_state():
    registry = ProviderRegistry(retry_seconds=42.0)
    descriptor = ProviderDescriptor(
        key='openai',
        setting_key='enable_openai',
        display_name='OpenAI provider',
        initializer=lambda enabled: enabled,
    )

    registry.register(descriptor)

    assert registry.retry_seconds == 42.0
    assert registry.descriptor('openai') is descriptor
    state = registry.state('openai')
    assert state.initialized is False
    assert state.available is False
    assert state.last_checked is None


def test_registry_set_state_updates_selected_fields_only():
    registry = ProviderRegistry()
    registry.register(
        ProviderDescriptor(
            key='lmstudio_rest',
            setting_key='enable_lmstudio_rest',
            display_name='LM Studio REST',
            initializer=lambda enabled: enabled,
        )
    )

    state = registry.set_state('lmstudio_rest', initialized=True, available=False, last_checked=123.4)
    assert state.initialized is True
    assert state.available is False
    assert state.last_checked == 123.4

    state = registry.set_state('lmstudio_rest', available=True)
    assert state.initialized is True
    assert state.available is True
    assert state.last_checked == 123.4


def test_registry_reset_clears_runtime_state():
    registry = ProviderRegistry()
    registry.register(
        ProviderDescriptor(
            key='ollama_rest',
            setting_key='enable_ollama_rest',
            display_name='Ollama REST',
            initializer=lambda enabled: enabled,
        )
    )

    registry.set_state('ollama_rest', initialized=True, available=True, last_checked=55.0)
    registry.reset()

    state = registry.state('ollama_rest')
    assert state.initialized is False
    assert state.available is False
    assert state.last_checked is None

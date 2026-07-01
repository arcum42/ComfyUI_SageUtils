"""Tests for canonical provider key and alias normalization helpers."""

from comfyui_sageutils.utils.llm.provider_keys import (
    LMSTUDIO_REST_KEY,
    NATIVE_KEY,
    OLLAMA_REST_KEY,
    OPENAI_KEY,
    ROUTE_PROVIDER_KEYS,
    SERVICE_PROVIDER_KEYS,
    normalize_provider_key,
)


def test_canonical_provider_key_constants() -> None:
    assert LMSTUDIO_REST_KEY == 'lmstudio_rest'
    assert OLLAMA_REST_KEY == 'ollama_rest'
    assert OPENAI_KEY == 'openai'
    assert NATIVE_KEY == 'native'


def test_service_provider_keys_excludes_native() -> None:
    assert SERVICE_PROVIDER_KEYS == (
        LMSTUDIO_REST_KEY,
        OLLAMA_REST_KEY,
        OPENAI_KEY,
    )


def test_route_provider_keys_includes_native() -> None:
    assert ROUTE_PROVIDER_KEYS == (
        LMSTUDIO_REST_KEY,
        OLLAMA_REST_KEY,
        OPENAI_KEY,
        NATIVE_KEY,
    )


def test_normalize_provider_key_maps_legacy_aliases() -> None:
    assert normalize_provider_key('lmstudio') == LMSTUDIO_REST_KEY
    assert normalize_provider_key('ollama') == OLLAMA_REST_KEY


def test_normalize_provider_key_passes_through_canonical() -> None:
    assert normalize_provider_key(LMSTUDIO_REST_KEY) == LMSTUDIO_REST_KEY
    assert normalize_provider_key(OLLAMA_REST_KEY) == OLLAMA_REST_KEY
    assert normalize_provider_key(OPENAI_KEY) == OPENAI_KEY
    assert normalize_provider_key(NATIVE_KEY) == NATIVE_KEY


def test_normalize_provider_key_normalizes_case_and_whitespace() -> None:
    assert normalize_provider_key('  LMSTUDIO  ') == LMSTUDIO_REST_KEY
    assert normalize_provider_key('\nOLLAMA\t') == OLLAMA_REST_KEY


def test_normalize_provider_key_unknown_passthrough() -> None:
    assert normalize_provider_key('custom-provider') == 'custom-provider'


def test_normalize_provider_key_empty_input() -> None:
    assert normalize_provider_key('') == ''
    assert normalize_provider_key('   ') == ''

"""Contract tests for canonical provider key naming in LLM routes."""

from pathlib import Path


ROUTES_FILE = Path(__file__).resolve().parent.parent / 'routes' / 'llm_routes.py'


def _source() -> str:
    return ROUTES_FILE.read_text(encoding='utf-8')


def _assert_all_present(source: str, expected_snippets: list[str]) -> None:
    missing = [snippet for snippet in expected_snippets if snippet not in source]
    assert not missing, f'Missing expected snippets: {missing}'


def test_status_response_uses_canonical_provider_key_constants() -> None:
    source = _source()
    _assert_all_present(
        source,
        [
            'LMSTUDIO_REST_KEY: lmstudio_rest_info',
            'OLLAMA_REST_KEY: ollama_rest_info',
            'OPENAI_KEY: openai_info',
            'NATIVE_KEY: native_info',
        ],
    )


def test_models_response_uses_canonical_provider_key_constants() -> None:
    source = _source()
    _assert_all_present(
        source,
        [
            'LMSTUDIO_REST_KEY: lmstudio_rest_models',
            'OLLAMA_REST_KEY: ollama_rest_models',
            'OPENAI_KEY: openai_models',
            'NATIVE_KEY: native_models',
            '_status_key(LMSTUDIO_REST_KEY)',
            '_status_key(OLLAMA_REST_KEY)',
            '_status_key(OPENAI_KEY)',
            '_status_key(NATIVE_KEY)',
        ],
    )


def test_vision_models_response_uses_canonical_provider_key_constants() -> None:
    source = _source()
    _assert_all_present(
        source,
        [
            'LMSTUDIO_REST_KEY: lmstudio_rest_models',
            'OLLAMA_REST_KEY: ollama_rest_models',
            'OPENAI_KEY: openai_vision_models',
            'NATIVE_KEY: native_models',
        ],
    )


def test_stream_and_generate_validation_use_route_provider_key_set() -> None:
    source = _source()
    _assert_all_present(
        source,
        [
            'if provider not in ROUTE_PROVIDER_KEYS:',
            'if not provider or provider not in ROUTE_PROVIDER_KEYS:',
        ],
    )

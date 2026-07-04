"""Contract tests for canonical provider key naming in LLM routes."""

from pathlib import Path


ROUTES_FILE = Path(__file__).resolve().parent.parent / 'routes' / 'llm_routes.py'


def _source() -> str:
    return ROUTES_FILE.read_text(encoding='utf-8')


def _assert_all_present(source: str, expected_snippets: list[str]) -> None:
    missing = [snippet for snippet in expected_snippets if snippet not in source]
    assert not missing, f'Missing expected snippets: {missing}'


def test_status_route_delegates_to_service_status_helper() -> None:
    source = _source()
    _assert_all_present(
        source,
        [
            "@routes_instance.get('/sage_llm/status')",
            'status = llm.get_llm_status()',
        ],
    )


def test_models_route_delegates_to_service_models_helper() -> None:
    source = _source()
    _assert_all_present(
        source,
        [
            "@routes_instance.get('/sage_llm/models')",
            'data = llm.get_llm_models(force=force)',
        ],
    )


def test_vision_models_route_delegates_to_service_vision_models_helper() -> None:
    source = _source()
    _assert_all_present(
        source,
        [
            "@routes_instance.get('/sage_llm/vision_models')",
            'data = llm.get_llm_vision_models(force=force)',
        ],
    )


def test_generation_request_parsing_uses_routes_helpers() -> None:
    source = _source()
    _assert_all_present(
        source,
        [
            'routes_helpers.parse_generation_request(data)',
            'routes_helpers.parse_vision_generation_request(data)',
        ],
    )


def test_generate_only_route_is_registered_and_documented() -> None:
    source = _source()
    _assert_all_present(
        source,
        [
            "@routes_instance.post('/sage_llm/generate_only')",
            'def generate_only(request):',
            'Generate text response assuming model is already loaded',
        ],
    )


def test_generate_only_route_uses_parsing_helper_and_service_wrapper() -> None:
    source = _source()
    _assert_all_present(
        source,
        [
            'routes_helpers.parse_generation_request(data)',
            'llm.generate_only(',
        ],
    )

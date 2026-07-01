"""Unit tests for shared provider availability helpers."""

import importlib.util
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parent.parent / 'utils' / 'llm' / 'providers' / 'availability.py'

spec = importlib.util.spec_from_file_location('sageutils_llm_provider_availability', MODULE_PATH)
availability = importlib.util.module_from_spec(spec)
assert spec is not None and spec.loader is not None
spec.loader.exec_module(availability)


def test_is_provider_unavailable_inverts_enabled_flag():
    assert availability.is_provider_unavailable(False) is True
    assert availability.is_provider_unavailable(True) is False


def test_unavailable_models_placeholder_wraps_message():
    assert availability.unavailable_models_placeholder('(Provider not available)') == ['(Provider not available)']


def test_report_fetch_error_reports_and_returns_fallback():
    calls = []

    def fake_report(message, *, provider, operation, cause):
        calls.append((message, provider, operation, cause))

    cause = RuntimeError('boom')
    fallback = ['fallback']

    result = availability.report_fetch_error(
        fake_report,
        'Error retrieving models',
        provider='openai',
        operation='get_models',
        cause=cause,
        fallback=fallback,
    )

    assert result == ['fallback']
    assert calls == [('Error retrieving models', 'openai', 'get_models', cause)]


def test_report_fetch_error_supports_non_list_fallback():
    calls = []

    def fake_report(message, *, provider, operation, cause):
        calls.append((message, provider, operation, cause))

    result = availability.report_fetch_error(
        fake_report,
        'Error retrieving vision models',
        provider='ollama_rest',
        operation='get_vision_models',
        cause=ValueError('bad'),
        fallback=[],
    )

    assert result == []
    assert len(calls) == 1


def test_raise_if_provider_unavailable_raises_when_disabled():
    calls = []

    class DummyError(Exception):
        pass

    def fake_raise(error_type, message, *, provider, operation):
        calls.append((error_type, message, provider, operation))

    availability.raise_if_provider_unavailable(
        False,
        fake_raise,
        error_type=DummyError,
        message='Provider disabled.',
        provider='openai',
        operation='generate',
    )

    assert calls == [(DummyError, 'Provider disabled.', 'openai', 'generate')]


def test_raise_if_provider_unavailable_noop_when_enabled():
    calls = []

    class DummyError(Exception):
        pass

    def fake_raise(error_type, message, *, provider, operation):
        calls.append((error_type, message, provider, operation))

    availability.raise_if_provider_unavailable(
        True,
        fake_raise,
        error_type=DummyError,
        message='Provider disabled.',
        provider='openai',
        operation='generate',
    )

    assert calls == []


def test_raise_if_model_unavailable_raises_when_missing():
    calls = []

    def fake_raise(error_type, message, *, provider, operation):
        calls.append((error_type, message, provider, operation))

    availability.raise_if_model_unavailable(
        'missing-model',
        ['model-a', 'model-b'],
        fake_raise,
        provider='ollama_rest',
        operation='generate_stream',
    )

    assert calls == [
        (
            ValueError,
            "Model 'missing-model' is not available. Available models: ['model-a', 'model-b']",
            'ollama_rest',
            'generate_stream',
        )
    ]


def test_raise_if_model_unavailable_noop_when_present():
    calls = []

    def fake_raise(error_type, message, *, provider, operation):
        calls.append((error_type, message, provider, operation))

    availability.raise_if_model_unavailable(
        'model-a',
        ['model-a', 'model-b'],
        fake_raise,
        provider='ollama_rest',
        operation='generate_stream',
    )

    assert calls == []


def test_raise_if_missing_images_raises_when_none():
    calls = []

    def fake_raise(error_type, message, *, provider, operation):
        calls.append((error_type, message, provider, operation))

    availability.raise_if_missing_images(
        None,
        fake_raise,
        provider='openai',
        operation='generate_vision',
    )

    assert calls == [
        (ValueError, 'No images provided for vision model.', 'openai', 'generate_vision')
    ]


def test_raise_if_missing_images_noop_when_present():
    calls = []

    def fake_raise(error_type, message, *, provider, operation):
        calls.append((error_type, message, provider, operation))

    availability.raise_if_missing_images(
        ['img-data'],
        fake_raise,
        provider='openai',
        operation='generate_vision',
    )

    assert calls == []


def test_stream_error_payload_includes_full_response_by_default():
    payload = availability.stream_error_payload('boom')
    assert payload == {
        'chunk': '',
        'done': True,
        'error': 'boom',
        'full_response': '',
    }


def test_stream_error_payload_can_omit_full_response():
    payload = availability.stream_error_payload('boom', include_full_response=False)
    assert payload == {
        'chunk': '',
        'done': True,
        'error': 'boom',
    }
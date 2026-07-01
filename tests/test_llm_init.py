"""Unit tests for utils/llm/init.py."""

import importlib.util
import sys
import types
from pathlib import Path
from types import SimpleNamespace

import pytest


INIT_MODULE_NAME = 'comfyui_sageutils.utils.llm.init'
INIT_FILE_PATH = Path(__file__).resolve().parent.parent / 'utils' / 'llm' / 'init.py'
STUB_MODULE_NAMES = [
    'comfyui_sageutils',
    'comfyui_sageutils.utils',
    'comfyui_sageutils.utils.logger',
    'comfyui_sageutils.utils.llm',
    'comfyui_sageutils.utils.llm.providers',
    'comfyui_sageutils.utils.llm.providers.lmstudio',
    'comfyui_sageutils.utils.llm.providers.ollama',
    'comfyui_sageutils.utils.llm.providers.openai',
    INIT_MODULE_NAME,
]


class _LoggerRecorder:
    def __init__(self):
        self.messages = []

    def info(self, message):
        self.messages.append(('info', message))

    def warning(self, message):
        self.messages.append(('warning', message))

    def error(self, message):
        self.messages.append(('error', message))

    def debug(self, message):
        self.messages.append(('debug', message))


def _make_package(name: str) -> types.ModuleType:
    module = types.ModuleType(name)
    module.__path__ = []
    return module


def _load_init_module():
    previous_modules = {name: sys.modules.get(name) for name in STUB_MODULE_NAMES}
    for name in STUB_MODULE_NAMES:
        sys.modules.pop(name, None)

    logger = _LoggerRecorder()

    comfy_pkg = _make_package('comfyui_sageutils')
    utils_pkg = _make_package('comfyui_sageutils.utils')
    llm_pkg = _make_package('comfyui_sageutils.utils.llm')
    providers_pkg = _make_package('comfyui_sageutils.utils.llm.providers')

    logger_module = types.ModuleType('comfyui_sageutils.utils.logger')
    logger_module.get_logger = lambda name='': logger

    lmstudio_module = _make_package('comfyui_sageutils.utils.llm.providers.lmstudio')
    lmstudio_module.client = SimpleNamespace(is_running=lambda enabled: enabled)
    ollama_module = _make_package('comfyui_sageutils.utils.llm.providers.ollama')
    ollama_module.client = SimpleNamespace(is_running=lambda enabled: enabled)
    openai_module = _make_package('comfyui_sageutils.utils.llm.providers.openai')
    openai_module.client = SimpleNamespace(is_running=lambda enabled: enabled)

    comfy_pkg.utils = utils_pkg
    utils_pkg.logger = logger_module
    utils_pkg.llm = llm_pkg
    llm_pkg.providers = providers_pkg
    providers_pkg.lmstudio = lmstudio_module
    providers_pkg.ollama = ollama_module
    providers_pkg.openai = openai_module

    sys.modules['comfyui_sageutils'] = comfy_pkg
    sys.modules['comfyui_sageutils.utils'] = utils_pkg
    sys.modules['comfyui_sageutils.utils.logger'] = logger_module
    sys.modules['comfyui_sageutils.utils.llm'] = llm_pkg
    sys.modules['comfyui_sageutils.utils.llm.providers'] = providers_pkg
    sys.modules['comfyui_sageutils.utils.llm.providers.lmstudio'] = lmstudio_module
    sys.modules['comfyui_sageutils.utils.llm.providers.ollama'] = ollama_module
    sys.modules['comfyui_sageutils.utils.llm.providers.openai'] = openai_module

    spec = importlib.util.spec_from_file_location(INIT_MODULE_NAME, INIT_FILE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[INIT_MODULE_NAME] = module
    assert spec is not None and spec.loader is not None
    spec.loader.exec_module(module)
    return module, logger, previous_modules


@pytest.fixture
def init_module():
    module, logger, previous_modules = _load_init_module()
    yield module, logger
    for name in STUB_MODULE_NAMES:
        sys.modules.pop(name, None)
    for name, previous in previous_modules.items():
        if previous is not None:
            sys.modules[name] = previous


def test_init_ollama_rest_returns_false_when_disabled(init_module):
    module, logger = init_module

    assert module.init_ollama_rest(False) is False
    assert ('info', 'Ollama is disabled in settings.') in logger.messages


def test_init_ollama_rest_logs_initialized_when_reachable(monkeypatch, init_module):
    module, logger = init_module
    monkeypatch.setattr(module, 'ollama_rest_provider', SimpleNamespace(is_running=lambda enabled: True))

    assert module.init_ollama_rest(True) is True
    assert ('info', 'Ollama REST provider initialized.') in logger.messages


def test_init_ollama_rest_logs_unreachable_when_server_missing(monkeypatch, init_module):
    module, logger = init_module
    monkeypatch.setattr(module, 'ollama_rest_provider', SimpleNamespace(is_running=lambda enabled: False))

    assert module.init_ollama_rest(True) is False
    assert ('info', 'Ollama REST provider is enabled but server is not reachable yet.') in logger.messages


def test_init_lmstudio_rest_logs_errors(monkeypatch, init_module):
    module, logger = init_module

    def _raise(enabled):
        raise RuntimeError('boom')

    monkeypatch.setattr(module, 'lmstudio_rest_provider', SimpleNamespace(is_running=_raise))

    assert module.init_lmstudio_rest(True) is False
    assert ('error', 'Failed to initialize LM Studio REST provider: boom') in logger.messages


def test_init_openai_provider_logs_unreachable_endpoint(monkeypatch, init_module):
    module, logger = init_module
    monkeypatch.setattr(module, 'openai_provider', SimpleNamespace(is_running=lambda enabled: False))

    assert module.init_openai_provider(True) is False
    assert ('info', 'OpenAI provider is enabled but endpoint is not reachable yet.') in logger.messages


def test_init_openai_provider_logs_errors(monkeypatch, init_module):
    module, logger = init_module

    def _raise(enabled):
        raise ValueError('bad auth')

    monkeypatch.setattr(module, 'openai_provider', SimpleNamespace(is_running=_raise))

    assert module.init_openai_provider(True) is False
    assert ('error', 'Failed to initialize OpenAI provider: bad auth') in logger.messages



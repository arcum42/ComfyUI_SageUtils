"""Unit tests for utils/llm/service.py."""

import importlib.util
import sys
import types
from pathlib import Path
from types import SimpleNamespace

import pytest


SERVICE_MODULE_NAME = 'comfyui_sageutils.utils.llm.service'
SERVICE_FILE_PATH = Path(__file__).resolve().parent.parent / 'utils' / 'llm' / 'service.py'
STUB_MODULE_NAMES = [
    'comfyui_sageutils',
    'comfyui_sageutils.utils',
    'comfyui_sageutils.utils.logger',
    'comfyui_sageutils.utils.settings',
    'comfyui_sageutils.utils.llm',
    'comfyui_sageutils.utils.llm.registry',
    'comfyui_sageutils.utils.llm.provider_keys',
    'comfyui_sageutils.utils.llm.init',
    'comfyui_sageutils.utils.llm.providers',
    'comfyui_sageutils.utils.llm.providers.settings',
    'comfyui_sageutils.utils.llm.providers.lmstudio',
    'comfyui_sageutils.utils.llm.providers.ollama',
    'comfyui_sageutils.utils.llm.providers.openai',
    SERVICE_MODULE_NAME,
]


def _noop(*args, **kwargs):
    return None


def _make_provider_client() -> SimpleNamespace:
    return SimpleNamespace(
        is_running=lambda enabled: enabled,
        get_models=lambda enabled: [],
        get_vision_models=lambda enabled: [],
        get_tool_models=lambda enabled: [],
        get_reasoning_models=lambda enabled: [],
        get_model_capabilities_map=lambda enabled: {},
        generate=lambda enabled, model, prompt, options=None, system_prompt='': '',
        generate_vision=lambda enabled, model, prompt, images=None, options=None, system_prompt='', keep_alive='5m': '',
        generate_stream=lambda enabled, model, prompt, options=None, system_prompt='', keep_alive='5m': iter(()),
        generate_vision_stream=lambda enabled, model, prompt, images=None, options=None, system_prompt='', keep_alive='5m': iter(()),
        generate_with_stream=lambda enabled, model, prompt, options=None, system_prompt='': '',
        generate_vision_with_stream=lambda enabled, model, prompt, images=None, options=None, system_prompt='': '',
        load_model=lambda enabled, model, keep_alive=0: True,
        unload_model=lambda enabled, model: True,
    )


def _make_package(name: str) -> types.ModuleType:
    module = types.ModuleType(name)
    module.__path__ = []
    return module


def _load_service_module():
    previous_modules = {name: sys.modules.get(name) for name in STUB_MODULE_NAMES}
    for name in STUB_MODULE_NAMES:
        sys.modules.pop(name, None)

    comfy_pkg = _make_package('comfyui_sageutils')
    utils_pkg = _make_package('comfyui_sageutils.utils')
    llm_pkg = _make_package('comfyui_sageutils.utils.llm')
    providers_pkg = _make_package('comfyui_sageutils.utils.llm.providers')

    registry_module = types.ModuleType('comfyui_sageutils.utils.llm.registry')

    class ProviderDescriptor:
        def __init__(self, key, setting_key, display_name, initializer):
            self.key = key
            self.setting_key = setting_key
            self.display_name = display_name
            self.initializer = initializer

    class ProviderState:
        def __init__(self):
            self.initialized = False
            self.available = False
            self.last_checked = None

    class ProviderRegistry:
        def __init__(self, retry_seconds=60.0):
            self.retry_seconds = retry_seconds
            self._descriptors = {}
            self._state = {}

        def register(self, descriptor):
            self._descriptors[descriptor.key] = descriptor
            self._state.setdefault(descriptor.key, ProviderState())

        def descriptor(self, key):
            return self._descriptors[key]

        def state(self, key):
            return self._state[key]

        def set_state(self, key, initialized=None, available=None, last_checked=None):
            state = self.state(key)
            if initialized is not None:
                state.initialized = initialized
            if available is not None:
                state.available = available
            if last_checked is not None:
                state.last_checked = last_checked
            return state

        def reset(self):
            for key in self._state:
                self._state[key] = ProviderState()

    registry_module.ProviderDescriptor = ProviderDescriptor
    registry_module.ProviderRegistry = ProviderRegistry

    provider_keys_module = types.ModuleType('comfyui_sageutils.utils.llm.provider_keys')
    provider_keys_module.LMSTUDIO_REST_KEY = 'lmstudio_rest'
    provider_keys_module.OLLAMA_REST_KEY = 'ollama_rest'
    provider_keys_module.OPENAI_KEY = 'openai'

    logger_module = types.ModuleType('comfyui_sageutils.utils.logger')
    logger_module.get_logger = lambda name='': SimpleNamespace(
        info=_noop,
        warning=_noop,
        error=_noop,
        debug=_noop,
    )

    settings_module = types.ModuleType('comfyui_sageutils.utils.settings')
    settings_module.get_setting = lambda key, default=False: default

    provider_settings_module = types.ModuleType('comfyui_sageutils.utils.llm.providers.settings')
    provider_settings_module.is_lmstudio_rest_enabled = lambda: False
    provider_settings_module.is_ollama_rest_enabled = lambda: False
    provider_settings_module.is_openai_enabled = lambda: False

    init_module = types.ModuleType('comfyui_sageutils.utils.llm.init')
    init_module.init_lmstudio_rest = lambda enabled: enabled
    init_module.init_ollama_rest = lambda enabled: enabled
    init_module.init_openai_provider = lambda enabled: enabled

    lmstudio_module = _make_package('comfyui_sageutils.utils.llm.providers.lmstudio')
    lmstudio_module.client = _make_provider_client()
    ollama_module = _make_package('comfyui_sageutils.utils.llm.providers.ollama')
    ollama_module.client = _make_provider_client()
    openai_module = _make_package('comfyui_sageutils.utils.llm.providers.openai')
    openai_module.client = _make_provider_client()

    comfy_pkg.utils = utils_pkg
    utils_pkg.logger = logger_module
    utils_pkg.settings = settings_module
    utils_pkg.llm = llm_pkg
    llm_pkg.registry = registry_module
    llm_pkg.provider_keys = provider_keys_module
    llm_pkg.init = init_module
    llm_pkg.providers = providers_pkg
    providers_pkg.settings = provider_settings_module
    providers_pkg.lmstudio = lmstudio_module
    providers_pkg.ollama = ollama_module
    providers_pkg.openai = openai_module

    sys.modules['comfyui_sageutils'] = comfy_pkg
    sys.modules['comfyui_sageutils.utils'] = utils_pkg
    sys.modules['comfyui_sageutils.utils.logger'] = logger_module
    sys.modules['comfyui_sageutils.utils.settings'] = settings_module
    sys.modules['comfyui_sageutils.utils.llm'] = llm_pkg
    sys.modules['comfyui_sageutils.utils.llm.registry'] = registry_module
    sys.modules['comfyui_sageutils.utils.llm.provider_keys'] = provider_keys_module
    sys.modules['comfyui_sageutils.utils.llm.init'] = init_module
    sys.modules['comfyui_sageutils.utils.llm.providers'] = providers_pkg
    sys.modules['comfyui_sageutils.utils.llm.providers.settings'] = provider_settings_module
    sys.modules['comfyui_sageutils.utils.llm.providers.lmstudio'] = lmstudio_module
    sys.modules['comfyui_sageutils.utils.llm.providers.ollama'] = ollama_module
    sys.modules['comfyui_sageutils.utils.llm.providers.openai'] = openai_module

    spec = importlib.util.spec_from_file_location(SERVICE_MODULE_NAME, SERVICE_FILE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[SERVICE_MODULE_NAME] = module
    assert spec is not None and spec.loader is not None
    spec.loader.exec_module(module)
    return module, previous_modules


@pytest.fixture
def service_module():
    module, previous_modules = _load_service_module()
    yield module
    for name in STUB_MODULE_NAMES:
        sys.modules.pop(name, None)
    for name, previous in previous_modules.items():
        if previous is not None:
            sys.modules[name] = previous


class _FakeCapabilities:
    def __init__(self, payload):
        self.payload = payload

    def to_dict(self):
        return dict(self.payload)


def test_get_lmstudio_rest_models_use_rest_enablement(monkeypatch, service_module):
    calls = []

    monkeypatch.setattr(service_module, 'is_lmstudio_rest_enabled', lambda: False)
    monkeypatch.setattr(
        service_module,
        'lmstudio_rest_provider',
        SimpleNamespace(get_models=lambda enabled: calls.append(enabled) or ['model-a']),
    )

    assert service_module.get_lmstudio_rest_models() == ['model-a']
    assert calls == [False]


def test_get_lmstudio_rest_models_uses_rest_flag_only(monkeypatch, service_module):
    calls = []

    monkeypatch.setattr(service_module, 'is_lmstudio_rest_enabled', lambda: False)
    monkeypatch.setattr(
        service_module,
        'lmstudio_rest_provider',
        SimpleNamespace(get_models=lambda enabled: calls.append(enabled) or ['model-b']),
    )

    assert service_module.get_lmstudio_rest_models() == ['model-b']
    assert calls == [False]


def test_get_openai_models_delegates_to_provider(monkeypatch, service_module):
    calls = []

    monkeypatch.setattr(service_module, 'is_openai_enabled', lambda: True)
    monkeypatch.setattr(
        service_module,
        'openai_provider',
        SimpleNamespace(get_models=lambda enabled: calls.append(enabled) or ['gpt-test']),
    )

    assert service_module.get_openai_models() == ['gpt-test']
    assert calls == [True]


def test_get_lmstudio_rest_model_capabilities_map_converts_objects(monkeypatch, service_module):
    monkeypatch.setattr(service_module, 'is_lmstudio_rest_enabled', lambda: True)
    monkeypatch.setattr(
        service_module,
        'lmstudio_rest_provider',
        SimpleNamespace(
            get_model_capabilities_map=lambda enabled: {
                'model-a': _FakeCapabilities({'vision': True, 'provider': 'lmstudio_rest'}),
            }
        ),
    )

    assert service_module.get_lmstudio_rest_model_capabilities_map() == {
        'model-a': {'vision': True, 'provider': 'lmstudio_rest'},
    }


def test_ollama_rest_generate_forwards_keep_alive(monkeypatch, service_module):
    events = []

    monkeypatch.setattr(service_module, 'ensure_ollama_rest_initialized', lambda force=False: events.append(('ensure', force)) or True)
    monkeypatch.setattr(service_module, 'is_ollama_rest_enabled', lambda: True)
    monkeypatch.setattr(
        service_module,
        'ollama_rest_provider',
        SimpleNamespace(
            generate=lambda enabled, model, prompt, options=None, system_prompt='', keep_alive='5m': events.append(
                ('generate', enabled, model, prompt, options, system_prompt, keep_alive)
            ) or 'ok'
        ),
    )

    result = service_module.ollama_rest_generate(
        'llama',
        'hello',
        keep_alive='12s',
        options={'temperature': 0.2},
        system_prompt='sys',
    )

    assert result == 'ok'
    assert events == [
        ('ensure', False),
        ('generate', True, 'llama', 'hello', {'temperature': 0.2}, 'sys', '12s'),
    ]


def test_ollama_rest_generate_vision_forwards_keep_alive(monkeypatch, service_module):
    events = []

    monkeypatch.setattr(service_module, 'ensure_ollama_rest_initialized', lambda force=False: events.append(('ensure', force)) or True)
    monkeypatch.setattr(service_module, 'is_ollama_rest_enabled', lambda: True)
    monkeypatch.setattr(
        service_module,
        'ollama_rest_provider',
        SimpleNamespace(
            generate_vision=lambda enabled, model, prompt, images=None, options=None, system_prompt='', keep_alive='5m': events.append(
                ('generate_vision', enabled, model, prompt, images, options, system_prompt, keep_alive)
            ) or 'ok-vision'
        ),
    )

    result = service_module.ollama_rest_generate_vision(
        'llama',
        'describe',
        images=['img'],
        keep_alive='20s',
        options={'temperature': 0.3},
        system_prompt='sys',
    )

    assert result == 'ok-vision'
    assert events == [
        ('ensure', False),
        ('generate_vision', True, 'llama', 'describe', ['img'], {'temperature': 0.3}, 'sys', '20s'),
    ]


def test_openai_generate_ensures_init_before_delegating(monkeypatch, service_module):
    events = []

    monkeypatch.setattr(service_module, 'ensure_openai_initialized', lambda force=False: events.append(('ensure', force)) or True)
    monkeypatch.setattr(service_module, 'is_openai_enabled', lambda: True)
    monkeypatch.setattr(
        service_module,
        'openai_provider',
        SimpleNamespace(
            generate=lambda enabled, model, prompt, options=None, system_prompt='': events.append(
                ('generate', enabled, model, prompt, options, system_prompt)
            ) or 'response'
        ),
    )

    result = service_module.openai_generate('gpt-test', 'hello', options={'temperature': 0.4}, system_prompt='sys')

    assert result == 'response'
    assert events == [
        ('ensure', False),
        ('generate', True, 'gpt-test', 'hello', {'temperature': 0.4}, 'sys'),
    ]


def test_openai_generate_stream_uses_provider_dispatch(monkeypatch, service_module):
    events = []

    monkeypatch.setattr(service_module, 'ensure_openai_initialized', lambda force=False: events.append(('ensure', force)) or True)
    monkeypatch.setattr(service_module, 'is_openai_enabled', lambda: True)
    monkeypatch.setattr(
        service_module,
        'openai_provider',
        SimpleNamespace(
            generate_stream=lambda enabled, model, prompt, options=None, system_prompt='': events.append(
                ('generate_stream', enabled, model, prompt, options, system_prompt)
            ) or iter(['chunk'])
        ),
    )

    assert list(service_module.openai_generate_stream('gpt-test', 'hello', options={'temperature': 0.5}, system_prompt='sys')) == ['chunk']
    assert events == [
        ('ensure', False),
        ('generate_stream', True, 'gpt-test', 'hello', {'temperature': 0.5}, 'sys'),
    ]


def test_openai_generate_vision_stream_uses_provider_dispatch(monkeypatch, service_module):
    events = []

    monkeypatch.setattr(service_module, 'ensure_openai_initialized', lambda force=False: events.append(('ensure', force)) or True)
    monkeypatch.setattr(service_module, 'is_openai_enabled', lambda: True)
    monkeypatch.setattr(
        service_module,
        'openai_provider',
        SimpleNamespace(
            generate_vision_stream=lambda enabled, model, prompt, images=None, options=None, system_prompt='': events.append(
                ('generate_vision_stream', enabled, model, prompt, images, options, system_prompt)
            ) or iter(['vision-chunk'])
        ),
    )

    assert list(service_module.openai_generate_vision_stream('gpt-test', 'describe', images=['img'], options={'temperature': 0.3}, system_prompt='sys')) == ['vision-chunk']
    assert events == [
        ('ensure', False),
        ('generate_vision_stream', True, 'gpt-test', 'describe', ['img'], {'temperature': 0.3}, 'sys'),
    ]


def test_lmstudio_rest_generate_uses_with_stream_provider_method(monkeypatch, service_module):
    events = []

    monkeypatch.setattr(service_module, 'ensure_lmstudio_rest_initialized', lambda force=False: events.append(('ensure', force)) or True)
    monkeypatch.setattr(service_module, 'is_lmstudio_rest_enabled', lambda: True)
    monkeypatch.setattr(
        service_module,
        'lmstudio_rest_provider',
        SimpleNamespace(
            generate_with_stream=lambda enabled, model, prompt, options=None, system_prompt='': events.append(
                ('generate_with_stream', enabled, model, prompt, options, system_prompt)
            ) or 'lm-result'
        ),
    )

    assert service_module.lmstudio_rest_generate('lm-model', 'hello', options={'temperature': 0.3}, system_prompt='sys') == 'lm-result'
    assert events == [
        ('ensure', False),
        ('generate_with_stream', True, 'lm-model', 'hello', {'temperature': 0.3}, 'sys'),
    ]


def test_lmstudio_rest_generate_vision_uses_with_stream_provider_method(monkeypatch, service_module):
    events = []

    monkeypatch.setattr(service_module, 'ensure_lmstudio_rest_initialized', lambda force=False: events.append(('ensure', force)) or True)
    monkeypatch.setattr(service_module, 'is_lmstudio_rest_enabled', lambda: True)
    monkeypatch.setattr(
        service_module,
        'lmstudio_rest_provider',
        SimpleNamespace(
            generate_vision_with_stream=lambda enabled, model, prompt, images, options=None, system_prompt='': events.append(
                ('generate_vision_with_stream', enabled, model, prompt, images, options, system_prompt)
            ) or 'lm-vision-result'
        ),
    )

    assert service_module.lmstudio_rest_generate_vision(
        'lm-model',
        'describe',
        images=['img'],
        options={'temperature': 0.2},
        system_prompt='sys',
    ) == 'lm-vision-result'
    assert events == [
        ('ensure', False),
        ('generate_vision_with_stream', True, 'lm-model', 'describe', ['img'], {'temperature': 0.2}, 'sys'),
    ]


def test_lmstudio_rest_generate_stream_uses_stream_provider_method(monkeypatch, service_module):
    events = []

    monkeypatch.setattr(service_module, 'ensure_lmstudio_rest_initialized', lambda force=False: events.append(('ensure', force)) or True)
    monkeypatch.setattr(service_module, 'is_lmstudio_rest_enabled', lambda: True)
    monkeypatch.setattr(
        service_module,
        'lmstudio_rest_provider',
        SimpleNamespace(
            generate_stream=lambda enabled, model, prompt, options=None, system_prompt='': events.append(
                ('generate_stream', enabled, model, prompt, options, system_prompt)
            ) or iter(['lm-chunk'])
        ),
    )

    assert list(service_module.lmstudio_rest_generate_stream('lm-model', 'hello', options={'temperature': 0.4}, system_prompt='sys')) == ['lm-chunk']
    assert events == [
        ('ensure', False),
        ('generate_stream', True, 'lm-model', 'hello', {'temperature': 0.4}, 'sys'),
    ]


def test_lmstudio_rest_generate_vision_stream_uses_stream_provider_method(monkeypatch, service_module):
    events = []

    monkeypatch.setattr(service_module, 'ensure_lmstudio_rest_initialized', lambda force=False: events.append(('ensure', force)) or True)
    monkeypatch.setattr(service_module, 'is_lmstudio_rest_enabled', lambda: True)
    monkeypatch.setattr(
        service_module,
        'lmstudio_rest_provider',
        SimpleNamespace(
            generate_vision_stream=lambda enabled, model, prompt, images, options=None, system_prompt='': events.append(
                ('generate_vision_stream', enabled, model, prompt, images, options, system_prompt)
            ) or iter(['lm-vision-chunk'])
        ),
    )

    assert list(service_module.lmstudio_rest_generate_vision_stream('lm-model', 'describe', images=['img'], options={'temperature': 0.1}, system_prompt='sys')) == ['lm-vision-chunk']
    assert events == [
        ('ensure', False),
        ('generate_vision_stream', True, 'lm-model', 'describe', ['img'], {'temperature': 0.1}, 'sys'),
    ]


def test_ollama_rest_generate_stream_forwards_keep_alive(monkeypatch, service_module):
    calls = []

    monkeypatch.setattr(
        service_module,
        'ensure_ollama_rest_initialized',
        lambda force=False: True,
    )
    monkeypatch.setattr(service_module, 'is_ollama_rest_enabled', lambda: True)
    monkeypatch.setattr(
        service_module,
        'ollama_rest_provider',
        SimpleNamespace(
            generate_stream=lambda enabled, model, prompt, options=None, system_prompt='', keep_alive='5m': calls.append(
                (enabled, model, prompt, options, system_prompt, keep_alive)
            ) or iter(['chunk'])
        ),
    )

    result = service_module.ollama_rest_generate_stream(
        'ollama-model',
        'hello',
        keep_alive='9s',
        options={'seed': 1},
        system_prompt='sys',
    )

    assert list(result) == ['chunk']
    assert calls == [(True, 'ollama-model', 'hello', {'seed': 1}, 'sys', '9s')]


def test_lmstudio_rest_load_model_uses_provider_dispatch(monkeypatch, service_module):
    events = []

    monkeypatch.setattr(service_module, 'ensure_lmstudio_rest_initialized', lambda force=False: events.append(('ensure', force)) or True)
    monkeypatch.setattr(service_module, 'is_lmstudio_rest_enabled', lambda: True)
    monkeypatch.setattr(
        service_module,
        'lmstudio_rest_provider',
        SimpleNamespace(load_model=lambda enabled, model, keep_alive=0: events.append(('load_model', enabled, model, keep_alive)) or True),
    )

    assert service_module.lmstudio_rest_load_model('lm-model', keep_alive=12) is True
    assert events == [
        ('ensure', False),
        ('load_model', True, 'lm-model', 12),
    ]


def test_lmstudio_rest_unload_model_uses_provider_dispatch(monkeypatch, service_module):
    events = []

    monkeypatch.setattr(service_module, 'is_lmstudio_rest_enabled', lambda: True)
    monkeypatch.setattr(
        service_module,
        'lmstudio_rest_provider',
        SimpleNamespace(unload_model=lambda enabled, model: events.append(('unload_model', enabled, model)) or True),
    )

    assert service_module.lmstudio_rest_unload_model('lm-model') is True
    assert events == [
        ('unload_model', True, 'lm-model'),
    ]


def test_ensure_lmstudio_rest_initialized_skips_retry_with_recent_failure(monkeypatch, service_module):
    monkeypatch.setattr(sys.modules['comfyui_sageutils.utils.settings'], 'get_setting', lambda key, default=False: True)
    monkeypatch.setattr(service_module.time, 'monotonic', lambda: 100.0)
    monkeypatch.setattr(service_module, 'init_lmstudio_rest', lambda: (_ for _ in ()).throw(AssertionError('should not re-init')))

    service_module._lmstudio_rest_initialized = False
    service_module.LMSTUDIO_REST_AVAILABLE = False
    service_module._lmstudio_rest_last_checked = 70.0

    assert service_module.ensure_lmstudio_rest_initialized() is False


def test_ensure_lmstudio_rest_initialized_force_retries(monkeypatch, service_module):
    calls = []

    monkeypatch.setattr(sys.modules['comfyui_sageutils.utils.settings'], 'get_setting', lambda key, default=False: True)
    monkeypatch.setattr(service_module.time, 'monotonic', lambda: 100.0)
    monkeypatch.setattr(service_module, 'init_lmstudio_rest', lambda: calls.append('init') or True)

    service_module._lmstudio_rest_initialized = False
    service_module.LMSTUDIO_REST_AVAILABLE = False
    service_module._lmstudio_rest_last_checked = 70.0

    assert service_module.ensure_lmstudio_rest_initialized(force=True) is True
    assert calls == ['init']


def test_ensure_ollama_rest_initialized_returns_true_when_already_initialized(monkeypatch, service_module):
    monkeypatch.setattr(sys.modules['comfyui_sageutils.utils.settings'], 'get_setting', lambda key, default=False: True)
    service_module._ollama_rest_initialized = True

    assert service_module.ensure_ollama_rest_initialized() is True


def test_ensure_llm_initialized_returns_any_success(monkeypatch, service_module):
    monkeypatch.setattr(service_module, 'ensure_lmstudio_rest_initialized', lambda force=False: False)
    monkeypatch.setattr(service_module, 'ensure_ollama_rest_initialized', lambda force=False: True)
    monkeypatch.setattr(service_module, 'ensure_openai_initialized', lambda force=False: False)

    assert service_module.ensure_llm_initialized() is True


def test_init_llm_initializes_registered_providers_in_order(monkeypatch, service_module):
    calls = []

    monkeypatch.setattr(
        service_module,
        '_PROVIDER_DESCRIPTORS',
        (
            SimpleNamespace(key='lmstudio_rest'),
            SimpleNamespace(key='ollama_rest'),
            SimpleNamespace(key='openai'),
        ),
    )
    monkeypatch.setattr(service_module, '_init_provider', lambda key: calls.append(key) or True)

    service_module.init_llm()

    assert calls == ['lmstudio_rest', 'ollama_rest', 'openai']


def test_ensure_llm_initializes_registered_providers_in_order(monkeypatch, service_module):
    calls = []

    monkeypatch.setattr(
        service_module,
        '_PROVIDER_DESCRIPTORS',
        (
            SimpleNamespace(key='lmstudio_rest'),
            SimpleNamespace(key='ollama_rest'),
            SimpleNamespace(key='openai'),
        ),
    )
    monkeypatch.setattr(service_module, 'ensure_lmstudio_rest_initialized', lambda force=False: calls.append(('lmstudio_rest', force)) or False)
    monkeypatch.setattr(service_module, 'ensure_ollama_rest_initialized', lambda force=False: calls.append(('ollama_rest', force)) or True)
    monkeypatch.setattr(service_module, 'ensure_openai_initialized', lambda force=False: calls.append(('openai', force)) or False)

    assert service_module.ensure_llm_initialized(force=True) is True
    assert calls == [
        ('lmstudio_rest', True),
        ('ollama_rest', True),
        ('openai', True),
    ]


def test_reset_llm_initialization_state_clears_all_flags(service_module):
    service_module._lmstudio_rest_initialized = True
    service_module._ollama_rest_initialized = True
    service_module._openai_initialized = True
    service_module.LMSTUDIO_REST_AVAILABLE = True
    service_module.OLLAMA_REST_AVAILABLE = True
    service_module.OPENAI_AVAILABLE = True
    service_module._lmstudio_rest_last_checked = 1.0
    service_module._ollama_rest_last_checked = 2.0
    service_module._openai_last_checked = 3.0

    service_module.reset_llm_initialization_state()

    assert service_module._lmstudio_rest_initialized is False
    assert service_module._ollama_rest_initialized is False
    assert service_module._openai_initialized is False
    assert service_module.LMSTUDIO_REST_AVAILABLE is False
    assert service_module.OLLAMA_REST_AVAILABLE is False
    assert service_module.OPENAI_AVAILABLE is False
    assert service_module._lmstudio_rest_last_checked is None
    assert service_module._ollama_rest_last_checked is None
    assert service_module._openai_last_checked is None


def test_init_updates_registry_and_legacy_globals(monkeypatch, service_module):
    monkeypatch.setattr(sys.modules['comfyui_sageutils.utils.settings'], 'get_setting', lambda key, default=False: True)
    monkeypatch.setattr(service_module.time, 'monotonic', lambda: 321.0)
    monkeypatch.setattr(service_module, '_init_openai_provider', lambda enabled: True)

    assert service_module.init_openai() is True

    state = service_module._provider_registry.state('openai')
    assert state.initialized is True
    assert state.available is True
    assert state.last_checked == 321.0
    assert service_module._openai_initialized is True
    assert service_module.OPENAI_AVAILABLE is True
    assert service_module._openai_last_checked == 321.0

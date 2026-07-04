import time

from ..logger import get_logger
from .providers.settings import (
    is_lmstudio_rest_enabled,
    is_ollama_rest_enabled,
    is_openai_enabled,
)
from .init import (
    init_lmstudio_rest as _init_lmstudio_rest,
    init_ollama_rest as _init_ollama_rest,
    init_openai_provider as _init_openai_provider,
)
from .providers.lmstudio import client as lmstudio_rest_provider
from .providers.ollama import client as ollama_rest_provider
from .providers.openai import client as openai_provider
from .provider_keys import LMSTUDIO_REST_KEY, OLLAMA_REST_KEY, OPENAI_KEY, normalize_provider_key
from . import registry as llm_registry

logger = get_logger('llm')

# Initialization flags to track if services have been initialized
_lmstudio_rest_initialized = False
_ollama_rest_initialized = False
_openai_initialized = False

# Provider reachability state and retry timing.
LMSTUDIO_REST_AVAILABLE = False
OLLAMA_REST_AVAILABLE = False
OPENAI_AVAILABLE = False

_LLM_INITIALIZATION_RETRY_SECONDS = 60.0
_lmstudio_rest_last_checked = None
_ollama_rest_last_checked = None
_openai_last_checked = None

_PROVIDER_DESCRIPTORS = (
    llm_registry.ProviderDescriptor(
        key=LMSTUDIO_REST_KEY,
        setting_key='enable_lmstudio_rest',
        display_name='LM Studio REST',
        initializer=_init_lmstudio_rest,
    ),
    llm_registry.ProviderDescriptor(
        key=OLLAMA_REST_KEY,
        setting_key='enable_ollama_rest',
        display_name='Ollama REST',
        initializer=_init_ollama_rest,
    ),
    llm_registry.ProviderDescriptor(
        key=OPENAI_KEY,
        setting_key='enable_openai',
        display_name='OpenAI provider',
        initializer=_init_openai_provider,
    ),
)

_PROVIDER_GLOBAL_BINDINGS = {
    LMSTUDIO_REST_KEY: ('_lmstudio_rest_initialized', 'LMSTUDIO_REST_AVAILABLE', '_lmstudio_rest_last_checked'),
    OLLAMA_REST_KEY: ('_ollama_rest_initialized', 'OLLAMA_REST_AVAILABLE', '_ollama_rest_last_checked'),
    OPENAI_KEY: ('_openai_initialized', 'OPENAI_AVAILABLE', '_openai_last_checked'),
}

_PROVIDER_CLIENT_ATTRS = {
    LMSTUDIO_REST_KEY: 'lmstudio_rest_provider',
    OLLAMA_REST_KEY: 'ollama_rest_provider',
    OPENAI_KEY: 'openai_provider',
}

_PROVIDER_ENABLED_CHECK_ATTRS = {
    LMSTUDIO_REST_KEY: 'is_lmstudio_rest_enabled',
    OLLAMA_REST_KEY: 'is_ollama_rest_enabled',
    OPENAI_KEY: 'is_openai_enabled',
}

_provider_registry = llm_registry.ProviderRegistry(retry_seconds=_LLM_INITIALIZATION_RETRY_SECONDS)
for _provider_descriptor in _PROVIDER_DESCRIPTORS:
    _provider_registry.register(_provider_descriptor)


def _sync_registry_from_legacy_globals() -> None:
    global_values = globals()
    for provider_key, (initialized_name, available_name, last_checked_name) in _PROVIDER_GLOBAL_BINDINGS.items():
        _provider_registry.set_state(
            provider_key,
            initialized=global_values[initialized_name],
            available=global_values[available_name],
            last_checked=global_values[last_checked_name],
        )


def _sync_legacy_globals_from_registry() -> None:
    global_values = globals()
    for provider_key, (initialized_name, available_name, last_checked_name) in _PROVIDER_GLOBAL_BINDINGS.items():
        provider_state = _provider_registry.state(provider_key)
        global_values[initialized_name] = provider_state.initialized
        global_values[available_name] = provider_state.available
        global_values[last_checked_name] = provider_state.last_checked


def _init_provider(provider_key: str) -> bool:
    from ..settings import get_setting

    descriptor = _provider_registry.descriptor(provider_key)
    enabled = bool(get_setting(descriptor.setting_key, False))
    initialized = descriptor.initializer(enabled)
    _provider_registry.set_state(
        provider_key,
        initialized=initialized,
        available=initialized,
        last_checked=time.monotonic(),
    )
    _sync_legacy_globals_from_registry()
    return initialized


def _ensure_provider_initialized(provider_key: str, force: bool = False, init_func=None) -> bool:
    from ..settings import get_setting

    _sync_registry_from_legacy_globals()
    descriptor = _provider_registry.descriptor(provider_key)
    if not get_setting(descriptor.setting_key, False):
        return False

    state = _provider_registry.state(provider_key)
    if state.initialized:
        return True

    if not force and state.last_checked is not None:
        if time.monotonic() - state.last_checked < _provider_registry.retry_seconds:
            return state.available

    logger.info(f'{descriptor.display_name} is enabled but not initialized, initializing now...')
    if init_func is not None:
        return init_func()
    return _init_provider(provider_key)


def _provider_client(provider_key: str):
    return globals()[_PROVIDER_CLIENT_ATTRS[provider_key]]


def _provider_enabled(provider_key: str) -> bool:
    return globals()[_PROVIDER_ENABLED_CHECK_ATTRS[provider_key]]()


def _get_models_by_kind(provider_key: str, kind: str) -> list[str]:
    method_map = {
        'text': 'get_models',
        'vision': 'get_vision_models',
        'tool': 'get_tool_models',
        'reasoning': 'get_reasoning_models',
    }
    method_name = method_map[kind]
    provider = _provider_client(provider_key)
    enabled = _provider_enabled(provider_key)
    return getattr(provider, method_name)(enabled)


def _get_model_capabilities_dict(provider_key: str) -> dict[str, dict[str, object]]:
    provider = _provider_client(provider_key)
    enabled = _provider_enabled(provider_key)
    capability_map = provider.get_model_capabilities_map(enabled)
    return {model_name: capabilities.to_dict() for model_name, capabilities in capability_map.items()}


def _generate_non_streaming(
    provider_key: str,
    model: str,
    prompt: str,
    *,
    options=None,
    system_prompt: str = '',
    keep_alive: str | None = None,
) -> str:
    provider = _provider_client(provider_key)
    enabled = _provider_enabled(provider_key)
    kwargs = {
        'options': options,
        'system_prompt': system_prompt,
    }
    if keep_alive is not None:
        kwargs['keep_alive'] = keep_alive
    return provider.generate(enabled, model, prompt, **kwargs)


def _generate_vision_non_streaming(
    provider_key: str,
    model: str,
    prompt: str,
    *,
    images=None,
    options=None,
    system_prompt: str = '',
    keep_alive: str | None = None,
) -> str:
    provider = _provider_client(provider_key)
    enabled = _provider_enabled(provider_key)
    kwargs = {
        'images': images,
        'options': options,
        'system_prompt': system_prompt,
    }
    if keep_alive is not None:
        kwargs['keep_alive'] = keep_alive
    return provider.generate_vision(enabled, model, prompt, **kwargs)


def _generate_streaming(
    provider_key: str,
    model: str,
    prompt: str,
    *,
    options=None,
    system_prompt: str = '',
    keep_alive: str | None = None,
):
    provider = _provider_client(provider_key)
    enabled = _provider_enabled(provider_key)
    kwargs = {
        'options': options,
        'system_prompt': system_prompt,
    }
    if keep_alive is not None:
        kwargs['keep_alive'] = keep_alive
    return provider.generate_stream(enabled, model, prompt, **kwargs)


def _generate_vision_streaming(
    provider_key: str,
    model: str,
    prompt: str,
    *,
    images=None,
    options=None,
    system_prompt: str = '',
    keep_alive: str | None = None,
):
    provider = _provider_client(provider_key)
    enabled = _provider_enabled(provider_key)
    kwargs = {
        'images': images,
        'options': options,
        'system_prompt': system_prompt,
    }
    if keep_alive is not None:
        kwargs['keep_alive'] = keep_alive
    return provider.generate_vision_stream(enabled, model, prompt, **kwargs)


def generate(
    provider_key: str,
    model: str,
    prompt: str,
    *,
    options=None,
    system_prompt: str = '',
    keep_alive=None,
):
    provider_key = normalize_provider_key(provider_key)

    if provider_key == LMSTUDIO_REST_KEY:
        return lmstudio_rest_generate(
            model,
            prompt,
            keep_alive=int(keep_alive) if keep_alive is not None else 0,
            options=options,
            system_prompt=system_prompt,
        )
    if provider_key == OLLAMA_REST_KEY:
        return ollama_rest_generate(
            model,
            prompt,
            options=options,
            system_prompt=system_prompt,
            keep_alive=keep_alive,
        )
    if provider_key == OPENAI_KEY:
        return openai_generate(
            model,
            prompt,
            options=options,
            system_prompt=system_prompt,
        )

    raise ValueError(f'Unsupported provider for generate: {provider_key}')


def generate_stream(
    provider_key: str,
    model: str,
    prompt: str,
    *,
    options=None,
    system_prompt: str = '',
    keep_alive=None,
):
    provider_key = normalize_provider_key(provider_key)

    if provider_key == LMSTUDIO_REST_KEY:
        return lmstudio_rest_generate_stream(
            model,
            prompt,
            keep_alive=int(keep_alive) if keep_alive is not None else 0,
            options=options,
            system_prompt=system_prompt,
        )
    if provider_key == OLLAMA_REST_KEY:
        return ollama_rest_generate_stream(
            model,
            prompt,
            options=options,
            system_prompt=system_prompt,
            keep_alive=keep_alive,
        )
    if provider_key == OPENAI_KEY:
        return openai_generate_stream(
            model,
            prompt,
            options=options,
            system_prompt=system_prompt,
        )

    raise ValueError(f'Unsupported provider for generate_stream: {provider_key}')


def generate_vision(
    provider_key: str,
    model: str,
    prompt: str,
    *,
    images=None,
    options=None,
    system_prompt: str = '',
    keep_alive=None,
):
    provider_key = normalize_provider_key(provider_key)

    if provider_key == LMSTUDIO_REST_KEY:
        return lmstudio_rest_generate_vision(
            model,
            prompt,
            images=images,
            options=options,
            system_prompt=system_prompt,
            keep_alive=int(keep_alive) if keep_alive is not None else 0,
        )
    if provider_key == OLLAMA_REST_KEY:
        return ollama_rest_generate_vision(
            model,
            prompt,
            images=images,
            options=options,
            system_prompt=system_prompt,
            keep_alive=keep_alive,
        )
    if provider_key == OPENAI_KEY:
        return openai_generate_vision(
            model,
            prompt,
            images=images,
            options=options,
            system_prompt=system_prompt,
        )

    raise ValueError(f'Unsupported provider for generate_vision: {provider_key}')


def generate_vision_stream(
    provider_key: str,
    model: str,
    prompt: str,
    *,
    images=None,
    options=None,
    system_prompt: str = '',
    keep_alive=None,
):
    provider_key = normalize_provider_key(provider_key)

    if provider_key == LMSTUDIO_REST_KEY:
        return lmstudio_rest_generate_vision_stream(
            model,
            prompt,
            images=images,
            options=options,
            system_prompt=system_prompt,
            keep_alive=int(keep_alive) if keep_alive is not None else 0,
        )
    if provider_key == OLLAMA_REST_KEY:
        return ollama_rest_generate_vision_stream(
            model,
            prompt,
            images=images,
            options=options,
            system_prompt=system_prompt,
            keep_alive=keep_alive,
        )
    if provider_key == OPENAI_KEY:
        return openai_generate_vision_stream(
            model,
            prompt,
            images=images,
            options=options,
            system_prompt=system_prompt,
        )

    raise ValueError(f'Unsupported provider for generate_vision_stream: {provider_key}')


def _generate_lmstudio_non_streaming(model: str, prompt: str, *, options=None, system_prompt: str = '') -> str:
    provider = _provider_client('lmstudio_rest')
    enabled = _provider_enabled('lmstudio_rest')
    return provider.generate_with_stream(
        enabled,
        model,
        prompt,
        options=options,
        system_prompt=system_prompt,
    )


def _generate_lmstudio_vision_non_streaming(model: str, prompt: str, *, images=None, options=None, system_prompt: str = '') -> str:
    provider = _provider_client('lmstudio_rest')
    enabled = _provider_enabled('lmstudio_rest')
    return provider.generate_vision_with_stream(
        enabled,
        model,
        prompt,
        images,
        options=options,
        system_prompt=system_prompt,
    )


def _generate_lmstudio_streaming(model: str, prompt: str, *, options=None, system_prompt: str = ''):
    return _generate_streaming(
        LMSTUDIO_REST_KEY,
        model,
        prompt,
        options=options,
        system_prompt=system_prompt,
    )


def _generate_lmstudio_vision_streaming(model: str, prompt: str, *, images=None, options=None, system_prompt: str = ''):
    return _generate_vision_streaming(
        LMSTUDIO_REST_KEY,
        model,
        prompt,
        images=images,
        options=options,
        system_prompt=system_prompt,
    )


def _load_provider_model(
    provider_key: str,
    model: str,
    *,
    keep_alive: int = 0,
) -> bool:
    provider = _provider_client(provider_key)
    enabled = _provider_enabled(provider_key)
    return provider.load_model(enabled, model, keep_alive)


def _unload_provider_model(
    provider_key: str,
    model: str,
) -> bool:
    provider = _provider_client(provider_key)
    enabled = _provider_enabled(provider_key)
    return provider.unload_model(enabled, model)


# ============================================================================
# MODEL DISCOVERY
# ============================================================================
def get_lmstudio_rest_models() -> list[str]:
    """Retrieve text models from LM Studio REST."""
    return _get_models_by_kind(LMSTUDIO_REST_KEY, 'text')


def get_lmstudio_rest_vision_models() -> list[str]:
    """Retrieve vision models from LM Studio REST."""
    return _get_models_by_kind(LMSTUDIO_REST_KEY, 'vision')


def get_ollama_rest_models() -> list[str]:
    """Retrieve text models from Ollama REST."""
    return _get_models_by_kind(OLLAMA_REST_KEY, 'text')


def get_ollama_rest_vision_models() -> list[str]:
    """Retrieve vision models from Ollama REST."""
    return _get_models_by_kind(OLLAMA_REST_KEY, 'vision')


def get_openai_models() -> list[str]:
    """Retrieve text models from OpenAI-compatible provider."""
    return _get_models_by_kind(OPENAI_KEY, 'text')


def get_openai_vision_models() -> list[str]:
    """Retrieve vision models from OpenAI-compatible provider."""
    return _get_models_by_kind(OPENAI_KEY, 'vision')


def get_lmstudio_rest_tool_models() -> list[str]:
    """Retrieve tool-capable models from LM Studio REST."""
    return _get_models_by_kind('lmstudio_rest', 'tool')


def get_lmstudio_rest_reasoning_models() -> list[str]:
    """Retrieve reasoning-capable models from LM Studio REST."""
    return _get_models_by_kind('lmstudio_rest', 'reasoning')


def get_ollama_rest_tool_models() -> list[str]:
    """Retrieve tool-capable models from Ollama REST."""
    return _get_models_by_kind('ollama_rest', 'tool')


def get_ollama_rest_reasoning_models() -> list[str]:
    """Retrieve reasoning-capable models from Ollama REST."""
    return _get_models_by_kind('ollama_rest', 'reasoning')


def get_openai_tool_models() -> list[str]:
    """Retrieve tool-capable models from OpenAI-compatible provider."""
    return _get_models_by_kind('openai', 'tool')


def get_openai_reasoning_models() -> list[str]:
    """Retrieve reasoning-capable models from OpenAI-compatible provider."""
    return _get_models_by_kind('openai', 'reasoning')


def get_lmstudio_rest_model_capabilities_map() -> dict[str, dict[str, object]]:
    """Retrieve model capabilities map from LM Studio REST."""
    return _get_model_capabilities_dict('lmstudio_rest')


def get_ollama_rest_model_capabilities_map() -> dict[str, dict[str, object]]:
    """Retrieve model capabilities map from Ollama REST."""
    return _get_model_capabilities_dict('ollama_rest')


def get_openai_model_capabilities_map() -> dict[str, dict[str, object]]:
    """Retrieve model capabilities map from OpenAI-compatible provider."""
    return _get_model_capabilities_dict('openai')


# ============================================================================
# GENERATION (NON-STREAMING)
# ============================================================================

# Canonical provider operations (LM Studio REST)
def lmstudio_rest_generate(model: str, prompt: str, keep_alive: int = 0, options=None, system_prompt: str = '') -> str:
    """Generate text via LM Studio REST."""
    ensure_lmstudio_rest_initialized()
    return _generate_lmstudio_non_streaming(
        model,
        prompt,
        options=options,
        system_prompt=system_prompt,
    )


def lmstudio_rest_generate_vision(model: str, prompt: str, keep_alive: int = 0, images=None, options=None, system_prompt: str = '') -> str:
    """Generate vision output via LM Studio REST."""
    ensure_lmstudio_rest_initialized()
    return _generate_lmstudio_vision_non_streaming(
        model,
        prompt,
        images=images,
        options=options,
        system_prompt=system_prompt,
    )


# Canonical provider operations (Ollama REST)
def ollama_rest_generate(model: str, prompt: str, options=None, system_prompt: str = '', keep_alive: str = '5m') -> str:
    """Generate text via Ollama REST."""
    ensure_ollama_rest_initialized()
    return _generate_non_streaming(
        'ollama_rest',
        model,
        prompt,
        options=options,
        system_prompt=system_prompt,
        keep_alive=keep_alive,
    )


def ollama_rest_generate_vision(model: str, prompt: str, images=None, options=None, system_prompt: str = '', keep_alive: str = '5m') -> str:
    """Generate vision output via Ollama REST."""
    ensure_ollama_rest_initialized()
    return _generate_vision_non_streaming(
        'ollama_rest',
        model,
        prompt,
        images=images,
        options=options,
        system_prompt=system_prompt,
        keep_alive=keep_alive,
    )


# Canonical provider operations (OpenAI)
def openai_generate(model: str, prompt: str, options=None, system_prompt: str = '') -> str:
    """Generate text via OpenAI-compatible provider."""
    ensure_openai_initialized()
    return _generate_non_streaming(
        'openai',
        model,
        prompt,
        options=options,
        system_prompt=system_prompt,
    )


def openai_generate_vision(model: str, prompt: str, images=None, options=None, system_prompt: str = '') -> str:
    """Generate vision output via OpenAI-compatible provider."""
    ensure_openai_initialized()
    return _generate_vision_non_streaming(
        'openai',
        model,
        prompt,
        images=images,
        options=options,
        system_prompt=system_prompt,
    )


# ============================================================================
# GENERATION (STREAMING)
# ============================================================================

# Canonical provider operations (LM Studio REST)
def lmstudio_rest_generate_stream(model: str, prompt: str, keep_alive: int = 0, options=None, system_prompt: str = ''):
    """Stream text via LM Studio REST."""
    ensure_lmstudio_rest_initialized()
    return _generate_lmstudio_streaming(
        model,
        prompt,
        options=options,
        system_prompt=system_prompt,
    )


def lmstudio_rest_generate_vision_stream(model: str, prompt: str, keep_alive: int = 0, images=None, options=None, system_prompt: str = ''):
    """Stream vision output via LM Studio REST."""
    ensure_lmstudio_rest_initialized()
    return _generate_lmstudio_vision_streaming(
        model,
        prompt,
        images=images,
        options=options,
        system_prompt=system_prompt,
    )


# Canonical provider operations (Ollama REST)
def ollama_rest_generate_stream(model: str, prompt: str, options=None, system_prompt: str = '', keep_alive: str = '5m'):
    """Stream text via Ollama REST."""
    ensure_ollama_rest_initialized()
    return _generate_streaming(
        'ollama_rest',
        model,
        prompt,
        options=options,
        system_prompt=system_prompt,
        keep_alive=keep_alive,
    )


def ollama_rest_generate_vision_stream(model: str, prompt: str, images=None, options=None, system_prompt: str = '', keep_alive: str = '5m'):
    """Stream vision output via Ollama REST."""
    ensure_ollama_rest_initialized()
    return _generate_vision_streaming(
        'ollama_rest',
        model,
        prompt,
        images=images,
        options=options,
        system_prompt=system_prompt,
        keep_alive=keep_alive,
    )


# Canonical provider operations (OpenAI)
def openai_generate_stream(model: str, prompt: str, options=None, system_prompt: str = ''):
    """Stream text via OpenAI-compatible provider."""
    ensure_openai_initialized()
    return _generate_streaming(
        'openai',
        model,
        prompt,
        options=options,
        system_prompt=system_prompt,
    )


def openai_generate_vision_stream(model: str, prompt: str, images=None, options=None, system_prompt: str = ''):
    """Stream vision output via OpenAI-compatible provider."""
    ensure_openai_initialized()
    return _generate_vision_streaming(
        'openai',
        model,
        prompt,
        images=images,
        options=options,
        system_prompt=system_prompt,
    )


# ============================================================================
# MODEL LOAD / UNLOAD HELPERS
# ============================================================================
# Canonical provider operations (LM Studio REST)
def lmstudio_rest_load_model(model: str, keep_alive: int = 0) -> bool:
    """Load LM Studio REST model by name."""
    ensure_lmstudio_rest_initialized()
    return _load_provider_model('lmstudio_rest', model, keep_alive=keep_alive)


def lmstudio_rest_unload_model(model: str) -> bool:
    """Unload LM Studio REST model by name."""
    return _unload_provider_model('lmstudio_rest', model)


# ============================================================================
# INITIALIZATION
# ============================================================================
# Canonical provider operations (initialization)
def init_lmstudio_rest() -> bool:
    """Initialize LM Studio REST provider state."""
    return _init_provider('lmstudio_rest')


def init_ollama_rest() -> bool:
    """Initialize Ollama REST provider state."""
    return _init_provider('ollama_rest')


def init_openai() -> bool:
    """Initialize OpenAI provider state."""
    return _init_provider('openai')


def _init_registered_providers() -> dict[str, bool]:
    """Initialize providers in descriptor registration order."""
    results: dict[str, bool] = {}
    for descriptor in _PROVIDER_DESCRIPTORS:
        results[descriptor.key] = _init_provider(descriptor.key)
    return results


def _ensure_registered_providers(force: bool = False) -> dict[str, bool]:
    """Ensure providers in descriptor registration order."""
    ensure_map = {
        'lmstudio_rest': ensure_lmstudio_rest_initialized,
        'ollama_rest': ensure_ollama_rest_initialized,
        'openai': ensure_openai_initialized,
    }
    results: dict[str, bool] = {}
    for descriptor in _PROVIDER_DESCRIPTORS:
        ensure_func = ensure_map.get(descriptor.key)
        if ensure_func is None:
            continue
        results[descriptor.key] = ensure_func(force=force)
    return results


def init_llm() -> None:
    """Initialize all configured REST/OpenAI providers."""
    _init_registered_providers()
    logger.info('LLM providers initialized.')


# Canonical provider operations (ensure initialization)
def ensure_lmstudio_rest_initialized(force: bool = False) -> bool:
    """Ensure LM Studio REST is initialized if enabled."""
    return _ensure_provider_initialized('lmstudio_rest', force=force, init_func=init_lmstudio_rest)


def ensure_ollama_rest_initialized(force: bool = False) -> bool:
    """Ensure Ollama REST is initialized if enabled."""
    return _ensure_provider_initialized('ollama_rest', force=force, init_func=init_ollama_rest)


def ensure_openai_initialized(force: bool = False) -> bool:
    """Ensure OpenAI provider is initialized if enabled."""
    return _ensure_provider_initialized('openai', force=force, init_func=init_openai)


def ensure_llm_initialized(force: bool = False) -> bool:
    """Ensure all enabled LLM services are initialized."""
    ensure_results = _ensure_registered_providers(force=force)
    return any(ensure_results.values())


def reset_llm_initialization_state() -> None:
    """Reset initialization flags."""
    global _lmstudio_rest_initialized, _ollama_rest_initialized, _openai_initialized
    global LMSTUDIO_REST_AVAILABLE, OLLAMA_REST_AVAILABLE, OPENAI_AVAILABLE
    global _lmstudio_rest_last_checked, _ollama_rest_last_checked, _openai_last_checked

    _lmstudio_rest_initialized = False
    _ollama_rest_initialized = False
    _openai_initialized = False
    LMSTUDIO_REST_AVAILABLE = False
    OLLAMA_REST_AVAILABLE = False
    OPENAI_AVAILABLE = False
    _lmstudio_rest_last_checked = None
    _ollama_rest_last_checked = None
    _openai_last_checked = None

    _provider_registry.reset()

from ..logger import get_logger
from .providers.settings import (
    is_lmstudio_enabled,
    is_lmstudio_rest_enabled,
    is_ollama_enabled,
    is_ollama_rest_enabled,
    is_openai_enabled,
)
from .init import (
    init_lmstudio_rest as _init_lmstudio_rest,
    init_ollama_rest as _init_ollama_rest,
    init_openai_provider as _init_openai_provider,
)
from .providers.lmstudio import lmstudio_rest_client as lmstudio_rest_provider
from .providers.ollama import ollama_rest_client as ollama_rest_provider
from .providers.openai import openai_client as openai_provider

logger = get_logger('llm')

# Initialization flags to track if services have been initialized
_lmstudio_rest_initialized = False
_ollama_rest_initialized = False
_openai_initialized = False

# REST providers use HTTP APIs and do not require local SDK packages.
LMSTUDIO_REST_AVAILABLE = True
OLLAMA_REST_AVAILABLE = True
OPENAI_AVAILABLE = True


def _is_lmstudio_service_enabled() -> bool:
    """Treat legacy LM Studio SDK toggle as an alias for REST service usage."""
    return is_lmstudio_rest_enabled() or is_lmstudio_enabled()


def _is_ollama_service_enabled() -> bool:
    """Treat legacy Ollama SDK toggle as an alias for REST service usage."""
    return is_ollama_rest_enabled() or is_ollama_enabled()


def _normalize_ollama_keep_alive(value, default: str = '5m') -> str:
    """Normalize keep_alive values for Ollama REST calls."""
    if isinstance(value, str) and value.strip():
        return value.strip()
    if isinstance(value, (int, float)) and value > 0:
        return f'{int(value)}s'
    return default


# ============================================================================
# MODEL DISCOVERY
# ============================================================================

def get_lmstudio_models() -> list[str]:
    """Legacy alias: retrieve text models from LM Studio REST."""
    return lmstudio_rest_provider.get_models(_is_lmstudio_service_enabled())


def get_lmstudio_vision_models() -> list[str]:
    """Legacy alias: retrieve vision models from LM Studio REST."""
    return lmstudio_rest_provider.get_vision_models(_is_lmstudio_service_enabled())


def get_ollama_models() -> list[str]:
    """Legacy alias: retrieve text models from Ollama REST."""
    return ollama_rest_provider.get_models(_is_ollama_service_enabled())


def get_ollama_vision_models() -> list[str]:
    """Legacy alias: retrieve vision models from Ollama REST."""
    return ollama_rest_provider.get_vision_models(_is_ollama_service_enabled())


def get_lmstudio_rest_models() -> list[str]:
    """Retrieve text models from LM Studio REST."""
    return lmstudio_rest_provider.get_models(is_lmstudio_rest_enabled())


def get_lmstudio_rest_vision_models() -> list[str]:
    """Retrieve vision models from LM Studio REST."""
    return lmstudio_rest_provider.get_vision_models(is_lmstudio_rest_enabled())


def get_ollama_rest_models() -> list[str]:
    """Retrieve text models from Ollama REST."""
    return ollama_rest_provider.get_models(is_ollama_rest_enabled())


def get_ollama_rest_vision_models() -> list[str]:
    """Retrieve vision models from Ollama REST."""
    return ollama_rest_provider.get_vision_models(is_ollama_rest_enabled())


def get_openai_models() -> list[str]:
    """Retrieve text models from OpenAI-compatible provider."""
    return openai_provider.get_models(is_openai_enabled())


def get_openai_vision_models() -> list[str]:
    """Retrieve vision models from OpenAI-compatible provider."""
    return openai_provider.get_vision_models(is_openai_enabled())


def get_lmstudio_tool_models() -> list[str]:
    """Legacy alias: retrieve tool-capable models from LM Studio REST."""
    return lmstudio_rest_provider.get_tool_models(_is_lmstudio_service_enabled())


def get_lmstudio_reasoning_models() -> list[str]:
    """Legacy alias: retrieve reasoning-capable models from LM Studio REST."""
    return lmstudio_rest_provider.get_reasoning_models(_is_lmstudio_service_enabled())


def get_ollama_tool_models() -> list[str]:
    """Legacy alias: retrieve tool-capable models from Ollama REST."""
    return ollama_rest_provider.get_tool_models(_is_ollama_service_enabled())


def get_ollama_reasoning_models() -> list[str]:
    """Legacy alias: retrieve reasoning-capable models from Ollama REST."""
    return ollama_rest_provider.get_reasoning_models(_is_ollama_service_enabled())


def get_lmstudio_rest_tool_models() -> list[str]:
    """Retrieve tool-capable models from LM Studio REST."""
    return lmstudio_rest_provider.get_tool_models(is_lmstudio_rest_enabled())


def get_lmstudio_rest_reasoning_models() -> list[str]:
    """Retrieve reasoning-capable models from LM Studio REST."""
    return lmstudio_rest_provider.get_reasoning_models(is_lmstudio_rest_enabled())


def get_ollama_rest_tool_models() -> list[str]:
    """Retrieve tool-capable models from Ollama REST."""
    return ollama_rest_provider.get_tool_models(is_ollama_rest_enabled())


def get_ollama_rest_reasoning_models() -> list[str]:
    """Retrieve reasoning-capable models from Ollama REST."""
    return ollama_rest_provider.get_reasoning_models(is_ollama_rest_enabled())


def get_openai_tool_models() -> list[str]:
    """Retrieve tool-capable models from OpenAI-compatible provider."""
    return openai_provider.get_tool_models(is_openai_enabled())


def get_openai_reasoning_models() -> list[str]:
    """Retrieve reasoning-capable models from OpenAI-compatible provider."""
    return openai_provider.get_reasoning_models(is_openai_enabled())


def get_lmstudio_model_capabilities_map() -> dict[str, dict[str, object]]:
    """Legacy alias: retrieve model capabilities map from LM Studio REST."""
    capability_map = lmstudio_rest_provider.get_model_capabilities_map(_is_lmstudio_service_enabled())
    return {model_name: capabilities.to_dict() for model_name, capabilities in capability_map.items()}


def get_ollama_model_capabilities_map() -> dict[str, dict[str, object]]:
    """Legacy alias: retrieve model capabilities map from Ollama REST."""
    capability_map = ollama_rest_provider.get_model_capabilities_map(_is_ollama_service_enabled())
    return {model_name: capabilities.to_dict() for model_name, capabilities in capability_map.items()}


def get_lmstudio_rest_model_capabilities_map() -> dict[str, dict[str, object]]:
    """Retrieve model capabilities map from LM Studio REST."""
    capability_map = lmstudio_rest_provider.get_model_capabilities_map(is_lmstudio_rest_enabled())
    return {model_name: capabilities.to_dict() for model_name, capabilities in capability_map.items()}


def get_ollama_rest_model_capabilities_map() -> dict[str, dict[str, object]]:
    """Retrieve model capabilities map from Ollama REST."""
    capability_map = ollama_rest_provider.get_model_capabilities_map(is_ollama_rest_enabled())
    return {model_name: capabilities.to_dict() for model_name, capabilities in capability_map.items()}


def get_openai_model_capabilities_map() -> dict[str, dict[str, object]]:
    """Retrieve model capabilities map from OpenAI-compatible provider."""
    capability_map = openai_provider.get_model_capabilities_map(is_openai_enabled())
    return {model_name: capabilities.to_dict() for model_name, capabilities in capability_map.items()}


# ============================================================================
# GENERATION (NON-STREAMING)
# ============================================================================

def lmstudio_generate(model: str, prompt: str, keep_alive: int = 0, options=None, system_prompt: str = '') -> str:
    """Legacy alias: generate text via LM Studio REST."""
    return lmstudio_rest_generate(model, prompt, keep_alive, options, system_prompt)


def lmstudio_generate_vision(model: str, prompt: str, keep_alive: int = 0, images=None, options=None, system_prompt: str = '') -> str:
    """Legacy alias: generate vision output via LM Studio REST."""
    return lmstudio_rest_generate_vision(model, prompt, keep_alive, images, options, system_prompt)


def lmstudio_generate_vision_refine(
    model: str,
    prompt: str,
    images=None,
    options=None,
    refine_model: str = '',
    refine_prompt: str = '',
    refine_options=None,
) -> tuple[str, str]:
    """Legacy alias: REST-only path does not expose refine helper."""
    first_pass = lmstudio_rest_generate_vision(model, prompt, images=images, options=options)
    if not refine_model or not refine_prompt:
        return first_pass, ''
    refined = lmstudio_rest_generate(refine_model, refine_prompt, options=refine_options)
    return first_pass, refined


def lmstudio_rest_generate(model: str, prompt: str, keep_alive: int = 0, options=None, system_prompt: str = '') -> str:
    """Generate text via LM Studio REST."""
    ensure_lmstudio_rest_initialized()
    return lmstudio_rest_provider.generate(
        is_lmstudio_rest_enabled(),
        model,
        prompt,
        options=options,
        system_prompt=system_prompt,
    )


def lmstudio_rest_generate_vision(model: str, prompt: str, keep_alive: int = 0, images=None, options=None, system_prompt: str = '') -> str:
    """Generate vision output via LM Studio REST."""
    ensure_lmstudio_rest_initialized()
    return lmstudio_rest_provider.generate_vision(
        is_lmstudio_rest_enabled(),
        model,
        prompt,
        images,
        options=options,
        system_prompt=system_prompt,
    )


def ollama_generate(model: str, prompt: str, keep_alive: float = 0.0, options=None, system_prompt: str = '') -> str:
    """Legacy alias: generate text via Ollama REST."""
    return ollama_rest_generate(
        model,
        prompt,
        options=options,
        system_prompt=system_prompt,
        keep_alive=_normalize_ollama_keep_alive(keep_alive),
    )


def ollama_generate_vision(model: str, prompt: str, keep_alive: float = 0.0, images=None, options=None, system_prompt: str = '') -> str:
    """Legacy alias: generate vision output via Ollama REST."""
    return ollama_rest_generate_vision(
        model,
        prompt,
        images=images,
        options=options,
        system_prompt=system_prompt,
        keep_alive=_normalize_ollama_keep_alive(keep_alive),
    )


def ollama_generate_vision_refine(
    model: str,
    prompt: str,
    images=None,
    options=None,
    refine_model: str = '',
    refine_prompt: str = '',
    refine_options=None,
) -> tuple[str, str]:
    """Legacy alias: REST-only path does not expose refine helper."""
    first_pass = ollama_rest_generate_vision(model, prompt, images=images, options=options)
    if not refine_model or not refine_prompt:
        return first_pass, ''
    refined = ollama_rest_generate(refine_model, refine_prompt, options=refine_options)
    return first_pass, refined


def ollama_rest_generate(model: str, prompt: str, options=None, system_prompt: str = '', keep_alive: str = '5m') -> str:
    """Generate text via Ollama REST."""
    ensure_ollama_rest_initialized()
    return ollama_rest_provider.generate(
        is_ollama_rest_enabled(),
        model,
        prompt,
        options=options,
        system_prompt=system_prompt,
        keep_alive=keep_alive,
    )


def ollama_rest_generate_vision(model: str, prompt: str, images=None, options=None, system_prompt: str = '', keep_alive: str = '5m') -> str:
    """Generate vision output via Ollama REST."""
    ensure_ollama_rest_initialized()
    return ollama_rest_provider.generate_vision(
        is_ollama_rest_enabled(),
        model,
        prompt,
        images=images,
        options=options,
        system_prompt=system_prompt,
        keep_alive=keep_alive,
    )


def openai_generate(model: str, prompt: str, options=None, system_prompt: str = '') -> str:
    """Generate text via OpenAI-compatible provider."""
    ensure_openai_initialized()
    return openai_provider.generate(
        is_openai_enabled(),
        model,
        prompt,
        options=options,
        system_prompt=system_prompt,
    )


def openai_generate_vision(model: str, prompt: str, images=None, options=None, system_prompt: str = '') -> str:
    """Generate vision output via OpenAI-compatible provider."""
    ensure_openai_initialized()
    return openai_provider.generate_vision(
        is_openai_enabled(),
        model,
        prompt,
        images=images,
        options=options,
        system_prompt=system_prompt,
    )


# ============================================================================
# GENERATION (STREAMING)
# ============================================================================

def lmstudio_generate_stream(model: str, prompt: str, keep_alive: int = 0, options=None, system_prompt: str = ''):
    """Legacy alias: stream text via LM Studio REST."""
    return lmstudio_rest_generate_stream(model, prompt, keep_alive, options, system_prompt)


def lmstudio_generate_vision_stream(model: str, prompt: str, keep_alive: int = 0, images=None, options=None, system_prompt: str = ''):
    """Legacy alias: stream vision output via LM Studio REST."""
    return lmstudio_rest_generate_vision_stream(model, prompt, keep_alive, images, options, system_prompt)


def lmstudio_rest_generate_stream(model: str, prompt: str, keep_alive: int = 0, options=None, system_prompt: str = ''):
    """Stream text via LM Studio REST."""
    ensure_lmstudio_rest_initialized()
    return lmstudio_rest_provider.generate_stream(
        is_lmstudio_rest_enabled(),
        model,
        prompt,
        options=options,
        system_prompt=system_prompt,
    )


def lmstudio_rest_generate_vision_stream(model: str, prompt: str, keep_alive: int = 0, images=None, options=None, system_prompt: str = ''):
    """Stream vision output via LM Studio REST."""
    ensure_lmstudio_rest_initialized()
    return lmstudio_rest_provider.generate_vision_stream(
        is_lmstudio_rest_enabled(),
        model,
        prompt,
        images,
        options=options,
        system_prompt=system_prompt,
    )


def ollama_generate_stream(model: str, prompt: str, keep_alive: float = 0.0, options=None, system_prompt: str = ''):
    """Legacy alias: stream text via Ollama REST."""
    return ollama_rest_generate_stream(
        model,
        prompt,
        options=options,
        system_prompt=system_prompt,
        keep_alive=_normalize_ollama_keep_alive(keep_alive),
    )


def ollama_generate_vision_stream(model: str, prompt: str, keep_alive: float = 0.0, images=None, options=None, system_prompt: str = ''):
    """Legacy alias: stream vision output via Ollama REST."""
    return ollama_rest_generate_vision_stream(
        model,
        prompt,
        images=images,
        options=options,
        system_prompt=system_prompt,
        keep_alive=_normalize_ollama_keep_alive(keep_alive),
    )


def ollama_rest_generate_stream(model: str, prompt: str, options=None, system_prompt: str = '', keep_alive: str = '5m'):
    """Stream text via Ollama REST."""
    ensure_ollama_rest_initialized()
    return ollama_rest_provider.generate_stream(
        is_ollama_rest_enabled(),
        model,
        prompt,
        options=options,
        system_prompt=system_prompt,
        keep_alive=keep_alive,
    )


def ollama_rest_generate_vision_stream(model: str, prompt: str, images=None, options=None, system_prompt: str = '', keep_alive: str = '5m'):
    """Stream vision output via Ollama REST."""
    ensure_ollama_rest_initialized()
    return ollama_rest_provider.generate_vision_stream(
        is_ollama_rest_enabled(),
        model,
        prompt,
        images=images,
        options=options,
        system_prompt=system_prompt,
        keep_alive=keep_alive,
    )


def openai_generate_stream(model: str, prompt: str, options=None, system_prompt: str = ''):
    """Stream text via OpenAI-compatible provider."""
    ensure_openai_initialized()
    return openai_provider.generate_stream(
        is_openai_enabled(),
        model,
        prompt,
        options=options,
        system_prompt=system_prompt,
    )


def openai_generate_vision_stream(model: str, prompt: str, images=None, options=None, system_prompt: str = ''):
    """Stream vision output via OpenAI-compatible provider."""
    ensure_openai_initialized()
    return openai_provider.generate_vision_stream(
        is_openai_enabled(),
        model,
        prompt,
        images=images,
        options=options,
        system_prompt=system_prompt,
    )


# ============================================================================
# MODEL LOAD / UNLOAD HELPERS
# ============================================================================

def ollama_preload_model(model: str, keep_alive: float = 60.0) -> bool:
    """Legacy alias: preloading is implicit in Ollama REST generate calls."""
    ensure_ollama_rest_initialized()
    return ollama_rest_provider.load_model(
        _is_ollama_service_enabled(),
        model,
        int(keep_alive),
    )


def ollama_generate_preloaded(model: str, prompt: str, keep_alive: float = 0.0, options=None, system_prompt: str = '') -> str:
    """Legacy alias: generate using Ollama REST with keep_alive hint."""
    return ollama_generate(model, prompt, keep_alive=keep_alive, options=options, system_prompt=system_prompt)


def lmstudio_load_model(model: str, keep_alive: int = 0):
    """Legacy alias: load model in LM Studio REST by name."""
    ensure_lmstudio_rest_initialized()
    return lmstudio_rest_provider.load_model(is_lmstudio_rest_enabled(), model, keep_alive)


def lmstudio_generate_with_model(lms_model, prompt: str, options=None) -> str:
    """Legacy alias: model-handle path not available in REST; use direct generate."""
    return lmstudio_rest_generate(str(lms_model), prompt, options=options)


def lmstudio_generate_vision_with_model(lms_model, prompt: str, images=None, options=None) -> str:
    """Legacy alias: model-handle path not available in REST; use direct vision generate."""
    return lmstudio_rest_generate_vision(str(lms_model), prompt, images=images, options=options)


def lmstudio_unload_model(lms_model) -> None:
    """Legacy alias: unload LM Studio REST model by name."""
    lmstudio_rest_provider.unload_model(_is_lmstudio_service_enabled(), str(lms_model))


def lmstudio_rest_load_model(model: str, keep_alive: int = 0) -> bool:
    """Load LM Studio REST model by name."""
    ensure_lmstudio_rest_initialized()
    return lmstudio_rest_provider.load_model(is_lmstudio_rest_enabled(), model, keep_alive)


def lmstudio_rest_unload_model(model: str) -> bool:
    """Unload LM Studio REST model by name."""
    return lmstudio_rest_provider.unload_model(is_lmstudio_rest_enabled(), model)


# ============================================================================
# INITIALIZATION
# ============================================================================

def init_ollama() -> bool:
    """Legacy alias: initialize Ollama REST state."""
    return init_ollama_rest()


def init_lmstudio() -> bool:
    """Legacy alias: initialize LM Studio REST state."""
    return init_lmstudio_rest()


def init_lmstudio_rest() -> bool:
    """Initialize LM Studio REST provider state."""
    global _lmstudio_rest_initialized
    from ..settings import get_setting

    _lmstudio_rest_initialized = _init_lmstudio_rest(
        bool(get_setting('enable_lmstudio_rest', False))
    )
    return _lmstudio_rest_initialized


def init_ollama_rest() -> bool:
    """Initialize Ollama REST provider state."""
    global _ollama_rest_initialized
    from ..settings import get_setting

    _ollama_rest_initialized = _init_ollama_rest(
        bool(get_setting('enable_ollama_rest', False))
    )
    return _ollama_rest_initialized


def init_openai() -> bool:
    """Initialize OpenAI provider state."""
    global _openai_initialized
    from ..settings import get_setting

    _openai_initialized = _init_openai_provider(
        bool(get_setting('enable_openai', False))
    )
    return _openai_initialized


def init_llm() -> None:
    """Initialize all configured REST/OpenAI providers."""
    init_lmstudio_rest()
    init_ollama_rest()
    init_openai()
    logger.info('LLM providers initialized.')


def ensure_ollama_initialized() -> bool:
    """Legacy alias: ensure Ollama REST initialization."""
    return ensure_ollama_rest_initialized()


def ensure_lmstudio_initialized() -> bool:
    """Legacy alias: ensure LM Studio REST initialization."""
    return ensure_lmstudio_rest_initialized()


def ensure_lmstudio_rest_initialized() -> bool:
    """Ensure LM Studio REST is initialized if enabled."""
    global _lmstudio_rest_initialized
    from ..settings import get_setting

    if get_setting('enable_lmstudio_rest', False) and not _lmstudio_rest_initialized:
        logger.info('LM Studio REST is enabled but not initialized, initializing now...')
        return init_lmstudio_rest()
    return _lmstudio_rest_initialized


def ensure_ollama_rest_initialized() -> bool:
    """Ensure Ollama REST is initialized if enabled."""
    global _ollama_rest_initialized
    from ..settings import get_setting

    if get_setting('enable_ollama_rest', False) and not _ollama_rest_initialized:
        logger.info('Ollama REST is enabled but not initialized, initializing now...')
        return init_ollama_rest()
    return _ollama_rest_initialized


def ensure_openai_initialized() -> bool:
    """Ensure OpenAI provider is initialized if enabled."""
    global _openai_initialized
    from ..settings import get_setting

    if get_setting('enable_openai', False) and not _openai_initialized:
        logger.info('OpenAI provider is enabled but not initialized, initializing now...')
        return init_openai()
    return _openai_initialized


def ensure_llm_initialized() -> bool:
    """Ensure all enabled LLM services are initialized."""
    lmstudio_rest_ok = ensure_lmstudio_rest_initialized()
    ollama_rest_ok = ensure_ollama_rest_initialized()
    openai_ok = ensure_openai_initialized()
    return lmstudio_rest_ok or ollama_rest_ok or openai_ok


def reset_llm_initialization_state() -> None:
    """Reset initialization flags."""
    global _lmstudio_rest_initialized, _ollama_rest_initialized, _openai_initialized
    _lmstudio_rest_initialized = False
    _ollama_rest_initialized = False
    _openai_initialized = False

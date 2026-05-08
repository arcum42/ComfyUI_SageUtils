from ..logger import get_logger, get_sageutils_logger
from .init import init_ollama_client, init_lmstudio_client
from .providers.settings import is_ollama_enabled, is_lmstudio_enabled, is_lmstudio_rest_enabled, is_ollama_rest_enabled, is_openai_enabled
from .providers import ollama_client as ollama_provider
from .providers import lmstudio_client as lmstudio_provider
from .providers import lmstudio_rest_client as lmstudio_rest_provider
from .providers import ollama_rest_client as ollama_rest_provider
from .providers import openai_client as openai_provider

logger = get_logger('llm')
root_logger = get_sageutils_logger()

# Initialization flags to track if services have been initialized
_ollama_initialized = False
_lmstudio_initialized = False
_lmstudio_rest_initialized = False
_ollama_rest_initialized = False
_openai_initialized = False

# Attempt to import ollama, if available. Set a flag if it is not available.
try:
    import ollama
    OLLAMA_AVAILABLE = True
    ollama_client = None  # Will be initialized in init_ollama
except ImportError:
    ollama = None
    OLLAMA_AVAILABLE = False
    ollama_client = None
    root_logger.warning('Ollama library not found.')

try:
    import lmstudio as lms
    LMSTUDIO_AVAILABLE = True
except ImportError:
    lms = None
    LMSTUDIO_AVAILABLE = False
    root_logger.warning('LM Studio library not found.')

# LM Studio REST provider uses HTTP API and does not require lmstudio package.
LMSTUDIO_REST_AVAILABLE = True

# Ollama REST provider uses HTTP API and does not require ollama package.
OLLAMA_REST_AVAILABLE = True

# OpenAI provider uses HTTP API and does not require openai package.
OPENAI_AVAILABLE = True


def get_ollama_vision_models() -> list[str]:
    """Retrieve a list of available vision models from Ollama."""
    return ollama_provider.get_vision_models(OLLAMA_AVAILABLE, ollama_client, is_ollama_enabled())


def get_ollama_models() -> list[str]:
    """Retrieve a list of available models from Ollama."""
    return ollama_provider.get_models(OLLAMA_AVAILABLE, ollama_client, is_ollama_enabled())


def ollama_generate_vision(model: str, prompt: str, keep_alive: float = 0.0, images=None, options=None, system_prompt: str = '') -> str:
    """Generate a response from an Ollama vision model."""
    ensure_ollama_initialized()
    return ollama_provider.generate_vision(
        OLLAMA_AVAILABLE,
        ollama_client,
        is_ollama_enabled(),
        model,
        prompt,
        keep_alive,
        images,
        options,
        system_prompt,
    )


def ollama_generate(model: str, prompt: str, keep_alive: float = 0.0, options=None, system_prompt: str = '') -> str:
    """Generate a response from an Ollama model."""
    ensure_ollama_initialized()
    return ollama_provider.generate(
        OLLAMA_AVAILABLE,
        ollama_client,
        is_ollama_enabled(),
        model,
        prompt,
        keep_alive,
        options,
        system_prompt,
    )


def ollama_generate_vision_refine(model: str, prompt: str, images=None, options=None, refine_model: str = '', refine_prompt: str = '', refine_options=None) -> tuple[str, str]:
    """Generate a response from an Ollama vision model and refine it with another model."""
    ensure_ollama_initialized()
    return ollama_provider.generate_vision_refine(
        OLLAMA_AVAILABLE,
        ollama_client,
        is_ollama_enabled(),
        model,
        prompt,
        images,
        options,
        refine_model,
        refine_prompt,
        refine_options,
    )


def is_lmstudio_running() -> bool:
    """Check if LM Studio server is running by attempting a lightweight API call."""
    return lmstudio_provider.is_running(LMSTUDIO_AVAILABLE, lms, is_lmstudio_enabled())


def get_lmstudio_models() -> list[str]:
    """Retrieve a list of available models from LM Studio."""
    return lmstudio_provider.get_models(LMSTUDIO_AVAILABLE, lms, is_lmstudio_enabled())


def get_lmstudio_vision_models() -> list[str]:
    """Retrieve a list of available vision models from LM Studio."""
    return lmstudio_provider.get_vision_models(LMSTUDIO_AVAILABLE, lms, is_lmstudio_enabled())


def is_lmstudio_rest_running() -> bool:
    """Check if LM Studio REST server is running."""
    return lmstudio_rest_provider.is_running(is_lmstudio_rest_enabled())


def is_ollama_rest_running() -> bool:
    """Check if the Ollama REST server is running."""
    return ollama_rest_provider.is_running(is_ollama_rest_enabled())


def is_openai_running() -> bool:
    """Check if the OpenAI-compatible endpoint is reachable."""
    return openai_provider.is_running(is_openai_enabled())


def get_lmstudio_rest_models() -> list[str]:
    """Retrieve a list of available models from LM Studio REST."""
    return lmstudio_rest_provider.get_models(is_lmstudio_rest_enabled())


def get_lmstudio_rest_vision_models() -> list[str]:
    """Retrieve a list of available vision models from LM Studio REST."""
    return lmstudio_rest_provider.get_vision_models(is_lmstudio_rest_enabled())


def get_ollama_rest_models() -> list[str]:
    """Retrieve a list of available models from Ollama REST."""
    return ollama_rest_provider.get_models(is_ollama_rest_enabled())


def get_ollama_rest_vision_models() -> list[str]:
    """Retrieve a list of available vision models from Ollama REST."""
    return ollama_rest_provider.get_vision_models(is_ollama_rest_enabled())


def get_openai_models() -> list[str]:
    """Retrieve a list of available models from the OpenAI-compatible endpoint."""
    return openai_provider.get_models(is_openai_enabled())


def get_openai_vision_models() -> list[str]:
    """Retrieve a list of available vision models from the OpenAI-compatible endpoint."""
    return openai_provider.get_vision_models(is_openai_enabled())


def lmstudio_generate_vision(model: str, prompt: str, keep_alive: int = 0, images=None, options=None) -> str:
    """Generate a response from an LM Studio vision model."""
    ensure_lmstudio_initialized()
    return lmstudio_provider.generate_vision(
        LMSTUDIO_AVAILABLE,
        lms,
        is_lmstudio_enabled(),
        model,
        prompt,
        keep_alive,
        images,
        options,
    )


def lmstudio_generate(model: str, prompt: str, keep_alive: int = 0, options=None) -> str:
    """Generate a response from an LM Studio model."""
    ensure_lmstudio_initialized()
    return lmstudio_provider.generate(
        LMSTUDIO_AVAILABLE,
        lms,
        is_lmstudio_enabled(),
        model,
        prompt,
        keep_alive,
        options,
    )


def lmstudio_rest_generate(model: str, prompt: str, keep_alive: int = 0, options=None, system_prompt: str = '') -> str:
    """Generate a response from an LM Studio REST model."""
    ensure_lmstudio_rest_initialized()
    return lmstudio_rest_provider.generate(
        is_lmstudio_rest_enabled(),
        model,
        prompt,
        options=options,
        system_prompt=system_prompt,
    )


def lmstudio_generate_vision_refine(model: str, prompt: str, images=None, options=None, refine_model: str = '', refine_prompt: str = '', refine_options=None) -> tuple[str, str]:
    """Generate a response from an LM Studio vision model and refine it with another model."""
    ensure_lmstudio_initialized()
    return lmstudio_provider.generate_vision_refine(
        LMSTUDIO_AVAILABLE,
        lms,
        is_lmstudio_enabled(),
        model,
        prompt,
        images,
        options,
        refine_model,
        refine_prompt,
        refine_options,
    )


def lmstudio_rest_generate_vision(model: str, prompt: str, keep_alive: int = 0, images=None, options=None, system_prompt: str = '') -> str:
    """Generate a vision response from an LM Studio REST model."""
    ensure_lmstudio_rest_initialized()
    return lmstudio_rest_provider.generate_vision(
        is_lmstudio_rest_enabled(),
        model,
        prompt,
        images,
        options=options,
        system_prompt=system_prompt,
    )


def ollama_rest_generate(model: str, prompt: str, options=None, system_prompt: str = '', keep_alive: str = '5m') -> str:
    """Generate a response from an Ollama REST model."""
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
    """Generate a vision response from an Ollama REST model."""
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
    """Generate a response from an OpenAI-compatible model."""
    ensure_openai_initialized()
    return openai_provider.generate(
        is_openai_enabled(),
        model,
        prompt,
        options=options,
        system_prompt=system_prompt,
    )


def openai_generate_vision(model: str, prompt: str, images=None, options=None, system_prompt: str = '') -> str:
    """Generate a vision response from an OpenAI-compatible model."""
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
# STREAMING FUNCTIONS
# ============================================================================

def ollama_generate_stream(model: str, prompt: str, keep_alive: float = 0.0, options=None, system_prompt: str = ''):
    """Generate a streaming response from an Ollama model."""
    ensure_ollama_initialized()
    return ollama_provider.generate_stream(
        OLLAMA_AVAILABLE,
        ollama_client,
        is_ollama_enabled(),
        model,
        prompt,
        keep_alive,
        options,
        system_prompt,
    )


def ollama_generate_vision_stream(model: str, prompt: str, keep_alive: float = 0.0, images=None, options=None, system_prompt: str = ''):
    """Generate a streaming response from an Ollama vision model."""
    ensure_ollama_initialized()
    return ollama_provider.generate_vision_stream(
        OLLAMA_AVAILABLE,
        ollama_client,
        is_ollama_enabled(),
        model,
        prompt,
        keep_alive,
        images,
        options,
        system_prompt,
    )


def lmstudio_generate_stream(model: str, prompt: str, keep_alive: int = 0, options=None):
    """Generate a streaming response from an LM Studio model."""
    ensure_lmstudio_initialized()
    return lmstudio_provider.generate_stream(
        LMSTUDIO_AVAILABLE,
        lms,
        is_lmstudio_enabled(),
        model,
        prompt,
        keep_alive,
        options,
    )


def lmstudio_generate_vision_stream(model: str, prompt: str, keep_alive: int = 0, images=None, options=None):
    """Generate a streaming response from an LM Studio vision model."""
    ensure_lmstudio_initialized()
    return lmstudio_provider.generate_vision_stream(
        LMSTUDIO_AVAILABLE,
        lms,
        is_lmstudio_enabled(),
        model,
        prompt,
        keep_alive,
        images,
        options,
    )


def lmstudio_rest_generate_stream(model: str, prompt: str, keep_alive: int = 0, options=None, system_prompt: str = ''):
    """Generate a streaming response from an LM Studio REST model."""
    ensure_lmstudio_rest_initialized()
    return lmstudio_rest_provider.generate_stream(
        is_lmstudio_rest_enabled(),
        model,
        prompt,
        options=options,
        system_prompt=system_prompt,
    )


def lmstudio_rest_generate_vision_stream(model: str, prompt: str, keep_alive: int = 0, images=None, options=None, system_prompt: str = ''):
    """Generate a streaming vision response from an LM Studio REST model."""
    ensure_lmstudio_rest_initialized()
    return lmstudio_rest_provider.generate_vision_stream(
        is_lmstudio_rest_enabled(),
        model,
        prompt,
        images,
        options=options,
        system_prompt=system_prompt,
    )


def ollama_rest_generate_stream(model: str, prompt: str, options=None, system_prompt: str = '', keep_alive: str = '5m'):
    """Generate a streaming response from an Ollama REST model."""
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
    """Generate a streaming vision response from an Ollama REST model."""
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
    """Generate a streaming response from an OpenAI-compatible model."""
    ensure_openai_initialized()
    return openai_provider.generate_stream(
        is_openai_enabled(),
        model,
        prompt,
        options=options,
        system_prompt=system_prompt,
    )


def openai_generate_vision_stream(model: str, prompt: str, images=None, options=None, system_prompt: str = ''):
    """Generate a streaming vision response from an OpenAI-compatible model."""
    ensure_openai_initialized()
    return openai_provider.generate_vision_stream(
        is_openai_enabled(),
        model,
        prompt,
        images=images,
        options=options,
        system_prompt=system_prompt,
    )


def ollama_preload_model(model: str, keep_alive: float = 60.0) -> bool:
    """Pre-warm an Ollama model so subsequent generate calls incur no load delay."""
    ensure_ollama_initialized()
    return ollama_provider.preload_model(OLLAMA_AVAILABLE, ollama_client, is_ollama_enabled(), model, keep_alive)


def ollama_generate_preloaded(model: str, prompt: str, keep_alive: float = 0.0, options=None, system_prompt: str = '') -> str:
    """Generate from an Ollama model assumed to already be loaded."""
    ensure_ollama_initialized()
    return ollama_provider.generate_preloaded(
        OLLAMA_AVAILABLE,
        ollama_client,
        is_ollama_enabled(),
        model,
        prompt,
        keep_alive,
        options,
        system_prompt,
    )


def lmstudio_load_model(model: str, keep_alive: int = 0):
    """Load an LM Studio model and return the model handle."""
    ensure_lmstudio_initialized()
    return lmstudio_provider.load_model(LMSTUDIO_AVAILABLE, lms, is_lmstudio_enabled(), model, keep_alive)


def lmstudio_generate_with_model(lms_model, prompt: str, options=None) -> str:
    """Run text inference on an already-loaded LM Studio model handle."""
    return lmstudio_provider.generate_with_model(lms_model, lms, prompt, options)


def lmstudio_generate_vision_with_model(lms_model, prompt: str, images=None, options=None) -> str:
    """Run vision inference on an already-loaded LM Studio model handle."""
    return lmstudio_provider.generate_vision_with_model(lms_model, lms, prompt, images, options)


def lmstudio_unload_model(lms_model) -> None:
    """Unload a previously loaded LM Studio model handle."""
    lmstudio_provider.unload_model(lms_model)


def lmstudio_rest_load_model(model: str, keep_alive: int = 0) -> bool:
    """Ask LM Studio REST to load a model by name."""
    ensure_lmstudio_rest_initialized()
    return lmstudio_rest_provider.load_model(is_lmstudio_rest_enabled(), model, keep_alive)


def lmstudio_rest_unload_model(model: str) -> bool:
    """Ask LM Studio REST to unload a model by name."""
    return lmstudio_rest_provider.unload_model(is_lmstudio_rest_enabled(), model)


# ============================================================================
# INITIALIZATION FUNCTIONS
# ============================================================================

def init_ollama():
    """Initialize Ollama client."""
    global ollama_client, _ollama_initialized
    from ..settings import get_setting

    ollama_custom_url = str(
        get_setting('ollama_custom_url', get_setting('custom_ollama_url', 'http://localhost:11434'))
    )

    ollama_client, _ollama_initialized = init_ollama_client(
        OLLAMA_AVAILABLE,
        ollama,
        bool(get_setting('enable_ollama', False)),
        ollama_custom_url,
    )
    return _ollama_initialized


def init_lmstudio():
    """Initialize LM Studio if available."""
    global _lmstudio_initialized
    from ..settings import get_setting

    lmstudio_custom_url = str(
        get_setting('lmstudio_custom_url', get_setting('custom_lmstudio_url', ''))
    )

    _lmstudio_initialized = init_lmstudio_client(
        LMSTUDIO_AVAILABLE,
        lms,
        bool(get_setting('enable_lmstudio', False)),
        lmstudio_custom_url,
    )
    return _lmstudio_initialized


def init_lmstudio_rest():
    """Initialize LM Studio REST provider state."""
    global _lmstudio_rest_initialized
    from ..settings import get_setting

    if not bool(get_setting('enable_lmstudio_rest', False)):
        _lmstudio_rest_initialized = False
        return False

    _lmstudio_rest_initialized = lmstudio_rest_provider.is_running(True)
    if _lmstudio_rest_initialized:
        logger.info('LM Studio REST provider initialized.')
    else:
        logger.info('LM Studio REST provider is enabled but server is not reachable yet.')
    return _lmstudio_rest_initialized


def init_ollama_rest():
    """Initialize Ollama REST provider state."""
    global _ollama_rest_initialized
    from ..settings import get_setting

    if not bool(get_setting('enable_ollama_rest', False)):
        _ollama_rest_initialized = False
        return False

    _ollama_rest_initialized = ollama_rest_provider.is_running(True)
    if _ollama_rest_initialized:
        logger.info('Ollama REST provider initialized.')
    else:
        logger.info('Ollama REST provider is enabled but server is not reachable yet.')
    return _ollama_rest_initialized


def init_openai():
    """Initialize OpenAI provider state."""
    global _openai_initialized
    from ..settings import get_setting

    if not bool(get_setting('enable_openai', False)):
        _openai_initialized = False
        return False

    _openai_initialized = openai_provider.is_running(True)
    if _openai_initialized:
        logger.info('OpenAI provider initialized.')
    else:
        logger.info('OpenAI provider is enabled but endpoint is not reachable yet.')
    return _openai_initialized


def init_llm():
    """Initialize LLM clients."""
    init_ollama()
    init_lmstudio()
    init_lmstudio_rest()
    init_ollama_rest()
    init_openai()
    logger.info('LLM clients initialized.')


def ensure_ollama_initialized():
    """Ensure Ollama is initialized if enabled in settings and not already initialized."""
    global _ollama_initialized
    from ..settings import get_setting

    if get_setting('enable_ollama', False) and not _ollama_initialized:
        logger.info('Ollama is enabled but not initialized, initializing now...')
        return init_ollama()
    return _ollama_initialized


def ensure_lmstudio_initialized():
    """Ensure LM Studio is initialized if enabled in settings and not already initialized."""
    global _lmstudio_initialized
    from ..settings import get_setting

    if get_setting('enable_lmstudio', False) and not _lmstudio_initialized:
        logger.info('LM Studio is enabled but not initialized, initializing now...')
        return init_lmstudio()
    return _lmstudio_initialized


def ensure_lmstudio_rest_initialized():
    """Ensure LM Studio REST is initialized if enabled in settings and not already initialized."""
    global _lmstudio_rest_initialized
    from ..settings import get_setting

    if get_setting('enable_lmstudio_rest', False) and not _lmstudio_rest_initialized:
        logger.info('LM Studio REST is enabled but not initialized, initializing now...')
        return init_lmstudio_rest()
    return _lmstudio_rest_initialized


def ensure_ollama_rest_initialized():
    """Ensure Ollama REST is initialized if enabled in settings and not already initialized."""
    global _ollama_rest_initialized
    from ..settings import get_setting

    if get_setting('enable_ollama_rest', False) and not _ollama_rest_initialized:
        logger.info('Ollama REST is enabled but not initialized, initializing now...')
        return init_ollama_rest()
    return _ollama_rest_initialized


def ensure_openai_initialized():
    """Ensure OpenAI provider is initialized if enabled in settings and not already initialized."""
    global _openai_initialized
    from ..settings import get_setting

    if get_setting('enable_openai', False) and not _openai_initialized:
        logger.info('OpenAI provider is enabled but not initialized, initializing now...')
        return init_openai()
    return _openai_initialized


def ensure_llm_initialized():
    """Ensure all enabled LLM services are initialized."""
    ollama_ok = ensure_ollama_initialized()
    lmstudio_ok = ensure_lmstudio_initialized()
    lmstudio_rest_ok = ensure_lmstudio_rest_initialized()
    ollama_rest_ok = ensure_ollama_rest_initialized()
    openai_ok = ensure_openai_initialized()
    return ollama_ok or lmstudio_ok or lmstudio_rest_ok or ollama_rest_ok or openai_ok


def reset_llm_initialization_state() -> None:
    """Reset initialization flags and local client references."""
    global _ollama_initialized, _lmstudio_initialized, _lmstudio_rest_initialized, _ollama_rest_initialized, _openai_initialized, ollama_client
    _ollama_initialized = False
    _lmstudio_initialized = False
    _lmstudio_rest_initialized = False
    _ollama_rest_initialized = False
    _openai_initialized = False
    ollama_client = None

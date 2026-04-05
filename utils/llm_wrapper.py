from .logger import get_logger, get_sageutils_logger
from .llm.init import init_ollama_client, init_lmstudio_client
from .llm.providers.settings import is_ollama_enabled, is_lmstudio_enabled
from .llm.providers import ollama_client as ollama_provider
from .llm.providers import lmstudio_client as lmstudio_provider

logger = get_logger('llm')
root_logger = get_sageutils_logger()

# Initialization flags to track if services have been initialized
_ollama_initialized = False
_lmstudio_initialized = False

# Attempt to import ollama, if available. Set a flag if it is not available.
try:
    import ollama
    OLLAMA_AVAILABLE = True
    ollama_client = None  # Will be initialized in init_ollama
    

except ImportError:
    ollama = None
    OLLAMA_AVAILABLE = False
    ollama_client = None
    root_logger.warning("Ollama library not found.")

try:
    import lmstudio as lms
    LMSTUDIO_AVAILABLE = True
except ImportError:
    lms = None
    LMSTUDIO_AVAILABLE = False
    root_logger.warning("LM Studio library not found.")


def get_ollama_vision_models() -> list[str]:
    """Retrieve a list of available vision models from Ollama."""
    return ollama_provider.get_vision_models(OLLAMA_AVAILABLE, ollama_client, is_ollama_enabled())


def get_ollama_models() -> list[str]:
    """Retrieve a list of available models from Ollama."""
    return ollama_provider.get_models(OLLAMA_AVAILABLE, ollama_client, is_ollama_enabled())


def ollama_generate_vision(model: str, prompt: str, keep_alive: float = 0.0, images=None, options=None, system_prompt: str = "") -> str:
    """Generate a response from an Ollama vision model."""
    # Ensure Ollama is initialized before use
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

def ollama_generate(model: str, prompt: str, keep_alive: float = 0.0, options=None, system_prompt: str = "") -> str:
    """Generate a response from an Ollama model."""
    # Ensure Ollama is initialized before use
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

def ollama_generate_vision_refine( model: str, prompt: str, images=None, options=None, refine_model: str = "", refine_prompt: str = "", refine_options = None) -> tuple[str, str]:
    """Generate a response from an Ollama vision model and refine it with another model."""
    # Ensure Ollama is initialized before use
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


def lmstudio_generate_vision(model: str, prompt: str, keep_alive: int = 0, images=None, options=None) -> str:
    """Generate a response from an LM Studio vision model."""
    # Ensure LM Studio is initialized before use
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
    # Ensure LM Studio is initialized before use
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

def lmstudio_generate_vision_refine(model: str, prompt: str, images=None, options=None, refine_model: str = "", refine_prompt: str = "", refine_options=None) -> tuple[str, str]:
    """Generate a response from an LM Studio vision model and refine it with another model."""
    # Ensure LM Studio is initialized before use
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

# ============================================================================
# STREAMING FUNCTIONS (Phase 2)
# ============================================================================

def ollama_generate_stream(model: str, prompt: str, keep_alive: float = 0.0, options=None, system_prompt: str = ""):
    """
    Generate a streaming response from an Ollama model.
    Yields chunks of text as they are generated.
    
    Args:
        model: Model name
        prompt: Input prompt
        keep_alive: How long to keep model loaded (0 = unload immediately)
        options: Generation options (temperature, seed, etc.)
        system_prompt: System prompt for context
        
    Yields:
        dict: {"chunk": str, "done": bool}
    """
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


def ollama_generate_vision_stream(model: str, prompt: str, keep_alive: float = 0.0, images=None, options=None, system_prompt: str = ""):
    """
    Generate a streaming response from an Ollama vision model.
    Yields chunks of text as they are generated.
    
    Args:
        model: Vision model name
        prompt: Input prompt
        keep_alive: How long to keep model loaded
        images: Image tensor(s) to analyze
        options: Generation options
        system_prompt: System prompt for context
        
    Yields:
        dict: {"chunk": str, "done": bool}
    """
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
    """
    Generate a streaming response from an LM Studio model.
    Note: LM Studio's Python SDK may not support streaming natively,
    so this implements a simple polling approach.
    
    Args:
        model: Model name
        prompt: Input prompt
        keep_alive: How long to keep model loaded (seconds)
        options: Generation options
        
    Yields:
        dict: {"chunk": str, "done": bool}
    """
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
    """
    Generate a streaming response from an LM Studio vision model.
    Simulates streaming for consistency with Ollama.
    
    Args:
        model: Vision model name
        prompt: Input prompt
        keep_alive: How long to keep model loaded (seconds)
        images: Image tensor(s) to analyze
        options: Generation options
        
    Yields:
        dict: {"chunk": str, "done": bool}
    """
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


def ollama_preload_model(model: str, keep_alive: float = 60.0) -> bool:
    """Pre-warm an Ollama model so subsequent generate calls incur no load delay."""
    ensure_ollama_initialized()
    return ollama_provider.preload_model(OLLAMA_AVAILABLE, ollama_client, is_ollama_enabled(), model, keep_alive)


def ollama_generate_preloaded(model: str, prompt: str, keep_alive: float = 0.0, options=None, system_prompt: str = "") -> str:
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
    """Load an LM Studio model and return the model handle. Caller must call lmstudio_unload_model() when done."""
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


# ============================================================================
# INITIALIZATION FUNCTIONS
# ============================================================================

def init_ollama():
    """Initialize Ollama client"""
    global ollama_client, _ollama_initialized
    from .settings import get_setting

    ollama_client, _ollama_initialized = init_ollama_client(
        OLLAMA_AVAILABLE,
        ollama,
        bool(get_setting("enable_ollama", False)),
        str(get_setting("custom_ollama_url", "http://localhost:11434")),
    )
    return _ollama_initialized


def init_lmstudio():
    """Initialize LM Studio if available. Print config values for LM Studio."""
    global _lmstudio_initialized
    from .settings import get_setting

    _lmstudio_initialized = init_lmstudio_client(
        LMSTUDIO_AVAILABLE,
        lms,
        bool(get_setting("enable_lmstudio", False)),
        str(get_setting('custom_lmstudio_url', '')),
    )
    return _lmstudio_initialized


def init_llm():
    """Initialize LLM clients."""
    init_ollama()
    init_lmstudio()
    logger.info("LLM clients initialized.")


def ensure_ollama_initialized():
    """Ensure Ollama is initialized if it's enabled in settings and not already initialized."""
    global _ollama_initialized
    from .settings import get_setting
    
    if get_setting("enable_ollama", False) and not _ollama_initialized:
        logger.info("Ollama is enabled but not initialized, initializing now...")
        return init_ollama()
    return _ollama_initialized


def ensure_lmstudio_initialized():
    """Ensure LM Studio is initialized if it's enabled in settings and not already initialized."""
    global _lmstudio_initialized
    from .settings import get_setting
    
    if get_setting("enable_lmstudio", False) and not _lmstudio_initialized:
        logger.info("LM Studio is enabled but not initialized, initializing now...")
        return init_lmstudio()
    return _lmstudio_initialized


def ensure_llm_initialized():
    """Ensure all enabled LLM services are initialized."""
    ollama_ok = ensure_ollama_initialized()
    lmstudio_ok = ensure_lmstudio_initialized()
    return ollama_ok or lmstudio_ok

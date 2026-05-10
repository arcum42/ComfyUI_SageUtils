"""Initialization helpers for LLM provider clients."""

from typing import Any

from ..logger import get_logger
from .providers import lmstudio_rest_client as lmstudio_rest_provider
from .providers import ollama_rest_client as ollama_rest_provider
from .providers import openai_client as openai_provider

logger = get_logger('llm.init')


def init_ollama_rest(enabled: bool) -> bool:
    """Initialize Ollama REST provider state."""
    if not enabled:
        logger.info('Ollama is disabled in settings.')
        return False

    try:
        initialized = ollama_rest_provider.is_running(True)
        if initialized:
            logger.info('Ollama REST provider initialized.')
        else:
            logger.info('Ollama REST provider is enabled but server is not reachable yet.')
        return initialized
    except Exception as e:
        logger.error(f'Failed to initialize Ollama REST provider: {e}')
        return False


def init_lmstudio_rest(enabled: bool) -> bool:
    """Initialize LM Studio REST provider state."""
    if not enabled:
        logger.info('LM Studio is disabled in settings.')
        return False

    try:
        initialized = lmstudio_rest_provider.is_running(True)
        if initialized:
            logger.info('LM Studio REST provider initialized.')
        else:
            logger.info('LM Studio REST provider is enabled but server is not reachable yet.')
        return initialized
    except Exception as e:
        logger.error(f'Failed to initialize LM Studio REST provider: {e}')
        return False


def init_openai_provider(enabled: bool) -> bool:
    """Initialize OpenAI-compatible provider state."""
    if not enabled:
        logger.info('OpenAI provider is disabled in settings.')
        return False

    try:
        initialized = openai_provider.is_running(True)
        if initialized:
            logger.info('OpenAI provider initialized.')
        else:
            logger.info('OpenAI provider is enabled but endpoint is not reachable yet.')
        return initialized
    except Exception as e:
        logger.error(f'Failed to initialize OpenAI provider: {e}')
        return False


def init_ollama_client(
    ollama_available: bool,
    ollama_module: Any,
    enabled: bool,
    custom_url: str,
) -> tuple[Any, bool]:
    """Compatibility alias for legacy callers.

    SDK initialization was removed. This now initializes the Ollama REST provider
    and returns a tuple compatible with the old signature.
    """
    _ = ollama_available
    _ = ollama_module
    _ = custom_url
    initialized = init_ollama_rest(enabled)
    return None, initialized


def init_lmstudio_client(
    lmstudio_available: bool,
    lms_module: Any,
    enabled: bool,
    custom_url: str,
) -> bool:
    """Compatibility alias for legacy callers.

    SDK initialization was removed. This now initializes the LM Studio REST
    provider and keeps the old function signature for compatibility.
    """
    _ = lmstudio_available
    _ = lms_module
    _ = custom_url
    return init_lmstudio_rest(enabled)

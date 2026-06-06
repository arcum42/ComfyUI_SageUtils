"""Initialization helpers for LLM provider clients."""

from ..logger import get_logger
from .providers.lmstudio import client as lmstudio_rest_provider
from .providers.ollama import client as ollama_rest_provider
from .providers.openai import client as openai_provider

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



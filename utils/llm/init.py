"""Initialization helpers for LLM provider clients."""

from typing import Any

from ..logger import get_logger

logger = get_logger('llm.init')


def init_ollama_client(
    ollama_available: bool,
    ollama_module: Any,
    enabled: bool,
    custom_url: str,
) -> tuple[Any, bool]:
    """Create and return an Ollama client and initialized state."""
    if not ollama_available:
        logger.warning('Ollama library is not available.')
        return None, False
    if ollama_module is None:
        logger.warning('Ollama module is not loaded.')
        return None, False
    if not enabled:
        logger.info('Ollama is disabled in settings.')
        return None, False

    try:
        if custom_url and custom_url.strip():
            client = ollama_module.Client(host=custom_url)
            logger.info('Ollama client initialized with custom URL.')
        else:
            client = ollama_module.Client()
            logger.info('Ollama client initialized with default URL.')
        return client, True
    except Exception as e:
        logger.error(f'Failed to initialize Ollama client: {e}')
        return None, False


def init_lmstudio_client(
    lmstudio_available: bool,
    lms_module: Any,
    enabled: bool,
    custom_url: str,
) -> bool:
    """Initialize LM Studio configuration and return initialized state."""
    if not lmstudio_available or lms_module is None:
        logger.info('LM Studio is not available.')
        return False
    if not enabled:
        logger.info('LM Studio is disabled in settings.')
        return False

    try:
        if custom_url and custom_url.strip():
            lms_module.get_default_client(custom_url)
            logger.info('LM Studio client configured with custom URL.')
        else:
            logger.info('LM Studio using default configuration.')
        return True
    except Exception as e:
        logger.error(f'Failed to configure LM Studio: {e}')
        return False

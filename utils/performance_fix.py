#!/usr/bin/env python3
"""
Performance fix for INPUT_TYPES methods that are causing 32+ second delays during node registration.

The issue: Multiple LLM nodes call get_ollama_models() and get_lmstudio_models() in their INPUT_TYPES methods.
These functions make network calls that can timeout, causing massive startup delays.

The fix: Create lightweight cached versions that don't block during node registration.
"""

from typing import List

from .logger import get_logger
from .llm.cache import get_llm_cache

logger = get_logger('performance.fix')


def _get_cached_models(provider: str, list_key: str) -> List[str] | None:
    """Return cached provider model list without triggering network fetch."""
    cache = get_llm_cache()
    return cache.peek_model_list(provider, list_key)

def get_cached_ollama_models_for_input_types() -> List[str]:
    """
    Lightweight version for INPUT_TYPES - returns cached models without network calls.
    Falls back to placeholder if no cache available.
    """
    try:
        cached = _get_cached_models('ollama', 'models')
        if cached is not None:
            return cached
        
        # Return placeholder - models will be populated when cache is populated
        return ["(Loading Ollama models...)"]
    except Exception as e:
        logger.debug(f"Failed to get cached Ollama models for INPUT_TYPES: {e}")
        return ["(Ollama models unavailable)"]

def get_cached_lmstudio_models_for_input_types() -> List[str]:
    """
    Lightweight version for INPUT_TYPES - returns cached models without network calls.
    Falls back to placeholder if no cache available.
    """
    try:
        cached = _get_cached_models('lmstudio', 'models')
        if cached is not None:
            return cached
        
        # Return placeholder - models will be populated when cache is populated
        return ["(Loading LM Studio models...)"]
    except Exception as e:
        logger.debug(f"Failed to get cached LM Studio models for INPUT_TYPES: {e}")
        return ["(LM Studio models unavailable)"]

def get_cached_ollama_vision_models_for_input_types() -> List[str]:
    """
    Lightweight version for INPUT_TYPES - returns cached vision models without network calls.
    Falls back to placeholder if no cache available.
    """
    try:
        cached = _get_cached_models('ollama', 'vision_models')
        if cached is not None:
            return cached
        
        # Return placeholder - models will be populated when cache is populated
        return ["(Loading Ollama vision models...)"]
    except Exception as e:
        logger.debug(f"Failed to get cached Ollama vision models for INPUT_TYPES: {e}")
        return ["(Ollama vision models unavailable)"]

def get_cached_lmstudio_vision_models_for_input_types() -> List[str]:
    """
    Lightweight version for INPUT_TYPES - returns cached vision models without network calls.
    Falls back to placeholder if no cache available.
    """
    try:
        cached = _get_cached_models('lmstudio', 'vision_models')
        if cached is not None:
            return cached
        
        # Return placeholder - models will be populated when cache is populated
        return ["(Loading LM Studio vision models...)"]
    except Exception as e:
        logger.debug(f"Failed to get cached LM Studio vision models for INPUT_TYPES: {e}")
        return ["(LM Studio vision models unavailable)"]


def get_cached_lmstudio_rest_models_for_input_types() -> List[str]:
    """
    Lightweight version for INPUT_TYPES - returns cached LM Studio REST models without network calls.
    Falls back to placeholder if no cache available.
    """
    try:
        cached = _get_cached_models('lmstudio_rest', 'models')
        if cached is not None:
            return cached

        return ["(Loading LM Studio REST models...)"]
    except Exception as e:
        logger.debug(f"Failed to get cached LM Studio REST models for INPUT_TYPES: {e}")
        return ["(LM Studio REST models unavailable)"]


def get_cached_lmstudio_rest_vision_models_for_input_types() -> List[str]:
    """
    Lightweight version for INPUT_TYPES - returns cached LM Studio REST vision models without network calls.
    Falls back to placeholder if no cache available.
    """
    try:
        cached = _get_cached_models('lmstudio_rest', 'vision_models')
        if cached is not None:
            return cached

        return ["(Loading LM Studio REST vision models...)"]
    except Exception as e:
        logger.debug(f"Failed to get cached LM Studio REST vision models for INPUT_TYPES: {e}")
        return ["(LM Studio REST vision models unavailable)"]


def get_cached_ollama_rest_models_for_input_types() -> List[str]:
    """
    Lightweight version for INPUT_TYPES - returns cached Ollama REST models without network calls.
    Falls back to placeholder if no cache available.
    """
    try:
        cached = _get_cached_models('ollama_rest', 'models')
        if cached is not None:
            return cached

        return ["(Loading Ollama REST models...)"]
    except Exception as e:
        logger.debug(f"Failed to get cached Ollama REST models for INPUT_TYPES: {e}")
        return ["(Ollama REST models unavailable)"]


def get_cached_ollama_rest_vision_models_for_input_types() -> List[str]:
    """
    Lightweight version for INPUT_TYPES - returns cached Ollama REST vision models without network calls.
    Falls back to placeholder if no cache available.
    """
    try:
        cached = _get_cached_models('ollama_rest', 'vision_models')
        if cached is not None:
            return cached

        return ["(Loading Ollama REST vision models...)"]
    except Exception as e:
        logger.debug(f"Failed to get cached Ollama REST vision models for INPUT_TYPES: {e}")
        return ["(Ollama REST vision models unavailable)"]


def get_cached_openai_models_for_input_types() -> List[str]:
    """
    Lightweight version for INPUT_TYPES - returns cached OpenAI models without network calls.
    Falls back to placeholder if no cache available.
    """
    try:
        cached = _get_cached_models('openai', 'models')
        if cached is not None:
            return cached

        return ["(Loading OpenAI models...)"]
    except Exception as e:
        logger.debug(f"Failed to get cached OpenAI models for INPUT_TYPES: {e}")
        return ["(OpenAI models unavailable)"]


def get_cached_openai_vision_models_for_input_types() -> List[str]:
    """
    Lightweight version for INPUT_TYPES - returns cached OpenAI vision models without network calls.
    Falls back to placeholder if no cache available.
    """
    try:
        cached = _get_cached_models('openai', 'vision_models')
        if cached is not None:
            return cached

        return ["(Loading OpenAI vision models...)"]
    except Exception as e:
        logger.debug(f"Failed to get cached OpenAI vision models for INPUT_TYPES: {e}")
        return ["(OpenAI vision models unavailable)"]

# Background task to populate cache without blocking startup
def populate_llm_cache_async():
    """
    Populate LLM cache in background without blocking startup.
    This should be called after node registration is complete.
    """
    import threading
    
    def _populate_cache():
        try:
            from .llm import service as llm
            logger.info("Starting background LLM cache population...")
            
            # These calls will populate the cache asynchronously
            llm.get_ollama_models()
            llm.get_lmstudio_models()
            llm.get_lmstudio_rest_models()
            llm.get_ollama_rest_models()
            llm.get_openai_models()
            llm.get_ollama_vision_models()
            llm.get_lmstudio_vision_models()
            llm.get_lmstudio_rest_vision_models()
            llm.get_ollama_rest_vision_models()
            llm.get_openai_vision_models()
            
            logger.info("Background LLM cache population completed")
        except Exception as e:
            logger.error(f"Failed to populate LLM cache in background: {e}")
    
    # Start background thread
    thread = threading.Thread(target=_populate_cache, daemon=True)
    thread.start()
    logger.debug("Started background thread for LLM cache population")

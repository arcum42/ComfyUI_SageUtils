#!/usr/bin/env python3
"""
Performance fix for INPUT_TYPES methods that are causing 32+ second delays during node registration.

The issue: Multiple LLM nodes call get_ollama_models() and get_lmstudio_models() in their INPUT_TYPES methods.
These functions make network calls that can timeout, causing massive startup delays.

The fix: Create lightweight cached versions that don't block during node registration.
"""

import logging
from typing import List

def get_cached_ollama_models_for_input_types() -> List[str]:
    """
    Lightweight version for INPUT_TYPES - returns cached models without network calls.
    Falls back to placeholder if no cache available.
    """
    try:
        from .llm_cache import get_llm_cache
        cache = get_llm_cache()
        
        # Check if we have cached data (without triggering fetch)
        if hasattr(cache, '_ollama_models') and cache._ollama_models is not None:
            return cache._ollama_models.copy()
        
        # Return placeholder - models will be populated when cache is populated
        return ["(Loading Ollama models...)"]
    except Exception as e:
        logging.debug(f"Failed to get cached Ollama models for INPUT_TYPES: {e}")
        return ["(Ollama models unavailable)"]

def get_cached_lmstudio_models_for_input_types() -> List[str]:
    """
    Lightweight version for INPUT_TYPES - returns cached models without network calls.
    Falls back to placeholder if no cache available.
    """
    try:
        from .llm_cache import get_llm_cache
        cache = get_llm_cache()
        
        # Check if we have cached data (without triggering fetch)
        if hasattr(cache, '_lmstudio_models') and cache._lmstudio_models is not None:
            return cache._lmstudio_models.copy()
        
        # Return placeholder - models will be populated when cache is populated
        return ["(Loading LM Studio models...)"]
    except Exception as e:
        logging.debug(f"Failed to get cached LM Studio models for INPUT_TYPES: {e}")
        return ["(LM Studio models unavailable)"]

def get_cached_ollama_vision_models_for_input_types() -> List[str]:
    """
    Lightweight version for INPUT_TYPES - returns cached vision models without network calls.
    Falls back to placeholder if no cache available.
    """
    try:
        from .llm_cache import get_llm_cache
        cache = get_llm_cache()
        
        # Check if we have cached data (without triggering fetch)
        if hasattr(cache, '_ollama_vision_models') and cache._ollama_vision_models is not None:
            return cache._ollama_vision_models.copy()
        
        # Return placeholder - models will be populated when cache is populated
        return ["(Loading Ollama vision models...)"]
    except Exception as e:
        logging.debug(f"Failed to get cached Ollama vision models for INPUT_TYPES: {e}")
        return ["(Ollama vision models unavailable)"]

def get_cached_lmstudio_vision_models_for_input_types() -> List[str]:
    """
    Lightweight version for INPUT_TYPES - returns cached vision models without network calls.
    Falls back to placeholder if no cache available.
    """
    try:
        from .llm_cache import get_llm_cache
        cache = get_llm_cache()
        
        # Check if we have cached data (without triggering fetch)
        if hasattr(cache, '_lmstudio_vision_models') and cache._lmstudio_vision_models is not None:
            return cache._lmstudio_vision_models.copy()
        
        # Return placeholder - models will be populated when cache is populated
        return ["(Loading LM Studio vision models...)"]
    except Exception as e:
        logging.debug(f"Failed to get cached LM Studio vision models for INPUT_TYPES: {e}")
        return ["(LM Studio vision models unavailable)"]

# Background task to populate cache without blocking startup
def populate_llm_cache_async():
    """
    Populate LLM cache in background without blocking startup.
    This should be called after node registration is complete.
    """
    import threading
    
    def _populate_cache():
        try:
            from . import llm_wrapper as llm
            logging.info("Starting background LLM cache population...")
            
            # These calls will populate the cache asynchronously
            llm.get_ollama_models()
            llm.get_lmstudio_models() 
            llm.get_ollama_vision_models()
            llm.get_lmstudio_vision_models()
            
            logging.info("Background LLM cache population completed")
        except Exception as e:
            logging.error(f"Failed to populate LLM cache in background: {e}")
    
    # Start background thread
    thread = threading.Thread(target=_populate_cache, daemon=True)
    thread.start()
    logging.debug("Started background thread for LLM cache population")

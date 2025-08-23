"""
LLM Model Cache for SageUtils.

This module provides caching for LLM model lists and capabilities to avoid
repeated API calls during ComfyUI node initialization.
"""

import time
import logging
from typing import Dict, List, Optional, Any
from threading import Lock

class LLMModelCache:
    """Thread-safe cache for LLM model information."""
    
    def __init__(self, cache_duration: int = 300):  # 5 minutes default
        self.cache_duration = cache_duration
        self._ollama_models: Optional[List[str]] = None
        self._ollama_vision_models: Optional[List[str]] = None
        self._lmstudio_models: Optional[List[str]] = None
        self._lmstudio_vision_models: Optional[List[str]] = None
        
        self._ollama_models_time: float = 0
        self._ollama_vision_models_time: float = 0
        self._lmstudio_models_time: float = 0
        self._lmstudio_vision_models_time: float = 0
        
        self._lock = Lock()
        
        # Model capability cache (model_name -> vision_capable)
        self._ollama_capabilities: Dict[str, bool] = {}
        self._lmstudio_capabilities: Dict[str, bool] = {}
    
    def _is_cache_valid(self, timestamp: float) -> bool:
        """Check if cache is still valid based on timestamp."""
        return time.time() - timestamp < self.cache_duration
    
    def get_ollama_models(self, fetch_function) -> List[str]:
        """Get cached Ollama models or fetch if expired."""
        with self._lock:
            if (self._ollama_models is not None and 
                self._is_cache_valid(self._ollama_models_time)):
                return self._ollama_models.copy()
            
            try:
                models = fetch_function()
                self._ollama_models = models
                self._ollama_models_time = time.time()
                logging.debug(f"Cached {len(models)} Ollama models")
                return models.copy()
            except Exception as e:
                logging.error(f"Failed to fetch Ollama models: {e}")
                return self._ollama_models.copy() if self._ollama_models else []
    
    def get_ollama_vision_models(self, fetch_function) -> List[str]:
        """Get cached Ollama vision models or fetch if expired."""
        with self._lock:
            if (self._ollama_vision_models is not None and 
                self._is_cache_valid(self._ollama_vision_models_time)):
                return self._ollama_vision_models.copy()
            
            try:
                # Pass self to fetch function so it can cache capabilities
                models = fetch_function(self)
                self._ollama_vision_models = models
                self._ollama_vision_models_time = time.time()
                logging.debug(f"Cached {len(models)} Ollama vision models")
                return models.copy()
            except Exception as e:
                logging.error(f"Failed to fetch Ollama vision models: {e}")
                return self._ollama_vision_models.copy() if self._ollama_vision_models else []
    
    def get_lmstudio_models(self, fetch_function) -> List[str]:
        """Get cached LM Studio models or fetch if expired."""
        with self._lock:
            if (self._lmstudio_models is not None and 
                self._is_cache_valid(self._lmstudio_models_time)):
                return self._lmstudio_models.copy()
            
            try:
                models = fetch_function()
                self._lmstudio_models = models
                self._lmstudio_models_time = time.time()
                logging.debug(f"Cached {len(models)} LM Studio models")
                return models.copy()
            except Exception as e:
                logging.error(f"Failed to fetch LM Studio models: {e}")
                return self._lmstudio_models.copy() if self._lmstudio_models else []
    
    def get_lmstudio_vision_models(self, fetch_function) -> List[str]:
        """Get cached LM Studio vision models or fetch if expired."""
        with self._lock:
            if (self._lmstudio_vision_models is not None and 
                self._is_cache_valid(self._lmstudio_vision_models_time)):
                return self._lmstudio_vision_models.copy()
            
            try:
                # Pass self to fetch function so it can cache capabilities
                models = fetch_function(self)
                self._lmstudio_vision_models = models
                self._lmstudio_vision_models_time = time.time()
                logging.debug(f"Cached {len(models)} LM Studio vision models")
                return models.copy()
            except Exception as e:
                logging.error(f"Failed to fetch LM Studio vision models: {e}")
                return self._lmstudio_vision_models.copy() if self._lmstudio_vision_models else []
    
    def is_ollama_vision_model(self, model_name: str) -> Optional[bool]:
        """Check if a model supports vision (cached result)."""
        return self._ollama_capabilities.get(model_name)
    
    def set_ollama_vision_capability(self, model_name: str, is_vision: bool) -> None:
        """Cache vision capability for a model."""
        with self._lock:
            self._ollama_capabilities[model_name] = is_vision
    
    def _set_ollama_vision_capability_unlocked(self, model_name: str, is_vision: bool) -> None:
        """Cache vision capability for a model (no locking - for internal use)."""
        self._ollama_capabilities[model_name] = is_vision
    
    def is_lmstudio_vision_model(self, model_name: str) -> Optional[bool]:
        """Check if a model supports vision (cached result)."""
        return self._lmstudio_capabilities.get(model_name)
    
    def set_lmstudio_vision_capability(self, model_name: str, is_vision: bool) -> None:
        """Cache vision capability for a model."""
        with self._lock:
            self._lmstudio_capabilities[model_name] = is_vision
    
    def _set_lmstudio_vision_capability_unlocked(self, model_name: str, is_vision: bool) -> None:
        """Cache vision capability for a model (no locking - for internal use)."""
        self._lmstudio_capabilities[model_name] = is_vision
    
    def invalidate_all(self) -> None:
        """Invalidate all cached data."""
        with self._lock:
            self._ollama_models = None
            self._ollama_vision_models = None
            self._lmstudio_models = None
            self._lmstudio_vision_models = None
            
            self._ollama_models_time = 0
            self._ollama_vision_models_time = 0
            self._lmstudio_models_time = 0
            self._lmstudio_vision_models_time = 0
            
            self._ollama_capabilities.clear()
            self._lmstudio_capabilities.clear()
    
    def invalidate_ollama(self) -> None:
        """Invalidate Ollama cached data."""
        with self._lock:
            self._ollama_models = None
            self._ollama_vision_models = None
            self._ollama_models_time = 0
            self._ollama_vision_models_time = 0
            self._ollama_capabilities.clear()
    
    def invalidate_lmstudio(self) -> None:
        """Invalidate LM Studio cached data."""
        with self._lock:
            self._lmstudio_models = None
            self._lmstudio_vision_models = None
            self._lmstudio_models_time = 0
            self._lmstudio_vision_models_time = 0
            self._lmstudio_capabilities.clear()
    
    def get_cache_status(self) -> Dict[str, Any]:
        """Get current cache status for debugging."""
        with self._lock:
            current_time = time.time()
            return {
                "ollama_models": {
                    "cached": self._ollama_models is not None,
                    "count": len(self._ollama_models) if self._ollama_models else 0,
                    "age": current_time - self._ollama_models_time if self._ollama_models_time else None,
                    "valid": self._is_cache_valid(self._ollama_models_time)
                },
                "ollama_vision_models": {
                    "cached": self._ollama_vision_models is not None,
                    "count": len(self._ollama_vision_models) if self._ollama_vision_models else 0,
                    "age": current_time - self._ollama_vision_models_time if self._ollama_vision_models_time else None,
                    "valid": self._is_cache_valid(self._ollama_vision_models_time)
                },
                "lmstudio_models": {
                    "cached": self._lmstudio_models is not None,
                    "count": len(self._lmstudio_models) if self._lmstudio_models else 0,
                    "age": current_time - self._lmstudio_models_time if self._lmstudio_models_time else None,
                    "valid": self._is_cache_valid(self._lmstudio_models_time)
                },
                "lmstudio_vision_models": {
                    "cached": self._lmstudio_vision_models is not None,
                    "count": len(self._lmstudio_vision_models) if self._lmstudio_vision_models else 0,
                    "age": current_time - self._lmstudio_vision_models_time if self._lmstudio_vision_models_time else None,
                    "valid": self._is_cache_valid(self._lmstudio_vision_models_time)
                },
                "cache_duration": self.cache_duration
            }


# Global cache instance
_llm_cache: Optional[LLMModelCache] = None


def get_llm_cache() -> LLMModelCache:
    """Get the global LLM cache instance."""
    global _llm_cache
    if _llm_cache is None:
        _llm_cache = LLMModelCache()
    return _llm_cache


def invalidate_llm_cache() -> None:
    """Invalidate all LLM cache data."""
    cache = get_llm_cache()
    cache.invalidate_all()
    logging.info("LLM model cache invalidated")

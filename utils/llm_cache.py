"""
LLM Model Cache for SageUtils.

This module provides caching for LLM model lists and capabilities to avoid
repeated API calls during ComfyUI node initialization.
"""

import time
from typing import Any, Callable, Dict, List, Optional
from threading import Lock

from .logger import get_logger
logger = get_logger('llm.cache')

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

    def _get_cached_models(
        self,
        models_attr: str,
        time_attr: str,
        fetch_function: Callable[..., List[str]],
        label: str,
        pass_self: bool = False,
    ) -> List[str]:
        """Get cached model list or fetch fresh data when cache is stale."""
        with self._lock:
            cached_models = getattr(self, models_attr)
            cache_time = getattr(self, time_attr)

            if cached_models is not None and self._is_cache_valid(cache_time):
                return cached_models.copy()

            try:
                models = fetch_function(self) if pass_self else fetch_function()
                setattr(self, models_attr, models)
                setattr(self, time_attr, time.time())
                logger.debug(f"Cached {len(models)} {label}")
                return models.copy()
            except Exception as e:
                logger.error(f"Failed to fetch {label}: {e}")
                return cached_models.copy() if cached_models else []

    def _get_cache_entry_status(self, models_attr: str, time_attr: str, current_time: float) -> Dict[str, Any]:
        """Return status information for one cache entry."""
        cached_models = getattr(self, models_attr)
        cache_time = getattr(self, time_attr)
        return {
            "cached": cached_models is not None,
            "count": len(cached_models) if cached_models else 0,
            "age": current_time - cache_time if cache_time else None,
            "valid": self._is_cache_valid(cache_time),
        }
    
    def get_ollama_models(self, fetch_function) -> List[str]:
        """Get cached Ollama models or fetch if expired."""
        return self._get_cached_models(
            "_ollama_models",
            "_ollama_models_time",
            fetch_function,
            "Ollama models",
        )
    
    def get_ollama_vision_models(self, fetch_function) -> List[str]:
        """Get cached Ollama vision models or fetch if expired."""
        return self._get_cached_models(
            "_ollama_vision_models",
            "_ollama_vision_models_time",
            fetch_function,
            "Ollama vision models",
            pass_self=True,
        )
    
    def get_lmstudio_models(self, fetch_function) -> List[str]:
        """Get cached LM Studio models or fetch if expired."""
        return self._get_cached_models(
            "_lmstudio_models",
            "_lmstudio_models_time",
            fetch_function,
            "LM Studio models",
        )
    
    def get_lmstudio_vision_models(self, fetch_function) -> List[str]:
        """Get cached LM Studio vision models or fetch if expired."""
        return self._get_cached_models(
            "_lmstudio_vision_models",
            "_lmstudio_vision_models_time",
            fetch_function,
            "LM Studio vision models",
            pass_self=True,
        )
    
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
                "ollama_models": self._get_cache_entry_status(
                    "_ollama_models", "_ollama_models_time", current_time
                ),
                "ollama_vision_models": self._get_cache_entry_status(
                    "_ollama_vision_models", "_ollama_vision_models_time", current_time
                ),
                "lmstudio_models": self._get_cache_entry_status(
                    "_lmstudio_models", "_lmstudio_models_time", current_time
                ),
                "lmstudio_vision_models": self._get_cache_entry_status(
                    "_lmstudio_vision_models", "_lmstudio_vision_models_time", current_time
                ),
                "cache_duration": self.cache_duration,
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
    logger.info("LLM model cache invalidated")

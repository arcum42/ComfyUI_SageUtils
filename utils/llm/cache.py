"""Provider-aware LLM model cache for SageUtils.

This module keeps model lists and model capabilities in a generic per-provider
structure so new providers can be added without changing cache internals.
"""

import time
from threading import RLock
from typing import Any, Callable, Dict, List, Optional

from ..logger import get_logger
from .capabilities import reset_capability_cache

logger = get_logger('llm.cache')


class LLMProviderCache:
    """Thread-safe cache for provider model lists and capabilities."""

    def __init__(self, cache_duration: int = 300):
        self.cache_duration = cache_duration
        self._provider_models: Dict[str, Dict[str, List[str]]] = {}
        self._provider_times: Dict[str, Dict[str, float]] = {}
        self._provider_capabilities: Dict[str, Dict[str, bool]] = {}
        self._lock = RLock()

    def _is_cache_valid(self, timestamp: float) -> bool:
        return time.time() - timestamp < self.cache_duration

    def _ensure_provider(self, provider: str) -> None:
        if provider not in self._provider_models:
            self._provider_models[provider] = {}
        if provider not in self._provider_times:
            self._provider_times[provider] = {}
        if provider not in self._provider_capabilities:
            self._provider_capabilities[provider] = {}

    def get_model_list(
        self,
        provider: str,
        list_key: str,
        fetch_function: Callable[..., List[str]],
        label: Optional[str] = None,
        pass_self: bool = False,
    ) -> List[str]:
        """Get cached models for a provider/list key or fetch when stale."""
        with self._lock:
            self._ensure_provider(provider)
            provider_models = self._provider_models[provider]
            provider_times = self._provider_times[provider]

            cached_models = provider_models.get(list_key)
            cache_time = provider_times.get(list_key, 0)

            if cached_models is not None and self._is_cache_valid(cache_time):
                return cached_models.copy()

            try:
                models = fetch_function(self) if pass_self else fetch_function()
                provider_models[list_key] = models
                provider_times[list_key] = time.time()
                logger.debug(f"Cached {len(models)} {label or f'{provider}:{list_key}'}")
                return models.copy()
            except Exception as e:
                logger.error(f"Failed to fetch {label or f'{provider}:{list_key}'}: {e}")
                return cached_models.copy() if cached_models else []

    def peek_model_list(self, provider: str, list_key: str) -> Optional[List[str]]:
        """Return cached models without fetching or validating TTL."""
        with self._lock:
            self._ensure_provider(provider)
            cached_models = self._provider_models[provider].get(list_key)
            return cached_models.copy() if cached_models is not None else None

    def get_model_capability(self, provider: str, model_name: str) -> Optional[bool]:
        """Return cached capability value for provider/model, if present."""
        with self._lock:
            self._ensure_provider(provider)
            return self._provider_capabilities[provider].get(model_name)

    def set_model_capability(self, provider: str, model_name: str, value: bool) -> None:
        """Cache capability value for provider/model."""
        with self._lock:
            self._ensure_provider(provider)
            self._provider_capabilities[provider][model_name] = value

    def invalidate_provider(self, provider: str) -> None:
        """Invalidate all cached data for one provider."""
        with self._lock:
            self._provider_models[provider] = {}
            self._provider_times[provider] = {}
            self._provider_capabilities[provider] = {}

    def invalidate_all(self) -> None:
        """Invalidate all providers cached data."""
        with self._lock:
            self._provider_models.clear()
            self._provider_times.clear()
            self._provider_capabilities.clear()

    def get_cache_status(self) -> Dict[str, Any]:
        """Get cache status across providers for debugging."""
        with self._lock:
            current_time = time.time()
            providers: Dict[str, Any] = {}
            all_provider_keys = set(self._provider_models.keys()) | set(self._provider_times.keys())

            for provider in all_provider_keys:
                self._ensure_provider(provider)
                lists: Dict[str, Any] = {}
                keys = set(self._provider_models[provider].keys()) | set(self._provider_times[provider].keys())
                for key in keys:
                    cached_models = self._provider_models[provider].get(key)
                    cache_time = self._provider_times[provider].get(key, 0)
                    lists[key] = {
                        'cached': cached_models is not None,
                        'count': len(cached_models) if cached_models else 0,
                        'age': (current_time - cache_time) if cache_time else None,
                        'valid': self._is_cache_valid(cache_time) if cache_time else False,
                    }

                providers[provider] = {
                    'lists': lists,
                    'capabilities_count': len(self._provider_capabilities.get(provider, {})),
                }

            return {
                'providers': providers,
                'cache_duration': self.cache_duration,
            }


_llm_cache: Optional[LLMProviderCache] = None


def get_llm_cache() -> LLMProviderCache:
    """Get the global provider-aware LLM cache instance."""
    global _llm_cache
    if _llm_cache is None:
        _llm_cache = LLMProviderCache()
    return _llm_cache


def invalidate_llm_cache() -> None:
    """Invalidate all LLM cache data."""
    cache = get_llm_cache()
    cache.invalidate_all()
    reset_capability_cache()
    logger.info('LLM model cache invalidated')
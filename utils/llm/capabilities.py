"""Model capability detection and data structures for SageUtils LLM providers.

This module provides a unified way to track and detect model capabilities across
all providers (Ollama, LM Studio, OpenAI-compatible, etc.).
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Any, Dict, List, Optional

from ..logger import get_logger

logger = get_logger('llm.capabilities')


@dataclass
class ModelCapabilities:
    """Unified model capability information across all providers.
    
    Attributes:
        name: Model identifier (e.g., "gpt-4o", "llama2:latest", "qwen3.5-9b")
        provider: Provider name (e.g., "openai", "ollama_rest", "lmstudio_rest")
        vision: Whether the model supports vision/image input
        tool_use: Whether the model supports function calling/tool use
        reasoning: Whether the model is optimized for reasoning (o1, DeepSeek-R1, etc.)
        thinking: Whether the model can output thinking/CoT (internal reasoning)
        max_input_tokens: Maximum input context length, if known
        max_output_tokens: Maximum output tokens, if known
        supported_modalities: List of supported input modalities (["text"], ["text", "image"], etc.)
        context_window: Total context window size, if known
        metadata: Raw provider-specific metadata for debugging/fallback
        last_updated: When this capability info was last refreshed
        confidence: Source of capability info ("api" | "heuristic" | "guess")
            - "api": Detected from provider API metadata
            - "heuristic": Inferred from model name + known patterns
            - "guess": Last-resort fallback, low confidence
    """

    name: str
    provider: str
    vision: bool = False
    tool_use: bool = False
    reasoning: bool = False
    thinking: bool = False
    max_input_tokens: Optional[int] = None
    max_output_tokens: Optional[int] = None
    supported_modalities: List[str] = field(default_factory=lambda: ["text"])
    context_window: Optional[int] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    last_updated: datetime = field(default_factory=datetime.now)
    confidence: str = "api"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        data = asdict(self)
        data["last_updated"] = self.last_updated.isoformat()
        return data

    def is_stale(self, ttl_seconds: int = 86400) -> bool:
        """Check if capability info is older than TTL (default 24 hours)."""
        age = (datetime.now() - self.last_updated).total_seconds()
        return age > ttl_seconds

    def __str__(self) -> str:
        """Human-readable representation."""
        caps = []
        if self.vision:
            caps.append("vision")
        if self.tool_use:
            caps.append("tool_use")
        if self.reasoning:
            caps.append("reasoning")
        if self.thinking:
            caps.append("thinking")
        caps_str = ", ".join(caps) if caps else "text-only"
        confidence_indicator = {"api": "✓", "heuristic": "~", "guess": "?"}[self.confidence]
        return f"{self.name} [{caps_str}] {confidence_indicator}"


class CapabilityCache:
    """Enhanced cache specifically for model capabilities with TTL support.
    
    Separate from the model list cache to allow different TTL strategies:
    - Model lists change frequently → shorter TTL
    - Capabilities change rarely → longer TTL
    """

    def __init__(self, ttl_seconds: int = 86400):  # 24 hours default
        self.ttl_seconds = ttl_seconds
        # provider -> model_name -> ModelCapabilities
        self._capabilities: Dict[str, Dict[str, ModelCapabilities]] = {}

    def get(self, provider: str, model_name: str) -> Optional[ModelCapabilities]:
        """Get cached capabilities, returns None if not found or stale."""
        if provider not in self._capabilities:
            return None

        cap = self._capabilities[provider].get(model_name)
        if cap and not cap.is_stale(self.ttl_seconds):
            return cap

        # Remove stale entry
        if cap:
            del self._capabilities[provider][model_name]
        return None

    def set(self, capabilities: ModelCapabilities) -> None:
        """Cache a capability object."""
        provider = capabilities.provider
        if provider not in self._capabilities:
            self._capabilities[provider] = {}
        self._capabilities[provider][capabilities.name] = capabilities
        logger.debug(
            f"Cached capability for {provider}:{capabilities.name} "
            f"(confidence: {capabilities.confidence})"
        )

    def peek(self, provider: str, model_name: str) -> Optional[ModelCapabilities]:
        """Get cached capabilities without checking TTL (for debugging)."""
        if provider not in self._capabilities:
            return None
        return self._capabilities[provider].get(model_name)

    def invalidate_provider(self, provider: str) -> None:
        """Clear all cached capabilities for a provider."""
        if provider in self._capabilities:
            del self._capabilities[provider]
            logger.debug(f"Invalidated capability cache for {provider}")

    def invalidate_all(self) -> None:
        """Clear all cached capabilities."""
        self._capabilities.clear()
        logger.debug("Invalidated all capability caches")

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics for debugging."""
        stats = {
            "ttl_seconds": self.ttl_seconds,
            "providers": {},
        }
        for provider, models in self._capabilities.items():
            valid_count = sum(1 for cap in models.values() if not cap.is_stale(self.ttl_seconds))
            stats["providers"][provider] = {
                "total": len(models),
                "valid": valid_count,
                "stale": len(models) - valid_count,
            }
        return stats


# Global capability cache instance
_capability_cache: Optional[CapabilityCache] = None


def get_capability_cache() -> CapabilityCache:
    """Get the global capability cache instance."""
    global _capability_cache
    if _capability_cache is None:
        _capability_cache = CapabilityCache()
    return _capability_cache


def reset_capability_cache() -> None:
    """Reset the global capability cache."""
    global _capability_cache
    _capability_cache = CapabilityCache()
    logger.info("Capability cache reset")

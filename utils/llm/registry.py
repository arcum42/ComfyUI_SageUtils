"""Provider registry/state helpers for LLM service initialization flow."""

from dataclasses import dataclass
from typing import Callable, Dict, Optional


@dataclass
class ProviderState:
    """Runtime state for one provider."""

    initialized: bool = False
    available: bool = False
    last_checked: Optional[float] = None


@dataclass(frozen=True)
class ProviderDescriptor:
    """Static provider configuration used by the service facade."""

    key: str
    setting_key: str
    display_name: str
    initializer: Callable[[bool], bool]


class ProviderRegistry:
    """Simple provider registry with per-provider runtime state."""

    def __init__(self, retry_seconds: float = 60.0):
        self.retry_seconds = retry_seconds
        self._descriptors: Dict[str, ProviderDescriptor] = {}
        self._state: Dict[str, ProviderState] = {}

    def register(self, descriptor: ProviderDescriptor) -> None:
        self._descriptors[descriptor.key] = descriptor
        self._state.setdefault(descriptor.key, ProviderState())

    def descriptor(self, key: str) -> ProviderDescriptor:
        return self._descriptors[key]

    def state(self, key: str) -> ProviderState:
        return self._state[key]

    def set_state(
        self,
        key: str,
        *,
        initialized: Optional[bool] = None,
        available: Optional[bool] = None,
        last_checked: Optional[float] = None,
    ) -> ProviderState:
        state = self.state(key)
        if initialized is not None:
            state.initialized = initialized
        if available is not None:
            state.available = available
        if last_checked is not None:
            state.last_checked = last_checked
        return state

    def reset(self) -> None:
        for key in self._state:
            self._state[key] = ProviderState()
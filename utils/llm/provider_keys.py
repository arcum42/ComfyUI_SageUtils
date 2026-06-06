"""Canonical provider keys and alias normalization helpers."""

LMSTUDIO_REST_KEY = 'lmstudio_rest'
OLLAMA_REST_KEY = 'ollama_rest'
OPENAI_KEY = 'openai'
NATIVE_KEY = 'native'

_PROVIDER_ALIAS_MAP = {
    'lmstudio': LMSTUDIO_REST_KEY,
    'ollama': OLLAMA_REST_KEY,
}

SERVICE_PROVIDER_KEYS = (
    LMSTUDIO_REST_KEY,
    OLLAMA_REST_KEY,
    OPENAI_KEY,
)

ROUTE_PROVIDER_KEYS = (
    LMSTUDIO_REST_KEY,
    OLLAMA_REST_KEY,
    OPENAI_KEY,
    NATIVE_KEY,
)


def normalize_provider_key(provider: str) -> str:
    """Normalize provider aliases to canonical backend keys."""
    normalized = (provider or '').strip().lower()
    return _PROVIDER_ALIAS_MAP.get(normalized, normalized)

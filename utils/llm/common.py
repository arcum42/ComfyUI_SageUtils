"""Shared LLM helper utilities extracted from llm/service.py."""
from typing import Any, Optional
from .tensor import tensor_to_base64_safe

def _extract_first_key_value(obj: Any, keys: tuple[str, ...]) -> Optional[str]:
    if not isinstance(obj, dict):
        return None

    for key in keys:
        value = obj.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    return None

def clean_response(response: str) -> str:
    """Clean the response from the model by removing unnecessary tags."""
    if not response:
        return ''
    response = response.strip()
    for tag in ('</end_of_turn>', '>end_of_turn>'):
        if response.endswith(tag):
            response = response[: -len(tag)].strip()
    return response

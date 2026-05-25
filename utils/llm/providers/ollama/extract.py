from typing import Any, Optional

from ...common import _extract_first_key_value

model_name_keys = ('name', 'model', 'id')
model_list_keys = ('models', 'data', 'items')

def _extract_model_name(model_obj: Any) -> Optional[str]:
    return _extract_first_key_value(model_obj, model_name_keys)

def _extract_models_payload(response: Any) -> list[dict[str, Any]]:
    if isinstance(response, dict):
        for key in model_list_keys:
            value = response.get(key)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]

    if isinstance(response, list):
        return [item for item in response if isinstance(item, dict)]

    return []

def _extract_response_text(response: Any) -> str:
    """Extract text from an Ollama /api/chat response."""
    if isinstance(response, dict):
        message = response.get('message')
        if isinstance(message, dict):
            content = message.get('content')
            if isinstance(content, str):
                return content

    return ''


from typing import Any, Optional

from ...common import _extract_first_key_value

model_name_keys = ('id', 'model', 'name')
model_list_keys = ('data', 'models', 'items')

def _extract_model_id(model_obj: Any) -> Optional[str]:
    return _extract_first_key_value(model_obj, model_name_keys)

def _extract_models_payload(response: Any) -> list[dict[str, Any]]:
    """Extract model list from OpenAI /v1/models response."""
    if isinstance(response, dict):
        for key in model_list_keys:
            value = response.get(key)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]

    if isinstance(response, list):
        return [item for item in response if isinstance(item, dict)]

    return []

def _extract_response_text(response: Any) -> str:
    """Extract assistant content from an OpenAI /v1/chat/completions response."""
    if isinstance(response, dict):
        choices = response.get('choices')
        if isinstance(choices, list) and choices:
            first = choices[0]
            if isinstance(first, dict):
                message = first.get('message')
                if isinstance(message, dict):
                    content = message.get('content')
                    if isinstance(content, str):
                        return content

    return ''

def _extract_stream_delta(payload: Any) -> str:
    if not isinstance(payload, dict):
        return ''

    choices = payload.get('choices')
    if not isinstance(choices, list) or not choices:
        return ''

    first = choices[0]
    if not isinstance(first, dict):
        return ''

    delta = first.get('delta')
    if isinstance(delta, dict):
        content = delta.get('content')
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts: list[str] = []
            for item in content:
                if isinstance(item, dict) and item.get('type') == 'text' and isinstance(item.get('text'), str):
                    parts.append(item['text'])
            return ''.join(parts)

    return ''

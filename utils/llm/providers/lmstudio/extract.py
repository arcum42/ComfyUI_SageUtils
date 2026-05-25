from typing import Any, Optional
from ...common import _extract_first_key_value

model_name_keys = ('key', 'id', 'model_key', 'model', 'name')
model_list_keys = ('data', 'models', 'items')

def _extract_model_name(model_obj: Any) -> Optional[str]:
    return _extract_first_key_value(model_obj, model_name_keys)

def _extract_models_payload(response: Any) -> list[dict[str, Any]]:
    if isinstance(response, list):
        return [item for item in response if isinstance(item, dict)]

    if isinstance(response, dict):
        for key in model_list_keys:
            value = response.get(key)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]

    return []

def _extract_response_text(response: Any) -> str:
    if isinstance(response, dict):
        output_items = response.get('output')
        if isinstance(output_items, list):
            message_parts: list[str] = []
            for item in output_items:
                if not isinstance(item, dict):
                    continue
                if item.get('type') == 'message' and isinstance(item.get('content'), str):
                    message_parts.append(item['content'])
            if message_parts:
                return ''.join(message_parts)

        # OpenAI-compatible fallback if shape changes
        choices = response.get('choices')
        if isinstance(choices, list) and choices:
            first_choice = choices[0] if isinstance(choices[0], dict) else {}
            message = first_choice.get('message') if isinstance(first_choice, dict) else None
            if isinstance(message, dict) and isinstance(message.get('content'), str):
                return message['content']

    return ''

def _extract_chat_end_text(payload: Any) -> str:
    if not isinstance(payload, dict):
        return ''
    return _extract_response_text(payload.get('result'))

def _extract_stream_text_delta(event_type: str, event_data: Any) -> str:
    if event_type != 'message.delta':
        return ''
    if not isinstance(event_data, dict):
        return ''
    content = event_data.get('content')
    if isinstance(content, str):
        return content
    return ''

def _extract_error_message(event_data: Any) -> str:
    """Extract a readable error message from LM Studio SSE payloads."""
    if isinstance(event_data, dict):
        error_payload = event_data.get('error')
        if isinstance(error_payload, dict):
            message = error_payload.get('message')
            if isinstance(message, str) and message.strip():
                return message.strip()

        message = event_data.get('message')
        if isinstance(message, str) and message.strip():
            return message.strip()

    return ''

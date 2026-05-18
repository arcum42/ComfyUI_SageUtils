"""Ollama REST provider operations using the native HTTP API (no SDK required)."""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
import folder_paths
from ....path_manager import path_manager

from ...cache import get_llm_cache
from ....logger import get_logger
from ...common import clean_response
from ...errors import raise_llm_error, report_llm_error, stringify_llm_error
from ...rest import iter_json_lines, normalize_raw_image_base64
from .capabilities import get_model_capabilities, get_model_capabilities_map
from .requests import (
    ollama_request_json_chat,
    ollama_request_json_generate,
    ollama_request_json_tags,
    ollama_request_stream_chat,
)

logger = get_logger('llm.providers.ollama_rest')

_PROVIDER_NAME = 'ollama_rest'
_UNAVAILABLE_MESSAGE = '(Ollama REST not available)'
_MAX_TOOL_ITERATIONS = 4


def _unavailable_models() -> list[str]:
    return [_UNAVAILABLE_MESSAGE]


def _is_unavailable(enabled: bool) -> bool:
    return not enabled


def _get_request_timeout() -> float:
    """Return request timeout seconds for generation calls.

    Uses settings key ollama_rest_timeout_seconds when available.
    Falls back to 180s to accommodate slower first-token/model-load paths.
    """
    from ....settings import get_setting

    raw = get_setting('ollama_rest_timeout_seconds', 240)
    try:
        timeout = float(raw)
    except (TypeError, ValueError):
        return 240.0
    return timeout if timeout > 0 else 240.0


def _extract_model_name(model_obj: Any) -> Optional[str]:
    if not isinstance(model_obj, dict):
        return None

    for key in ('name', 'model', 'id'):
        value = model_obj.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    return None


def _extract_models_payload(response: Any) -> list[dict[str, Any]]:
    if isinstance(response, dict):
        for key in ('models', 'data', 'items'):
            value = response.get(key)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]

    if isinstance(response, list):
        return [item for item in response if isinstance(item, dict)]

    return []


def _build_options(options: Optional[dict[str, Any]]) -> dict[str, Any]:
    input_options = options or {}
    result: dict[str, Any] = {}

    option_map = {
        'temperature': 'temperature',
        'top_p': 'top_p',
        'topP': 'top_p',
        'topPSampling': 'top_p',
        'top_k': 'top_k',
        'topK': 'top_k',
        'topKSampling': 'top_k',
        'min_p': 'min_p',
        'minP': 'min_p',
        'minPSampling': 'min_p',
        'repeat_penalty': 'repeat_penalty',
        'repeatPenalty': 'repeat_penalty',
        'max_tokens': 'num_predict',
        'maxTokens': 'num_predict',
        'max_output_tokens': 'num_predict',
        'num_predict': 'num_predict',
        'num_ctx': 'num_ctx',
        'seed': 'seed',
    }

    for key, mapped_key in option_map.items():
        if key in input_options and input_options[key] is not None:
            result[mapped_key] = input_options[key]

    return result


def _apply_top_level_controls(payload: dict[str, Any], options: Optional[dict[str, Any]]) -> None:
    """Apply non-options controls that Ollama expects at top-level request fields."""
    input_options = options or {}

    think_value = input_options.get('think')
    if think_value is not None:
        payload['think'] = think_value

    tools_value = input_options.get('tools')
    if isinstance(tools_value, list):
        payload['tools'] = tools_value


def _extract_response_text(response: Any) -> str:
    """Extract text from an Ollama /api/chat response."""
    if isinstance(response, dict):
        message = response.get('message')
        if isinstance(message, dict):
            content = message.get('content')
            if isinstance(content, str):
                return content

    return ''


def _build_messages(prompt: str, system_prompt: str = '', raw_images=None) -> list[dict[str, Any]]:
    messages = []
    if system_prompt:
        messages.append({'role': 'system', 'content': system_prompt})

    user_message: dict[str, Any] = {'role': 'user', 'content': prompt}
    if raw_images:
        user_message['images'] = raw_images
    messages.append(user_message)
    return messages


def _is_tool_loop_enabled(options: Optional[dict[str, Any]]) -> bool:
    input_options = options or {}
    tools_value = input_options.get('tools')
    return isinstance(tools_value, list) and len(tools_value) > 0


def _extract_tool_calls(message: Any) -> list[dict[str, Any]]:
    if not isinstance(message, dict):
        return []

    tool_calls = message.get('tool_calls')
    if not isinstance(tool_calls, list):
        return []

    return [item for item in tool_calls if isinstance(item, dict)]


def _extract_allowed_tool_names(options: Optional[dict[str, Any]]) -> set[str]:
    input_options = options or {}
    tools_value = input_options.get('tools')
    if not isinstance(tools_value, list):
        return set()

    names: set[str] = set()
    for tool_entry in tools_value:
        if not isinstance(tool_entry, dict):
            continue

        function_payload = tool_entry.get('function')
        if isinstance(function_payload, dict):
            name = str(function_payload.get('name') or '').strip()
            if name:
                names.add(name)
                continue

        fallback_name = str(tool_entry.get('name') or '').strip()
        if fallback_name:
            names.add(fallback_name)

    return names


def _parse_tool_arguments(arguments: Any) -> dict[str, Any]:
    if isinstance(arguments, dict):
        return arguments
    if isinstance(arguments, str):
        text = arguments.strip()
        if not text:
            return {}
        try:
            parsed = json.loads(text)
            return parsed if isinstance(parsed, dict) else {'value': parsed}
        except json.JSONDecodeError:
            return {'raw': arguments}
    if arguments is None:
        return {}
    return {'value': arguments}


def _extract_tool_name_and_args(tool_call: dict[str, Any]) -> tuple[str, dict[str, Any], str]:
    function_payload = tool_call.get('function')
    call_id = str(tool_call.get('id') or '')

    if isinstance(function_payload, dict):
        name = str(function_payload.get('name') or '').strip()
        arguments = _parse_tool_arguments(function_payload.get('arguments'))
        return name, arguments, call_id

    name = str(tool_call.get('name') or '').strip()
    arguments = _parse_tool_arguments(tool_call.get('arguments'))
    return name, arguments, call_id


def _safe_limit(value: Any, default: int = 20, minimum: int = 1, maximum: int = 100) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default
    return max(minimum, min(maximum, parsed))


def _truncate_text(text: str, max_chars: int = 4000) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + '\n...[truncated]'


def _get_notes_dir() -> Path:
    notes_dir = path_manager.notes_path
    notes_dir.mkdir(parents=True, exist_ok=True)
    return notes_dir


def _is_safe_note_filename(filename: str) -> bool:
    if not filename:
        return False
    if any(char in filename for char in ['/', '\\', '..', '<', '>', ':', '"', '|', '?', '*']):
        return False
    return True


def _load_saved_prompts() -> dict[str, Any]:
    prompts_file = path_manager.sage_users_path / 'saved_prompts.json'
    if not prompts_file.exists():
        return {'prompts': [], 'categories': [], 'metadata': {}}

    try:
        with prompts_file.open('r', encoding='utf-8') as handle:
            data = json.load(handle)
            return data if isinstance(data, dict) else {'prompts': [], 'categories': [], 'metadata': {}}
    except Exception:
        return {'prompts': [], 'categories': [], 'metadata': {}}


def _local_tool_notes_list(args: dict[str, Any]) -> dict[str, Any]:
    notes_dir = _get_notes_dir()
    limit = _safe_limit(args.get('limit'), default=50, maximum=200)

    files = [entry.name for entry in notes_dir.iterdir() if entry.is_file()]
    files.sort()
    return {
        'files': files[:limit],
        'total': len(files),
    }


def _local_tool_notes_read(args: dict[str, Any]) -> dict[str, Any]:
    filename = str(args.get('filename') or '').strip()
    if not _is_safe_note_filename(filename):
        raise_llm_error(ValueError, 'Invalid notes filename', provider=_PROVIDER_NAME, operation='tool_execute')

    notes_dir = _get_notes_dir()
    note_path = notes_dir / filename
    try:
        if not note_path.resolve().is_file() or not str(note_path.resolve()).startswith(str(notes_dir.resolve())):
            raise FileNotFoundError(filename)
    except Exception:
        raise_llm_error(ValueError, f"Note not found: {filename}", provider=_PROVIDER_NAME, operation='tool_execute')

    max_chars = _safe_limit(args.get('max_chars'), default=4000, maximum=20000)
    with note_path.open('r', encoding='utf-8') as handle:
        content = handle.read()

    return {
        'filename': filename,
        'content': _truncate_text(content, max_chars=max_chars),
    }


def _local_tool_notes_search(args: dict[str, Any]) -> dict[str, Any]:
    query = str(args.get('query') or '').strip().lower()
    if not query:
        raise_llm_error(ValueError, 'Search query is required', provider=_PROVIDER_NAME, operation='tool_execute')

    notes_dir = _get_notes_dir()
    limit = _safe_limit(args.get('limit'), default=20, maximum=100)
    results: list[dict[str, Any]] = []

    for entry in sorted(notes_dir.iterdir(), key=lambda p: p.name):
        if not entry.is_file():
            continue
        try:
            content = entry.read_text(encoding='utf-8')
        except Exception:
            continue

        lowered = content.lower()
        index = lowered.find(query)
        if index < 0:
            continue

        start = max(0, index - 80)
        end = min(len(content), index + 80)
        snippet = content[start:end].replace('\n', ' ')
        results.append({'filename': entry.name, 'snippet': snippet})
        if len(results) >= limit:
            break

    return {'query': query, 'matches': results, 'count': len(results)}


def _local_tool_prompts_list(args: dict[str, Any]) -> dict[str, Any]:
    data = _load_saved_prompts()
    raw_prompts = data.get('prompts')
    prompts: list[dict[str, Any]] = raw_prompts if isinstance(raw_prompts, list) else []
    category = str(args.get('category') or '').strip().lower()
    limit = _safe_limit(args.get('limit'), default=50, maximum=200)

    filtered = prompts
    if category:
        filtered = [item for item in prompts if isinstance(item, dict) and str(item.get('category') or '').lower() == category]

    normalized: list[dict[str, Any]] = []
    for item in filtered[:limit]:
        if not isinstance(item, dict):
            continue
        normalized.append({
            'id': item.get('id'),
            'name': item.get('name'),
            'category': item.get('category'),
            'description': item.get('description', ''),
            'used_count': item.get('used_count', 0),
        })

    return {'prompts': normalized, 'total': len(filtered)}


def _local_tool_prompts_get(args: dict[str, Any]) -> dict[str, Any]:
    prompt_id = str(args.get('id') or '').strip()
    if not prompt_id:
        raise_llm_error(ValueError, 'Prompt id is required', provider=_PROVIDER_NAME, operation='tool_execute')

    data = _load_saved_prompts()
    raw_prompts = data.get('prompts')
    prompts: list[dict[str, Any]] = raw_prompts if isinstance(raw_prompts, list) else []
    for item in prompts:
        if isinstance(item, dict) and str(item.get('id') or '') == prompt_id:
            return {'prompt': item}

    raise_llm_error(ValueError, f"Prompt not found: {prompt_id}", provider=_PROVIDER_NAME, operation='tool_execute')
    return {}


def _local_tool_prompts_search(args: dict[str, Any]) -> dict[str, Any]:
    query = str(args.get('query') or '').strip().lower()
    if not query:
        raise_llm_error(ValueError, 'Search query is required', provider=_PROVIDER_NAME, operation='tool_execute')

    data = _load_saved_prompts()
    raw_prompts = data.get('prompts')
    prompts: list[dict[str, Any]] = raw_prompts if isinstance(raw_prompts, list) else []
    limit = _safe_limit(args.get('limit'), default=20, maximum=100)
    matches: list[dict[str, Any]] = []

    for item in prompts:
        if not isinstance(item, dict):
            continue

        haystack = ' '.join([
            str(item.get('name') or ''),
            str(item.get('description') or ''),
            str(item.get('positive') or ''),
            str(item.get('negative') or ''),
        ]).lower()

        if query not in haystack:
            continue

        matches.append({
            'id': item.get('id'),
            'name': item.get('name'),
            'category': item.get('category'),
            'description': item.get('description', ''),
        })

        if len(matches) >= limit:
            break

    return {'query': query, 'matches': matches, 'count': len(matches)}


def _local_tool_workflow_read_latest(args: dict[str, Any]) -> dict[str, Any]:
    user_dir = Path(folder_paths.get_user_directory())
    workflows_dir = user_dir / 'default' / 'workflows'
    if not workflows_dir.exists() or not workflows_dir.is_dir():
        return {'workflow': None, 'message': 'No workflows directory found'}

    candidates = [item for item in workflows_dir.glob('*.json') if item.is_file()]
    if not candidates:
        return {'workflow': None, 'message': 'No workflow files found'}

    latest = max(candidates, key=lambda p: p.stat().st_mtime)
    max_chars = _safe_limit(args.get('max_chars'), default=30000, maximum=200000)

    raw = latest.read_text(encoding='utf-8')
    return {
        'filename': latest.name,
        'content': _truncate_text(raw, max_chars=max_chars),
    }


def _local_tool_get_time(args: dict[str, Any]) -> dict[str, Any]:
    use_utc = bool(args.get('utc', False))
    now = datetime.now(timezone.utc) if use_utc else datetime.now()
    return {
        'timestamp': now.isoformat(),
        'utc': use_utc,
    }


def _local_tool_echo(args: dict[str, Any]) -> dict[str, Any]:
    text = args.get('text')
    if text is None:
        text = args.get('message', '')
    return {
        'text': str(text),
    }


def _execute_local_tool(name: str, args: dict[str, Any], allowed_tool_names: Optional[set[str]] = None) -> dict[str, Any]:
    tool_name = (name or '').strip()
    if not tool_name:
        raise_llm_error(
            ValueError,
            'Tool call missing function name',
            provider=_PROVIDER_NAME,
            operation='tool_execute',
        )

    if allowed_tool_names and tool_name not in allowed_tool_names:
        raise_llm_error(
            ValueError,
            f"Tool is not declared in request schema: {tool_name}",
            provider=_PROVIDER_NAME,
            operation='tool_execute',
        )

    # Phase 3 baseline tool set (safe, side-effect free).
    if tool_name == 'sage.get_time':
        return _local_tool_get_time(args)
    if tool_name == 'sage.echo':
        return _local_tool_echo(args)
    if tool_name == 'sage.notes.list':
        return _local_tool_notes_list(args)
    if tool_name == 'sage.notes.read':
        return _local_tool_notes_read(args)
    if tool_name == 'sage.notes.search':
        return _local_tool_notes_search(args)
    if tool_name == 'sage.prompts.list':
        return _local_tool_prompts_list(args)
    if tool_name == 'sage.prompts.get':
        return _local_tool_prompts_get(args)
    if tool_name == 'sage.prompts.search':
        return _local_tool_prompts_search(args)
    if tool_name == 'sage.workflow.read_latest':
        return _local_tool_workflow_read_latest(args)

    raise_llm_error(
        ValueError,
        f"Unsupported local tool: {tool_name}",
        provider=_PROVIDER_NAME,
        operation='tool_execute',
    )
    return {}


def _build_tool_message(tool_name: str, tool_result: dict[str, Any], call_id: str = '') -> dict[str, Any]:
    content_payload = {
        'tool': tool_name,
        'result': tool_result,
    }
    message: dict[str, Any] = {
        'role': 'tool',
        'content': json.dumps(content_payload, ensure_ascii=True),
    }
    if call_id:
        message['tool_call_id'] = call_id
    return message


def _build_ollama_payload(model: str, messages: list[dict[str, Any]], options=None, keep_alive: str = '5m', stream: bool = False) -> dict[str, Any]:
    payload: dict[str, Any] = {
        'model': model,
        'messages': messages,
        'stream': stream,
    }
    if keep_alive:
        payload['keep_alive'] = keep_alive

    _apply_top_level_controls(payload, options)

    built_options = _build_options(options)
    if built_options:
        payload['options'] = built_options

    return payload


def _chat_once(payload: dict[str, Any], operation: str) -> dict[str, Any]:
    response = ollama_request_json_chat(payload, timeout=_get_request_timeout())

    if not isinstance(response, dict):
        raise_llm_error(
            ValueError,
            'Invalid response received from Ollama REST.',
            provider=_PROVIDER_NAME,
            operation=operation,
        )

    if response.get('error'):
        raise_llm_error(
            RuntimeError,
            str(response.get('error')),
            provider=_PROVIDER_NAME,
            operation=operation,
        )

    return response


def _generate_with_tool_loop(model: str, messages: list[dict[str, Any]], options=None, keep_alive: str = '5m', operation: str = 'generate') -> tuple[str, list[dict[str, Any]]]:
    working_messages = list(messages)
    last_response_text = ''
    tool_events: list[dict[str, Any]] = []
    allowed_tool_names = _extract_allowed_tool_names(options)

    for iteration in range(_MAX_TOOL_ITERATIONS):
        payload = _build_ollama_payload(model, working_messages, options=options, keep_alive=keep_alive, stream=False)
        response = _chat_once(payload, operation)
        message = response.get('message') if isinstance(response.get('message'), dict) else {}
        response_text = _extract_response_text(response)
        last_response_text = response_text or last_response_text

        assistant_message: dict[str, Any] = {
            'role': 'assistant',
            'content': response_text,
        }

        tool_calls = _extract_tool_calls(message)
        if tool_calls:
            assistant_message['tool_calls'] = tool_calls

        working_messages.append(assistant_message)

        if not tool_calls:
            return clean_response(response_text), tool_events

        for tool_call in tool_calls:
            tool_name, tool_args, tool_call_id = _extract_tool_name_and_args(tool_call)
            tool_events.append({
                'event': 'tool_call.start',
                'tool': {'name': tool_name, 'arguments': tool_args, 'status': 'start', 'id': tool_call_id},
                'done': False,
            })

            try:
                tool_result = _execute_local_tool(tool_name, tool_args, allowed_tool_names=allowed_tool_names)
                tool_events.append({
                    'event': 'tool_call.success',
                    'tool': {'name': tool_name, 'result': tool_result, 'status': 'success', 'id': tool_call_id},
                    'done': False,
                })
                working_messages.append(_build_tool_message(tool_name, tool_result, call_id=tool_call_id))
            except Exception as tool_error:
                error_text = stringify_llm_error(tool_error)
                tool_events.append({
                    'event': 'tool_call.failure',
                    'tool': {'name': tool_name, 'error': error_text, 'status': 'failure', 'id': tool_call_id},
                    'done': False,
                })
                working_messages.append(_build_tool_message(tool_name, {'error': error_text}, call_id=tool_call_id))

    logger.warning('Tool loop hit maximum iterations (%s)', _MAX_TOOL_ITERATIONS)
    return clean_response(last_response_text), tool_events


def _normalize_raw_images(images=None) -> list[str]:
    if images is None:
        return []

    image_entries = images if isinstance(images, list) else [images]
    raw_images: list[str] = []
    for img in image_entries:
        raw_images.append(normalize_raw_image_base64(str(img)))
    return raw_images


def _stream_chat_response(payload: dict[str, Any], operation: str):
    full_response = ''
    stream_payload = payload.copy()
    stream_payload['stream'] = True

    with ollama_request_stream_chat(stream_payload, timeout=_get_request_timeout()) as response:
        for item in iter_json_lines(response):
            if not isinstance(item, dict):
                continue

            message = item.get('message')
            chunk = ''
            if isinstance(message, dict):
                content = message.get('content')
                if isinstance(content, str):
                    chunk = content

            if chunk:
                full_response += chunk
                yield {'chunk': chunk, 'done': False}

            if item.get('error'):
                raise_llm_error(RuntimeError, str(item.get('error')), provider=_PROVIDER_NAME, operation=operation)

            if item.get('done'):
                yield {'chunk': '', 'done': True, 'full_response': clean_response(full_response)}
                return

    yield {'chunk': '', 'done': True, 'full_response': clean_response(full_response)}


def is_running(enabled: bool) -> bool:
    """Check if the Ollama REST server is reachable."""
    if _is_unavailable(enabled):
        return False

    try:
        ollama_request_json_tags(timeout=5.0)
        return True
    except Exception:
        return False


def get_models(enabled: bool) -> list[str]:
    """Retrieve a list of available models from Ollama REST."""
    if _is_unavailable(enabled):
        return _unavailable_models()

    def _fetch_models() -> list[str]:
        try:
            response = ollama_request_json_tags(timeout=_get_request_timeout())
            models_payload = _extract_models_payload(response)
            models: list[str] = []
            for model_obj in models_payload:
                model_name = _extract_model_name(model_obj)
                if model_name:
                    models.append(model_name)
            return models
        except Exception as e:
            report_llm_error('Error retrieving models from Ollama REST', provider=_PROVIDER_NAME, operation='get_models', cause=e)
            return _unavailable_models()

    cache = get_llm_cache()
    return cache.get_model_list(
        _PROVIDER_NAME,
        'models',
        _fetch_models,
        label='Ollama REST models',
    )


def get_vision_models(enabled: bool) -> list[str]:
    """Retrieve a list of available vision models from Ollama REST."""
    if _is_unavailable(enabled):
        return _unavailable_models()

    def _fetch_vision_models(cache_instance) -> list[str]:
        try:
            response = ollama_request_json_tags(timeout=_get_request_timeout())
            models_payload = _extract_models_payload(response)
            vision_models: list[str] = []

            for model_obj in models_payload:
                model_name = _extract_model_name(model_obj)
                if not model_name:
                    continue

                capabilities = get_model_capabilities(enabled, model_name, model_obj)
                cache_instance.set_model_capability(_PROVIDER_NAME, model_name, capabilities.vision)
                if capabilities.vision:
                    vision_models.append(model_name)

            return vision_models
        except Exception as e:
            report_llm_error('Error retrieving vision models from Ollama REST', provider=_PROVIDER_NAME, operation='get_vision_models', cause=e)
            return []

    cache = get_llm_cache()
    return cache.get_model_list(
        _PROVIDER_NAME,
        'vision_models',
        _fetch_vision_models,
        label='Ollama REST vision models',
        pass_self=True,
    )


def get_tool_models(enabled: bool) -> list[str]:
    if _is_unavailable(enabled):
        return _unavailable_models()

    capabilities_map = get_model_capabilities_map(enabled, model_names=get_models(enabled))
    return sorted([name for name, capabilities in capabilities_map.items() if capabilities.tool_use])


def get_reasoning_models(enabled: bool) -> list[str]:
    if _is_unavailable(enabled):
        return _unavailable_models()

    capabilities_map = get_model_capabilities_map(enabled, model_names=get_models(enabled))
    return sorted([name for name, capabilities in capabilities_map.items() if capabilities.reasoning])


def load_model(enabled: bool, model: str, keep_alive: int = 60) -> bool:
    """Warm-load an Ollama model via /api/generate with an empty prompt."""
    if _is_unavailable(enabled):
        raise_llm_error(ImportError, 'Ollama REST is not enabled.', provider=_PROVIDER_NAME, operation='load_model')

    try:
        keep_alive_seconds = max(0, int(keep_alive))
    except (TypeError, ValueError):
        keep_alive_seconds = 60

    payload = {
        'model': model,
        'prompt': '',
        'stream': False,
        'keep_alive': f'{keep_alive_seconds}s',
    }

    try:
        response = ollama_request_json_generate(payload, timeout=_get_request_timeout())
        if isinstance(response, dict) and response.get('error'):
            raise_llm_error(RuntimeError, str(response.get('error')), provider=_PROVIDER_NAME, operation='load_model')
        return True
    except Exception as e:
        report_llm_error('Error preloading model via Ollama REST', provider=_PROVIDER_NAME, operation='load_model', cause=e)
        return False


def generate(enabled: bool, model: str, prompt: str, options=None, system_prompt: str = '', keep_alive: str = '5m') -> str:
    """Generate a response from Ollama REST using /api/chat."""
    if _is_unavailable(enabled):
        raise_llm_error(ImportError, 'Ollama REST is not enabled.', provider=_PROVIDER_NAME, operation='generate')

    messages = _build_messages(prompt, system_prompt)

    try:
        if _is_tool_loop_enabled(options):
            response_text, _ = _generate_with_tool_loop(
                model,
                messages,
                options=options,
                keep_alive=keep_alive,
                operation='generate',
            )
        else:
            payload = _build_ollama_payload(model, messages, options=options, keep_alive=keep_alive, stream=False)
            response = _chat_once(payload, 'generate')
            response_text = _extract_response_text(response)

        if not response_text:
            raise_llm_error(ValueError, 'No valid response received from Ollama REST.', provider=_PROVIDER_NAME, operation='generate')

        return clean_response(response_text)
    except Exception as e:
        report_llm_error('Error generating response from Ollama REST', provider=_PROVIDER_NAME, operation='generate', cause=e)
        return ''


def generate_vision(enabled: bool, model: str, prompt: str, images=None, options=None, system_prompt: str = '', keep_alive: str = '5m') -> str:
    """Generate a vision response from Ollama REST using /api/chat with inline images."""
    if _is_unavailable(enabled):
        raise_llm_error(ImportError, 'Ollama REST is not enabled.', provider=_PROVIDER_NAME, operation='generate_vision')

    if images is None:
        raise_llm_error(ValueError, 'No images provided for vision model.', provider=_PROVIDER_NAME, operation='generate_vision')

    raw_images = _normalize_raw_images(images)

    payload: dict[str, Any] = {
        'model': model,
        'messages': _build_messages(prompt, system_prompt, raw_images=raw_images),
        'stream': False,
    }
    if keep_alive:
        payload['keep_alive'] = keep_alive

    _apply_top_level_controls(payload, options)

    built_options = _build_options(options)
    if built_options:
        payload['options'] = built_options

    try:
        response = ollama_request_json_chat(payload, timeout=_get_request_timeout())
        response_text = _extract_response_text(response)
        if not response_text:
            raise_llm_error(ValueError, 'No valid response received from Ollama REST.', provider=_PROVIDER_NAME, operation='generate_vision')
        return clean_response(response_text)
    except Exception as e:
        report_llm_error('Error generating vision response from Ollama REST', provider=_PROVIDER_NAME, operation='generate_vision', cause=e)
        return ''


def generate_stream(enabled: bool, model: str, prompt: str, options=None, system_prompt: str = '', keep_alive: str = '5m'):
    """Generate a real streaming response from Ollama REST."""
    try:
        if _is_unavailable(enabled):
            raise_llm_error(ImportError, 'Ollama REST is not enabled.', provider=_PROVIDER_NAME, operation='generate_stream')

        model_list = get_models(enabled)
        if model not in model_list:
            raise_llm_error(ValueError, f"Model '{model}' is not available. Available models: {model_list}", provider=_PROVIDER_NAME, operation='generate_stream')

        messages = _build_messages(prompt, system_prompt)

        if _is_tool_loop_enabled(options):
            yield {'event': 'tool_loop.start', 'done': False}
            final_text, tool_events = _generate_with_tool_loop(
                model,
                messages,
                options=options,
                keep_alive=keep_alive,
                operation='generate_stream',
            )
            for event_payload in tool_events:
                yield event_payload

            if final_text:
                yield {'chunk': final_text, 'done': False}

            yield {'event': 'tool_loop.end', 'done': True, 'full_response': clean_response(final_text)}
            return

        payload = _build_ollama_payload(model, messages, options=options, keep_alive=keep_alive, stream=False)
        for chunk_data in _stream_chat_response(payload, 'generate_stream'):
            yield chunk_data
    except Exception as e:
        report_llm_error('Error in Ollama REST streaming', provider=_PROVIDER_NAME, operation='generate_stream', cause=e)
        yield {'chunk': '', 'done': True, 'full_response': '', 'error': stringify_llm_error(e)}


def generate_vision_stream(enabled: bool, model: str, prompt: str, images=None, options=None, system_prompt: str = '', keep_alive: str = '5m'):
    """Generate a real streaming vision response from Ollama REST."""
    try:
        if _is_unavailable(enabled):
            raise_llm_error(ImportError, 'Ollama REST is not enabled.', provider=_PROVIDER_NAME, operation='generate_vision_stream')

        if images is None:
            raise_llm_error(ValueError, 'No images provided for vision model.', provider=_PROVIDER_NAME, operation='generate_vision_stream')

        model_list = get_vision_models(enabled)
        if model not in model_list:
            raise_llm_error(ValueError, f"Model '{model}' is not available. Available models: {model_list}", provider=_PROVIDER_NAME, operation='generate_vision_stream')

        payload: dict[str, Any] = {
            'model': model,
            'messages': _build_messages(prompt, system_prompt, raw_images=_normalize_raw_images(images)),
        }
        if keep_alive:
            payload['keep_alive'] = keep_alive

        _apply_top_level_controls(payload, options)

        built_options = _build_options(options)
        if built_options:
            payload['options'] = built_options

        for chunk_data in _stream_chat_response(payload, 'generate_vision_stream'):
            yield chunk_data
    except Exception as e:
        report_llm_error('Error in Ollama REST vision streaming', provider=_PROVIDER_NAME, operation='generate_vision_stream', cause=e)
        yield {'chunk': '', 'done': True, 'full_response': '', 'error': stringify_llm_error(e)}

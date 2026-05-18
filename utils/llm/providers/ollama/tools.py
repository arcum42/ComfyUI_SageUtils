"""Ollama local tool handling and tool loop helpers."""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Optional

import folder_paths

from ....path_manager import path_manager
from ....logger import get_logger
from ...common import clean_response
from ...errors import raise_llm_error, stringify_llm_error

logger = get_logger('llm.providers.ollama_rest')

_PROVIDER_NAME = 'ollama_rest'


def is_tool_loop_enabled(options: Optional[dict[str, Any]]) -> bool:
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


def generate_with_tool_loop(
    model: str,
    messages: list[dict[str, Any]],
    *,
    options: Optional[dict[str, Any]] = None,
    keep_alive: str = '5m',
    operation: str = 'generate',
    max_iterations: int = 4,
    build_payload: Callable[[str, list[dict[str, Any]], Optional[dict[str, Any]], str, bool], dict[str, Any]],
    chat_once: Callable[[dict[str, Any], str], dict[str, Any]],
    extract_response_text: Callable[[Any], str],
) -> tuple[str, list[dict[str, Any]]]:
    working_messages = list(messages)
    last_response_text = ''
    tool_events: list[dict[str, Any]] = []
    allowed_tool_names = _extract_allowed_tool_names(options)

    for _ in range(max_iterations):
        payload = build_payload(model, working_messages, options, keep_alive, False)
        response = chat_once(payload, operation)
        message = response.get('message') if isinstance(response.get('message'), dict) else {}
        response_text = extract_response_text(response)
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

    logger.warning('Tool loop hit maximum iterations (%s)', max_iterations)
    return clean_response(last_response_text), tool_events

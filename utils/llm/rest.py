"""Shared REST helpers for LLM providers."""

import base64
import binascii
import json
from contextlib import contextmanager
from typing import Any, Dict, Generator, Iterator, Optional
from urllib.parse import urlparse
from urllib import error as urllib_error
from urllib import request as urllib_request

def normalize_base_url(base_url: str, default_url: str) -> str:
    """Return a normalized base URL with no trailing slash."""
    value = (base_url or '').strip() or default_url
    return value.rstrip('/')


def with_bearer_auth(headers: Dict[str, str], token: str) -> Dict[str, str]:
    """Return headers with optional bearer auth token."""
    auth_token = (token or '').strip()
    if not auth_token:
        return headers

    merged = headers.copy()
    merged['Authorization'] = f'Bearer {auth_token}'
    return merged


def request_json(
    method: str,
    base_url: str,
    path: str,
    payload: Optional[dict[str, Any]] = None,
    headers: Optional[dict[str, str]] = None,
    timeout: float = 300.0,
) -> Any:
    """Perform an HTTP JSON request and return decoded JSON response."""
    url = f"{base_url.rstrip('/')}/{path.lstrip('/')}"
    body = None
    if payload is not None:
        body = json.dumps(payload).encode('utf-8')

    request_headers = {'Content-Type': 'application/json'}
    if headers:
        request_headers.update(headers)

    req = urllib_request.Request(url=url, data=body, method=method.upper(), headers=request_headers)

    try:
        with urllib_request.urlopen(req, timeout=timeout) as response:
            raw = response.read().decode('utf-8')
            return json.loads(raw) if raw else {}
    except urllib_error.HTTPError as e:
        detail = ''
        try:
            detail_bytes = e.read()
            detail = detail_bytes.decode('utf-8', errors='replace') if detail_bytes else ''
        except Exception:
            detail = ''

        message = f'HTTP {e.code} while calling {url}'
        if detail:
            message = f'{message}: {detail}'
        raise RuntimeError(message) from e
    except urllib_error.URLError as e:
        raise RuntimeError(f'Failed to reach {url}: {e.reason}') from e


@contextmanager
def request_stream(
    method: str,
    base_url: str,
    path: str,
    payload: Optional[dict[str, Any]] = None,
    headers: Optional[dict[str, str]] = None,
    timeout: float = 30.0,
) -> Iterator[Any]:
    """Perform an HTTP request and yield an open response handle for streaming."""
    url = f"{base_url.rstrip('/')}/{path.lstrip('/')}"
    body = None
    if payload is not None:
        body = json.dumps(payload).encode('utf-8')

    request_headers = {'Content-Type': 'application/json'}
    if headers:
        request_headers.update(headers)

    req = urllib_request.Request(url=url, data=body, method=method.upper(), headers=request_headers)

    try:
        with urllib_request.urlopen(req, timeout=timeout) as response:
            yield response
    except urllib_error.HTTPError as e:
        detail = ''
        try:
            detail_bytes = e.read()
            detail = detail_bytes.decode('utf-8', errors='replace') if detail_bytes else ''
        except Exception:
            detail = ''

        message = f'HTTP {e.code} while calling {url}'
        if detail:
            message = f'{message}: {detail}'
        raise RuntimeError(message) from e
    except urllib_error.URLError as e:
        raise RuntimeError(f'Failed to reach {url}: {e.reason}') from e


def iter_sse_events(response: Any) -> Generator[dict[str, Any], None, None]:
    """Parse a server-sent event response into ordered event dictionaries."""
    data_lines: list[str] = []
    event_name = 'message'

    for raw_line in response:
        line = raw_line.decode('utf-8', errors='replace').rstrip('\r\n')
        if not line:
            if not data_lines:
                event_name = 'message'
                continue

            data_text = '\n'.join(data_lines)
            try:
                payload = json.loads(data_text) if data_text else {}
            except json.JSONDecodeError:
                payload = {'raw': data_text}

            yield {
                'event': event_name,
                'data': payload,
            }
            data_lines = []
            event_name = 'message'
            continue

        if line.startswith(':'):
            continue

        field, _, value = line.partition(':')
        if value.startswith(' '):
            value = value[1:]

        if field == 'event':
            event_name = value or 'message'
        elif field == 'data':
            data_lines.append(value)

    if data_lines:
        data_text = '\n'.join(data_lines)
        try:
            payload = json.loads(data_text) if data_text else {}
        except json.JSONDecodeError:
            payload = {'raw': data_text}

        yield {
            'event': event_name,
            'data': payload,
        }


def iter_json_lines(response: Any) -> Generator[dict[str, Any], None, None]:
    """Parse newline-delimited JSON objects from a streaming response."""
    buffer = ''

    for raw_line in response:
        chunk = raw_line.decode('utf-8', errors='replace')
        if not chunk:
            continue
        buffer += chunk

        while '\n' in buffer:
            line, buffer = buffer.split('\n', 1)
            line = line.strip()
            if not line:
                continue
            yield json.loads(line)

    tail = buffer.strip()
    if tail:
        yield json.loads(tail)


def normalize_image_data_url(image_data: str, default_mime: str = 'image/png') -> str:
    """Normalize an image payload to a data URL string.

    Accepts:
    - data URLs containing base64 image content
    - raw base64 image content
    - remote http/https image URLs
    """
    image_value = _coerce_image_value(image_data)
    if _is_http_url(image_value):
        return image_value

    if image_value.startswith('data:'):
        header, payload = _split_data_url(image_value)
        if ';base64' not in header.lower():
            raise ValueError('Image data URL must include ;base64 payload.')
        normalized_payload = _validate_base64_payload(payload)
        return f'{header},{normalized_payload}'

    normalized_payload = _validate_base64_payload(image_value)
    return f'data:{default_mime};base64,{normalized_payload}'


def normalize_raw_image_base64(image_data: str) -> str:
    """Normalize an image payload to raw base64 bytes for providers like Ollama."""
    image_value = _coerce_image_value(image_data)
    if _is_http_url(image_value):
        raise ValueError('Remote image URLs are not supported for this provider; provide base64 image data instead.')

    if image_value.startswith('data:'):
        header, payload = _split_data_url(image_value)
        if ';base64' not in header.lower():
            raise ValueError('Image data URL must include ;base64 payload.')
        return _validate_base64_payload(payload)

    return _validate_base64_payload(image_value)


def _coerce_image_value(image_data: str) -> str:
    image_value = str(image_data or '').strip()
    if not image_value:
        raise ValueError('Image payload is empty.')

    lowered = image_value.lower()
    if lowered.startswith('tensor(') or lowered.startswith('torch.tensor('):
        raise ValueError('Image payload appears to be a tensor object; expected base64 image bytes or a data URL.')

    return image_value


def _split_data_url(image_value: str) -> tuple[str, str]:
    if ',' not in image_value:
        raise ValueError('Invalid image data URL: missing comma separator.')

    header, payload = image_value.split(',', 1)
    if not header.lower().startswith('data:image/'):
        raise ValueError('Invalid image data URL: expected data:image/* MIME type.')
    if not payload.strip():
        raise ValueError('Invalid image data URL: missing base64 payload.')
    return header, payload.strip()


def _validate_base64_payload(payload: str) -> str:
    compact = ''.join(payload.split())
    if not compact:
        raise ValueError('Image payload is empty after whitespace normalization.')
    try:
        base64.b64decode(compact, validate=True)
    except (binascii.Error, ValueError) as e:
        raise ValueError('Image payload is not valid base64 data.') from e
    return compact


def _is_http_url(value: str) -> bool:
    parsed = urlparse(value)
    if parsed.scheme not in ('http', 'https'):
        return False
    return bool(parsed.netloc)


def iter_text_chunks(text: str, chunk_size: int = 5) -> Generator[str, None, None]:
    """Yield fixed-size chunks for simulated streaming."""
    if chunk_size <= 0:
        chunk_size = 5
    for i in range(0, len(text), chunk_size):
        yield text[i:i + chunk_size]

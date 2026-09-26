# Helper functions for Civitai API interactions

import datetime
import copy
import email.utils
import requests
import time
import threading
from datetime import timezone
from typing import Any
from requests.exceptions import HTTPError

from .model_cache import cache
from .logger import get_logger

logger = get_logger('helpers.civitai')

CIVITAI_API_BASE = "https://civitai.com/api/v1"
CIVITAI_REQUEST_TIMEOUT_SECONDS = 30
CIVITAI_MAX_RETRIES = 3
CIVITAI_BACKOFF_SECONDS = 1
CIVITAI_CACHE_TTL_SECONDS = 300
CIVITAI_CACHE_MAX_ENTRIES = 512
_civitai_response_cache: dict[str, tuple[float, Any]] = {}
_request_gate_lock = threading.Lock()
_request_interval_seconds = 0.0
_last_request_at = None


def configure_civitai_request_interval(delay_ms):
    """Configure the minimum interval between uncached Civitai requests."""
    global _request_interval_seconds
    _request_interval_seconds = max(0.0, float(delay_ms) / 1000)


def _wait_for_request_gate():
    """Wait for the configured interval, accounting for elapsed work time."""
    global _last_request_at
    with _request_gate_lock:
        now = time.monotonic()
        if _last_request_at is not None:
            remaining = _request_interval_seconds - (now - _last_request_at)
            if remaining > 0:
                time.sleep(remaining)
        _last_request_at = time.monotonic()


def _cached_response(cache_key):
    cached = _civitai_response_cache.get(cache_key)
    if cached is None:
        return None
    expires_at, payload = cached
    if expires_at <= time.monotonic():
        _civitai_response_cache.pop(cache_key, None)
        return None
    return copy.deepcopy(payload)


def _store_cached_response(cache_key, payload):
    if len(_civitai_response_cache) >= CIVITAI_CACHE_MAX_ENTRIES:
        oldest_key = min(_civitai_response_cache, key=lambda key: _civitai_response_cache[key][0])
        _civitai_response_cache.pop(oldest_key, None)
    _civitai_response_cache[cache_key] = (
        time.monotonic() + CIVITAI_CACHE_TTL_SECONDS,
        copy.deepcopy(payload),
    )


def clear_civitai_response_cache():
    """Clear the process-local Civitai response cache."""
    _civitai_response_cache.clear()


def _retry_delay(response, attempt):
    """Return a bounded retry delay from Retry-After or exponential backoff."""
    retry_after = response.headers.get('Retry-After') if response is not None else None
    if retry_after:
        try:
            return max(0, float(retry_after))
        except ValueError:
            try:
                retry_at = email.utils.parsedate_to_datetime(retry_after)
                if retry_at.tzinfo is None:
                    retry_at = retry_at.replace(tzinfo=timezone.utc)
                return max(0, retry_at.timestamp() - time.time())
            except (TypeError, ValueError, OverflowError):
                pass
    return CIVITAI_BACKOFF_SECONDS * (2 ** attempt)


def _is_retryable_status(status):
    return status in {429, 500, 502, 503, 504}

def _get_civitai_json(url) -> dict[str, Any]:
    """Helper to fetch JSON from Civitai API with error handling."""
    for attempt in range(CIVITAI_MAX_RETRIES + 1):
        r_json = None
        try:
            _wait_for_request_gate()
            response = requests.get(url, timeout=CIVITAI_REQUEST_TIMEOUT_SECONDS)
            response_json = response.json()
            r_json = response_json if isinstance(response_json, dict) else {}
            status = getattr(response, 'status_code', 200)
            if status >= 400:
                if _is_retryable_status(status) and attempt < CIVITAI_MAX_RETRIES:
                    time.sleep(_retry_delay(response, attempt))
                    continue
                response.raise_for_status()
            logger.debug(f"Retrieved JSON from {url}")
            return r_json
        except HTTPError as http_err:
            response = http_err.response
            logger.error(f"HTTP error occurred: {http_err}")
            return {
                "error": f"HTTP error occurred: {http_err}",
                "civitai_error": (r_json or {}).get("error", ""),
                "http_status": response.status_code if response else None,
            }
        except requests.RequestException as err:
            if attempt < CIVITAI_MAX_RETRIES:
                time.sleep(_retry_delay(None, attempt))
                continue
            logger.error(f"Other error occurred: {err}")
            return {"error": f"Other error occurred: {err}", "civitai_error": ""}
        except Exception as err:
            logger.error(f"Other error occurred: {err}")
            return {"error": f"Other error occurred: {err}", "civitai_error": ""}

    return {"error": "Civitai request retry loop exhausted", "civitai_error": ""}

def get_civitai_model_version_json_by_hash(hash_) -> dict[str, Any]:
    """Get model version JSON by hash from Civitai API."""
    cache_key = f'version-by-hash:{str(hash_).upper()}'
    cached = _cached_response(cache_key)
    if cached is not None:
        return cached
    url = f"{CIVITAI_API_BASE}/model-versions/by-hash/{hash_}"
    result = _get_civitai_json(url)
    if 'error' not in result:
        _store_cached_response(cache_key, result)
    return result


def get_civitai_model_versions_json_by_hashes(hashes) -> list[dict[str, Any]] | dict[str, Any]:
    """Look up up to 100 full SHA-256 hashes in one public request."""
    if not hashes or len(hashes) > 100:
        raise ValueError('Civitai bulk lookup requires 1 to 100 hashes')
    if any(not isinstance(value, str) or len(value) != 64 for value in hashes):
        raise ValueError('Civitai bulk lookup requires full 64-character SHA-256 hashes')

    normalized_hashes = tuple(sorted(value.upper() for value in hashes))
    cache_key = f'versions-by-hash:{normalized_hashes}'
    cached = _cached_response(cache_key)
    if cached is not None:
        return cached

    url = f"{CIVITAI_API_BASE}/model-versions/by-hash"
    for attempt in range(CIVITAI_MAX_RETRIES + 1):
        try:
            _wait_for_request_gate()
            response = requests.post(
                url,
                json=list(normalized_hashes),
                timeout=CIVITAI_REQUEST_TIMEOUT_SECONDS,
            )
            response_json = response.json()
            if not isinstance(response_json, list) or not all(isinstance(item, dict) for item in response_json):
                return {"error": "Civitai bulk response was not a list of objects"}
            status = getattr(response, 'status_code', 200)
            if status >= 400:
                if _is_retryable_status(status) and attempt < CIVITAI_MAX_RETRIES:
                    time.sleep(_retry_delay(response, attempt))
                    continue
                response.raise_for_status()
            _store_cached_response(cache_key, response_json)
            return response_json
        except HTTPError as http_err:
            response = http_err.response
            logger.error(f"HTTP error occurred: {http_err}")
            return {
                "error": f"HTTP error occurred: {http_err}",
                "http_status": response.status_code if response else None,
            }
        except requests.RequestException as err:
            if attempt < CIVITAI_MAX_RETRIES:
                time.sleep(_retry_delay(None, attempt))
                continue
            logger.error(f"Other error occurred: {err}")
            return {"error": f"Other error occurred: {err}"}
        except Exception as err:
            logger.error(f"Other error occurred: {err}")
            return {"error": f"Other error occurred: {err}"}

    return {"error": "Civitai bulk request retry loop exhausted"}

def get_civitai_model_version_json_by_id(the_id) -> dict[str, Any]:
    """Get model version JSON by ID from Civitai API."""
    url = f"{CIVITAI_API_BASE}/model-versions/{the_id}"
    return _get_civitai_json(url)

def get_civitai_model_json(model_id) -> dict[str, Any]:
    """Get model JSON by model ID from Civitai API."""
    url = f"{CIVITAI_API_BASE}/models/{model_id}"
    return _get_civitai_json(url)

def get_model_dict(lora_path, weight=None):
    """Get model info from cache by path."""
    ret = {}
    try:
        info = cache.by_path(lora_path)
        ret["type"] = info["model"]["type"]
        if ret["type"] == "LORA" and weight is not None:
            ret["weight"] = weight
        ret["modelVersionId"] = info["id"]
        ret["modelName"] = info["model"]["name"]
        ret["modelVersionName"] = info["name"]
    except Exception:
        ret = {}
    return ret

def get_latest_model_version(model_id):
    """Get the latest published and public model version ID for a model."""
    json_data = get_civitai_model_json(model_id)
    if 'error' in json_data:
        logger.error(f"Error retrieving model versions: {json_data['error']}")
        return None

    latest_model = None
    model_date = None
    for model in json_data.get("modelVersions", []):
        if isinstance(model, dict):
            if model.get('status') == "Published" and model.get('availability') == "Public":
                created_at_str = model.get('createdAt')
                if created_at_str:
                    try:
                        created_at = datetime.datetime.fromisoformat(created_at_str)
                        if model_date is None or created_at > model_date:
                            model_date = created_at
                            latest_model = model.get("id")
                    except Exception:
                        continue

    return latest_model

def pull_lora_image_urls(hash_, nsfw):
    """Get image URLs for a LoRA model version, filtering by NSFW level."""
    json_data = get_civitai_model_version_json_by_hash(hash_)
    img_list = []
    for pic in json_data.get('images', []):
        if isinstance(pic, dict):
            nsfw_level = pic.get('nsfwLevel', 0)
            url = pic.get('url')
            if url:
                if nsfw_level > 1:
                    if nsfw:
                        img_list.append(url)
                else:
                    img_list.append(url)
    return img_list

def civitai_sampler_name(sampler_name, scheduler_name):
    """Convert ComfyUI sampler/scheduler names to Civitai equivalents."""
    comfy_to_auto = {
        'ddim': 'DDIM',
        'dpm_2': 'DPM2',
        'dpm_2_ancestral': 'DPM2 a',
        'dpmpp_2s_ancestral': 'DPM++ 2S a',
        'dpmpp_2m': 'DPM++ 2M',
        'dpmpp_sde': 'DPM++ SDE',
        'dpmpp_2m_sde': 'DPM++ 2M SDE',
        'dpmpp_2m_sde_gpu': 'DPM++ 2M SDE',
        'dpmpp_3m_sde': 'DPM++ 3M SDE',
        'dpmpp_3m_sde_gpu': 'DPM++ 3M SDE',
        'dpm_fast': 'DPM fast',
        'dpm_adaptive': 'DPM adaptive',
        'euler_ancestral': 'Euler a',
        'euler': 'Euler',
        'heun': 'Heun',
        'lcm': 'LCM',
        'lms': 'LMS',
        'plms': 'PLMS',
        'uni_pc': 'UniPC',
        'uni_pc_bh2': 'UniPC'
    }
    result = comfy_to_auto.get(sampler_name)
    if not isinstance(result, str):
        result = str(sampler_name) if sampler_name is not None else ""

    if scheduler_name == "karras":
        result += " Karras"
    elif scheduler_name == "exponential":
        result += " Exponential"

    return result
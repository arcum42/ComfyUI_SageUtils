# Helper functions for Civitai API interactions

import datetime
import requests
import logging
from requests.exceptions import HTTPError

from .model_cache import cache

def _get_civitai_json(url):
    """Helper to fetch JSON from Civitai API with error handling."""
    try:
        r = requests.get(url)
        r.raise_for_status()
    except HTTPError as http_err:
        logging.error(f"HTTP error occurred: {http_err}")
        return {"error": f"HTTP error occurred: {http_err}"}
    except Exception as err:
        logging.error(f"Other error occurred: {err}")
        return {"error": f"Other error occurred: {err}"}
    else:
        logging.debug(f"Retrieved JSON from {url}")
        return r.json()

def get_civitai_model_version_json_by_hash(hash_):
    """Get model version JSON by hash from Civitai API."""
    url = f"https://civitai.com/api/v1/model-versions/by-hash/{hash_}"
    return _get_civitai_json(url)

def get_civitai_model_version_json_by_id(the_id):
    """Get model version JSON by ID from Civitai API."""
    url = f"https://civitai.com/api/v1/model-versions/{the_id}"
    return _get_civitai_json(url)

def get_civitai_model_json(model_id):
    """Get model JSON by model ID from Civitai API."""
    url = f"https://civitai.com/api/v1/models/{model_id}"
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
        logging.error(f"Error retrieving model versions: {json_data['error']}")
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
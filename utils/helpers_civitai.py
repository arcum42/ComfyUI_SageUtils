# Helper functions for Civitai API interactions

import datetime
import requests
from urllib.error import HTTPError

from .model_cache import cache

def get_civitai_model_version_json_by_hash(hash):
    try:
        r = requests.get("https://civitai.com/api/v1/model-versions/by-hash/" + str(hash))
        r.raise_for_status()
    except HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
        return {"error": "HTTP error occurred: " + str(http_err)}
    except Exception as err:
        print(f"Other error occurred: {err}")
        return {"error": "Other error occurred: " + str(err)}
    else:
        print("Retrieved model version json from civitai by hash.")
        return r.json()

    return r.json()

def get_civitai_model_version_json_by_id(the_id):
    try:
        r = requests.get("https://civitai.com/api/v1/model-versions/" + str(the_id))
        r.raise_for_status()
    except HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
        return {"error": "HTTP error occurred: " + str(http_err)}
    except Exception as err:
        print(f"Other error occurred: {err}")
        return {"error": "Other error occurred: " + str(err)}
    else:
        print("Retrieved model version json from civitai by version id.")
        return r.json()

    return r.json()

def get_civitai_model_json(modelId):
    try:
        r = requests.get("https://civitai.com/api/v1/models/" + str(modelId))
        r.raise_for_status()
    except HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
        return {"error": "HTTP error occurred: " + str(http_err)}
    except Exception as err:
        print(f"Other error occurred: {err}")
        return {"error": "Other error occurred: " + str(err)}
    else:
        print("Retrieved model json from civitai by model id.")
        return r.json()

    return r.json()

def get_model_info(lora_path, weight = None):
    ret = {}
    try:
        ret["type"] = cache.by_path(lora_path)["model"]["type"]
        if (ret["type"] == "LORA") and (weight is not None):
            ret["weight"] = weight
        ret["modelVersionId"] = cache.by_path(lora_path)["id"]
        ret["modelName"] = cache.by_path(lora_path)["model"]["name"]
        ret["modelVersionName"] = cache.by_path(lora_path)["name"]
    except:
        ret = {}
    return ret

def get_latest_model_version(modelId):
    json = get_civitai_model_json(modelId)
    if 'error' in json:
        print(f"Error retrieving model versions: {json['error']}")
        return None

    latest_model = None
    model_date = None
    for model in json["modelVersions"]:
        if model_date is None or (datetime.datetime.fromisoformat(model['createdAt']) > model_date and model['status'] == "Published" and model['availability'] == "Public"):
            model_date = datetime.datetime.fromisoformat(model['createdAt'])
            latest_model = model["id"]

    return latest_model

def pull_lora_image_urls(hash, nsfw):
    json = get_civitai_model_version_json_by_hash(hash)
    img_list = []
    for pic in json['images']:
        if pic['nsfwLevel'] > 1:
            if nsfw == True:
                img_list.append(pic['url'])
        else:
            img_list.append(pic['url'])
    return img_list

def civitai_sampler_name(sampler_name, scheduler_name):
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
    result = comfy_to_auto.get(sampler_name, sampler_name)

    if (scheduler_name == "karras"):
        result += " Karras"
    elif (scheduler_name == "exponential"):
        result += " Exponential"

    return result
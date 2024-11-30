#Utility functions for use in the nodes.

import pathlib
import hashlib
import requests
import folder_paths
import json
import comfy.utils
import time

import ComfyUI_SageUtils.sage_cache as cache

def get_civitai_json(hash):
    try:
        r = requests.get("https://civitai.com/api/v1/model-versions/by-hash/" + hash)
        r.raise_for_status()
    except HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
        return {"error": "HTTP error occurred: " + http_err}
    except Exception as err:
        print(f"Other error occurred: {err}")
        return {"error": "Other error occurred: " + err}
    else:
        print("Success!")
        return r.json()

    return r.json()

def get_file_sha256(path):
    print(f"Calculating hash for {path}")
    m = hashlib.sha256()
    with open(path, 'rb') as f:
        m.update(f.read())
    result = str(m.digest().hex()[:10])
    print(f"Got hash {result}")
    return result

def pull_metadata(file_path):
    cache.load_cache()
    print(f"Pull metadata for {file_path}.")
    hash = ""

    if file_path in cache.cache_data:
        if 'hash' in cache.cache_data[file_path]:
            hash = cache.cache_data[file_path]["hash"]
            time.sleep(3)
    
    if hash == "":
        cache.cache_data[file_path] = {}
        cache.cache_data[file_path]["hash"] = get_file_sha256(file_path)
        hash = cache.cache_data[file_path]["hash"]
    
    try:
        json = get_civitai_json(hash)
        if 'error' in json:
            print("Error: " + str(json["error"]))
            if 'model' in cache.cache_data[file_path]:
                if 'civitai' not in cache.cache_data[file_path]:
                    cache.cache_data[file_path]['civitai'] = "False"
            else:
                cache.cache_data[file_path]['civitai'] = "False"
        else:
            cache.cache_data[file_path]['civitai'] = "True"
            cache.cache_data[file_path]["model"] = json["model"]
            cache.cache_data[file_path]["name"] = json["name"]
            cache.cache_data[file_path]["baseModel"] = json["baseModel"]
            cache.cache_data[file_path]["id"] = json["id"]
            cache.cache_data[file_path]["modelId"] = json["modelId"]
            cache.cache_data[file_path]["trainedWords"] = json["trainedWords"]
            cache.cache_data[file_path]["downloadUrl"] = json["downloadUrl"]
            print("Successfully pulled metadata.")

    except:
        print(f"Failed to pull metadata for {file_path} with hash {hash}")
        if 'civitai' not in cache.cache_data[file_path]:
            cache.cache_data[file_path]['civitai'] = "False"

    cache.save_cache()

def lora_to_string(lora_name, model_weight, clip_weight):
    lora_string = ' <lora:' + str(pathlib.Path(lora_name).name) + ":" + str(model_weight) +  ">" #  + ":" + str(clip_weight)
        
    return lora_string

def get_lora_hash(lora_name):
    lora_path = folder_paths.get_full_path_or_raise("loras", lora_name)
    pull_metadata(lora_path)

    return cache.cache_data[lora_path]["hash"]

def pull_all_loras(the_path):
    the_paths = the_path[0]
    ret = []
    for dir in the_paths:
        result = list(p.resolve() for p in pathlib.Path(dir).glob("**/*") if p.suffix in {".safetensors", ".ckpt"})
        ret.extend(result)

    ret = list(set(ret))
    print(f"There are {len(ret)} files.")
    pbar = comfy.utils.ProgressBar(len(ret))
    for the_model in ret:
        pbar.update(1)
        pull_metadata(str(the_model))
    
    return ret

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
    result = ""
    try:
        result = comfy_to_auto[sampler_name]
    except:
        result = f"{sampler_name}"
    
    if (scheduler_name == "karras"):
        result += " Karras"
    elif (scheduler_name == "exponential"):
        result += " Exponential"
    
    return result

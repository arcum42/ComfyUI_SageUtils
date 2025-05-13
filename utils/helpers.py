#Utility functions for use in the nodes.

import pathlib
import hashlib
import requests
import time
import datetime
import numpy as np
import torch
import json
from PIL import Image, ImageOps

import folder_paths
import comfy.utils

from . import cache
from urllib.error import HTTPError

def name_from_path(path):
    return pathlib.Path(path).name

def get_civitai_model_version_json_by_hash(hash):
    try:
        r = requests.get("https://civitai.com/api/v1/model-versions/by-hash/" + str(hash))
        r.raise_for_status()
    except HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
        return {"error": "HTTP error occurred: " + http_err}
    except Exception as err:
        print(f"Other error occurred: {err}")
        return {"error": "Other error occurred: " + str(err)}
    else:
        print("Retrieved json from civitai.")
        return r.json()

    return r.json()

def get_civitai_model_version_json_by_id(the_id):
    try:
        r = requests.get("https://civitai.com/api/v1/model-versions/" + str(the_id))
        r.raise_for_status()
    except HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
        return {"error": "HTTP error occurred: " + http_err}
    except Exception as err:
        print(f"Other error occurred: {err}")
        return {"error": "Other error occurred: " + str(err)}
    else:
        print("Retrieved json from civitai.")
        return r.json()

    return r.json()

def get_civitai_model_json(modelId):
    try:
        r = requests.get("https://civitai.com/api/v1/models/" + str(modelId))
        r.raise_for_status()
    except HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
        return {"error": "HTTP error occurred: " + http_err}
    except Exception as err:
        print(f"Other error occurred: {err}")
        return {"error": "Other error occurred: " + err}
    else:
        print("Retrieved json from civitai.")
        return r.json()

    return r.json()

def get_file_sha256(path):
    print(f"Calculating hash for {path}")
    m = hashlib.sha256()
    
    with open(path, 'rb') as f:
        m.update(f.read())

    print(f"Got full hash {str(m.digest().hex())}")
    result = str(m.digest().hex()[:10])
    print(f"Got hash {result}")
    return result

def pull_metadata(file_path, timestamp = True):
    cache.load()
    
    print(f"Pull metadata for {file_path}.")
    hash = cache.data.get(file_path, {}).get("hash", "")

    if not hash:
        cache.data[file_path] = {"hash": get_file_sha256(file_path)}
        hash = cache.data[file_path]["hash"]
    else:
        time.sleep(2)

    pull_json = True
    check_recent = False
    days_old = 0
    file_cache = cache.data.get(file_path, {})
        
    if not check_recent and 'lastUsed' in file_cache and 'civitai' in file_cache and file_cache['civitai'] == "True":
        last_used = datetime.datetime.fromisoformat(file_cache['lastUsed'])
        if (datetime.datetime.now() - last_used).days == days_old:
            print(f"Pulled earlier today. No pull needed. Update timestamp = {timestamp}")
            pull_json = False

    if pull_json:
        print(f"Currently pulling metadata for {file_path}.")
        json = get_civitai_model_version_json_by_hash(hash)

        if 'error' in json:
            print(f"Failed. Spot checking hash.")
            new_hash = get_file_sha256(file_path)

            if new_hash != hash:
                print(f"Hash mismatch. Pulling new hash.")
                cache.data[file_path]['hash'] = new_hash
                json = get_civitai_model_version_json_by_hash(new_hash)

            if 'error' in json and 'modelId' in file_cache:
                print(f"Using cached model id {file_cache['id']}")
                json = get_civitai_model_version_json_by_id(file_cache['id'])
            else:
                print(f"No cached model id.")

            if 'error' in json:
                print(f"Error: {json['error']}")
                print(f"Unable to find on civitai.")
                file_cache['civitai'] = file_cache.get('model', "False")
        else:
            the_files = json.get("files", [])
            
            hashes = {}
            if len(the_files) > 0:
                hashes = the_files[0].get("hashes", {})

            file_cache.update({
                'civitai': "True",
                'model': json.get("model", {}),
                'name': json.get("name", ""),
                'baseModel': json.get("baseModel", ""),
                'id': json.get("id", ""),
                'modelId': json.get("modelId", ""),
                'trainedWords': json.get("trainedWords", []),
                'downloadUrl': json.get("downloadUrl", ""),
                'hashes': hashes
            })
            print("Successfully pulled metadata.")

    if timestamp:
        print("Updating timestamp.")
        file_cache['lastUsed'] = datetime.datetime.now().isoformat()

    cache.data[file_path] = file_cache
    cache.save()

def lora_to_string(lora_name, model_weight, clip_weight):
    lora_string = ' <lora:' + str(pathlib.Path(lora_name).name) + ":" + str(model_weight) +  ">" #  + ":" + str(clip_weight)
        
    return lora_string

def lora_to_prompt(lora_stack = None):
    lora_info = ''
    if lora_stack is None:
        return ""
    else:
        for lora in lora_stack:
            lora_info += lora_to_string(lora[0], lora[1], lora[2])
    return lora_info

def get_lora_hash(lora_name):
    lora_path = folder_paths.get_full_path_or_raise("loras", lora_name)
    pull_metadata(lora_path)

    return cache.data[lora_path]["hash"]

def get_model_info(lora_path, weight = None):
    ret = {}
    try:
        ret["type"] = cache.data[lora_path]["model"]["type"]
        if (ret["type"] == "LORA") and (weight is not None):
            ret["weight"] = weight
        ret["modelVersionId"] = cache.data[lora_path]["id"]
        ret["modelName"] = cache.data[lora_path]["model"]["name"]
        ret["modelVersionName"] = cache.data[lora_path]["name"]
    except:
        ret = {}
    return ret

def get_latest_model_version(modelId):
    json = get_civitai_model_json(modelId)
    if 'error' in json:
        return json['error']

    latest_model = None
    model_date = None
    for model in json["modelVersions"]:
        if model_date is None or (datetime.datetime.fromisoformat(model['createdAt']) > model_date and model['status'] == "Published" and model['availability'] == "Public"):
            model_date = datetime.datetime.fromisoformat(model['createdAt'])
            latest_model = model["id"]

    return latest_model

def model_scan(the_path):
    the_paths = the_path

    print(f"the_paths: {the_paths}")

    model_list = []
    for dir in the_paths:
        print(f"dir: {dir}")
        result = list(p.resolve() for p in pathlib.Path(dir).glob("**/*") if p.suffix in {".safetensors", ".ckpt"})
        model_list.extend(result)

    model_list = list(set(model_list))
    print(f"There are {len(model_list)} files.")
    pbar = comfy.utils.ProgressBar(len(model_list))
    for the_model in model_list:
        pbar.update(1)
        pull_metadata(str(the_model))

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

def url_to_torch_image(url):
    img = Image.open(requests.get(url, stream=True).raw)
    img = ImageOps.exif_transpose(img)
    img = np.array(img.convert("RGB")).astype(np.float32) / 255.0
    return (torch.from_numpy(img)[None,])

def blank_image():
    img = Image.new('RGB', (1024, 1024))
    img = ImageOps.exif_transpose(img)
    img = np.array(img.convert("RGB")).astype(np.float32) / 255.0
    return (torch.from_numpy(img)[None,])

def get_recently_used_models(model_type):
        model_list = list()
        full_model_list = folder_paths.get_filename_list(model_type)
        for item in full_model_list:
            model_path = folder_paths.get_full_path_or_raise(model_type, item)
            if model_path not in cache.data.keys():
                continue
            
            if 'lastUsed' not in cache.data[model_path]:
                continue
            
            last = cache.data[model_path]['lastUsed']
            last_used = datetime.datetime.fromisoformat(last)
            #print(f"{model_path} - last: {last} last_used: {last_used}")
            if (datetime.datetime.now() - last_used).days <= 7:
                model_list.append(item)
        return model_list

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

def clean_keywords(keywords):
    keywords = list(set(keywords))
    keywords = [x for x in keywords if x != '']
    keywords = [x for x in keywords if x != None]
    keywords = [x for x in keywords if x != ' ']
    
    ret = ' '.join(", ".join(keywords).split('\n'))
    return ret

def clean_text(text):
    ret_list = [x for x in text.split(" ") if x.strip()]
    ret = " ".join(ret_list)

    ret_list = [x for x in ret.split(",") if x.strip()]
    ret = ", ".join([x.strip(" ") for x in ret_list])

    ret_list = [x for x in ret.split("\n") if x.strip()]
    ret = "\n".join([x.strip(" ") for x in ret_list])
    return (ret)

def condition_text(clip, text = None):
    zero_text = text is None
    text = text or ""
    
    tokens = clip.tokenize(text)
    output = clip.encode_from_tokens(tokens, return_pooled=True, return_dict=True)
    cond = output.pop("cond")

    if zero_text:
        pooled_output = output.get("pooled_output")
        if pooled_output is not None:
            output["pooled_output"] = torch.zeros_like(pooled_output)
        return [[torch.zeros_like(cond), output]]

    return [[cond, output]]

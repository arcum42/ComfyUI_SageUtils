#Utility functions for use in the nodes.

import pathlib
import hashlib
import datetime
import torch
import json

import folder_paths
import comfy.utils

from .model_cache import cache
from .helpers_civitai import *

def name_from_path(path):
    return pathlib.Path(path).name

def get_file_sha256(path):
    print(f"Calculating hash for {path}")
    m = hashlib.sha256()
    
    with open(path, 'rb') as f:
        m.update(f.read())

    print(f"Got full hash {str(m.digest().hex())}")
    result = str(m.digest().hex()[:10])
    print(f"Got hash {result}")
    return result

def last_used(file_path):
    cache.load()

    if file_path in cache.hash:
        last_used = cache.by_path(file_path).get("lastUsed", None)
        if last_used is not None:
            return datetime.datetime.fromisoformat(last_used)
        else:
            return None
    else:
        return None

def days_since_last_used(file_path):
    was_last_used = last_used(file_path)
    if was_last_used is not None:
        now = datetime.datetime.now()
        delta = now - was_last_used
        return delta.days
    else:
        return 365

def get_file_modification_date(file_path):
    try:
        file_path = pathlib.Path(file_path)
        if file_path.exists():
            return datetime.datetime.fromtimestamp(file_path.stat().st_mtime)
        else:
            print(f"File {file_path} does not exist.")
            return datetime.datetime.now()
    except Exception as e:
        print(f"Error getting modification date for {file_path}: {e}")
        return datetime.datetime.now()

# Called *after* verifying the json pulled successfully.
# This function updates the cache with the information from the CivitAI json.
def update_cache_from_civitai_json(file_path, json_data, timestamp=True):
    the_files = json_data.get("files", [])
    hashes = {}

    if len(the_files) > 0:
        hashes = the_files[0].get("hashes", {})
    update_available = True

    if json_data.get("modelId", None) is not None:
        latest_model = get_latest_model_version(json_data["modelId"])
        if latest_model == json_data["id"]:
            update_available = False
    
    file_cache = cache.by_path(file_path)
    file_cache.update({
        'civitai': "True",
        'model': json_data.get("model", {}),
        'name': json_data.get("name", ""),
        'baseModel': json_data.get("baseModel", ""),
        'id': json_data.get("id", ""),
        'modelId': json_data.get("modelId", ""),
        'update_available': update_available,
        'trainedWords': json_data.get("trainedWords", []),
        'downloadUrl': json_data.get("downloadUrl", ""),
        'hashes': hashes
    })
    if timestamp:
        print("Updating timestamp.")
        cache.update_last_used_by_path(file_path)

    print("Successfully pulled metadata.")

def update_cache_without_civitai_json(file_path, hash, timestamp=True):
    file_cache = cache.by_path(file_path)
    print(f"Unable to find on civitai.")
    file_cache['civitai'] = file_cache.get('model', "False")
    file_cache['hash'] = hash
    cache.update_last_used_by_path(file_path)

def add_file_to_cache(file_path, hash=None):
    file_path = str(file_path)
    print(f"Adding {file_path} to cache.")
    if hash is None:
        hash = get_file_sha256(file_path)
    
    if file_path not in cache.hash:
        cache.hash[file_path] = hash
    
    if cache.info.get(hash, None) is None:
        cache.info[hash] = {
            'civitai': "False",
            'update_available': False,
            'hash': hash,
            'lastUsed': datetime.datetime.now().isoformat()
        }
    
    print(f"Adding {file_path} to cache with hash {hash}.")
    return hash
    
    
def pull_metadata(file_paths, timestamp = True, force_all = False, pbar = None):
    pull_json = True
    metadata_days_recheck = 7
    
    cache.load()
    
    if isinstance(file_paths, str):
        file_paths = [file_paths]
    
    if not file_paths:
        print("No file paths provided.")
        return
    
    for file_path in file_paths:
        force = force_all
        #print(f"Processing file: {file_path}")
        #print(f"cache.hash: {cache.hash}")
        hash = cache.hash.get(str(file_path), None)
        #print(f"Current hash: {hash}")
        if hash is None:
            print(f"Hash not found in cache for {file_path}. Adding to cache.")
            hash = add_file_to_cache(file_path)

        file_cache = cache.by_path(file_path)

        last_used_date = datetime.datetime.fromisoformat(file_cache['lastUsed']) if 'lastUsed' in file_cache else None

        modified = get_file_modification_date(file_path)
        # If file was modified after last used, force metadata pull
        if last_used_date is not None and modified is not None and modified > last_used_date:
            print(f"File was modified after last used. Pulling metadata.")
            force = True
        
        # Only skip pull if not forced and civitai is True and recently pulled
        civitai_val = str(file_cache.get('civitai', '')).lower()
        if not force and civitai_val == "true":
            if days_since_last_used(file_path) <= metadata_days_recheck:
                print(f"Pulled metadata within the last {metadata_days_recheck} days. No pull needed.")
                pull_json = False

        # If force, recalculate hash before any API call
        if force:
            print(f"Force flag is set. Recalculating hash for {file_path}.")
            new_hash = get_file_sha256(file_path)
            if new_hash != hash:
                print(f"Hash mismatch. Pulling new hash.")
                cache.hash[file_path] = new_hash
                hash = new_hash

        if pull_json or force:
            print(f"Currently pulling metadata for {file_path}.")
            json = get_civitai_model_version_json_by_hash(hash)

            if 'error' in json:
                retried = False
                # Try fallback with modelId if available
                if 'modelId' in file_cache:
                    print(f"Using cached model id {file_cache.get('id', None)}")
                    json = get_civitai_model_version_json_by_id(file_cache['id'])
                    retried = True
                else:
                    print(f"No cached model id.")

                if 'error' in json:
                    if retried:
                        print(f"Error: {json['error']}")
                    print(f"Unable to find on civitai.")
                    file_cache['civitai'] = file_cache.get('model', "False")
            
            if 'error' not in json:
                update_cache_from_civitai_json(file_path, json, timestamp=timestamp)

        if timestamp:
            print("Updating timestamp.")
            cache.update_last_used_by_path(file_path)

        cache.hash[file_path] = hash
        cache.info[hash] = file_cache
        if pbar is not None:
            pbar.update(1)
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

    return cache.hash[lora_path]

def model_scan(the_path, force = False):
    the_paths = the_path

    print(f"the_paths: {the_paths}")

    model_list = []
    for dir in the_paths:
        print(f"dir: {dir}")
        result = list(p.resolve() for p in pathlib.Path(dir).glob("**/*") if p.suffix in {".safetensors", ".ckpt"})
        model_list.extend(result)

    model_list = list(set(model_list))
    model_list = [str(x) for x in model_list]
    print(f"Scanning {len(model_list)} models for metadata.")
    pbar = comfy.utils.ProgressBar(len(model_list))
    pull_metadata(model_list, force_all=force, timestamp=False, pbar=pbar)

def get_recently_used_models(model_type):
    model_list = list()
    full_model_list = folder_paths.get_filename_list(model_type)
    for item in full_model_list:
        model_path = folder_paths.get_full_path_or_raise(model_type, item)
        if model_path not in cache.hash.keys():
            continue
        
        if 'lastUsed' not in cache.by_path(model_path):
            continue

        last = cache.by_path(model_path)['lastUsed']
        last_used = datetime.datetime.fromisoformat(last)
        #print(f"{model_path} - last: {last} last_used: {last_used}")
        if (datetime.datetime.now() - last_used).days <= 7:
            model_list.append(item)
    return model_list

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

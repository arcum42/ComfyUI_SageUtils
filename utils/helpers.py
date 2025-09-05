#Utility functions for use in the nodes.

import pathlib
import hashlib
import datetime
import torch
import logging

import folder_paths
import comfy.utils

from .model_cache import cache
from .helpers_civitai import *
from .constants import MODEL_FILE_EXTENSIONS

def str_to_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        value = value.lower()
        if value in {'true', '1', 'yes'}:
            return True
        if value in {'false', '0', 'no'}:
            return False
    raise ValueError(f"Cannot convert {value} to boolean.")

# Not currently used.
def bool_to_str(value):
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, str):
        value = value.lower()
        if value in {'true', '1', 'yes'}:
            return "true"
        if value in {'false', '0', 'no'}:
            return "false"
    raise ValueError(f"Cannot convert {value} to string representation of boolean.")

def name_from_path(path):
    return pathlib.Path(path).name

def get_path_without_base(folder_type:str, path:str) -> str:
    """Get the base path for a given folder type and path."""
    for base in folder_paths.get_folder_paths(folder_type):
        if path.startswith(base):
            path = path[len(base):].lstrip("/\\")
            break
    return path

def get_file_extension(path: str) -> str:
    """Get the file extension from a path."""
    return path.split(".")[-1] if "." in path else ""

def has_model_extension(path: str) -> bool:
    """Check if a file path has a model extension."""
    if not path:
        return False
    extension = '.' + get_file_extension(path).lower()
    return extension in {ext.lower() for ext in MODEL_FILE_EXTENSIONS}

def is_model_file(path: str) -> bool:
    """Check if a file is a valid model file based on its extension."""
    return has_model_extension(path)

def get_file_sha256(path):
    print(f"Calculating hash for {path}")
    m = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            m.update(chunk)
    full_hash = m.digest().hex()
    print(f"Got full hash {full_hash}")
    result = full_hash[:10]
    print(f"Got hash {result}")
    return result


def get_files_in_dir(input_dirs=None, extensions=None):
    if extensions is None:
        extensions = ".*"
    if input_dirs is None:
        raise ValueError("input_dirs cannot be None")

    input_files = []
    # Check if input_dirs is a tuple or a list. If not, make it a list.
    if not isinstance(input_dirs, (list, tuple)):
        input_dirs = [input_dirs]

    for dir in input_dirs:
        if dir is None or dir == "":
            continue
        if pathlib.Path(dir).exists():
            file_list = pathlib.Path(dir).rglob("*")
            for file in file_list:
                if file.exists() and not file.is_dir():
                    file_path = ""
                    if file.suffix.lower() in extensions:
                        # Get path relative to the input directory
                        try:
                            file_path = str(file.relative_to(dir))
                        except ValueError:
                            file_path = str(file)
                    input_files.append(file_path)

    input_files = sorted(set(input_files))
    return input_files

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

    latest_model = None
    if json_data.get("modelId", None) is not None:
        latest_model = get_latest_model_version(json_data["modelId"])
        if latest_model == json_data["id"] or latest_model is None:
            update_available = False
    
    if latest_model is None:
        latest_model = ""

    file_cache = cache.by_path(file_path)
    file_cache.update({
        'civitai': "True",
        'civitai_failed_count': 0,
        'model': json_data.get("model", {}),
        'name': json_data.get("name", ""),
        'baseModel': json_data.get("baseModel", ""),
        'id': json_data.get("id", ""),
        'modelId': json_data.get("modelId", ""),
        'update_available': update_available,
        'update_version_id': latest_model,
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
    file_cache['civitai'] = "False"
    file_cache['civitai_failed_count'] = file_cache.get('civitai_failed_count', 0) + 1
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
            'update_version_id': "",
            'hash': hash,
            'lastUsed': datetime.datetime.now().isoformat()
        }
    
    print(f"Adding {file_path} to cache with hash {hash}.")
    return hash

def recheck_hash(file_path, hash):
    new_hash = get_file_sha256(file_path)
    if new_hash != hash:
        print(f"Hash mismatch. Using new hash.")
        if file_path in cache.hash:
            print(f"Updating cache for {file_path} with new hash {new_hash}.")
            if new_hash not in cache.info:
                if hash in cache.info:
                    cache.info[new_hash] = cache.info[hash]
        else:
            print(f"File {file_path} not in cache. Adding with new hash {new_hash}.")
            add_file_to_cache(file_path, new_hash)
        hash = new_hash
    return hash

def update_model_timestamp(file_path):
    cache.load()
    # If the file_path isn't a list, make it a list.
    if not isinstance(file_path, (list, tuple)):
        file_path = [file_path]
    for path in file_path:
        if path in cache.hash:
            cache.update_last_used_by_path(path)
    cache.save()

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
        hash = cache.hash.get(str(file_path), None)
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
        civitai_val = False
        try:
            civitai_val = str_to_bool(file_cache.get('civitai', False))
        except:
            civitai_val = False

        if not force and civitai_val == True:
            if days_since_last_used(file_path) <= metadata_days_recheck:
                print(f"Pulled metadata within the last {metadata_days_recheck} days. No pull needed.")
                pull_json = False

        # If force, recalculate hash before any API call
        if force:
            print(f"Force flag is set. Recalculating hash for {file_path}.")
            hash = recheck_hash(file_path, hash)

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
                    file_cache['civitai'] = "False"
                    file_cache['civitai_failed_count'] = file_cache.get('civitai_failed_count', 0) + 1
                    update_cache_without_civitai_json(file_path, hash, timestamp=timestamp)
            
            if 'error' not in json:
                update_cache_from_civitai_json(file_path, json, timestamp=timestamp)
            else:
                retries = file_cache.get('civitai_failed_count', 0)
                retries += 1
                file_cache['civitai_failed_count'] = retries

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
        result = list(p.resolve() for p in pathlib.Path(dir).glob("**/*") if p.suffix in MODEL_FILE_EXTENSIONS)
        model_list.extend(result)

    model_list = list(set(model_list))
    model_list = [str(x) for x in model_list]
    print(f"Scanning {len(model_list)} models for metadata.")
    pbar = comfy.utils.ProgressBar(len(model_list))
    pull_metadata(model_list, force_all=force, pbar=pbar)

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
    keywords = set(filter(None, (x.strip() for x in keywords)))
    return ', '.join(keywords)

def clean_text(text):
    ret = ' '.join(filter(None, (x.strip() for x in text.split())))
    ret = ', '.join(filter(None, (x.strip() for x in ret.split(','))))
    ret = '\n'.join(filter(None, (x.strip() for x in ret.split('\n'))))
    
    
    # Strip whitespace from the start and end of text in parentheses
    ret = ' ('.join(part.strip() for part in ret.split('('))
    ret = ')'.join(part.strip() for part in ret.split(')'))
    return ret

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


def get_save_file_path(filename_prefix: str = "text", filename_ext: str = "txt") -> str:
    """
    Generate a safe file path for saving files with automatic counter increment.

    Args:
        filename_prefix: Base filename, can include date/time variables like %year%, %month%, etc.
        filename_ext: File extension (without dot)

    Returns:
        Complete file path including directory and filename with counter
    """

    def _extract_counter_from_filename(filename: str) -> tuple[int, str]:
        """Extract counter from existing filename to determine next counter value."""
        base_name = pathlib.Path(filename_prefix).name
        prefix_len = len(base_name)

        if len(filename) <= prefix_len + 1:
            return 0, filename[:prefix_len + 1]

        prefix = filename[:prefix_len + 1]
        try:
            # Remove file extension first, then extract counter
            filename_no_ext = pathlib.Path(filename).stem
            counter_part = filename_no_ext[prefix_len + 1:]
            digits = int(counter_part)
        except (ValueError, IndexError):
            digits = 0
        return digits, prefix

    def _replace_date_variables(text: str) -> str:
        """Replace date/time variables in the filename prefix."""
        now = datetime.datetime.now()
        replacements = {
            "%year%": str(now.year),
            "%month%": str(now.month).zfill(2),
            "%day%": str(now.day).zfill(2),
            "%hour%": str(now.hour).zfill(2),
            "%minute%": str(now.minute).zfill(2),
            "%second%": str(now.second).zfill(2),
        }

        for placeholder, value in replacements.items():
            text = text.replace(placeholder, value)
        return text

    # Get output directory and process filename prefix
    output_dir = folder_paths.get_output_directory()
    
    if "%" in filename_prefix:
        filename_prefix = _replace_date_variables(filename_prefix)

    # Parse the filename prefix path
    filename_prefix_path = pathlib.Path(filename_prefix)
    subfolder = filename_prefix_path.parent
    base_filename = filename_prefix_path.name

    # Construct full output path
    output_path = pathlib.Path(output_dir)
    full_output_folder = output_path / subfolder

    # Security check: ensure we're not saving outside the output directory
    try:
        full_output_folder.resolve().relative_to(output_path.resolve())
    except ValueError:
        error_msg = (
            "ERROR: Saving outside the output folder is not allowed.\n"
            f"  Target folder: {full_output_folder.resolve()}\n"
            f"  Output directory: {output_path.resolve()}"
        )
        logging.error(error_msg)
        raise ValueError(error_msg)

    # Ensure output directory exists
    full_output_folder.mkdir(parents=True, exist_ok=True)

    # Find the next available counter
    counter = 1
    try:
        existing_files = [f.name for f in full_output_folder.iterdir() if f.is_file()]
        matching_counters = []

        for file in existing_files:
            digits, prefix = _extract_counter_from_filename(file)
            # Check if this file matches our pattern (same base name and ends with underscore)
            if (prefix[:-1].lower() == base_filename.lower() and 
                len(prefix) > 0 and prefix[-1] == "_"):
                matching_counters.append(digits)

        if matching_counters:
            counter = max(matching_counters) + 1
            
    except Exception as e:
        logging.warning(f"Error finding existing files, using counter=1: {e}")
        counter = 1

    # Generate final filename
    final_filename = f"{base_filename}_{counter:05d}.{filename_ext}"

    return str(full_output_folder / final_filename)

def unwrap_tuple(value):
    """Unwrap single-item tuples to their contained value."""
    return value[0] if isinstance(value, tuple) and len(value) == 1 else value

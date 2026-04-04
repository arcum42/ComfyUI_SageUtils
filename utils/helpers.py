#Utility functions for use in the nodes.

import datetime

from .model_cache import cache
from .helpers_civitai import (
    get_latest_model_version,
    get_civitai_model_version_json_by_hash,
    get_civitai_model_version_json_by_id,
)
from .logger import get_logger
from .type_utils import str_to_bool, bool_to_str
from .file_utils import (
    name_from_path,
    get_path_without_base,
    get_file_extension,
    has_model_extension,
    get_file_sha256,
    get_files_in_dir,
    last_used,
    days_since_last_used,
    get_file_modification_date,
)
from .lora_utils import lora_to_string, lora_to_prompt, get_lora_hash
from .model_discovery import model_scan, grab_model_list, get_model_list
from .prompt_utils import (
    normalize_prompt_weights,
    clean_keywords,
    clean_text,
    clean_if_needed,
    condition_text,
    get_save_file_path,
    unwrap_tuple,
)
import logging

logger = get_logger('helpers')
logger.setLevel(logging.WARNING)

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
        logger.info("Updating timestamp.")
        cache.update_last_used_by_path(file_path)

    logger.info("Successfully pulled metadata.")

def update_cache_without_civitai_json(file_path, hash, timestamp=True):
    file_cache = cache.by_path(file_path)
    logger.info("Unable to find metadata on CivitAI.")
    file_cache['civitai'] = "False"
    file_cache['civitai_failed_count'] = file_cache.get('civitai_failed_count', 0) + 1
    file_cache['hash'] = hash
    cache.update_last_used_by_path(file_path)

def add_file_to_cache(file_path, hash=None):
    file_path = str(file_path)
    logger.info(f"Adding {file_path} to cache.")
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
    
    logger.info(f"Added {file_path} to cache with hash {hash}.")
    return hash

def recheck_hash(file_path, hash):
    new_hash = get_file_sha256(file_path)
    if new_hash != hash:
        logger.info("Hash mismatch detected. Using new hash.")
        if file_path in cache.hash:
            logger.info(f"Updating cache for {file_path} with new hash {new_hash}.")
            if new_hash not in cache.info:
                if hash in cache.info:
                    cache.info[new_hash] = cache.info[hash]
        else:
            logger.info(f"File {file_path} not in cache. Adding with new hash {new_hash}.")
            add_file_to_cache(file_path, new_hash)
        hash = new_hash
    return hash

# Model path is inconsistent. Sometimes it is a list, and sometimes a string.
# Also, different models vary on whether they use an absolute or relative path.
# Loras and VAEs use a relative path from the loras folder. They are converted to absolute paths
# when calling this function. get_full_path_or_raise will raise if passed an absolute path.
# Unfortunately, this is set in the main program, not this node set.
def pull_and_update_model_timestamp(file_paths, model_type):
    if not isinstance(file_paths, (list, tuple)):
        file_paths = [file_paths]

    #if model_type == "lora":
    #    file_paths = [folder_paths.get_full_path_or_raise("loras", lora) for lora in file_paths]

    for path in file_paths:
        pull_metadata(path, model_type=model_type)

    update_model_timestamp(file_paths)

def update_model_timestamp(file_paths):
    cache.load()
    # If the file_paths isn't a list, make it a list.
    if not isinstance(file_paths, (list, tuple)):
        file_paths = [file_paths]
    for path in file_paths:
        if path in cache.hash:
            cache.update_last_used_by_path(path)
    cache.save()

def pull_metadata(file_paths, timestamp = True, force_all = False, pbar = None, model_type = None):
    pull_json = True
    metadata_days_recheck = 7
    
    cache.load()
    cache.backup_counter += 1
    if cache.backup_counter >= cache.num_of_backups_to_keep:
        cache.prune_all_backups()
        cache.backup_counter = 0
    
    if isinstance(file_paths, str):
        file_paths = [file_paths]
    
    if not file_paths:
        logger.warning("No file paths provided.")
        return
    
    num_not_pulled = 0

    for file_path in file_paths:
        force = force_all
        hash = cache.hash.get(str(file_path), None)
        if hash is None:
            logger.debug(f"Hash not found in cache for {file_path}. Adding to cache.")
            hash = add_file_to_cache(file_path)

        file_cache = cache.by_path(file_path)

        last_used_date = datetime.datetime.fromisoformat(file_cache['lastUsed']) if 'lastUsed' in file_cache else None

        modified = get_file_modification_date(file_path)
        # If file was modified after last used, force metadata pull
        if last_used_date is not None and modified is not None and modified > last_used_date:
            logger.info(f"File was modified after last used. Pulling metadata.")
            force = True
        
        # Only skip pull if not forced and civitai is True and recently pulled
        civitai_val = False
        try:
            civitai_val = str_to_bool(file_cache.get('civitai', False))
        except (TypeError, ValueError):
            civitai_val = False

        if not force and civitai_val == True:
            if days_since_last_used(file_path) <= metadata_days_recheck:
                num_not_pulled += 1
                pull_json = False

        if file_cache.get('blacklist'):
            if not force:
                logger.info(f"File {file_path} is blacklisted (previously not found). Skipping metadata pull.")
            pull_json = False

        # If force, recalculate hash before any API call
        if force:
            logger.debug(f"Force flag is set. Recalculating hash for {file_path}.")
            hash = recheck_hash(file_path, hash)

        if pull_json or force:
            logger.debug(f"Currently pulling metadata for {file_path}.")
            json = get_civitai_model_version_json_by_hash(hash)

            if 'error' in json:
                retried = False
                dead_model = False
                if 'civitai_error' in json:
                    if 'Model not found' in json['civitai_error'] or 'No model with id' in json['civitai_error']:
                        dead_model = True

                # Try fallback with modelId if available
                if dead_model is False:
                    if 'modelId' in file_cache:
                        logger.debug(f"Using cached model id {file_cache.get('id', None)}")
                        json = get_civitai_model_version_json_by_id(file_cache['id'])
                        retried = True
                    else:
                        logger.debug(f"No cached model id.")

                if 'error' in json:
                    if retried:
                        logger.error(f"Error: {json['error']}")
                    if dead_model:
                        file_cache['blacklist'] = True
                    logger.info("Unable to find metadata on CivitAI.")
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
        if model_type is not None:
            file_cache['model_type'] = model_type

        if pbar is not None:
            pbar.update(1)

    if num_not_pulled > 0:
        logger.info(f"Metadata pull complete. Skipped {num_not_pulled} files checked within the last {metadata_days_recheck} days.")
    cache.save()


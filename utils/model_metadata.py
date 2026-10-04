"""Model metadata/cache maintenance helpers extracted from helpers facade."""

import copy
import datetime

from .helpers_civitai import (
    get_civitai_model_version_json_by_hash,
    get_civitai_model_version_json_by_id,
    get_latest_model_version,
)
from .logger import get_logger
from .model_cache import cache
from .file_utils import (
    days_since_last_used,
    get_file_fingerprint,
    get_file_modification_date,
    get_file_sha256,
)
from .type_utils import str_to_bool

logger = get_logger('model.metadata')

FILE_STATE_KEY = '_sageutils_file_state'
FULL_SHA256_KEY = '_sageutils_full_sha256'
PROVIDER_STATUS_KEY = '_sageutils_civitai_status'
SCHEMA_VERSION_KEY = '_sageutils_schema_version'
CURRENT_SCHEMA_VERSION = 1
LOCAL_METADATA_FIELDS = {
    'notes',
    'favorite',
    'is_favorite',
    'blacklist',
    'trainedWords',
}
AMBIGUOUS_METADATA_FIELDS = {'name', 'baseModel', 'model'}
PROVIDER_METADATA_FIELDS = {
    'civitai',
    'civitai_failed_count',
    'id',
    'modelId',
    'update_available',
    'update_version_id',
    'downloadUrl',
    'hashes',
}


def normalize_model_info(info):
    """Return compatibility aliases without modifying the stored record."""
    if not isinstance(info, dict):
        return {}

    normalized = copy.deepcopy(info)
    if 'last_used' not in normalized:
        last_used = normalized.get('lastUsed', normalized.get('last_accessed'))
        if last_used is not None:
            normalized['last_used'] = last_used
    if 'has_update' not in normalized and 'update_available' in normalized:
        normalized['has_update'] = bool(normalized['update_available'])
    if 'file_size' not in normalized:
        for legacy_key in ('fileSize', 'size'):
            if legacy_key in normalized:
                normalized['file_size'] = normalized[legacy_key]
                break
    if 'metadata_status' not in normalized:
        metadata_status = (
            normalized.get('metadata_status')
            or normalized.get('provider_status')
            or normalized.get(PROVIDER_STATUS_KEY)
            or normalized.get('civitai_status')
        )
        if metadata_status is not None:
            normalized['metadata_status'] = metadata_status
    if 'provider_status' not in normalized:
        provider_status = (
            normalized.get('provider_status')
            or normalized.get(PROVIDER_STATUS_KEY)
            or normalized.get('civitai_status')
        )
        if provider_status is not None:
            normalized['provider_status'] = provider_status
    normalized.setdefault('_sageutils_schema_version', 1)
    return normalized


def merge_civitai_metadata(existing, provider_fields):
    """Merge provider fields without overwriting local or unknown metadata."""
    merged = dict(existing)

    for field, value in provider_fields.items():
        if field in LOCAL_METADATA_FIELDS or field in AMBIGUOUS_METADATA_FIELDS:
            if field not in merged:
                merged[field] = value
            continue
        if field not in PROVIDER_METADATA_FIELDS and field in merged:
            continue
        merged[field] = value

    if isinstance(provider_fields.get('model'), dict) and isinstance(merged.get('model'), dict):
        provider_model = provider_fields['model']
        existing_model = merged['model']
        merged['model'] = {
            **provider_model,
            **existing_model,
        }

    return merged


def record_file_fingerprint(file_path, file_cache=None):
    """Record cheap per-path filesystem state without replacing metadata."""
    if file_cache is None:
        file_cache = cache.by_path(file_path)

    try:
        fingerprint = get_file_fingerprint(file_path)
    except (OSError, ValueError):
        return False

    file_states = file_cache.setdefault(FILE_STATE_KEY, {})
    file_states[str(file_path)] = fingerprint
    return True


def update_cache_from_civitai_json(
    file_path,
    json_data,
    timestamp=True,
    check_latest=True,
    cache_instance=None,
):
    """Update cache entry from a successful CivitAI model-version payload."""
    the_files = json_data.get("files", [])
    hashes = {}

    if len(the_files) > 0:
        hashes = the_files[0].get("hashes", {})
    update_available = True

    latest_model = None
    if check_latest and json_data.get("modelId", None) is not None:
        latest_model = get_latest_model_version(json_data["modelId"])
        if latest_model == json_data["id"] or latest_model is None:
            update_available = False

    if latest_model is None:
        latest_model = ""

    target_cache = cache_instance or cache
    file_cache = target_cache.by_path(file_path)
    provider_fields = {
        'civitai': "True",
        SCHEMA_VERSION_KEY: CURRENT_SCHEMA_VERSION,
        PROVIDER_STATUS_KEY: 'matched',
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
        'hashes': hashes,
    }
    merged_cache = merge_civitai_metadata(file_cache, provider_fields)
    file_cache.clear()
    file_cache.update(merged_cache)
    if timestamp:
        logger.info("Updating timestamp.")
        target_cache.update_last_used_by_path(file_path)

    logger.info("Successfully pulled metadata.")


def update_cache_without_civitai_json(file_path, hash_value, timestamp=True, status='not_found_or_unpublished'):
    """Update cache entry when CivitAI metadata is unavailable."""
    file_cache = cache.by_path(file_path)
    logger.info("Unable to find metadata on CivitAI.")
    file_cache['civitai'] = "False"
    file_cache[PROVIDER_STATUS_KEY] = status
    file_cache['civitai_failed_count'] = file_cache.get('civitai_failed_count', 0) + 1
    file_cache['hash'] = hash_value
    if timestamp:
        cache.update_last_used_by_path(file_path)


def add_file_to_cache(file_path, hash_value=None):
    """Ensure a file path has hash/info cache entries and return its hash."""
    file_path = str(file_path)
    logger.info(f"Adding {file_path} to cache.")
    if hash_value is None:
        hash_value = get_file_sha256(file_path)

    if file_path not in cache.hash:
        cache.hash[file_path] = hash_value

    if cache.info.get(hash_value, None) is None:
        cache.info[hash_value] = {
            'civitai': "False",
            'update_available': False,
            'update_version_id': "",
            'hash': hash_value,
            'lastUsed': datetime.datetime.now().isoformat(),
            SCHEMA_VERSION_KEY: CURRENT_SCHEMA_VERSION,
        }

    record_file_fingerprint(file_path, cache.info[hash_value])

    logger.info(f"Added {file_path} to cache with hash {hash_value}.")
    return hash_value


def recheck_hash(file_path, hash_value):
    """Recompute a file hash and migrate cache references if it changed."""
    new_hash = get_file_sha256(file_path)
    if new_hash != hash_value:
        logger.info("Hash mismatch detected. Using new hash.")
        if file_path in cache.hash:
            logger.info(f"Updating cache for {file_path} with new hash {new_hash}.")
            if new_hash not in cache.info and hash_value in cache.info:
                cache.info[new_hash] = cache.info[hash_value]
        else:
            logger.info(f"File {file_path} not in cache. Adding with new hash {new_hash}.")
            add_file_to_cache(file_path, new_hash)
        hash_value = new_hash
    return hash_value


def pull_and_update_model_timestamp(file_paths, model_type):
    """Pull metadata for one-or-many model paths and update last-used timestamps."""
    if not isinstance(file_paths, (list, tuple)):
        file_paths = [file_paths]

    for path in file_paths:
        pull_metadata(path, model_type=model_type)

    update_model_timestamp(file_paths)


def update_model_timestamp(file_paths):
    """Update last-used timestamps for one-or-many model paths in cache."""
    cache.load()
    if not isinstance(file_paths, (list, tuple)):
        file_paths = [file_paths]

    for path in file_paths:
        if path in cache.hash:
            cache.update_last_used_by_path(path)
    cache.save()


def pull_metadata(file_paths, timestamp=True, force_all=False, pbar=None, model_type=None):
    """Pull model metadata from CivitAI and update cache entries."""
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
        hash_value = cache.hash.get(str(file_path), None)
        if hash_value is None:
            logger.debug(f"Hash not found in cache for {file_path}. Adding to cache.")
            hash_value = add_file_to_cache(file_path)

        file_cache = cache.by_path(file_path)

        last_used_date = datetime.datetime.fromisoformat(file_cache['lastUsed']) if 'lastUsed' in file_cache else None

        modified = get_file_modification_date(file_path)
        if last_used_date is not None and modified is not None and modified > last_used_date:
            logger.info("File was modified after last used. Pulling metadata.")
            force = True

        civitai_val = False
        try:
            civitai_val = str_to_bool(file_cache.get('civitai', False))
        except (TypeError, ValueError):
            civitai_val = False

        if not force and civitai_val is True:
            if days_since_last_used(file_path) <= metadata_days_recheck:
                num_not_pulled += 1
                pull_json = False

        if file_cache.get('blacklist'):
            if not force:
                logger.info(f"File {file_path} is blacklisted (previously not found). Skipping metadata pull.")
            pull_json = False

        if force:
            logger.debug(f"Force flag is set. Recalculating hash for {file_path}.")
            hash_value = recheck_hash(file_path, hash_value)

        if pull_json or force:
            logger.debug(f"Currently pulling metadata for {file_path}.")
            json_data = get_civitai_model_version_json_by_hash(hash_value)

            if 'error' in json_data:
                retried = False
                dead_model = False
                if 'civitai_error' in json_data:
                    civitai_error = json_data['civitai_error']
                    if 'Model not found' in civitai_error or 'No model with id' in civitai_error:
                        dead_model = True

                if dead_model is False:
                    if 'modelId' in file_cache:
                        logger.debug(f"Using cached model id {file_cache.get('id', None)}")
                        json_data = get_civitai_model_version_json_by_id(file_cache['id'])
                        retried = True
                    else:
                        logger.debug("No cached model id.")

                if 'error' in json_data:
                    if retried:
                        logger.error(f"Error: {json_data['error']}")
                    if dead_model:
                        file_cache['blacklist'] = True
                    logger.info("Unable to find metadata on CivitAI.")
                    file_cache['civitai'] = "False"
                    file_cache['civitai_failed_count'] = file_cache.get('civitai_failed_count', 0) + 1
                    update_cache_without_civitai_json(
                        file_path,
                        hash_value,
                        timestamp=timestamp,
                        status='not_found_or_unpublished' if dead_model else 'temporary_error',
                    )

            if 'error' not in json_data:
                update_cache_from_civitai_json(file_path, json_data, timestamp=timestamp)
            else:
                retries = file_cache.get('civitai_failed_count', 0) + 1
                file_cache['civitai_failed_count'] = retries

        cache.hash[file_path] = hash_value
        cache.info[hash_value] = file_cache
        if model_type is not None:
            file_cache['model_type'] = model_type

        record_file_fingerprint(file_path, file_cache)

        if pbar is not None:
            pbar.update(1)

    if num_not_pulled > 0:
        logger.info(
            f"Metadata pull complete. Skipped {num_not_pulled} files checked within the last {metadata_days_recheck} days."
        )
    cache.save()

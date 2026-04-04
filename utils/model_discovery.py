"""Model discovery helpers extracted from helpers.py."""

import comfy.utils
import folder_paths

from .constants import MODEL_FILE_EXTENSIONS
from .logger import get_logger

logger = get_logger('utils.model_discovery')

# Module-level cache for get_model_list
_model_list_cache = {}


def model_scan(the_path, force=False):
    the_paths = the_path

    logger.debug(f'Scanning paths: {the_paths}')

    model_list = []
    import pathlib

    for directory in the_paths:
        logger.debug(f'Scanning directory: {directory}')
        result = list(p.resolve() for p in pathlib.Path(directory).glob('**/*') if p.suffix in MODEL_FILE_EXTENSIONS)
        model_list.extend(result)

    model_list = list(set(model_list))
    model_list = [str(x) for x in model_list]
    logger.info(f'Starting metadata scan for {len(model_list)} models.')
    pbar = comfy.utils.ProgressBar(len(model_list))

    # Local import avoids circular dependency with helpers facade.
    from .helpers import pull_metadata

    pull_metadata(model_list, force_all=force, pbar=pbar)


def grab_model_list(model_type: str, extra_models: list[str] | None = None) -> list[str]:
    """Get a list of model names based on the model type, including extra models."""
    model_list = folder_paths.get_filename_list(model_type)
    if extra_models is None:
        return model_list

    for extra_model in extra_models:
        try:
            extra = [x for x in folder_paths.get_filename_list(extra_model)]
        except Exception:
            extra = []
        model_list += extra
        model_list = list(set(model_list))
    model_list.sort()
    return model_list


def get_model_list(model_type: str) -> list[str]:
    """Get a list of model names based on the model type, with in-memory cache (1 min)."""
    import time

    global _model_list_cache
    now = time.time()
    cache_entry = _model_list_cache.get(model_type)
    if cache_entry:
        cached_time, cached_list = cache_entry
        if now - cached_time < 60:
            return cached_list

    if model_type == 'checkpoints':
        result = grab_model_list('checkpoints')
    elif model_type == 'unet':
        result = grab_model_list('unet', ['diffusion_models', 'unet_gguf'])
    elif model_type == 'vae':
        result = grab_model_list('vae')
    elif model_type == 'clip':
        result = grab_model_list('clip', ['text_encoders', 'clip_gguf'])
    elif model_type == 'loras':
        result = grab_model_list('loras')
    else:
        result = []

    _model_list_cache[model_type] = (now, result)
    return result

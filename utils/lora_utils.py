"""LoRA prompt and hash utility helpers extracted from helpers.py."""

import pathlib

import folder_paths

from .logger import get_logger
from .model_cache import cache
from .lora_stack import norm_lora_stack

logger = get_logger('utils.lora_utils')


def lora_to_string(lora_name, model_weight, clip_weight):
    return ' <lora:' + str(pathlib.Path(lora_name).name) + ':' + str(model_weight) + '>'


def lora_to_prompt(lora_stack=None):
    lora_info = ''
    lora_stack = norm_lora_stack(lora_stack)
    if lora_stack is None:
        return ''

    for lora in lora_stack:
        lora_info += lora_to_string(lora[0], lora[1], lora[2])
    return lora_info


def get_lora_hash(lora_name):
    # Local import avoids circular dependency with helpers facade.
    from .helpers import pull_metadata

    lora_path = folder_paths.get_full_path_or_raise('loras', lora_name)
    pull_metadata(lora_path)
    return cache.hash[lora_path]

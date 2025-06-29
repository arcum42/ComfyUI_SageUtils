# Metadata nodes.
# This includes nodes for constructing metadata, and related nodes. Saving metadata is handled in the image nodes.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO
import folder_paths

# Import specific utilities instead of wildcard import
from ..utils import (
    config_manager, lora_to_prompt, civitai_sampler_name,
    pull_metadata, get_model_info, cache, name_from_path
)

import numpy as np
import pathlib
import json

class Sage_ConstructMetadata(ComfyNodeABC):
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "model_info": ('MODEL_INFO',{ "defaultInput": True}),
                "positive_string": (IO.STRING,{ "defaultInput": True}),
                "negative_string": (IO.STRING,{ "defaultInput": True}),
                "sampler_info": ('SAMPLER_INFO', { "defaultInput": True}),
                "width": (IO.INT, { "defaultInput": True}),
                "height": (IO.INT, { "defaultInput": True})
            },
            "optional": {
                "lora_stack": ('LORA_STACK',{ "defaultInput": True})
            },
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ('param_metadata',)
    FUNCTION = "construct_metadata"

    CATEGORY = "Sage Utils/metadata"
    DESCRIPTION = "Puts together metadata in a A1111-like format. Uses the custom sampler info node. The return value is a string, so can be manipulated by other nodes."

    def construct_metadata(self, model_info, positive_string, negative_string, width, height, sampler_info, lora_stack = None) -> tuple[str]:
        metadata = ''

        lora_hashes = []
        lora_hash_string = ''

        resource_hashes = []
        civitai_string = ''

        sampler_name = civitai_sampler_name(sampler_info['sampler'], sampler_info['scheduler'])

        if lora_stack is not None:
            # We're going through generating A1111 style <lora> tags to insert in the prompt, adding the lora hashes to the resource hashes in exactly the format
            # that CivitAI's approved extension for A1111 does, and inserting the Lora hashes at the end in the way they appeared looking at the embedded metadata
            # generated by Forge.
            for lora in lora_stack:
                lora_path = folder_paths.get_full_path_or_raise("loras", lora[0])
                lora_name = str(pathlib.Path(lora_path).name)
                pull_metadata(lora_path)
                lora_data = get_model_info(lora_path, lora[1])
                if lora_data != {}:
                    resource_hashes.append(lora_data)

                lora_hash = cache.hash[lora_path]
                lora_hashes += [f"{lora_name}: {lora_hash}"]

        lora_hash_string = "Lora hashes: " + ",".join(lora_hashes)
        civitai_string = f"Civitai resources: {json.dumps(resource_hashes)}"

        metadata = f"{positive_string} {lora_to_prompt(lora_stack)}" + "\n"
        if negative_string != "":
            metadata += f"Negative prompt: {negative_string}" + "\n"
        metadata += f"Steps: {sampler_info['steps']}, Sampler: {sampler_name}, Scheduler type: {sampler_info['scheduler']}, CFG scale: {sampler_info['cfg']}, Seed: {sampler_info['seed']}, Size: {width}x{height},"
        metadata += f"Model: {name_from_path(model_info['path'])}, Model hash: {model_info['hash']}, Version: v1.10-RC-6-comfyui, {civitai_string}, {lora_hash_string}"
        return metadata,

class Sage_ConstructMetadataLite(ComfyNodeABC):
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "model_info": ('MODEL_INFO', { "defaultInput": True}),
                "positive_string": (IO.STRING, { "defaultInput": True}),
                "negative_string": (IO.STRING, { "defaultInput": True}),
                "sampler_info": ('SAMPLER_INFO', { "defaultInput": True}),
                "width": (IO.INT, { "defaultInput": True}),
                "height": (IO.INT, { "defaultInput": True})
            },
            "optional": {
                "lora_stack": ('LORA_STACK',{ "defaultInput": True})
            },
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ('param_metadata',)
    FUNCTION = "construct_metadata"

    CATEGORY = "Sage Utils/metadata"
    DESCRIPTION = "Puts together metadata in a A1111-like format. Uses the custom sampler info node. The return value is a string, so can be manipulated by other nodes."

    def construct_metadata(self, model_info, positive_string, negative_string, width, height, sampler_info, lora_stack = None) -> tuple[str]:
        metadata = ''

        resource_hashes = []

        sampler_name = civitai_sampler_name(sampler_info['sampler'], sampler_info['scheduler'])
        resource_hashes.append(get_model_info(model_info['path']))

        if lora_stack is not None:
            # We're going through generating A1111 style prompt information, but not doing the loras and model A1111 style, rather
            # just adding the lora and model information in the resource section.
            for lora in lora_stack:
                lora_path = folder_paths.get_full_path_or_raise("loras", lora[0])
                pull_metadata(lora_path)
                lora_data = get_model_info(lora_path, lora[1])
                if lora_data != {}:
                    resource_hashes.append(lora_data)

        metadata = f"{positive_string}" + "\n"
        if negative_string != "": metadata += f"Negative prompt: {negative_string}" + "\n"
        metadata += f"Steps: {sampler_info['steps']}, Sampler: {sampler_name}, Scheduler type: {sampler_info['scheduler']}, CFG scale: {sampler_info['cfg']}, Seed: {sampler_info['seed']}, Size: {width}x{height},"
        metadata += f"Version: v1.10-RC-6-comfyui, Civitai resources: {json.dumps(resource_hashes)}"
        return metadata,

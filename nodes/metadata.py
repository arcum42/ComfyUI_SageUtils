"""Metadata nodes for constructing A1111-style metadata.

This module includes nodes for constructing metadata and related nodes.
Saving metadata is handled in the image nodes.
"""

from __future__ import annotations
from pathlib import Path
import json
from typing import Optional

import folder_paths
from comfy.comfy_types.node_typing import ComfyNodeABC, IO

from ..utils import (
    lora_to_prompt, civitai_sampler_name,pull_metadata, get_model_dict, cache,
)
from ..utils.model_info import collect_resource_hashes, model_name_and_hash_as_str, _get_model_name_from_info, _get_model_hash_from_info
from ..utils.config_manager import metadata_templates

# Constants
try:
    from comfyui_version import __version__ as comfy_version_number
    COMFYUI_VERSION = f"v{comfy_version_number}-comfyui"
except ImportError:
    COMFYUI_VERSION = "v1.10-RC-6-comfyui"

class Sage_ConstructMetadataFlexible(ComfyNodeABC):
    """Flexible metadata constructor with multiple style options."""

    @classmethod
    def INPUT_TYPES(cls):  # type: ignore
        return {
            "required": {
                "model_info": ('MODEL_INFO,UNET_INFO', {}),
                "positive_string": (IO.STRING, {"default": ""}),
                "negative_string": (IO.STRING, {"default": ""}),
                "sampler_info": ('SAMPLER_INFO', {}),
                "width": (IO.INT, {"default": 1024}),
                "height": (IO.INT, {"default": 1024}),
                "metadata_style": (list(metadata_templates.keys()), {"default": "A1111 Full", "tooltip": "Select the metadata style to use."}),
            },
            "optional": {
                "lora_stack": ('LORA_STACK', {"forceInput": True})
            },
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ('param_metadata',)
    FUNCTION = "construct_metadata"
    CATEGORY = "Sage Utils/metadata"
    DESCRIPTION = ("Flexible metadata constructor supporting multiple styles: "
                  "A1111 Full (with LoRA hashes), A1111 Lite (simplified, only includes models on Civitai), "
                  "and Simple (No models or LoRAs).")
    
    def _collect_metadata_components(self, model_info: dict, positive_string: str, negative_string: str,
                                   width: int, height: int, sampler_info: dict,
                                   lora_stack: Optional[list] = None) -> dict:
        """Collect all metadata components needed for any style."""
        # Individual sampler components
        sampler_name = civitai_sampler_name(sampler_info['sampler'], sampler_info['scheduler'])
        steps = sampler_info['steps']
        scheduler = sampler_info['scheduler']
        cfg = sampler_info['cfg']
        seed = sampler_info['seed']
        size = f"{width}x{height}"
        
        # Combined base parameters (for backward compatibility)
        base_params = (f"Steps: {steps}, Sampler: {sampler_name}, "
                      f"Scheduler type: {scheduler}, CFG scale: {cfg}, "
                      f"Seed: {seed}, Size: {size}")
        
        if negative_string is None:
            negative_string = ""
        else:
            negative_string = negative_string.strip()
        negative_string_raw = negative_string

        if positive_string is None:
            positive_string = ""
        else:
            positive_string = positive_string.strip()
        positive_string_raw = positive_string

        # Prompt components
        prompt_with_loras = f"{positive_string} {lora_to_prompt(lora_stack)}" if lora_stack else positive_string
        if negative_string is None:
            negative_prompt_line = ""
        else:
            negative_prompt_line = f"Negative prompt: {negative_string}"

        # Model and version info
        model_hash_str = model_name_and_hash_as_str(model_info)
        comfyui_version = COMFYUI_VERSION
        version_str = f"Version: {COMFYUI_VERSION}"
        
        # Individual model components for flexible templating
        if isinstance(model_info, tuple):
            # Handle multiple models - combine names and hashes
            model_names = []
            model_hashes = []
            for info in model_info:
                if info and isinstance(info, dict):
                    model_names.append(_get_model_name_from_info(info))
                    model_hashes.append(_get_model_hash_from_info(info))
            model_name = " + ".join(model_names) if model_names else ""
            model_hash = " + ".join(model_hashes) if model_hashes else ""
        else:
            # Handle single model
            if isinstance(model_info, dict) and "path" in model_info and "hash" in model_info:
                model_name = _get_model_name_from_info(model_info)
                model_hash = _get_model_hash_from_info(model_info)
            else:
                model_name = ""
                model_hash = ""
        
        # Resource hashes for lite version
        resource_hashes_json = json.dumps(collect_resource_hashes(model_info, lora_stack))
        
        # LoRA information for full version
        lora_hashes_list = []
        lora_resource_hashes = []
        
        if lora_stack:
            for lora in lora_stack:
                lora_path = folder_paths.get_full_path_or_raise("loras", lora[0])
                lora_name = Path(lora_path).name
                
                pull_metadata(lora_path)
                lora_data = get_model_dict(lora_path, lora[1])
                if lora_data:
                    lora_resource_hashes.append(lora_data)
                
                lora_hash = cache.hash[lora_path]
                lora_hashes_list.append(f"{lora_name}: {lora_hash}")
        
        lora_hashes_str = ', '.join(lora_hashes_list) if lora_hashes_list else ""
        lora_resource_hashes_json = json.dumps(lora_resource_hashes) if lora_resource_hashes else ""
        
        return {
            # Prompt components
            'positive_string': positive_string,
            'prompt_with_loras': prompt_with_loras,
            'negative_prompt_line': negative_prompt_line,
            'negative_string': negative_string_raw,
            
            # Individual sampler components
            'steps': steps,
            'sampler_name': sampler_name,
            'scheduler': scheduler,
            'cfg': cfg,
            'seed': seed,
            'width': width,
            'height': height,
            'size': size,
            
            # Combined parameters (for backward compatibility)
            'base_params': base_params,
            
            # Model and version info
            'model_hash_str': model_hash_str,
            'version_str': version_str,
            'model_name': model_name,
            'model_hash': model_hash,
            'comfyui_version': comfyui_version,
            
            # Resource information
            'resource_hashes_json': resource_hashes_json,
            'lora_hashes_str': lora_hashes_str,
            'lora_resource_hashes_json': lora_resource_hashes_json,
        }

    def _format_metadata_string(self, template: str, components: dict) -> str:
        """Format a single template string with components, filtering empty conditional parts."""
        # Handle conditional components that might be empty
        filtered_components = {}
        for key, value in components.items():
            # Convert empty strings to empty for conditional parts
            if isinstance(value, str) and not value.strip():
                filtered_components[key] = ""
            else:
                filtered_components[key] = value
        
        return template.format(**filtered_components)

    def construct_metadata(self, model_info: dict, positive_string: str, negative_string: str,
                          width: int, height: int, sampler_info: dict, metadata_style: str,
                          lora_stack: Optional[list] = None) -> tuple[str]:
        """Construct metadata using the selected style."""
        # Collect all components
        components = self._collect_metadata_components(
            model_info, positive_string, negative_string, width, height, sampler_info, lora_stack
        )
        
        # Add conditional LoRA components for A1111 Full
        components['lora_civitai_resources'] = (
            f", Civitai resources: {components['lora_resource_hashes_json']}" 
            if components['lora_resource_hashes_json'] else ""
        )
        components['lora_hashes'] = (
            f", Lora hashes: {components['lora_hashes_str']}" 
            if components['lora_hashes_str'] else ""
        )
        
        # Use the requested style or fallback to A1111 Full
        template = metadata_templates.get(metadata_style, metadata_templates["A1111 Full"])

        # Format the template with components
        formatted_metadata = self._format_metadata_string(template, components)
        
        return (formatted_metadata,)

METADATA_CLASS_MAPPINGS = {
    "Sage_ConstructMetadataFlexible": Sage_ConstructMetadataFlexible
}

METADATA_NAME_MAPPINGS = {
    "Sage_ConstructMetadataFlexible": "Construct Metadata (Flexible)"
}

"""Metadata nodes for constructing A1111-style metadata.

This module includes nodes for constructing metadata and related nodes.
Saving metadata is handled in the image nodes.
"""

from __future__ import annotations
from pathlib import Path
import json
from typing import Optional, Any

import folder_paths
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO

from ..utils import (
    lora_to_prompt, civitai_sampler_name,pull_metadata, get_model_dict, cache,
)
from ..utils.model_info import collect_resource_hashes, model_name_and_hash_as_str
from comfy_execution.graph_utils import GraphBuilder

# Constants
COMFYUI_VERSION = "v1.10-RC-6-comfyui"


class Sage_ConstructMetadataFlexible(ComfyNodeABC):
    """Flexible metadata constructor with multiple style options."""

    @classmethod
    def INPUT_TYPES(cls):  # type: ignore
        return {
            "required": {
                "model_info": ('MODEL_INFO,UNET_INFO', {"defaultInput": True}),
                "positive_string": (IO.STRING, {"defaultInput": True}),
                "negative_string": (IO.STRING, {"defaultInput": True}),
                "sampler_info": ('SAMPLER_INFO', {"defaultInput": True}),
                "width": (IO.INT, {"defaultInput": True}),
                "height": (IO.INT, {"defaultInput": True}),
                "metadata_style": (["A1111 Full", "A1111 Lite", "Simple"], {"default": "A1111 Full", "tooltip": "Select the metadata style to use."}),
            },
            "optional": {
                "lora_stack": ('LORA_STACK', {"defaultInput": True})
            },
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ('param_metadata',)
    FUNCTION = "construct_metadata"
    CATEGORY = "Sage Utils/metadata"
    DESCRIPTION = ("Flexible metadata constructor supporting multiple styles: "
                  "A1111 Full (with LoRA hashes), A1111 Lite (simplified, only includes models on Civitai), "
                  "and Simple (No models or LoRAs).")

    def _get_sampler_name(self, sampler_info: dict) -> str:
        """Get the standardized sampler name."""
        return civitai_sampler_name(sampler_info['sampler'], sampler_info['scheduler'])
    
    def _build_base_params(self, sampler_info: dict, width: int, height: int) -> str:
        """Build the base parameter string."""
        sampler_name = self._get_sampler_name(sampler_info)
        return (
            f"Steps: {sampler_info['steps']}, "
            f"Sampler: {sampler_name}, "
            f"Scheduler type: {sampler_info['scheduler']}, "
            f"CFG scale: {sampler_info['cfg']}, "
            f"Seed: {sampler_info['seed']}, "
            f"Size: {width}x{height}"
        )

    def build_simple_metadata_string(self, positive_string: str, negative_string: str,
                                     sampler_info: dict, width: int, height: int) -> str:
        """Build simple metadata string with just basic parameters."""
        lines = [positive_string]
        
        if negative_string.strip():
            lines.append(f"Negative prompt: {negative_string}")
        
        # Just the base parameters
        base_params = self._build_base_params(sampler_info, width, height)
        lines.append(base_params)
        
        return '\n'.join(lines[:-1]) + ', ' + lines[-1] if len(lines) > 1 else lines[0]

    def process_lora_stack(self, lora_stack: Optional[list]) -> tuple[list[str], list[dict]]:
        """Process LoRA stack to extract hashes and resource information."""
        if not lora_stack:
            return [], []
        
        lora_hashes = []
        resource_hashes = []
        
        for lora in lora_stack:
            lora_path = folder_paths.get_full_path_or_raise("loras", lora[0])
            lora_name = Path(lora_path).name
            
            pull_metadata(lora_path)
            lora_data = get_model_dict(lora_path, lora[1])
            if lora_data:
                resource_hashes.append(lora_data)

            lora_hash = cache.hash[lora_path]
            lora_hashes.append(f"{lora_name}: {lora_hash}")
        
        return lora_hashes, resource_hashes

    def construct_a1111_full_metadata(self, model_info: dict, positive_string: str, negative_string: str,
                                        width: int, height: int, sampler_info: dict,
                                        lora_stack: Optional[list] = None):
        """Construct metadata using the selected style."""
        # Use the same logic as Sage_ConstructMetadata
        lora_hashes, resource_hashes = self.process_lora_stack(lora_stack)

        # Build prompt section
        prompt_with_loras = f"{positive_string} {lora_to_prompt(lora_stack)}"
        lines = [prompt_with_loras]

        if negative_string.strip():
            lines.append(f"Negative prompt: {negative_string}")

        # Build parameter section
        base_params = self._build_base_params(sampler_info, width, height)
        params = (
            f"{base_params}, "
            f"{model_name_and_hash_as_str(model_info)}, "
            f"Version: {COMFYUI_VERSION}"
        )

        # Add additional metadata if available
        if resource_hashes:
            params += f", Civitai resources: {json.dumps(resource_hashes)}"
        if lora_hashes:
            params += f", Lora hashes: {', '.join(lora_hashes)}"
            
        lines.append(params)
        metadata = '\n'.join(lines[:-1]) + ', ' + lines[-1] if len(lines) > 1 else lines[0]
        return metadata

    def construct_lite_metadata(self, model_info: dict, positive_string: str, negative_string: str,
                                width: int, height: int, sampler_info: dict,
                                lora_stack: Optional[list] = None) -> str:
        resource_hashes = collect_resource_hashes(model_info, lora_stack)
        lines = [positive_string]

        if negative_string.strip():
            lines.append(f"Negative prompt: {negative_string}")

        # Build parameter section
        base_params = self._build_base_params(sampler_info, width, height)
        params = (
            f"{base_params}, "
            f"Version: {COMFYUI_VERSION}, "
            f"Civitai resources: {json.dumps(resource_hashes)}"
        )
        lines.append(params)

        metadata = '\n'.join(lines[:-1]) + ', ' + lines[-1] if len(lines) > 1 else lines[0]
        return metadata
    
    def construct_simple_metadata(self, model_info: dict, positive_string: str, negative_string: str,
                                width: int, height: int, sampler_info: dict,
                                lora_stack: Optional[list] = None) -> str:
        # Simple style with just basic parameters
        metadata = self.build_simple_metadata_string(
            positive_string, negative_string, sampler_info, width, height
        )
        return metadata
        
    def construct_metadata(self, model_info: dict, positive_string: str, negative_string: str,
                          width: int, height: int, sampler_info: dict, metadata_style: str,
                          lora_stack: Optional[list] = None) -> tuple[str]:
        """Construct metadata using the selected style."""
        if metadata_style == "A1111 Full":
            metadata = self.construct_a1111_full_metadata(model_info, positive_string, negative_string, width, height, sampler_info, lora_stack)
        elif metadata_style == "A1111 Lite":
            metadata = self.construct_lite_metadata(model_info, positive_string, negative_string, width, height, sampler_info, lora_stack)
        elif metadata_style == "Simple":
            metadata = self.construct_simple_metadata(model_info, positive_string, negative_string, width, height, sampler_info, lora_stack)
        else:
            # Fallback to A1111 Full if unknown style
            metadata = self.construct_a1111_full_metadata(model_info, positive_string, negative_string, width, height, sampler_info, lora_stack)
        
        return (metadata,)

class Sage_ConstructMetadata(Sage_ConstructMetadataFlexible):
    """Constructs comprehensive A1111-style metadata with full LoRA hash information."""

    @classmethod
    def INPUT_TYPES(cls):  # type: ignore
        return {
            "required": {
                "model_info": ('MODEL_INFO', {"defaultInput": True}),
                "positive_string": (IO.STRING, {"defaultInput": True}),
                "negative_string": (IO.STRING, {"defaultInput": True}),
                "sampler_info": ('SAMPLER_INFO', {"defaultInput": True}),
                "width": (IO.INT, {"defaultInput": True}),
                "height": (IO.INT, {"defaultInput": True})
            },
            "optional": {
                "lora_stack": ('LORA_STACK', {"defaultInput": True})
            },
        }

    DESCRIPTION = ("Constructs comprehensive A1111-style metadata with full LoRA hash information. "
                  "Uses the custom sampler info node. Returns a string that can be manipulated by other nodes.")
    FUNCTION = "construct_a1111"
    CATEGORY = "Sage Utils/depreciated"

    def construct_a1111(self, model_info: dict, positive_string: str, negative_string: str, 
                          width: int, height: int, sampler_info: dict, 
                          lora_stack: Optional[list] = None) -> tuple[str]:
        return self.construct_metadata(model_info=model_info, positive_string=positive_string, negative_string=negative_string,
                          width=width, height=height, sampler_info=sampler_info, metadata_style="A1111 Full",
                          lora_stack=lora_stack)

class Sage_ConstructMetadataLite(Sage_ConstructMetadataFlexible):
    """Constructs simplified A1111-style metadata without LoRA hash details."""

    @classmethod
    def INPUT_TYPES(cls):  # type: ignore
        return {
            "required": {
                "model_info": ('MODEL_INFO', {"defaultInput": True}),
                "positive_string": (IO.STRING, {"defaultInput": True}),
                "negative_string": (IO.STRING, {"defaultInput": True}),
                "sampler_info": ('SAMPLER_INFO', {"defaultInput": True}),
                "width": (IO.INT, {"defaultInput": True}),
                "height": (IO.INT, {"defaultInput": True})
            },
            "optional": {
                "lora_stack": ('LORA_STACK', {"defaultInput": True})
            },
        }

    DESCRIPTION = ("Constructs simplified A1111-style metadata with resource information "
                  "but without detailed LoRA hashes. Uses the custom sampler info node.")
    FUNCTION = "construct_lite"
    CATEGORY = "Sage Utils/depreciated"

    def construct_lite(self, model_info: dict, positive_string: str, negative_string: str,
                          width: int, height: int, sampler_info: dict, 
                          lora_stack: Optional[list] = None) -> tuple[str]:
        return self.construct_metadata(model_info=model_info, positive_string=positive_string, negative_string=negative_string,
                          width=width, height=height, sampler_info=sampler_info, metadata_style="A1111 Lite",
                          lora_stack=lora_stack)

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
    lora_to_prompt, 
    civitai_sampler_name,
    pull_metadata, 
    get_model_dict, 
    cache,
)
from ..utils import model_info as mi
from ..utils.model_info import collect_resource_hashes

# Constants
COMFYUI_VERSION = "v1.10-RC-6-comfyui"


class _BaseMetadataConstructor(ComfyNodeABC):
    """Base class for metadata construction nodes."""
    
    @classmethod
    def _get_common_input_types(cls):
        """Get common input types shared by all metadata constructors."""
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
    
    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ('param_metadata',)
    FUNCTION = "construct_metadata"
    CATEGORY = "Sage Utils/metadata"

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


class Sage_ConstructMetadata(_BaseMetadataConstructor):
    """Constructs comprehensive A1111-style metadata with full LoRA hash information."""

    @classmethod
    def INPUT_TYPES(cls):  # type: ignore
        return cls._get_common_input_types()

    DESCRIPTION = ("Constructs comprehensive A1111-style metadata with full LoRA hash information. "
                  "Uses the custom sampler info node. Returns a string that can be manipulated by other nodes.")

    def _process_lora_stack(self, lora_stack: Optional[list]) -> tuple[list[str], list[dict]]:
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

    def _build_metadata_string(self, positive_string: str, negative_string: str, 
                              sampler_info: dict, width: int, height: int,
                              model_info: dict, lora_stack: Optional[list] = None) -> str:
        """Build the complete metadata string."""
        lora_hashes, resource_hashes = self._process_lora_stack(lora_stack)
        
        # Build prompt section
        prompt_with_loras = f"{positive_string} {lora_to_prompt(lora_stack)}"
        lines = [prompt_with_loras]
        
        if negative_string.strip():
            lines.append(f"Negative prompt: {negative_string}")
        
        # Build parameter section using base class method
        base_params = self._build_base_params(sampler_info, width, height)
        params = (
            f"{base_params}, "
            f"{mi.model_name_and_hash_as_str(model_info)}, "
            f"Version: {COMFYUI_VERSION}"
        )
        
        # Add additional metadata if available
        if resource_hashes:
            params += f", Civitai resources: {json.dumps(resource_hashes)}"
        if lora_hashes:
            params += f", Lora hashes: {', '.join(lora_hashes)}"
        
        lines.append(params)
        return '\n'.join(lines[:-1]) + ', ' + lines[-1] if len(lines) > 1 else lines[0]

    def construct_metadata(self, model_info: dict, positive_string: str, negative_string: str, 
                          width: int, height: int, sampler_info: dict, 
                          lora_stack: Optional[list] = None) -> tuple[str]:
        """Construct comprehensive A1111-style metadata."""
        metadata = self._build_metadata_string(
            positive_string, negative_string, sampler_info, 
            width, height, model_info, lora_stack
        )
        return (metadata,)


class Sage_ConstructMetadataFlexible(_BaseMetadataConstructor):
    """Flexible metadata constructor with multiple style options."""

    @classmethod
    def INPUT_TYPES(cls):  # type: ignore
        inputs = cls._get_common_input_types()
        inputs["required"]["metadata_style"] = (
            ["A1111 Full", "A1111 Lite", "Simple"],
            {"default": "A1111 Full"}
        )
        return inputs

    DESCRIPTION = ("Flexible metadata constructor supporting multiple styles: "
                  "A1111 Full (with LoRA hashes), A1111 Lite (simplified), "
                  "and Simple (basic parameters only).")

    def _build_simple_metadata_string(self, positive_string: str, negative_string: str,
                                     sampler_info: dict, width: int, height: int) -> str:
        """Build simple metadata string with just basic parameters."""
        lines = [positive_string]
        
        if negative_string.strip():
            lines.append(f"Negative prompt: {negative_string}")
        
        # Just the base parameters
        base_params = self._build_base_params(sampler_info, width, height)
        lines.append(base_params)
        
        return '\n'.join(lines[:-1]) + ', ' + lines[-1] if len(lines) > 1 else lines[0]

    def _process_lora_stack(self, lora_stack: Optional[list]) -> tuple[list[str], list[dict]]:
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

    def construct_metadata(self, model_info: dict, positive_string: str, negative_string: str,
                          width: int, height: int, sampler_info: dict, metadata_style: str,
                          lora_stack: Optional[list] = None) -> tuple[str]:
        """Construct metadata using the selected style."""
        if metadata_style == "A1111 Full":
            # Use the same logic as Sage_ConstructMetadata
            lora_hashes, resource_hashes = self._process_lora_stack(lora_stack)
            
            # Build prompt section
            prompt_with_loras = f"{positive_string} {lora_to_prompt(lora_stack)}"
            lines = [prompt_with_loras]
            
            if negative_string.strip():
                lines.append(f"Negative prompt: {negative_string}")
            
            # Build parameter section
            base_params = self._build_base_params(sampler_info, width, height)
            params = (
                f"{base_params}, "
                f"{mi.model_name_and_hash_as_str(model_info)}, "
                f"Version: {COMFYUI_VERSION}"
            )
            
            # Add additional metadata if available
            if resource_hashes:
                params += f", Civitai resources: {json.dumps(resource_hashes)}"
            if lora_hashes:
                params += f", Lora hashes: {', '.join(lora_hashes)}"
            
            lines.append(params)
            metadata = '\n'.join(lines[:-1]) + ', ' + lines[-1] if len(lines) > 1 else lines[0]
            
        elif metadata_style == "A1111 Lite":
            # Use the same logic as Sage_ConstructMetadataLite
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
            
        elif metadata_style == "Simple":
            # Simple style with just basic parameters
            metadata = self._build_simple_metadata_string(
                positive_string, negative_string, sampler_info, width, height
            )
        else:
            # Fallback to A1111 Full if unknown style
            return self.construct_metadata(
                model_info, positive_string, negative_string, width, height, 
                sampler_info, "A1111 Full", lora_stack
            )
        
        return (metadata,)


class Sage_ConstructMetadataLite(_BaseMetadataConstructor):
    """Constructs simplified A1111-style metadata without LoRA hash details."""

    @classmethod
    def INPUT_TYPES(cls):  # type: ignore
        return cls._get_common_input_types()

    DESCRIPTION = ("Constructs simplified A1111-style metadata with resource information "
                  "but without detailed LoRA hashes. Uses the custom sampler info node.")

    def _build_lite_metadata_string(self, positive_string: str, negative_string: str,
                                   sampler_info: dict, width: int, height: int,
                                   resource_hashes: list[dict]) -> str:
        """Build the lite metadata string."""
        lines = [positive_string]
        
        if negative_string.strip():
            lines.append(f"Negative prompt: {negative_string}")
        
        # Build parameter section using base class method
        base_params = self._build_base_params(sampler_info, width, height)
        params = (
            f"{base_params}, "
            f"Version: {COMFYUI_VERSION}, "
            f"Civitai resources: {json.dumps(resource_hashes)}"
        )
        lines.append(params)
        
        return '\n'.join(lines[:-1]) + ', ' + lines[-1] if len(lines) > 1 else lines[0]

    def construct_metadata(self, model_info: dict, positive_string: str, negative_string: str,
                          width: int, height: int, sampler_info: dict,
                          lora_stack: Optional[list] = None) -> tuple[str]:
        """Construct simplified A1111-style metadata."""
        resource_hashes = collect_resource_hashes(model_info, lora_stack)
        metadata = self._build_lite_metadata_string(
            positive_string, negative_string, sampler_info,
            width, height, resource_hashes
        )
        return (metadata,)

# Metadata v3 nodes.
# Metadata nodes for constructing A1111-style metadata.

# This module includes nodes for constructing metadata and related nodes.
# Saving metadata is handled in the image nodes.

# See docs/ref_docs/v3_migration.md for info on migrating to v3 nodes.

from __future__ import annotations
from comfy_api.latest import io

from comfy_api.latest._io import NodeOutput, Schema

from pathlib import Path
import json
import re
from typing import Optional, Union

import folder_paths
import comfy.samplers

from ..utils.lora_utils import lora_to_prompt
from ..utils.helpers_civitai import civitai_sampler_name, get_model_dict
from ..utils.model_metadata import pull_metadata
from ..utils.model_cache import cache
from ..utils.model_info import collect_resource_hashes, model_name_and_hash_as_str, _get_model_name_from_info, _get_model_hash_from_info
from ..utils.config_manager import metadata_templates
from ..utils.logger import get_logger
from ..utils.constants import SAGE_UTILS_CAT

logger = get_logger('nodes.metadata')

from .custom_io_v3 import ModelInfo, LoraStack, SamplerInfo

# Constants
try:
    from comfyui_version import __version__ as comfy_version_number
    COMFYUI_VERSION = f"v{comfy_version_number}-comfyui"
except ImportError:
    COMFYUI_VERSION = "v1.10-RC-6-comfyui"

class Sage_ConstructMetadataFlexible(io.ComfyNode):
    """Flexible metadata constructor with multiple style options."""
    @classmethod
    def define_schema(cls):
        schema = io.Schema(
            node_id="Sage_ConstructMetadataFlexible",
            display_name="Construct Metadata Flexible",
            description="Flexible metadata constructor supporting multiple styles: A1111 Full (with LoRA hashes), A1111 Lite (simplified, only includes models on Civitai), Simple (No models or LoRAs) as well as any others defined in metadata_templates.",
            category=f"{SAGE_UTILS_CAT}/metadata",
            inputs=[
                ModelInfo.Input("model_info", display_name="model_info", tooltip="Model info used to build metadata, such as checkpoint and model details."),
                io.String.Input("positive_string", display_name="positive_string", default="", tooltip="The positive prompt text to include in metadata."),
                io.String.Input("negative_string", display_name="negative_string", default="", tooltip="The negative prompt text to include in metadata."),
                SamplerInfo.Input("sampler_info", display_name="sampler_info", tooltip="Sampler settings used to generate the image."),
                io.Int.Input("width", display_name="width", default=1024, tooltip="Image width used in metadata."),
                io.Int.Input("height", display_name="height", default=1024, tooltip="Image height used in metadata."),
                io.Combo.Input("metadata_style", display_name="metadata_style", 
                             options=list(metadata_templates.keys()),
                             default="A1111 Full", tooltip="The metadata style format to produce."),
                LoraStack.Input("lora_stack", display_name="lora_stack", optional=True, tooltip="Optional LoRA stack information to include in metadata."),
            ],
            outputs=[
                io.String.Output("param_metadata", display_name="param_metadata", tooltip="The generated metadata string." )
            ]
        )
        return schema

    @classmethod
    def _collect_metadata_components(cls, model_info: Union[dict, tuple], positive_string: str, negative_string: str,
                                   width: int, height: int, sampler_info: dict,
                                   lora_stack: Optional[list] = None) -> dict:
        """Collect all metadata components needed for any style."""
        def _flatten_model_info(info) -> list:
            """Recursively flatten model_info that may be nested tuples/lists of dicts."""
            if info is None:
                return []
            if isinstance(info, dict):
                return [info]
            if isinstance(info, (tuple, list)):
                flattened = []
                for item in info:
                    flattened.extend(_flatten_model_info(item))
                return flattened
            return []

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

        # Prompt components
        prompt_with_loras = f"{positive_string} {lora_to_prompt(lora_stack)}" if lora_stack else positive_string
        if negative_string is None:
            negative_prompt_line = ""
        else:
            negative_prompt_line = f"Negative prompt: {negative_string}"

        # Model and version info
        logger.debug(f"DEBUG: model_info in _collect_metadata_components: {model_info}")
        comfyui_version = COMFYUI_VERSION
        version_str = f"Version: {COMFYUI_VERSION}"
        flattened_models = _flatten_model_info(model_info)
        model_hash_str = model_name_and_hash_as_str(flattened_models)

        model_names = []
        model_hashes = []
        for info in flattened_models:
            if not isinstance(info, dict):
                continue
            if "path" in info and "hash" in info:
                model_names.append(_get_model_name_from_info(info))
                model_hashes.append(_get_model_hash_from_info(info))

        model_name = " + ".join(model_names) if model_names else ""
        model_hash = " + ".join(model_hashes) if model_hashes else ""
        
        # Resource hashes for lite version
        resource_hashes_json = json.dumps(collect_resource_hashes(flattened_models, lora_stack))
        
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

    @classmethod
    def _format_metadata_string(cls, template: str, components: dict) -> str:
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
    
    @classmethod
    def execute(cls, **kwargs):
        model_info = kwargs.get("model_info")
        positive_string = kwargs.get("positive_string", "")
        negative_string = kwargs.get("negative_string", "")
        width = kwargs.get("width", 1024)
        height = kwargs.get("height", 1024)
        sampler_info = kwargs.get("sampler_info", {})
        metadata_style = kwargs.get("metadata_style", "A1111 Full")
        lora_stack = kwargs.get("lora_stack", None)
        
        # Validate required inputs
        if model_info is None:
            return io.NodeOutput("Error: model_info is required")
        
        components = cls._collect_metadata_components(
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
        formatted_metadata = cls._format_metadata_string(template, components)
        
        return io.NodeOutput(formatted_metadata)


# ============================================================================

def _reverse_civitai_sampler_name(civitai_sampler_name_str):
    """
    Convert Civitai sampler name back to ComfyUI format.
    Extracts scheduler info and reverses the sampler name mapping.
    If not found in mapping, returns the name as-is (might already be ComfyUI format).
    For duplicate Civitai names, returns the first ComfyUI equivalent.
    Returns (sampler_name, scheduler_name).
    """
    # Mapping from ComfyUI to Civitai names
    comfy_to_civitai = {
        'ddim': 'DDIM',
        'dpm_2': 'DPM2',
        'dpm_2_ancestral': 'DPM2 a',
        'dpmpp_2s_ancestral': 'DPM++ 2S a',
        'dpmpp_2m': 'DPM++ 2M',
        'dpmpp_sde': 'DPM++ SDE',
        'dpmpp_2m_sde': 'DPM++ 2M SDE',
        'dpmpp_2m_sde_gpu': 'DPM++ 2M SDE',
        'dpmpp_3m_sde': 'DPM++ 3M SDE',
        'dpmpp_3m_sde_gpu': 'DPM++ 3M SDE',
        'dpm_fast': 'DPM fast',
        'dpm_adaptive': 'DPM adaptive',
        'euler_ancestral': 'Euler a',
        'euler': 'Euler',
        'heun': 'Heun',
        'lcm': 'LCM',
        'lms': 'LMS',
        'plms': 'PLMS',
        'uni_pc': 'UniPC',
        'uni_pc_bh2': 'UniPC'
    }
    
    # Build reverse mapping (first occurrence wins for duplicates)
    civitai_to_comfy = {}
    for comfy_name, civitai_name in comfy_to_civitai.items():
        if civitai_name not in civitai_to_comfy:  # First occurrence wins
            civitai_to_comfy[civitai_name] = comfy_name
    
    sampler_input = civitai_sampler_name_str.strip()
    scheduler = None
    
    # Extract scheduler from the end
    if sampler_input.endswith(" Karras"):
        scheduler = "karras"
        sampler_base = sampler_input[:-7].strip()  # Remove " Karras"
    elif sampler_input.endswith(" Exponential"):
        scheduler = "exponential"
        sampler_base = sampler_input[:-12].strip()  # Remove " Exponential"
    else:
        sampler_base = sampler_input
    
    # Look up in reverse mapping
    if sampler_base in civitai_to_comfy:
        return civitai_to_comfy[sampler_base], scheduler
    else:
        # Return as-is if not found (might already be ComfyUI name)
        return sampler_base, scheduler


def _normalize_scheduler_name(scheduler_name_str):
    """Normalize scheduler names from metadata to ComfyUI-style scheduler keys."""
    if scheduler_name_str is None:
        return "normal"

    normalized = str(scheduler_name_str).strip().lower()
    if normalized == "":
        return "normal"
    return normalized

# ============================================================================

class Sage_ParseMetadataFlexible(io.ComfyNode):
    """Reverse parser for A1111 Full format metadata string."""
    
    @classmethod
    def define_schema(cls):
        schema = io.Schema(
            node_id="Sage_ParseMetadataFlexible",
            display_name="Parse Metadata Flexible",
            description="Parses A1111 Full format metadata string and extracts individual components. Returns parsed values for positive prompt, negative prompt, sampler info (sampler, scheduler, cfg, steps, seed), dimensions (width, height), and attempts to find models and LoRAs by hash in the local cache.",
            category=f"{SAGE_UTILS_CAT}/metadata",
            inputs=[
                io.String.Input("metadata_string", display_name="metadata_string", multiline=True, tooltip="The metadata string to parse."),
                io.Int.Input("default_seed", display_name="default_seed", default=0, optional=True, tooltip="Default seed used when the metadata does not specify one."),
                io.Int.Input("default_steps", display_name="default_steps", default=20, min=1, max=10000, optional=True, tooltip="Default steps used when the metadata does not specify them."),
                io.Float.Input("default_cfg", display_name="default_cfg", default=7.0, min=0.0, max=100.0, step=0.1, optional=True, tooltip="Default CFG scale used when the metadata does not specify it."),
                io.Combo.Input("default_sampler", display_name="default_sampler",
                               options=comfy.samplers.SAMPLER_NAMES,
                               default="euler", optional=True, tooltip="Default sampler to use when the metadata string does not specify one."),
                io.Combo.Input("default_scheduler", display_name="default_scheduler",
                               options=comfy.samplers.SCHEDULER_NAMES,
                               default="normal", optional=True, tooltip="Default scheduler to use when the metadata string does not specify one."),
                io.Int.Input("default_width", display_name="default_width", default=1024, min=0, optional=True, tooltip="Default width used when the metadata does not specify dimensions."),
                io.Int.Input("default_height", display_name="default_height", default=1024, min=0, optional=True, tooltip="Default height used when the metadata does not specify dimensions."),
                ModelInfo.Input("default_model_info", display_name="default_model_info", optional=True, tooltip="Default model info used when the metadata string does not identify a model."),
            ],
            outputs=[
                io.String.Output("positive_string", display_name="positive_string", tooltip="Extracted positive prompt string."),
                io.String.Output("negative_string", display_name="negative_string", tooltip="Extracted negative prompt string."),
                io.Int.Output("seed", display_name="seed", tooltip="Extracted seed value."),
                io.Int.Output("steps", display_name="steps", tooltip="Extracted number of steps."),
                io.Float.Output("cfg", display_name="cfg", tooltip="Extracted CFG scale."),
                io.Combo.Output("sampler_name", display_name="sampler_name", tooltip="Extracted sampler name."),
                io.Combo.Output("scheduler", display_name="scheduler", tooltip="Extracted scheduler name."),
                io.Int.Output("width", display_name="width", tooltip="Extracted image width."),
                io.Int.Output("height", display_name="height", tooltip="Extracted image height."),
                ModelInfo.Output("model_info", display_name="model_info", tooltip="Extracted default model info from metadata, if available."),
                LoraStack.Output("lora_stack", display_name="lora_stack", tooltip="Extracted LoRA stack information from the metadata.")
            ]
        )
        return schema
    
    @classmethod
    def _parse_size_string(cls, size_str: str) -> tuple[int, int]:
        """Parse size string like '1024x768' into (width, height) tuple."""
        try:
            parts = size_str.split('x')
            if len(parts) == 2:
                return int(parts[0]), int(parts[1])
        except (ValueError, AttributeError):
            pass
        return 0, 0
    
    @classmethod
    def _extract_sampler_info(cls, base_params: str) -> dict:
        """Extract sampler information from base_params string."""
        info = {
            'steps': 20,
            'sampler': 'euler',
            'scheduler': 'normal',
            'cfg': 7.0,
            'seed': 0,
        }
        
        # Parse Steps
        steps_match = None
        for part in base_params.split(','):
            if 'Steps:' in part:
                try:
                    steps_match = part.split('Steps:')[1].strip().split()[0]
                    info['steps'] = int(steps_match)
                except (ValueError, IndexError):
                    pass
        
        # Parse Sampler (can have multiple words, extract until next comma)
        for part in base_params.split(','):
            if 'Sampler:' in part:
                try:
                    sampler_match = part.split('Sampler:')[1].strip()
                    # Reverse Civitai sampler name to ComfyUI format
                    reversed_sampler, extracted_scheduler = _reverse_civitai_sampler_name(sampler_match)
                    info['sampler'] = reversed_sampler
                    # If scheduler was found in sampler name, use it as default (can be overridden below)
                    if extracted_scheduler:
                        info['scheduler'] = _normalize_scheduler_name(extracted_scheduler)
                except (ValueError, IndexError):
                    pass
        
        # Parse scheduler (handle both "Scheduler type" and "Schedule type" variants)
        for part in base_params.split(','):
            part_stripped = part.strip()
            if part_stripped.startswith('Scheduler type:') or part_stripped.startswith('Schedule type:'):
                try:
                    scheduler_match = part_stripped.split(':', 1)[1].strip()
                    info['scheduler'] = _normalize_scheduler_name(scheduler_match)
                except (ValueError, IndexError):
                    pass
        
        # Parse CFG
        for part in base_params.split(','):
            if 'CFG scale:' in part:
                try:
                    cfg_match = part.split('CFG scale:')[1].strip().split()[0]
                    info['cfg'] = float(cfg_match)
                except (ValueError, IndexError):
                    pass
        
        # Parse Seed
        for part in base_params.split(','):
            if 'Seed:' in part:
                try:
                    seed_match = part.split('Seed:')[1].strip().split()[0]
                    info['seed'] = int(seed_match)
                except (ValueError, IndexError):
                    pass
        
        return info
    
    @classmethod
    def _extract_lora_tokens(cls, prompt: str) -> tuple[str, list[str]]:
        """Extract <lora:...> tokens from prompt and return (cleaned_prompt, lora_tokens)."""
        lora_pattern = r'<lora:([^>]+)>'
        lora_matches = re.findall(lora_pattern, prompt)
        cleaned_prompt = re.sub(lora_pattern, '', prompt).strip()
        
        return cleaned_prompt, lora_matches
    
    @classmethod
    def _parse_lora_token(cls, lora_token: str) -> tuple[str, float, float]:
        """Parse <lora:name:weight> format. Note: we extract model_weight as both weights."""
        parts = lora_token.split(':')
        if len(parts) >= 2:
            name = parts[0].strip()
            try:
                weight = float(parts[1].strip())
                # For simplicity, use same weight for both model and clip
                return name, weight, weight
            except (ValueError, IndexError):
                return name, 1.0, 1.0
        return lora_token, 1.0, 1.0

    @classmethod
    def _extract_model_hashes(cls, base_params: str) -> list:
        """Extract model short-hashes from base params. Returns list of hash strings."""
        model_hashes = []
        for part in base_params.split(','):
            if 'Model hash:' in part:
                try:
                    hash_val = part.split('Model hash:')[1].strip()
                    if hash_val:
                        model_hashes.append(hash_val)
                except IndexError:
                    pass
        return model_hashes

    @classmethod
    def _extract_lora_hashes(cls, base_params: str) -> list:
        """Extract lora (name, short_hash) pairs from base params Lora hashes field."""
        lora_pairs = []
        if 'Lora hashes:' not in base_params:
            return lora_pairs
        try:
            lora_section = base_params.split('Lora hashes:')[1].strip()
            # Each entry is "filename: hash", separated by ", "
            for entry in lora_section.split(','):
                entry = entry.strip()
                if ':' in entry:
                    parts = entry.split(':', 1)
                    name = parts[0].strip()
                    hash_val = parts[1].strip()
                    if name and hash_val:
                        lora_pairs.append((name, hash_val))
        except IndexError:
            pass
        return lora_pairs

    @classmethod
    def _find_model_by_hash(cls, short_hash: str):
        """Search cache for a model matching the given short hash prefix.
        Returns (file_path, type, full_hash) or (None, None, None)."""
        short_hash = short_hash.lower()
        for file_path, full_hash in cache.hash.items():
            if not full_hash.lower().startswith(short_hash):
                continue
            for ckpt_base in folder_paths.get_folder_paths("checkpoints"):
                if file_path.startswith(str(ckpt_base)):
                    return file_path, "CKPT", full_hash
            for unet_base in folder_paths.get_folder_paths("diffusion_models"):
                if file_path.startswith(str(unet_base)):
                    return file_path, "UNET", full_hash
        return None, None, None

    @classmethod
    def _find_lora_by_hash(cls, short_hash: str) -> Optional[str]:
        """Search cache for a lora matching the given short hash prefix.
        Returns a relative lora name suitable for folder_paths lookup, or None."""
        short_hash = short_hash.lower()
        for file_path, full_hash in cache.hash.items():
            if not full_hash.lower().startswith(short_hash):
                continue
            for lora_base in folder_paths.get_folder_paths("loras"):
                lora_base_str = str(lora_base)
                if file_path.startswith(lora_base_str):
                    try:
                        return str(Path(file_path).relative_to(lora_base_str))
                    except ValueError:
                        pass
        return None

    @classmethod
    def execute(cls, **kwargs):
        metadata_string = kwargs.get("metadata_string", "")

        default_sampler   = kwargs.get("default_sampler", "euler")
        default_scheduler = kwargs.get("default_scheduler", "normal")
        default_seed      = kwargs.get("default_seed", 0)
        default_steps     = kwargs.get("default_steps", 20)
        default_cfg       = float(kwargs.get("default_cfg", 7.0))
        default_width     = kwargs.get("default_width", 0)
        default_height    = kwargs.get("default_height", 0)
        default_model_info = kwargs.get("default_model_info", None)

        if not metadata_string or not isinstance(metadata_string, str):
            return io.NodeOutput(
                "",               # positive_string
                "",               # negative_string
                default_sampler,  # sampler_name
                default_scheduler,# scheduler
                default_seed,     # seed
                default_steps,    # steps
                default_cfg,      # cfg
                default_width,    # width
                default_height,   # height
                default_model_info,  # model_info
                None,             # lora_stack
            )
        
        # Split by "Negative prompt:" to separate positive and the rest
        if "Negative prompt:" in metadata_string:
            parts = metadata_string.split("Negative prompt:", 1)
            positive_with_lora = parts[0].strip()
            rest = parts[1].strip()
        else:
            # No negative prompt found, treat whole string as positive
            positive_with_lora = metadata_string
            rest = ""
        
        # Extract LoRA tokens from positive prompt
        positive_string, lora_tokens = cls._extract_lora_tokens(positive_with_lora)

        # Parse lora token weights (stem -> weight) for use when building lora_stack
        lora_token_weights = {}
        for token in lora_tokens:
            name, model_weight, _ = cls._parse_lora_token(token)
            lora_token_weights[Path(name).stem.lower()] = model_weight

        # Find where negative prompt ends (at first newline after negative)
        negative_string = ""
        base_params = ""
        
        if rest:
            # The rest contains negative prompt, then parameters
            lines = rest.split('\n')
            if len(lines) > 0:
                negative_string = lines[0].strip()
            
            # Combine remaining lines as base_params and model/version info
            if len(lines) > 1:
                base_params = '\n'.join(lines[1:]).strip()
        
        # Parse the base params and additional info
        # Format: Steps: X, Sampler: Y, Scheduler type: Z, CFG scale: W, Seed: S, Size: WxH, Model: ..., Model hash: ..., Version: ..., ...
        sampler_info_dict = cls._extract_sampler_info(base_params)
        
        # Extract dimensions
        width, height = 0, 0
        for part in base_params.split(','):
            if 'Size:' in part:
                try:
                    size_str = part.split('Size:')[1].strip().split()[0]
                    width, height = cls._parse_size_string(size_str)
                except (ValueError, IndexError):
                    pass

        # Search cache for models by hash
        model_info_result = None
        model_infos = []
        for short_hash in cls._extract_model_hashes(base_params):
            file_path, model_type, full_hash = cls._find_model_by_hash(short_hash)
            if file_path and model_type:
                model_infos.append({"type": model_type, "path": file_path, "hash": full_hash})
        if model_infos:
            model_info_result = tuple(model_infos)

        # Search cache for loras by hash and build lora_stack
        lora_stack_result = None
        lora_entries = []
        for lora_name, short_hash in cls._extract_lora_hashes(base_params):
            lora_rel = cls._find_lora_by_hash(short_hash)
            if lora_rel:
                stem = Path(lora_name).stem.lower()
                weight = lora_token_weights.get(stem, 1.0)
                lora_entries.append((lora_rel, weight, weight))
        if lora_entries:
            lora_stack_result = lora_entries

        return io.NodeOutput(
            positive_string,  # positive_string
            negative_string,  # negative_string
            sampler_info_dict.get('seed', 0) or default_seed,           # seed
            sampler_info_dict.get('steps', 0) or default_steps,         # steps
            float(sampler_info_dict.get('cfg', 0.0)) or default_cfg,    # cfg
            sampler_info_dict.get('sampler', '') or default_sampler,    # sampler_name
            sampler_info_dict.get('scheduler', '') or default_scheduler, # scheduler
            width or default_width,   # width
            height or default_height, # height
            model_info_result if model_info_result is not None else default_model_info,  # model_info
            lora_stack_result,  # lora_stack (None if not found in cache)
        )


# ============================================================================

METADATA_NODES = [
    # metadata nodes
    Sage_ConstructMetadataFlexible,
    Sage_ParseMetadataFlexible
]

# This module provides utilities for working with the model_info input/output in ComfyUI.

from typing import Optional
import folder_paths
from .helpers import name_from_path, pull_metadata
from .model_cache import cache
from .lora_stack import norm_lora_stack

weight_dtype_options = ["default", "fp8_e4m3fn", "fp8_e4m3fn_fast", "fp8_e5m2"]
single_clip_loader_options = ["stable_diffusion", "stable_cascade", "sd3", "stable_audio", "mochi", "ltxv", "pixart", "cosmos", "lumina2", "wan", "hidream", "chroma", "ace", "omnigen2", "qwen_image"]
dual_clip_loader_options = ["sdxl", "sd3", "flux", "hunyuan_video", "hidream"]

def get_model_info_ckpt(ckpt_name: str) -> tuple:
    """
    Returns a model_info output for a checkpoint (CKPT) file.
    
    Args:
        ckpt_name (str): The name of the checkpoint file.
    
    Returns:
        tuple: A tuple containing the model_info dictionary.
    """
    model_info = {"type": "CKPT", "path": folder_paths.get_full_path_or_raise("checkpoints", ckpt_name)}
    pull_metadata(model_info["path"])
    model_info["hash"] = cache.hash[model_info["path"]]
    return (model_info,)

def get_model_info_unet(unet_name: str, weight_dtype: str = "default") -> tuple:
    """
    Returns a model_info output for a UNET file.
    
    Args:
        unet_name (str): The name of the UNET file.
        weight_dtype (str, optional): The weight data type of the UNET. Defaults to None.
    
    Returns:
        tuple: A tuple containing the model_info dictionary.
    """
    for base in folder_paths.get_folder_paths("diffusion_models"):
        if unet_name.startswith(base):
            unet_name = unet_name[len(base):].lstrip("/\\")
            break
    model_info = {"type": "UNET", "path": folder_paths.get_full_path_or_raise("diffusion_models", unet_name)}
    pull_metadata(model_info["path"])
    model_info["hash"] = cache.hash[model_info["path"]]
    if weight_dtype and (weight_dtype in weight_dtype_options):
        model_info["weight_dtype"] = weight_dtype
    else:
        model_info["weight_dtype"] = "default"
        print(f"Warning: Invalid weight_dtype '{weight_dtype}'. Using default 'default'. Valid options are: {', '.join(weight_dtype_options)}")
    print(f"UNET model info: {model_info}")
    return (model_info,)

def get_model_info_clips(clip_names: list, clip_type: str = "") -> tuple:
    """
    Returns a model_info output for multiple CLIP files.

    Args:
        clip_names (list): A list of CLIP file names.
        clip_type (str, optional): The type of CLIP files. Defaults to "".

    Returns:
        tuple: A tuple containing the model_info dictionaries.
    """
    
    if len(clip_names) == 0:
        raise ValueError("clip_names must contain at least one CLIP file name.")
    if len(clip_names) > 4:
        raise ValueError("clip_names can contain a maximum of 4 CLIP file names.")
    
    clip_paths = []
    for key in clip_names:
        name = folder_paths.get_full_path_or_raise("text_encoders", key)
        pull_metadata(name)
        clip_paths.append(name)

    model_info = {
        "type": "CLIP",
        "path": clip_paths,
        "hash": [cache.hash[name] for name in clip_paths],
        "clip_type": clip_type
    }

    print(f"CLIP model info: {model_info}")
    return (model_info,)

def get_model_info_vae(vae_name: str) -> tuple:
    """
    Returns a model_info output for a VAE file.
    
    Args:
        vae_name (str): The name of the VAE file.
    
    Returns:
        tuple: A tuple containing the model_info dictionary.
    """
    model_info = {"type": "VAE", "path": folder_paths.get_full_path_or_raise("vae", vae_name)}
    pull_metadata(model_info["path"])
    model_info["hash"] = cache.hash[model_info["path"]]
    print(f"VAE model info: {model_info}")
    return (model_info,)

def model_name_and_hash_as_str(model_info) -> str:
    """
    Returns a string representation of the model name and hash.
    
    Args:
        model_info (dict): The model_info dictionary containing the model path and hash.
    """
    model_string = ""
    if isinstance(model_info, tuple) or isinstance(model_info, list):
        model_list = []
        for info in model_info:    
            model_name = _get_model_name_from_info(info)
            model_hash = _get_model_hash_from_info(info)
            model_list.append(f"Model: {model_name}, Model hash: {model_hash}")
        model_string = ", ".join(model_list)
    else:
        if isinstance(model_info, dict) and "path" in model_info and "hash" in model_info:
            model_name = _get_model_name_from_info(model_info)
            model_hash = _get_model_hash_from_info(model_info)
            model_string = f"Model: {model_name}, Model hash: {model_hash}"

    return model_string


def _get_model_name_from_info(model_info: dict) -> str:
    """
    Extract model name from model_info, handling both single paths and path lists (for CLIP).
    
    Args:
        model_info (dict): The model_info dictionary.
        
    Returns:
        str: The model name(s).
    """
    path = model_info['path']
    if isinstance(path, list):
        # Handle CLIP models with multiple paths
        names = [name_from_path(p) for p in path]
        return " + ".join(names)
    else:
        # Handle single path models (CKPT, UNET, VAE)
        return name_from_path(path)


def _get_model_hash_from_info(model_info: dict) -> str:
    """
    Extract model hash from model_info, handling both single hashes and hash lists (for CLIP).
    
    Args:
        model_info (dict): The model_info dictionary.
        
    Returns:
        str: The model hash(es).
    """
    hash_value = model_info['hash']
    if isinstance(hash_value, list):
        # Handle CLIP models with multiple hashes
        return " + ".join(hash_value)
    else:
        # Handle single hash models (CKPT, UNET, VAE)
        return hash_value

def get_model_info_component(models_info: tuple, component_type: str) -> dict:
    """
    Returns the model_info for a specific component type (UNET, CLIP, VAE) from a tuple of model_info dictionaries.
    
    Handles model_info dictionaries where:
    - For most types (CKPT, UNET, VAE): "path" is a string, "hash" is a string
    - For CLIP type: "path" can be a list of paths, "hash" can be a list of hashes
    
    Args:
        models_info (tuple): A tuple of model_info dictionaries to search through.
        component_type (str): The type of component to retrieve (UNET, CLIP, VAE, CKPT).
    
    Returns:
        dict: The model_info dictionary for the specified component type, or empty dict if not found.
    """
    print(f"Searching for component type: {component_type} in models_info: {models_info}")
    if not isinstance(models_info, tuple):
        models_info = (models_info,)
    
    for model_info in models_info:
        print(f"Checking model_info: {model_info}")
        if model_info is None:
            continue
        if model_info.get("type") == component_type:
            return model_info
    
    return {}


def collect_resource_hashes(model_info, lora_stack: Optional[list] = None) -> list[dict]:
    """Collect all resource hashes for metadata generation.
    
    Args:
        model_info (dict or tuple): The model information dictionary or tuple containing path and other details.
                                   For CLIP models, "path" may be a list of paths.
        lora_stack (list, optional): List of LoRA configurations. Each item should be a tuple/list
                                   with format [lora_name, model_weight, clip_weight]. Defaults to None.
    
    Returns:
        list[dict]: List of resource hash dictionaries for the model and any LoRAs.
    """
    from .helpers import get_model_dict
    
    resource_hashes = []
    lora_stack = norm_lora_stack(lora_stack)
    
    # Handle model_info - could be a tuple or a single dictionary
    if isinstance(model_info, tuple) or isinstance(model_info, list):
        # Process each model_info in the tuple
        for info in model_info:
            if info is None or not isinstance(info, dict):
                continue
            model_path = info.get('path')
            if model_path:
                if isinstance(model_path, list):
                    # CLIP model with multiple paths - add each path separately
                    for path in model_path:
                        model_dict = get_model_dict(path)
                        if model_dict:
                            resource_hashes.append(model_dict)
                else:
                    # Single path model (CKPT, UNET, VAE)
                    model_dict = get_model_dict(model_path)
                    if model_dict:
                        resource_hashes.append(model_dict)
    else:
        # Handle single model_info dictionary
        if isinstance(model_info, dict) and 'path' in model_info:
            model_path = model_info['path']
            if isinstance(model_path, list):
                # CLIP model with multiple paths - add each path separately
                for path in model_path:
                    model_dict = get_model_dict(path)
                    if model_dict:
                        resource_hashes.append(model_dict)
            else:
                # Single path model (CKPT, UNET, VAE)
                model_dict = get_model_dict(model_path)
                if model_dict:
                    resource_hashes.append(model_dict)
    
    # Add LoRA resources
    if lora_stack:
        for lora in lora_stack:
            lora_path = folder_paths.get_full_path_or_raise("loras", lora[0])
            pull_metadata(lora_path)
            lora_data = get_model_dict(lora_path, lora[1])
            if lora_data:
                resource_hashes.append(lora_data)
    
    return resource_hashes
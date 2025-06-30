# This module provides utilities for working with the model_info input/output in ComfyUI.

import folder_paths
from .helpers import name_from_path, pull_metadata
from .model_cache import cache
weight_dtype_options = ["default", "fp8_e4m3fn", "fp8_e4m3fn_fast", "fp8_e5m2"]
single_clip_loader_options = ["stable_diffusion", "stable_cascade", "sd3", "stable_audio", "mochi", "ltxv", "pixart", "cosmos", "lumina2", "wan", "hidream", "chroma", "ace", "omnigen2"]
dual_clip_loader_options = ["sdxl", "sd3", "flux", "hunyuan_video", "hidream"]

# Abstracting things first, then we can change the implementation to be more flexible.
# Right now, mostly supports checkpoints, but we should be supporting UNET, Clip, and VAE files as well.
# As a checkpoint has a unet, clip, and vae in it, we'll need to be able to use both.

def get_model_info_ckpt(ckpt_name: str) -> tuple:
    """
    Returns a model_info output for a checkpoint (CKPT) file.
    
    Args:
        ckpt_name (str): The name of the checkpoint file.
    
    Returns:
        tuple: A tuple containing the model_info dictionary.
    """
    model_info = {"type": "CKPT", "path": folder_paths.get_full_path_or_raise("checkpoints", ckpt_name)}
    pull_metadata(model_info["path"], timestamp=True)
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
    pull_metadata(model_info["path"], timestamp=True)
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
        pull_metadata(name, timestamp=True)
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
    pull_metadata(model_info["path"], timestamp=True)
    model_info["hash"] = cache.hash[model_info["path"]]
    print(f"VAE model info: {model_info}")
    return (model_info,)

def get_model_clip_vae_from_info(model_info) -> tuple:
    """
    Extracts the model, clip, and vae from a model_info dictionary.
    
    Args:
        model_info (dict): The model_info dictionary containing the model path.
    
    Returns:
        tuple: A tuple containing the model, clip, and vae.
    """
    from . import loaders  # Import here to avoid circular dependency

    # If model_info is a tuple, extract the first element
    if isinstance(model_info, tuple):
        model_info = model_info[0]

    if model_info["type"] != "CKPT":
        raise ValueError("Clip information is missing. Please use a checkpoint for model_info, not a diffusion model.")

    if "path" not in model_info:
        raise ValueError("model_info must contain a 'path' key.")

    model_path = model_info["path"]
    return loaders.checkpoint(model_path)

def model_name_and_hash_as_str(model_info) -> str:
    """
    Returns a string representation of the model name and hash.
    
    Args:
        model_info (dict): The model_info dictionary containing the model path and hash.
    """
    model_string = ""
    if isinstance(model_info, tuple):
        model_list = []
        for info in model_info:    
            model_name = name_from_path(info['path'])
            model_hash = info['hash']
            model_list.append(f"Model: {model_name}, Model hash: {model_hash}")
        model_string = ", ".join(model_list)
    else:
        if isinstance(model_info, dict) and "path" in model_info and "hash" in model_info:
            model_name = name_from_path(model_info['path'])
            model_hash = model_info['hash']
            model_string = f"Model: {model_name}, Model hash: {model_hash}"

    return model_string

def get_model_info_component(models_info: tuple, component_type: str) -> dict:
    """
    Returns the model_info for a specific component type (UNET, CLIP, VAE) from a list of model_info dictionaries.
    
    Args:
        model_info_list (list): A list of model_info dictionaries.
        component_type (str): The type of component to retrieve (UNET, CLIP, VAE).
    
    Returns:
        dict: The model_info dictionary for the specified component type.
    """
    print (f"Searching for component type: {component_type} in models_info: {models_info}")
    if not isinstance(models_info, tuple):
        models_info = (models_info,)
    for model_info in models_info:
        print(f"Checking model_info: {model_info}")
        if model_info is None:
            continue
        if model_info["type"] == component_type:
            return model_info
    return {}
from .helpers import pull_metadata
from .lora_stack import get_lora_stack_keywords
import comfy
import folder_paths

import comfy.utils
import comfy.sd

from nodes import VAELoader, UNETLoader, CLIPLoader, DualCLIPLoader
from comfy_extras.nodes_sd3 import TripleCLIPLoader
from comfy_extras.nodes_hidream import QuadrupleCLIPLoader

loaded_loras = {}

def lora(model, clip, lora_name, strength_model, strength_clip):
    if not (strength_model or strength_clip):
        return model, clip

    lora_path = folder_paths.get_full_path_or_raise("loras", lora_name)
    pull_metadata(lora_path, timestamp=True)

    the_lora = loaded_loras.get(lora_path)
    if the_lora is not None:
        print(f"Using comfyui's cached lora for {lora_path}")
    else:
        print(f"Loading lora from {lora_path}")
        the_lora = comfy.utils.load_torch_file(lora_path, safe_load=True)
        loaded_loras[lora_path] = the_lora

    return comfy.sd.load_lora_for_models(model, clip, the_lora, strength_model, strength_clip)

def lora_stack(model, clip, pbar, lora_stack=None):
    if not lora_stack:
        print("No lora stacks found. Warning: Passing 'None' to lora_stack output.")
        return model, clip, None, ""
    pbar = comfy.utils.ProgressBar(len(lora_stack))

    for a_lora in lora_stack:
        if a_lora:
            model, clip = lora(model, clip, *a_lora)
        pbar.update(1)
    keywords = get_lora_stack_keywords(lora_stack)
    return model, clip, lora_stack, keywords

def checkpoint(ckpt_path):
    out = comfy.sd.load_checkpoint_guess_config(
        ckpt_path,
        output_vae=True,
        output_clip=True,
        embedding_directory=folder_paths.get_folder_paths("embeddings")
    )
    return out[:3]

def unet(unet_path, weight_dtype):
    if not unet_path:
        raise ValueError("unet_path must be provided.")
    if not isinstance(unet_path, str):
        raise ValueError("unet_path must be a string.")
    if not weight_dtype:
        weight_dtype = "default"

    unet_name = ""
    for base in folder_paths.get_folder_paths("diffusion_models"):
        if unet_path.startswith(base):
            unet_name = unet_path[len(base):].lstrip("/\\")
            break
    
    unet = UNETLoader()
    ret = unet.load_unet(unet_name, weight_dtype)

    return ret

def unet_from_info(unet_info):
    if isinstance(unet_info, tuple):
        unet_info = unet_info[0]
    if "path" not in unet_info:
        raise ValueError("unet_info must contain a 'path' key.")
    if "weight_dtype" not in unet_info:
        unet_info["weight_dtype"] = "default"
    return unet(unet_info["path"], unet_info["weight_dtype"])[0]

def clip_from_info(clip_info):
    clip_paths =[]
    clip_type = ""

    if isinstance(clip_info, tuple):
        clip_info = clip_info[0]
    if "path" not in clip_info:
        raise ValueError("clip_info must contain a 'path' key.")
    if "clip_type" not in clip_info:
        if len(clip_info["path"]) == 1:
            clip_info["clip_type"] = "stable_diffusion"
        elif len(clip_info["path"]) == 2:
            clip_info["clip_type"] = "sdxl"
        else:
            clip_info["clip_type"] = "default"
    if "type" not in clip_info:
        clip_info["type"] = "CLIP"
    return clip(clip_info["path"], clip_info["clip_type"])

def clip(clip_path, clip_type="stable_diffusion"):
    num_of_clips = len(clip_path) if isinstance(clip_path, list) else 1
    if num_of_clips == 0:
        raise ValueError("clip_path must contain at least one CLIP file name.")
    if num_of_clips > 4:
        raise ValueError("clip_path can contain a maximum of 4 CLIP file names.")
    if isinstance(clip_path, str):
        clip_path = [clip_path]
    
    for path in clip_path:
        for base in folder_paths.get_folder_paths("text_encoders"):
            if path.startswith(base):
                clip_path[clip_path.index(path)] = path[len(base):].lstrip("/\\")
                break
    
    if num_of_clips == 1:
        clip = CLIPLoader()
        print(f"Loading single CLIP model from {clip_path[0]} with type {clip_type}")
        return clip.load_clip(clip_name=clip_path[0], type=clip_type)[0]
    elif num_of_clips == 2:
        print(f"Loading dual CLIP models from {clip_path[0]} and {clip_path[1]} with type {clip_type}")
        clipclip = DualCLIPLoader()
        return clipclip.load_clip(clip_name1=clip_path[0], clip_name2=clip_path[1], type=clip_type)[0]
    elif num_of_clips == 3:
        print(f"Loading triple CLIP models from {clip_path[0]}, {clip_path[1]}, and {clip_path[2]}")
        clipclipclip = TripleCLIPLoader()
        return clipclipclip.load_clip(clip_name1=clip_path[0], clip_name2=clip_path[1], clip_name3=clip_path[2])[0]
    elif num_of_clips == 4:
        print(f"Loading quadruple CLIP models from {clip_path[0]}, {clip_path[1]}, {clip_path[2]}, and {clip_path[3]}")
        clipclipclipclip = QuadrupleCLIPLoader()
        return clipclipclipclip.load_clip(clip_name1=clip_path[0], clip_name2=clip_path[1], clip_name3=clip_path[2], clip_name4=clip_path[3])[0]
    return None

def vae(vae_info):
    if isinstance(vae_info, tuple):
        vae_info = vae_info[0]
    if "path" not in vae_info:
        raise ValueError("vae_info must contain a 'path' key.")
    
    vae_name = vae_info["path"]
    
    for base in folder_paths.get_folder_paths("vae"):
        if vae_name.startswith(base):
            vae_name = vae_name[len(base):].lstrip("/\\")
            break
    return VAELoader.load_vae(None, vae_name)[0]

def load_lora_stack_with_keywords(model, clip, pbar, lora_stack_data):
    """Load lora stack and return keywords."""
    print("Loading lora stack...")
    keywords = ""
    if lora_stack_data is not None:
        model, clip, lora_stack_data, keywords = lora_stack(model, clip, pbar, lora_stack_data)
    return (model, clip, lora_stack_data, keywords)

def load_model_component(model_info, component_type, pbar = None):
    """Load a specific model component if present."""
    from . import model_info as mi  # Import here to avoid circular import
    
    component_info = mi.get_model_info_component(model_info, component_type)
    if not component_info:
        return None
        
    print(f"Loading {component_type} from {component_info['path']}")
    
    loaders_map = {
        "CKPT": lambda info: mi.get_model_clip_vae_from_info(info),
        "UNET": lambda info: unet_from_info(info),
        "CLIP": lambda info: clip_from_info(info),
        "VAE": lambda info: vae(info)
    }
    
    result = loaders_map[component_type](component_info)
    if pbar:
        pbar.update(1)
    return result

def get_model_component(model_info, component_type):
    """Get a specific model component without loading."""
    from . import model_info as mi  # Import here to avoid circular import
    
    component_info = mi.get_model_info_component(model_info, component_type)
    if not component_info:
        return None
        
    print(f"Getting {component_type} from {component_info['path']}")
    
    getters_map = {
        "CKPT": lambda info: mi.get_model_clip_vae_from_info(info),
        "UNET": lambda info: unet_from_info(info),
        "CLIP": lambda info: clip_from_info(info),
        "VAE": lambda info: vae(info)
    }
    
    return getters_map[component_type](component_info)
from .helpers import pull_metadata
from .lora_stack import get_lora_stack_keywords
import comfy
import folder_paths

import torch
import comfy.utils
import comfy.sd

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
    model_options = {}
    if weight_dtype == "fp8_e4m3fn":
        model_options["dtype"] = torch.float8_e4m3fn
    elif weight_dtype == "fp8_e4m3fn_fast":
        model_options["dtype"] = torch.float8_e4m3fn
        model_options["fp8_optimizations"] = True
    elif weight_dtype == "fp8_e5m2":
        model_options["dtype"] = torch.float8_e5m2

    return comfy.sd.load_diffusion_model(unet_path, model_options=model_options)
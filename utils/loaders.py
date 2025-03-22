
from .helpers import pull_metadata
from .lora_stack import get_lora_stack_keywords
import comfy
import folder_paths

import torch

loaded_loras = {}

def sage_load_lora(model, clip, lora_name, strength_model, strength_clip):
    if not (strength_model or strength_clip):
        return model, clip

    lora_path = folder_paths.get_full_path_or_raise("loras", lora_name)

    if lora_path in loaded_loras:
        lora = loaded_loras[lora_path]
        print(f"Using cached lora for {lora_path}")
    else:
        print(f"Loading lora from {lora_path}")
        pull_metadata(lora_path, True)
        lora = comfy.utils.load_torch_file(lora_path, safe_load=True)
        loaded_loras[lora_path] = lora

    return comfy.sd.load_lora_for_models(model, clip, lora, strength_model, strength_clip)

def sage_load_lora_stack(model, clip, pbar, lora_stack=None):
    if not lora_stack:
        print("No lora stacks found. Warning: Passing 'None' to lora_stack output.")
        return model, clip, None, ""
    pbar = comfy.utils.ProgressBar(len(lora_stack))

    for lora in lora_stack:
        if lora:
            model, clip = sage_load_lora(model, clip, *lora)
        pbar.update(1)
    return model, clip, lora_stack, get_lora_stack_keywords(lora_stack)

def sage_load_checkpoint(ckpt_path):
    out = comfy.sd.load_checkpoint_guess_config(ckpt_path, output_vae=True, output_clip=True, embedding_directory=folder_paths.get_folder_paths("embeddings"))
    return out[:3]

def sage_load_unet(unet_path, weight_dtype):
    model_options = {}
    if weight_dtype == "fp8_e4m3fn":
        model_options["dtype"] = torch.float8_e4m3fn
    elif weight_dtype == "fp8_e4m3fn_fast":
        model_options["dtype"] = torch.float8_e4m3fn
        model_options["fp8_optimizations"] = True
    elif weight_dtype == "fp8_e5m2":
        model_options["dtype"] = torch.float8_e5m2

    model = comfy.sd.load_diffusion_model(unet_path, model_options=model_options)
    return model
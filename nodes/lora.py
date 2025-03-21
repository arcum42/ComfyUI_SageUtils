# Lora nodes
# This includes nodes involving loras and lora stacks.

from ..sage import *

import comfy
import folder_paths
from comfy.comfy_types import IO, ComfyNodeABC, InputTypeDict

import pathlib


class Sage_LoraStack(ComfyNodeABC):
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "enabled": ("BOOLEAN", {"defaultInput": False, "default": True}),
                "lora_name": (folder_paths.get_filename_list("loras"), {"defaultInput": False, "tooltip": "The name of the LoRA."}),
                "model_weight": ("FLOAT", {"defaultInput": False, "default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01, "tooltip": "How strongly to modify the diffusion model. This value can be negative."}),
                "clip_weight": ("FLOAT", {"defaultInput": False, "default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01, "tooltip": "How strongly to modify the CLIP model. This value can be negative."}),
                },
            "optional": {
                "lora_stack": ("LORA_STACK", {"defaultInput": True}),
            }
        }

    RETURN_TYPES = ("LORA_STACK",)
    RETURN_NAMES = ("lora_stack",)

    FUNCTION = "add_lora_to_stack"
    CATEGORY = "Sage Utils/lora"
    DESCRIPTION = "Choose a lora with weights, and add it to a lora_stack. Compatable with other node packs that have lora_stacks."

    def add_lora_to_stack(self, enabled, lora_name, model_weight, clip_weight, lora_stack = None):
        if enabled == True:
            stack = add_lora_to_stack(lora_name, model_weight, clip_weight, lora_stack)
        else:
            stack = lora_stack

        return (stack,)

class Sage_LoraStackRecent(ComfyNodeABC):
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(s):
        lora_list = get_recently_used_models("loras")
        return {
            "required": {
                "enabled": ("BOOLEAN", {"defaultInput": False, "default": True}),
                "lora_name": (lora_list, {"defaultInput": False, "tooltip": "The name of the LoRA."}),
                "model_weight": ("FLOAT", {"defaultInput": False, "default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01, "tooltip": "How strongly to modify the diffusion model. This value can be negative."}),
                "clip_weight": ("FLOAT", {"defaultInput": False, "default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01, "tooltip": "How strongly to modify the CLIP model. This value can be negative."}),
                },
            "optional": {
                "lora_stack": ("LORA_STACK", {"defaultInput": True}),
            }
        }

    RETURN_TYPES = ("LORA_STACK",)
    RETURN_NAMES = ("lora_stack",)

    FUNCTION = "add_lora_to_stack"
    CATEGORY = "Sage Utils/lora"
    DESCRIPTION = "Choose a lora with weights, and add it to a lora_stack. Compatable with other node packs that have lora_stacks."

    def add_lora_to_stack(self, enabled, lora_name, model_weight, clip_weight, lora_stack = None):
        if enabled == True:
            stack = add_lora_to_stack(lora_name, model_weight, clip_weight, lora_stack)
        else:
            stack = lora_stack

        return (stack,)

class Sage_TripleLoraStack(ComfyNodeABC):
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(s):
        required_list = {}
        for i in range(1, 4):
            required_list[f"enabled_{i}"] = ("BOOLEAN", {"defaultInput": False, "default": True})
            required_list[f"lora_{i}_name"] = (folder_paths.get_filename_list("loras"), {"defaultInput": False, "tooltip": "The name of the LoRA."})
            required_list[f"model_{i}_weight"] = ("FLOAT", {"defaultInput": False, "default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01, "tooltip": "How strongly to modify the diffusion model. This value can be negative."})
            required_list[f"clip_{i}_weight"] = ("FLOAT", {"defaultInput": False, "default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01, "tooltip": "How strongly to modify the CLIP model. This value can be negative."})
        
        ret_list = {}
        ret_list["required"] = required_list
        ret_list["optional"] = {
            "lora_stack": ("LORA_STACK", {"defaultInput": True}),
        }
        return ret_list

    RETURN_TYPES = ("LORA_STACK",)
    RETURN_NAMES = ("lora_stack",)

    FUNCTION = "add_lora_to_stack"
    CATEGORY = "Sage Utils/lora"
    DESCRIPTION = "Choose three loras with weights, and add them to a lora_stack. Compatable with other node packs that have lora_stacks."

    def add_lora_to_stack(self, **args):
        stack = args.get("lora_stack", None)

        for i in range(1, len(args) // 4 + 1):
            enabled = args[f"enabled_{i}"]
            lora_name = args[f"lora_{i}_name"]
            model_weight = args[f"model_{i}_weight"]
            clip_weight = args[f"clip_{i}_weight"]

            if enabled == True:
                print(f"Adding {lora_name} to stack with model weight {model_weight} and clip weight {clip_weight}")
                stack = add_lora_to_stack(lora_name, model_weight, clip_weight, stack)
        return (stack,)

class Sage_CollectKeywordsFromLoraStack(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "lora_stack": ("LORA_STACK", {"defaultInput": True})
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("keywords",)

    FUNCTION = "get_keywords"

    CATEGORY = "Sage Utils/lora"
    DESCRIPTION = "Go through each model in the lora stack, grab any keywords from civitai, and combine them into one string. Place at the end of a lora_stack, or you won't get keywords for the entire stack."

    def get_keywords(self, lora_stack):
        if lora_stack is None:
            return ("",)

        return (get_lora_stack_keywords(lora_stack),)

# Modified version of the main lora loader.
class Sage_LoraStackLoader(ComfyNodeABC):
    def __init__(self):
        self.loaded_lora = None

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "model": ("MODEL", {"tooltip": "The diffusion model the LoRA will be applied to."}),
                "clip": ("CLIP", {"tooltip": "The CLIP model the LoRA will be applied to."})
            },
            "optional": {
                "lora_stack": ("LORA_STACK", {"defaultInput": True})
            }
        }

    RETURN_TYPES = ("MODEL", "CLIP", "LORA_STACK", "STRING")
    RETURN_NAMES = ("model", "clip", "lora_stack", "keywords")
    OUTPUT_TOOLTIPS = ("The modified diffusion model.", "The modified CLIP model.", "The stack of loras.", "Keywords from the lora stack.")
    FUNCTION = "load_all"

    CATEGORY = "Sage Utils/lora"
    DESCRIPTION = "Accept a lora_stack with Model and Clip, and apply all the loras in the stack at once."

    def load_lora(self, model, clip, lora_name, strength_model, strength_clip):
        if not (strength_model or strength_clip):
            return model, clip

        lora_path = folder_paths.get_full_path_or_raise("loras", lora_name)

        if self.loaded_lora and self.loaded_lora[0] == lora_path:
            lora = self.loaded_lora[1]
        else:
            pull_metadata(lora_path, True)
            lora = comfy.utils.load_torch_file(lora_path, safe_load=True)
            self.loaded_lora = (lora_path, lora)

        return comfy.sd.load_lora_for_models(model, clip, lora, strength_model, strength_clip)

    def load_loras(self, model, clip, pbar, lora_stack=None):
        if not lora_stack:
            print("No lora stacks found. Warning: Passing 'None' to lora_stack output.")
            return model, clip, None, ""
        pbar = comfy.utils.ProgressBar(len(lora_stack))

        for lora in lora_stack:
            if lora:
                model, clip = self.load_lora(model, clip, *lora)
            pbar.update(1)
        return model, clip, lora_stack, get_lora_stack_keywords(lora_stack)
    
    def load_all(self, model, clip, lora_stack=None):
        stack_length = len(lora_stack) if lora_stack else 1
        pbar = comfy.utils.ProgressBar(stack_length)
        model, clip, lora_stack, keywords = self.load_loras(model, clip, pbar, lora_stack)
        return model, clip, lora_stack, keywords

class Sage_ModelLoraStackLoader(Sage_LoraStackLoader):
    def __init__(self):
        self.loaded_lora = None

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "model_info": ("MODEL_INFO", {"tooltip": "The diffusion model the LoRA will be applied to. Note: Should be from the checkpoint info node, not a loader node, or the model will be loaded twice."}),
            },
            "optional": {
                "lora_stack": ("LORA_STACK", {"defaultInput": True})
            }
        }

    RETURN_TYPES = ("MODEL", "CLIP", "VAE", "LORA_STACK", "STRING")
    RETURN_NAMES = ("model", "clip", "vae", "lora_stack", "keywords")
    OUTPUT_TOOLTIPS = ("The modified diffusion model.", "The modified CLIP model.", "The VAE model.", "The stack of loras.", "Keywords from the lora stack.")

    FUNCTION = "load_everything"
    CATEGORY = "Sage Utils/model"
    DESCRIPTION = "Accept model info and a lora_stack, load the model, and apply all the loras in the stack to it at once."

    def load_checkpoint(self, ckpt_path):
        out = comfy.sd.load_checkpoint_guess_config(ckpt_path, output_vae=True, output_clip=True, embedding_directory=folder_paths.get_folder_paths("embeddings"))
        return out[:3]

    def load_everything(self, model_info, lora_stack=None):
        if model_info["type"] != "CKPT":
            raise ValueError("Clip information is missing. Please use a checkpoint for model_info, not a diffusion model.")
        stack_length = len(lora_stack) if lora_stack else 1

        pbar = comfy.utils.ProgressBar(stack_length + 1)
        model, clip, vae = self.load_checkpoint(model_info["path"])
        pbar.update(1)
        model, clip, lora_stack, keywords = self.load_loras(model, clip, pbar, lora_stack)
        return model, clip, vae, lora_stack, keywords

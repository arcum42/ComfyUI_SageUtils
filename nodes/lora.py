# Lora nodes
# This includes nodes involving loras and lora stacks.

from ..sage import *

import comfy
import folder_paths
from comfy.comfy_types import IO, ComfyNodeABC, InputTypeDict

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


class Sage_TripleLoraStack(ComfyNodeABC):
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "enabled_1": ("BOOLEAN", {"defaultInput": False, "default": True}),
                "lora_1_name": (folder_paths.get_filename_list("loras"), {"defaultInput": False, "tooltip": "The name of the LoRA."}),
                "model_1_weight": ("FLOAT", {"defaultInput": False, "default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01, "tooltip": "How strongly to modify the diffusion model. This value can be negative."}),
                "clip_1_weight": ("FLOAT", {"defaultInput": False, "default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01, "tooltip": "How strongly to modify the CLIP model. This value can be negative."}),
                
                "enabled_2": ("BOOLEAN", {"defaultInput": False, "default": True}),
                "lora_2_name": (folder_paths.get_filename_list("loras"), {"defaultInput": False, "tooltip": "The name of the LoRA."}),
                "model_2_weight": ("FLOAT", {"defaultInput": False, "default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01, "tooltip": "How strongly to modify the diffusion model. This value can be negative."}),
                "clip_2_weight": ("FLOAT", {"defaultInput": False, "default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01, "tooltip": "How strongly to modify the CLIP model. This value can be negative."}),
                
                "enabled_3": ("BOOLEAN", {"defaultInput": False, "default": True}),
                "lora_3_name": (folder_paths.get_filename_list("loras"), {"defaultInput": False, "tooltip": "The name of the LoRA."}),
                "model_3_weight": ("FLOAT", {"defaultInput": False, "default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01, "tooltip": "How strongly to modify the diffusion model. This value can be negative."}),
                "clip_3_weight": ("FLOAT", {"defaultInput": False, "default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01, "tooltip": "How strongly to modify the CLIP model. This value can be negative."}),
                },
            "optional": {
                "lora_stack": ("LORA_STACK", {"defaultInput": True}),
            }
        }

    RETURN_TYPES = ("LORA_STACK",)
    RETURN_NAMES = ("lora_stack",)
    
    FUNCTION = "add_lora_to_stack"
    CATEGORY = "Sage Utils/lora"
    DESCRIPTION = "Choose three loras with weights, and add them to a lora_stack. Compatable with other node packs that have lora_stacks."
    
    def add_lora_to_stack(self, enabled_1, lora_1_name, model_1_weight, clip_1_weight, enabled_2, lora_2_name, model_2_weight, clip_2_weight, enabled_3, lora_3_name, model_3_weight, clip_3_weight, lora_stack = None):
        if enabled_1 == True:
            stack = add_lora_to_stack(lora_1_name, model_1_weight, clip_1_weight, lora_stack)
        else:
            stack = lora_stack

        if enabled_2 == True:
            stack = add_lora_to_stack(lora_2_name, model_2_weight, clip_2_weight, lora_stack)
        else:
            stack = lora_stack 

        if enabled_3 == True:
            stack = add_lora_to_stack(lora_3_name, model_3_weight, clip_3_weight, lora_stack)
        else:
            stack = lora_stack
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
        lora_keywords = []
        if lora_stack is None:
            return ("",)
        
        for lora in lora_stack:
            print(f"Let's get keywords for {lora[0]}")
            try:
                lora_path = folder_paths.get_full_path_or_raise("loras", lora[0])
                if cache.cache.data.get(lora_path, {}).get("trainedWords", None) is None:
                    pull_metadata(lora_path, True)
                
                keywords = cache.cache.data.get(lora_path, {}).get("trainedWords", [])
                print(keywords)
                if keywords != []:
                    lora_keywords.extend(keywords)
            except:
                print("Exception getting keywords!")
                continue

        ret = ", ".join(lora_keywords)
        ret = ' '.join(ret.split('\n'))
        return (ret,)

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
    
    RETURN_TYPES = ("MODEL", "CLIP", "LORA_STACK")
    OUTPUT_TOOLTIPS = ("The modified diffusion model.", "The modified CLIP model.", "The stack of loras.")
    FUNCTION = "load_loras"

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
    
    def load_loras(self, model, clip, lora_stack=None):
        if not lora_stack:
            print("No lora stacks found. Warning: Passing 'None' to lora_stack output.")
            return model, clip, None
        pbar = comfy.utils.ProgressBar(len(lora_stack))

        for lora in lora_stack:
            if lora:
                model, clip = self.load_lora(model, clip, *lora)
            pbar.update(1)
        return model, clip, lora_stack

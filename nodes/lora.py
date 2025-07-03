# Lora nodes
# This includes nodes involving loras and lora stacks.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO
import comfy
from comfy_extras import nodes_freelunch
import folder_paths
from comfy.utils import ProgressBar

# Import specific utilities instead of wildcard import
from ..utils import (
    cache, get_lora_keywords, get_lora_stack_keywords, add_lora_to_stack,
    pull_metadata, get_recently_used_models, clean_keywords,
    get_civitai_model_json, get_latest_model_version, loaders
)
from ..utils.common import unwrap_tuple, get_model_types, load_model_component, load_lora_stack_with_keywords

from ..utils import model_info as mi
class Sage_LoraStack(ComfyNodeABC):
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        lora_list = folder_paths.get_filename_list("loras")
        return {
            "required": {
                "enabled": (IO.BOOLEAN, {"defaultInput": False, "default": True}),
                "lora_name": (lora_list, {"defaultInput": False, "tooltip": "The name of the LoRA."}),
                "model_weight": (IO.FLOAT, {"defaultInput": False, "default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01, "tooltip": "How strongly to modify the diffusion model. This value can be negative."}),
                "clip_weight": (IO.FLOAT, {"defaultInput": False, "default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01, "tooltip": "How strongly to modify the CLIP model. This value can be negative."}),
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

    def add_lora_to_stack(self, enabled, lora_name, model_weight, clip_weight, lora_stack = None) -> tuple:
        if enabled == True:
            stack = add_lora_to_stack(lora_name, model_weight, clip_weight, lora_stack)
        else:
            stack = lora_stack

        return (stack,)

class Sage_TripleLoraStack(ComfyNodeABC):
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        lora_list = folder_paths.get_filename_list("loras")
        required_list = {}
        for i in range(1, 4):
            required_list[f"enabled_{i}"] = (IO.BOOLEAN, {"defaultInput": False, "default": True})
            required_list[f"lora_{i}_name"] = (lora_list, {"options": lora_list, "defaultInput": False, "tooltip": "The name of the LoRA."})
            required_list[f"model_{i}_weight"] = (IO.FLOAT, {"defaultInput": False, "default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01, "tooltip": "How strongly to modify the diffusion model. This value can be negative."})
            required_list[f"clip_{i}_weight"] = (IO.FLOAT, {"defaultInput": False, "default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01, "tooltip": "How strongly to modify the CLIP model. This value can be negative."})
        
        return {
            "required": required_list,
            "optional": {
                "lora_stack": ("LORA_STACK", {"defaultInput": True})
            }
        }

    RETURN_TYPES = ("LORA_STACK",)
    RETURN_NAMES = ("lora_stack",)

    FUNCTION = "add_lora_to_stack"
    CATEGORY = "Sage Utils/lora"
    DESCRIPTION = "Choose three loras with weights, and add them to a lora_stack. Compatable with other node packs that have lora_stacks."

    def add_lora_to_stack(self, **args) -> tuple:
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
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "lora_stack": ("LORA_STACK", {"defaultInput": True})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("keywords",)

    FUNCTION = "get_keywords"

    CATEGORY = "Sage Utils/lora"
    DESCRIPTION = "Go through each model in the lora stack, grab any keywords from civitai, and combine them into one string. Place at the end of a lora_stack, or you won't get keywords for the entire stack."

    def get_keywords(self, lora_stack) -> tuple:
        if lora_stack is None:
            return ("",)

        return (get_lora_stack_keywords(lora_stack),)

class Sage_CheckLorasForUpdates(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "lora_stack": ("LORA_STACK", {"defaultInput": True}),
                "force": (IO.BOOLEAN, {"defaultInput": False, "default": False, "tooltip": "Force a check for updates, even if the lora is up to date."}),
            }
        }

    RETURN_TYPES = ("LORA_STACK", IO.STRING, IO.STRING)
    RETURN_NAMES = ("lora_stack", "path", "latest_url")

    FUNCTION = "check_for_updates"

    CATEGORY = "Sage Utils/lora"
    DESCRIPTION = "Check the loras in the stack for updates. If an update is found, it will be downloaded and the lora will be replaced in the stack."

    def check_for_updates(self, lora_stack, force) -> tuple:
        if lora_stack is None:
            return (None, "", "")
        
        lora_list = []
        lora_url_list = []

        for i, lora in enumerate(lora_stack):
            if lora is not None:
                print(f"Checking {lora[0]} for updates...")
                lora_path = folder_paths.get_full_path_or_raise("loras", lora[0])
                pull_metadata(lora_path, timestamp=False, force_all=force)
                print(f"Update check complete for {lora[0]}")
                
                if "update_available" in cache.by_path(lora_path):
                    if cache.by_path(lora_path)["update_available"] == True:
                        model_id = cache.by_path(lora_path)["modelId"]
                        latest_version = get_latest_model_version(model_id)
                        latest_url = f"https://civitai.com/models/{model_id}?modelVersionId={latest_version}"
                        if latest_url is not None:
                            print(f"Update found for {lora[0]}")
                            lora_url_list.append(latest_url)
                            lora_list.append(lora_path)
                
        return (lora_stack, str(lora_list), str(lora_url_list))

# Modified version of the main lora loader.
class Sage_LoraStackLoader(ComfyNodeABC):
    def __init__(self):
        super().__init__()
        self.loaded_lora = {}

    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "model": (IO.MODEL, {"tooltip": "The diffusion model the LoRA will be applied to."}),
                "clip": (IO.CLIP, {"tooltip": "The CLIP model the LoRA will be applied to."})
            },
            "optional": {
                "lora_stack": ("LORA_STACK", {"defaultInput": True}),
                "model_shifts": ("MODEL_SHIFTS", {"defaultInput": True, "tooltip": "The model shifts & free_u2 settings to apply to the model."}),
            }
        }

    RETURN_TYPES = (IO.MODEL, IO.CLIP, "LORA_STACK", IO.STRING)
    RETURN_NAMES = ("model", "clip", "lora_stack", "keywords")
    OUTPUT_TOOLTIPS = ("The modified diffusion model.", "The modified CLIP model.", "The stack of loras.", "Keywords from the lora stack.")
    FUNCTION = "load_lora_and_shift"

    CATEGORY = "Sage Utils/lora"
    DESCRIPTION = "Accept a lora_stack with Model and Clip, and apply all the loras in the stack at once."

    def apply_model_shifts(self, model, model_shifts):
        print(f"The model is {model}")
        if model_shifts is not None:
            if model_shifts["shift_type"] != "None":
                multiplier = 0.0
                if model_shifts["shift_type"] == "x1":
                    multiplier = 1000.0
                elif model_shifts["shift_type"] == "x1000":
                    multiplier = 1.0
                print(f"Applying {model_shifts['shift_type']} shift with shift {model_shifts['shift']} to model.")

                sampling_base = comfy.model_sampling.ModelSamplingDiscreteFlow
                sampling_type = comfy.model_sampling.CONST
                class ModelSamplingAdvanced(sampling_base, sampling_type):
                    pass

                model_sampling = ModelSamplingAdvanced(model.model.model_config)
                model_sampling.set_parameters(shift=model_shifts["shift"], multiplier=multiplier)
                model.add_object_patch("model_sampling", model_sampling)
            
            if model_shifts["freeu_v2"] == True:
                print("FreeU v2 is enabled, applying to model.")
                print(f"model: {model}")
                freeu = nodes_freelunch.FreeU_V2()
                model = freeu.patch(model, model_shifts["b1"], model_shifts["b2"], model_shifts["s1"], model_shifts["s2"])[0]
        return model

    def load_lora_stack(self, model, clip, pbar, lora_stack):
        return load_lora_stack_with_keywords(model, clip, pbar, lora_stack)

    def load_lora_and_shift(self, model, clip, lora_stack=None, model_shifts=None) -> tuple:
        keywords = ""
        print(f"Model: {model}, Clip: {clip}, Lora Stack: {lora_stack}, Model Shifts: {model_shifts}")
        stack_length = len(lora_stack) if lora_stack else 1
        pbar = comfy.utils.ProgressBar(stack_length + 1)
        print("Loading lora stack and applying shifts...")

        model, clip, lora_stack_data, keywords = load_lora_stack_with_keywords(model, clip, pbar, lora_stack_data)
        pbar.update(1)

        if model_shifts is not None:
            print(f"Applying model shifts: {model_shifts}")
            model = self.apply_model_shifts(model, model_shifts)
        return (model, clip, lora_stack_data, keywords)

class Sage_ModelShifts(ComfyNodeABC):
    def __init__(self):
        pass
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "shift_type": (["None", "x1", "x1000"], {"defaultInput": True, "tooltip": "The type of shift to apply to the model. x1 for most models, x1000 for Auraflow and Lumina2."}),
                "shift": (IO.FLOAT, {"defaultInput": False, "default": 3.0, "min": 0.0, "max": 100.0, "step": 0.01}),
                "freeu_v2": (IO.BOOLEAN, {"defaultInput": False, "default": False}),
                "b1": (IO.FLOAT, {"defaultInput": False, "default": 1.3, "min": 0.0, "max": 10.0, "step": 0.01}),
                "b2": (IO.FLOAT, {"defaultInput": False, "default": 1.4, "min": 0.0, "max": 10.0, "step": 0.01}),
                "s1": (IO.FLOAT, {"defaultInput": False, "default": 0.9, "min": 0.0, "max": 10.0, "step": 0.01}),
                "s2": (IO.FLOAT, {"defaultInput": False, "default": 0.2, "min": 0.0, "max": 10.0, "step": 0.01}),
                },
            }
    RETURN_TYPES = ("MODEL_SHIFTS",)
    RETURN_NAMES = ("model_shifts",)
    FUNCTION = "get_model_shifts"
    CATEGORY = "Sage Utils/model"
    DESCRIPTION = "Get the model shifts and free_u2 settings to apply to the model. This is used by the model loader node."
    def get_model_shifts(self, shift_type, shift, freeu_v2, b1, b2, s1, s2) -> tuple:
        return ({
            "shift_type": shift_type,
            "shift": shift,
            "freeu_v2": freeu_v2,
            "b1": b1,
            "b2": b2,
            "s1": s1,
            "s2": s2
        },)

class Sage_UNETLoaderFromInfo(ComfyNodeABC):
    """Load UNET model component from model info."""
    
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "unet_info": ("UNET_INFO", {
                    "tooltip": "The diffusion model you want to load."
                              "Note: Should be from the unet selector node, not a loader node, "
                              "or the model will be loaded twice."
                }),
            }
        }

    RETURN_TYPES = (IO.MODEL,)
    RETURN_NAMES = ("model",)
    FUNCTION = "load_unet"
    CATEGORY = "Sage Utils/model"
    DESCRIPTION = "Load the UNET model component from unet_info."

    def load_unet(self, unet_info) -> tuple:
        """Load UNET from model info."""
        print("Loading UNET...")
        return (load_model_component(unet_info, "UNET"),)

class Sage_CLIPLoaderFromInfo(ComfyNodeABC):
    """Load CLIP model component from model info."""
    
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "clip_info": ("CLIP_INFO", {
                    "tooltip": "The text encoder model you want to load. "
                              "Note: Should be from the clip selector node, not a loader node, "
                              "or the model will be loaded twice."
                }),
            }
        }

    RETURN_TYPES = (IO.CLIP,)
    RETURN_NAMES = ("clip",)
    FUNCTION = "load_clip"
    CATEGORY = "Sage Utils/model"
    DESCRIPTION = "Load the CLIP model component from clip_info."

    def load_clip(self, clip_info) -> tuple:
        """Load CLIP from model info."""
        print("Loading CLIP...")
        return (load_model_component(clip_info, "CLIP"),)

class Sage_VAELoaderFromInfo(ComfyNodeABC):
    """Load VAE model component from model info."""
    
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "vae_info": ("VAE_INFO", {
                    "tooltip": "The VAE model you want to load. "
                              "Note: Should be from the checkpoint info node, not a loader node, "
                              "or the model will be loaded twice."
                }),
            }
        }

    RETURN_TYPES = (IO.VAE,)
    RETURN_NAMES = ("vae",)
    FUNCTION = "load_vae"
    CATEGORY = "Sage Utils/model"
    DESCRIPTION = "Load the VAE model component from vae_info."

    def load_vae(self, vae_info) -> tuple:
        """Load VAE from model info."""
        print("Loading VAE...")
        return (load_model_component(vae_info, "VAE"),)
class Sage_ModelLoraStackLoader(Sage_LoraStackLoader):
    """Load model components from model info and apply LoRA stack."""
    
    def __init__(self):
        super().__init__()

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "model_info": ("MODEL_INFO", {
                    "tooltip": "The diffusion model the LoRA will be applied to. "
                              "Note: Should be from the checkpoint info node, not a loader node, "
                              "or the model will be loaded twice."
                }),
            },
            "optional": {
                "lora_stack": ("LORA_STACK", {"defaultInput": True}),
                "model_shifts": ("MODEL_SHIFTS", {
                    "defaultInput": True, 
                    "tooltip": "The model shifts & free_u2 settings to apply to the model."
                }),
            }
        }

    RETURN_TYPES = (IO.MODEL, IO.CLIP, IO.VAE, "LORA_STACK", IO.STRING)
    RETURN_NAMES = ("model", "clip", "vae", "lora_stack", "keywords")
    OUTPUT_TOOLTIPS = (
        "The modified diffusion model.", 
        "The modified CLIP model.", 
        "The VAE model.", 
        "The stack of loras.", 
        "Keywords from the lora stack."
    )

    FUNCTION = "load_everything"
    CATEGORY = "Sage Utils/model"
    DESCRIPTION = ("Accept model info and a lora_stack, load the model, and apply all the "
                  "loras in the stack to it at once. Apply changes to the model after loading it.")

    def load_everything(self, model_info, lora_stack=None, model_shifts=None) -> tuple:
        """Load all model components and apply LoRA stack."""
        print("Loading model and lora stack...")
        
        # Initialize components
        model = clip = vae = None
        stack_length = len(lora_stack) if lora_stack else 1
        
        # Determine which model types are present
        print(f"Model info: {model_info}")
        model_types = get_model_types(model_info)
        print(f"Model types: {model_types}")
        total_operations = stack_length + len(model_types)
        pbar = ProgressBar(total_operations)
        
        # Load checkpoint if present (provides model, clip, vae)
        if "CKPT" in model_types:
            print("Loading checkpoint...")
            ckpt_result = None
            model, clip, vae = load_model_component(model_info, "CKPT", pbar)
            if ckpt_result:
                model, clip, vae = ckpt_result
            else:
                print("No checkpoint found in model_info, skipping CKPT load.")
        
        # Load individual components (override checkpoint components if present)
        if "CLIP" in model_types:
            print("Loading CLIP model...")
            clip = unwrap_tuple(load_model_component(model_info, "CLIP", pbar))

        if "VAE" in model_types:
            print("Loading VAE model...")
            vae = unwrap_tuple(load_model_component(model_info, "VAE", pbar))

        if "UNET" in model_types:
            print("Loading UNET model...")
            model = unwrap_tuple(load_model_component(model_info, "UNET", pbar))
        
        # Apply LoRA stack
        print("Loading lora stack...")
        model, clip, lora_stack, keywords = load_lora_stack_with_keywords(model, clip, pbar, lora_stack)
        
        if model_shifts:
            model = self.apply_model_shifts(model, model_shifts)
        
        pbar.update(1)
        print("Model loading and LoRA application complete.")

        # Unwrap any single-item tuples
        return (
            model,
            clip,
            vae,
            lora_stack, 
            keywords
        )

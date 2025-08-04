# Selector nodes.
# This contains nodes for selecting model information without loading the actual models.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO

import folder_paths
from ..utils import model_info as mi


class Sage_CheckpointSelector(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        model_list = folder_paths.get_filename_list("checkpoints")
        return {
                "required": {
                    "ckpt_name": (model_list, {"tooltip": "The name of the checkpoint (model) to load."})
                }
            }

    RETURN_TYPES = ("MODEL_INFO",)
    RETURN_NAMES = ("model_info",)

    OUTPUT_TOOLTIPS = ("The model path and hash, all in one output.")
    FUNCTION = "get_checkpoint_info"

    CATEGORY  =  "Sage Utils/selectors"
    DESCRIPTION = "Returns a model_info output to pass to the construct metadata node or a model info node. (And hashes and pulls civitai info for the file.)"
    def get_checkpoint_info(self, ckpt_name) -> tuple:
        info = mi.get_model_info_ckpt(ckpt_name)

        return info

class Sage_UNETSelector(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        unet_names = [x for x in folder_paths.get_filename_list("unet_gguf")]
        unet_names += folder_paths.get_filename_list("diffusion_models")
        unet_names = list(set(unet_names))
        unet_names.sort()  # Remove duplicates
        return {
                "required": {
                    "unet_name": (unet_names, {"tooltip": "The name of the UNET model to load."}),
                    "weight_dtype": (mi.weight_dtype_options, {"defaultInput": True, "default": "default", "tooltip": "The weight dtype to use for the UNET model."})
                }
            }

    RETURN_TYPES = ("UNET_INFO",)
    RETURN_NAMES = ("unet_info",)

    OUTPUT_TOOLTIPS = ("The model path and hash, all in one output.")
    FUNCTION = "get_unet_info"

    CATEGORY  =  "Sage Utils/selectors"
    DESCRIPTION = "Returns a model_info output to pass to the construct metadata node or a model info node. (And hashes and pulls civitai info for the file.)"
    def get_unet_info(self, unet_name, weight_dtype) -> tuple:
        info = mi.get_model_info_unet(unet_name, weight_dtype)
        return info

class Sage_VAESelector(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        vae_list = folder_paths.get_filename_list("vae")
        return {
                "required": {
                    "vae_name": (vae_list, {"tooltip": "The name of the VAE model to load."})
                }
            }

    RETURN_TYPES = ("VAE_INFO",)
    RETURN_NAMES = ("vae_info",)

    OUTPUT_TOOLTIPS = ("The model path and hash, all in one output.")
    FUNCTION = "get_vae_info"

    CATEGORY  =  "Sage Utils/selectors"
    DESCRIPTION = "Returns a model_info output to pass to the construct metadata node or a model info node. (And hashes and pulls civitai info for the file.)"
    def get_vae_info(self, vae_name) -> tuple:
        info = mi.get_model_info_vae(vae_name)
        return info

class Sage_CLIPSelector(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        model_list = [x for x in folder_paths.get_filename_list("text_encoders")]
        model_list += folder_paths.get_filename_list("clip_gguf")
        model_list = list(set(model_list))
        model_list.sort()  # Remove duplicates
        return {
                "required": {
                    "clip_name": (model_list, {"tooltip": "The name of the CLIP model to load."}),
                    "clip_type": (mi.single_clip_loader_options, {"defaultInput": True, "default": "chroma", "tooltip": "The type of CLIP model. If empty, will use the default type."})
                }
            }

    RETURN_TYPES = ("CLIP_INFO",)
    RETURN_NAMES = ("clip_info",)

    OUTPUT_TOOLTIPS = ("The model path and hash, all in one output.")
    FUNCTION = "get_clip_info"

    CATEGORY  =  "Sage Utils/selectors"
    DESCRIPTION = "Returns a model_info output to pass to the construct metadata node or a model info node. (And hashes and pulls civitai info for the file.)"
    def get_clip_info(self, clip_name, clip_type) -> tuple:
        info = mi.get_model_info_clips([clip_name], clip_type)
        return info

class Sage_DualCLIPSelector(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        model_list = [x for x in folder_paths.get_filename_list("text_encoders")]
        model_list += folder_paths.get_filename_list("clip_gguf")
        model_list = list(set(model_list))
        model_list.sort()  # Remove duplicates
        return {
                "required": {
                    "clip_name_1": (model_list, {"tooltip": "The name of the first CLIP model to load."}),
                    "clip_name_2": (model_list, {"tooltip": "The name of the second CLIP model to load."}),
                    "clip_type": (mi.dual_clip_loader_options, {"defaultInput": True, "default": "sdxl", "tooltip": "The type of CLIP models. If empty, will use the default type."})
                }
            }

    RETURN_TYPES = ("CLIP_INFO",)
    RETURN_NAMES = ("clip_info",)

    OUTPUT_TOOLTIPS = ("The model path and hash, all in one output.")
    FUNCTION = "get_clip_info"

    CATEGORY  =  "Sage Utils/selectors"
    DESCRIPTION = "Returns a model_info output to pass to the construct metadata node or a model info node. (And hashes and pulls civitai info for the file.)"
    def get_clip_info(self, clip_name_1, clip_name_2, clip_type) -> tuple:
        info = mi.get_model_info_clips([clip_name_1, clip_name_2], clip_type)
        return info

class Sage_TripleCLIPSelector(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        model_list = [x for x in folder_paths.get_filename_list("text_encoders")]
        model_list += folder_paths.get_filename_list("clip_gguf")
        model_list = list(set(model_list))
        model_list.sort()  # Remove duplicates
        return {
                "required": {
                    "clip_name_1": (model_list, {"tooltip": "The name of the first CLIP model to load."}),
                    "clip_name_2": (model_list, {"tooltip": "The name of the second CLIP model to load."}),
                    "clip_name_3": (model_list, {"tooltip": "The name of the third CLIP model to load."})                }
            }

    RETURN_TYPES = ("CLIP_INFO",)
    RETURN_NAMES = ("clip_info",)

    OUTPUT_TOOLTIPS = ("The model path and hash, all in one output.")
    FUNCTION = "get_clip_info"

    CATEGORY  =  "Sage Utils/selectors"
    DESCRIPTION = "Returns a model_info output to pass to the construct metadata node or a model info node. (And hashes and pulls civitai info for the file.)"
    def get_clip_info(self, clip_name_1, clip_name_2, clip_name_3) -> tuple:
        info = mi.get_model_info_clips([clip_name_1, clip_name_2, clip_name_3])
        return info

class Sage_QuadCLIPSelector(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        model_list = [x for x in folder_paths.get_filename_list("text_encoders")]
        model_list += folder_paths.get_filename_list("clip_gguf")
        model_list = list(set(model_list))
        model_list.sort()  # Remove duplicates
        return {
                "required": {
                    "clip_name_1": (model_list, {"tooltip": "The name of the first CLIP model to load."}),
                    "clip_name_2": (model_list, {"tooltip": "The name of the second CLIP model to load."}),
                    "clip_name_3": (model_list, {"tooltip": "The name of the third CLIP model to load."}),
                    "clip_name_4": (model_list, {"tooltip": "The name of the fourth CLIP model to load."})
                }
            }

    RETURN_TYPES = ("CLIP_INFO",)
    RETURN_NAMES = ("clip_info",)

    OUTPUT_TOOLTIPS = ("The model path and hash, all in one output.")
    FUNCTION = "get_clip_info"

    CATEGORY  =  "Sage Utils/selectors"
    DESCRIPTION = "Returns a model_info output to pass to the construct metadata node or a model info node. (And hashes and pulls civitai info for the file.)"
    def get_clip_info(self, clip_name_1, clip_name_2, clip_name_3, clip_name_4) -> tuple:
        info = mi.get_model_info_clips([clip_name_1, clip_name_2, clip_name_3, clip_name_4])
        return info


class Sage_ModelShifts(ComfyNodeABC):
    def __init__(self):
        pass
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "shift_type": (["None", "x1", "x1000"], {"defaultInput": True, "tooltip": "The type of shift to apply to the model. x1 for Auraflow and Lumina2, x1000 for other models."}),
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

class Sage_UnetClipVaeToModelInfo(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "unet_info": ("UNET_INFO", {"tooltip": "The UNET model info to load."}),
                "clip_info": ("CLIP_INFO", {"tooltip": "The CLIP model info to load."}),
                "vae_info": ("VAE_INFO", {"tooltip": "The VAE model info to load."}),
            }
        }
    
    RETURN_TYPES = ("MODEL_INFO",)
    RETURN_NAMES = ("model_info",)
    
    FUNCTION = "get_model_info"
    CATEGORY  =  "Sage Utils/model"
    DESCRIPTION = "Returns a list with the unets, clips, and vae in it to be loaded."

    def get_model_info(self, unet_info, clip_info, vae_info) -> tuple:
        print(f"Constructing model info from UNET: {unet_info}, CLIP: {clip_info}, VAE: {vae_info}")

        return ((unet_info, clip_info, vae_info),)

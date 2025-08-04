# Model nodes.
# This contains nodes involving models. Primarily loading models, but also includes nodes for model info and cache maintenance.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO

import folder_paths
from nodes import CheckpointLoaderSimple, UNETLoader

# Import specific utilities instead of wildcard import
from ..utils import (
    cache, pull_metadata, str_to_bool, get_recently_used_models,
    model_scan, path_manager, loaders
)

import pathlib
import json
from ..utils import model_info as mi

from comfy_execution.graph_utils import GraphBuilder

class Sage_CheckpointLoaderSimple(CheckpointLoaderSimple):
    def __init__(self):
            pass

    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        model_list = folder_paths.get_filename_list("checkpoints")
        return {
                "required": {
                    "ckpt_name": (model_list, )
                }
            }

    RETURN_TYPES = (IO.MODEL, IO.CLIP, IO.VAE, "MODEL_INFO")
    RETURN_NAMES = ("model", "clip", "vae", "model_info")
    OUTPUT_TOOLTIPS = ("The model used for denoising latents.",
                    "The CLIP model used for encoding text prompts.",
                    "The VAE model used for encoding and decoding images to and from latent space.",
                    "The model path and hash, all in one output.")
    FUNCTION = "load_checkpoint"
    CATEGORY  =  "Sage Utils/model"
    DESCRIPTION = "Loads a diffusion model checkpoint. Also returns a model_info output to pass to the construct metadata node, and the hash. (And hashes and pulls civitai info for the file.)"
    def load_checkpoint(self, ckpt_name) -> tuple:
        info = mi.get_model_info_ckpt(ckpt_name)
        if isinstance(info, tuple):
            info = info[0]
        model, clip, vae = loaders.checkpoint(info["path"])
        return (model, clip, vae, info)

class Sage_UNETLoader(UNETLoader):
    @classmethod
    def INPUT_TYPES(cls):
        unet_list = folder_paths.get_filename_list("diffusion_models")
        return {
            "required": {
                "unet_name": (unet_list,),
                "weight_dtype": (mi.weight_dtype_options,)
                }
            }
    RETURN_TYPES = (IO.MODEL, "MODEL_INFO")
    RETURN_NAMES = ("model", "model_info")

    FUNCTION = "load_unet"
    CATEGORY  =  "Sage Utils/model"

    def load_unet(self, unet_name, weight_dtype) -> tuple:
        info = mi.get_model_info_unet(unet_name, weight_dtype)
        print(f"Loading UNET from {info[0]['path']} with dtype {weight_dtype}")
        pull_metadata(info[0]["path"], timestamp = True)
        info[0]["hash"] = cache.hash[info[0]["path"]]
        return (loaders.unet(info[0]["path"], weight_dtype), info)

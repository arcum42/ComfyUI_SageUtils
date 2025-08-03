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

class Sage_GGUFTestUNETLoaderSimple(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(s):
        try:
            unet_names = [x for x in folder_paths.get_filename_list("unet_gguf")]
        except:
            unet_names = ["No GGUF UNETs found. Please install ComfyUI-GGUF."]
        return {
            "required": {
                "unet_name": (unet_names,),
            }
        }

    RETURN_TYPES = (IO.MODEL,)
    RETURN_NAMES = ("model",)

    FUNCTION = "load_checkpoint"
    CATEGORY  =  "Sage Utils/model"

    def load_checkpoint(self, unet_name):
        # Use GraphBuilder to load the model
        graph = GraphBuilder()

        loader = None
        try:
            loader = graph.node("UnetLoaderjGGUF", unet_name=unet_name)
        except Exception as e:
            
            raise ValueError("Unable to find GGUF Unet loader. Do you have ComfyUI-GGUF installed? Error: " + str(e))
        return {
            "result": (loader.out(0),),
            "expand": graph.finalize()
        }

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


class Sage_MultiModelPicker(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(s) -> Dict[str, dict]:
        return {
            "required": {
                "index": (IO.INT, {
                    "default": 1,
                    "min": 1,
                    "max": 100,  # Arbitrary upper limit for the number of models
                    "step": 1,
                    "tooltip": "Selects which model to load from the list of available models.",
                }),
                },
            "optional": {}
        }

    RETURN_TYPES = ("MODEL_INFO",)
    RETURN_NAMES = ("model_info",)

    FUNCTION = "pick_model"
    CATEGORY  =  "Sage Utils/model"
    DESCRIPTION = "Returns a list of model_info outputs for the selected checkpoints. (And hashes and pulls civitai info for the files.)"

    def pick_model(self, **kw) -> Tuple[Any | None]:
        model_infos = kw.values()
        index = kw.get("index", 1)
        model_infos = list(model_infos)
        if index < 0 or index >= len(model_infos):
            raise ValueError("Index out of range. Please select a valid model index.")
        selected_model_info = model_infos[index]
        
        return (selected_model_info,)
class Sage_CacheMaintenance(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "remove_ghost_entries": (IO.BOOLEAN, {"defaultInput": True})
            }
        }

    RETURN_TYPES = (IO.STRING, IO.STRING, IO.STRING, IO.STRING)
    RETURN_NAMES = ("ghost_entries", "dup_hash","dup_model", "not_on_civitai")

    FUNCTION = "cache_maintenance"
    CATEGORY = "Sage Utils/model"
    DESCRIPTION = "Lets you remove entries for models that are no longer there. dup_hash returns a list of files with the same hash, and dup_model returns ones with the same civitai model id (but not neccessarily the same version)."

    def cache_maintenance(self, remove_ghost_entries) -> tuple[str, str, str, str]:
        ghost_entries = []
        for key in cache.hash:
            if not pathlib.Path(key).is_file():
                ghost_entries.append(key)

        cache_by_hash = {}
        cache_by_id = {}
        dup_hash = {}
        dup_id = {}
        not_on_civitai = []
        out_of_date = []

        for model_path, model_hash in cache.hash.items():
            if model_hash not in cache_by_hash:
                cache_by_hash[model_hash] = []
            cache_by_hash[model_hash].append(model_path)

            info = cache.by_path(model_path)
            model_id = info.get("modelId", None)
            if model_id:
                if model_id not in cache_by_id:
                    cache_by_id[model_id] = []
                cache_by_id[model_id].append(model_path)
        
        if remove_ghost_entries:
            for ghost in ghost_entries:
                cache.hash.pop(ghost)
            cache.save()

        dup_hash = {h: paths for h, paths in cache_by_hash.items() if len(paths) > 1}
        dup_id = {i: paths for i, paths in cache_by_id.items() if len(paths) > 1}

        dup_hash_json = json.dumps(dup_hash, separators=(",", ":"), sort_keys=True, indent=4)
        dup_id_json = json.dumps(dup_id, separators=(",", ":"), sort_keys=True, indent=4)

        for model_path, model_hash in cache.hash.items():
            model_info = cache.by_path(model_path)
            in_civitai = False
            try:
                in_civitai = str_to_bool(model_info['civitai'])
            except:
                in_civitai = False
            if in_civitai != True:
                not_on_civitai.append(model_path)

            if model_info.get("update_available", False):
                out_of_date.append(model_path)
        
        not_on_civitai_str = str(not_on_civitai)
        out_of_date_str = str(out_of_date)
        return (", ".join(ghost_entries), dup_hash_json, dup_id_json, not_on_civitai_str)

class Sage_ModelReport(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "scan_models": (["none", "loras", "checkpoints", "all"], {"defaultInput": False, "default": "none"}),
                "force_recheck": (IO.BOOLEAN, {"defaultInput": False, "default": "False"}),
            }
        }

    RETURN_TYPES = (IO.STRING, IO.STRING)
    RETURN_NAMES = ("model_list", "lora_list")

    FUNCTION = "pull_list"
    CATEGORY = "Sage Utils/model"
    DESCRIPTION = "Calculates the hash of models & checkpoints & pulls civitai info if chosen. Returns a list of models in the cache of the specified type, by base model type."

    def get_files(self, scan_models, force_recheck):
        the_paths = []
        if scan_models == "loras":
            the_paths = folder_paths.get_folder_paths("loras")
        elif scan_models == "checkpoints":
            the_paths = folder_paths.get_folder_paths("checkpoints")
        elif scan_models == "all":
            the_lora_paths = folder_paths.get_folder_paths("loras")
            the_checkpoint_paths = folder_paths.get_folder_paths("checkpoints")
            the_paths = [*the_lora_paths, *the_checkpoint_paths]

        if the_paths != []: model_scan(the_paths, force=force_recheck)

    def pull_list(self, scan_models, force_recheck) -> tuple[str, str]:
        sorted_models = {}
        sorted_loras = {}
        model_list = ""
        lora_list = ""

        self.get_files(scan_models, force_recheck)

        for model_path in cache.hash.keys():
            cur = cache.info.get(cache.hash[model_path], {})
            baseModel = cur.get('baseModel', None)
            if cur.get('model', {}).get('type', None) == "Checkpoint":
                if baseModel not in sorted_models: sorted_models[baseModel] = []
                sorted_models[baseModel].append(str(model_path))

            if cur.get('model', {}).get('type', None) == "LORA":
                if baseModel not in sorted_loras: sorted_loras[baseModel] = []
                sorted_loras[baseModel].append(str(model_path))

        if sorted_models != {}: model_list = json.dumps(sorted_models, separators=(",", ":"), sort_keys=True, indent=4)
        if sorted_loras != {}: lora_list = json.dumps(sorted_loras, separators=(",", ":"), sort_keys=True, indent=4)

        return (model_list, lora_list)

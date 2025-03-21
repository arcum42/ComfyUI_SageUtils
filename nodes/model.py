# Model nodes.
# This contains nodes involving models. Primarily loading models, but also includes nodes for model info and cache maintenance.

from ..sage import *
from ..utils.loaders import *

import pathlib
import json

import comfy
import folder_paths
from comfy.comfy_types import IO, ComfyNodeABC, InputTypeDict
from nodes import CheckpointLoaderSimple, UNETLoader

class Sage_CheckpointLoaderRecent(ComfyNodeABC):
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(s):
        ckpt_list = get_recently_used_models("checkpoints")

        return {
            "required": {
                "ckpt_name": (ckpt_list, {"tooltip": "The name of the checkpoint (model) to load."}),
            }
        }
    RETURN_TYPES = ("MODEL", "CLIP", "VAE", "MODEL_INFO")
    RETURN_NAMES = ("model", "clip", "vae", "model_info")
    OUTPUT_TOOLTIPS = ("The model used for denoising latents.",
                    "The CLIP model used for encoding text prompts.",
                    "The VAE model used for encoding and decoding images to and from latent space.",
                    "The model path and hash, all in one output.")
    FUNCTION = "load_checkpoint"

    CATEGORY  =  "Sage Utils/model"
    DESCRIPTION = "Loads a diffusion model checkpoint. Also returns a model_info output to pass to the construct metadata node, and the hash. (And hashes and pulls civitai info for the file.)"

    def load_checkpoint(self, ckpt_name):
        model_info = { "type": "CKPT", "path": folder_paths.get_full_path_or_raise("checkpoints", ckpt_name) }
        pull_metadata(model_info["path"], True)

        model_info["hash"] = cache.cache.data[model_info["path"]]["hash"]

        model, clip, vae = sage_load_checkpoint(model_info["path"])
        #out = comfy.sd.load_checkpoint_guess_config(model_info["path"], output_vae=True, output_clip=True, embedding_directory=folder_paths.get_folder_paths("embeddings"))
        result = (model, clip, vae, model_info)
        return (result)

class Sage_CheckpointLoaderSimple(CheckpointLoaderSimple):
    def __init__(self):
            pass

    @classmethod
    def INPUT_TYPES(cls):
        return {
                "required": {
                    "ckpt_name": (folder_paths.get_filename_list("checkpoints"), {"tooltip": "The name of the checkpoint (model) to load."}),
                }
            }

    RETURN_TYPES = ("MODEL", "CLIP", "VAE", "MODEL_INFO")
    RETURN_NAMES = ("model", "clip", "vae", "model_info")
    OUTPUT_TOOLTIPS = ("The model used for denoising latents.",
                    "The CLIP model used for encoding text prompts.",
                    "The VAE model used for encoding and decoding images to and from latent space.",
                    "The model path and hash, all in one output.")
    FUNCTION = "load_checkpoint"
    CATEGORY  =  "Sage Utils/model"
    DESCRIPTION = "Loads a diffusion model checkpoint. Also returns a model_info output to pass to the construct metadata node, and the hash. (And hashes and pulls civitai info for the file.)"
    def load_checkpoint(self, ckpt_name):
        model_info = { "type": "CKPT", "path": folder_paths.get_full_path_or_raise("checkpoints", ckpt_name) }
        pull_metadata(model_info["path"], True)

        model_info["hash"] = cache.cache.data[model_info["path"]]["hash"]
        model, clip, vae = sage_load_checkpoint(model_info["path"])
        return (model, clip, vae, model_info)
    
class Sage_UNETLoader(UNETLoader):
    @classmethod
    def INPUT_TYPES(s):
        return {"required": { "unet_name": (folder_paths.get_filename_list("diffusion_models"), ),
                            "weight_dtype": (["default", "fp8_e4m3fn", "fp8_e4m3fn_fast", "fp8_e5m2"],)
                            }}
    RETURN_TYPES = ("MODEL", "MODEL_INFO")
    RETURN_NAMES = ("model", "model_info")

    FUNCTION = "load_unet"
    CATEGORY  =  "Sage Utils/model"

    def load_unet(self, unet_name, weight_dtype):
        model_info = {
            "type": "UNET",
            "name": pathlib.Path(unet_name).name,
            "path": folder_paths.get_full_path_or_raise("diffusion_models", unet_name)
        }
        pull_metadata(model_info["path"], True)
        model_info["hash"] = cache.cache.data[model_info["path"]]["hash"]
        return (sage_load_unet(model_info["path"], weight_dtype), model_info)

class Sage_CheckpointInfoOnly(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(s):
        return {
                "required": {
                    "ckpt_name": (folder_paths.get_filename_list("checkpoints"), {"tooltip": "The name of the checkpoint (model) to load."})
                }
            }

    RETURN_TYPES = ("MODEL_INFO",)
    RETURN_NAMES = ("model_info",)

    OUTPUT_TOOLTIPS = ("The model path and hash, all in one output.")
    FUNCTION = "get_checkpoint_info"

    CATEGORY  =  "Sage Utils/model"
    DESCRIPTION = "Returns a model_info output to pass to the construct metadata node or a model info node. (And hashes and pulls civitai info for the file.)"
    def get_checkpoint_info(self, ckpt_name):
        model_info = { "type": "CKPT", "path": folder_paths.get_full_path_or_raise("checkpoints", ckpt_name) }
        pull_metadata(model_info["path"], True)
        model_info["hash"] = cache.cache.data[model_info["path"]]["hash"]
        return (model_info,)

class Sage_CacheMaintenance(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "remove_ghost_entries": ("BOOLEAN", {"defaultInput": True})
            }
        }

    RETURN_TYPES = ("STRING", "STRING", "STRING")
    RETURN_NAMES = ("ghost_entries", "dup_hash","dup_model")

    FUNCTION = "cache_maintenance"
    CATEGORY = "Sage Utils/model"
    DESCRIPTION = "Lets you remove entries for models that are no longer there. dup_hash returns a list of files with the same hash, and dup_model returns ones with the same civitai model id (but not neccessarily the same version)."

    def cache_maintenance(self, remove_ghost_entries):
        ghost_entries = [path for path in cache.cache.data if not pathlib.Path(path).is_file()]
        cache_by_hash = {}
        cache_by_id = {}
        dup_hash = {}
        dup_id = {}

        for model_path, data in cache.cache.data.items():
            if 'hash' in data:
                cache_by_hash.setdefault(data['hash'], []).append(model_path)
            if 'modelId' in data:
                cache_by_id.setdefault(data['modelId'], []).append(model_path)

        if remove_ghost_entries:
            for ghost in ghost_entries:
                cache.cache.data.pop(ghost)
            cache.cache.save()

        dup_hash = {h: paths for h, paths in cache_by_hash.items() if len(paths) > 1}
        dup_id = {i: paths for i, paths in cache_by_id.items() if len(paths) > 1}

        return (", ".join(ghost_entries), json.dumps(dup_hash, separators=(",", ":"), sort_keys=True, indent=4), json.dumps(dup_id, separators=(",", ":"), sort_keys=True, indent=4))

class Sage_ModelReport(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "scan_models": (("none", "loras", "checkpoints", "all"), {"defaultInput": False, "default": "none"}),
            }
        }

    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("model_list", "lora_list")

    FUNCTION = "pull_list"
    CATEGORY = "Sage Utils/model"
    DESCRIPTION = "Calculates the hash of models & checkpoints & pulls civitai info if chosen. Returns a list of models in the cache of the specified type, by base model type."

    def get_files(self, scan_models):
        the_paths = []
        if scan_models == "loras":
            the_paths = folder_paths.get_folder_paths("loras")
        elif scan_models == "checkpoints":
            the_paths = folder_paths.get_folder_paths("checkpoints")
        elif scan_models == "all":
            the_lora_paths = folder_paths.get_folder_paths("loras")
            the_checkpoint_paths = folder_paths.get_folder_paths("checkpoints")
            the_paths = [*the_lora_paths, *the_checkpoint_paths]

        print(f"Scanning {len(the_paths)} paths.")
        print(f"the_paths == {the_paths}")
        if the_paths != []: model_scan(the_paths)

    def pull_list(self, scan_models):
        sorted_models = {}
        sorted_loras = {}
        model_list = ""
        lora_list = ""

        self.get_files(scan_models)

        for model_path in cache.cache.data.keys():
            cur = cache.cache.data.get(model_path, {})
            baseModel = cur.get('baseModel', None)
            if cur.get('model', {}).get('type', None) == "Checkpoint":
                if baseModel not in sorted_models: sorted_models[baseModel] = []
                sorted_models[baseModel].append(model_path)

            if cur.get('model', {}).get('type', None) == "LORA":
                if baseModel not in sorted_loras: sorted_loras[baseModel] = []
                sorted_loras[baseModel].append(model_path)

        if sorted_models != {}: model_list = json.dumps(sorted_models, separators=(",", ":"), sort_keys=True, indent=4)
        if sorted_loras != {}: lora_list = json.dumps(sorted_loras, separators=(",", ":"), sort_keys=True, indent=4)

        return (model_list, lora_list)

# Utility nodes
# This is for any misc utility nodes that don't fit into the other categories.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO

import folder_paths
from comfy_execution.graph import ExecutionBlocker

# Import specific utilities instead of wildcard import
from ..utils import (
    cache, blank_image, url_to_torch_image,
    get_latest_model_version, get_lora_hash, pull_metadata,
    get_civitai_model_version_json_by_hash, pull_lora_image_urls
)

import comfy.model_management as mm
import gc

from ..utils import model_info as mi
class Sage_FreeMemory(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "free_memory": (IO.BOOLEAN, {"defaultInput": False}),
                "value": (IO.ANY,{"defaultInput": False})
            }
        }

    @classmethod
    def VALIDATE_INPUTS(s, input_types) -> bool:
        return True

    RETURN_TYPES = (IO.ANY,)
    RETURN_NAMES = ("value",)

    FUNCTION = "free_memory"

    CATEGORY = "Sage Utils/util"
    DESCRIPTION = "Free up memory by unloading all models, clearing the model cache, and garbage collecting."

    def free_memory(self, free_memory, value):
        if free_memory:
            mm.unload_all_models()
            gc.collect()
            mm.soft_empty_cache()

        return (value,)
class Sage_Halt(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "continue_executing": (IO.BOOLEAN, {"label_on": "Continue", "label_off": "Halt", "defaultInput": False}),
                "value": (IO.ANY,{"defaultInput": False})
            }
        }

    @classmethod
    def VALIDATE_INPUTS(s, input_types) -> bool:
        return True

    RETURN_TYPES = (IO.ANY,)
    RETURN_NAMES = ("value",)

    FUNCTION = "halt_or_continue"

    CATEGORY = "Sage Utils/util"
    DESCRIPTION = "Continue or Halt the workflow from this point."

    def halt_or_continue(self, continue_executing, value):
        """
        If the condition is True, return the value.
        If the condition is False, halt execution.
        """
        if continue_executing:
            return (value,)
        else:
            return (ExecutionBlocker(None))

class Sage_LogicalSwitch(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "condition": (IO.BOOLEAN, {"defaultInput": False}),
                "true_value": (IO.ANY,{"defaultInput": False}),
                "false_value": (IO.ANY,{"defaultInput": False})
            }
        }

    @classmethod
    def VALIDATE_INPUTS(s, input_types) -> bool:
        return True

    RETURN_TYPES = (IO.ANY,)
    RETURN_NAMES = ("result",)

    FUNCTION = "if_else"

    CATEGORY = "Sage Utils/util"
    DESCRIPTION = "Returns one of two values based on a condition."

    def if_else(self, condition, true_value, false_value) -> tuple:
        return (true_value if condition else false_value,)

class Sage_ModelInfo(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "model_info": ("MODEL_INFO", {"defaultInput": True})
            }
        }

    RETURN_TYPES = (IO.STRING, IO.STRING, IO.STRING, IO.STRING, IO.IMAGE)
    RETURN_NAMES = ("base_model", "name", "url", "latest_url", "image")

    FUNCTION = "get_last_info"

    CATEGORY = "Sage Utils/model"
    DESCRIPTION = "Pull the civitai model info, and return what the base model is, the name with version, the url, the url for the latest version, and a preview image. Note that last model in the stack is not necessarily the one this node is hooked to, since that node may be disabled."

    def get_last_info(self, model_info) -> tuple:
        info = mi.get_model_info_component(model_info, "CKPT")
        if info is None or info == {}:
            return ("", "", "", "", None)

        image = blank_image()
        try:
            json_data = get_civitai_model_version_json_by_hash(info["hash"])
            if "modelId" in json_data:
                url = f"https://civitai.com/models/{json_data['modelId']}?modelVersionId={json_data['id']}"
                latest_version = get_latest_model_version(json_data["modelId"])
                if latest_version is None:
                    latest_version = json_data["id"]
                latest_url = f"https://civitai.com/models/{json_data['modelId']}?modelVersionId={latest_version}"
                image_urls = pull_lora_image_urls(model_info["hash"], True)
                image = url_to_torch_image(image_urls[0])
            else:
                url = ""
                latest_url = ""

            return (
                json_data.get("baseModel", ""),
                json_data.get("model", {}).get("name", "") + " " + json_data.get("name", ""),
                url,
                latest_url,
                image)
        except:
            print("Exception when getting json data.")
            return ("", "", "", "", image)

class Sage_LastLoraInfo(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "lora_stack": ("LORA_STACK", {"defaultInput": True})
            }
        }

    RETURN_TYPES = (IO.STRING, IO.STRING, IO.STRING, IO.STRING, IO.IMAGE)
    RETURN_NAMES = ("base_model", "name", "url", "latest_url", "image")

    FUNCTION = "get_last_info"

    CATEGORY = "Sage Utils/lora"
    DESCRIPTION = "Take the last lora in the stack, pull the civitai model info, and return what the base model is, the name with version, the url, the url for the latest version, and a preview image. Note that last model in the stack is not necessarily the one this node is hooked to, since that node may be disabled."

    def get_last_info(self, lora_stack) -> tuple:
        if lora_stack is None:
            return ("", "", "", "", None)

        last_lora = lora_stack[-1]
        image = blank_image()
        try:
            hash = get_lora_hash(last_lora[0])
            json_data = get_civitai_model_version_json_by_hash(hash)
            if "modelId" in json_data:
                url = f"https://civitai.com/models/{json_data['modelId']}?modelVersionId={json_data['id']}"
                latest_version = get_latest_model_version(json_data["modelId"])
                if latest_version is None:
                    latest_version = json_data["id"]
                latest_url = f"https://civitai.com/models/{json_data['modelId']}?modelVersionId={latest_version}"
                image_urls = pull_lora_image_urls(hash, True)
                image = url_to_torch_image(image_urls[0])
            else:
                url = ""
                latest_url = ""

            return (
                json_data.get("baseModel", ""),
                json_data.get("model", {}).get("name", "") + " " + json_data.get("name", ""),
                url,
                latest_url,
                image)
        except:
            print("Exception when getting json data.")
            return ("", "", "", "", image)

class Sage_GetFileHash(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        folder_list = list(folder_paths.folder_names_and_paths.keys())
        return {
            "required": {
                "base_dir": (folder_list, {"defaultInput": False}),
                "filename": (IO.STRING, {"defaultInput": False}),
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("hash",)

    FUNCTION = "get_hash"

    CATEGORY = "Sage Utils/util"
    DESCRIPTION = "Get an sha256 hash of a file."

    def get_hash(self, base_dir, filename) -> tuple[str]:
        the_hash = ""
        try:
            file_path = folder_paths.get_full_path_or_raise(base_dir, filename)
            pull_metadata(file_path)
            the_hash = cache.hash[file_path]
        except:
            print(f"Unable to hash file '{filename}'. \n")
            the_hash = ""

        print(f"Hash for '{filename}': {the_hash}")
        return (str(the_hash),)

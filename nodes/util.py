# Utility nodes
# This is for any misc utility nodes that don't fit into the other categories.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO

import folder_paths

from ..utils import *

import json

class Sage_QuickResPicker(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        aspect_ratios = [
            "1:1", # Square - 1024 x 1024
            "5:12", # Portrait - 512 x 1216
            "9:16", # Portrait - 720 x 1280
            "10:16", # Portrait - 640 x 1024
            "5:7", # Portrait - 1280 x 1792
            "2:3", # Portrait - 768 x 1152
            "3:4", # Portrait - 768 x 1024
            "4:7", # Portrait - 768 x 1344
            "7:9", # Portrait - 896 x 1152
            "8:10", # Portrait - 1024 x 1280
            "13:19" # Portrait - 832 x 1216
            ]
        orientations = ["Portrait", "Landscape"]

        return {
            "required": {
                "aspect_ratio": (IO.COMBO, {"defaultInput": True, "options": aspect_ratios}),
                "orientation": (IO.COMBO, {"defaultInput": True, "options": orientations}),
                "multiplier": (IO.FLOAT, {"default": 1.0, "min": 0.1, "max": 10.0, "step": 0.1})
            }
        }

    RETURN_TYPES = (IO.INT, IO.INT)
    RETURN_NAMES = ("width", "height")
    
    FUNCTION = "get_resolution"
    CATEGORY = "Sage Utils/util"
    DESCRIPTION = "Pick a resolution from a list of common aspect ratios. The multiplier can be used to scale the resolution up or down, rounded to the nearest unit of 64."

    def get_resolution(self, aspect_ratio, orientation, multiplier) -> tuple[int, int]:
        aspect_ratios = {
            "1:1": (1024, 1024),
            "5:12": (512, 1216),
            "9:16": (720, 1280),
            "10:16": (640, 1024),
            "5:7": (1280, 1792),
            "2:3": (768, 1152),
            "3:4": (768, 1024),
            "4:7": (768, 1344),
            "7:9": (896, 1152),
            "8:10": (1024, 1280),
            "13:19": (832, 1216)
        }
        if aspect_ratio not in aspect_ratios:
            aspect_ratio = "1:1"  # Default to 1:1 if not found
            print(f"Aspect ratio '{aspect_ratio}' not found, defaulting to 1:1.")

        width, height = aspect_ratios[aspect_ratio]
        if orientation == "Landscape":
            width, height = height, width

        width = int(round(width * multiplier / 64) * 64)
        height = int(round(height * multiplier / 64) * 64)

        return (width, height)

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
        if model_info is None:
            return ("", "", "", "", None)

        image = blank_image()
        try:
            json_data = get_civitai_model_version_json_by_hash(model_info["hash"])
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

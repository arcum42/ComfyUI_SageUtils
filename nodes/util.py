# Utility nodes
# This is for any misc utility nodes that don't fit into the other categories.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO

import folder_paths

from ..utils import *

import json

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

    CATEGORY = "Sage Utils/logic"
    DESCRIPTION = "Returns one of two values based on a condition."

    def if_else(self, condition, true_value, false_value) -> tuple:
        return (true_value if condition else false_value,)

class Sage_StringListTest(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "text": (IO.STRING, {"defaultInput": False}),
                "text2": (IO.STRING, {"defaultInput": False}),
                "text3": (IO.STRING, {"defaultInput": False}),
            }
        }

    RETURN_TYPES = (IO.BOOLEAN,)
    RETURN_NAMES = ("result",)

    FUNCTION = "test_list"

    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Returns a list of three strings."
    OUTPUT_IS_LIST = (True,)

    def test_list(self, text, text2, text3) -> tuple[str]:
        return ((text,text2,text3),)
    
class Sage_Foobar(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "separator": (IO.STRING, {"defaultInput": False, "default": ', '}),
                "str1": (IO.STRING, {"defaultInput": True, "multiline": True}),
                "str2": (IO.STRING, {"defaultInput": True, "multiline": True}),
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("output",)

    FUNCTION = "process"

    CATEGORY = "Sage Utils/Test"
    DESCRIPTION = "This node is strictly for testing purposes, and will constantly be changing and broken, as I'll test things for other nodes here."
    EXPERIMENTAL = True
    DEPRECATED = True

    def process(self, separator, **args) -> tuple[str]:
        print(args.values())
        print(vars(self))
        print(dir(self))
        print(self.__dict__)
        ret = separator.join(args.values())
        print(ret)
        return (ret,)

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
            json_data = get_civitai_model_version_json(model_info["hash"])
            if "modelId" in json_data:
                url = f"https://civitai.com/models/{json_data['modelId']}?modelVersionId={json_data['id']}"
                latest_version = get_latest_model_version(json_data["modelId"])
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
            json_data = get_civitai_model_version_json(hash)
            if "modelId" in json_data:
                url = f"https://civitai.com/models/{json_data['modelId']}?modelVersionId={json_data['id']}"
                latest_version = get_latest_model_version(json_data["modelId"])
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
            the_hash = cache.data[file_path]["hash"]
        except:
            print(f"Unable to hash file '{file_path}'. \n")
            the_hash = ""

        print(f"Hash for '{file_path}': {the_hash}")
        return (str(the_hash),)

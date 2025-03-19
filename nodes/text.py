# Text nodes.
# This contains any nodes that are dealing with text, including setting text, joining text, cleaning text, and viewing text.

from comfy.comfy_types import IO, ComfyNodeABC, InputTypeDict
from ..sage import *

class Sage_SetText(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(s):
        return {
            "optional": {
                "prefix": ("STRING", {"defaultInput": True, "multiline": True}),
                "suffix": ("STRING", {"defaultInput": True, "multiline": True})
            },
            "required": {
                "str": ("STRING", {"forceInput": False, "dynamicPrompts": True, "multiline": True})
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("str",)

    FUNCTION = "pass_str"

    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Sets some text."

    def pass_str(self, str, prefix=None, suffix=None):
        return (f"{prefix or ''}{str}{suffix or ''}",)

class Sage_JoinText(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "separator": ("STRING", {"defaultInput": False, "default": ', '}),
                "str1": ("STRING", {"defaultInput": True, "multiline": True}),
                "str2": ("STRING", {"defaultInput": True, "multiline": True}),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("str",)

    FUNCTION = "join_str"

    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Joins two strings with a separator."

    def join_str(self, separator, str1, str2):
        return (separator.join([str1, str2]),)

class Sage_TripleJoinText(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "separator": ("STRING", {"defaultInput": False, "default": ', '}),
                "str1": ("STRING", {"defaultInput": True, "multiline": True}),
                "str2": ("STRING", {"defaultInput": True, "multiline": True}),
                "str3": ("STRING", {"defaultInput": True, "multiline": True})
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("str",)

    FUNCTION = "join_str"

    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Joins three strings with a separator."

    def join_str(self, separator, str1, str2, str3):
        return (separator.join([str1, str2, str3]),)

class Sage_CleanText(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "str": ("STRING", {"defaultInput": True, "multiline": True}),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("cleaned_string",)

    FUNCTION = "clean_str"

    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Cleans up the string given."

    def clean_str(self, str):
        return (clean_text(str),)

class Sage_ViewText(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "text": (IO.ANY, {"forceInput": True, "multiline": True})
            }
        }

    RETURN_TYPES = ("STRING",)

    FUNCTION = "show_text"

    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Shows some text."
    OUTPUT_NODE = True
    INPUT_IS_LIST = True

    def show_text(self, text):
        print(f"Text is '{text}'")
        str = ""
        if isinstance(text, list):
            for t in text:
                str += f"{t}\n"
                print(f"String is '{t}'")
        else:
            str = text
        print(f"String is '{str}'")
        return { "ui": {"text": str}, "result" : (str,) }

class Sage_PonyPrefix(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "add_score": ("BOOLEAN", {"defaultInput": False}),
                "rating": (["none", "safe", "questionable", "explicit"], {"defaultInput": False}),
                "source": (["none", "pony", "furry", "anime", "cartoon", "3d", "western", "comic", "monster"], {"defaultInput": False}),
            },
            "optional": {
                "prompt": ("STRING", {"defaultInput": True, "multiline": True})
            }
        }

    RETURN_TYPES = ("STRING",)

    FUNCTION = "create_prefix"
    CATEGORY = "Sage Utils/text"

    def create_prefix(self, add_score, rating, source, prompt=None):
        prefix = "score_9, score_8_up, score_7_up, score_6_up, score_5_up, score_4_up, " if add_score else ""
        prefix += f"source_{source}, " if source != "none" else ""
        prefix += f"rating_{rating}, " if rating != "none" else ""
        prefix += f"{prompt or ''}"
        return (prefix,)

# Text nodes.
# This contains any nodes that are dealing with text, including setting text, joining text, cleaning text, and viewing text.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO

from ..utils import *

class Sage_SetText(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "optional": {
                "prefix": (IO.STRING, {"defaultInput": True, "multiline": True}),
                "suffix": (IO.STRING, {"defaultInput": True, "multiline": True})
            },
            "required": {
                "str": (IO.STRING, {"forceInput": False, "dynamicPrompts": True, "multiline": True})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("str",)

    FUNCTION = "pass_str"

    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Sets some text."

    def pass_str(self, str, prefix=None, suffix=None) -> tuple[str]:
        return (f"{prefix or ''}{str}{suffix or ''}",)

class Sage_JoinText(ComfyNodeABC):
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
    RETURN_NAMES = ("str",)

    FUNCTION = "join_str"

    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Joins two strings with a separator."

    def join_str(self, separator, str1, str2) -> tuple[str]:
        return (separator.join([str1, str2]),)

class Sage_TripleJoinText(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "separator": (IO.STRING, {"defaultInput": False, "default": ', '}),
                "str1": (IO.STRING, {"defaultInput": True, "multiline": True}),
                "str2": (IO.STRING, {"defaultInput": True, "multiline": True}),
                "str3": (IO.STRING, {"defaultInput": True, "multiline": True})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("str",)

    FUNCTION = "join_str"

    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Joins three strings with a separator."

    def join_str(self, separator, str1, str2, str3) -> tuple[str]:
        return (separator.join([str1, str2, str3]),)

class Sage_CleanText(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "str": (IO.STRING, {"defaultInput": True, "multiline": True}),
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("cleaned_string",)

    FUNCTION = "clean_str"

    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Cleans up the string given."

    def clean_str(self, str) -> tuple[str]:
        return (clean_text(str),)

class Sage_ViewText(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "text": (IO.STRING, {"forceInput": True, "multiline": True})
            }
        }

    RETURN_TYPES = (IO.STRING,)

    FUNCTION = "show_text"

    CATEGORY = "Sage Utils/depreciated/text"
    DESCRIPTION = "Shows some text."
    OUTPUT_NODE = True
    DEPRECATED = True

    def show_text(self, text) -> tuple[str]:
        print(f"String is '{text}'")
        return { "ui": {"text": text}, "result" : (text,) }


class Sage_ViewAnything(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "any": (IO.ANY, {"forceInput": True, "multiline": True})
            }
        }

    RETURN_TYPES = (IO.STRING,)

    FUNCTION = "show_text"

    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Shows some text."
    OUTPUT_NODE = True
    INPUT_IS_LIST = True

    def show_text(self, any) -> dict:
        print(f"Text is '{any}'")
        str = ""
        if isinstance(any, list):
            for t in any:
                str += f"{t}\n"
                print(f"String is '{t}'")
        else:
            str = any
        print(f"String is '{str}'")
        return { "ui": {"text": str}, "result" : (str,) }

class Sage_PonyPrefix(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "add_score": (IO.BOOLEAN, {"defaultInput": False}),
                "rating": (["none", "safe", "questionable", "explicit"], {"defaultInput": False}),
                "source": (["none", "pony", "furry", "anime", "cartoon", "3d", "western", "comic", "monster"], {"defaultInput": False}),
            },
            "optional": {
                "prompt": (IO.STRING, {"defaultInput": True, "multiline": True})
            }
        }

    RETURN_TYPES = (IO.STRING,)

    FUNCTION = "create_prefix"
    CATEGORY = "Sage Utils/text"

    def create_prefix(self, add_score, rating, source, prompt=None) -> tuple[str]:
        prefix = "score_9, score_8_up, score_7_up, score_6_up, score_5_up, score_4_up, " if add_score else ""
        prefix += f"source_{source}, " if source != "none" else ""
        prefix += f"rating_{rating}, " if rating != "none" else ""
        prefix += f"{prompt or ''}"
        return (prefix,)

class Sage_TextCompare(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "text1": (IO.STRING, {"defaultInput": True}),
                "text2": (IO.STRING, {"defaultInput": True}),
                "comparison_type": (["equal", "not_equal", "contains", "not_contains"], {"defaultInput": False}),
            }
        }

    RETURN_TYPES = (IO.BOOLEAN,)
    RETURN_NAMES = ("result",)

    FUNCTION = "compare"

    CATEGORY = "Sage Utils/logic"
    DESCRIPTION = "Compares two strings based on the selected comparison type."

    def compare(self, text1, text2, comparison_type) -> tuple[bool]:
        if comparison_type == "equal":
            return (text1 == text2,)
        elif comparison_type == "not_equal":
            return (text1 != text2,)
        elif comparison_type == "contains":
            return (text1 in text2,)
        elif comparison_type == "not_contains":
            return (text1 not in text2,)

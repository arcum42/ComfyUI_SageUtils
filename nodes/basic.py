# Basic nodes
# This includes nodes for setting values, logical nodes, potentially math nodes, etc. Text nodes are in their own file, as are image nodes.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO

from ..sage import *

class Sage_SetBool(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "bool": (IO.BOOLEAN, {"defaultInput": False}),
            }
        }

    RETURN_TYPES = (IO.BOOLEAN,)
    RETURN_NAMES = ("bool",)

    FUNCTION = "pass_bool"

    CATEGORY = "Sage Utils/depreciated/primitives"
    DESCRIPTION = "Sets an boolean."
    DEPRECATED = True

    def pass_bool(self, bool: bool) -> tuple[bool]:
        return (bool,)

class Sage_SetInteger(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "int": (IO.INT, {"defaultInput": False}),
            }
        }

    RETURN_TYPES = (IO.INT,)
    RETURN_NAMES = ("int",)

    FUNCTION = "pass_int"

    CATEGORY = "Sage Utils/depreciated/primitives"
    DESCRIPTION = "Sets an integer."
    DEPRECATED = True

    def pass_int(self, int: int) -> tuple[int]:
        return (int,)

class Sage_SetFloat(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "float": (IO.FLOAT, {"defaultInput": False}),
            }
        }

    RETURN_TYPES = (IO.FLOAT,)
    RETURN_NAMES = ("float",)

    FUNCTION = "pass_float"

    CATEGORY = "Sage Utils/depreciated/primitives"
    DESCRIPTION = "Sets an float."
    DEPRECATED = True

    def pass_float(self, float: float) -> tuple[float]:
        return (float,)

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
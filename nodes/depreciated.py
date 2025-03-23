from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO

from ..utils import *

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

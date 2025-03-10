# Basic nodes
# This includes nodes for setting values, logical nodes, potentially math nodes, etc. Text nodes are in their own file, as are image nodes.

from comfy.comfy_types import IO, ComfyNodeABC, InputTypeDict
from ..sage import *

class Sage_SetBool(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "bool": ("BOOLEAN", {"defaultInput": False}),
            }
        }

    RETURN_TYPES = ("BOOLEAN",)
    RETURN_NAMES = ("bool",)

    FUNCTION = "pass_bool"

    CATEGORY = "Sage Utils/primitives"
    DESCRIPTION = "Sets an boolean."

    def pass_bool(self, bool):
        return (bool,)

class Sage_SetInteger(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "int": ("INT", {"defaultInput": False}),
            }
        }

    RETURN_TYPES = ("INT",)
    RETURN_NAMES = ("int",)

    FUNCTION = "pass_int"

    CATEGORY = "Sage Utils/primitives"
    DESCRIPTION = "Sets an integer."

    def pass_int(self, int):
        return (int,)

class Sage_SetFloat(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "float": ("FLOAT", {"defaultInput": False}),
            }
        }

    RETURN_TYPES = ("FLOAT",)
    RETURN_NAMES = ("float",)

    FUNCTION = "pass_float"

    CATEGORY = "Sage Utils/primitives"
    DESCRIPTION = "Sets an float."

    def pass_float(self, float):
        return (float,)

class Sage_LogicalSwitch(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "condition": ("BOOLEAN", {"defaultInput": False}),
                "true_value": (IO.ANY,{"defaultInput": False}),
                "false_value": (IO.ANY,{"defaultInput": False})
            }
        }

    @classmethod
    def VALIDATE_INPUTS(s, input_types):
        return True

    RETURN_TYPES = (IO.ANY,)
    RETURN_NAMES = ("result",)

    FUNCTION = "if_else"

    CATEGORY = "Sage Utils/logic"
    DESCRIPTION = "Returns one of two values based on a condition."

    def if_else(self, condition, true_value, false_value):
        return (true_value if condition else false_value,)


from .utils.performance_timer import log_init

# Import all node classes
from .nodes.conditioning import *
from .nodes.deprecated import *
from .nodes.image import *
from .nodes.llm import *
from .nodes.loader import *
from .nodes.metadata import *
from .nodes.sampler import *
from .nodes.selector import *
from .nodes.text import *
from .nodes.training import *
from .nodes.util import *

log_init("V1_NODES_IMPORTED")


# Currently, we have to have two mappings: one for the class names and one for the display names.
# I've broken them up into sections to make it easier to manage.
#
# See: https://github.com/comfyanonymous/ComfyUI/tree/v3-definition
# and: https://github.com/comfyanonymous/ComfyUI/tree/v3-definition-wip
#
# v3 will require reimplementation of all nodes, and has you register a ComfyExtension instead.
# If you use the mappings below, it skips the check for ComfyExtension, and you can't use ComfyExtension
# to register non-v3 nodes.
# This makes converting to v3 all or nothing, and with the number of nodes here, it's easier to wait on v3.
# See load_custom_node in comfyui/nodes.py for how nodes are loaded.



# A dictionary that contains all nodes you want to export with their names
# NOTE: names should be globally unique
NODE_CLASS_MAPPINGS = UTILITY_CLASS_MAPPINGS | SELECTOR_CLASS_MAPPINGS |  TEXT_CLASS_MAPPINGS | PONY_CLASS_MAPPINGS | \
    LOADER_CLASS_MAPPINGS| MODEL_CLASS_MAPPINGS | LORA_CLASS_MAPPINGS | CLIP_CLASS_MAPPINGS | SAMPLER_CLASS_MAPPINGS | \
    IMAGE_CLASS_MAPPINGS | METADATA_CLASS_MAPPINGS | DEPRECATED_CLASS_MAPPINGS




# A dictionary that contains the friendly/human readable titles for the nodes
NODE_DISPLAY_NAME_MAPPINGS = UTILITY_NAME_MAPPINGS | SELECTOR_NAME_MAPPINGS | TEXT_NAME_MAPPINGS | PONY_NAME_MAPPINGS | \
    LOADER_NAME_MAPPINGS | MODEL_NAME_MAPPINGS | LORA_NAME_MAPPINGS | CLIP_NAME_MAPPINGS | SAMPLER_NAME_MAPPINGS | \
    IMAGE_NAME_MAPPINGS | METADATA_NAME_MAPPINGS | DEPRECATED_NAME_MAPPINGS

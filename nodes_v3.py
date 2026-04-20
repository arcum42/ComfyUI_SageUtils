# This file imports all the nodes in the nodes folder, and adds them to a list that is returned to ComfyUI when it 
# asks for the node list.

from comfy_api.latest import io, ComfyExtension
from typing_extensions import override
from .utils.performance_timer import log_init

from .nodes.conditioning_v3 import *
from .nodes.image_v3 import *

# Also imports ollama and lm studio.
from .nodes.llm_v3 import *

from .nodes.loader_v3 import *
from .nodes.metadata_v3 import *
from .nodes.sampler_v3 import *
from .nodes.selector_v3 import *
from .nodes.text_v3 import *
from .nodes.training_v3 import *
from .nodes.util_v3 import *
from .nodes.prompts_v3 import *

NODE_LIST = []
NODE_LIST = NODE_LIST + TEXT_NODES + PROMPT_NODES + CONDITIONING_NODES + LLM_NODES + IMAGE_NODES + \
    MODEL_NODES + METADATA_NODES + SELECTOR_NODES + TRAINING_NODES + UTIL_NODES + \
    SAMPLER_NODES 

class SageExtension(ComfyExtension):
    @override
    async def get_node_list(self) -> list[type[io.ComfyNode]]:
        return NODE_LIST

async def comfy_entrypoint() -> SageExtension:
    return SageExtension()

log_init("V3_NODES_IMPORTED")
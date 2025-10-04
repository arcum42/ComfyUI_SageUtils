# No real reason v1 and v3 nodes can't coexist, but the loader loads one of the other, so I guess I am too.
# Yay, twice as much work to maintain!

from comfy_api.latest import io, ComfyExtension
from typing_extensions import override
from .utils.performance_timer import log_init

from .nodes.conditioning_v3 import *
from .nodes.text_v3 import *

NODE_LIST = []
NODE_LIST = NODE_LIST + TEXT_NODES + CONDITIONING_NODES
class SageExtension(ComfyExtension):
    @override
    async def get_node_list(self) -> list[type[io.ComfyNode]]:
        return NODE_LIST

async def comfy_entrypoint() -> SageExtension:
    return SageExtension()

log_init("V3_NODES_IMPORTED")
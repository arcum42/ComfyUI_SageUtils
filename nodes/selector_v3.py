# Selector v3 nodes.
# This contains nodes for selecting model information without loading the actual models.
# See ref_docs/v3_migration.md for info on migrating to v3 nodes.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO
from comfy_api.latest import io, ComfyExtension
from typing_extensions import override

from comfy_api.latest._io import NodeOutput, Schema
from comfy_execution.graph_utils import GraphBuilder
from comfy_execution.graph import ExecutionBlocker


import folder_paths
from ..utils import model_info as mi
from comfy_execution.graph_utils import GraphBuilder
from ..utils import add_lora_to_stack
from ..utils import get_model_list
from ..utils.helpers_graph import (
    add_lora_stack_node
)

import logging

# Nodes to implement:
# Sage_CheckpointSelector
# Sage_UNETSelector
# Sage_VAESelector
# Sage_CLIPSelector
# Sage_DualCLIPSelector
# Sage_TripleCLIPSelector
# Sage_QuadCLIPSelector
# Sage_MultiSelectorSingleClip
# Sage_MultiSelectorDoubleClip
# Sage_MultiSelectorTripleClip
# Sage_MultiSelectorQuadClip
# Sage_ModelShifts
# Sage_ModelShiftOnly
# Sage_FreeU2
# Sage_UnetClipVaeToModelInfo
# Sage_LoraStack
# Sage_QuickLoraStack
# Sage_TripleLoraStack
# Sage_TripleQuickLoraStack
# Sage_QuickSixLoraStack
# Sage_QuickNineLoraStack
# Sage_SixLoraStack

SELECTOR_NODES = []

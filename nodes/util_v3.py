# Util nodes v3
# This is for any misc utility nodes that don't fit into the other categories.
# See ref_docs/v3_migration.md for info on migrating to v3 nodes.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO
from comfy_api.latest import io, ComfyExtension
from typing_extensions import override

from comfy_api.latest._io import NodeOutput, Schema
from comfy_execution.graph_utils import GraphBuilder
from comfy_execution.graph import ExecutionBlocker

from comfy.utils import ProgressBar

import folder_paths
import logging

# Nodes to implement:
# Sage_FreeMemory
# Sage_Halt
# Sage_LogicalSwitch
# Sage_ModelInfo
# Sage_ModelInfoDisplay
# Sage_LoraStackInfoDisplay
# Sage_LastLoraInfo
# Sage_GetFileHash
# Sage_CacheMaintenance
# Sage_ModelReport
# Sage_MultiModelPicker
# Sage_CollectKeywordsFromLoraStack
# Sage_CheckLorasForUpdates

UTIL_NODES = []

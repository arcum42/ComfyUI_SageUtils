# Model v3 nodes.
# This contains nodes involving models. Primarily loading models, but also includes nodes for model info and cache maintenance.

# See ref_docs/v3_migration.md for info on migrating to v3 nodes.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO
from comfy_api.latest import io, ComfyExtension
from typing_extensions import override

from comfy_api.latest._io import NodeOutput, Schema
from comfy_execution.graph_utils import GraphBuilder
from comfy_execution.graph import ExecutionBlocker

from ..utils.helpers import pull_metadata, update_model_timestamp, pull_and_update_model_timestamp

# Import specific utilities instead of wildcard import
from ..utils import get_lora_stack_keywords
from ..utils import model_info as mi
from ..utils.helpers_graph import (
    add_ckpt_node_from_info,
    add_unet_node_from_info,
    add_clip_node_from_info,
    add_vae_node_from_info,
    create_lora_nodes,
    create_lora_nodes_model_only,
    create_lora_nodes_v2,
    create_model_shift_nodes,
    create_model_shift_nodes_v2
)

from comfy_execution.graph_utils import GraphBuilder
import folder_paths
import logging

# Nodes to implement
# Sage_UNETLoaderFromInfo
# Sage_ClipLoaderFromInfo
# Sage_ChromaCLIPLoaderFromInfo
# Sage_VAELoaderFromInfo
# Sage_LoadModelFromInfo
# Sage_LoraStackLoader
# Sage_ModelLoraStackLoader
# Sage_UNETLoRALoader

MODEL_NODES = []
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
    add_ckpt_node,
    add_unet_node,
    add_clip_node,
    add_vae_node,
    create_model_shift_nodes,
    create_lora_nodes,
    create_lora_shift_nodes
)

from comfy_execution.graph_utils import GraphBuilder
import folder_paths
import logging

"""
    class Sage_NodeTest(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_NodeTest",
            display_name="Node Test",
            description="A template for how to make a v3 node.",
            category="Sage Utils/test",
            inputs=[
                io.Clip.Input(id="clip", display_name="clip", tooltip="The CLIP model used for encoding.")
            ],
            outputs=[
                io.Conditioning.Output(id="conditioning", display_name="conditioning", tooltip="A conditioning containing all zeros.")
            ]
        )

    @classmethod
    def execute(cls, **kwargs) -> NodeOutput:
        clip = kwargs.get("clip")
        conditioning = torch.zeros((1, 77, 768))  # Example zeroed conditioning

        return io.NodeOutput([conditioning])
"""
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
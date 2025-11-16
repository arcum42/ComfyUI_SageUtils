# Metadata v3 nodes.
# Metadata nodes for constructing A1111-style metadata.

# This module includes nodes for constructing metadata and related nodes.
# Saving metadata is handled in the image nodes.

# See ref_docs/v3_migration.md for info on migrating to v3 nodes.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO
from comfy_api.latest import io, ComfyExtension
from typing_extensions import override

from comfy_api.latest._io import NodeOutput, Schema
from comfy_execution.graph_utils import GraphBuilder
from comfy_execution.graph import ExecutionBlocker

from pathlib import Path
import json
from typing import Optional

import folder_paths
from comfy.comfy_types.node_typing import ComfyNodeABC, IO

from ..utils import (
    lora_to_prompt, civitai_sampler_name,pull_metadata, get_model_dict, cache,
)
from ..utils.model_info import collect_resource_hashes, model_name_and_hash_as_str, _get_model_name_from_info, _get_model_hash_from_info
from ..utils.config_manager import metadata_templates

# ============================================================================
# PLACEHOLDER NODES - NOT YET FULLY IMPLEMENTED
# ============================================================================
# These are placeholder implementations. The inputs/outputs match the original
# v1 nodes, but the execute methods need proper implementation.

class Sage_ConstructMetadataFlexible(io.ComfyNode):
    """PLACEHOLDER: Flexible metadata constructor with multiple style options."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_ConstructMetadataFlexible",
            display_name="Construct Metadata Flexible",
            description="PLACEHOLDER: Flexible metadata constructor supporting multiple styles: A1111 Full (with LoRA hashes), A1111 Lite (simplified, only includes models on Civitai), and Simple (No models or LoRAs).",
            category="Sage Utils/metadata",
            inputs=[
                io.Custom("MODEL_INFO").Input("model_info"),
                io.String.Input("positive_string", default=""),
                io.String.Input("negative_string", default=""),
                io.Custom("SAMPLER_INFO").Input("sampler_info"),
                io.Int.Input("width", default=1024),
                io.Int.Input("height", default=1024),
                io.Combo.Input("metadata_style", 
                             options=["A1111 Full", "A1111 Lite", "Simple"],
                             default="A1111 Full"),
                io.Custom("LORA_STACK").Input("lora_stack", optional=True)
            ],
            outputs=[
                io.String.Output("param_metadata")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from metadata.py
        # Should collect model info, sampler settings, LoRA info, and format
        # according to the selected metadata style template
        return io.NodeOutput("")

# ============================================================================

METADATA_NODES = [
    Sage_ConstructMetadataFlexible
]

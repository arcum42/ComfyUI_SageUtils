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

# Not implemented, low priority.

# ============================================================================
# PLACEHOLDER NODES - NOT YET FULLY IMPLEMENTED
# ============================================================================
# These are placeholder implementations. The inputs/outputs match the original
# v1 nodes, but the execute methods need proper implementation.

class Sage_FreeMemory(io.ComfyNode):
    """PLACEHOLDER: Free up memory by unloading all models."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_FreeMemory",
            display_name="Free Memory",
            description="PLACEHOLDER: Free up memory by unloading all models, clearing the model cache, and garbage collecting.",
            category="Sage Utils/util",
            inputs=[
                io.Boolean.Input("free_memory", default=False),
                io.AnyType.Input("value")
            ],
            outputs=[
                io.AnyType.Output("out_value", display_name="value")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from util.py
        value = kwargs.get("value", None)
        return io.NodeOutput(value)

class Sage_Halt(io.ComfyNode):
    """PLACEHOLDER: Continue or Halt the workflow from this point."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_Halt",
            display_name="Halt",
            description="PLACEHOLDER: Continue or Halt the workflow from this point.",
            category="Sage Utils/util",
            inputs=[
                io.Boolean.Input("continue_executing", default=True),
                io.AnyType.Input("value")
            ],
            outputs=[
                io.AnyType.Output("out_value", display_name="value")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from util.py
        value = kwargs.get("value", None)
        return io.NodeOutput(value)

class Sage_LogicalSwitch(io.ComfyNode):
    """PLACEHOLDER: Returns one of two values based on a condition."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_LogicalSwitch",
            display_name="Logical Switch",
            description="PLACEHOLDER: Returns one of two values based on a condition.",
            category="Sage Utils/util",
            inputs=[
                io.Boolean.Input("condition", default=True),
                io.AnyType.Input("true_value"),
                io.AnyType.Input("false_value")
            ],
            outputs=[
                io.AnyType.Output("result")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from util.py
        condition = kwargs.get("condition", True)
        true_value = kwargs.get("true_value", None)
        false_value = kwargs.get("false_value", None)
        return io.NodeOutput(true_value if condition else false_value)

class Sage_ModelInfo(io.ComfyNode):
    """PLACEHOLDER: Pull the civitai model info."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_ModelInfo",
            display_name="Model Info",
            description="PLACEHOLDER: Pull the civitai model info, and return what the base model is, the name with version, the url, the url for the latest version, and a preview image.",
            category="Sage Utils/model/info",
            inputs=[
                io.Custom("MODEL_INFO").Input("model_info")
            ],
            outputs=[
                io.String.Output("base_model"),
                io.String.Output("name"),
                io.String.Output("url"),
                io.String.Output("latest_url"),
                io.Image.Output("image")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from util.py
        return io.NodeOutput("", "", "", "", None)

class Sage_ModelInfoDisplay(io.ComfyNode):
    """PLACEHOLDER: Display model information in a formatted markdown block."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_ModelInfoDisplay",
            display_name="Model Info Display",
            description="PLACEHOLDER: Display model information in a formatted markdown block with civitai details, base model, name, version, and links.",
            category="Sage Utils/model/info",
            is_output_node=True,
            inputs=[
                io.Custom("MODEL_INFO").Input("model_info")
            ],
            outputs=[
                io.String.Output("markdown_display")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from util.py
        content = "# Model Information\n\n**No model information available.**"
        return io.NodeOutput(content)

class Sage_LoraStackInfoDisplay(io.ComfyNode):
    """PLACEHOLDER: Display information for all LoRAs in a lora_stack."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_LoraStackInfoDisplay",
            display_name="LoRA Stack Info Display",
            description="PLACEHOLDER: Display information for all LoRAs in a lora_stack as formatted markdown with civitai details, weights, and links.",
            category="Sage Utils/model/info",
            is_output_node=True,
            inputs=[
                io.Custom("LORA_STACK").Input("lora_stack")
            ],
            outputs=[
                io.String.Output("markdown_display")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from util.py
        content = "# LoRA Stack Information\n\n**No LoRAs in stack.**"
        return io.NodeOutput(content)

class Sage_LastLoraInfo(io.ComfyNode):
    """PLACEHOLDER: Pull civitai info for the last lora in the stack."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_LastLoraInfo",
            display_name="Last LoRA Info",
            description="PLACEHOLDER: Pull civitai info for the last lora in the stack and return details.",
            category="Sage Utils/model/info",
            inputs=[
                io.Custom("LORA_STACK").Input("lora_stack")
            ],
            outputs=[
                io.String.Output("base_model"),
                io.String.Output("name"),
                io.String.Output("url"),
                io.String.Output("latest_url"),
                io.Image.Output("image")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from util.py
        return io.NodeOutput("", "", "", "", None)

class Sage_GetFileHash(io.ComfyNode):
    """PLACEHOLDER: Get the hash of a file."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_GetFileHash",
            display_name="Get File Hash",
            description="PLACEHOLDER: Get the hash of a file.",
            category="Sage Utils/util",
            inputs=[
                io.String.Input("file_path")
            ],
            outputs=[
                io.String.Output("hash")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from util.py
        return io.NodeOutput("")

class Sage_CacheMaintenance(io.ComfyNode):
    """PLACEHOLDER: Perform cache maintenance operations."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_CacheMaintenance",
            display_name="Cache Maintenance",
            description="PLACEHOLDER: Perform cache maintenance operations like clearing or updating the cache.",
            category="Sage Utils/util",
            is_output_node=True,
            inputs=[
                io.Combo.Input("action", options=["clear", "update", "scan"], default="update")
            ],
            outputs=[
                io.String.Output("status")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from util.py
        return io.NodeOutput("Cache maintenance placeholder")

class Sage_ModelReport(io.ComfyNode):
    """PLACEHOLDER: Generate a report of all models."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_ModelReport",
            display_name="Model Report",
            description="PLACEHOLDER: Generate a report of all models with their information.",
            category="Sage Utils/model/info",
            is_output_node=True,
            inputs=[
                io.Boolean.Input("generate_report", default=True)
            ],
            outputs=[
                io.String.Output("report")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from util.py
        return io.NodeOutput("Model report placeholder")

class Sage_MultiModelPicker(io.ComfyNode):
    """PLACEHOLDER: Pick multiple models at once."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_MultiModelPicker",
            display_name="Multi Model Picker",
            description="PLACEHOLDER: Pick multiple models at once from available models.",
            category="Sage Utils/model",
            inputs=[
                io.Combo.Input("model_type", options=["checkpoint", "lora", "vae"], default="checkpoint")
            ],
            outputs=[
                io.String.Output("models")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from util.py
        return io.NodeOutput("")

class Sage_CollectKeywordsFromLoraStack(io.ComfyNode):
    """PLACEHOLDER: Collect keywords from all LoRAs in a stack."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_CollectKeywordsFromLoraStack",
            display_name="Collect Keywords From LoRA Stack",
            description="PLACEHOLDER: Collect keywords from all LoRAs in a stack.",
            category="Sage Utils/lora",
            inputs=[
                io.Custom("LORA_STACK").Input("lora_stack")
            ],
            outputs=[
                io.String.Output("keywords")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from util.py
        return io.NodeOutput("")

class Sage_CheckLorasForUpdates(io.ComfyNode):
    """PLACEHOLDER: Check if LoRAs in the stack have updates available."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_CheckLorasForUpdates",
            display_name="Check LoRAs For Updates",
            description="PLACEHOLDER: Check if LoRAs in the stack have updates available on Civitai.",
            category="Sage Utils/lora",
            is_output_node=True,
            inputs=[
                io.Custom("LORA_STACK").Input("lora_stack")
            ],
            outputs=[
                io.String.Output("update_status")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from util.py
        return io.NodeOutput("No updates checked")

# ============================================================================

UTIL_NODES = [
    Sage_FreeMemory,
    Sage_Halt,
    Sage_LogicalSwitch,
    Sage_ModelInfo,
    Sage_ModelInfoDisplay,
    Sage_LoraStackInfoDisplay,
    Sage_LastLoraInfo,
    Sage_GetFileHash,
    Sage_CacheMaintenance,
    Sage_ModelReport,
    Sage_MultiModelPicker,
    Sage_CollectKeywordsFromLoraStack,
    Sage_CheckLorasForUpdates
]

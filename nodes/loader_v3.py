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
    create_lora_shift_nodes,
    create_model_loader_nodes
)

from comfy_execution.graph_utils import GraphBuilder
import folder_paths
import logging

# Current status: Placeholder nodes only. Full implementations to be done.
# High priority nodes for implementation.

# Probably focus on these first:
# - Sage_LoadModelFromInfo
# - Sage_LoraStackLoader
# - Sage_ModelLoraStackLoader

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

class Sage_LoadModelFromInfo(io.ComfyNode):
    """Load model components from model info."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_LoadModelFromInfo",
            display_name="Load Models",
            description="Load model components from model info using GraphBuilder.",
            category="Sage Utils/model",
            enable_expand=True,
            inputs=[
                io.Custom("MODEL_INFO").Input("model_info"),
                io.Custom("MODEL_SHIFTS").Input("model_shifts", optional=True)
            ],
            outputs=[
                io.Model.Output("model"),
                io.Clip.Output("clip"),
                io.Vae.Output("vae")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        graph = GraphBuilder()
        model_info = kwargs.get("model_info", None)
        model_shifts = kwargs.get("model_shifts", None)
        print(f"model_info = {model_info}")
        print(f"model_shifts = {model_shifts}")
        unet_out, clip_out, vae_out = create_model_loader_nodes(graph, model_info)

        if isinstance(model_shifts, tuple) or isinstance(model_shifts, list):
            model_shifts = model_shifts[0]
        print(f"model_shifts (again) = {model_shifts}")
        if model_shifts is not None:
            exit_node, unet_out = create_model_shift_nodes(graph, unet_out, model_shifts)

        return io.NodeOutput(unet_out, clip_out, vae_out, expand = graph.finalize())

# ============================================================================
# PLACEHOLDER NODES - NOT YET FULLY IMPLEMENTED
# ============================================================================
# These are placeholder implementations. The inputs/outputs match the original
# v1 nodes, but the execute methods need proper implementation.


class Sage_UNETLoaderFromInfo(io.ComfyNode):
    """PLACEHOLDER: Load UNET model component from model info."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_UNETLoaderFromInfo",
            display_name="Load UNET Model <- Info",
            description="PLACEHOLDER: Load the UNET model component from unet_info.",
            category="Sage Utils/model",
            inputs=[
                io.Custom("UNET_INFO").Input("unet_info")
            ],
            outputs=[
                io.Model.Output("model")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from loader.py using GraphBuilder
        return io.NodeOutput(None)

class Sage_CLIPLoaderFromInfo(io.ComfyNode):
    """PLACEHOLDER: Load CLIP model component from model info."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_CLIPLoaderFromInfo",
            display_name="Load CLIP Model <- Info",
            description="PLACEHOLDER: Load the CLIP model component from clip_info.",
            category="Sage Utils/model",
            inputs=[
                io.Custom("CLIP_INFO").Input("clip_info")
            ],
            outputs=[
                io.Clip.Output("clip")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from loader.py using GraphBuilder
        return io.NodeOutput(None)

class Sage_ChromaCLIPLoaderFromInfo(io.ComfyNode):
    """PLACEHOLDER: Load Chroma CLIP model component from model info."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_ChromaCLIPLoaderFromInfo",
            display_name="Load CLIP (w/ Chroma T5 Options)",
            description="PLACEHOLDER: Load the CLIP model component from clip_info, and apply T5 tokenizer options with min padding of 1, and min length of 0.",
            category="Sage Utils/model",
            inputs=[
                io.Custom("CLIP_INFO").Input("clip_info")
            ],
            outputs=[
                io.Clip.Output("clip")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from loader.py using GraphBuilder
        return io.NodeOutput(None)

class Sage_VAELoaderFromInfo(io.ComfyNode):
    """PLACEHOLDER: Load VAE model component from model info."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_VAELoaderFromInfo",
            display_name="Load VAE Model <- Info",
            description="PLACEHOLDER: Load the VAE model component from vae_info.",
            category="Sage Utils/model",
            inputs=[
                io.Custom("VAE_INFO").Input("vae_info")
            ],
            outputs=[
                io.Vae.Output("vae")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from loader.py using GraphBuilder
        return io.NodeOutput(None)

class Sage_LoraStackLoader(io.ComfyNode):
    """PLACEHOLDER: Accept a lora_stack with Model and Clip, and apply all the loras in the stack at once."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_LoraStackLoader",
            display_name="Lora Stack Loader",
            description="PLACEHOLDER: Accept a lora_stack with Model and Clip, and apply all the loras in the stack at once.",
            category="Sage Utils/lora",
            inputs=[
                io.Model.Input("model"),
                io.Clip.Input("clip"),
                io.Custom("LORA_STACK").Input("lora_stack", optional=True),
                io.Custom("MODEL_SHIFTS").Input("model_shifts", optional=True)
            ],
            outputs=[
                io.Model.Output("out_model", display_name="model"),
                io.Clip.Output("out_clip", display_name="clip"),
                io.Custom("LORA_STACK").Output("out_lora_stack", display_name="lora_stack"),
                io.String.Output("keywords")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from loader.py using GraphBuilder
        model = kwargs.get("model", None)
        clip = kwargs.get("clip", None)
        lora_stack = kwargs.get("lora_stack", None)
        # Returns to out_model, out_clip, out_lora_stack, keywords
        return io.NodeOutput(model, clip, lora_stack, "")

class Sage_ModelLoraStackLoader(io.ComfyNode):
    """PLACEHOLDER: Load model components from model info and apply LoRA stack."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_ModelLoraStackLoader",
            display_name="Load Models + Loras",
            description="PLACEHOLDER: Load model components from model info using GraphBuilder and apply LoRA stack.",
            category="Sage Utils/model",
            inputs=[
                io.Custom("MODEL_INFO").Input("model_info"),
                io.Custom("LORA_STACK").Input("lora_stack", optional=True),
                io.Custom("MODEL_SHIFTS").Input("model_shifts", optional=True)
            ],
            outputs=[
                io.Model.Output("model"),
                io.Clip.Output("clip"),
                io.Vae.Output("vae"),
                io.Custom("LORA_STACK").Output("out_lora_stack", display_name="lora_stack"),
                io.String.Output("keywords")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from loader.py using GraphBuilder
        lora_stack = kwargs.get("lora_stack", None)
        return io.NodeOutput(None, None, None, lora_stack, "")

class Sage_UNETLoRALoader(io.ComfyNode):
    """PLACEHOLDER: Load UNET and apply LoRA stack (model only, no clip)."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_UNETLoRALoader",
            display_name="Load UNET + LoRA (Model Only)",
            description="PLACEHOLDER: Load UNET and apply LoRA stack. This loads the LoRA as model only, no clip.",
            category="Sage Utils/model",
            inputs=[
                io.Model.Input("model"),
                io.Custom("LORA_STACK").Input("lora_stack", optional=True),
                io.Custom("MODEL_SHIFTS").Input("model_shifts", optional=True)
            ],
            outputs=[
                io.Model.Output("out_model", display_name="model"),
                io.Custom("LORA_STACK").Output("out_lora_stack", display_name="lora_stack"),
                io.String.Output("keywords")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from loader.py using GraphBuilder
        lora_stack = kwargs.get("lora_stack", None)
        return io.NodeOutput(None, lora_stack, "")

# ============================================================================

MODEL_NODES = [
    Sage_LoadModelFromInfo,
    Sage_UNETLoaderFromInfo,
    Sage_CLIPLoaderFromInfo,
    Sage_ChromaCLIPLoaderFromInfo,
    Sage_VAELoaderFromInfo,
    Sage_LoraStackLoader,
    Sage_ModelLoraStackLoader,
    Sage_UNETLoRALoader
]
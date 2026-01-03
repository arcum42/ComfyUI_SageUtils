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

from .custom_io_v3 import ModelInfo, UnetInfo, VaeInfo, ClipInfo, ModelShiftInfo, LoraStack
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

# Sage_LoadModelFromInfo & Sage_UNETLoaderFromInfo implemented manually. Others need checking.

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
                ModelInfo.Input("model_info", display_name="model_info"),
                ModelShiftInfo.Input("model_shifts", display_name="model_shifts", optional=True)
            ],
            outputs=[
                io.Model.Output("model", display_name="model"),
                io.Clip.Output("clip", display_name="clip"),
                io.Vae.Output("vae", display_name="vae")
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

class Sage_UNETLoaderFromInfo(io.ComfyNode):
    """Load UNET model component from model info."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_UNETLoaderFromInfo",
            display_name="Load UNET Model <- Info",
            description="Load the UNET model component from unet_info.",
            category="Sage Utils/model",
            enable_expand=True,
            inputs=[
                UnetInfo.Input("unet_info", display_name="unet_info")
            ],
            outputs=[
                io.Model.Output("model", display_name="model")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        unet_info = kwargs.get("unet_info", None)
        
        graph = GraphBuilder()
        unet_node = add_unet_node(graph, unet_info)
        if unet_node is None or unet_info is None:
            raise ValueError("Failed to create UNET node from unet_info.")
        else:
            pull_and_update_model_timestamp(unet_info.get("path",""), model_type="unet")
        logging.info(f"Sage_UNETLoaderFromInfo: Loaded UNET from {unet_info.get('path','')}")

        unet_out = unet_node.out(0) if unet_node else None
        return io.NodeOutput(unet_out, expand = graph.finalize())

class Sage_CLIPLoaderFromInfo(io.ComfyNode):
    """Load CLIP model component from model info."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_CLIPLoaderFromInfo",
            display_name="Load CLIP Model <- Info",
            description="Load the CLIP model component from clip_info.",
            category="Sage Utils/model",
            enable_expand=True,
            inputs=[
                ClipInfo.Input("clip_info", display_name="clip_info")
            ],
            outputs=[
                io.Clip.Output("clip")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        clip_info = kwargs.get("clip_info", None)
        graph = GraphBuilder()
        clip_node = add_clip_node(graph, clip_info)
        if clip_node is None or clip_info is None:
            raise ValueError("Failed to create CLIP node from clip_info.")
        else:
            pull_and_update_model_timestamp(clip_info.get("path",""), model_type="clip")
        logging.info(f"Sage_CLIPLoaderFromInfo: Loaded CLIP from {clip_info.get('path','')}")
        clip_out = clip_node.out(0) if clip_node else None
        return io.NodeOutput(clip_out, expand=graph.finalize())

class Sage_ChromaCLIPLoaderFromInfo(io.ComfyNode):
    """Load Chroma CLIP model component from model info (adds T5 tokenizer options)."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_ChromaCLIPLoaderFromInfo",
            display_name="Load CLIP (w/ Chroma T5 Options)",
            description="Load the CLIP model component from clip_info, and apply T5 tokenizer options with min padding of 1, and min length of 0.",
            category="Sage Utils/model",
            enable_expand=True,
            inputs=[
                ClipInfo.Input("clip_info", display_name="clip_info")
            ],
            outputs=[
                io.Clip.Output("clip")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        clip_info = kwargs.get("clip_info", None)
        graph = GraphBuilder()
        clip_node = add_clip_node(graph, clip_info)
        if clip_node is None or clip_info is None:
            raise ValueError("Failed to create CLIP node from clip_info.")
        else:
            pull_and_update_model_timestamp(clip_info.get("path",""), model_type="clip")
        chroma_node = graph.node("T5TokenizerOptions", clip=clip_node.out(0), min_padding=1, min_length=0)
        logging.info(f"Sage_ChromaCLIPLoaderFromInfo: Loaded Chroma CLIP from {clip_info.get('path','')}")
        return io.NodeOutput(chroma_node.out(0), expand=graph.finalize())

class Sage_VAELoaderFromInfo(io.ComfyNode):
    """Load VAE model component from model info."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_VAELoaderFromInfo",
            display_name="Load VAE Model <- Info",
            description="Load the VAE model component from vae_info.",
            category="Sage Utils/model",
            enable_expand=True,
            inputs=[
                VaeInfo.Input("vae_info", display_name="vae_info")
            ],
            outputs=[
                io.Vae.Output("vae", display_name="vae")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        vae_info = kwargs.get("vae_info", None)
        graph = GraphBuilder()
        vae_node = add_vae_node(graph, vae_info)
        if vae_node is None or vae_info is None:
            raise ValueError("Failed to create VAE node from vae_info.")
        else:
            pull_and_update_model_timestamp(vae_info.get("path",""), model_type="vae")
        logging.info(f"Sage_VAELoaderFromInfo: Loaded VAE from {vae_info.get('path','')}")
        vae_out = vae_node.out(0) if vae_node else None
        return io.NodeOutput(vae_out, expand=graph.finalize())

class Sage_LoraStackLoader(io.ComfyNode):
    """Accept a lora_stack with Model and Clip, and apply all the loras in the stack at once."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_LoraStackLoader",
            display_name="Lora Stack Loader",
            description="Accept a lora_stack with Model and Clip, and apply all the loras in the stack at once.",
            category="Sage Utils/lora",
            enable_expand=True,
            inputs=[
                io.Model.Input("model", display_name="model"),
                io.Clip.Input("clip", display_name="clip"),
                LoraStack.Input("lora_stack", display_name="lora_stack", optional=True),
                ModelShiftInfo.Input("model_shifts", display_name="model_shifts", optional=True)
            ],
            outputs=[
                io.Model.Output("out_model", display_name="model"),
                io.Clip.Output("out_clip", display_name="clip"),
                LoraStack.Output("out_lora_stack", display_name="lora_stack"),
                io.String.Output("keywords", display_name="keywords")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        model = kwargs.get("model", None)
        clip = kwargs.get("clip", None)
        lora_stack = kwargs.get("lora_stack", None)
        model_shifts = kwargs.get("model_shifts", None)
        if isinstance(model_shifts, (list, tuple)):
            model_shifts = model_shifts[0]
        if isinstance(lora_stack, (list, tuple)):
            lora_stack = lora_stack[0]
        graph = GraphBuilder()
        exit_node, exit_unet, exit_clip = create_lora_shift_nodes(graph, model, clip, lora_stack, model_shifts)
        if lora_stack is not None and exit_unet is not None:
            try:
                lora_paths = [folder_paths.get_full_path_or_raise("loras", lora[0]) for lora in lora_stack]
                pull_and_update_model_timestamp(lora_paths, model_type="lora")
            except Exception as e:
                logging.warning(f"Timestamp update failed for loras: {e}")
        keywords = get_lora_stack_keywords(lora_stack) if lora_stack is not None else ""
        return io.NodeOutput(exit_unet, exit_clip, lora_stack, keywords, expand=graph.finalize())

class Sage_ModelLoraStackLoader(io.ComfyNode):
    """Load model components from model info and apply LoRA stack."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_ModelLoraStackLoader",
            display_name="Load Models + Loras",
            description="Load model components from model info using GraphBuilder and apply LoRA stack.",
            category="Sage Utils/model",
            enable_expand=True,
            inputs=[
                ModelInfo.Input("model_info", display_name="model_info"),
                LoraStack.Input("lora_stack", display_name="lora_stack", optional=True),
                ModelShiftInfo.Input("model_shifts", display_name="model_shifts", optional=True)
            ],
            outputs=[
                io.Model.Output("model", display_name="model"),
                io.Clip.Output("clip", display_name="clip"),
                io.Vae.Output("vae", display_name="vae"),
                LoraStack.Output("out_lora_stack", display_name="lora_stack"),
                io.String.Output("keywords", display_name="keywords")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        model_info = kwargs.get("model_info", None)
        lora_stack = kwargs.get("lora_stack", None)
        model_shifts = kwargs.get("model_shifts", None)
        if isinstance(model_shifts, (list, tuple)):
            model_shifts = model_shifts[0]
        graph = GraphBuilder()

        unet_out, clip_out, vae_out = create_model_loader_nodes(graph, model_info)
        exit_node, exit_unet, exit_clip = create_lora_shift_nodes(graph, unet_out, clip_out, lora_stack, model_shifts)
        if lora_stack is not None and exit_unet is not None:
            try:
                lora_paths = [folder_paths.get_full_path_or_raise("loras", lora[0]) for lora in lora_stack]
                pull_and_update_model_timestamp(lora_paths, model_type="lora")
            except Exception as e:
                logging.warning(f"Timestamp update failed for loras: {e}")
        keywords = get_lora_stack_keywords(lora_stack) if lora_stack is not None else ""
        return io.NodeOutput(exit_unet, exit_clip, vae_out, lora_stack, keywords, expand=graph.finalize())

class Sage_UNETLoRALoader(io.ComfyNode):
    """Load UNET (already provided as model) and apply LoRA stack (model only, no clip)."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_UNETLoRALoader",
            display_name="Load UNET + LoRA (Model Only)",
            description="Apply LoRA stack and model shifts to an already loaded UNET model. No clip modifications.",
            category="Sage Utils/model",
            enable_expand=True,
            inputs=[
                io.Model.Input("model", display_name="model"),
                LoraStack.Input("lora_stack", display_name="lora_stack", optional=True),
                ModelShiftInfo.Input("model_shifts", display_name="model_shifts", optional=True)
            ],
            outputs=[
                io.Model.Output("out_model", display_name="model"),
                LoraStack.Output("out_lora_stack", display_name="lora_stack"),
                io.String.Output("keywords", display_name="keywords")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        model = kwargs.get("model", None)
        lora_stack = kwargs.get("lora_stack", None)
        model_shifts = kwargs.get("model_shifts", None)
        if isinstance(model_shifts, (list, tuple)):
            model_shifts = model_shifts[0]
        if isinstance(lora_stack, (list, tuple)):
            lora_stack = lora_stack[0]
        graph = GraphBuilder()
        exit_node, exit_unet, _ = create_lora_shift_nodes(graph, model, None, lora_stack, model_shifts)
        if lora_stack is not None and exit_unet is not None:
            try:
                lora_paths = [folder_paths.get_full_path_or_raise("loras", lora[0]) for lora in lora_stack]
                pull_and_update_model_timestamp(lora_paths, model_type="lora")
            except Exception as e:
                logging.warning(f"Timestamp update failed for loras: {e}")
        keywords = get_lora_stack_keywords(lora_stack) if lora_stack is not None else ""
        return io.NodeOutput(exit_unet, lora_stack, keywords, expand=graph.finalize())

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
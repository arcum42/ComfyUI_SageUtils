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
from .custom_io_v3 import *

import logging

# Fully implemented selector nodes:
# - Sage_CheckpointSelector
# - Sage_UNETSelector
# - Sage_VAESelector
# - Sage_CLIPSelector
# - Sage_DualCLIPSelector
# - Sage_TripleCLIPSelector
# - Sage_QuadCLIPSelector
# - Sage_MultiSelectorSingleClip
# - Sage_MultiSelectorDoubleClip
# - Sage_MultiSelectorTripleClip
# - Sage_MultiSelectorQuadClip
# - Sage_ModelShifts
# - Sage_ModelShiftOnly
# - Sage_FreeU2
# - Sage_UnetClipVaeToModelInfo
# - Sage_LoraStack
# - Sage_QuickLoraStack
# - Sage_TripleLoraStack
# - Sage_TripleQuickLoraStack
# - Sage_QuickSixLoraStack
# - Sage_QuickNineLoraStack
# - Sage_SixLoraStack
# - Sage_TilingInfo

class Sage_CheckpointSelector(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_CheckpointSelector",
            display_name="Checkpoint Selector",
            description="Selects a checkpoint from a list.",
            category="Sage Utils/selector",
            inputs=[
                io.Combo.Input("ckpt_name", display_name="ckpt_name", options=get_model_list("checkpoints")),
            ],
            outputs=[
                ModelInfo.Output("model_info", display_name="model_info")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        ckpt_name = kwargs.get("ckpt_name", "")
        info = mi.get_model_info_ckpt(ckpt_name)
        return io.NodeOutput(info)

class Sage_UNETSelector(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_UNETSelector",
            display_name="UNET Selector",
            description="Selects a UNET model from a list.",
            category="Sage Utils/selector",
            inputs=[
                io.Combo.Input("unet_name", display_name="unet_name", options=get_model_list("unet")),
                io.Combo.Input("weight_dtype", display_name="weight_dtype", options=mi.weight_dtype_options, default="default"),
            ],
            outputs=[
                UnetInfo.Output("unet_info", display_name="unet_info")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        unet_name = kwargs.get("unet_name", "")
        weight_dtype = kwargs.get("weight_dtype", "default")
        info = mi.get_model_info_unet(unet_name, weight_dtype)
        return io.NodeOutput(info)

class Sage_VAESelector(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_VAESelector",
            display_name="VAE Selector",
            description="Selects a VAE model from a list.",
            category="Sage Utils/selector",
            inputs=[
                io.Combo.Input("vae_name", display_name="vae_name", options=get_model_list("vae")),
            ],
            outputs=[
                VaeInfo.Output("Selector: vae_info", display_name="vae_info")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        vae_name = kwargs.get("vae_name", "")
        info = mi.get_model_info_vae(vae_name)
        print(f"VAE info: {info}")
        return io.NodeOutput(info)

class Sage_CLIPSelector(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_CLIPSelector",
            display_name="CLIP Selector",
            description="Selects a CLIP model from a list.",
            category="Sage Utils/selector",
            inputs=[
                io.Combo.Input("clip_name", display_name="clip_name", options=get_model_list("clip")),
                io.Combo.Input("clip_type", display_name="clip_type", options=mi.single_clip_loader_options, default="chroma"),
            ],
            outputs=[
                ClipInfo.Output("clip_info", display_name="clip_info")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        clip_name = kwargs.get("clip_name", "")
        clip_type = kwargs.get("clip_type", "chroma")
        info = mi.get_model_info_clips([clip_name], clip_type)
        return io.NodeOutput(info)

class Sage_DualCLIPSelector(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        clip_list = get_model_list("clip")
        return io.Schema(
            node_id="Sage_DualCLIPSelector",
            display_name="Dual CLIP Selector",
            description="Selects two CLIP models from a list.",
            category="Sage Utils/selector",
            inputs=[
                io.Combo.Input("clip_name_1", display_name="clip_name_1", options=clip_list),
                io.Combo.Input("clip_name_2", display_name="clip_name_2", options=clip_list),
                io.Combo.Input("clip_type", display_name="clip_type", options=mi.dual_clip_loader_options, default="sdxl"),
            ],
            outputs=[
                ClipInfo.Output("clip_info", display_name="clip_info")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        clip_name_1 = kwargs.get("clip_name_1", "")
        clip_name_2 = kwargs.get("clip_name_2", "")
        clip_type = kwargs.get("clip_type", "sdxl")
        info = mi.get_model_info_clips([clip_name_1, clip_name_2], clip_type)
        return io.NodeOutput(info)

class Sage_TripleCLIPSelector(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        clip_list = get_model_list("clip")
        return io.Schema(
            node_id="Sage_TripleCLIPSelector",
            display_name="Triple CLIP Selector",
            description="Selects three CLIP models from a list.",
            category="Sage Utils/selector",
            inputs=[
                io.Combo.Input("clip_name_1", display_name="clip_name_1", options=clip_list),
                io.Combo.Input("clip_name_2", display_name="clip_name_2", options=clip_list),
                io.Combo.Input("clip_name_3", display_name="clip_name_3", options=clip_list),
            ],
            outputs=[
                ClipInfo.Output("clip_info", display_name="clip_info")
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        clip_name_1 = kwargs.get("clip_name_1", "")
        clip_name_2 = kwargs.get("clip_name_2", "")
        clip_name_3 = kwargs.get("clip_name_3", "")
        info = mi.get_model_info_clips([clip_name_1, clip_name_2, clip_name_3])
        return io.NodeOutput(info)

class Sage_QuadCLIPSelector(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        clip_list = get_model_list("clip")
        return io.Schema(
            node_id="Sage_QuadCLIPSelector",
            display_name="Quad CLIP Selector",
            description="Selects four CLIP models from a list.",
            category="Sage Utils/selector",
            inputs=[
                io.Combo.Input("clip_name_1", display_name="clip_name_1", options=clip_list),
                io.Combo.Input("clip_name_2", display_name="clip_name_2", options=clip_list),
                io.Combo.Input("clip_name_3", display_name="clip_name_3", options=clip_list),
                io.Combo.Input("clip_name_4", display_name="clip_name_4", options=clip_list),
            ],
            outputs=[
                ClipInfo.Output("clip_info", display_name="clip_info")
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        clip_name_1 = kwargs.get("clip_name_1", "")
        clip_name_2 = kwargs.get("clip_name_2", "")
        clip_name_3 = kwargs.get("clip_name_3", "")
        clip_name_4 = kwargs.get("clip_name_4", "")
        info = mi.get_model_info_clips([clip_name_1, clip_name_2, clip_name_3, clip_name_4])
        return io.NodeOutput(info)

class Sage_MultiSelectorSingleClip(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_MultiSelectorSingleClip",
            display_name="Multi Selector Single CLIP",
            description="Selects checkpoint, UNET, VAE, and single CLIP models from lists.",
            category="Sage Utils/selector",
            inputs=[
                io.Combo.Input("unet_name", display_name="unet_name", options=get_model_list("unet")),
                io.Combo.Input("weight_dtype", display_name="weight_dtype", options=mi.weight_dtype_options, default="default"),
                io.Combo.Input("clip_name", display_name="clip_name", options=get_model_list("clip")),
                io.Combo.Input("clip_type", display_name="clip_type", options=mi.single_clip_loader_options, default="chroma"),
                io.Combo.Input("vae_name", display_name="vae_name", options=get_model_list("vae")),
            ],
            outputs=[
                ModelInfo.Output("model_info", display_name="model_info")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        unet_name = kwargs.get("unet_name", "")
        weight_dtype = kwargs.get("weight_dtype", "default")
        clip_name = kwargs.get("clip_name", "")
        clip_type = kwargs.get("clip_type", "chroma")
        vae_name = kwargs.get("vae_name", "")

        unet_info = mi.get_model_info_unet(unet_name, weight_dtype)
        clip_info = mi.get_model_info_clips([clip_name], clip_type)
        vae_info = mi.get_model_info_vae(vae_name)

        ret = (unet_info[0], clip_info[0], vae_info[0])
        return io.NodeOutput(ret,)

class Sage_MultiSelectorDoubleClip(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        clip_list = get_model_list("clip")
        return io.Schema(
            node_id="Sage_MultiSelectorDoubleClip",
            display_name="Multi Selector Double CLIP",
            description="Selects checkpoint, UNET, VAE, and two CLIP models from lists.",
            category="Sage Utils/selector",
            inputs=[
                io.Combo.Input("unet_name", display_name="unet_name", options=get_model_list("unet")),
                io.Combo.Input("weight_dtype", display_name="weight_dtype", options=mi.weight_dtype_options, default="default"),
                io.Combo.Input("clip_name_1", display_name="clip_name_1", options=clip_list),
                io.Combo.Input("clip_name_2", display_name="clip_name_2", options=clip_list),
                io.Combo.Input("clip_type", display_name="clip_type", options=mi.dual_clip_loader_options, default="sdxl"),
                io.Combo.Input("vae_name", display_name="vae_name", options=get_model_list("vae")),
            ],
            outputs=[
                ModelInfo.Output("model_info", display_name="model_info")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        unet_name = kwargs.get("unet_name", "")
        weight_dtype = kwargs.get("weight_dtype", "default")
        clip_name_1 = kwargs.get("clip_name_1", "")
        clip_name_2 = kwargs.get("clip_name_2", "")
        clip_type = kwargs.get("clip_type", "sdxl")
        vae_name = kwargs.get("vae_name", "")

        unet_info = mi.get_model_info_unet(unet_name, weight_dtype)
        clip_info = mi.get_model_info_clips([clip_name_1, clip_name_2], clip_type)
        vae_info = mi.get_model_info_vae(vae_name)

        ret = (unet_info[0], clip_info[0], vae_info[0])
        return io.NodeOutput(ret,)

class Sage_MultiSelectorTripleClip(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        clip_list = get_model_list("clip")
        return io.Schema(
            node_id="Sage_MultiSelectorTripleClip",
            display_name="Multi Selector Triple CLIP",
            description="Selects checkpoint, UNET, VAE, and three CLIP models from lists.",
            category="Sage Utils/selector",
            inputs=[
                io.Combo.Input("unet_name", display_name="unet_name", options=get_model_list("unet")),
                io.Combo.Input("weight_dtype", display_name="weight_dtype", options=mi.weight_dtype_options, default="default"),
                io.Combo.Input("clip_name_1", display_name="clip_name_1", options=get_model_list("clip")),
                io.Combo.Input("clip_name_2", display_name="clip_name_2", options=clip_list),
                io.Combo.Input("clip_name_3", display_name="clip_name_3", options=clip_list),
                io.Combo.Input("vae_name", display_name="vae_name", options=get_model_list("vae")),
            ],
            outputs=[
                ModelInfo.Output("model_info", display_name="model_info")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        unet_name = kwargs.get("unet_name", "")
        weight_dtype = kwargs.get("weight_dtype", "default")
        clip_name_1 = kwargs.get("clip_name_1", "")
        clip_name_2 = kwargs.get("clip_name_2", "")
        clip_name_3 = kwargs.get("clip_name_3", "")
        vae_name = kwargs.get("vae_name", "")

        unet_info = mi.get_model_info_unet(unet_name, weight_dtype)
        clip_info = mi.get_model_info_clips([clip_name_1, clip_name_2, clip_name_3])
        vae_info = mi.get_model_info_vae(vae_name)

        ret = (unet_info[0], clip_info[0], vae_info[0])
        return io.NodeOutput(ret,)

class Sage_MultiSelectorQuadClip(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        clip_list = get_model_list("clip")
        return io.Schema(
            node_id="Sage_MultiSelectorQuadClip",
            display_name="Multi Selector Quad CLIP",
            description="Selects checkpoint, UNET, VAE, and four CLIP models from lists.",
            category="Sage Utils/selector",
            inputs=[
                io.Combo.Input("unet_name", display_name="unet_name", options=get_model_list("unet")),
                io.Combo.Input("weight_dtype", display_name="weight_dtype", options=mi.weight_dtype_options, default="default"),
                io.Combo.Input("clip_name_1", display_name="clip_name_1", options=clip_list),
                io.Combo.Input("clip_name_2", display_name="clip_name_2", options=clip_list),
                io.Combo.Input("clip_name_3", display_name="clip_name_3", options=clip_list),
                io.Combo.Input("clip_name_4", display_name="clip_name_4", options=clip_list),
                io.Combo.Input("vae_name", display_name="vae_name", options=get_model_list("vae")),
            ],
            outputs=[
                ModelInfo.Output("model_info", display_name="model_info")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        unet_name = kwargs.get("unet_name", "")
        weight_dtype = kwargs.get("weight_dtype", "default")
        clip_name_1 = kwargs.get("clip_name_1", "")
        clip_name_2 = kwargs.get("clip_name_2", "")
        clip_name_3 = kwargs.get("clip_name_3", "")
        clip_name_4 = kwargs.get("clip_name_4", "")
        vae_name = kwargs.get("vae_name", "")

        unet_info = mi.get_model_info_unet(unet_name, weight_dtype)
        clip_info = mi.get_model_info_clips([clip_name_1, clip_name_2, clip_name_3, clip_name_4])
        vae_info = mi.get_model_info_vae(vae_name)

        ret = (unet_info[0], clip_info[0], vae_info[0])
        return io.NodeOutput(ret,)

class Sage_ModelShifts(io.ComfyNode):
    """Get the model shifts and free_u2 settings to apply to the model."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_ModelShifts",
            display_name="Model Shifts",
            description="Get the model shifts and free_u2 settings to apply to the model. This is used by the model loader node.",
            category="Sage Utils/model",
            inputs=[
                io.Combo.Input("shift_type", display_name="shift_type", options=["None", "x1", "x1000"], default="None"),
                io.Float.Input("shift", display_name="shift", default=3.0, min=0.0, max=100.0, step=0.01),
                io.Boolean.Input("freeu_v2", display_name="freeu_v2", default=False),
                io.Float.Input("b1", display_name="b1", default=1.3, min=0.0, max=10.0, step=0.01),
                io.Float.Input("b2", display_name="b2", default=1.4, min=0.0, max=10.0, step=0.01),
                io.Float.Input("s1", display_name="s1", default=0.9, min=0.0, max=10.0, step=0.01),
                io.Float.Input("s2", display_name="s2", default=0.2, min=0.0, max=10.0, step=0.01)
            ],
            outputs=[
                ModelShiftInfo.Output("model_shifts", display_name="model_shifts")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        return io.NodeOutput({
            "shift_type": kwargs.get("shift_type", "None"),
            "shift": kwargs.get("shift", 3.0),
            "freeu_v2": kwargs.get("freeu_v2", False),
            "b1": kwargs.get("b1", 1.3),
            "b2": kwargs.get("b2", 1.4),
            "s1": kwargs.get("s1", 0.9),
            "s2": kwargs.get("s2", 0.2)
        })

class Sage_ModelShiftOnly(io.ComfyNode):
    """Get the model shifts to apply to the model."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_ModelShiftOnly",
            display_name="Model Shift Only",
            description="Get the model shifts to apply to the model. This is used by the model loader node.",
            category="Sage Utils/model",
            inputs=[
                io.Combo.Input("shift_type", display_name="shift_type", options=["None", "x1", "x1000"], default="None"),
                io.Float.Input("shift", display_name="shift", default=3.0, min=0.0, max=100.0, step=0.01)
            ],
            outputs=[
                ModelShiftInfo.Output("model_shifts", display_name="model_shifts")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        return io.NodeOutput({
            "shift_type": kwargs.get("shift_type", "None"),
            "shift": kwargs.get("shift", 3.0),
            "freeu_v2": False,
            "b1": 1.3,
            "b2": 1.4,
            "s1": 0.9,
            "s2": 0.2
        })

class Sage_FreeU2(io.ComfyNode):
    """Get the free_u2 settings to apply to the model."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_FreeU2",
            display_name="FreeU v2",
            description="Get the free_u2 settings to apply to the model.",
            category="Sage Utils/model",
            inputs=[
                io.Boolean.Input("freeu_v2", display_name="freeu_v2", default=False),
                io.Float.Input("b1", display_name="b1", default=1.3, min=0.0, max=10.0, step=0.01),
                io.Float.Input("b2", display_name="b2", default=1.4, min=0.0, max=10.0, step=0.01),
                io.Float.Input("s1", display_name="s1", default=0.9, min=0.0, max=10.0, step=0.01),
                io.Float.Input("s2", display_name="s2", default=0.2, min=0.0, max=10.0, step=0.01)
            ],
            outputs=[
                ModelShiftInfo.Output("model_shifts", display_name="model_shifts")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        return io.NodeOutput({
            "shift_type": "None",
            "shift": 0,
            "freeu_v2": kwargs.get("freeu_v2", False),
            "b1": kwargs.get("b1", 1.3),
            "b2": kwargs.get("b2", 1.4),
            "s1": kwargs.get("s1", 0.9),
            "s2": kwargs.get("s2", 0.2)
        })

class Sage_TilingInfo(io.ComfyNode):
    """Adds tiling information to the KSampler."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_TilingInfo",
            display_name="Tiling Info",
            description="Adds tiling information to the KSampler.",
            category="Sage Utils/sampler",
            inputs=[
                io.Int.Input("tile_size", display_name="tile_size", default=512, min=64, max=4096, step=32),
                io.Int.Input("overlap", display_name="overlap", default=64, min=0, max=4096, step=32),
                io.Int.Input("temporal_size", display_name="temporal_size", default=64, min=8, max=4096, step=4, tooltip="Only used for video VAEs: Amount of frames to decode at a time."),
                io.Int.Input("temporal_overlap", display_name="temporal_overlap", default=8, min=4, max=4096, step=4, tooltip="Only used for video VAEs: Amount of frames to overlap.")
            ],
            outputs=[
                TilingInfo.Output("tiling_info", display_name="tiling_info")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        tile_size = kwargs.get("tile_size", 512)
        overlap = kwargs.get("overlap", 64)
        temporal_size = kwargs.get("temporal_size", 64)
        temporal_overlap = kwargs.get("temporal_overlap", 8)
        
        t_info = {
            "tile_size": tile_size,
            "overlap": overlap,
            "temporal_size": temporal_size,
            "temporal_overlap": temporal_overlap
        }
        return io.NodeOutput(t_info)

class Sage_UnetClipVaeToModelInfo(io.ComfyNode):
    """Convert UNET, CLIP, and VAE model info to a single model info output."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_UnetClipVaeToModelInfo",
            display_name="UNET CLIP VAE To Model Info",
            description="Returns a list with the unets, clips, and vae in it to be loaded.",
            category="Sage Utils/model",
            inputs=[
                UnetInfo.Input("unet_info", display_name="unet_info"),
                ClipInfo.Input("clip_info", display_name="clip_info"),
                VaeInfo.Input("vae_info", display_name="vae_info")
            ],
            outputs=[
                ModelInfo.Output("model_info", display_name="model_info")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        unet_info = kwargs.get("unet_info", None)
        clip_info = kwargs.get("clip_info", None)
        vae_info = kwargs.get("vae_info", None)
        return io.NodeOutput((unet_info, clip_info, vae_info))

class Sage_LoraStack(io.ComfyNode):
    """Choose a lora with weights, and add it to a lora_stack."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_LoraStack",
            display_name="Lora Stack",
            description="Choose a lora with weights, and add it to a lora_stack. Compatible with other node packs that have lora_stacks.",
            category="Sage Utils/lora",
            inputs=[
                io.Boolean.Input("enabled", display_name="enabled", default=False),
                io.Combo.Input("lora_name", display_name="lora_name", options=get_model_list("loras")),
                io.Float.Input("model_weight", display_name="model_weight", default=1.0, min=-100.0, max=100.0, step=0.01),
                io.Float.Input("clip_weight", display_name="clip_weight", default=1.0, min=-100.0, max=100.0, step=0.01),
                LoraStack.Input("lora_stack", display_name="lora_stack", optional=True)
            ],
            outputs=[
                LoraStack.Output("out_lora_stack", display_name="lora_stack")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        lora_stack = kwargs.get("lora_stack", None)
        enabled = kwargs.get("enabled", False)
        
        if enabled:
            lora_name = kwargs.get("lora_name", "")
            enabled = kwargs.get("enabled", True)
            model_weight = kwargs.get("model_weight", 1.0)
            clip_weight = kwargs.get("clip_weight", 1.0)

            stack = add_lora_to_stack(lora_name, model_weight, clip_weight, lora_stack)
            return io.NodeOutput(stack)
        
        return io.NodeOutput(lora_stack)

class Sage_QuickLoraStack(io.ComfyNode):
    """ Simplified lora stack node without clip_weight."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_QuickLoraStack",
            display_name="Quick Lora Stack",
            description="A simplified version of the lora stack node, without the clip_weight.",
            category="Sage Utils/lora",
            inputs=[
                io.Boolean.Input("enabled", display_name="enabled", default=True),
                io.Combo.Input("lora_name", display_name="lora_name", options=get_model_list("loras")),
                io.Float.Input("model_weight", display_name="model_weight", default=1.0, min=-100.0, max=100.0, step=0.01),
                LoraStack.Input("lora_stack", display_name="lora_stack", optional=True)
            ],
            outputs=[
                LoraStack.Output("out_lora_stack", display_name="lora_stack")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        lora_stack = kwargs.get("lora_stack", None)
        enabled = kwargs.get("enabled", True)
        
        if enabled:
            lora_name = kwargs.get("lora_name", "")
            model_weight = kwargs.get("model_weight", 1.0)
            # Quick stack uses same weight for both model and clip
            stack = add_lora_to_stack(lora_name, model_weight, model_weight, lora_stack)
            return io.NodeOutput(stack)
        
        return io.NodeOutput(lora_stack)

class Sage_TripleLoraStack(io.ComfyNode):
    """Choose three loras with weights, and add them to a lora_stack."""
    NUM_OF_ENTRIES = 3
    def __init__(self):
        self.NUM_OF_ENTRIES = Sage_TripleLoraStack.NUM_OF_ENTRIES
        super().__init__()

    @classmethod
    def define_schema(cls):
        lora_list = get_model_list("loras")
        required_list = {}

        schema = io.Schema(
            node_id="Sage_TripleLoraStack",
            display_name="Lora Stack (x3)",
            description="Choose three loras with weights, and add them to a lora_stack.",
            category="Sage Utils/lora",
            inputs=[],
            outputs=[
                LoraStack.Output("out_lora_stack", display_name="lora_stack")
            ]
        )
        for i in range(1, cls.NUM_OF_ENTRIES + 1):
            schema.inputs.append(io.Boolean.Input(f"enabled_{i}", display_name=f"enabled_{i}", default=True))
            schema.inputs.append(io.Combo.Input(f"lora_{i}_name", display_name=f"lora_{i}_name", options=lora_list))
            schema.inputs.append(io.Float.Input(f"model_{i}_weight", display_name=f"model_{i}_weight", default=1.0, min=-100.0, max=100.0, step=0.01))
            schema.inputs.append(io.Float.Input(f"clip_{i}_weight", display_name=f"clip_{i}_weight", default=1.0, min=-100.0, max=100.0, step=0.01))
        schema.inputs.append(LoraStack.Input("lora_stack", display_name="lora_stack", optional=True))
        
        return schema
    
    @classmethod
    def execute(cls, **kwargs):
        lora_stack = kwargs.get("lora_stack", None)
        #lora_stack = [(path,weight,weight),(path,weight,weight),...]
        node = []
        
        for i in range(1, cls.NUM_OF_ENTRIES + 1):
            enabled = kwargs.get(f"enabled_{i}", True)
            if enabled:
                lora_name = kwargs.get(f"lora_{i}_name", "")
                model_weight = kwargs.get(f"model_{i}_weight", 1.0)
                clip_weight = kwargs.get(f"clip_{i}_weight", 1.0)
                
                lora_stack = add_lora_to_stack(lora_name, model_weight, clip_weight, lora_stack)
        return io.NodeOutput(lora_stack)

# Based on Sage_TripleLoraStack, but with six entries.
class Sage_SixLoraStack(Sage_TripleLoraStack):
    """Choose six loras with weights, and add them to a lora_stack."""
    NUM_OF_ENTRIES = 6
    def __init__(self):
        self.NUM_OF_ENTRIES = Sage_SixLoraStack.NUM_OF_ENTRIES
        super().__init__()
    
    @classmethod
    def define_schema(cls):
        lora_list = get_model_list("loras")
        required_list = {}

        schema = io.Schema(
            node_id="Sage_SixLoraStack",
            display_name="Lora Stack (x6)",
            description="Choose six loras with weights, and add them to a lora_stack.",
            category="Sage Utils/lora",
            inputs=[],
            outputs=[
                LoraStack.Output("out_lora_stack", display_name="lora_stack")
            ]
        )
        for i in range(1, cls.NUM_OF_ENTRIES + 1):
            schema.inputs.append(io.Boolean.Input(f"enabled_{i}", display_name=f"enabled_{i}", default=True))
            schema.inputs.append(io.Combo.Input(f"lora_{i}_name", display_name=f"lora_{i}_name", options=lora_list))
            schema.inputs.append(io.Float.Input(f"model_{i}_weight", display_name=f"model_{i}_weight", default=1.0, min=-100.0, max=100.0, step=0.01))
            schema.inputs.append(io.Float.Input(f"clip_{i}_weight", display_name=f"clip_{i}_weight", default=1.0, min=-100.0, max=100.0, step=0.01))
        schema.inputs.append(LoraStack.Input("lora_stack", display_name="lora_stack", optional=True))
        
        return schema

class Sage_NineLoraStack(Sage_TripleLoraStack):
    """Choose nine loras with weights, and add them to a lora_stack."""
    NUM_OF_ENTRIES = 9
    def __init__(self):
        self.NUM_OF_ENTRIES = Sage_NineLoraStack.NUM_OF_ENTRIES
        super().__init__()
    
    @classmethod
    def define_schema(cls):
        lora_list = get_model_list("loras")
        required_list = {}

        schema = io.Schema(
            node_id="Sage_NineLoraStack",
            display_name="Lora Stack (x9)",
            description="Choose nine loras with weights, and add them to a lora_stack.",
            category="Sage Utils/lora",
            inputs=[],
            outputs=[
                LoraStack.Output("out_lora_stack", display_name="lora_stack")
            ]
        )
        for i in range(1, cls.NUM_OF_ENTRIES + 1):
            schema.inputs.append(io.Boolean.Input(f"enabled_{i}", display_name=f"enabled_{i}", default=True))
            schema.inputs.append(io.Combo.Input(f"lora_{i}_name", display_name=f"lora_{i}_name", options=lora_list))
            schema.inputs.append(io.Float.Input(f"model_{i}_weight", display_name=f"model_{i}_weight", default=1.0, min=-100.0, max=100.0, step=0.01))
            schema.inputs.append(io.Float.Input(f"clip_{i}_weight", display_name=f"clip_{i}_weight", default=1.0, min=-100.0, max=100.0, step=0.01))
        schema.inputs.append(LoraStack.Input("lora_stack", display_name="lora_stack", optional=True))
        
        return schema

# Same as Sage_TripleLoraStack, but as a Quick lora (model weight only) version.
class Sage_TripleQuickLoraStack(io.ComfyNode):
    """Choose three loras with model weights only."""
    NUM_OF_ENTRIES = 3
    def __init__(self):
        self.NUM_OF_ENTRIES = Sage_TripleQuickLoraStack.NUM_OF_ENTRIES
        super().__init__()

    @classmethod
    def define_schema(cls):
        lora_list = get_model_list("loras")
        required_list = {}

        schema = io.Schema(
            node_id="Sage_TripleQuickLoraStack",
            display_name="Quick Lora Stack (x3)",
            description="Choose three loras with model weight only, and add them to a lora_stack.",
            category="Sage Utils/lora",
            inputs=[],
            outputs=[
                LoraStack.Output("out_lora_stack", display_name="lora_stack")
            ]
        )
        for i in range(1, cls.NUM_OF_ENTRIES + 1):
            schema.inputs.append(io.Boolean.Input(f"enabled_{i}", display_name=f"enabled_{i}", default=True))
            schema.inputs.append(io.Combo.Input(f"lora_{i}_name", display_name=f"lora_{i}_name", options=lora_list))
            schema.inputs.append(io.Float.Input(f"model_{i}_weight", display_name=f"model_{i}_weight", default=1.0, min=-100.0, max=100.0, step=0.01))
        schema.inputs.append(LoraStack.Input("lora_stack", display_name="lora_stack", optional=True))
        
        return schema
    
    @classmethod
    def execute(cls, **kwargs):
        lora_stack = kwargs.get("lora_stack", None)
        #lora_stack = [(path,weight,weight),(path,weight,weight),...]
        node = []
        
        for i in range(1, cls.NUM_OF_ENTRIES + 1):
            enabled = kwargs.get(f"enabled_{i}", True)
            if enabled:
                lora_name = kwargs.get(f"lora_{i}_name", "")
                model_weight = kwargs.get(f"model_{i}_weight", 1.0)
                # Quick stack uses same weight for both model and clip
                lora_stack = add_lora_to_stack(lora_name, model_weight, model_weight, lora_stack)
        return io.NodeOutput(lora_stack)

class Sage_QuickSixLoraStack(Sage_TripleQuickLoraStack):
    """Choose six loras with model weights only."""
    NUM_OF_ENTRIES = 6
    def __init__(self):
        self.NUM_OF_ENTRIES = Sage_QuickSixLoraStack.NUM_OF_ENTRIES
        super().__init__()
    
    @classmethod
    def define_schema(cls):
        lora_list = get_model_list("loras")
        required_list = {}

        schema = io.Schema(
            node_id="Sage_QuickSixLoraStack",
            display_name="Quick Lora Stack (x6)",
            description="Choose six loras with model weight only, and add them to a lora_stack.",
            category="Sage Utils/lora",
            inputs=[],
            outputs=[
                LoraStack.Output("out_lora_stack", display_name="lora_stack")
            ]
        )
        for i in range(1, cls.NUM_OF_ENTRIES + 1):
            schema.inputs.append(io.Boolean.Input(f"enabled_{i}", display_name=f"enabled_{i}", default=True))
            schema.inputs.append(io.Combo.Input(f"lora_{i}_name", display_name=f"lora_{i}_name", options=lora_list))
            schema.inputs.append(io.Float.Input(f"model_{i}_weight", display_name=f"model_{i}_weight", default=1.0, min=-100.0, max=100.0, step=0.01))
        schema.inputs.append(LoraStack.Input("lora_stack", display_name="lora_stack", optional=True))
        
        return schema

class Sage_QuickNineLoraStack(Sage_TripleQuickLoraStack):
    """Choose nine loras with model weights only."""
    NUM_OF_ENTRIES = 9
    def __init__(self):
        self.NUM_OF_ENTRIES = Sage_QuickNineLoraStack.NUM_OF_ENTRIES
        super().__init__()
    
    @classmethod
    def define_schema(cls):
        lora_list = get_model_list("loras")
        required_list = {}

        schema = io.Schema(
            node_id="Sage_QuickNineLoraStack",
            display_name="Quick Lora Stack (x9)",
            description="Choose nine loras with model weight only, and add them to a lora_stack.",
            category="Sage Utils/lora",
            inputs=[],
            outputs=[
                LoraStack.Output("out_lora_stack", display_name="lora_stack")
            ]
        )
        for i in range(1, cls.NUM_OF_ENTRIES + 1):
            schema.inputs.append(io.Boolean.Input(f"enabled_{i}", display_name=f"enabled_{i}", default=True))
            schema.inputs.append(io.Combo.Input(f"lora_{i}_name", display_name=f"lora_{i}_name", options=lora_list))
            schema.inputs.append(io.Float.Input(f"model_{i}_weight", display_name=f"model_{i}_weight", default=1.0, min=-100.0, max=100.0, step=0.01))
        schema.inputs.append(LoraStack.Input("lora_stack", display_name="lora_stack", optional=True))
        
        return schema

# ============================================================================

SELECTOR_NODES = [
    Sage_CheckpointSelector,
    Sage_UNETSelector,
    Sage_VAESelector,
    Sage_CLIPSelector,
    Sage_DualCLIPSelector,
    Sage_TripleCLIPSelector,
    Sage_QuadCLIPSelector,
    Sage_MultiSelectorSingleClip,
    Sage_MultiSelectorDoubleClip,
    Sage_MultiSelectorTripleClip,
    Sage_MultiSelectorQuadClip,
    Sage_ModelShifts,
    Sage_ModelShiftOnly,
    Sage_FreeU2,
    Sage_UnetClipVaeToModelInfo,
    Sage_LoraStack,
    Sage_QuickLoraStack,
    Sage_TripleLoraStack,
    Sage_SixLoraStack,
    Sage_TripleQuickLoraStack,
    Sage_QuickSixLoraStack,
    Sage_QuickNineLoraStack,
    Sage_TilingInfo
]

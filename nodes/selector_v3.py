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
#
# Placeholder nodes (inputs/outputs defined, logic needs implementation):
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
                io.Combo.Input("ckpt_name", options=get_model_list("checkpoints")),
            ],
            outputs=[
                ModelInfo.Output()
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
                io.Combo.Input("unet_name", options=get_model_list("unets")),
                io.Combo.Input("weight_dtype", options=mi.weight_dtype_options, default="default"),
            ],
            outputs=[
                UnetInfo.Output()
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
                io.Combo.Input("vae_name", options=get_model_list("vaes")),
            ],
            outputs=[
                VaeInfo.Output()
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        vae_name = kwargs.get("vae_name", "")
        info = mi.get_model_info_vae(vae_name)
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
                io.Combo.Input("clip_name", options=get_model_list("clips")),
                io.Combo.Input("clip_type", options=mi.single_clip_loader_options, default="chroma"),
            ],
            outputs=[
                ClipInfo.Output()
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
        return io.Schema(
            node_id="Sage_DualCLIPSelector",
            display_name="Dual CLIP Selector",
            description="Selects two CLIP models from a list.",
            category="Sage Utils/selector",
            inputs=[
                io.Combo.Input("clip_name_1", options=get_model_list("clips")),
                io.Combo.Input("clip_name_2", options=get_model_list("clips")),
                io.Combo.Input("clip_type", options=mi.dual_clip_loader_options, default="sdxl"),
            ],
            outputs=[
                ClipInfo.Output()
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
        return io.Schema(
            node_id="Sage_TripleCLIPSelector",
            display_name="Triple CLIP Selector",
            description="Selects three CLIP models from a list.",
            category="Sage Utils/selector",
            inputs=[
                io.Combo.Input("clip_name_1", options=get_model_list("clips")),
                io.Combo.Input("clip_name_2", options=get_model_list("clips")),
                io.Combo.Input("clip_name_3", options=get_model_list("clips")),
            ],
            outputs=[
                ClipInfo.Output()
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
        return io.Schema(
            node_id="Sage_QuadCLIPSelector",
            display_name="Quad CLIP Selector",
            description="Selects four CLIP models from a list.",
            category="Sage Utils/selector",
            inputs=[
                io.Combo.Input("clip_name_1", options=get_model_list("clips")),
                io.Combo.Input("clip_name_2", options=get_model_list("clips")),
                io.Combo.Input("clip_name_3", options=get_model_list("clips")),
                io.Combo.Input("clip_name_4", options=get_model_list("clips")),
            ],
            outputs=[
                ClipInfo.Output()
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
                io.Combo.Input("unet_name", options=get_model_list("unets")),
                io.Combo.Input("weight_dtype", options=mi.weight_dtype_options, default="default"),
                io.Combo.Input("clip_name", options=get_model_list("clips")),
                io.Combo.Input("clip_type", options=mi.single_clip_loader_options, default="chroma"),
                io.Combo.Input("vae_name", options=get_model_list("vaes")),
            ],
            outputs=[
                ModelInfo.Output()
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
        return io.Schema(
            node_id="Sage_MultiSelectorDoubleClip",
            display_name="Multi Selector Double CLIP",
            description="Selects checkpoint, UNET, VAE, and two CLIP models from lists.",
            category="Sage Utils/selector",
            inputs=[
                io.Combo.Input("unet_name", options=get_model_list("unets")),
                io.Combo.Input("weight_dtype", options=mi.weight_dtype_options, default="default"),
                io.Combo.Input("clip_name_1", options=get_model_list("clips")),
                io.Combo.Input("clip_name_2", options=get_model_list("clips")),
                io.Combo.Input("clip_type", options=mi.dual_clip_loader_options, default="sdxl"),
                io.Combo.Input("vae_name", options=get_model_list("vaes")),
            ],
            outputs=[
                ModelInfo.Output()
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
        return io.Schema(
            node_id="Sage_MultiSelectorTripleClip",
            display_name="Multi Selector Triple CLIP",
            description="Selects checkpoint, UNET, VAE, and three CLIP models from lists.",
            category="Sage Utils/selector",
            inputs=[
                io.Combo.Input("unet_name", options=get_model_list("unets")),
                io.Combo.Input("weight_dtype", options=mi.weight_dtype_options, default="default"),
                io.Combo.Input("clip_name_1", options=get_model_list("clips")),
                io.Combo.Input("clip_name_2", options=get_model_list("clips")),
                io.Combo.Input("clip_name_3", options=get_model_list("clips")),
                io.Combo.Input("vae_name", options=get_model_list("vaes")),
            ],
            outputs=[
                ModelInfo.Output()
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
        return io.Schema(
            node_id="Sage_MultiSelectorQuadClip",
            display_name="Multi Selector Quad CLIP",
            description="Selects checkpoint, UNET, VAE, and four CLIP models from lists.",
            category="Sage Utils/selector",
            inputs=[
                io.Combo.Input("unet_name", options=get_model_list("unets")),
                io.Combo.Input("weight_dtype", options=mi.weight_dtype_options, default="default"),
                io.Combo.Input("clip_name_1", options=get_model_list("clips")),
                io.Combo.Input("clip_name_2", options=get_model_list("clips")),
                io.Combo.Input("clip_name_3", options=get_model_list("clips")),
                io.Combo.Input("clip_name_4", options=get_model_list("clips")),
                io.Combo.Input("vae_name", options=get_model_list("vaes")),
            ],
            outputs=[
                ModelInfo.Output()
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

# ============================================================================
# PLACEHOLDER NODES - NOT YET FULLY IMPLEMENTED
# ============================================================================
# These are placeholder implementations. The inputs/outputs match the original
# v1 nodes, but the execute methods need proper implementation.

class Sage_ModelShifts(io.ComfyNode):
    """PLACEHOLDER: Get the model shifts and free_u2 settings to apply to the model."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_ModelShifts",
            display_name="Model Shifts",
            description="PLACEHOLDER: Get the model shifts and free_u2 settings to apply to the model. This is used by the model loader node.",
            category="Sage Utils/model",
            inputs=[
                io.Combo.Input("shift_type", options=["None", "x1", "x1000"], default="None"),
                io.Float.Input("shift", default=3.0, min=0.0, max=100.0, step=0.01),
                io.Boolean.Input("freeu_v2", default=False),
                io.Float.Input("b1", default=1.3, min=0.0, max=10.0, step=0.01),
                io.Float.Input("b2", default=1.4, min=0.0, max=10.0, step=0.01),
                io.Float.Input("s1", default=0.9, min=0.0, max=10.0, step=0.01),
                io.Float.Input("s2", default=0.2, min=0.0, max=10.0, step=0.01)
            ],
            outputs=[
                ModelShiftInfo.Output("model_shifts")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from selector.py
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
    """PLACEHOLDER: Get the model shifts to apply to the model."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_ModelShiftOnly",
            display_name="Model Shift Only",
            description="PLACEHOLDER: Get the model shifts to apply to the model. This is used by the model loader node.",
            category="Sage Utils/model",
            inputs=[
                io.Combo.Input("shift_type", options=["None", "x1", "x1000"], default="None"),
                io.Float.Input("shift", default=3.0, min=0.0, max=100.0, step=0.01)
            ],
            outputs=[
                ModelShiftInfo.Output("model_shifts")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from selector.py
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
    """PLACEHOLDER: Get the free_u2 settings to apply to the model."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_FreeU2",
            display_name="FreeU v2",
            description="PLACEHOLDER: Get the free_u2 settings to apply to the model.",
            category="Sage Utils/model",
            inputs=[
                io.Boolean.Input("freeu_v2", default=False),
                io.Float.Input("b1", default=1.3, min=0.0, max=10.0, step=0.01),
                io.Float.Input("b2", default=1.4, min=0.0, max=10.0, step=0.01),
                io.Float.Input("s1", default=0.9, min=0.0, max=10.0, step=0.01),
                io.Float.Input("s2", default=0.2, min=0.0, max=10.0, step=0.01)
            ],
            outputs=[
                ModelShiftInfo.Output("model_shifts")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from selector.py
        return io.NodeOutput({
            "shift_type": "None",
            "shift": 0,
            "freeu_v2": kwargs.get("freeu_v2", False),
            "b1": kwargs.get("b1", 1.3),
            "b2": kwargs.get("b2", 1.4),
            "s1": kwargs.get("s1", 0.9),
            "s2": kwargs.get("s2", 0.2)
        })

class Sage_UnetClipVaeToModelInfo(io.ComfyNode):
    """PLACEHOLDER: Convert UNET, CLIP, and VAE model info to a single model info output."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_UnetClipVaeToModelInfo",
            display_name="UNET CLIP VAE To Model Info",
            description="PLACEHOLDER: Returns a list with the unets, clips, and vae in it to be loaded.",
            category="Sage Utils/model",
            inputs=[
                UnetInfo.Input("unet_info"),
                ClipInfo.Input("clip_info"),
                VaeInfo.Input("vae_info")
            ],
            outputs=[
                ModelInfo.Output("model_info")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from selector.py
        unet_info = kwargs.get("unet_info", None)
        clip_info = kwargs.get("clip_info", None)
        vae_info = kwargs.get("vae_info", None)
        return io.NodeOutput((unet_info, clip_info, vae_info))

class Sage_LoraStack(io.ComfyNode):
    """PLACEHOLDER: Choose a lora with weights, and add it to a lora_stack."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_LoraStack",
            display_name="Lora Stack",
            description="PLACEHOLDER: Choose a lora with weights, and add it to a lora_stack. Compatible with other node packs that have lora_stacks.",
            category="Sage Utils/lora",
            inputs=[
                io.Boolean.Input("enabled", default=False),
                io.Combo.Input("lora_name", options=get_model_list("loras")),
                io.Float.Input("model_weight", default=1.0, min=-100.0, max=100.0, step=0.01),
                io.Float.Input("clip_weight", default=1.0, min=-100.0, max=100.0, step=0.01),
                LoraStack.Input("lora_stack", optional=True)
            ],
            outputs=[
                LoraStack.Output("out_lora_stack")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from selector.py
        lora_stack = kwargs.get("lora_stack", None)
        enabled = kwargs.get("enabled", False)
        
        if enabled:
            lora_name = kwargs.get("lora_name", "")
            model_weight = kwargs.get("model_weight", 1.0)
            clip_weight = kwargs.get("clip_weight", 1.0)
            stack = add_lora_to_stack(lora_name, model_weight, clip_weight, lora_stack)
            return io.NodeOutput(stack)
        
        return io.NodeOutput(lora_stack)

class Sage_QuickLoraStack(io.ComfyNode):
    """PLACEHOLDER: Simplified lora stack node without clip_weight."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_QuickLoraStack",
            display_name="Quick Lora Stack",
            description="PLACEHOLDER: A simplified version of the lora stack node, without the clip_weight.",
            category="Sage Utils/lora",
            inputs=[
                io.Boolean.Input("enabled", default=True),
                io.Combo.Input("lora_name", options=get_model_list("loras")),
                io.Float.Input("model_weight", default=1.0, min=-100.0, max=100.0, step=0.01),
                LoraStack.Input("lora_stack", optional=True)
            ],
            outputs=[
                LoraStack.Output("out_lora_stack")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from selector.py
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
    """PLACEHOLDER: Choose three loras with weights, and add them to a lora_stack."""
    NUM_OF_ENTRIES = 3
    
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_TripleLoraStack",
            display_name="Lora Stack (x3)",
            description="PLACEHOLDER: Choose three loras with weights, and add them to a lora_stack.",
            category="Sage Utils/lora",
            inputs=[
                io.Boolean.Input("enabled_1", default=True),
                io.Combo.Input("lora_1_name", options=get_model_list("loras")),
                io.Float.Input("model_1_weight", default=1.0, min=-100.0, max=100.0, step=0.01),
                io.Float.Input("clip_1_weight", default=1.0, min=-100.0, max=100.0, step=0.01),
                io.Boolean.Input("enabled_2", default=True),
                io.Combo.Input("lora_2_name", options=get_model_list("loras")),
                io.Float.Input("model_2_weight", default=1.0, min=-100.0, max=100.0, step=0.01),
                io.Float.Input("clip_2_weight", default=1.0, min=-100.0, max=100.0, step=0.01),
                io.Boolean.Input("enabled_3", default=True),
                io.Combo.Input("lora_3_name", options=get_model_list("loras")),
                io.Float.Input("model_3_weight", default=1.0, min=-100.0, max=100.0, step=0.01),
                io.Float.Input("clip_3_weight", default=1.0, min=-100.0, max=100.0, step=0.01),
                LoraStack.Input("lora_stack", optional=True)
            ],
            outputs=[
                LoraStack.Output("out_lora_stack")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from selector.py
        lora_stack = kwargs.get("lora_stack", None)
        # Simplified logic - needs full graph implementation
        return io.NodeOutput(lora_stack)

class Sage_SixLoraStack(io.ComfyNode):
    """PLACEHOLDER: Choose six loras with weights, and add them to a lora_stack."""
    NUM_OF_ENTRIES = 6
    
    @classmethod
    def define_schema(cls):
        inputs = []
        for i in range(1, 7):
            inputs.extend([
                io.Boolean.Input(f"enabled_{i}", default=True),
                io.Combo.Input(f"lora_{i}_name", options=get_model_list("loras")),
                io.Float.Input(f"model_{i}_weight", default=1.0, min=-100.0, max=100.0, step=0.01),
                io.Float.Input(f"clip_{i}_weight", default=1.0, min=-100.0, max=100.0, step=0.01)
            ])
        inputs.append(LoraStack.Input("lora_stack", optional=True))
        
        return io.Schema(
            node_id="Sage_SixLoraStack",
            display_name="Lora Stack (x6)",
            description="PLACEHOLDER: Choose six loras with weights, and add them to a lora_stack.",
            category="Sage Utils/lora",
            inputs=inputs,
            outputs=[
                LoraStack.Output("out_lora_stack")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from selector.py
        lora_stack = kwargs.get("lora_stack", None)
        return io.NodeOutput(lora_stack)

class Sage_TripleQuickLoraStack(io.ComfyNode):
    """PLACEHOLDER: Choose three loras with model weights only."""
    NUM_OF_ENTRIES = 3
    
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_TripleQuickLoraStack",
            display_name="Quick Lora Stack (x3)",
            description="PLACEHOLDER: Choose three loras with model weight only, and add them to a lora_stack.",
            category="Sage Utils/lora",
            inputs=[
                io.Boolean.Input("enabled_1", default=True),
                io.Combo.Input("lora_1_name", options=get_model_list("loras")),
                io.Float.Input("model_1_weight", default=1.0, min=-100.0, max=100.0, step=0.01),
                io.Boolean.Input("enabled_2", default=True),
                io.Combo.Input("lora_2_name", options=get_model_list("loras")),
                io.Float.Input("model_2_weight", default=1.0, min=-100.0, max=100.0, step=0.01),
                io.Boolean.Input("enabled_3", default=True),
                io.Combo.Input("lora_3_name", options=get_model_list("loras")),
                io.Float.Input("model_3_weight", default=1.0, min=-100.0, max=100.0, step=0.01),
                LoraStack.Input("lora_stack", optional=True)
            ],
            outputs=[
                LoraStack.Output("out_lora_stack")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from selector.py
        lora_stack = kwargs.get("lora_stack", None)
        return io.NodeOutput(lora_stack)

class Sage_QuickSixLoraStack(io.ComfyNode):
    """PLACEHOLDER: Choose six loras with model weights only."""
    NUM_OF_ENTRIES = 6
    
    @classmethod
    def define_schema(cls):
        inputs = []
        for i in range(1, 7):
            inputs.extend([
                io.Boolean.Input(f"enabled_{i}", default=True),
                io.Combo.Input(f"lora_{i}_name", options=get_model_list("loras")),
                io.Float.Input(f"model_{i}_weight", default=1.0, min=-100.0, max=100.0, step=0.01)
            ])
        inputs.append(LoraStack.Input("lora_stack", optional=True))
        
        return io.Schema(
            node_id="Sage_QuickSixLoraStack",
            display_name="Quick Lora Stack (x6)",
            description="PLACEHOLDER: Choose six loras with model weight only, and add them to a lora_stack.",
            category="Sage Utils/lora",
            inputs=inputs,
            outputs=[
                LoraStack.Output("out_lora_stack")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from selector.py
        lora_stack = kwargs.get("lora_stack", None)
        return io.NodeOutput(lora_stack)

class Sage_QuickNineLoraStack(io.ComfyNode):
    """PLACEHOLDER: Choose nine loras with model weights only."""
    NUM_OF_ENTRIES = 9
    
    @classmethod
    def define_schema(cls):
        inputs = []
        for i in range(1, 10):
            inputs.extend([
                io.Boolean.Input(f"enabled_{i}", default=True),
                io.Combo.Input(f"lora_{i}_name", options=get_model_list("loras")),
                io.Float.Input(f"model_{i}_weight", default=1.0, min=-100.0, max=100.0, step=0.01)
            ])
        inputs.append(LoraStack.Input("lora_stack", optional=True))
        
        return io.Schema(
            node_id="Sage_QuickNineLoraStack",
            display_name="Quick Lora Stack (x9)",
            description="PLACEHOLDER: Choose nine loras with model weight only, and add them to a lora_stack.",
            category="Sage Utils/lora",
            inputs=inputs,
            outputs=[
                LoraStack.Output("out_lora_stack")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from selector.py
        lora_stack = kwargs.get("lora_stack", None)
        return io.NodeOutput(lora_stack)

class Sage_TilingInfo(io.ComfyNode):
    """PLACEHOLDER: Adds tiling information to the KSampler."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_TilingInfo",
            display_name="Tiling Info",
            description="PLACEHOLDER: Adds tiling information to the KSampler.",
            category="Sage Utils/sampler",
            inputs=[
                io.Int.Input("tile_size", default=512, min=64, max=4096, step=32),
                io.Int.Input("overlap", default=64, min=0, max=4096, step=32),
                io.Int.Input("temporal_size", default=64, min=8, max=4096, step=4, tooltip="Only used for video VAEs: Amount of frames to decode at a time."),
                io.Int.Input("temporal_overlap", default=8, min=4, max=4096, step=4, tooltip="Only used for video VAEs: Amount of frames to overlap.")
            ],
            outputs=[
                TilingInfo.Output("tiling_info")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from selector.py
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
    # Placeholder nodes (not fully implemented)
    Sage_TripleLoraStack,
    Sage_SixLoraStack,
    Sage_TripleQuickLoraStack,
    Sage_QuickSixLoraStack,
    Sage_QuickNineLoraStack,
    Sage_TilingInfo
]

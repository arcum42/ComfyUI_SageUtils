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
# Custom type for model_info


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

class Sage_ModelShifts(io.ComfyNode):
    pass

class Sage_ModelShiftOnly(io.ComfyNode):
    pass
class Sage_FreeU2(io.ComfyNode):
    pass
class Sage_UnetClipVaeToModelInfo(io.ComfyNode):
    pass
class Sage_LoraStack(io.ComfyNode):
    pass
class Sage_QuickLoraStack(io.ComfyNode):
    pass


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
    Sage_QuickLoraStack
]

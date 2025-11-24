# Conditioning nodes v3
# This will include any nodes involving clip or conditioning.
# See ref_docs/v3_migration.md for info on migrating to v3 nodes.

from __future__ import annotations
from typing_extensions import override

from comfy_api.latest import io, ComfyExtension
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO
from comfy_api.latest._io import NodeOutput, Schema
from comfy_execution.graph_utils import GraphBuilder
from comfy.utils import ProgressBar

# Import specific utilities instead of wildcard import
from ..utils import condition_text, clean_text, clean_if_needed
from ..utils.constants import LUMINA2_SYSTEM_PROMPT, LUMINA2_SYSTEM_PROMPT_TIP, PROMPT_START
import torch

# In a quick onceover, looks good. Needs testing. Check off here:
# Sage_ZeroConditioning - 
# Sage_SingleCLIPTextEncode -
# Sage_DualCLIPTextEncode - 
# Sage_DualCLIPTextEncodeLumina2 - 
# Sage_DualCLIPTextEncodeQwen - 

class Sage_ZeroConditioning(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_ZeroConditioning",
            display_name="Zero Conditioning",
            description="Returns zeroed out conditioning.",
            category="Sage Utils/clip",
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
        if clip is None:
            raise ValueError("Clip input is required.")
        tokens = clip.tokenize("")
        output = clip.encode_from_tokens(tokens, return_pooled=True, return_dict=True)
        output["pooled_output"] = torch.zeros_like(output.get("pooled_output", torch.tensor([])))
        conditioning = torch.zeros_like(output.pop("cond"))
        return io.NodeOutput([conditioning, output])

class Sage_SingleCLIPTextEncode(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_SingleCLIPTextEncode",
            display_name="Single CLIP Text Encode",
            description="Turns text into conditioning, and passes through the prompt. Zeros any input not hooked up.",
            category="Sage Utils/clip",
            inputs=[
                io.Clip.Input(id="clip", display_name="clip", tooltip="The CLIP model used for encoding the text."),
                io.String.Input(id="text", display_name="text", force_input=True, multiline=True, dynamic_prompts=True, tooltip="The positive prompt's text.")
            ],
            outputs=[
                io.Conditioning.Output(id="conditioning", display_name="conditioning", tooltip="A conditioning containing the embedded text used to guide the diffusion model."),
                io.String.Output(id="text_output", display_name="text", tooltip="The positive prompt's text.")
            ]
        )

    @classmethod
    def execute(cls, **kwargs) -> NodeOutput:
        clip = kwargs.get("clip")
        text = kwargs.get("text")
        if clip is None:
            raise ValueError("Clip input is required.")
        if isinstance(clip, tuple):
            clip = clip[0]
        conditioning = condition_text(clip, text)
        return io.NodeOutput(conditioning, text or "")

class Sage_DualCLIPTextEncode(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_DualCLIPTextEncode",
            display_name="Dual CLIP Text Encode",
            description="Turns a positive and negative prompt into conditionings, and passes through the prompts. Saves space over two CLIP Text Encoders, and zeros any input not hooked up.",
            category="Sage Utils/clip",
            inputs=[
                io.Clip.Input(id="clip", display_name="clip", tooltip="The CLIP model used for encoding the text."),
                io.Boolean.Input(id="clean", display_name="clean", default=True, tooltip="Clean up the text, getting rid of extra spaces, commas, etc."),
                io.String.Input(id="pos", display_name="pos", optional=True, force_input=True, multiline=True, dynamic_prompts=True, tooltip="The positive prompt's text."),
                io.String.Input(id="neg", display_name="neg", optional=True, force_input=True, multiline=True, dynamic_prompts=True, tooltip="The negative prompt's text.")
            ],
            outputs=[
                io.Conditioning.Output(id="positive", display_name="positive", tooltip="A conditioning containing the embedded text used to guide the diffusion model."),
                io.Conditioning.Output(id="negative", display_name="negative", tooltip="A conditioning containing the embedded text used to guide the diffusion model."),
                io.String.Output(id="pos_text", display_name="pos_text", tooltip="The positive prompt's text."),
                io.String.Output(id="neg_text", display_name="neg_text", tooltip="The negative prompt's text.")
            ]
        )

    @classmethod
    def execute(cls, **kwargs) -> NodeOutput:
        clip = kwargs.get("clip")
        clean = kwargs.get("clean", True)
        pos = kwargs.get("pos", "")
        neg = kwargs.get("neg", "")
        pbar = ProgressBar(2)

        if clip is None:
            raise ValueError("Clip input is required.")
        if isinstance(clip, tuple):
            clip = clip[0]
        pos = clean_if_needed(pos, clean)
        neg = clean_if_needed(neg, clean)
        if isinstance(clip, tuple):
            clip = clip[0]
    
        pbar.update(1)
        pos_cond = condition_text(clip, pos)

        pbar.update(1)
        neg_cond = condition_text(clip, neg)

        return io.NodeOutput(pos_cond, neg_cond, pos or "", neg or "")

class Sage_DualCLIPTextEncodeLumina2(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_DualCLIPTextEncodeLumina2",
            display_name="Dual CLIP Text Encode Lumina 2",
            description="Turns a positive and negative prompt into conditionings, and passes through the prompts. Saves space over two CLIP Text Encoders, and zeros any input not hooked up.",
            category="Sage Utils/clip",
            inputs=[
                io.Clip.Input(id="clip", display_name="clip", tooltip="The CLIP model used for encoding the text."),
                io.Combo.Input(id="system_prompt", display_name="system_prompt", options=list(LUMINA2_SYSTEM_PROMPT.keys()), default="superior", tooltip=LUMINA2_SYSTEM_PROMPT_TIP),
                io.Boolean.Input(id="clean", display_name="clean", default=True, tooltip="Clean up the text, getting rid of extra spaces, commas, etc."),
                io.String.Input(id="pos", display_name="pos", optional=True, force_input=True, multiline=True, dynamic_prompts=True, tooltip="The positive prompt's text."),
                io.String.Input(id="neg", display_name="neg", optional=True, force_input=True, multiline=True, dynamic_prompts=True, tooltip="The negative prompt's text."),
            ],
            outputs=[
                io.Conditioning.Output(id="positive", display_name="positive", tooltip="A conditioning containing the embedded text used to guide the diffusion model."),
                io.Conditioning.Output(id="negative", display_name="negative", tooltip="A conditioning containing the embedded text used to guide the diffusion model."),
                io.String.Output(id="pos_text", display_name="pos_text", tooltip="The positive prompt's text."),
                io.String.Output(id="neg_text", display_name="neg_text", tooltip="The negative prompt's text.")
            ]
        )

    @classmethod
    def execute(cls, **kwargs) -> NodeOutput:
        clip = kwargs.get("clip")
        system_prompt = kwargs.get("system_prompt", "superior")
        clean = kwargs.get("clean", True)
        pos = kwargs.get("pos", "")
        neg = kwargs.get("neg", "")

        pbar = ProgressBar(2)
        sys_prompt = LUMINA2_SYSTEM_PROMPT[system_prompt]
        pos = f'{sys_prompt}{PROMPT_START}{pos}' if pos is not None else None
        neg = f'{sys_prompt}{PROMPT_START}{neg}' if neg is not None else None
        pos = clean_if_needed(pos, clean)
        neg = clean_if_needed(neg, clean)
        if isinstance(clip, tuple):
            clip = clip[0]
    
        pbar.update(1)
        pos_cond = condition_text(clip, pos)

        pbar.update(1)
        neg_cond = condition_text(clip, neg)
        return io.NodeOutput(pos_cond, neg_cond, pos or "", neg or "")

class Sage_DualCLIPTextEncodeQwen(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_DualCLIPTextEncodeQwen",
            display_name="Dual CLIP Text Encode Qwen",
            description="Turns a positive and negative prompt into conditionings, and passes through the prompts. Saves space over two Qwen Image Edit Text Encoders, and zeros any input not hooked up.",
            category="Sage Utils/clip",
            enable_expand=True,
            inputs=[
                io.Clip.Input(id="clip", display_name="clip", tooltip="The CLIP model used for encoding the text."),
                io.Boolean.Input(id="clean", display_name="clean", default=True, tooltip="Clean up the text, getting rid of extra spaces, commas, etc."),
                io.Vae.Input(id="vae", display_name="vae", optional=True, tooltip="The VAE model used for encoding the reference image."),
                io.String.Input(id="pos", display_name="pos", optional=True, force_input=True, multiline=True, dynamic_prompts=True, tooltip="The positive prompt's text."),
                io.String.Input(id="neg", display_name="neg", optional=True, force_input=True, multiline=True, dynamic_prompts=True, tooltip="The negative prompt's text."),
                io.Image.Input(id="pos_image", display_name="pos_image", optional=True, tooltip="The positive prompt's image."),
                io.Image.Input(id="neg_image", display_name="neg_image", optional=True, tooltip="The negative prompt's image.")
            ],
            outputs=[
                io.Conditioning.Output(id="positive", display_name="positive", tooltip="A conditioning containing the embedded text used to guide the diffusion model."),
                io.Conditioning.Output(id="negative", display_name="negative", tooltip="A conditioning containing the embedded text used to guide the diffusion model."),
                io.String.Output(id="pos_text", display_name="pos_text", tooltip="The positive prompt's text."),
                io.String.Output(id="neg_text", display_name="neg_text", tooltip="The negative prompt's text.")
            ]
        )

    @classmethod
    def execute(cls, **kwargs) -> NodeOutput:
        clip = kwargs.get("clip")
        clean = kwargs.get("clean", True)
        vae = kwargs.get("vae", None)
        pos = kwargs.get("pos", "")
        pos_image = kwargs.get("pos_image", None)
        neg = kwargs.get("neg", "")
        neg_image = kwargs.get("neg_image", None)

        if isinstance(clip, tuple):
            clip = clip[0]

        pos = clean_if_needed(pos, clean)
        neg = clean_if_needed(neg, clean)

        graph = GraphBuilder()

        pos_node = graph.node("TextEncodeQwenImageEdit", clip=clip, prompt=pos, vae=vae, image=pos_image)
        pos_cond = pos_node.out(0)
        if pos is None and pos_image is None:
            pos = ""
            pos_zero_node = graph.node("ConditioningZeroOut", conditioning=pos_node.out(0))
            pos_cond = pos_zero_node.out(0)
        neg_node = graph.node("TextEncodeQwenImageEdit", clip=clip, prompt=neg, vae=vae, image=neg_image)
        neg_cond = neg_node.out(0)
        if neg is None and neg_image is None:
            neg = ""
            neg_zero_node = graph.node("ConditioningZeroOut", conditioning=neg_node.out(0))
            neg_cond = neg_zero_node.out(0)

        return io.NodeOutput(
            pos_cond, neg_cond, pos or "", neg or "",
            expand=graph.finalize()
        )

CONDITIONING_NODES = [
    Sage_ZeroConditioning,
    Sage_SingleCLIPTextEncode,
    Sage_DualCLIPTextEncode,
    Sage_DualCLIPTextEncodeLumina2,
    Sage_DualCLIPTextEncodeQwen
]

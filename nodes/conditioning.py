# Conditioning nodes
# This will include any nodes involving clip or conditioning.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO
import comfy

# Import specific utilities instead of wildcard import
from ..utils import condition_text, clean_text

import torch

def _get_conditioning(pbar, clip, text=None):
    pbar.update(1)
    return condition_text(clip, text)

def _clean_if_needed(text, clean):
    return clean_text(text) if clean and text is not None else text

class Sage_ConditioningZeroOut(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "clip": (IO.CLIP, {"defaultInput": True, "tooltip": "The CLIP model used for encoding."})
            }
        }

    RETURN_TYPES = (IO.CONDITIONING,)
    FUNCTION = "zero_out"
    CATEGORY = "Sage Utils/clip"
    DESCRIPTION = "Returns zeroed out conditioning."

    def zero_out(self, clip) -> tuple:
        tokens = clip.tokenize("")
        output = clip.encode_from_tokens(tokens, return_pooled=True, return_dict=True)
        output["pooled_output"] = torch.zeros_like(output.get("pooled_output", torch.tensor([])))
        conditioning = torch.zeros_like(output.pop("cond"))
        return ([conditioning, output],)

class Sage_DualCLIPTextEncode(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "clip": (IO.CLIP, {"defaultInput": True, "tooltip": "The CLIP model used for encoding the text."}),
                "clean": (IO.BOOLEAN, {"defaultInput": False, "tooltip": "Clean up the text, getting rid of extra spaces, commas, etc."})
            },
            "optional": {
                "pos": (IO.STRING, {"defaultInput": True, "multiline": True, "dynamicPrompts": True, "tooltip": "The positive prompt's text."}),
                "neg": (IO.STRING, {"defaultInput": True, "multiline": True, "dynamicPrompts": True, "tooltip": "The negative prompt's text."})
            }
        }
    RETURN_TYPES = (IO.CONDITIONING, IO.CONDITIONING, IO.STRING, IO.STRING)
    RETURN_NAMES = ("positive", "negative", "pos_text", "neg_text")
    OUTPUT_TOOLTIPS = ("A conditioning containing the embedded text used to guide the diffusion model. If neg is not hooked up, it'll be automatically zeroed.",)
    FUNCTION = "encode"
    CATEGORY = "Sage Utils/clip"
    DESCRIPTION = (
        "Turns a positive and negative prompt into conditionings, and passes through the prompts. "
        "Saves space over two CLIP Text Encoders, and zeros any input not hooked up."
    )

    def encode(self, clip, clean, pos=None, neg=None) -> tuple:
        if isinstance(clip, tuple):
            clip = clip[0]
        pbar = comfy.utils.ProgressBar(2)
        pos = _clean_if_needed(pos, clean)
        neg = _clean_if_needed(neg, clean)
        return (
            _get_conditioning(pbar, clip, pos),
            _get_conditioning(pbar, clip, neg),
            pos or "",
            neg or ""
        )

class Sage_DualCLIPTextEncodeLumina2(ComfyNodeABC):
    SYSTEM_PROMPT = {
        "superior": (
            "You are an assistant designed to generate superior images with the superior "
            "degree of image-text alignment based on textual prompts or user prompts."
        ),
        "alignment": (
            "You are an assistant designed to generate high-quality images with the "
            "highest degree of image-text alignment based on textual prompts."
        )
    }
    SYSTEM_PROMPT_TIP = (
        "Lumina2 provide two types of system prompts: "
        "Superior: You are an assistant designed to generate superior images with the superior "
        "degree of image-text alignment based on textual prompts or user prompts. "
        "Alignment: You are an assistant designed to generate high-quality images with the highest "
        "degree of image-text alignment based on textual prompts."
    )

    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "clip": (IO.CLIP, {"defaultInput": True, "tooltip": "The CLIP model used for encoding the text."}),
                "system_prompt": (IO.STRING, {"tooltip": cls.SYSTEM_PROMPT_TIP}),
                "clean": (IO.BOOLEAN, {"defaultInput": False, "tooltip": "Clean up the text, getting rid of extra spaces, commas, etc."}),
            },
            "optional": {
                "pos": (IO.STRING, {"defaultInput": True, "multiline": True, "dynamicPrompts": True, "tooltip": "The positive prompt's text."}),
                "neg": (IO.STRING, {"defaultInput": True, "multiline": True, "dynamicPrompts": True, "tooltip": "The negative prompt's text."}),
            }
        }
    RETURN_TYPES = (IO.CONDITIONING, IO.CONDITIONING, IO.STRING, IO.STRING)
    RETURN_NAMES = ("pos_cond", "neg_cond", "pos_text", "neg_text")
    OUTPUT_TOOLTIPS = ("A conditioning containing the embedded text used to guide the diffusion model. If neg is not hooked up, it'll be automatically zeroed.",)
    FUNCTION = "encode"
    CATEGORY = "Sage Utils/clip"
    DESCRIPTION = (
        "Turns a positive and negative prompt into conditionings, and passes through the prompts. "
        "Saves space over two CLIP Text Encoders, and zeros any input not hooked up."
    )

    def encode(self, clip, system_prompt, clean, pos=None, neg=None) -> tuple:
        pbar = comfy.utils.ProgressBar(2)
        sys_prompt = self.SYSTEM_PROMPT[system_prompt]
        pos = f'{sys_prompt} <Prompt Start> {pos}' if pos is not None else None
        neg = f'{sys_prompt} <Prompt Start> {neg}' if neg is not None else None
        pos = _clean_if_needed(pos, clean)
        neg = _clean_if_needed(neg, clean)
        return (
            _get_conditioning(pbar, clip, pos),
            _get_conditioning(pbar, clip, neg),
            pos or "",
            neg or ""
        )

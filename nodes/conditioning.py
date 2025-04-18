# Conditioning nodes
# This will include any nodes involving clip or conditioning.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO
import comfy

from ..utils import *

import torch

class Sage_ConditioningZeroOut(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
            "clip": (IO.CLIP, {"defaultInput": True, "tooltip": "The CLIP model used for encoding."})
            }
        }

    RETURN_TYPES = ("CONDITIONING",)
    FUNCTION = "zero_out"

    CATEGORY = "Sage Utils/clip"
    DESCRIPTION = "Returns zeroed out conditioning."
    def zero_out(self, clip) -> tuple:
        tokens = clip.tokenize("")
        output = clip.encode_from_tokens(tokens, return_pooled=True, return_dict=True)
        output["pooled_output"] = torch.zeros_like(output.get("pooled_output", torch.tensor([])))
        conditioning = torch.zeros_like(output.pop("cond"))
        return [([conditioning, output],)]

class Sage_ConditioningOneOut(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
            "clip": (IO.CLIP, {"defaultInput": True, "tooltip": "The CLIP model used for encoding."})
            }
        }

    RETURN_TYPES = ("CONDITIONING",)
    FUNCTION = "one_out"

    CATEGORY = "Sage Utils/clip"
    DESCRIPTION = "Returns oned out conditioning."

    EXPERIMENTAL = True

    def zero_out(self, clip) -> tuple:
        tokens = clip.tokenize("")
        output = clip.encode_from_tokens(tokens, return_pooled=True, return_dict=True)
        output["pooled_output"] = torch.ones_like(output.get("pooled_output", torch.tensor([])))
        conditioning = torch.ones_like(output.pop("cond"))
        return [([conditioning, output],)]

class Sage_ConditioningRngOut(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
            "clip": (IO.CLIP, {"defaultInput": True, "tooltip": "The CLIP model used for encoding."}),
            "seed": (IO.INT, {"default": 0, "min": 0, "max": 0xffffffffffffffff, "defaultInput": True, "tooltip": "The seed used to randomize the conditioning."})
            }
        }

    RETURN_TYPES = (IO.CONDITIONING,)
    FUNCTION = "rng_out"

    CATEGORY = "Sage Utils/clip"
    DESCRIPTION = "Returns randomized conditioning."

    EXPERIMENTAL = True

    def rng_out(self, clip, seed) -> tuple:
        torch.manual_seed(seed)
        tokens = clip.tokenize("")
        output = clip.encode_from_tokens(tokens, return_pooled=True, return_dict=True)
        output["pooled_output"] = torch.rand_like(output.get("pooled_output", torch.tensor([])))
        conditioning = torch.rand_like(output.pop("cond"))
        return [([conditioning, output],)]

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
    DESCRIPTION = "Turns a positive and negative prompt into conditionings, and passes through the prompts. Saves space over two CLIP Text Encoders, and zeros any input not hooked up."

    def get_conditioning(self, pbar, clip, text=None):
        pbar.update(1)
        return condition_text(clip, text)

    def encode(self, clip, clean, pos=None, neg=None) -> tuple:
        pbar = comfy.utils.ProgressBar(2)

        if pos is not None:
            pos = clean_text(pos) if clean else pos
        if neg is not None:
            neg = clean_text(neg) if clean else neg

        return (
            self.get_conditioning(pbar, clip, pos),
            self.get_conditioning(pbar, clip, neg),
            pos or "",
            neg or ""
        )

class Sage_DualCLIPTextEncodeLumina2(ComfyNodeABC):
    SYSTEM_PROMPT = {
        "superior": "You are an assistant designed to generate superior images with the superior "\
            "degree of image-text alignment based on textual prompts or user prompts.",
        "alignment": "You are an assistant designed to generate high-quality images with the "\
            "highest degree of image-text alignment based on textual prompts."
    }
    SYSTEM_PROMPT_TIP = "Lumina2 provide two types of system prompts:" \
        "Superior: You are an assistant designed to generate superior images with the superior "\
        "degree of image-text alignment based on textual prompts or user prompts. "\
        "Alignment: You are an assistant designed to generate high-quality images with the highest "\
        "degree of image-text alignment based on textual prompts."

    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        prompts = list(Sage_DualCLIPTextEncodeLumina2.SYSTEM_PROMPT.keys())
        return {
            "required": {
                "clip": (IO.CLIP, {"defaultInput": True, "tooltip": "The CLIP model used for encoding the text."}),
                "system_prompt": (prompts, {"tooltip": Sage_DualCLIPTextEncodeLumina2.SYSTEM_PROMPT_TIP}),
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

    CATEGORY = "Sage Utils/lumina 2"
    DESCRIPTION = "Turns a positive and negative prompt into conditionings, and passes through the prompts. Saves space over two CLIP Text Encoders, and zeros any input not hooked up."

    def get_conditioning(self, pbar, clip, text=None):
        pbar.update(1)
        return condition_text(clip, text)

    def encode(self, clip, system_prompt, clean, pos=None, neg=None) -> tuple:
        pbar = comfy.utils.ProgressBar(2)
        system_prompt = Sage_DualCLIPTextEncodeLumina2.SYSTEM_PROMPT[system_prompt]
        
        if pos is not None:
            pos = f'{system_prompt} <Prompt Start> {pos}'
            pos = clean_text(pos) if clean else pos
        
        if neg is not None:
            neg = f'{system_prompt} <Prompt Start> {neg}'
            neg = clean_text(neg) if clean else neg

        return (
            self.get_conditioning(pbar, clip, pos),
            self.get_conditioning(pbar, clip, neg),
            pos or "",
            neg or ""
        )

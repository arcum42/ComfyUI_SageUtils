# Conditioning nodes
# This will include any nodes involving clip or conditioning.

import torch

import comfy
from comfy.comfy_types import IO, ComfyNodeABC, InputTypeDict

from ..sage import *

class Sage_ConditioningZeroOut(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
            "clip": ("CLIP", {"defaultInput": True, "tooltip": "The CLIP model used for encoding."}),
            }
        }

    RETURN_TYPES = ("CONDITIONING",)
    FUNCTION = "zero_out"

    CATEGORY = "Sage Utils/clip"
    DESCRIPTION = "Returns zeroed out conditioning."
    def zero_out(self, clip):
        tokens = clip.tokenize("")
        output = clip.encode_from_tokens(tokens, return_pooled=True, return_dict=True)
        output["pooled_output"] = torch.zeros_like(output.get("pooled_output", torch.tensor([])))
        conditioning = torch.zeros_like(output.pop("cond"))
        return [([conditioning, output],)]

class Sage_ConditioningOneOut(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
            "clip": ("CLIP", {"defaultInput": True, "tooltip": "The CLIP model used for encoding."}),
            }
        }

    RETURN_TYPES = ("CONDITIONING",)
    FUNCTION = "one_out"

    CATEGORY = "Sage Utils/clip"
    DESCRIPTION = "Returns oned out conditioning."

    EXPERIMENTAL = True

    def zero_out(self, clip):
        tokens = clip.tokenize("")
        output = clip.encode_from_tokens(tokens, return_pooled=True, return_dict=True)
        output["pooled_output"] = torch.ones_like(output.get("pooled_output", torch.tensor([])))
        conditioning = torch.ones_like(output.pop("cond"))
        return [([conditioning, output],)]

class Sage_ConditioningRngOut(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
            "clip": ("CLIP", {"defaultInput": True, "tooltip": "The CLIP model used for encoding."}),
            "seed": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff, "defaultInput": True, "tooltip": "The seed used to randomize the conditioning."})
            }
        }

    RETURN_TYPES = ("CONDITIONING",)
    FUNCTION = "rng_out"

    CATEGORY = "Sage Utils/clip"
    DESCRIPTION = "Returns randomized conditioning."

    EXPERIMENTAL = True

    def rng_out(self, clip, seed):
        torch.manual_seed(seed)
        tokens = clip.tokenize("")
        output = clip.encode_from_tokens(tokens, return_pooled=True, return_dict=True)
        output["pooled_output"] = torch.rand_like(output.get("pooled_output", torch.tensor([])))
        conditioning = torch.rand_like(output.pop("cond"))
        return [([conditioning, output],)]

class Sage_DualCLIPTextEncode(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "clip": ("CLIP", {"defaultInput": True, "tooltip": "The CLIP model used for encoding the text."}),
                "clean": ("BOOLEAN", {"defaultInput": False, "tooltip": "Clean up the text, getting rid of extra spaces, commas, etc."}),
            },
            "optional": {
                "pos": ("STRING", {"defaultInput": True, "multiline": True, "dynamicPrompts": True, "tooltip": "The positive prompt's text."}),
                "neg": ("STRING", {"defaultInput": True, "multiline": True, "dynamicPrompts": True, "tooltip": "The negative prompt's text."}),
            }
        }
    RETURN_TYPES = ("CONDITIONING", "CONDITIONING", "STRING", "STRING")
    RETURN_NAMES = ("pos_cond", "neg_cond", "pos_text", "neg_text")

    OUTPUT_TOOLTIPS = ("A conditioning containing the embedded text used to guide the diffusion model. If neg is not hooked up, it'll be automatically zeroed.",)
    FUNCTION = "encode"

    CATEGORY = "Sage Utils/clip"
    DESCRIPTION = "Turns a positive and negative prompt into conditionings, and passes through the prompts. Saves space over two CLIP Text Encoders, and zeros any input not hooked up."

    def get_conditioning(self, pbar, clip, text=None):
        pbar.update(1)
        return condition_text(clip, text)

    def encode(self, clip, clean, pos=None, neg=None):
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
    def INPUT_TYPES(s):
        return {
            "required": {
                "clip": ("CLIP", {"defaultInput": True, "tooltip": "The CLIP model used for encoding the text."}),
                "system_prompt": (list(Sage_CLIPTextEncodeLumina2.SYSTEM_PROMPT.keys()), {"tooltip": Sage_CLIPTextEncodeLumina2.SYSTEM_PROMPT_TIP}),
                "clean": ("BOOLEAN", {"defaultInput": False, "tooltip": "Clean up the text, getting rid of extra spaces, commas, etc."}),

            },
            "optional": {
                "pos": ("STRING", {"defaultInput": True, "multiline": True, "dynamicPrompts": True, "tooltip": "The positive prompt's text."}),
                "neg": ("STRING", {"defaultInput": True, "multiline": True, "dynamicPrompts": True, "tooltip": "The negative prompt's text."}),
            }
        }
    RETURN_TYPES = ("CONDITIONING", "CONDITIONING", "STRING", "STRING")
    RETURN_NAMES = ("pos_cond", "neg_cond", "pos_text", "neg_text")

    OUTPUT_TOOLTIPS = ("A conditioning containing the embedded text used to guide the diffusion model. If neg is not hooked up, it'll be automatically zeroed.",)
    FUNCTION = "encode"

    CATEGORY = "Sage Utils/lumina 2"
    DESCRIPTION = "Turns a positive and negative prompt into conditionings, and passes through the prompts. Saves space over two CLIP Text Encoders, and zeros any input not hooked up."

    def get_conditioning(self, pbar, clip, text=None):
        pbar.update(1)
        return condition_text(clip, text)

    def encode(self, clip, system_prompt, clean, pos=None, neg=None):
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

class Sage_CLIPTextEncodeLumina2(ComfyNodeABC):
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
    def INPUT_TYPES(s) -> InputTypeDict:
        return {
            "required": {
                "system_prompt": (list(Sage_CLIPTextEncodeLumina2.SYSTEM_PROMPT.keys()), {"tooltip": Sage_CLIPTextEncodeLumina2.SYSTEM_PROMPT_TIP}),
                "user_prompt": (IO.STRING, {"multiline": True, "dynamicPrompts": True, "tooltip": "The text to be encoded."}),
                "clip": (IO.CLIP, {"tooltip": "The CLIP model used for encoding the text."})
            }
        }
    RETURN_TYPES = (IO.CONDITIONING,)
    OUTPUT_TOOLTIPS = ("A conditioning containing the embedded text used to guide the diffusion model.",)
    FUNCTION = "encode"

    CATEGORY = "Sage Utils/lumina 2"
    DESCRIPTION = "Encodes a system prompt and a user prompt using a CLIP model into an embedding that can be used to guide the diffusion model towards generating specific images."

    def encode(self, clip, user_prompt, system_prompt):
        if clip is None:
            raise RuntimeError("ERROR: clip input is invalid: None\n\nIf the clip is from a checkpoint loader node your checkpoint does not contain a valid clip or text encoder model.")
        system_prompt = Sage_CLIPTextEncodeLumina2.SYSTEM_PROMPT[system_prompt]
        prompt = f'{system_prompt} <Prompt Start> {user_prompt}'
        tokens = clip.tokenize(prompt)
        return (clip.encode_from_tokens_scheduled(tokens), )

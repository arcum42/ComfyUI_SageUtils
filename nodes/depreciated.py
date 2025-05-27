from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO

from ..utils import *
from .. import nodes

class Sage_SetBool(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "bool": (IO.BOOLEAN, {"defaultInput": False}),
            }
        }

    RETURN_TYPES = (IO.BOOLEAN,)
    RETURN_NAMES = ("bool",)

    FUNCTION = "pass_bool"

    CATEGORY = "Sage Utils/depreciated/primitives"
    DESCRIPTION = "Sets an boolean."
    DEPRECATED = True

    def pass_bool(self, bool: bool) -> tuple[bool]:
        return (bool,)

class Sage_SetInteger(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "int": (IO.INT, {"defaultInput": False}),
            }
        }

    RETURN_TYPES = (IO.INT,)
    RETURN_NAMES = ("int",)

    FUNCTION = "pass_int"

    CATEGORY = "Sage Utils/depreciated/primitives"
    DESCRIPTION = "Sets an integer."
    DEPRECATED = True

    def pass_int(self, int: int) -> tuple[int]:
        return (int,)

class Sage_SetFloat(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "float": (IO.FLOAT, {"defaultInput": False}),
            }
        }

    RETURN_TYPES = (IO.FLOAT,)
    RETURN_NAMES = ("float",)

    FUNCTION = "pass_float"

    CATEGORY = "Sage Utils/depreciated/primitives"
    DESCRIPTION = "Sets an float."
    DEPRECATED = True

    def pass_float(self, float: float) -> tuple[float]:
        return (float,)

class Sage_ViewText(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "text": (IO.STRING, {"forceInput": True, "multiline": True})
            }
        }

    RETURN_TYPES = (IO.STRING,)

    FUNCTION = "show_text"

    CATEGORY = "Sage Utils/depreciated"
    DESCRIPTION = "Shows some text."
    OUTPUT_NODE = True
    DEPRECATED = True

    def show_text(self, text) -> tuple[str]:
        #print(f"String is '{text}'")
        return { "ui": {"text": text}, "result" : (text,) }

class Sage_TextCompare(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "text1": (IO.STRING, {"defaultInput": True}),
                "text2": (IO.STRING, {"defaultInput": True}),
                "comparison_type": (["equal", "not_equal", "contains", "not_contains"], {"defaultInput": False}),
            }
        }

    RETURN_TYPES = (IO.BOOLEAN,)
    RETURN_NAMES = ("result",)

    FUNCTION = "compare"

    CATEGORY = "Sage Utils/depreciated"
    DESCRIPTION = "Compares two strings based on the selected comparison type."
    DEPRECIATED = True

    def compare(self, text1, text2, comparison_type) -> tuple[bool]:
        if comparison_type == "equal":
            return (text1 == text2,)
        elif comparison_type == "not_equal":
            return (text1 != text2,)
        elif comparison_type == "contains":
            return (text1 in text2,)
        elif comparison_type == "not_contains":
            return (text1 not in text2,)

class Sage_KSamplerDecoder(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "model": (IO.MODEL, {"tooltip": "The model used for denoising the input latent."}),
                "sampler_info": ('SAMPLER_INFO', { "defaultInput": True, "tooltip": "Adds in most of the KSampler options. Should be piped both here and to the Construct Metadata node."}),
                "positive": (IO.CONDITIONING, {"tooltip": "The conditioning describing the attributes you want to include in the image."}),
                "negative": (IO.CONDITIONING, {"tooltip": "The conditioning describing the attributes you want to exclude from the image."}),
                "latent_image": (IO.LATENT, {"tooltip": "The latent image to denoise."}),
                "vae": (IO.VAE, {"tooltip": "The VAE used for decoding the latent image."}),
                "denoise": (IO.FLOAT, {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01, "tooltip": "The amount of denoising applied, lower values will maintain the structure of the initial image allowing for image to image sampling."})
            },
            "optional": {
                "advanced_info": ('ADV_SAMPLER_INFO', {"defaultInput": True, "tooltip": "Optional. Adds in the options an advanced KSampler would have."})
            }
        }

    RETURN_TYPES = (IO.LATENT, IO.IMAGE)
    OUTPUT_TOOLTIPS = ("The denoised latent.", "The decoded image.")
    FUNCTION = "sample"

    CATEGORY = "Sage Utils/depreciated"
    DESCRIPTION = "KSampler + Tiled Decoder is preferred, because the tiling is optional on it. Uses the provided model, positive and negative conditioning to denoise the latent image, and generate an image with the provided vae. Designed to work with the Sampler info node."
    DEPRECATED = True

    def sample(self, model, sampler_info, positive, negative, latent_image, vae, denoise=1.0, advanced_info = None) -> tuple:
        latent_result = None
        
        if advanced_info is None:
            latent_result = nodes.common_ksampler(model, sampler_info["seed"], sampler_info["steps"], sampler_info["cfg"], sampler_info["sampler"], sampler_info["scheduler"], positive, negative, latent_image, denoise=denoise)
        else:
            force_full_denoise = True
            if advanced_info["return_with_leftover_noise"] == True:
                force_full_denoise = False

            disable_noise = False
            if advanced_info["add_noise"] == False:
                disable_noise = True
            latent_result = nodes.common_ksampler(model, sampler_info["seed"], sampler_info["steps"], sampler_info["cfg"], sampler_info["sampler"],  sampler_info["scheduler"], positive, negative, latent_image, denoise=denoise, disable_noise=disable_noise, start_step=advanced_info['start_at_step'], last_step=advanced_info['end_at_step'], force_full_denoise=force_full_denoise)

        images = vae.decode(latent_result[0]["samples"])
        
        if len(images.shape) == 5: #Combine batches
            images = images.reshape(-1, images.shape[-3], images.shape[-2], images.shape[-1])
        
        return (latent_result[0], images)
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

    CATEGORY = "Sage Utils/depreciated/clip"
    DESCRIPTION = "Returns randomized conditioning."

    EXPERIMENTAL = True
    DEPRECATED = True

    def rng_out(self, clip, seed) -> tuple:
        torch.manual_seed(seed)
        tokens = clip.tokenize("")
        output = clip.encode_from_tokens(tokens, return_pooled=True, return_dict=True)
        output["pooled_output"] = torch.rand_like(output.get("pooled_output", torch.tensor([])))
        conditioning = torch.rand_like(output.pop("cond"))
        return [([conditioning, output],)]
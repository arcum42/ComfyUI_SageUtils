from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO
from comfy_execution.graph_utils import GraphBuilder

# This file has deprecated nodes so we'll minimize imports
from nodes import  common_ksampler
from .metadata import Sage_ConstructMetadataFlexible
from typing import Optional


class Sage_ConstructMetadata(Sage_ConstructMetadataFlexible):
    """Constructs comprehensive A1111-style metadata with full LoRA hash information."""

    @classmethod
    def INPUT_TYPES(cls):  # type: ignore
        return {
            "required": {
                "model_info": ('MODEL_INFO', {}),
                "positive_string": (IO.STRING, {"default": ""}),
                "negative_string": (IO.STRING, {"default": ""}),
                "sampler_info": ('SAMPLER_INFO', {}),
                "width": (IO.INT, {"default": 1024}),
                "height": (IO.INT, {"default": 1024})
            },
            "optional": {
                "lora_stack": ('LORA_STACK', {"forceInput": True})
            },
        }

    DESCRIPTION = ("Constructs comprehensive A1111-style metadata with full LoRA hash information. "
                  "Uses the custom sampler info node. Returns a string that can be manipulated by other nodes.")
    FUNCTION = "construct_a1111"
    CATEGORY = "Sage Utils/depreciated"

    def construct_a1111(self, model_info: dict, positive_string: str, negative_string: str, 
                          width: int, height: int, sampler_info: dict, 
                          lora_stack: Optional[list] = None) -> tuple[str]:
        return self.construct_metadata(model_info=model_info, positive_string=positive_string, negative_string=negative_string,
                          width=width, height=height, sampler_info=sampler_info, metadata_style="A1111 Full",
                          lora_stack=lora_stack)

class Sage_ConstructMetadataLite(Sage_ConstructMetadataFlexible):
    """Constructs simplified A1111-style metadata without LoRA hash details."""

    @classmethod
    def INPUT_TYPES(cls):  # type: ignore
        return {
            "required": {
                "model_info": ('MODEL_INFO', {}),
                "positive_string": (IO.STRING, {"default": ""}),
                "negative_string": (IO.STRING, {"default": ""}),
                "sampler_info": ('SAMPLER_INFO', {}),
                "width": (IO.INT, {"default": 1024}),
                "height": (IO.INT, {"default": 1024})
            },
            "optional": {
                "lora_stack": ('LORA_STACK', {"forceInput": True})
            },
        }

    DESCRIPTION = ("Constructs simplified A1111-style metadata with resource information "
                  "but without detailed LoRA hashes. Uses the custom sampler info node.")
    FUNCTION = "construct_lite"
    CATEGORY = "Sage Utils/depreciated"

    def construct_lite(self, model_info: dict, positive_string: str, negative_string: str,
                          width: int, height: int, sampler_info: dict, 
                          lora_stack: Optional[list] = None) -> tuple[str]:
        return self.construct_metadata(model_info=model_info, positive_string=positive_string, negative_string=negative_string,
                          width=width, height=height, sampler_info=sampler_info, metadata_style="A1111 Lite",
                          lora_stack=lora_stack)

class Sage_KSamplerDecoder(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "model": (IO.MODEL, {"tooltip": "The model used for denoising the input latent."}),
                "sampler_info": ('SAMPLER_INFO', {"tooltip": "Adds in most of the KSampler options. Should be piped both here and to the Construct Metadata node."}),
                "positive": (IO.CONDITIONING, {"tooltip": "The conditioning describing the attributes you want to include in the image."}),
                "negative": (IO.CONDITIONING, {"tooltip": "The conditioning describing the attributes you want to exclude from the image."}),
                "latent_image": (IO.LATENT, {"tooltip": "The latent image to denoise."}),
                "vae": (IO.VAE, {"tooltip": "The VAE used for decoding the latent image."}),
                "denoise": (IO.FLOAT, {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01, "tooltip": "The amount of denoising applied, lower values will maintain the structure of the initial image allowing for image to image sampling."})
            },
            "optional": {
                "advanced_info": ('ADV_SAMPLER_INFO', {"forceInput": True, "tooltip": "Optional. Adds in the options an advanced KSampler would have."})
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
            latent_result = common_ksampler(model, sampler_info["seed"], sampler_info["steps"], sampler_info["cfg"], sampler_info["sampler"], sampler_info["scheduler"], positive, negative, latent_image, denoise=denoise)
        else:
            force_full_denoise = True
            if advanced_info["return_with_leftover_noise"] == True:
                force_full_denoise = False

            disable_noise = False
            if advanced_info["add_noise"] == False:
                disable_noise = True
            latent_result = common_ksampler(model, sampler_info["seed"], sampler_info["steps"], sampler_info["cfg"], sampler_info["sampler"],  sampler_info["scheduler"], positive, negative, latent_image, denoise=denoise, disable_noise=disable_noise, start_step=advanced_info['start_at_step'], last_step=advanced_info['end_at_step'], force_full_denoise=force_full_denoise)

        images = vae.decode(latent_result[0]["samples"])
        
        if len(images.shape) == 5: #Combine batches
            images = images.reshape(-1, images.shape[-3], images.shape[-2], images.shape[-1])
        
        return (latent_result[0], images)

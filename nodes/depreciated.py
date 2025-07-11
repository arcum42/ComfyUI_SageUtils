from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO
import folder_paths

# This file has deprecated nodes so we'll minimize imports
from .. import nodes
from ..utils import get_recently_used_models
from .model import Sage_CheckpointLoaderSimple
from .lora import Sage_LoraStack

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

class Sage_CheckpointLoaderRecent(Sage_CheckpointLoaderSimple):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        model_list = get_recently_used_models("checkpoints")

        return {
            "required": {
                "ckpt_name": (model_list, {"tooltip": "The name of the checkpoint (model) to load."}),
            }
        }

    CATEGORY = "Sage Utils/depreciated"
    DESCRIPTION = "DEPRECATED: Use Sage_CheckpointLoaderSimple instead. Loads a diffusion model checkpoint from recently used models. Also returns a model_info output to pass to the construct metadata node, and the hash."
    DEPRECATED = True

class Sage_LoraStackRecent(Sage_LoraStack):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        lora_list = get_recently_used_models("loras")
        return {
            "required": {
                "enabled": (IO.BOOLEAN, {"defaultInput": False, "default": True}),
                "lora_name": (lora_list, {"options": lora_list, "defaultInput": False, "tooltip": "The name of the LoRA."}),
                "model_weight": (IO.FLOAT, {"defaultInput": False, "default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01, "tooltip": "How strongly to modify the diffusion model. This value can be negative."}),
                "clip_weight": (IO.FLOAT, {"defaultInput": False, "default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01, "tooltip": "How strongly to modify the CLIP model. This value can be negative."}),
                },
            "optional": {
                "lora_stack": ("LORA_STACK", {"defaultInput": True}),
            }
        }

    CATEGORY = "Sage Utils/depreciated"
    DESCRIPTION = "DEPRECATED: Use Sage_LoraStack instead. Choose a lora from recently used models with weights, and add it to a lora_stack. Compatible with other node packs that have lora_stacks."
    DEPRECATED = True

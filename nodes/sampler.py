# Sampler nodes.
# This is for any nodes involving samplers, currently KSampler and the sampler info nodes.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO

import torch

import comfy
import nodes

class Sage_SamplerInfo(ComfyNodeABC):
    def __init__(self):
        pass
    
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "seed": (IO.INT, {"default": 0, "min": 0, "max": 0xffffffffffffffff, "tooltip": "The random seed used for creating the noise."}),
                "steps": (IO.INT, {"default": 20, "min": 1, "max": 10000, "tooltip": "The number of steps used in the denoising process."}),
                "cfg": (IO.FLOAT, {"default": 5.5, "min": 0.0, "max": 100.0, "step":0.1, "round": 0.01, "tooltip": "The Classifier-Free Guidance scale balances creativity and adherence to the prompt. Higher values result in images more closely matching the prompt however too high values will negatively impact quality."}),
                "sampler_name": (comfy.samplers.KSampler.SAMPLERS, {"default": "dpmpp_2m", "tooltip": "The algorithm used when sampling, this can affect the quality, speed, and style of the generated output."}),
                "scheduler": (comfy.samplers.KSampler.SCHEDULERS, {"default": "beta", "tooltip": "The scheduler controls how noise is gradually removed to form the image."}),
            }
        }

    RETURN_TYPES = ("SAMPLER_INFO",)
    OUTPUT_TOOLTIPS = ("To be piped to the Construct Metadata node and the KSampler with Metadata node.",)
    FUNCTION = "pass_info"

    CATEGORY = "Sage Utils/sampler"
    DESCRIPTION = "Grabs most of the sampler info. Should be routed both to the Construct Metadata node and the KSampler w/ Sampler Info node."

    def pass_info(self, seed, steps, cfg, sampler_name, scheduler) -> tuple:
        return {"seed": seed, "steps": steps, "cfg": cfg, "sampler": sampler_name, "scheduler": scheduler},

class Sage_AdvSamplerInfo(ComfyNodeABC):
    def __init__(self):
        pass
    
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "add_noise": (IO.BOOLEAN, {"default": True}),
                "start_at_step": (IO.INT, {"default": 0, "min": 0, "max": 10000}),
                "end_at_step": (IO.INT, {"default": 10000, "min": 0, "max": 10000}),
                "return_with_leftover_noise": (IO.BOOLEAN, {"default": False})
            }
        }

    RETURN_TYPES = ("ADV_SAMPLER_INFO",)
    OUTPUT_TOOLTIPS = ("To be piped to the KSampler.",)
    FUNCTION = "pass_adv_info"

    CATEGORY = "Sage Utils/sampler"
    DESCRIPTION = "Adds more optional values to the KSampler."

    def pass_adv_info(self, add_noise, start_at_step, end_at_step, return_with_leftover_noise) -> tuple:
        s_info = {}
        s_info["add_noise"] = add_noise
        s_info["start_at_step"] = start_at_step
        s_info["end_at_step"] = end_at_step
        s_info["return_with_leftover_noise"] = return_with_leftover_noise
        return s_info,

class Sage_TilingInfo(ComfyNodeABC):
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "tile_size": (IO.INT, {"default": 512, "min": 64, "max": 4096, "step": 32}),
                "overlap": (IO.INT, {"default": 64, "min": 0, "max": 4096, "step": 32}),
                "temporal_size": (IO.INT, {"default": 64, "min": 8, "max": 4096, "step": 4, "tooltip": "Only used for video VAEs: Amount of frames to decode at a time."}),
                "temporal_overlap": (IO.INT, {"default": 8, "min": 4, "max": 4096, "step": 4, "tooltip": "Only used for video VAEs: Amount of frames to overlap."}),
            }
        }
    
    RETURN_TYPES = ("TILING_INFO",)
    OUTPUT_TOOLTIPS = ("To be piped to the KSampler.",)
    FUNCTION = "pass_tiling_info"
    CATEGORY = "Sage Utils/sampler"
    DESCRIPTION = "Adds tiling information to the KSampler."
    
    def pass_tiling_info(self, tile_size, overlap, temporal_size, temporal_overlap) -> tuple:
        t_info = {}
        t_info["tile_size"] = tile_size
        t_info["overlap"] = overlap
        t_info["temporal_size"] = temporal_size
        t_info["temporal_overlap"] = temporal_overlap
        return t_info,

class Sage_KSampler(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "model": (IO.MODEL, {"tooltip": "The model used for denoising the input latent."}),
                "sampler_info": ('SAMPLER_INFO', { "defaultInput": True, "tooltip": "Adds in most of the KSampler options. Should be piped both here and to the Construct Metadata node."}),
                "positive": (IO.CONDITIONING, {"tooltip": "The conditioning describing the attributes you want to include in the image."}),
                "negative": (IO.CONDITIONING, {"tooltip": "The conditioning describing the attributes you want to exclude from the image."}),
                "latent_image": (IO.LATENT, {"tooltip": "The latent image to denoise."}),
                "denoise": (IO.FLOAT, {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01, "tooltip": "The amount of denoising applied, lower values will maintain the structure of the initial image allowing for image to image sampling."})
            },
            "optional": {
                "advanced_info": ('ADV_SAMPLER_INFO', {"defaultInput": True, "tooltip": "Optional. Adds in the options an advanced KSampler would have."})
            }
        }

    RETURN_TYPES = (IO.LATENT,)
    OUTPUT_TOOLTIPS = ("The denoised latent.",)
    FUNCTION = "sample"

    CATEGORY = "Sage Utils/sampler"
    DESCRIPTION = "Uses the provided model, positive and negative conditioning to denoise the latent image. Designed to work with the Sampler info node."

    def sample(self, model, sampler_info, positive, negative, latent_image, denoise=1.0, advanced_info = None) -> tuple:
        if advanced_info is None:
            return nodes.common_ksampler(model, sampler_info["seed"], sampler_info["steps"], sampler_info["cfg"], sampler_info["sampler"], sampler_info["scheduler"], positive, negative, latent_image, denoise=denoise)
        
        force_full_denoise = True
        if advanced_info["return_with_leftover_noise"] == True:
            force_full_denoise = False

        disable_noise = False
        if advanced_info["add_noise"] == False:
            disable_noise = True
        return nodes.common_ksampler(model, sampler_info["seed"], sampler_info["steps"], sampler_info["cfg"], sampler_info["sampler"],  sampler_info["scheduler"], positive, negative, latent_image, denoise=denoise, disable_noise=disable_noise, start_step=advanced_info['start_at_step'], last_step=advanced_info['end_at_step'], force_full_denoise=force_full_denoise)

class Sage_KSamplerTiledDecoder(ComfyNodeABC):
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
                "tiling_info": ('TILING_INFO', { "defaultInput": True, "tooltip": "Adds in the tiling options."}),
                "advanced_info": ('ADV_SAMPLER_INFO', {"defaultInput": True, "tooltip": "Optional. Adds in the options an advanced KSampler would have."})
            }
        }

    RETURN_TYPES = (IO.LATENT, IO.IMAGE)
    OUTPUT_TOOLTIPS = ("The denoised latent.", "The decoded image.")
    FUNCTION = "sample"

    CATEGORY = "Sage Utils/sampler"
    DESCRIPTION = "Uses the provided model, positive and negative conditioning to denoise the latent image, and generate an image with the provided vae. Designed to work with the Sampler info node. Will tile if tiling info is provided."

    def sample(self, model, sampler_info, positive, negative, latent_image, vae, denoise=1.0, tiling_info = None, advanced_info = None) -> tuple:
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
        
        if tiling_info is not None:
            print("Tiling info provided")
            t_info_tile_size = tiling_info["tile_size"]
            t_info_overlap = tiling_info["overlap"]
            t_info_temporal_size = tiling_info["temporal_size"]
            t_info_temporal_overlap = tiling_info["temporal_overlap"]
            
            if t_info_tile_size < t_info_overlap * 4:
                t_info_overlap = t_info_tile_size // 4
            if t_info_temporal_size < t_info_temporal_overlap * 2:
                t_info_temporal_overlap = t_info_temporal_overlap // 2

            temporal_compression = vae.temporal_compression_decode()

            if temporal_compression is not None:
                t_info_temporal_size = max(2, t_info_temporal_size // t_info_temporal_overlap)
                t_info_temporal_overlap = max(1, min(t_info_temporal_size // 2, t_info_temporal_overlap // temporal_compression))
            else:
                t_info_temporal_size = None
                t_info_temporal_overlap = None

            compression = vae.spacial_compression_decode()
        
        if tiling_info is None:
            images = vae.decode(latent_result[0]["samples"])
        else:
            images = vae.decode_tiled(
                latent_result[0]["samples"], 
                tile_x=t_info_tile_size // compression, tile_y=t_info_tile_size // compression, 
                overlap=t_info_overlap // compression, 
                tile_t=t_info_temporal_size, 
                overlap_t=t_info_temporal_overlap)
        
        if len(images.shape) == 5: #Combine batches
            images = images.reshape(-1, images.shape[-3], images.shape[-2], images.shape[-1])
        
        return (latent_result[0], images)

class Sage_KSamplerAudioDecoder(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "model": (IO.MODEL, {"tooltip": "The model used for denoising the input latent."}),
                "sampler_info": ('SAMPLER_INFO', { "defaultInput": True, "tooltip": "Adds in most of the KSampler options. Should be piped both here and to the Construct Metadata node."}),
                "positive": (IO.CONDITIONING, {"tooltip": "The conditioning describing the attributes you want to include in the audio."}),
                "negative": (IO.CONDITIONING, {"tooltip": "The conditioning describing the attributes you want to exclude from the audio."}),
                "latent_audio": (IO.LATENT, {"tooltip": "The latent audio to denoise."}),
                "vae": (IO.VAE, {"tooltip": "The VAE used for decoding the latent audio."}),
                "denoise": (IO.FLOAT, {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01, "tooltip": "The amount of denoising applied, lower values will maintain the structure of the initial image allowing for image to image sampling."})
            },
            "optional": {
                "advanced_info": ('ADV_SAMPLER_INFO', {"defaultInput": True, "tooltip": "Optional. Adds in the options an advanced KSampler would have."})
            }
        }

    RETURN_TYPES = (IO.LATENT, IO.AUDIO)
    OUTPUT_TOOLTIPS = ("The denoised latent.", "The decoded audio.")
    FUNCTION = "sample"

    CATEGORY = "Sage Utils/sampler"
    DESCRIPTION = "Uses the provided model, positive and negative conditioning to denoise the latent audio, and generate audio with the provided vae. Designed to work with the Sampler info node."

    def sample(self, model, sampler_info, positive, negative, latent_audio, vae, denoise=1.0, advanced_info = None) -> tuple:
        latent_result = None
        
        if advanced_info is None:
            latent_result = nodes.common_ksampler(model, sampler_info["seed"], sampler_info["steps"], sampler_info["cfg"], sampler_info["sampler"], sampler_info["scheduler"], positive, negative, latent_audio, denoise=denoise)
        else:
            force_full_denoise = True
            if advanced_info["return_with_leftover_noise"] == True:
                force_full_denoise = False

            disable_noise = False
            if advanced_info["add_noise"] == False:
                disable_noise = True
            latent_result = nodes.common_ksampler(model, sampler_info["seed"], sampler_info["steps"], sampler_info["cfg"], sampler_info["sampler"],  sampler_info["scheduler"], positive, negative, latent_audio, denoise=denoise, disable_noise=disable_noise, start_step=advanced_info['start_at_step'], last_step=advanced_info['end_at_step'], force_full_denoise=force_full_denoise)

        audio = vae.decode(latent_result[0]["samples"]).movedim(-1, 1)

        std = torch.std(audio, dim=[1,2], keepdim=True) * 5.0
        std[std < 1.0] = 1.0
        audio /= std
        return (latent_result[0], {"waveform": audio, "sample_rate": 44100} )

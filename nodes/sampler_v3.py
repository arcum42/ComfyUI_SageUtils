# Sampler v3 nodes.
# This is for any nodes involving samplers, currently KSampler and the sampler info nodes.

from __future__ import annotations
from comfy_api.latest import io
from typing import Any, Callable, Iterable, cast

import torch
import nodes as comfy_nodes

from comfy.samplers import KSampler
ksampler = cast(Callable[..., Any], getattr(comfy_nodes, "common_ksampler"))
SAMPLERS = KSampler.SAMPLERS
SCHEDULERS = KSampler.SCHEDULERS
SAMPLER_OPTIONS = list(cast(Iterable[str], SAMPLERS))
SCHEDULER_OPTIONS = list(cast(Iterable[str], SCHEDULERS))

from ..utils.helpers_image import vae_decode, vae_decode_tiled
from ..utils.constants import SAGE_UTILS_CAT

from .custom_io_v3 import *

class Sage_SamplerSelector(io.ComfyNode):
    """Selects a sampler for use in the pipeline."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_SamplerSelector",
            display_name="Sampler Selector",
            description="Selects a sampler for use in the pipeline.",
            category=f"{SAGE_UTILS_CAT}/sampler",
            inputs=[
                io.Combo.Input("sampler_name", display_name="sampler_name", options=SAMPLER_OPTIONS, default="dpmpp_2m", tooltip="The sampler algorithm to use for generation."),
            ],
            outputs=[
                io.String.Output("sampler", display_name="sampler", tooltip="The selected sampler name."),
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        sampler_name = kwargs.get("sampler_name", "dpmpp_2m")
        return io.NodeOutput(sampler_name)

class Sage_SchedulerSelector(io.ComfyNode):
    """Selects a scheduler for use in the pipeline."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_SchedulerSelector",
            display_name="Scheduler Selector",
            description="Selects a scheduler for use in the pipeline, and passes the steps to be used in the KSampler.",
            category=f"{SAGE_UTILS_CAT}/sampler",
            inputs=[
                io.Int.Input("steps", display_name="steps", default=20, min=1, max=10000, tooltip="The number of sampling steps."),
                io.Combo.Input("scheduler_name", display_name="scheduler_name", options=SCHEDULER_OPTIONS, default="beta", tooltip="The scheduler algorithm to use."),
            ],
            outputs=[
                io.Int.Output("out_steps", display_name="steps", tooltip="The validated number of sampling steps."),
                io.String.Output("scheduler", display_name="scheduler", tooltip="The selected scheduler name."),
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        steps = kwargs.get("steps", 20)
        scheduler_name = kwargs.get("scheduler_name", "beta")
        return io.NodeOutput(steps, scheduler_name)

class Sage_SamplerInfo(io.ComfyNode):
    """Grabs most of the sampler info."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_SamplerInfo",
            display_name="KSampler Info",
            description="Grabs most of the sampler info. Should be routed both to the Construct Metadata node and the KSampler w/ Sampler Info node.",
            category=f"{SAGE_UTILS_CAT}/sampler",
            inputs=[
                io.Int.Input("seed", display_name="seed", default=0, min=0, max=0xffffffffffffffff, tooltip="Random seed for sampling."),
                io.Int.Input("steps", display_name="steps", default=20, min=1, max=10000, tooltip="Number of sampling steps."),
                io.Float.Input("cfg", display_name="cfg", default=5.5, min=0.0, max=100.0, step=0.1, round=0.01, tooltip="CFG scale for the sampler."),
                io.Combo.Input("sampler_name", display_name="sampler_name", options=SAMPLER_OPTIONS, default="dpmpp_2m", tooltip="Sampler algorithm to use."),
                io.Combo.Input("scheduler", display_name="scheduler", options=SCHEDULER_OPTIONS, default="beta", tooltip="Scheduler algorithm to use."),
                AdvSamplerInfo.Input("advanced_info", display_name="advanced_info", optional=True, tooltip="Optional advanced sampler settings."),
            ],
            outputs=[
                SamplerInfo.Output("sampler_info", display_name="sampler_info", tooltip="The collected sampler configuration."),
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        seed = kwargs.get("seed", 0)
        steps = kwargs.get("steps", 20)
        cfg = kwargs.get("cfg", 5.5)
        sampler_name = kwargs.get("sampler_name", "dpmpp_2m")
        scheduler = kwargs.get("scheduler", "beta")
        adv_info = kwargs.get("advanced_info", None)
        
        info = {
            "seed": seed,
            "steps": steps,
            "cfg": cfg,
            "sampler": sampler_name,
            "scheduler": scheduler
        }
        if adv_info is not None:
            info |= adv_info
        return io.NodeOutput(info)


class Sage_SamplerInfoNoCFG(io.ComfyNode):
    """Grabs most of the sampler info."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_SamplerInfoNoCFG",
            display_name="KSampler Info (No CFG)",
            description="Grabs most of the sampler info (with cfg at 1.0). Should be routed both to the Construct Metadata node and the KSampler w/ Sampler Info node.",
            category=f"{SAGE_UTILS_CAT}/sampler",
            inputs=[
                io.Int.Input("seed", display_name="seed", default=0, min=0, max=0xffffffffffffffff, tooltip="Random seed for sampling."),
                io.Int.Input("steps", display_name="steps", default=20, min=1, max=10000, tooltip="Number of sampling steps."),
                io.Combo.Input("sampler_name", display_name="sampler_name", options=SAMPLER_OPTIONS, default="dpmpp_2m", tooltip="Sampler algorithm to use."),
                io.Combo.Input("scheduler", display_name="scheduler", options=SCHEDULER_OPTIONS, default="beta", tooltip="Scheduler algorithm to use."),
                AdvSamplerInfo.Input("advanced_info", display_name="advanced_info", optional=True, tooltip="Optional advanced sampler settings."),
            ],
            outputs=[
                SamplerInfo.Output("sampler_info", display_name="sampler_info", tooltip="The collected sampler configuration."),
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        seed = kwargs.get("seed", 0)
        steps = kwargs.get("steps", 20)
        cfg = 1.0
        sampler_name = kwargs.get("sampler_name", "dpmpp_2m")
        scheduler = kwargs.get("scheduler", "beta")
        adv_info = kwargs.get("advanced_info", None)
        
        info = {
            "seed": seed,
            "steps": steps,
            "cfg": cfg,
            "sampler": sampler_name,
            "scheduler": scheduler
        }
        if adv_info is not None:
            info |= adv_info
        return io.NodeOutput(info)
    
class Sage_AdvSamplerInfo(io.ComfyNode):
    """Adds more optional values to the KSampler."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_AdvSamplerInfo",
            display_name="Adv KSampler Info",
            description="Adds more optional values to the KSampler.",
            category=f"{SAGE_UTILS_CAT}/sampler",
            inputs=[
                io.Boolean.Input("add_noise", display_name="add_noise", default=True, tooltip="Whether to add noise during sampling."),
                io.Int.Input("start_at_step", display_name="start_at_step", default=0, min=0, max=10000, tooltip="The first step at which to apply noise."),
                io.Int.Input("end_at_step", display_name="end_at_step", default=10000, min=0, max=10000, tooltip="The last step at which to apply noise."),
                io.Boolean.Input("return_with_leftover_noise", display_name="return_with_leftover_noise", default=False, tooltip="Return the extra noise if not fully denoised."),
            ],
            outputs=[
                AdvSamplerInfo.Output("adv_sampler_info", display_name="adv_sampler_info", tooltip="The advanced sampler settings.")
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        add_noise = kwargs.get("add_noise", True)
        start_at_step = kwargs.get("start_at_step", 0)
        end_at_step = kwargs.get("end_at_step", 10000)
        return_with_leftover_noise = kwargs.get("return_with_leftover_noise", False)
        
        info = {
            "add_noise": add_noise,
            "start_at_step": start_at_step,
            "end_at_step": end_at_step,
            "return_with_leftover_noise": return_with_leftover_noise
        }
        return io.NodeOutput(info)

def call_ksampler(info, model, positive, negative, latent_image, denoise):
    seed = info.get("seed", 0)
    steps = info.get("steps", 20)
    cfg = info.get("cfg", 5.5)
    sampler_name = info.get("sampler", "dpmpp_2m")
    scheduler = info.get("scheduler", "beta")
    
    # defaults should be disable_noise=False, start_step=None, last_step=None, force_full_denoise=False
    disable_noise = not info.get("add_noise", True)
    start_step = info.get("start_at_step", None)
    last_step = info.get("end_at_step", None)
    force_full_denoise = not info.get("return_with_leftover_noise", True)
    print(f"Calling KSampler with seed={seed}, steps={steps}, cfg={cfg}, sampler_name={sampler_name}, scheduler={scheduler}, disable_noise={disable_noise}, start_step={start_step}, last_step={last_step}, force_full_denoise={force_full_denoise}")

    return ksampler(
        model=model,
        seed=seed,
        steps=steps,
        cfg=cfg,
        sampler_name=sampler_name,
        scheduler=scheduler,
        positive=positive,
        negative=negative,
        latent=latent_image,
        denoise=denoise,
        disable_noise=disable_noise,
        start_step=start_step,
        last_step=last_step, 
        force_full_denoise=force_full_denoise) # pyright: ignore[reportCallIssue]

class Sage_KSampler(io.ComfyNode):
    """Uses the provided model, positive and negative conditioning to denoise the latent image."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_KSampler",
            display_name="KSampler w/ Sampler Info",
            description="Uses the provided model, positive and negative conditioning to denoise the latent image. Designed to work with the Sampler info node.",
            category=f"{SAGE_UTILS_CAT}/sampler",
            inputs=[
                io.Model.Input("model", display_name="model", tooltip="The model used for denoising."),
                SamplerInfo.Input("sampler_info", display_name="sampler_info", tooltip="Sampler configuration for the KSampler."),
                io.Conditioning.Input("positive", display_name="positive", tooltip="Positive conditioning for generation."),
                io.Conditioning.Input("negative", display_name="negative", tooltip="Negative conditioning for generation."),
                io.Latent.Input("latent_image", display_name="latent_image", tooltip="The latent image to denoise."),
                io.Float.Input("denoise", display_name="denoise", default=1.0, min=0.0, max=1.0, step=0.01, tooltip="The denoising strength."),
            ],
            outputs=[
                io.Latent.Output("latent", display_name="latent", tooltip="The denoised latent output.")
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        model = kwargs.get("model", None)
        positive = kwargs.get("positive", None)
        negative = kwargs.get("negative", None)
        latent_image = kwargs.get("latent_image", None)
        denoise = kwargs.get("denoise", 1.0)

        info = kwargs.get("sampler_info", {})

        return call_ksampler(info, model, positive, negative, latent_image, denoise)

class Sage_KSamplerTiledDecoder(io.ComfyNode):
    """KSampler with tiled VAE decoder."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_KSamplerTiledDecoder",
            display_name="KSampler + Tiled Decoder",
            description="Uses the provided model, positive and negative conditioning to denoise the latent image, and generate an image with the provided vae. Designed to work with the Sampler info node. Will tile if tiling info is provided.",
            category=f"{SAGE_UTILS_CAT}/sampler",
            inputs=[
                io.Model.Input("model", display_name="model", tooltip="The model used for denoising."),
                SamplerInfo.Input("sampler_info", display_name="sampler_info", tooltip="Sampler configuration for the KSampler."),
                io.Conditioning.Input("positive", display_name="positive", tooltip="Positive conditioning for generation."),
                io.Conditioning.Input("negative", display_name="negative", tooltip="Negative conditioning for generation."),
                io.Latent.Input("latent_image", display_name="latent_image", tooltip="The latent image to denoise."),
                io.Vae.Input("vae", display_name="vae", tooltip="The VAE used to decode the denoised latent."),
                io.Float.Input("denoise", display_name="denoise", default=1.0, min=0.0, max=1.0, step=0.01, tooltip="The denoising strength."),
                TilingInfo.Input("tiling_info", display_name="tiling_info", optional=True, tooltip="Optional tiling parameters for the decoder."),
            ],
            outputs=[
                io.Latent.Output("latent", display_name="latent", tooltip="The denoised latent output."),
                io.Image.Output("image", display_name="image", tooltip="The decoded image generated by the VAE.")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        model = kwargs.get("model", None)
        positive = kwargs.get("positive", None)
        negative = kwargs.get("negative", None)
        latent_image = kwargs.get("latent_image", None)
        vae = kwargs.get("vae", None)
        denoise = kwargs.get("denoise", 1.0)

        info = kwargs.get("sampler_info", {})

        tiling_info = kwargs.get("tiling_info", None)

        latent_result = call_ksampler(info, model, positive, negative, latent_image, denoise)

        if tiling_info is not None:
            images = vae_decode_tiled(
                latent_result, 
                vae, 
                tiling_info["tile_size"],
                tiling_info["overlap"], 
                tiling_info["temporal_size"],
                tiling_info["temporal_overlap"])
        else:
            images = vae_decode(latent_result, vae)

        return io.NodeOutput(latent_result[0], images)

class Sage_KSamplerAudioDecoder(io.ComfyNode):
    """KSampler with audio VAE decoder."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_KSamplerAudioDecoder",
            display_name="KSampler + Audio Decoder",
            description="Uses the provided model, positive and negative conditioning to denoise the latent audio, and generate audio with the provided vae. Designed to work with the Sampler info node.",
            category=f"{SAGE_UTILS_CAT}/sampler",
            inputs=[
                io.Model.Input("model", display_name="model", tooltip="The model used for denoising audio latent."),
                SamplerInfo.Input("sampler_info", display_name="sampler_info", tooltip="Sampler configuration for the KSampler."),
                io.Conditioning.Input("positive", display_name="positive", tooltip="Positive conditioning for audio generation."),
                io.Conditioning.Input("negative", display_name="negative", tooltip="Negative conditioning for audio generation."),
                io.Latent.Input("latent_audio", display_name="latent_audio", tooltip="The latent audio tensor to denoise."),
                io.Vae.Input("vae", display_name="vae", tooltip="The audio VAE used to decode the denoised latent."),
                io.Float.Input("denoise", display_name="denoise", default=1.0, min=0.0, max=1.0, step=0.01, tooltip="The denoising strength."),
            ],
            outputs=[
                io.Latent.Output("latent", display_name="latent", tooltip="The denoised latent audio output."),
                io.Audio.Output("audio", display_name="audio", tooltip="The decoded audio result.")
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        model = kwargs.get("model", None)

        positive = kwargs.get("positive", None)
        negative = kwargs.get("negative", None)
        latent_audio = kwargs.get("latent_audio", None)
        vae = kwargs.get("vae", None)
        denoise = kwargs.get("denoise", 1.0)

        info = kwargs.get("sampler_info", {})

        if vae is None:
            raise ValueError("VAE model is required for audio decoding.")

        latent_result = call_ksampler(info, model, positive, negative, latent_audio, denoise)

        audio = vae.decode(latent_result[0]["samples"]).movedim(-1, 1)

        std = torch.std(audio, dim=[1,2], keepdim=True) * 5.0
        std[std < 1.0] = 1.0
        audio /= std
        return io.NodeOutput(latent_result[0], {"waveform": audio, "sample_rate": 44100})

SAMPLER_NODES = [
    # sampler nodes
    Sage_SamplerSelector,
    Sage_SchedulerSelector,
    Sage_SamplerInfo,
    Sage_SamplerInfoNoCFG,
    Sage_AdvSamplerInfo,
    Sage_KSampler,
    Sage_KSamplerTiledDecoder,
    Sage_KSamplerAudioDecoder
]

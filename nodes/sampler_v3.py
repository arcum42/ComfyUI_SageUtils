# Sampler v3 nodes.
# This is for any nodes involving samplers, currently KSampler and the sampler info nodes.
# See ref_docs/v3_migration.md for info on migrating to v3 nodes.

from __future__ import annotations
from comfy.comfy_types.node_typing import IO
from comfy_api.latest import io

import torch

from comfy.samplers import KSampler
from nodes import common_ksampler as ksampler
SAMPLERS = KSampler.SAMPLERS
SCHEDULERS = KSampler.SCHEDULERS

from ..utils.common import (
    vae_decode,
    vae_decode_tiled
)

# Think I've got things working now.

class Sage_SamplerSelector(io.ComfyNode):
    """Selects a sampler for use in the pipeline."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_SamplerSelector",
            display_name="Sampler Selector",
            description="Selects a sampler for use in the pipeline.",
            category="Sage Utils/sampler",
            inputs=[
                io.Combo.Input("sampler_name", options=list(SAMPLERS), default="dpmpp_2m")
            ],
            outputs=[
                io.String.Output("sampler")
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
            category="Sage Utils/sampler",
            inputs=[
                io.Int.Input("steps", default=20, min=1, max=10000),
                io.Combo.Input("scheduler_name", options=list(SCHEDULERS), default="beta")
            ],
            outputs=[
                io.Int.Output("out_steps", display_name="steps"),
                io.String.Output("scheduler")
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
            category="Sage Utils/sampler",
            inputs=[
                io.Int.Input("seed", default=0, min=0, max=0xffffffffffffffff),
                io.Int.Input("steps", default=20, min=1, max=10000),
                io.Float.Input("cfg", default=5.5, min=0.0, max=100.0, step=0.1, round=0.01),
                io.Combo.Input("sampler_name", options=list(SAMPLERS), default="dpmpp_2m"),
                io.Combo.Input("scheduler", options=list(SCHEDULERS), default="beta")
            ],
            outputs=[
                io.Custom("SAMPLER_INFO").Output("sampler_info")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        seed = kwargs.get("seed", 0)
        steps = kwargs.get("steps", 20)
        cfg = kwargs.get("cfg", 5.5)
        sampler_name = kwargs.get("sampler_name", "dpmpp_2m")
        scheduler = kwargs.get("scheduler", "beta")
        
        info = {
            "seed": seed,
            "steps": steps,
            "cfg": cfg,
            "sampler": sampler_name,
            "scheduler": scheduler
        }
        return io.NodeOutput(info)

class Sage_AdvSamplerInfo(io.ComfyNode):
    """Adds more optional values to the KSampler."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_AdvSamplerInfo",
            display_name="Adv KSampler Info",
            description="Adds more optional values to the KSampler.",
            category="Sage Utils/sampler",
            inputs=[
                io.Boolean.Input("add_noise", default=True),
                io.Int.Input("start_at_step", default=0, min=0, max=10000),
                io.Int.Input("end_at_step", default=10000, min=0, max=10000),
                io.Boolean.Input("return_with_leftover_noise", default=False)
            ],
            outputs=[
                io.Custom("ADV_SAMPLER_INFO").Output("adv_sampler_info")
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

class Sage_KSampler(io.ComfyNode):
    """Uses the provided model, positive and negative conditioning to denoise the latent image."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_KSampler",
            display_name="KSampler w/ Sampler Info",
            description="Uses the provided model, positive and negative conditioning to denoise the latent image. Designed to work with the Sampler info node.",
            category="Sage Utils/sampler",
            inputs=[
                io.Model.Input("model"),
                io.Custom("SAMPLER_INFO").Input("sampler_info"),
                io.Conditioning.Input("positive"),
                io.Conditioning.Input("negative"),
                io.Latent.Input("latent_image"),
                io.Float.Input("denoise", default=1.0, min=0.0, max=1.0, step=0.01),
                io.Custom("ADV_SAMPLER_INFO").Input("advanced_info", optional=True)
            ],
            outputs=[
                io.Latent.Output("latent")
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        model = kwargs.get("model", None)
        sampler_info = kwargs.get("sampler_info", {})

        seed = sampler_info.get("seed", 0)
        steps = sampler_info.get("steps", 20)
        cfg = sampler_info.get("cfg", 5.5)
        sampler_name = sampler_info.get("sampler", "dpmpp_2m")
        scheduler = sampler_info.get("scheduler", "beta")

        positive = kwargs.get("positive", None)
        negative = kwargs.get("negative", None)
        latent_image = kwargs.get("latent_image", None)
        denoise = kwargs.get("denoise", 1.0)
        advanced_info = kwargs.get("advanced_info", None)
        disable_noise = False
        start_step = None
        last_step = None
        force_full_denoise = False
        
        if advanced_info is not None:
            disable_noise = not advanced_info.get("add_noise", True)
            start_step = advanced_info.get("start_at_step", None)
            last_step = advanced_info.get("end_at_step", None)
            force_full_denoise = not advanced_info.get("return_with_leftover_noise", True)

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

class Sage_KSamplerTiledDecoder(io.ComfyNode):
    """KSampler with tiled VAE decoder."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_KSamplerTiledDecoder",
            display_name="KSampler + Tiled Decoder",
            description="Uses the provided model, positive and negative conditioning to denoise the latent image, and generate an image with the provided vae. Designed to work with the Sampler info node. Will tile if tiling info is provided.",
            category="Sage Utils/sampler",
            inputs=[
                io.Model.Input("model"),
                io.Custom("SAMPLER_INFO").Input("sampler_info"),
                io.Conditioning.Input("positive"),
                io.Conditioning.Input("negative"),
                io.Latent.Input("latent_image"),
                io.Vae.Input("vae"),
                io.Float.Input("denoise", default=1.0, min=0.0, max=1.0, step=0.01),
                io.Custom("TILING_INFO").Input("tiling_info", optional=True),
                io.Custom("ADV_SAMPLER_INFO").Input("advanced_info", optional=True)
            ],
            outputs=[
                io.Latent.Output("latent"),
                io.Image.Output("image")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        model = kwargs.get("model", None)
        sampler_info = kwargs.get("sampler_info", {})

        seed = sampler_info.get("seed", 0)
        steps = sampler_info.get("steps", 20)
        cfg = sampler_info.get("cfg", 5.5)
        sampler_name = sampler_info.get("sampler", "dpmpp_2m")
        scheduler = sampler_info.get("scheduler", "beta")

        positive = kwargs.get("positive", None)
        negative = kwargs.get("negative", None)
        latent_image = kwargs.get("latent_image", None)
        vae = kwargs.get("vae", None)
        denoise = kwargs.get("denoise", 1.0)
        advanced_info = kwargs.get("advanced_info", None)
        tiling_info = kwargs.get("tiling_info", None)

        disable_noise = False
        start_step = None
        last_step = None
        force_full_denoise = False
        
        if advanced_info is not None:
            disable_noise = not advanced_info.get("add_noise", True)
            start_step = advanced_info.get("start_at_step", None)
            last_step = advanced_info.get("end_at_step", None)
            force_full_denoise = not advanced_info.get("return_with_leftover_noise", True)

        latent_result = ksampler(
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

        return io.NodeOutput(latent_result, images)

# Not really tested, as I haven't done anything audio for a while.
class Sage_KSamplerAudioDecoder(io.ComfyNode):
    """KSampler with audio VAE decoder."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_KSamplerAudioDecoder",
            display_name="KSampler + Audio Decoder",
            description="Uses the provided model, positive and negative conditioning to denoise the latent audio, and generate audio with the provided vae. Designed to work with the Sampler info node.",
            category="Sage Utils/sampler",
            inputs=[
                io.Model.Input("model"),
                io.Custom("SAMPLER_INFO").Input("sampler_info"),
                io.Conditioning.Input("positive"),
                io.Conditioning.Input("negative"),
                io.Latent.Input("latent_audio"),
                io.Vae.Input("vae"),
                io.Float.Input("denoise", default=1.0, min=0.0, max=1.0, step=0.01),
                io.Custom("ADV_SAMPLER_INFO").Input("advanced_info", optional=True)
            ],
            outputs=[
                io.Latent.Output("latent"),
                io.Audio.Output("audio")
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        model = kwargs.get("model", None)
        sampler_info = kwargs.get("sampler_info", {})

        seed = sampler_info.get("seed", 0)
        steps = sampler_info.get("steps", 20)
        cfg = sampler_info.get("cfg", 5.5)
        sampler_name = sampler_info.get("sampler", "dpmpp_2m")
        scheduler = sampler_info.get("scheduler", "beta")

        positive = kwargs.get("positive", None)
        negative = kwargs.get("negative", None)
        latent_audio = kwargs.get("latent_audio", None)
        vae = kwargs.get("vae", None)
        denoise = kwargs.get("denoise", 1.0)
        advanced_info = kwargs.get("advanced_info", None)
        disable_noise = False
        start_step = None
        last_step = None
        force_full_denoise = False
        if vae is None:
            raise ValueError("VAE model is required for audio decoding.")
        
        if advanced_info is not None:
            disable_noise = not advanced_info.get("add_noise", True)
            start_step = advanced_info.get("start_at_step", None)
            last_step = advanced_info.get("end_at_step", None)
            force_full_denoise = not advanced_info.get("return_with_leftover_noise", True)

        latent_result = ksampler(
            model=model,
            seed=seed,
            steps=steps,
            cfg=cfg,
            sampler_name=sampler_name,
            scheduler=scheduler,
            positive=positive,
            negative=negative,
            latent=latent_audio,
            denoise=denoise,
            disable_noise=disable_noise,
            start_step=start_step,
            last_step=last_step, 
            force_full_denoise=force_full_denoise) # pyright: ignore[reportCallIssue]

        audio = vae.decode(latent_result[0]["samples"]).movedim(-1, 1)

        std = torch.std(audio, dim=[1,2], keepdim=True) * 5.0
        std[std < 1.0] = 1.0
        audio /= std
        return io.NodeOutput(latent_result[0], {"waveform": audio, "sample_rate": 44100})

SAMPLER_NODES = [
    Sage_SamplerSelector,
    Sage_SchedulerSelector,
    Sage_SamplerInfo,
    Sage_AdvSamplerInfo,
    Sage_KSampler,
    Sage_KSamplerTiledDecoder,
    Sage_KSamplerAudioDecoder
]

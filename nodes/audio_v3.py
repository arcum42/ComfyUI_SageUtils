# Audio-related nodes for Sage Utils, including Ace Step 1.5 encoding and advanced options.

from __future__ import annotations

import torch

import comfy.model_management
from comfy_api.latest import io

# Import specific utilities from source modules
from ..utils.logger import get_logger
from ..utils.constants import SAGE_UTILS_CAT
from .custom_io_v3 import AdvAudioInfo

logger = get_logger('nodes.audio')


class Sage_EmptyAceStep15LatentAudio(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_EmptyAceStep15LatentAudio",
            display_name="Empty Ace Step 1.5 Audio Passthrough",
            description="Creates an empty latent audio tensor for Ace Step 1.5 models.",
            category=f"{SAGE_UTILS_CAT}/audio",
            inputs=[
                io.Float.Input("seconds", display_name="seconds", default=120.0, min=1.0, max=1000.0, step=0.01),
                io.Int.Input("batch_size", display_name="batch_size", default=1),
            ],
            outputs=[
                io.Latent.Output("latent", display_name="latent"),
                io.Float.Output("out_seconds", display_name="seconds")
            ]
        )
        
    @classmethod
    def execute(cls, **kwargs) -> io.NodeOutput:
        seconds = kwargs.get("seconds", 120.0)
        batch_size = kwargs.get("batch_size", 1)

        length = round((seconds * 48000 / 1920))
        latent = torch.zeros([batch_size, 64, length], device=comfy.model_management.intermediate_device())
        return io.NodeOutput({"samples": latent, "type": "audio"}, seconds)

class Sage_AceAdvOptions(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_AceAdvOptions",
            display_name="Ace Advanced Options",
            description="Advanced options for Ace Step 1.5 audio encoding. These options can be used to fine-tune the behavior of the audio encoding process.",
            category=f"{SAGE_UTILS_CAT}/audio",
            inputs=[
                io.Combo.Input("language", options=["en", "ja", "zh", "es", "de", "fr", "pt", "ru", "it", "nl", "pl", "tr", "vi", "cs", "fa", "id", "ko", "uk", "hu", "ar", "sv", "ro", "el"]),
                io.Float.Input("cfg_scale", default=2.0, min=0.0, max=100.0, step=0.1, advanced=True),
                io.Float.Input("temperature", default=0.85, min=0.0, max=2.0, step=0.01, advanced=True),
                io.Float.Input("top_p", default=0.9, min=0.0, max=2000.0, step=0.01, advanced=True),
                io.Int.Input("top_k", default=0, min=0, max=100, advanced=True),
                io.Float.Input("min_p", default=0.000, min=0.0, max=1.0, step=0.001, advanced=True),
            ],
            outputs=[
                AdvAudioInfo.Output("adv_audio_info", display_name="Advanced Audio Info", tooltip="The advanced audio options for Ace Step 1.5 encoding."),
            ],
        )

    @classmethod
    def execute(cls, **kwargs) -> io.NodeOutput:
        language = kwargs.get("language", "en")
        cfg_scale = kwargs.get("cfg_scale", 2.0)
        temperature = kwargs.get("temperature", 0.85)
        top_p = kwargs.get("top_p", 0.9)
        top_k = kwargs.get("top_k", 0)
        min_p = kwargs.get("min_p", 0.000)

        adv_audio_info = {
            "language": language,
            "cfg_scale": cfg_scale,
            "temperature": temperature,
            "top_p": top_p,
            "top_k": top_k,
            "min_p": min_p
        }

        return io.NodeOutput(adv_audio_info)


class Sage_Ace15AudioEncode(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_Ace15AudioEncode",
            display_name="Ace Step 1.5 Audio Encode",
            description="Encodes an audio clip into a conditioning using the Ace Step 1.5 model. This is used to create a conditioning from an audio reference.",
            category=f"{SAGE_UTILS_CAT}/audio",
            inputs=[
                io.Clip.Input("clip"),
                io.String.Input("tags", force_input=True, multiline=True, dynamic_prompts=True),
                io.String.Input("lyrics", force_input=True, multiline=True, dynamic_prompts=True),
                io.Int.Input("seed", default=0, min=0, max=0xffffffffffffffff, control_after_generate=True),
                io.Float.Input("duration", default=120.0, min=0.0, max=2000.0, step=0.1),
                io.Int.Input("bpm", default=120, min=10, max=300),
                io.Combo.Input("timesignature", options=['2', '3', '4', '6']),
                io.Combo.Input("keyscale", options=[f"{root} {quality}" for quality in ["major", "minor"] for root in ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"]]),
                io.Boolean.Input("generate_audio_codes", default=True, tooltip="Enable the LLM that generates audio codes. This can be slow but will increase the quality of the generated audio. Turn this off if you are giving the model an audio reference.", advanced=True),
                AdvAudioInfo.Input("adv_audio_info", display_name="Advanced Audio Info", tooltip="Advanced audio options for Ace Step 1.5 encoding.", advanced=True)
            ],
            outputs=[io.Conditioning.Output()],
        )

    @classmethod
    def execute(cls, **kwargs) -> io.NodeOutput:
        clip = kwargs.get("clip", None)
        tags = kwargs.get("tags", "")
        lyrics = kwargs.get("lyrics", "")
        seed = kwargs.get("seed", 0)
        duration = kwargs.get("duration", 120.0)
        bpm = kwargs.get("bpm", 120)
        timesignature = kwargs.get("timesignature", "4")
        keyscale = kwargs.get("keyscale", "C major")
        generate_audio_codes = kwargs.get("generate_audio_codes", True)

        adv_audio_info = kwargs.get("adv_audio_info", {})
        language = adv_audio_info.get("language", "en")
        cfg_scale = adv_audio_info.get("cfg_scale", 2.0)
        temperature = adv_audio_info.get("temperature", 0.85)
        top_p = adv_audio_info.get("top_p", 0.9)
        top_k = adv_audio_info.get("top_k", 0)
        min_p = adv_audio_info.get("min_p", 0.000)

        if clip is None:
            logger.info("No clip provided for Ace Step 1.5 encoding, returning empty conditioning.")
            return io.NodeOutput(None)

        tokens = clip.tokenize(tags,
                               lyrics=lyrics,
                               bpm=bpm,
                               duration=duration,
                               timesignature=int(timesignature),
                               language=language,
                               keyscale=keyscale,
                               seed=seed,
                               generate_audio_codes=generate_audio_codes,
                               cfg_scale=cfg_scale,
                               temperature=temperature,
                               top_p=top_p,
                               top_k=top_k,
                               min_p=min_p)
        conditioning = clip.encode_from_tokens_scheduled(tokens)
        return io.NodeOutput(conditioning)


AUDIO_NODES = [
    Sage_EmptyAceStep15LatentAudio,
    Sage_AceAdvOptions,
    Sage_Ace15AudioEncode
]
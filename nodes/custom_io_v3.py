# Add all custom input/output types for my nodes here.
# Where v1 just used strings, v3 expects a custom type.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO
from comfy_api.latest import io, ComfyExtension
from typing_extensions import override

@io.comfytype(io_type="MODEL_INFO")
class ModelInfo(io.ComfyTypeIO):
    """
    Model information type for SageUtils selector nodes.
    Contains metadata about a model without loading the actual model.
    """
    Type = tuple  # Model info is stored as a tuple of dictionaries

class UnetInfo(ModelInfo):
    """
    Model info type specifically for UNet models.
    Actually identical to ModelInfo, but useful to avoid not having a 
    unet, clip, and vae all in ModelInfo.
    """
    pass

class VaeInfo(ModelInfo):
    """
    Model info type specifically for VAE models.
    Actually identical to ModelInfo, but useful to avoid not having a 
    unet, clip, and vae all in ModelInfo.
    """
    pass

class ClipInfo(ModelInfo):
    """
    Model info type specifically for CLIP models.
    Actually identical to ModelInfo, but useful to avoid not having a 
    unet, clip, and vae all in ModelInfo.
    """
    pass

@io.comfytype(io_type="MODEL_SHIFTS")
class ModelShiftInfo(io.ComfyTypeIO):
    """
    Model info type specifically for model shifting.
    Holds what type of model shift to perform, the shift, and also FreeU v2 parameters.
    """
    Type = dict  # Model shift info is stored as a dictionary
    # Keys are:            
    # "shift_type": shift_type,
    # "shift": shift, 
    # "freeu_v2": freeu_v2,
    # "b1": b1,
    # "b2": b2,
    # "s1": s1,
    # "s2": s2

@io.comfytype(io_type="LORA_STACK")
class LoraStack(io.ComfyTypeIO):
    """
    Lora stack information type for SageUtils LoraStack nodes.
    Contains metadata about a lora stack without loading the actual lora models.
    """
    # lora_stack = [(path,weight,weight),(path,weight,weight),...]
    Type = list  # Lora stack info is stored as a list of tuples.
    # It contains the lora path, model weight, and clip weight for each lora in the stack.
    # This uses this structure for compatibility with existing LoraStack nodes.

@io.comfytype(io_type="TILING_INFO")
class TilingInfo(io.ComfyTypeIO):
    """
    Tiling information type for KSampler nodes.
    Contains tile size, overlap, and temporal parameters for tiled decoding.
    """
    Type = dict  # Tiling info is stored as a dictionary
    # Keys are:
    # "tile_size": int
    # "overlap": int
    # "temporal_size": int
    # "temporal_overlap": int

@io.comfytype(io_type="SAMPLER_INFO")
class SamplerInfo(io.ComfyTypeIO):
    """
    Sampler information type for SageUtils metadata nodes.
    Contains metadata about the sampler settings without loading the actual sampler.
    """
    Type = dict  # Sampler info is stored as a dictionary
    # Keys are:
    # "sampler": str
    # "scheduler": str
    # "steps": int
    # "cfg": float
    # "seed": int

@io.comfytype(io_type="ADV_SAMPLER_INFO")
class AdvSamplerInfo(io.ComfyTypeIO):
    """
    Advanced sampler information type for SageUtils metadata nodes.
    Contains metadata about the advanced sampler settings without loading the actual sampler.
    """
    Type = dict  # Advanced sampler info is stored as a dictionary

@io.comfytype(io_type="OLLAMA_OPTIONS")
class OllamaOptions(io.ComfyTypeIO):
    """
    Ollama options type for SageUtils LLM nodes.
    Contains options for configuring Ollama LLM calls.
    """
    Type = dict  # Ollama options are stored as a dictionary
    # Keys are:
    # "model": str
    # "temperature": float
    # "max_tokens": int
    # "top_p": float
    # "frequency_penalty": float
    # "presence_penalty": float
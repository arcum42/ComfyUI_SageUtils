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

class LoraStackInfo(io.ComfyTypeIO):
    """
    Lora stack information type for SageUtils LoraStack nodes.
    Contains metadata about a lora stack without loading the actual lora models.
    """
    Type = tuple  # Lora stack info is stored as a tuple.
    # It contains the lora path, model weight, and clip weight for each lora in the stack.
    # This uses this structure for compatibility with existing LoraStack nodes.


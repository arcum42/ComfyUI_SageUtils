# Image nodes.
# This includes nodes involving loading, saving, and manipulating images and latents.
# See ref_docs/v3_migration.md for info on migrating to v3 nodes.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO
from comfy_api.latest import io, ComfyExtension
from typing_extensions import override

from comfy_api.latest._io import NodeOutput, Schema
from comfy_execution.graph_utils import GraphBuilder
from comfy_execution.graph import ExecutionBlocker

import comfy
import nodes
from comfy_extras.nodes_images import ImageCrop

# Import specific utilities instead of wildcard import  
from ..utils import load_image_from_path

import torch
import torch.nn.functional as F
import numpy as np
from PIL import Image
from PIL.PngImagePlugin import PngInfo
import pathlib
import hashlib
import json
import folder_paths
import os
import comfy.model_management
import comfy.utils
import comfy.cli_args
from ..utils.common import get_files_in_dir
import datetime
import logging

# Nodes to implement:
# Sage_EmptyLatentImagePassthrough
# inputs: width, height, batch_size, type ( 4 channel, 16 channel (sd3), radiance)
# outputs: latent, width, height

class Sage_EmptyLatentImagePassthrough(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_EmptyLatentImagePassthrough",
            display_name="Empty Latent Image Passthrough",
            description="Passes through an empty latent image.",
            category="Sage Utils/image",
            inputs=[
                io.Int.Input("width", default=1024),
                io.Int.Input("height", default=1024),
                io.Int.Input("batch_size", default=1),
                io.Combo.Input("type", default="4_channel", options=["4_channel", "16_channel", "radiance"], tooltip="The type of latent to create. 4_channel is for standard latent diffusion models, 16_channel is for SD3 models, and radiance is for Chroma Radiance models."),
            ],
            outputs=[
                io.Latent.Output("latent"),
                io.Int.Output("width"),
                io.Int.Output("height"),
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        width = kwargs.get("width", 1024)
        height = kwargs.get("height", 1024)
        batch_size = kwargs.get("batch_size", 1)
        type = kwargs.get("type", "4_channel")
        device = comfy.model_management.intermediate_device()
        latent = None

        if type == "4_channel":
            latent = torch.zeros([batch_size, 4, height // 8, width // 8], device=device)
        if type == "16_channel":
            latent = torch.zeros([batch_size, 16, height // 8, width // 8], device=device)
        elif type == "radiance":
            latent = torch.zeros([batch_size, 3, height, width], device=device)

        return io.NodeOutput({"samples":latent}, width, height)

# Sage_LoadImage
# inputs: image
# outputs: image, mask, width, height, metadata

# Sage_SaveImageWithMetadata
# inputs: images, filename_prefix, include_node_metadata, include_extra_pnginfo_metadata, save_text
# outputs: None

# Sage_CropImage
# inputs: image, left, top, right, bottom
# outputs: image

# Sage_GuessResolutionByRatio
# inputs: image, target_ratio (1:1, 3:4, 4:3, 9:16, 16:9, 2:3, 3:2)
# outputs: width, height

# Sage_QuickResPicker
# inputs: aspect)_ratio, orientation, multiplier
# outputs: width, height

# Sage_CubiqImageResize
# inputs: image, width, height, interpolation (nearest, bilinear, bicubic, lanczos, cubic), method, condition, multiple_of
# outputs: image, width, height

# Sage_ReferenceImage
# inputs: conditioning, image, vae
# outputs: conditioning, latent

IMAGE_NODES = []

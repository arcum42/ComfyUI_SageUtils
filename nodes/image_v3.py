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
from ..utils.constants import QUICK_ASPECT_RATIOS

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

# Sketch out node skeletons and implement later.
# All of these have to be looked at and re-implemented to some degree.

class Sage_LoadImage(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_LoadImage",
            display_name="Load Image",
            description="Loads an image from a specified file path.",
            category="Sage Utils/image",
            inputs=[
                io.String.Input("file_path", default="", tooltip="The file path of the image to load."),
            ],
            outputs=[
                io.Image.Output("image"),
                io.Int.Output("width"),
                io.Int.Output("height"),
                io.String.Output("metadata"),
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        file_path = kwargs.get("file_path", "")
        image, metadata = load_image_from_path(file_path)
        width, height = image.size
        return io.NodeOutput(image, width, height, metadata)

class Sage_SaveImageWithMetadata(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_SaveImageWithMetadata",
            display_name="Save Image With Metadata",
            description="Saves images to disk with embedded metadata.",
            category="Sage Utils/image",
            inputs=[
                io.List.Input("images", subtype=io.Image, tooltip="The images to save."),
                io.String.Input("filename_prefix", default="image_", tooltip="The prefix for the saved image filenames."),
                io.Bool.Input("include_node_metadata", default=True, tooltip="Whether to include node metadata in the saved image."),
                io.Bool.Input("include_extra_pnginfo_metadata", default=False, tooltip="Whether to include extra PNG info metadata."),
                io.Bool.Input("save_text", default=False, tooltip="Whether to save accompanying text files with metadata."),
            ],
            outputs=[]
        )

    @classmethod
    def execute(cls, **kwargs):
        images = kwargs.get("images", [])
        filename_prefix = kwargs.get("filename_prefix", "image_")
        include_node_metadata = kwargs.get("include_node_metadata", True)
        include_extra_pnginfo_metadata = kwargs.get("include_extra_pnginfo_metadata", False)
        save_text = kwargs.get("save_text", False)
        
        # Implement the rest of the saving logic here.
        return io.NodeOutput()

class Sage_CropImage(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_CropImage",
            display_name="Crop Image",
            description="Crops an image based on specified coordinates.",
            category="Sage Utils/image",
            inputs=[
                io.Image.Input("image", tooltip="The image to crop."),
                io.Int.Input("left", default=0, tooltip="The left coordinate for cropping."),
                io.Int.Input("top", default=0, tooltip="The top coordinate for cropping."),
                io.Int.Input("right", default=0, tooltip="The right coordinate for cropping."),
                io.Int.Input("bottom", default=0, tooltip="The bottom coordinate for cropping."),
            ],
            outputs=[
                io.Image.Output("image", tooltip="The cropped image."),
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        image = kwargs.get("image")
        left = kwargs.get("left", 0)
        top = kwargs.get("top", 0)
        right = kwargs.get("right", 0)
        bottom = kwargs.get("bottom", 0)

        if image is None:
            return io.NodeOutput(None)

        cropped_image = image.crop((left, top, right, bottom))
        return io.NodeOutput(cropped_image)

class Sage_GuessResolutionByRatio(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_GuessResolutionByRatio",
            display_name="Guess Resolution By Ratio",
            description="Guesses image resolution based on target aspect ratio.",
            category="Sage Utils/image",
            inputs=[
                io.Image.Input("image", tooltip="The image to analyze."),
                io.Combo.Input("target_ratio", default="1:1", options=["1:1", "3:4", "4:3", "9:16", "16:9", "2:3", "3:2"], tooltip="The target aspect ratio."),
            ],
            outputs=[
                io.Int.Output("width", tooltip="The guessed width."),
                io.Int.Output("height", tooltip="The guessed height."),
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        image = kwargs.get("image")
        target_ratio = kwargs.get("target_ratio", "1:1")

        if image is None:
            return io.NodeOutput(0, 0)

        width, height = image.size
        
        # Since target aspect ratio is x:y, we can pull x and y directly from the string.
        x_str, y_str = target_ratio.split(":")
        target_aspect = float(x_str) / float(y_str)
        current_aspect = width / height

        if current_aspect > target_aspect:
            new_width = int(height * target_aspect)
            new_height = height
        else:
            new_width = width
            new_height = int(width / target_aspect)

        return io.NodeOutput(new_width, new_height)

class Sage_QuickResPicker(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_QuickResPicker",
            display_name="Quick Resolution Picker",
            description="Quickly pick image resolution based on aspect ratio and orientation.",
            category="Sage Utils/image",
            inputs=[
                io.Combo.Input("aspect_ratio", default="1:1", options=["1:1", "3:4", "4:3", "9:16", "16:9", "2:3", "3:2"], tooltip="The aspect ratio."),
                io.Combo.Input("orientation", default="landscape", options=["landscape", "portrait", "square"], tooltip="The orientation of the image."),
                io.Int.Input("multiplier", default=1, tooltip="The multiplier for the base resolution."),
            ],
            outputs=[
                io.Int.Output("width", tooltip="The selected width."),
                io.Int.Output("height", tooltip="The selected height."),
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        aspect_ratio = kwargs.get("aspect_ratio", "1:1")
        orientation = kwargs.get("orientation", "landscape")
        multiplier = kwargs.get("multiplier", 1)

        width, height = QUICK_ASPECT_RATIOS.get(aspect_ratio, (512, 512))

        if orientation == "portrait" and width > height:
            width, height = height, width
        elif orientation == "landscape" and height > width:
            width, height = height, width

        width *= multiplier
        height *= multiplier

        return io.NodeOutput(width, height)

class Sage_CubiqImageResize(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_CubiqImageResize",
            display_name="Cubiq Image Resize",
            description="Resizes an image using Cubiq interpolation.",
            category="Sage Utils/image",
            inputs=[
                io.Image.Input("image", tooltip="The image to resize."),
                io.Int.Input("width", default=512, tooltip="The target width."),
                io.Int.Input("height", default=512, tooltip="The target height."),
                io.Combo.Input("interpolation", default="bicubic", options=["nearest", "bilinear", "bicubic", "lanczos", "cubic"], tooltip="The interpolation method."),
                io.Combo.Input("method", default="direct", options=["direct", "conditioned"], tooltip="The resizing method."),
                io.String.Input("condition", default="", tooltip="The condition for conditioned resizing."),
                io.Int.Input("multiple_of", default=8, tooltip="Ensure dimensions are multiples of this value."),
            ],
            outputs=[
                io.Image.Output("image", tooltip="The resized image."),
                io.Int.Output("width", tooltip="The new width."),
                io.Int.Output("height", tooltip="The new height."),
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        image = kwargs.get("image")
        width = kwargs.get("width", 512)
        height = kwargs.get("height", 512)
        interpolation = kwargs.get("interpolation", "bicubic")
        method = kwargs.get("method", "direct")
        condition = kwargs.get("condition", "")
        multiple_of = kwargs.get("multiple_of", 8)

        if image is None:
            return io.NodeOutput(None, 0, 0)

        # Implement resizing logic here.
        resized_image = image.resize((width, height), resample=Image.BICUBIC)

        return io.NodeOutput(resized_image, width, height)

class Sage_ReferenceImage(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_ReferenceImage",
            display_name="Reference Image",
            description="Processes a reference image to produce conditioning and latent.",
            category="Sage Utils/image",
            inputs=[
                io.Conditioning.Input("conditioning", tooltip="The input conditioning."),
                io.Image.Input("image", tooltip="The reference image."),
                io.VAE.Input("vae", tooltip="The VAE model for encoding the image."),
            ],
            outputs=[
                io.Conditioning.Output("conditioning", tooltip="The output conditioning."),
                io.Latent.Output("latent", tooltip="The encoded latent."),
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        conditioning = kwargs.get("conditioning")
        image = kwargs.get("image")
        vae = kwargs.get("vae")

        if image is None or vae is None:
            return io.NodeOutput(conditioning, None)

        # Implement encoding logic here.
        latent = vae.encode(image)

        return io.NodeOutput(conditioning, latent)

IMAGE_NODES = [
    Sage_EmptyLatentImagePassthrough,
    Sage_LoadImage,
    Sage_SaveImageWithMetadata,
    Sage_CropImage,
    Sage_GuessResolutionByRatio,
    Sage_QuickResPicker,
    Sage_CubiqImageResize,
    Sage_ReferenceImage
]

""" IMAGE_CLASS_MAPPINGS = {
    "Sage_LoadImage": Sage_LoadImage,
    "Sage_EmptyLatentImagePassthrough": Sage_EmptyLatentImagePassthrough,
    "Sage_SaveImageWithMetadata": Sage_SaveImageWithMetadata,
    "Sage_QuickResPicker": Sage_QuickResPicker,
    "Sage_GuessResolutionByRatio": Sage_GuessResolutionByRatio,
    "Sage_CubiqImageResize": Sage_CubiqImageResize,
    "Sage_CropImage": Sage_CropImage,
    "Sage_ReferenceImage": Sage_ReferenceImage
} """
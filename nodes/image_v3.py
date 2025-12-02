# Image nodes.
# This includes nodes involving loading, saving, and manipulating images and latents.
# See ref_docs/v3_migration.md for info on migrating to v3 nodes.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO
from comfy_api.latest import io, ComfyExtension, ui
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

# Current status - Empty latent only.
# Sage_EmptyLatentImagePassthrough - Works.
# Sage_SaveImageWithMetadata - Works.
# Sage_LoadImage - Works.
# Sage_CropImage - Works.

# Test results here:
# Sage_GuessResolutionByRatio - Different logic, needs work.
# Sage_QuickResPicker - Different logic, needs work.
# Sage_CubiqImageResize - Not implemented yet.
# Sage_ReferenceImage - Not implemented yet.

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
                io.Int.Output("out_width", display_name="width"),
                io.Int.Output("out_height", display_name="height"),
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

class Sage_SaveImageWithMetadata(io.ComfyNode):
    @classmethod
    def __init__(cls):
        cls.output_dir = folder_paths.get_output_directory()
        cls.type = "output"
        cls.prefix_append = ""
        cls.compress_level = 4

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_SaveImageWithMetadata",
            display_name="Save Image With Metadata",
            description="Saves images to disk with embedded metadata.",
            category="Sage Utils/image",
            is_output_node=True,
            inputs=[
                io.Image.Input("images", tooltip="The images to save."),
                io.String.Input("filename_prefix", default="image_", tooltip="The prefix for the saved image filenames."),
                io.Boolean.Input("include_node_metadata", default=True, tooltip="Whether to include node metadata in the saved image."),
                io.Boolean.Input("include_extra_pnginfo_metadata", default=False, tooltip="Whether to include extra PNG info metadata."),
                io.Boolean.Input("save_text", default=False, tooltip="Whether to save accompanying text files with metadata."),
                io.String.Input("param_metadata", default="", tooltip="The metadata to embed in the image."),
                io.String.Input("extra_metadata", default="", tooltip="Any extra metadata to include."),
            ],
            outputs=[],
            hidden=[io.Hidden.prompt, io.Hidden.extra_pnginfo]
        )

    @classmethod
    def set_metadata(
        cls,
        include_node_metadata,
        include_extra_pnginfo_metadata,
        param_metadata=None,
        extra_metadata=None,
        prompt=None,
        extra_pnginfo=None,
    ):
        result = None
        if not comfy.cli_args.args.disable_metadata:
            result = PngInfo()
            if param_metadata is not None:
                result.add_text("parameters", param_metadata)
            if include_node_metadata == True:
                if prompt is not None:
                    result.add_text("prompt", json.dumps(prompt))
            if include_extra_pnginfo_metadata == True:
                if extra_pnginfo is not None:
                    for x in extra_pnginfo:
                        result.add_text(x, json.dumps(extra_pnginfo[x]))
            if extra_metadata is not None:
                result.add_text("Extra", extra_metadata)
        return result

    @classmethod
    def execute(cls, **kwargs):
        images = kwargs.get("images", [])
        filename_prefix = kwargs.get("filename_prefix", "image_")
        include_node_metadata = kwargs.get("include_node_metadata", True)
        include_extra_pnginfo_metadata = kwargs.get("include_extra_pnginfo_metadata", False)
        save_text = kwargs.get("save_text", False)
        param_metadata = kwargs.get("param_metadata", "")
        extra_metadata = kwargs.get("extra_metadata", "")
        prompt = kwargs.get("prompt", "")
        extra_pnginfo = kwargs.get("extra_pnginfo", {})

        save_to_text = True
        if save_text == "Image Only":
            save_to_text = False
        if '\n' in filename_prefix:
            filename_prefix_lines = filename_prefix.splitlines()
            filename_prefix = ''.join(filename_prefix_lines)
        filename_prefix += cls.prefix_append
        full_output_folder, filename, counter, subfolder, filename_prefix = (
            folder_paths.get_save_image_path(
                filename_prefix, cls.output_dir, images[0].shape[1], images[0].shape[0]
            )
        )
        results = list()
        for batch_number, image in enumerate(images):
            i = 255.0 * image.cpu().numpy()
            img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))
            final_metadata = cls.set_metadata(
                include_node_metadata,
                include_extra_pnginfo_metadata,
                param_metadata,
                extra_metadata,
                prompt,
                extra_pnginfo,
            )

            filename_with_batch_num = filename.replace("%batch_num%", str(batch_number))
            file = f"{filename_with_batch_num}_{counter:05}_.png"
            text_file = f"{filename_with_batch_num}_{counter:05}_.txt"

            img.save(
                os.path.join(full_output_folder, file),
                pnginfo=final_metadata,
                compress_level=cls.compress_level,
            )
            if save_to_text:
                with open(os.path.join(full_output_folder, text_file), 'w', encoding='utf-8') as f:
                    if save_text == "Param to Text":
                        f.write(f"{param_metadata}")
                    elif save_text == "Extra to Text":
                        f.write(f"{extra_metadata}")
                    elif save_text == "All to Text":
                        f.write(f"{param_metadata}\n{extra_metadata}")
            results.append(
                {"filename": file, "subfolder": subfolder, "type": cls.type}
            )
            counter += 1

        return io.NodeOutput(results, ui=ui.PreviewImage(images, cls=cls))

class Sage_LoadImage(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        input_files = []
        # INPUT_TYPES is called multiple times during workflow loading, 
        # so cache the results for 20 seconds to avoid rescanning the input directory repeatedly.
        if hasattr(cls, 'input_cache') and hasattr(cls, 'input_cache_creation_time') and cls.input_cache is not None:
            if (datetime.datetime.now() - cls.input_cache_creation_time).total_seconds() < 20:
                input_files = cls.input_cache

        if not input_files:
            input_files = get_files_in_dir(
                input_dirs=folder_paths.get_input_directory(),
                extensions=[".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif", ".webp"]
            )
            cls.input_cache = input_files  # Cache the list to avoid re-scanning on every call
            cls.input_cache_creation_time = datetime.datetime.now()

        schema = io.Schema(
            node_id="Sage_LoadImage",
            display_name="Load Image",
            description="Loads an image from a specified file path.",
            category="Sage Utils/image",
            is_output_node=True,
            inputs=[],
            outputs=[
                io.Image.Output("image", display_name="image"),
                io.Image.Output("mask", display_name="mask"),
                io.Int.Output("out_width", display_name="width"),
                io.Int.Output("out_height", display_name="height"),
                io.String.Output("metadata", display_name="metadata"),
            ]
        )
        schema.inputs.append(
            io.Combo.Input(
                "image_name",
                default=input_files[0] if input_files else "",
                options=input_files,
                image_folder=io.FolderType.input,
                upload=io.UploadType.image,
                tooltip="The file path of the image to load."
            )
        )
        return schema

    @classmethod
    def execute(cls, **kwargs):
        image_name = kwargs.get("image_name", "")
        image_path = folder_paths.get_annotated_filepath(image_name)
        output_image, output_mask, w, h, info = load_image_from_path(image_path)

        return io.NodeOutput(output_image, output_mask, w, h, info, ui=ui.PreviewImage(output_image, cls=cls))

    @classmethod
    def validate_inputs(cls, **kwargs):
        image_name = kwargs.get("image_name", "")
        # Return True if valid, error string if not
        if not folder_paths.exists_annotated_filepath(image_name):
            logging.info("Invalid image file: {}".format(image_name))
            return False

        return True

    @classmethod
    def fingerprint_inputs(cls, **kwargs):
        image_name = kwargs.get("image_name", "")
        image_path = folder_paths.get_annotated_filepath(image_name)
        m = hashlib.sha256()
        with open(image_path, "rb") as f:
            m.update(f.read())
        return m.digest().hex()

class Sage_CropImage(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_CropImage",
            display_name="Crop Image",
            description="Crops an image based on specified coordinates.",
            category="Sage Utils/image",
            inputs=[
                io.Image.Input("image", display_name="image", tooltip="The image to crop."),
                io.Int.Input("left", display_name="left", default=0, tooltip="The left coordinate for cropping."),
                io.Int.Input("top", display_name="top", default=0, tooltip="The top coordinate for cropping."),
                io.Int.Input("right", display_name="right", default=0, tooltip="The right coordinate for cropping."),
                io.Int.Input("bottom", display_name="bottom", default=0, tooltip="The bottom coordinate for cropping."),
            ],
            outputs=[
                io.Image.Output("out_image", tooltip="The cropped image.", display_name="image"),
            ]
        )

    @classmethod
    def crop(cls, image, left, top, right, bottom):
        # Ensure non-negative crop margins
        left = max(int(left), 0)
        top = max(int(top), 0)
        right = max(int(right), 0)
        bottom = max(int(bottom), 0)

        # Image tensor shape: [batch, H, W, C]
        H = image.shape[1]
        W = image.shape[2]

        # Clamp margins so we don't exceed bounds
        if left + right >= W:
            # Collapse to 1px width at the rightmost valid column
            left = min(W - 1, left)
            right = W - 1 - left
        if top + bottom >= H:
            # Collapse to 1px height at the bottommost valid row
            top = min(H - 1, top)
            bottom = H - 1 - top

        x = left
        y = top
        to_x = W - right
        to_y = H - bottom

        # Final safety clamps
        x = max(0, min(x, W - 1))
        y = max(0, min(y, H - 1))
        to_x = max(x + 1, min(to_x, W))
        to_y = max(y + 1, min(to_y, H))

        return image[:, y:to_y, x:to_x, :]

    @classmethod
    def execute(cls, **kwargs):
        image = kwargs.get("image", None)
        left = kwargs.get("left", 0)
        top = kwargs.get("top", 0)
        right = kwargs.get("right", 0)
        bottom = kwargs.get("bottom", 0)

        if image is None:
            return io.NodeOutput(None)
        
        cropped_image = cls.crop(image, left, top, right, bottom)
        return io.NodeOutput(cropped_image)

# Sketch out node skeletons and implement later.
# All of these have to be looked at and re-implemented to some degree.


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
                io.Image.Output("out_image", tooltip="The resized image.", display_name="image"),
                io.Int.Output("out_width", tooltip="The new width.", display_name="width"),
                io.Int.Output("out_height", tooltip="The new height.", display_name="height"),
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
                io.Vae.Input("vae", tooltip="The VAE model for encoding the image."),
            ],
            outputs=[
                io.Conditioning.Output("out_conditioning", tooltip="The output conditioning.", display_name="conditioning"),
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
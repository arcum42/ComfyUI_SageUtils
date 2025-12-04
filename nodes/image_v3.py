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
from ..utils.constants import QUICK_ASPECT_RATIOS, MAX_RESOLUTION
from ..utils.helpers_image import calc_padding, resize_needed, image_manipulate

# Current status - Empty latent only.
# Sage_EmptyLatentImagePassthrough - Works.
# Sage_SaveImageWithMetadata - Works.
# Sage_LoadImage - Works.
# Sage_CropImage - Works.
# Sage_GuessResolutionByRatio - Seems to work.
# Sage_QuickResPicker - Seems to work.

# Test results here:
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
            left, right = min(W - 1, left), W - 1 - min(W - 1, left)
        if top + bottom >= H:
            # Collapse to 1px height at the bottommost valid row
            top, bottom = min(H - 1, top), H - 1 - min(H - 1, top)

        x, y, to_x, to_y = left, top, W - right, H - bottom

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

class Sage_GuessResolutionByRatio(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_GuessResolutionByRatio",
            display_name="Guess Resolution By Ratio",
            description="Based on the input width and height, guess a resolution that matches one of the common aspect ratios. The output is rounded to the nearest multiple of 64.",
            category="Sage Utils/image",
            inputs=[
                io.Int.Input("width", min = 64, max = 8192, default=1024, step = 1, tooltip="The input width."),
                io.Int.Input("height", min = 64, max = 8192, default=1024, step = 1, tooltip="The input height."),
                ],
            outputs=[
                io.Int.Output("new_width", tooltip="The guessed width."),
                io.Int.Output("new_height", tooltip="The guessed height."),
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        width = kwargs.get("width", 1024)
        height = kwargs.get("height", 1024)

        # Calculate the aspect ratio of the input dimensions, and pick dimensions that are closest to it.
        landscape = width > height
        if landscape:
            width, height = height, width

        input_aspect_ratio = width / height
        closest_ratio = None
        closest_diff = float('inf')
        for ratio, (w, h) in QUICK_ASPECT_RATIOS.items():
            ratio_aspect = w / h
            diff = abs(input_aspect_ratio - ratio_aspect)
            if diff < closest_diff:
                closest_diff = diff
                closest_ratio = (w, h)
        if closest_ratio is None:
            logging.info("No close resolution found, defaulting to 1024x1024.")
            return io.NodeOutput(1024, 1024)
        width, height = closest_ratio

        # Round to the nearest multiple of 64
        width = int(round(width / 64) * 64)
        height = int(round(height / 64) * 64)
        
        if landscape:
            width, height = height, width

        logging.info(f"Guessed resolution: {width}x{height}")

        return io.NodeOutput(width, height)

class Sage_QuickResPicker(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_QuickResPicker",
            display_name="Quick Resolution Picker",
            description="Quickly pick image resolution based on aspect ratio and orientation.",
            category="Sage Utils/image",
            inputs=[
                io.Combo.Input("aspect_ratio", display_name="Aspect Ratio", default="1:1", options=list(QUICK_ASPECT_RATIOS.keys()), tooltip="The aspect ratio."),
                io.Combo.Input("orientation", display_name="Orientation", default="Landscape", options=["Portrait", "Landscape"], tooltip="The orientation of the image."),
                io.Float.Input("multiplier", display_name="Multiplier", default=1.0, min = 0.1, max = 10.0, step = 0.1, round = 0.001, tooltip="The multiplier for the base resolution."),
            ],
            outputs=[
                io.Int.Output("width", display_name="Width", tooltip="The selected width."),
                io.Int.Output("height", display_name="Height", tooltip="The selected height."),
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        aspect_ratio = kwargs.get("aspect_ratio", "1:1")
        orientation = kwargs.get("orientation", "Landscape")
        multiplier = kwargs.get("multiplier", 1.0)

        if aspect_ratio not in QUICK_ASPECT_RATIOS:
            aspect_ratio = "1:1"  # Default to 1:1 if not found
            logging.info(f"Aspect ratio '{aspect_ratio}' not found, defaulting to 1:1.")

        width, height = QUICK_ASPECT_RATIOS[aspect_ratio]
        if orientation == "Landscape":
            width, height = height, width

        width = int(round(width * multiplier / 64) * 64)
        height = int(round(height * multiplier / 64) * 64)

        return io.NodeOutput(width, height)

# Sketch out node skeletons and implement later.
# All of these have to be looked at and re-implemented to some degree.

class Sage_CubiqImageResize(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_CubiqImageResize",
            display_name="Cubiq Image Resize",
            description="Resizes an image using Cubiq interpolation.",
            category="Sage Utils/image",
            inputs=[
                io.Image.Input("image", display_name="Image", tooltip="The image to resize."),
                io.Int.Input("width", display_name="Width", default=1024, min = 0, max = MAX_RESOLUTION, step = 1, tooltip="The target width."),
                io.Int.Input("height", display_name="Height", default=1024, min = 0, max = MAX_RESOLUTION, step = 1, tooltip="The target height."),
                io.Combo.Input("interpolation", display_name="Interpolation", default="bicubic", options=["nearest", "bilinear", "bicubic", "area", "nearest-exact", "lanczos", "bislerp"], tooltip="The interpolation method."),
                io.Combo.Input("method", display_name="Method", default="keep proportion", options=["stretch", "keep proportion", "fill / crop", "pad"], tooltip="The resizing method."),
                io.Combo.Input("condition", display_name="Condition", default="always", options = ["always", "downscale if bigger", "upscale if smaller", "if bigger area", "if smaller area"], tooltip="The condition for conditioned resizing."),
                io.Int.Input("multiple_of", display_name="Multiple Of", default=0, min = 0, max = 1024,  step = 1, tooltip="Ensure dimensions are multiples of this value."),
            ],
            outputs=[
                io.Image.Output("out_image", tooltip="The resized image.", display_name="Image"),
                io.Int.Output("out_width", tooltip="The new width.", display_name="Width"),
                io.Int.Output("out_height", tooltip="The new height.", display_name="Height"),
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        image = kwargs.get("image", None)
        width = kwargs.get("width", 1024)
        height = kwargs.get("height", 1024)
        interpolation = kwargs.get("interpolation", "bicubic")
        method = kwargs.get("method", "keep proportion")
        condition = kwargs.get("condition", "always")
        multiple_of = kwargs.get("multiple_of", 1)

        if image is None:
            return io.NodeOutput(None, 0, 0)

        _, oh, ow, _ = image.shape
        x = y = x2 = y2 = 0
        pad_left = pad_right = pad_top = pad_bottom = 0
        padding = False

        if multiple_of > 1:
            width, height = width - (width % multiple_of), height - (height % multiple_of)

        if method == 'keep proportion' or method == 'pad':
            if width == 0:
                if oh < height:
                    width = MAX_RESOLUTION
                else:
                    width = ow

            if height == 0:
                if ow < width:
                    height = MAX_RESOLUTION
                else:
                    height = oh

            ratio = min(width / ow, height / oh)
            new_width = round(ow*ratio)
            new_height = round(oh*ratio)

            if method == 'pad':
                pad_left, pad_right, pad_top, pad_bottom = calc_padding(width, height, new_width, new_height)
                if pad_left > 0 or pad_right > 0 or pad_top > 0 or pad_bottom > 0:
                    padding = True

            width, height = new_width, new_height
        elif method.startswith('fill'):
            width = width if width > 0 else ow
            height = height if height > 0 else oh

            ratio = max(width / ow, height / oh)
            new_width, new_height = round(ow*ratio), round(oh*ratio)

            x, y = (new_width - width) // 2, (new_height - height) // 2
            x2, y2 = x + width, y + height

            if x2 > new_width: x -= (x2 - new_width)
            if x < 0: x = 0
            if y2 > new_height: y -= (y2 - new_height)
            if y < 0: y = 0

            width, height = new_width, new_height
        else:
            width = width if width > 0 else ow
            height = height if height > 0 else oh

        fill = method.startswith('fill')
        resize = resize_needed(condition, width, height, ow, oh)

        outputs = image_manipulate(image, width, height, interpolation, multiple_of,
                 padding, fill, resize,
                 pad_left, pad_right, pad_top, pad_bottom,
                 x, y, x2, y2)

        return io.NodeOutput(outputs, width, height)

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
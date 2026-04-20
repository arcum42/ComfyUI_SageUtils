# Image nodes.
# This includes nodes involving loading, saving, and manipulating images and latents.
# See ref_docs/v3_migration.md for info on migrating to v3 nodes.

from __future__ import annotations
from ..utils.logger import get_logger
from ..utils.file_utils import get_files_in_dir
from ..utils.helpers_image import load_image_from_path

import torch

import numpy as np

from PIL import Image
from PIL.PngImagePlugin import PngInfo

import hashlib
import json
import folder_paths
import os
import datetime
import nodes

import comfy
import comfy.model_management
import comfy.cli_args

from comfy_api.latest import io, ui
from comfy_execution.graph_utils import GraphBuilder

from ..utils.constants import QUICK_ASPECT_RATIOS, MAX_RESOLUTION
from ..utils.helpers_image import calc_padding, resize_needed, image_manipulate

from .custom_io_v3 import AdvAudioInfo

logger = get_logger('nodes.image')

class Sage_EmptyLatentImagePassthrough(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_EmptyLatentImagePassthrough",
            display_name="Empty Latent Image Passthrough",
            description="Passes through an empty latent image.",
            category="Sage Utils/image",
            inputs=[
                io.Int.Input("width", display_name="width", default=1024),
                io.Int.Input("height", display_name="height", default=1024),
                io.Int.Input("batch_size", display_name="batch_size", default=1),
                io.Combo.Input("type", display_name="type", default="4_channel", options=["4_channel", "16_channel", "radiance"], tooltip="The type of latent to create. 4_channel is for standard latent diffusion models, 16_channel is for SD3 models, and radiance is for Chroma Radiance models."),
            ],
            outputs=[
                io.Latent.Output("latent", display_name="latent"),
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
        elif type == "16_channel":
            latent = torch.zeros([batch_size, 16, height // 8, width // 8], device=device)
        elif type == "radiance":
            latent = torch.zeros([batch_size, 3, height, width], device=device)
        else:
            logger.info(f"Unknown latent type '{type}', defaulting to 4_channel.")
            latent = torch.zeros([batch_size, 4, height // 8, width // 8], device=device)

        return io.NodeOutput({"samples":latent}, width, height)

class Sage_EmptyAceStep15LatentAudio(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_EmptyAceStep15LatentAudio",
            display_name="Empty Ace Step 1.5 Audio Passthrough",
            description="Creates an empty latent audio tensor for Ace Step 1.5 models.",
            category="Sage Utils/audio",
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
                io.Image.Input("images", display_name="images", tooltip="The images to save."),
                io.String.Input("filename_prefix", display_name="filename_prefix", default="image_", tooltip="The prefix for the saved image filenames."),
                io.Boolean.Input("include_node_metadata", display_name="include_node_metadata", default=True, tooltip="Whether to include node metadata in the saved image."),
                io.Boolean.Input("include_extra_pnginfo_metadata", display_name="include_extra_pnginfo_metadata", default=False, tooltip="Whether to include extra PNG info metadata."),
                io.Boolean.Input("save_text", display_name="save_text", default=False, tooltip="Whether to save accompanying text files with metadata."),
                io.String.Input("param_metadata", display_name="param_metadata", default="", tooltip="The metadata to embed in the image."),
                io.String.Input("extra_metadata", display_name="extra_metadata", default="", tooltip="Any extra metadata to include."),
            ],
            outputs=[],
            hidden=[io.Hidden.prompt, io.Hidden.extra_pnginfo]
        )

    @classmethod
    def set_metadata(cls,metadata):
        result = None
        if not comfy.cli_args.args.disable_metadata:
            result = PngInfo()
            if metadata.get("param_metadata", None) is not None:
                result.add_text("parameters", metadata.get("param_metadata"))
            if metadata.get("include_node_metadata", False) == True:
                if metadata.get("prompt", None) is not None:
                    result.add_text("prompt", json.dumps(metadata.get("prompt")))
            if metadata.get("include_extra_pnginfo_metadata", False) == True:
                if metadata.get("extra_pnginfo", None) is not None:
                    for x in metadata.get("extra_pnginfo"):
                        result.add_text(x, json.dumps(metadata.get("extra_pnginfo")[x]))
            if metadata.get("extra_metadata", None) is not None:
                result.add_text("Extra", metadata.get("extra_metadata"))
        return result

    @classmethod
    def metadata_as_text(cls,metadata):
        result = ""
        if metadata.get("param_metadata", None) is not None:
            result += f"Parameters:\n{metadata.get('param_metadata')}\n\n"
        if metadata.get("extra_metadata", None) is not None:
            result += f"Extra Metadata:\n{metadata.get('extra_metadata')}\n\n"
        if metadata.get("include_node_metadata", False) == True:
            if metadata.get("prompt", None) is not None:
                result += f"Prompt:\n{json.dumps(metadata.get('prompt'))}\n\n"
        if metadata.get("include_extra_pnginfo_metadata", False) == True:
            if metadata.get("extra_pnginfo", None) is not None:
                result += "Extra PNG Info:\n"
                for x in metadata.get("extra_pnginfo"):
                    result += f"{x}: {json.dumps(metadata.get('extra_pnginfo')[x])}\n"
        return result

    @classmethod
    def execute(cls, **kwargs):
        images = kwargs.get("images", [])
        filename_prefix = kwargs.get("filename_prefix", "image_")
        save_text = kwargs.get("save_text", False)

        metadata = {
            "include_node_metadata": kwargs.get("include_node_metadata", True),
            "include_extra_pnginfo_metadata": kwargs.get("include_extra_pnginfo_metadata", False),
            "param_metadata": kwargs.get("param_metadata", ""),
            "extra_metadata": kwargs.get("extra_metadata", ""),
            "prompt": cls.hidden.prompt,
            "extra_pnginfo": cls.hidden.extra_pnginfo
        }

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
            final_metadata = cls.set_metadata(metadata)
            metatext = cls.metadata_as_text(metadata)

            filename_with_batch_num = filename.replace("%batch_num%", str(batch_number))
            filename = f"{filename_with_batch_num}_{counter:05}_.png"
            img_path = os.path.join(full_output_folder, filename)
            txt_path = os.path.join(full_output_folder, f"{filename_with_batch_num}_{counter:05}_.txt")

            img.save(img_path, pnginfo=final_metadata, compress_level=cls.compress_level)
            if save_text:
                with open(txt_path, 'w', encoding='utf-8') as f:
                    f.write(f"{metatext}")
            results.append(
                {"filename": filename, "subfolder": subfolder, "type": cls.type}
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
            logger.info("Invalid image file: {}".format(image_name))
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
                io.Int.Output("new_width", display_name="width", tooltip="The guessed width."),
                io.Int.Output("new_height", display_name="height", tooltip="The guessed height."),
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
            logger.info("No close resolution found, defaulting to 1024x1024.")
            return io.NodeOutput(1024, 1024)
        width, height = closest_ratio

        # Round to the nearest multiple of 64
        width = int(round(width / 64) * 64)
        height = int(round(height / 64) * 64)
        
        if landscape:
            width, height = height, width

        logger.info(f"Guessed resolution: {width}x{height}")

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
                io.Int.Output("width", display_name="width", tooltip="The selected width."),
                io.Int.Output("height", display_name="height", tooltip="The selected height."),
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        aspect_ratio = kwargs.get("aspect_ratio", "1:1")
        orientation = kwargs.get("orientation", "Landscape")
        multiplier = kwargs.get("multiplier", 1.0)

        if aspect_ratio not in QUICK_ASPECT_RATIOS:
            aspect_ratio = "1:1"  # Default to 1:1 if not found
            logger.info(f"Aspect ratio '{aspect_ratio}' not found, defaulting to 1:1.")

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
                io.Image.Input("image", display_name="image", tooltip="The image to resize."),
                io.Int.Input("width", display_name="width", default=1024, min = 0, max = MAX_RESOLUTION, step = 1, tooltip="The target width."),
                io.Int.Input("height", display_name="height", default=1024, min = 0, max = MAX_RESOLUTION, step = 1, tooltip="The target height."),
                io.Combo.Input("interpolation", display_name="interpolation", default="bicubic", options=["nearest", "bilinear", "bicubic", "area", "nearest-exact", "lanczos", "bislerp"], tooltip="The interpolation method."),
                io.Combo.Input("method", display_name="method", default="keep proportion", options=["stretch", "keep proportion", "fill / crop", "pad"], tooltip="The resizing method."),
                io.Combo.Input("condition", display_name="condition", default="always", options = ["always", "downscale if bigger", "upscale if smaller", "if bigger area", "if smaller area"], tooltip="The condition for conditioned resizing."),
                io.Int.Input("multiple_of", display_name="multiple_of", default=0, min = 0, max = 1024,  step = 1, tooltip="Ensure dimensions are multiples of this value."),
            ],
            outputs=[
                io.Image.Output("out_image", tooltip="The resized image.", display_name="image"),
                io.Int.Output("out_width", tooltip="The new width.", display_name="width"),
                io.Int.Output("out_height", tooltip="The new height.", display_name="height"),
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
            description="This node sets the guiding latent for an edit model. If the model supports it you can chain multiple to set multiple reference images.",
            category="Sage Utils/image",
            enable_expand=True,
            inputs=[
                io.Conditioning.Input("conditioning", display_name="conditioning", tooltip="The input conditioning."),
                io.Image.Input("image", display_name="image", tooltip="The reference image."),
                io.Vae.Input("vae", display_name="vae", tooltip="The VAE model for encoding the image."),
            ],
            outputs=[
                io.Conditioning.Output("out_conditioning", display_name="conditioning", tooltip="The output conditioning."),
                io.Latent.Output("out_latent", display_name="latent", tooltip="The encoded latent."),
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        conditioning = kwargs.get("conditioning")
        image = kwargs.get("image")
        vae = kwargs.get("vae")

        # Create a subgraph using GraphBuilder to properly handle reference latent processing
        graph = GraphBuilder()
        encoder_node = graph.node("VAEEncode", pixels=image, vae=vae)
        ref_latent_node = graph.node("ReferenceLatent", conditioning=conditioning, latent=encoder_node.out(0))

        return io.NodeOutput(ref_latent_node.out(0), encoder_node.out(0), expand=graph.finalize())

class Sage_AceAdvOptions(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_AceAdvOptions",
            display_name="Ace Advanced Options",
            description="Advanced options for Ace Step 1.5 audio encoding. These options can be used to fine-tune the behavior of the audio encoding process.",
            category="Sage Utils/clip-cond/ace",
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
            category="Sage Utils/clip-cond/ace",
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

IMAGE_NODES = [
    # image nodes
    Sage_EmptyLatentImagePassthrough,

    # audio nodes
    Sage_EmptyAceStep15LatentAudio,

    # image nodes
    Sage_LoadImage,
    Sage_SaveImageWithMetadata,
    Sage_CropImage,
    Sage_GuessResolutionByRatio,
    Sage_QuickResPicker,
    Sage_CubiqImageResize,
    Sage_ReferenceImage,

    # ace conditioning nodes
    Sage_AceAdvOptions,
    Sage_Ace15AudioEncode,
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
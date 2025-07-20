# Image nodes.
# This includes nodes involving loading, saving, and manipulating images and latents.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO

import comfy
import nodes
from comfy_execution.graph_utils import GraphBuilder
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

class Sage_EmptyLatentImagePassthrough(ComfyNodeABC):
    def __init__(self):
        self.device = comfy.model_management.intermediate_device()

    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "width": (IO.INT, {"defaultInput": True, "default": 1024, "min": 16, "max": nodes.MAX_RESOLUTION, "step": 8, "tooltip": "The width of the latent images in pixels.", }),
                "height": (IO.INT, {"defaultInput": True, "default": 1024, "min": 16, "max": nodes.MAX_RESOLUTION, "step": 8, "tooltip": "The height of the latent images in pixels."}),
                "batch_size": (IO.INT, { "default": 1, "min": 1, "max": 4096, "tooltip": "The number of latent images in the batch."}),
                "sd3": (IO.BOOLEAN, {"default": False})
            }
        }

    RETURN_TYPES = (IO.LATENT, IO.INT, IO.INT)
    RETURN_NAMES = ("latent", "width", "height")
    OUTPUT_TOOLTIPS = (
        "The empty latent image batch.",
        "pass through the image width",
        "pass through the image height",
    )
    FUNCTION = "generate"

    CATEGORY = "Sage Utils/image"
    DESCRIPTION = (
        "Create a new batch of empty latent images to be denoised via sampling."
    )

    def generate(self, width, height, batch_size=1, sd3=False) -> tuple:
        size = 16 if sd3 else 4
        latent = torch.zeros(
            [batch_size, size, height // 8, width // 8], device=self.device
        )
        return ({"samples": latent}, width, height)

class Sage_LoadImage(ComfyNodeABC):

    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        print("Grabbing input files for Sage_LoadImage node...")
        input_files = []
        if hasattr(cls, 'input_cache') and cls.input_cache is not None:
            if hasattr(cls, 'input_cache_creation_time') and (datetime.datetime.now() - cls.input_cache_creation_time).total_seconds() < 20:
                # ComfyUI, why are you like this?
                # INPUT_TYPES is called multiple times during workflow loading, so cache the results for 20 seconds to avoid rescanning the input directory repeatedly.
                input_files = cls.input_cache
                print("Last called within 20 seconds. Using cached input files.")

        if not input_files:
            input_files = get_files_in_dir(
                input_dirs=folder_paths.get_input_directory(),
                extensions=[".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif", ".webp"]
            )
            cls.input_cache = input_files  # Cache the list to avoid re-scanning on every call
            cls.input_cache_creation_time = datetime.datetime.now()

        return {
            "required": {
                "image": (IO.COMBO, {"options": input_files, "image_upload": True})
            }
        }

    CATEGORY = "Sage Utils/image"

    RETURN_TYPES = (IO.IMAGE, IO.MASK, IO.INT, IO.INT, IO.STRING)
    RETURN_NAMES = ("image", "mask", "width", "height", "metadata")

    FUNCTION = "load_image"

    def load_image(self, image) -> tuple:
        image_path = folder_paths.get_annotated_filepath(image)
        output_image, output_mask, w, h, info = load_image_from_path(image_path)

        return output_image, output_mask, w, h, info

    @classmethod
    def IS_CHANGED(s, image):
        image_path = folder_paths.get_annotated_filepath(image)
        m = hashlib.sha256()
        with open(image_path, "rb") as f:
            m.update(f.read())
        return m.digest().hex()

    @classmethod
    def VALIDATE_INPUTS(s, image):
        if not folder_paths.exists_annotated_filepath(image):
            return "Invalid image file: {}".format(image)

        return True

# An altered version of Save Image
class Sage_SaveImageWithMetadata(ComfyNodeABC):
    def __init__(self):
        self.output_dir = folder_paths.get_output_directory()
        self.type = "output"
        self.prefix_append = ""
        self.compress_level = 4

    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "images": (IO.IMAGE, {"tooltip": "The images to save."}),
                "filename_prefix": (IO.STRING, {"default": "ComfyUI_Meta", "tooltip": "The prefix for the file to save. This may include formatting information such as %date:yyyy-MM-dd% or %Empty Latent Image.width% to include values from nodes."}),
                "include_node_metadata": (IO.BOOLEAN, {"default": True, "defaultInput": False}),
                "include_extra_pnginfo_metadata": (IO.BOOLEAN,{"default": True, "defaultInput": False})
            },
            "optional": {
                "param_metadata": (IO.STRING, {"defaultInput": True}),
                "extra_metadata": (IO.STRING, {"defaultInput": True}),
            },
            "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"},
        }

    RETURN_TYPES = ()
    FUNCTION = "save_images"

    OUTPUT_NODE = True

    CATEGORY = "Sage Utils/image"
    DESCRIPTION = "Saves the input images to your ComfyUI output directory with added metadata. The param_metadata input should come from Construct Metadata, and the extra_metadata is anything you want. Both are just strings, though, with the difference being that the first has a keyword of parameters, and the second, extra, so technically you could pass in your own metadata, or even type it in in a Set Text node and hook that to this node."

    def set_metadata(
        self,
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

    def save_images(
        self,
        images,
        filename_prefix,
        include_node_metadata,
        include_extra_pnginfo_metadata,
        param_metadata=None,
        extra_metadata=None,
        prompt=None,
        extra_pnginfo=None,
    ):
        filename_prefix += self.prefix_append
        full_output_folder, filename, counter, subfolder, filename_prefix = (
            folder_paths.get_save_image_path(
                filename_prefix, self.output_dir, images[0].shape[1], images[0].shape[0]
            )
        )
        results = list()
        for batch_number, image in enumerate(images):
            i = 255.0 * image.cpu().numpy()
            img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))
            final_metadata = self.set_metadata(
                include_node_metadata,
                include_extra_pnginfo_metadata,
                param_metadata,
                extra_metadata,
                prompt,
                extra_pnginfo,
            )

            filename_with_batch_num = filename.replace("%batch_num%", str(batch_number))
            file = f"{filename_with_batch_num}_{counter:05}_.png"

            img.save(
                os.path.join(full_output_folder, file),
                pnginfo=final_metadata,
                compress_level=self.compress_level,
            )
            results.append(
                {"filename": file, "subfolder": subfolder, "type": self.type}
            )
            counter += 1

        return {"ui": {"images": results}}

class Sage_CropImage(ImageCrop):
    @classmethod
    def INPUT_TYPES(s):
        return {"required": { "image": ("IMAGE",),
                              "left": ("INT", {"default": 0, "min": 0, "max": 2147483647, "step": 1}),
                              "top": ("INT", {"default": 0, "min": 0, "max": 2147483647, "step": 1}),
                              "right": ("INT", {"default": 0, "min": 0, "max": 2147483647, "step": 1}),
                              "bottom": ("INT", {"default": 0, "min": 0, "max": 2147483647, "step": 1}),
                              }}
    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "execute_crop"

    CATEGORY = "Sage Utils/image"
    DESCRIPTION = "Crop an image by the number of pixels specified in the left, top, right, and bottom parameters. The image is cropped to the specified width and height, starting from the top-left corner (left, top) and ending at the bottom-right corner (right, bottom)."
    
    def execute_crop(self, image, left, top, right, bottom):
        # The parent class ImageCrop already has the logic to handle cropping, so we just need to call it, but we need to adjust the arguments.
        # The method is crop(self, image, width, height, x, y), so we need to calculate the width and height from the right and bottom parameters.
        width = image.shape[2] - left - right
        height = image.shape[1] - top - bottom
        x = left
        y = top
        return super().crop(image, width, height, x, y)

class Sage_GuessResolutionByRatio(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "width": (IO.INT, {"defaultInput": True, "min": 64, "max": 8192, "step": 1}),
                "height": (IO.INT, {"defaultInput": True, "min": 64, "max": 8192, "step": 1}),
            }
        }

    RETURN_TYPES = (IO.INT, IO.INT)
    RETURN_NAMES = ("width", "height")

    FUNCTION = "guess_resolution"

    CATEGORY = "Sage Utils/image"
    DESCRIPTION = "Based on the input width and height, guess a resolution that matches one of the common aspect ratios. The output is rounded to the nearest multiple of 64."

    def guess_resolution(self, width: int, height: int) -> tuple[int, int]:
        aspect_ratios = {
            "1:1": (1024, 1024),
            "5:12": (512, 1216),
            "9:16": (720, 1280),
            "10:16": (640, 1024),
            "5:7": (1280, 1792),
            "2:3": (768, 1152),
            "3:4": (768, 1024),
            "4:7": (768, 1344),
            "7:9": (896, 1152),
            "8:10": (1024, 1280),
            "13:19": (832, 1216)
        }
        # Calculate the aspect ratio of the input dimensions, and pick dimensions that are closest to it.
        landscape = width > height
        if landscape:
            width, height = height, width

        input_aspect_ratio = width / height
        closest_ratio = None
        closest_diff = float('inf')
        for ratio, (w, h) in aspect_ratios.items():
            ratio_aspect = w / h
            diff = abs(input_aspect_ratio - ratio_aspect)
            if diff < closest_diff:
                closest_diff = diff
                closest_ratio = (w, h)
        if closest_ratio is None:
            print("No close resolution found, defaulting to 1024x1024.")
            return (1024, 1024)
        width, height = closest_ratio
        # Round to the nearest multiple of 64
        width = int(round(width / 64) * 64)
        height = int(round(height / 64) * 64)
        
        if landscape:
            width, height = height, width

        print(f"Guessed resolution: {width}x{height}")
        return (width, height)

class Sage_QuickResPicker(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        aspect_ratios = [
            "1:1", # Square - 1024 x 1024
            "5:12", # Portrait - 512 x 1216
            "9:16", # Portrait - 720 x 1280
            "10:16", # Portrait - 640 x 1024
            "5:7", # Portrait - 1280 x 1792
            "2:3", # Portrait - 768 x 1152
            "3:4", # Portrait - 768 x 1024
            "4:7", # Portrait - 768 x 1344
            "7:9", # Portrait - 896 x 1152
            "8:10", # Portrait - 1024 x 1280
            "13:19" # Portrait - 832 x 1216
            ]
        orientations = ["Portrait", "Landscape"]

        return {
            "required": {
                "aspect_ratio": (IO.COMBO, {"defaultInput": True, "options": aspect_ratios}),
                "orientation": (IO.COMBO, {"defaultInput": True, "options": orientations}),
                "multiplier": (IO.FLOAT, {"default": 1.0, "min": 0.1, "max": 10.0, "step": 0.1, "round": 0.001})
            }
        }

    RETURN_TYPES = (IO.INT, IO.INT)
    RETURN_NAMES = ("width", "height")
    
    FUNCTION = "get_resolution"
    CATEGORY = "Sage Utils/image"
    DESCRIPTION = "Pick a resolution from a list of common aspect ratios. The multiplier can be used to scale the resolution up or down, rounded to the nearest unit of 64."

    def get_resolution(self, aspect_ratio, orientation, multiplier) -> tuple[int, int]:
        aspect_ratios = {
            "1:1": (1024, 1024),
            "5:12": (512, 1216),
            "9:16": (720, 1280),
            "10:16": (640, 1024),
            "5:7": (1280, 1792),
            "2:3": (768, 1152),
            "3:4": (768, 1024),
            "4:7": (768, 1344),
            "7:9": (896, 1152),
            "8:10": (1024, 1280),
            "13:19": (832, 1216)
        }
        if aspect_ratio not in aspect_ratios:
            aspect_ratio = "1:1"  # Default to 1:1 if not found
            print(f"Aspect ratio '{aspect_ratio}' not found, defaulting to 1:1.")

        width, height = aspect_ratios[aspect_ratio]
        if orientation == "Landscape":
            width, height = height, width

        width = int(round(width * multiplier / 64) * 64)
        height = int(round(height * multiplier / 64) * 64)

        return (width, height)

# Since ComfyUI_Essentials is not in maintainance mode, making a copy of the ImageResize node from there in my nodes package that I can modify it to suit my needs.
# https://github.com/cubiq/ComfyUI_essentials
# Original Author: cubiq - Copyright (c) 2023 Matteo Spinelli. MIT license applies to this code. (But then, the rest of my node pack is also MIT licensed.)
class Sage_CubiqImageResize:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "image": ("IMAGE",),
                "width": ("INT", { "default": 1024, "min": 0, "max": nodes.MAX_RESOLUTION, "step": 1, }),
                "height": ("INT", { "default": 1024, "min": 0, "max": nodes.MAX_RESOLUTION, "step": 1, }),
                "interpolation": (["nearest", "bilinear", "bicubic", "area", "nearest-exact", "lanczos", "bislerp"],),
                "method": (["stretch", "keep proportion", "fill / crop", "pad"],),
                "condition": (["always", "downscale if bigger", "upscale if smaller", "if bigger area", "if smaller area"],),
                "multiple_of": ("INT", { "default": 0, "min": 0, "max": 1024, "step": 1, }),
            }
        }

    RETURN_TYPES = ("IMAGE", "INT", "INT",)
    RETURN_NAMES = ("IMAGE", "width", "height",)
    FUNCTION = "execute"
    CATEGORY = "Sage Utils/image"
    
    def padding(self, width, height, new_width, new_height):
        """
        Calculate the padding values for left, right, top, and bottom.
        """
        pad_left = (width - new_width) // 2
        pad_right = width - new_width - pad_left
        pad_top = (height - new_height) // 2
        pad_bottom = height - new_height - pad_top
        return pad_left, pad_right, pad_top, pad_bottom
    
    def resize_needed(self, condition, width, height, ow, oh):
        if "always" in condition \
            or ("downscale if bigger" == condition and (oh > height or ow > width)) \
            or ("upscale if smaller" == condition and (oh < height or ow < width)) \
            or ("bigger area" in condition and (oh * ow > height * width)) \
            or ("smaller area" in condition and (oh * ow < height * width)):
            return True
        return False

    def execute(self, image, width, height, method="stretch", interpolation="lanczos", condition="always", multiple_of=64, keep_proportion=False):
        _, oh, ow, _ = image.shape
        x = y = x2 = y2 = 0
        pad_left = pad_right = pad_top = pad_bottom = 0
        padding = False

        if keep_proportion:
            method = "keep proportion"

        if multiple_of > 1:
            width = width - (width % multiple_of)
            height = height - (height % multiple_of)

        if method == 'keep proportion' or method == 'pad':
            if width == 0 and oh < height:
                width = nodes.MAX_RESOLUTION
            elif width == 0 and oh >= height:
                width = ow

            if height == 0 and ow < width:
                height = nodes.MAX_RESOLUTION
            elif height == 0 and ow >= width:
                height = oh

            ratio = min(width / ow, height / oh)
            new_width = round(ow*ratio)
            new_height = round(oh*ratio)

            if method == 'pad':
                pad_left, pad_right, pad_top, pad_bottom = self.padding(width, height, new_width, new_height)
                if pad_left > 0 or pad_right > 0 or pad_top > 0 or pad_bottom > 0:
                    padding = True

            width = new_width
            height = new_height
        elif method.startswith('fill'):
            width = width if width > 0 else ow
            height = height if height > 0 else oh

            ratio = max(width / ow, height / oh)
            new_width = round(ow*ratio)
            new_height = round(oh*ratio)

            x = (new_width - width) // 2
            y = (new_height - height) // 2
            x2 = x + width
            y2 = y + height

            if x2 > new_width: x -= (x2 - new_width)
            if x < 0: x = 0
            if y2 > new_height: y -= (y2 - new_height)
            if y < 0: y = 0

            width = new_width
            height = new_height
        else:
            width = width if width > 0 else ow
            height = height if height > 0 else oh

        if self.resize_needed(condition, width, height, ow, oh):
            outputs = image.permute(0,3,1,2)

            if interpolation == "lanczos":
                outputs = comfy.utils.lanczos(outputs, width, height)
            elif interpolation == "bislerp":
                outputs = comfy.utils.bislerp(outputs, width, height)
            else:
                outputs = F.interpolate(outputs, size=(height, width), mode=interpolation)

            if padding:
                outputs = F.pad(outputs, (pad_left, pad_right, pad_top, pad_bottom), value=0)

            outputs = outputs.permute(0,2,3,1)

            if method.startswith('fill'):
                if x > 0 or y > 0 or x2 > 0 or y2 > 0:
                    outputs = outputs[:, y:y2, x:x2, :]
        else:
            outputs = image

        if multiple_of > 1 and (outputs.shape[2] % multiple_of != 0 or outputs.shape[1] % multiple_of != 0):
            width = outputs.shape[2]
            height = outputs.shape[1]
            x = (width % multiple_of) // 2
            y = (height % multiple_of) // 2
            x2 = width - ((width % multiple_of) - x)
            y2 = height - ((height % multiple_of) - y)
            outputs = outputs[:, y:y2, x:x2, :]
        
        outputs = torch.clamp(outputs, 0, 1)

        return(outputs, outputs.shape[2], outputs.shape[1],)

class Sage_ReferenceImage(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "conditioning": (IO.CONDITIONING, ),
                "image": (IO.IMAGE, ),
                "vae": (IO.VAE, )
            }
        }

    RETURN_TYPES = (IO.CONDITIONING, IO.LATENT)
    RETURN_NAMES = ("conditioning", "latent")
    FUNCTION = "execute"
    CATEGORY = "Sage Utils/image"
    
    CATEGORY = "Sage Utils/image"
    DESCRIPTION = "This node sets the guiding latent for an edit model. If the model supports it you can chain multiple to set multiple reference images."

    def execute(self, conditioning, image, vae):
        graph = GraphBuilder()
        encoder_node = graph.node("VAEEncode", pixels = image, vae = vae)
        ref_latent_node = graph.node("ReferenceLatent", conditioning=conditioning, latent=encoder_node.out(0))

        return {
            "result": (ref_latent_node.out(0), encoder_node.out(0)), 
            "expand": graph.finalize(),
            }

# Image nodes.
# This includes nodes involving loading, saving, and manipulating images and latents.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO

import comfy
import nodes

from ..utils import *

import torch
import numpy as np
from PIL import Image
from PIL.PngImagePlugin import PngInfo
import os

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
        files = sorted(
            str(x.relative_to(folder_paths.get_input_directory()))
            for x in pathlib.Path(folder_paths.get_input_directory()).rglob("*")
            if x.is_file()
        )
        return {
            "required": {
                "image": (files, { "image_upload": True})
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

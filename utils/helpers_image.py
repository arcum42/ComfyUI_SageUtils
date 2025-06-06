# Helper fuctions that specifically involve images.

import io
from PIL import Image, ImageOps, ImageSequence
from PIL.PngImagePlugin import PngInfo
import numpy as np
import torch
import requests
import base64
import time
import pathlib

import node_helpers
import folder_paths

def blank_image():
    img = Image.new('RGB', (1024, 1024))
    img = ImageOps.exif_transpose(img)
    img = np.array(img.convert("RGB")).astype(np.float32) / 255.0
    return (torch.from_numpy(img)[None,])

def url_to_torch_image(url):
    img = Image.open(requests.get(url, stream=True).raw)
    img = ImageOps.exif_transpose(img)
    img = np.array(img.convert("RGB")).astype(np.float32) / 255.0
    return (torch.from_numpy(img)[None,])

def tensor_to_base64(tensor):
    images = []
    if tensor is None or not isinstance(tensor, torch.Tensor):
        return []

    for batch_number, image in enumerate(tensor):
        i = 255.0 * image.cpu().numpy()
        img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))
        if img.mode != 'RGB':
            img = img.convert('RGB')
        images.append(img)

    base64_images = []
    for img in images:
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        base64_images.append(base64.b64encode(buffered.getvalue()).decode('utf-8'))

    return base64_images

def load_image_from_path(image_path) -> tuple:
    img = node_helpers.pillow(Image.open, image_path)

    output_images, output_masks = [], []
    w, h = None, None

    for i in ImageSequence.Iterator(img):
        i = node_helpers.pillow(ImageOps.exif_transpose, i)
        if i.mode == "I":
            i = i.point(lambda x: x * (1 / 255))
        image = i.convert("RGB")

        if not output_images:
            w, h = image.size

        if image.size != (w, h):
            continue

        image = torch.from_numpy(np.array(image).astype(np.float32) / 255.0)[None,]
        mask = (
            (
                1.0
                - torch.from_numpy(
                    np.array(i.getchannel("A")).astype(np.float32) / 255.0
                )
            ).unsqueeze(0)
            if "A" in i.getbands()
            else torch.zeros((1, 64, 64), dtype=torch.float32)
        )
        output_images.append(image)
        output_masks.append(mask)

    output_image = (
        torch.cat(output_images, dim=0)
        if len(output_images) > 1 and img.format != "MPO"
        else output_images[0]
    )
    output_mask = (
        torch.cat(output_masks, dim=0)
        if len(output_masks) > 1 and img.format != "MPO"
        else output_masks[0]
    )

    return output_image, output_mask, w, h, f"{img.info}"

def tensor_to_temp_image(tensor, filename=None):
    if tensor is None or not isinstance(tensor, torch.Tensor):
        return None
    
    output_dir = folder_paths.get_temp_directory()

    images = []
    for batch_number, image in enumerate(tensor):
        i = 255.0 * image.cpu().numpy()
        img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))
        if img.mode != 'RGB':
            img = img.convert('RGB')
        images.append(img)

    filenames = []
    counter = 0
    for img in images:
        if filename is None:
            filename = f"temp_image_{counter}_{int(time.time())}.png"
        
        counter += 1
        
        filename = pathlib.Path(output_dir) / filename
        if not filename.suffix:
            filename = filename.with_suffix('.png')
        filenames.append(str(filename))

        img.save(filename, format="PNG")
    print(f"Saved {len(filenames)} images to {output_dir}")
    print(filenames)
    return filenames
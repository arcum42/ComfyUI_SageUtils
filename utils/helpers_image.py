# Helper functions that specifically involve images.

import io
import base64
import time
import pathlib
from PIL import Image, ImageOps, ImageSequence
import numpy as np
import torch
import requests

import node_helpers
import folder_paths


def blank_image():
    """Create a blank 1024x1024 RGB image as a torch tensor."""
    img = Image.new('RGB', (1024, 1024))
    img = ImageOps.exif_transpose(img)
    img = np.array(img.convert("RGB")).astype(np.float32) / 255.0
    return torch.from_numpy(img)[None, :]


def url_to_torch_image(url):
    """Load an image from a URL and return as a torch tensor."""
    response = requests.get(url, stream=True)
    img = Image.open(io.BytesIO(response.content))
    img = ImageOps.exif_transpose(img)
    img = np.array(img.convert("RGB")).astype(np.float32) / 255.0
    return torch.from_numpy(img)[None, :]


def tensor_to_base64(tensor):
    """Convert a torch tensor image batch to a list of base64-encoded PNGs."""
    if tensor is None or not isinstance(tensor, torch.Tensor):
        return []
    base64_images = []
    for image in tensor:
        arr = 255.0 * image.cpu().numpy()
        img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
        if img.mode != 'RGB':
            img = img.convert('RGB')
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        base64_images.append(base64.b64encode(buffered.getvalue()).decode('utf-8'))
    return base64_images


def _load_image(img) -> tuple:
    """Internal helper to process a PIL image (from path or URL) into torch tensors and mask."""
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
        image_tensor = torch.from_numpy(np.array(image).astype(np.float32) / 255.0)[None, :]
        if "A" in i.getbands():
            mask = (1.0 - torch.from_numpy(np.array(i.getchannel("A")).astype(np.float32) / 255.0)).unsqueeze(0)
        else:
            mask = torch.zeros((1, 64, 64), dtype=torch.float32)
        output_images.append(image_tensor)
        output_masks.append(mask)
    output_image = torch.cat(output_images, dim=0) if len(output_images) > 1 and getattr(img, 'format', None) != "MPO" else output_images[0]
    output_mask = torch.cat(output_masks, dim=0) if len(output_masks) > 1 and getattr(img, 'format', None) != "MPO" else output_masks[0]
    return output_image, output_mask, w, h, f"{getattr(img, 'info', {})}"


def load_image_from_path(image_path) -> tuple:
    """Load an image (and mask if present) from a file path as torch tensors."""
    img = node_helpers.pillow(Image.open, image_path)
    return _load_image(img)


def load_image_from_url(url) -> tuple:
    """Load an image (and mask if present) from a URL as torch tensors."""
    response = requests.get(url, stream=True)
    img = node_helpers.pillow(Image.open, io.BytesIO(response.content))
    return _load_image(img)


def tensor_to_temp_image(tensor, filename=None):
    """Save a torch tensor image batch to temporary PNG files. Returns list of file paths."""
    if tensor is None or not isinstance(tensor, torch.Tensor):
        return []
    output_dir = folder_paths.get_temp_directory()
    filenames = []
    for idx, image in enumerate(tensor):
        arr = 255.0 * image.cpu().numpy()
        img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
        if img.mode != 'RGB':
            img = img.convert('RGB')
        if filename is None:
            fname = f"temp_image_{idx}_{int(time.time())}.png"
        else:
            stem = pathlib.Path(filename).stem
            fname = f"{stem}_{idx}.png"
        file_path = pathlib.Path(output_dir) / fname
        img.save(file_path, format="PNG")
        filenames.append(str(file_path))
    print(f"Saved {len(filenames)} images to {output_dir}")
    print(filenames)
    return filenames

# Helper functions that specifically involve images.

import io
import base64
import time
import pathlib
from PIL import Image, ImageOps, ImageSequence
import numpy as np
import torch
import torch.nn.functional as F
import requests

import node_helpers
import folder_paths
import comfy.utils
import comfy.model_management as mm

from spandrel import ModelLoader, ImageModelDescriptor

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

def calc_padding(width, height, new_width, new_height):
    """
        Calculate the padding values for left, right, top, and bottom.
    """
    pad_left = (width - new_width) // 2
    pad_right = width - new_width - pad_left
    pad_top = (height - new_height) // 2
    pad_bottom = height - new_height - pad_top
    return pad_left, pad_right, pad_top, pad_bottom

def image_padding(image, pad_left=0, pad_right=0, pad_top=0, pad_bottom=0):
    return F.pad(image, (pad_left, pad_right, pad_top, pad_bottom), value=0)

def image_fill(image, x=0, y=0, x2=0, y2=0):
    if x > 0 or y > 0 or x2 > 0 or y2 > 0:
        return image[:, y:y2, x:x2, :]
    return image

def image_mult_of(outputs, multiple_of=1):
    if multiple_of > 1 and (outputs.shape[2] % multiple_of != 0 or outputs.shape[1] % multiple_of != 0):
        width = outputs.shape[2]
        height = outputs.shape[1]
        x = (width % multiple_of) // 2
        y = (height % multiple_of) // 2
        x2 = width - ((width % multiple_of) - x)
        y2 = height - ((height % multiple_of) - y)
        outputs = outputs[:, y:y2, x:x2, :]
    return outputs

def resize_needed(condition, width, height, ow, oh):
    if "always" in condition \
        or ("downscale if bigger" == condition and (oh > height or ow > width)) \
        or ("upscale if smaller" == condition and (oh < height or ow < width)) \
        or ("bigger area" in condition and (oh * ow > height * width)) \
        or ("smaller area" in condition and (oh * ow < height * width)):
        return True
    return False

def image_resize(outputs, width, height, interpolation):
    if interpolation == "lanczos":
        outputs = comfy.utils.lanczos(outputs, width, height)
    elif interpolation == "bislerp":
        outputs = comfy.utils.bislerp(outputs, width, height)
    else:
        outputs = F.interpolate(outputs, size=(height, width), mode=interpolation)   
    return outputs

def image_manipulate(image, width, height, interpolation, multiple_of = 1,
                 padding = False, fill = False, resize = False,
                 pad_left=0, pad_right=0, pad_top=0, pad_bottom=0,
                 x=0, y=0, x2=0, y2=0):
    outputs = image

    if resize:
        outputs = outputs.permute(0,3,1,2)
        outputs = image_resize(outputs, width, height, interpolation)

    if padding:
        outputs = image_padding(outputs, pad_left, pad_right, pad_top, pad_bottom)

    outputs = outputs.permute(0,2,3,1)

    if fill:
        outputs = image_fill(outputs, x, y, x2, y2)
    
    outputs = image_mult_of(outputs, multiple_of)

    outputs = torch.clamp(outputs, 0, 1)
    return outputs

def vae_decode(latent_result, vae):
    latent = latent_result[0]["samples"]
    images = vae.decode(latent)
    
    if len(images.shape) == 5: #Combine batches
        images = images.reshape(-1, images.shape[-3], images.shape[-2], images.shape[-1])
        
    return images

def vae_decode_tiled(latent_result, vae, tile_size, overlap, temporal_size, temporal_overlap):
    latent = latent_result[0]["samples"]

    if tile_size < overlap * 4:
        overlap = tile_size // 4
    if temporal_size < temporal_overlap * 2:
        temporal_overlap = temporal_overlap // 2
    temporal_compression = vae.temporal_compression_decode()

    if temporal_compression is not None:
        temporal_size = max(2, temporal_size // temporal_overlap)
        temporal_overlap = max(1, min(temporal_size // 2, temporal_overlap // temporal_compression))
    else:
        temporal_size = None
        temporal_overlap = None

    compression = vae.spacial_compression_decode()

    images = vae.decode_tiled(
        latent, 
        tile_x=tile_size // compression, tile_y=tile_size // compression, 
        overlap=overlap // compression, 
        tile_t=temporal_size, 
        overlap_t= temporal_overlap)

    if len(images.shape) == 5: #Combine batches
        images = images.reshape(-1, images.shape[-3], images.shape[-2], images.shape[-1])
    
    return images

def load_upscaler(model_path):
    sd = comfy.utils.load_torch_file(model_path, safe_load=True)
    if "module.layers.0.residual_group.blocks.0.norm1.weight" in sd:
        sd = comfy.utils.state_dict_prefix_replace(sd, {"module.":""})
    upload_model = ModelLoader().load_from_state_dict(sd).eval()

    if not isinstance(upload_model, ImageModelDescriptor):
        raise Exception("Upscale model must be a single-image model.")

    return upload_model

def upscale_with_model(upscale_model, image, tile = 512, overlap = 32):
    device = mm.get_torch_device()

    memory_required = mm.module_size(upscale_model.model)
    memory_required += ((512 * 512 * 3 * 384.0) * max(upscale_model.scale, 1.0) + image.nelement()) * image.element_size()
    mm.free_memory(memory_required, device)

    upscale_model.to(device)
    in_img = image.movedim(-1,-3).to(device)

    oom = True
    scaled = None
    while oom:
        try:
            steps = in_img.shape[0] * comfy.utils.get_tiled_scale_steps(in_img.shape[3], in_img.shape[2], tile_x=tile, tile_y=tile, overlap=overlap)
            pbar = comfy.utils.ProgressBar(steps)
            scaled = comfy.utils.tiled_scale(in_img, lambda a: upscale_model(a), tile_x=tile, tile_y=tile, overlap=overlap, upscale_amount=upscale_model.scale, pbar=pbar)
            oom = False
        except mm.OOM_EXCEPTION as e:
            tile //= 2
            if tile <= overlap:
                raise e

    upscale_model.to("cpu")
    image = None
    if scaled is not None:
        image = torch.clamp(scaled.movedim(-3,-1), min=0, max=1.0)
    return image


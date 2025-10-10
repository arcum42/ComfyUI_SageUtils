
from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO

import torch
import numpy as np
from PIL import Image
import pathlib
import folder_paths
import os
import logging
import node_helpers

# Copied from nodes_train.py and modified to suit my needs.
def load_and_process_images(image_files: list[str], input_dir: pathlib.Path, resize_method: str = "None", w: int | None = None, h: int | None = None) -> torch.Tensor:
    """Utility function to load and process a list of images.

    Args:
        image_files: List of image file paths
        input_dir: Base directory containing the images
        resize_method: How to handle images of different sizes ("None", "Stretch", "Crop", "Pad")
        w: Target width (None to use first image's width)
        h: Target height (None to use first image's height)

    Returns:
        torch.Tensor: Batch of processed images
        
    Raises:
        ValueError: If no valid images found or resize method is invalid
    """
    if not image_files:
        raise ValueError("No valid images found in input")

    output_images = []
    target_width, target_height = w, h

    for image_file in image_files:
        img = _load_single_image(image_file)
        
        # Set target dimensions from first image if not specified
        if target_width is None and target_height is None:
            target_width, target_height = img.size

        # Ensure we have valid dimensions before resizing
        if target_width is None or target_height is None:
            raise ValueError("Could not determine target dimensions for image resizing")

        # Resize image if needed
        img = _resize_image_if_needed(img, target_width, target_height, resize_method)
        
        # Convert to tensor
        img_tensor = _image_to_tensor(img)
        output_images.append(img_tensor)

    return torch.cat(output_images, dim=0)


def _load_single_image(image_path: str) -> Image.Image:
    """Load and preprocess a single image."""
    img = node_helpers.pillow(Image.open, image_path)
    
    # Handle 16-bit grayscale images
    if img.mode == "I":
        img = img.point(lambda i: i * (1 / 255))
    
    return img.convert("RGB")


def _resize_image_if_needed(img: Image.Image, target_width: int, target_height: int, resize_method: str) -> Image.Image:
    """Resize image if dimensions don't match target."""
    if img.size == (target_width, target_height):
        return img
    
    if resize_method == "Stretch":
        return img.resize((target_width, target_height), Image.Resampling.LANCZOS)
    elif resize_method == "Crop":
        return img.crop((0, 0, target_width, target_height))
    elif resize_method == "Pad":
        # Note: Original code had same logic as Stretch for Pad - might need refinement
        return img.resize((target_width, target_height), Image.Resampling.LANCZOS)
    elif resize_method == "None":
        raise ValueError(
            "Image size does not match the first image in the dataset. "
            "Either select a valid resize method or use the same size for all images."
        )
    else:
        raise ValueError(f"Invalid resize method: {resize_method}")


def _image_to_tensor(img: Image.Image) -> torch.Tensor:
    """Convert PIL Image to normalized torch tensor."""
    img_array = np.array(img).astype(np.float32) / 255.0
    return torch.from_numpy(img_array)[None, :]

def get_subfolders(input_dir: pathlib.Path) -> list[str]:
    """Returns a list of all subfolder paths in the given directory, recursively.
    
    Follows symbolic links when traversing directories.

    Args:
        input_dir: The directory to search for subfolders

    Returns:
        List of folder paths relative to the input directory, excluding the root directory
    """
    folders = []

    try:
        if not input_dir.exists():
            return []

        # Use os.walk with followlinks=True since pathlib.rglob() doesn't have a followlinks option
        for root, dirs, _ in os.walk(input_dir, followlinks=True):
            root_path = pathlib.Path(root)
            try:
                rel_path = root_path.relative_to(input_dir)
                if str(rel_path) != ".":  # Exclude the root directory itself
                    # Convert to forward slashes for consistency
                    folders.append(str(rel_path).replace(os.sep, '/'))
            except ValueError:
                # Handle case where relative_to fails (shouldn't happen with os.walk from input_dir)
                continue

        return sorted(folders)
    except (FileNotFoundError, OSError):
        return []

# Copied from the base node in nodes_train.py and modified to suit my needs.
class Sage_LoadImageTextSetFromFolderNode(ComfyNodeABC):
    """Loads a batch of images and captions from a directory for training."""
    
    # Constants
    VALID_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
    DEFAULT_WIDTH_HEIGHT = -1  # Sentinel value for "use original dimensions"
    
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        dir_list = get_subfolders(pathlib.Path(folder_paths.get_input_directory()))
        return {
            "required": {
                "folder": (IO.COMBO, {"options": dir_list, "tooltip": "The folder to load images from."}),
                "clip": (IO.CLIP, {"tooltip": "The CLIP model used for encoding the text."}),
            },
            "optional": {
                "resize_method": (["None", "Stretch", "Crop", "Pad"], {"default": "None"}),
                "width": (IO.INT, {
                    "default": cls.DEFAULT_WIDTH_HEIGHT, 
                    "min": -1, 
                    "max": 10000, 
                    "step": 1, 
                    "tooltip": "The width to resize the images to. -1 means use the original width."
                }),
                "height": (IO.INT, {
                    "default": cls.DEFAULT_WIDTH_HEIGHT, 
                    "min": -1, 
                    "max": 10000, 
                    "step": 1, 
                    "tooltip": "The height to resize the images to. -1 means use the original height."
                }),
            },
        }

    RETURN_TYPES = (IO.IMAGE, IO.CONDITIONING, IO.STRING)
    RETURN_NAMES = ("images", "conditioning", "captions")
    FUNCTION = "load_images"
    CATEGORY = "Sage Utils/train"
    EXPERIMENTAL = True
    DESCRIPTION = "Loads a batch of images and captions from a directory for training."

    def _validate_inputs(self, clip, folder: str) -> None:
        """Validate input parameters."""
        if clip is None:
            raise RuntimeError(
                "ERROR: clip input is invalid: None\n\n"
                "If the clip is from a checkpoint loader node your checkpoint "
                "does not contain a valid clip or text encoder model."
            )

    def _get_input_directory(self, folder: str) -> pathlib.Path:
        """Get the input directory path using pathlib."""
        return pathlib.Path(folder_paths.get_input_directory()) / folder

    def _collect_image_files(self, input_dir: pathlib.Path) -> list[pathlib.Path]:
        """Collect all image files from the directory, supporting kohya-ss folder structure."""
        image_files = []
        
        for item in input_dir.iterdir():
            if item.is_file() and item.suffix.lower() in self.VALID_IMAGE_EXTENSIONS:
                image_files.append(item)
            elif item.is_dir():
                # Support kohya-ss/sd-scripts folder structure (e.g., "5_character_name")
                repeat_count = self._parse_repeat_count(item.name)
                subdir_images = [
                    img_file for img_file in item.iterdir() 
                    if img_file.is_file() and img_file.suffix.lower() in self.VALID_IMAGE_EXTENSIONS
                ]
                # Repeat images based on the folder prefix number
                image_files.extend(subdir_images * repeat_count)
        
        return image_files

    def _parse_repeat_count(self, dirname: str) -> int:
        """Parse the repeat count from a kohya-ss style directory name."""
        try:
            first_part = dirname.split("_")[0]
            return int(first_part) if first_part.isdigit() else 1
        except (ValueError, IndexError):
            return 1

    def _load_captions(self, image_files: list[pathlib.Path], input_dir: pathlib.Path) -> list[str]:
        """Load caption files corresponding to the image files."""
        captions = []
        
        for image_file in image_files:
            caption_file = input_dir / image_file.with_suffix(".txt").name
            try:
                if caption_file.exists():
                    caption = caption_file.read_text(encoding="utf-8").strip()
                    captions.append(caption)
                else:
                    captions.append("")
            except (OSError, UnicodeDecodeError) as e:
                logging.warning(f"Failed to read caption file {caption_file}: {e}")
                captions.append("")
        
        return captions

    def _encode_captions(self, captions: list[str], clip) -> list:
        """Encode captions using the CLIP model."""
        logging.info("Encoding captions...")
        
        conditions = []
        empty_condition = clip.encode_from_tokens_scheduled(clip.tokenize(""))
        
        for caption in captions:
            if not caption.strip():  # Handle empty or whitespace-only captions
                conditions.append(empty_condition)
            else:
                tokens = clip.tokenize(caption)
                encoded = clip.encode_from_tokens_scheduled(tokens)
                conditions.extend(encoded)
        
        logging.info(f"Encoded {len(conditions)} captions.")
        return conditions

    def _normalize_dimensions(self, width: int | None, height: int | None) -> tuple[int | None, int | None]:
        """Convert -1 sentinel values to None for dimensions."""
        return (
            None if width == self.DEFAULT_WIDTH_HEIGHT else width,
            None if height == self.DEFAULT_WIDTH_HEIGHT else height
        )

    def load_images(self, folder: str, clip, resize_method: str, width: int | None = None, height: int | None = None) -> tuple:
        """Load images and captions from the specified folder."""
        self._validate_inputs(clip, folder)
        
        logging.info(f"Loading images from folder: {folder}")
        
        input_dir = self._get_input_directory(folder)
        image_files = self._collect_image_files(input_dir)
        
        if not image_files:
            raise ValueError(f"No valid images found in {input_dir}")
        
        # Load captions
        captions = self._load_captions(image_files, input_dir)
        
        # Normalize dimensions
        width, height = self._normalize_dimensions(width or self.DEFAULT_WIDTH_HEIGHT, 
                                                 height or self.DEFAULT_WIDTH_HEIGHT)
        
        # Process images
        image_paths_str = [str(img_file) for img_file in image_files]
        output_tensor = load_and_process_images(image_paths_str, input_dir, resize_method, width, height)
        
        logging.info(f"Loaded {len(output_tensor)} images from {input_dir}.")
        
        # Encode captions
        conditions = self._encode_captions(captions, clip)
        
        return (output_tensor, conditions, captions)

class Sage_Load_Dataset_From_Folder(ComfyNodeABC):
    """Loads a dataset from a directory for training."""
    
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "dataset_path": (IO.STRING, {"tooltip": "The folder path to load the dataset from."}),
            },
            "optional": {
                "prefix": (IO.STRING, {"default": "", "tooltip": "Optional prefix to add to each caption."}),
                "suffix": (IO.STRING, {"default": "", "tooltip": "Optional suffix to add to each caption."}),
                "separator": (IO.STRING, {"default": " ", "tooltip": "Optional separator to use between prefix/suffix and caption."}),
            }
        }

    RETURN_TYPES = (IO.IMAGE, IO.STRING, IO.STRING)
    RETURN_NAMES = ("images", "filenames", "captions")
    FUNCTION = "load_dataset"
    CATEGORY = "Sage Utils/train"
    EXPERIMENTAL = True
    DESCRIPTION = "Loads a dataset from a directory for training."
    OUTPUT_IS_LIST = (True, True, True)

    def load_dataset(self, dataset_path: str, prefix: str = "", suffix: str = "", separator: str = " ") -> tuple:
        """Load dataset from the specified folder."""
        input_dir = pathlib.Path(dataset_path)
        if not input_dir.exists() or not input_dir.is_dir():
            raise ValueError(f"Input directory does not exist or is not a directory: {input_dir}")

        IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
        batch_images = []
        captions = []
        filenames = []

        # Iterate through files in the directory with pathlib ending with an extension in IMAGE_EXTENSIONS, 
        # adding the filename to filenames. Add the image to batch_images, 
        # and the caption to captions if it exists, otherwise add an empty string.
        # Use _image_to_tensor to convert the image to a tensor, and append to batch_images.
        for img_file in input_dir.glob("*"):
            if img_file.suffix.lower() in IMAGE_EXTENSIONS:
                filenames.append(img_file.name)
                img_tensor = _image_to_tensor(_load_single_image(str(img_file)))
                batch_images.append(img_tensor)
                caption_file = img_file.with_suffix(".txt")
                if caption_file.exists():
                    with open(caption_file, "r") as f:
                        caption = f.read().strip()
                        if prefix:
                            caption = f"{prefix}{separator}{caption}"
                        if suffix:
                            caption = f"{caption}{separator}{suffix}"
                        captions.append(caption)
                else:
                    captions.append("")

        return (batch_images, filenames, captions)

class Sage_TrainingCaptionsToConditioning(ComfyNodeABC):
    """Converts training captions to conditioning vectors using a CLIP model."""
    
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "clip": (IO.CLIP, {"tooltip": "The CLIP model used for encoding the text."}),
                "captions": (IO.STRING, {"tooltip": "List of captions to encode."}),
            },
        }

    RETURN_TYPES = (IO.CONDITIONING,)
    RETURN_NAMES = ("conditioning",)
    FUNCTION = "captions_to_conditioning"
    CATEGORY = "Sage Utils/train"
    EXPERIMENTAL = True
    DESCRIPTION = "Converts training captions to conditioning vectors using a CLIP model."
    INPUT_IS_LIST = (False, True)

    def captions_to_conditioning(self, clip, captions: list[str]) -> tuple:
        """Convert captions to conditioning vectors."""
        if clip is None:
            raise RuntimeError(
                "ERROR: clip input is invalid: None\n\n"
                "If the clip is from a checkpoint loader node your checkpoint "
                "does not contain a valid clip or text encoder model."
            )

        logging.info("Encoding captions...")
        
        conditions = []
        empty_condition = clip.encode_from_tokens_scheduled(clip.tokenize(""))
        
        for caption in captions:
            if not caption.strip():  # Handle empty or whitespace-only captions
                conditions.append(empty_condition)
            else:
                tokens = clip.tokenize(caption)
                encoded = clip.encode_from_tokens_scheduled(tokens)
                conditions.extend(encoded)
        
        logging.info(f"Encoded {len(conditions)} captions.")
        return (conditions,)
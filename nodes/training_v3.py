# Training nodes v3
# Training workflow helpers migrated from v1.
# See ref_docs/v3_migration.md for info on migrating to v3 nodes.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO
from comfy_api.latest import io, ComfyExtension
from typing_extensions import override

from comfy_api.latest._io import NodeOutput, Schema
from comfy_execution.graph_utils import GraphBuilder
from comfy_execution.graph import ExecutionBlocker

from comfy.utils import ProgressBar

import folder_paths
import logging

import torch
import numpy as np
from PIL import Image
import pathlib
import os
import hashlib
import node_helpers

# ============================================================================
# ============================================================================
# Implemented nodes (parity with v1)

class Sage_Load_Dataset_From_Folder(io.ComfyNode):
    """Loads a dataset of images and captions from a directory for training."""
    IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_Load_Dataset_From_Folder",
            display_name="Load Dataset From Folder",
            description="Loads images and paired captions from a folder; applies optional prefix/suffix.",
            category="Sage Utils/train",
            inputs=[
                io.String.Input("dataset_path", display_name="dataset_path"),
                io.String.Input("prefix", display_name="prefix", default="", optional=True),
                io.String.Input("suffix", display_name="suffix", default="", optional=True),
                io.String.Input("separator", display_name="separator", default=" ", optional=True)
            ],
            outputs=[
                io.Image.Output("images", display_name="images"),
                io.String.Output("filenames", display_name="filenames"),
                io.String.Output("captions", display_name="captions")
            ]
        )
    
    @classmethod
    def validate_inputs(cls, **kwargs):
        dataset_path = pathlib.Path(kwargs.get("dataset_path", ""))
        if not dataset_path.exists() or not dataset_path.is_dir():
            return f"Input directory does not exist or is not a directory: {dataset_path}"

        images = [p for p in dataset_path.iterdir() if p.suffix.lower() in cls.IMAGE_EXTS]
        if not images:
            return f"No image files found in {dataset_path}."

        return True

    @classmethod
    def fingerprint_inputs(cls, **kwargs):
        dataset_path = pathlib.Path(kwargs.get("dataset_path", ""))
        prefix = kwargs.get("prefix", "") or ""
        suffix = kwargs.get("suffix", "") or ""
        separator = kwargs.get("separator", " ")

        try:
            entries = [p for p in dataset_path.iterdir() if p.suffix.lower() in cls.IMAGE_EXTS]
        except Exception:
            return None

        m = hashlib.sha256()
        m.update(str(dataset_path.resolve()).encode())
        m.update(prefix.encode())
        m.update(suffix.encode())
        m.update(separator.encode())

        for img_file in sorted(entries, key=lambda p: p.name):
            try:
                stat = img_file.stat()
                m.update(img_file.name.encode())
                m.update(str(stat.st_size).encode())
                m.update(str(stat.st_mtime_ns).encode())

                caption_file = img_file.with_suffix(".txt")
                if caption_file.exists():
                    c_stat = caption_file.stat()
                    m.update(str(caption_file.name).encode())
                    m.update(str(c_stat.st_size).encode())
                    m.update(str(c_stat.st_mtime_ns).encode())
            except OSError:
                continue

        return m.digest().hex()

    @classmethod
    def execute(cls, **kwargs):
        dataset_path = pathlib.Path(kwargs.get("dataset_path", ""))
        prefix = kwargs.get("prefix", "") or ""
        suffix = kwargs.get("suffix", "") or ""
        separator = kwargs.get("separator", " ")

        if not dataset_path.exists() or not dataset_path.is_dir():
            raise ValueError(f"Input directory does not exist or is not a directory: {dataset_path}")

        batch_images: list[torch.Tensor] = []
        captions: list[str] = []
        filenames: list[str] = []

        for img_file in dataset_path.glob("*"):
            if img_file.suffix.lower() in cls.IMAGE_EXTS:
                filenames.append(img_file.name)
                img_tensor = _image_to_tensor(_load_single_image(str(img_file)))
                batch_images.append(img_tensor)

                caption_file = img_file.with_suffix(".txt")
                if caption_file.exists():
                    caption = caption_file.read_text(encoding="utf-8").strip()
                    if prefix:
                        caption = f"{prefix}{separator}{caption}" if caption else prefix
                    if suffix:
                        caption = f"{caption}{separator}{suffix}" if caption else suffix
                    captions.append(caption)
                else:
                    captions.append("")

        return io.NodeOutput(batch_images, filenames, captions)

class Sage_TrainingCaptionsToConditioning(io.ComfyNode):
    """Converts training captions to conditioning vectors using a CLIP model."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_TrainingCaptionsToConditioning",
            display_name="Training Captions To Conditioning",
            description="Encodes captions with a CLIP model to produce conditioning vectors for training workflows.",
            category="Sage Utils/train",
            inputs=[
                io.Clip.Input("clip", display_name="clip"),
                io.String.Input("captions", display_name="captions")
            ],
            outputs=[
                io.Conditioning.Output("conditioning", display_name="conditioning")
            ]
        )
    
    @classmethod
    def validate_inputs(cls, **kwargs):
        clip = kwargs.get("clip")
        if clip is None:
            return "clip input is required"
        return True

    @classmethod
    def execute(cls, **kwargs):
        clip = kwargs.get("clip")
        captions = kwargs.get("captions", [])

        if clip is None:
            raise RuntimeError(
                "ERROR: clip input is invalid: None\n\n"
                "If the clip is from a checkpoint loader node your checkpoint "
                "does not contain a valid clip or text encoder model."
            )

        # Normalize captions to list
        if isinstance(captions, str):
            captions_list = [captions]
        else:
            captions_list = list(captions)

        conditions = []
        empty_condition = clip.encode_from_tokens_scheduled(clip.tokenize(""))

        for caption in captions_list:
            if not str(caption).strip():
                conditions.append(empty_condition)
            else:
                tokens = clip.tokenize(caption)
                encoded = clip.encode_from_tokens_scheduled(tokens)
                conditions.extend(encoded)

        return io.NodeOutput(conditions)

# ============================================================================

TRAINING_NODES = [
    Sage_Load_Dataset_From_Folder,
    Sage_TrainingCaptionsToConditioning
]

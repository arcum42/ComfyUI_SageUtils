# Util nodes v3
# This is for any misc utility nodes that don't fit into the other categories.
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
import node_helpers

# ============================================================================
# PLACEHOLDER NODES - NOT YET FULLY IMPLEMENTED
# ============================================================================
# These are placeholder implementations. The inputs/outputs match the original
# v1 nodes, but the execute methods need proper implementation.

class Sage_Load_Dataset_From_Folder(io.ComfyNode):
    """PLACEHOLDER: Loads a dataset from a directory for training."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_Load_Dataset_From_Folder",
            display_name="Load Dataset From Folder",
            description="PLACEHOLDER: Loads a dataset from a directory for training. Reads images and their corresponding caption text files.",
            category="Sage Utils/train",
            inputs=[
                io.String.Input("dataset_path"),
                io.String.Input("prefix", default="", optional=True),
                io.String.Input("suffix", default="", optional=True),
                io.String.Input("separator", default=" ", optional=True)
            ],
            outputs=[
                io.Image.Output("images"),
                io.String.Output("filenames"),
                io.String.Output("captions")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from training.py
        # Should load images and their captions from the folder,
        # apply prefix/suffix to captions, and return lists
        return io.NodeOutput([], [], [])

class Sage_TrainingCaptionsToConditioning(io.ComfyNode):
    """PLACEHOLDER: Converts training captions to conditioning vectors using a CLIP model."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_TrainingCaptionsToConditioning",
            display_name="Training Captions To Conditioning",
            description="PLACEHOLDER: Converts training captions to conditioning vectors using a CLIP model for use in training workflows.",
            category="Sage Utils/train",
            inputs=[
                io.Clip.Input("clip"),
                io.String.Input("captions")
            ],
            outputs=[
                io.Conditioning.Output("conditioning")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from training.py
        # Should encode captions using CLIP model and return conditioning vectors
        return io.NodeOutput([])

# ============================================================================

TRAINING_NODES = [
    Sage_Load_Dataset_From_Folder,
    Sage_TrainingCaptionsToConditioning
]

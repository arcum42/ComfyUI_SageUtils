# Metadata v3 nodes.
# Metadata nodes for constructing A1111-style metadata.

# This module includes nodes for constructing metadata and related nodes.
# Saving metadata is handled in the image nodes.

# See ref_docs/v3_migration.md for info on migrating to v3 nodes.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO
from comfy_api.latest import io, ComfyExtension
from typing_extensions import override

from comfy_api.latest._io import NodeOutput, Schema
from comfy_execution.graph_utils import GraphBuilder
from comfy_execution.graph import ExecutionBlocker

from pathlib import Path
import json
from typing import Optional

import folder_paths
from comfy.comfy_types.node_typing import ComfyNodeABC, IO

from ..utils import (
    lora_to_prompt, civitai_sampler_name,pull_metadata, get_model_dict, cache,
)
from ..utils.model_info import collect_resource_hashes, model_name_and_hash_as_str, _get_model_name_from_info, _get_model_hash_from_info
from ..utils.config_manager import metadata_templates

# Nodes to implement:
# Sage_ConstructMetadataFlexible

METADATA_NODES = []

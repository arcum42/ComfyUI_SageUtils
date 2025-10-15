# Sampler v3 nodes.
# This is for any nodes involving samplers, currently KSampler and the sampler info nodes.
# See ref_docs/v3_migration.md for info on migrating to v3 nodes.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO
from comfy_api.latest import io, ComfyExtension
from typing_extensions import override

from comfy_api.latest._io import NodeOutput, Schema
from comfy_execution.graph_utils import GraphBuilder
from comfy_execution.graph import ExecutionBlocker

import torch

import comfy
import nodes

# Nodes to implement:
# Sage_SamplerSelector
# Sage_SchedulerSelector
# Sage_SamplerInfo
# Sage_AdvSamplerInfo
# Sage_TilingInfo
# Sage_KSampler
# Sage_KSamplerTiledDecoder
# Sage_KSamplerAudioDecoder

SAMPLER_NODES = []

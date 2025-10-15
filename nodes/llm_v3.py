# This file contains nodes for working with LLMs.

# The llm_prompts.json file contains prompts that can be used with LLMs.
# The original source of some of these prompts is the ComfyUI-joycaption-beta-one-GGUF repository, 
# which adapted it from ComfyUI_LayerStyle_Advance.

# I've heavily modified the original prompts, adding some, getting rid of some, and rephrasing others.

# https://github.com/chflame163/ComfyUI_LayerStyle_Advance
# https://github.com/judian17/ComfyUI-joycaption-beta-one-GGUF

# See ref_docs/v3_migration.md for info on migrating to v3 nodes.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO
from comfy_api.latest import io, ComfyExtension
from typing_extensions import override

from comfy_api.latest._io import NodeOutput, Schema
from comfy_execution.graph_utils import GraphBuilder
from comfy_execution.graph import ExecutionBlocker

# Import specific utilities instead of wildcard import
from ..utils.config_manager import llm_prompts
from ..utils import llm_wrapper as llm
from ..utils.performance_fix import (
    get_cached_ollama_models_for_input_types,
    get_cached_lmstudio_models_for_input_types,
    get_cached_ollama_vision_models_for_input_types,
    get_cached_lmstudio_vision_models_for_input_types
)

# Attempt to import ollama, if available. Set a flag if it is not available.
try:
    import ollama
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False

# Default vision prompt for LLMs.
DEFAULT_VISION_PROMPT = "Write a detailed description for this image. Use precise, unambiguous language. Avoid vague or general terms. This is going to be used as input for an AI image generator, so do not include anything other than the description, and do not break things into sections or use markdown."

# Default text prompt for LLMs.
DEFAULT_TEXT_PROMPT = "Write a detailed and coherent description of an image based on the provided list of tags."

import logging

# Nodes to implement:
# Sage_ConstructLLMPrompt
# Sage_ConstructLLMPromptExtra
# Sage_OllamaAdvancedOptions
# Sage_OllamaLLMPromptText
# Sage_OllamaLLMPromptVision
# Sage_OllamaLLMPromptVisionRefine
# Sage_LMStudioLLMPromptText
# Sage_LMStudioLLMPromptVision
# Sage_LMStudioLLMPromptVisionRefine

LLM_NODES = []

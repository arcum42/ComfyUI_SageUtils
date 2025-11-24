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

# Current status: Placeholder nodes only. Full implementations to be done.

# ============================================================================
# PLACEHOLDER NODES - NOT YET FULLY IMPLEMENTED
# ============================================================================
# These are placeholder implementations. The inputs/outputs match the original
# v1 nodes, but the execute methods need proper implementation.

class Sage_ConstructLLMPrompt(io.ComfyNode):
    """PLACEHOLDER: Construct a prompt for an LLM based on the provided options."""
    @classmethod
    def define_schema(cls):
        prompt_list = []
        for key in llm_prompts["base"].keys():
            category = llm_prompts["base"][key]["category"]
            prompt_list.append(f"{category}/{key}")
        
        # Note: Dynamic inputs would need to be added here for extra options
        # For now, just providing basic structure
        return io.Schema(
            node_id="Sage_ConstructLLMPrompt",
            display_name="Construct LLM Prompt",
            description="PLACEHOLDER: Construct a prompt for an LLM based on the provided image and prompt.",
            category="Sage Utils/LLM",
            inputs=[
                io.Combo.Input("prompt", options=prompt_list),
                io.String.Input("extra_instructions", default="", multiline=True)
                # TODO: Add dynamic boolean inputs for llm_prompts["extra"] options
            ],
            outputs=[
                io.String.Output("out_prompt", display_name="prompt")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from llm.py
        return io.NodeOutput("")

class Sage_ConstructLLMPromptExtra(io.ComfyNode):
    """PLACEHOLDER: Construct extra instructions for an LLM based on the provided options."""
    @classmethod
    def define_schema(cls):
        # Note: Dynamic inputs would need to be added here for extra options
        # For now, just providing basic structure
        return io.Schema(
            node_id="Sage_ConstructLLMPromptExtra",
            display_name="Construct LLM Prompt Extra",
            description="PLACEHOLDER: Construct extra instructions for an LLM based on the provided options.",
            category="Sage Utils/LLM",
            inputs=[
                io.String.Input("extra_instructions", default="", multiline=True)
                # TODO: Add dynamic boolean inputs for llm_prompts["extra"] options
            ],
            outputs=[
                io.String.Output("extra")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from llm.py
        return io.NodeOutput("")

class Sage_OllamaAdvancedOptions(io.ComfyNode):
    """PLACEHOLDER: Get advanced options for Ollama LLMs."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_OllamaAdvancedOptions",
            display_name="Ollama Advanced Options",
            description="PLACEHOLDER: Get advanced options for LLMs.",
            category="Sage Utils/LLM/Ollama",
            inputs=[
                io.Int.Input("num_keep", default=0, min=0, max=100, step=1),
                io.Int.Input("num_predict", default=-1, min=-1, max=2048, step=1),
                io.Int.Input("top_k", default=40, min=1, max=1000, step=1),
                io.Float.Input("top_p", default=0.9, min=0.0, max=1.0, step=0.01),
                io.Int.Input("repeat_last_n", default=64, min=0, max=256, step=1),
                io.Float.Input("temperature", default=0.8, min=0.0, max=1.0, step=0.01),
                io.Float.Input("repeat_penalty", default=1.1, min=1.0, max=2.0, step=0.01),
                io.Float.Input("presence_penalty", default=0.0, min=-2.0, max=2.0, step=0.01),
                io.Float.Input("frequency_penalty", default=0.0, min=-2.0, max=2.0, step=0.01)
            ],
            outputs=[
                io.Custom("OLLAMA_OPTIONS").Output("options")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from llm.py
        return io.NodeOutput(kwargs)

class Sage_OllamaLLMPromptText(io.ComfyNode):
    """PLACEHOLDER: Send a prompt to an Ollama language model and get a response."""
    @classmethod
    def define_schema(cls):
        models = get_cached_ollama_models_for_input_types()
        if not models:
            models = ["(Ollama not available)"]
        
        return io.Schema(
            node_id="Sage_OllamaLLMPromptText",
            display_name="Ollama LLM Prompt (Text)",
            description="PLACEHOLDER: Send a prompt to a language model and get a response. The model must be installed via Ollama.",
            category="Sage Utils/LLM/Ollama",
            inputs=[
                io.String.Input("prompt", default=DEFAULT_TEXT_PROMPT, multiline=True),
                io.Combo.Input("model", options=sorted(models)),
                io.Int.Input("seed", default=0, min=0, max=2**32 - 1, step=1),
                io.Float.Input("keep_alive", default=0.0, min=-1.0, max=60.0 * 60.0, step=1),
                io.Custom("OLLAMA_OPTIONS").Input("options", optional=True),
                io.String.Input("system_prompt", default="", multiline=True, optional=True)
            ],
            outputs=[
                io.String.Output("response")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from llm.py
        return io.NodeOutput("")

class Sage_OllamaLLMPromptVision(io.ComfyNode):
    """PLACEHOLDER: Send a prompt with image to an Ollama vision model and get a response."""
    @classmethod
    def define_schema(cls):
        models = get_cached_ollama_vision_models_for_input_types()
        if not models:
            models = ["(No Ollama vision models available)"]
        
        return io.Schema(
            node_id="Sage_OllamaLLMPromptVision",
            display_name="Ollama LLM Prompt (Vision)",
            description="PLACEHOLDER: Send a prompt to a language model and get a response. Optionally, you can provide an image/s to the model if it supports multimodal input. The model must be installed via Ollama.",
            category="Sage Utils/LLM/Ollama",
            inputs=[
                io.String.Input("prompt", default=DEFAULT_VISION_PROMPT, multiline=True),
                io.Combo.Input("model", options=sorted(models)),
                io.Image.Input("image"),
                io.Int.Input("seed", default=0, min=0, max=2**32 - 1, step=1),
                io.Float.Input("keep_alive", default=0.0, min=-1.0, max=60.0 * 60.0, step=0.1),
                io.Custom("OLLAMA_OPTIONS").Input("options", optional=True),
                io.String.Input("system_prompt", default="", multiline=True, optional=True)
            ],
            outputs=[
                io.String.Output("response")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from llm.py
        return io.NodeOutput("")

class Sage_OllamaLLMPromptVisionRefine(io.ComfyNode):
    """PLACEHOLDER: Send a prompt with image to an Ollama vision model, then refine the response."""
    @classmethod
    def define_schema(cls):
        models = get_cached_ollama_vision_models_for_input_types()
        if not models:
            models = ["(No Ollama vision models available)"]
        
        refine_models = get_cached_ollama_models_for_input_types()
        if not refine_models:
            refine_models = ["(Ollama not available)"]
        
        return io.Schema(
            node_id="Sage_OllamaLLMPromptVisionRefine",
            display_name="Ollama LLM Prompt (Vision) Refined",
            description="PLACEHOLDER: Send a prompt to a language model and get a response. Optionally, you can provide an image/s to the model if it supports multimodal input. The model must be installed via Ollama.",
            category="Sage Utils/LLM/Ollama",
            inputs=[
                io.String.Input("prompt", default=DEFAULT_VISION_PROMPT, multiline=True),
                io.Combo.Input("model", options=sorted(models)),
                io.Image.Input("image"),
                io.Int.Input("seed", default=0, min=0, max=2**32 - 1, step=1),
                io.String.Input("refine_prompt", default="Take the provided text description and rewrite it to be more vivid, detailed, and engaging, while preserving the original meaning.", multiline=True),
                io.Combo.Input("refine_model", options=sorted(refine_models)),
                io.Int.Input("refine_seed", default=0, min=0, max=2**32 - 1, step=1)
            ],
            outputs=[
                io.String.Output("initial_response"),
                io.String.Output("refined_response")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from llm.py
        return io.NodeOutput("", "")

class Sage_LMStudioLLMPromptText(io.ComfyNode):
    """PLACEHOLDER: Send a prompt to an LM Studio language model and get a response."""
    @classmethod
    def define_schema(cls):
        models = get_cached_lmstudio_models_for_input_types()
        if not models:
            models = ["(LM Studio not available)"]
        
        return io.Schema(
            node_id="Sage_LMStudioLLMPromptText",
            display_name="LM Studio LLM Prompt (Text)",
            description="PLACEHOLDER: Send a prompt to a language model and get a response. The model must be installed via LM Studio.",
            category="Sage Utils/LLM/LM Studio",
            inputs=[
                io.String.Input("prompt", default=DEFAULT_TEXT_PROMPT, multiline=True),
                io.Combo.Input("model", options=sorted(models)),
                io.Int.Input("seed", default=0, min=0, max=2**32 - 1, step=1),
                io.Int.Input("load_for_seconds", default=0, min=-1, max=60*60, step=1)
            ],
            outputs=[
                io.String.Output("response")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from llm.py
        return io.NodeOutput("")

class Sage_LMStudioLLMPromptVision(io.ComfyNode):
    """PLACEHOLDER: Send a prompt with image to an LM Studio vision model and get a response."""
    @classmethod
    def define_schema(cls):
        models = get_cached_lmstudio_vision_models_for_input_types()
        if not models:
            models = ["(No LM Studio vision models available)"]
        
        return io.Schema(
            node_id="Sage_LMStudioLLMPromptVision",
            display_name="LM Studio LLM Prompt (Vision)",
            description="PLACEHOLDER: Send a prompt to a language model and get a response. Optionally, you can provide an image/s to the model if it supports multimodal input. The model must be installed via LM Studio.",
            category="Sage Utils/LLM/LM Studio",
            inputs=[
                io.String.Input("prompt", default=DEFAULT_VISION_PROMPT, multiline=True),
                io.Combo.Input("model", options=sorted(models)),
                io.Image.Input("image"),
                io.Int.Input("seed", default=0, min=0, max=2**32 - 1, step=1),
                io.Int.Input("load_for_seconds", default=0, min=-1, max=60*60, step=1)
            ],
            outputs=[
                io.String.Output("response")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from llm.py
        return io.NodeOutput("")

class Sage_LMStudioLLMPromptVisionRefine(io.ComfyNode):
    """PLACEHOLDER: Send a prompt with image to an LM Studio vision model, then refine the response."""
    @classmethod
    def define_schema(cls):
        models = get_cached_lmstudio_vision_models_for_input_types()
        if not models:
            models = ["(No LM Studio vision models available)"]
        
        refine_models = get_cached_lmstudio_models_for_input_types()
        if not refine_models:
            refine_models = ["(LM Studio not available)"]
        
        return io.Schema(
            node_id="Sage_LMStudioLLMPromptVisionRefine",
            display_name="LM Studio LLM Prompt (Vision) Refined",
            description="PLACEHOLDER: Send a prompt to a language model and get a response. Optionally, you can provide an image/s to the model if it supports multimodal input. The model must be installed via LM Studio.",
            category="Sage Utils/LLM/LM Studio",
            inputs=[
                io.String.Input("prompt", default=DEFAULT_VISION_PROMPT, multiline=True),
                io.Combo.Input("model", options=sorted(models)),
                io.Image.Input("image"),
                io.Int.Input("seed", default=0, min=0, max=2**32 - 1, step=1),
                io.String.Input("refine_prompt", default="Take the provided text description and rewrite it to be more vivid, detailed, and engaging, while preserving the original meaning.", multiline=True),
                io.Combo.Input("refine_model", options=sorted(refine_models)),
                io.Int.Input("refine_seed", default=0, min=0, max=2**32 - 1, step=1)
            ],
            outputs=[
                io.String.Output("initial_response"),
                io.String.Output("refined_response")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from llm.py
        return io.NodeOutput("", "")

# ============================================================================

LLM_NODES = [
    Sage_ConstructLLMPrompt,
    Sage_ConstructLLMPromptExtra,
    Sage_OllamaAdvancedOptions,
    Sage_OllamaLLMPromptText,
    Sage_OllamaLLMPromptVision,
    Sage_OllamaLLMPromptVisionRefine,
    Sage_LMStudioLLMPromptText,
    Sage_LMStudioLLMPromptVision,
    Sage_LMStudioLLMPromptVisionRefine
]

"""
OLLAMA_CLASS_MAPPINGS = {
    "Sage_OllamaAdvancedOptions": Sage_OllamaAdvancedOptions,
    "Sage_OllamaLLMPromptText": Sage_OllamaLLMPromptText,
    "Sage_OllamaLLMPromptVision": Sage_OllamaLLMPromptVision,
    "Sage_OllamaLLMPromptVisionRefine": Sage_OllamaLLMPromptVisionRefine
}

LMSTUDIO_CLASS_MAPPINGS = {
    "Sage_LMStudioLLMPromptVision": Sage_LMStudioLLMPromptVision,
    "Sage_LMStudioLLMPromptText": Sage_LMStudioLLMPromptText,
    "Sage_LMStudioLLMPromptVisionRefine": Sage_LMStudioLLMPromptVisionRefine
}

LLM_CLASS_MAPPINGS = {
    "Sage_ConstructLLMPrompt": Sage_ConstructLLMPrompt,
    "Sage_ConstructLLMPromptExtra": Sage_ConstructLLMPromptExtra
}
"""
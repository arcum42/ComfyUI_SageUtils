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

from .custom_io_v3 import *

# Current status: Implemented by copilot using the original as reference.
# Need to review and test.

class Sage_ConstructLLMPrompt(io.ComfyNode):
    """Construct a prompt for an LLM based on the provided options."""
    @classmethod
    def define_schema(cls):
        prompt_list = []
        for key in llm_prompts["base"].keys():
            category = llm_prompts["base"][key]["category"]
            prompt_list.append(f"{category}/{key}")
        
        # Dynamic extras: add boolean inputs for llm_prompts["extra"] keys
        extra_inputs = []
        try:
            for ekey in llm_prompts.get("extra", {}).keys():
                extra_inputs.append(io.Boolean.Input(ekey, default=False))
        except Exception:
            extra_inputs = []
        return io.Schema(
            node_id="Sage_ConstructLLMPrompt",
            display_name="Construct LLM Prompt",
            description="Construct a prompt for an LLM based on the provided image and prompt.",
            category="Sage Utils/LLM",
            inputs=[
                io.Combo.Input("prompt", options=prompt_list),
                io.String.Input("extra_instructions", default="", multiline=True)
            ] + extra_inputs,
            outputs=[
                io.String.Output("out_prompt", display_name="prompt")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        selected = kwargs.get("prompt", "")
        extra = kwargs.get("extra_instructions", "")

        if not selected:
            return io.NodeOutput("")

        try:
            category = selected.split("/")[0]
            prompt_key = selected.split("/")[1]
        except Exception:
            return io.NodeOutput("")

        if category not in ("base", llm_prompts["base"].get(prompt_key, {}).get("category")):
            # tolerate category selection but require base prompt source
            pass

        if prompt_key not in llm_prompts["base"]:
            return io.NodeOutput("")

        prompt_text = llm_prompts["base"][prompt_key]["prompt"]

        if not prompt_text or prompt_text[-1] not in ".!?":
            prompt_text = prompt_text + "."
        if not prompt_text.endswith("\n"):
            prompt_text = prompt_text + "\n"

        # Append selected dynamic extras
        extras_cfg = llm_prompts.get("extra", {})
        for ekey, cfg in extras_cfg.items():
            if kwargs.get(ekey):
                line = cfg.get("prompt") if isinstance(cfg, dict) else str(cfg)
                if line:
                    prompt_text += line.rstrip() + "\n"

        extra = (extra or "").strip()
        if extra:
            prompt_text = prompt_text + extra + "\n"

        return io.NodeOutput(prompt_text)

class Sage_ConstructLLMPromptExtra(io.ComfyNode):
    """Construct extra instructions for an LLM based on the provided options."""
    @classmethod
    def define_schema(cls):
        # Dynamic extras: add boolean inputs for llm_prompts["extra"] keys
        extra_inputs = []
        try:
            for ekey in llm_prompts.get("extra", {}).keys():
                extra_inputs.append(io.Boolean.Input(ekey, default=False))
        except Exception:
            extra_inputs = []
        return io.Schema(
            node_id="Sage_ConstructLLMPromptExtra",
            display_name="Construct LLM Prompt Extra",
            description="Construct extra instructions for an LLM based on the provided options.",
            category="Sage Utils/LLM",
            inputs=[
                io.String.Input("extra_instructions", default="", multiline=True)
            ] + extra_inputs,
            outputs=[
                io.String.Output("extra")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # Build extra instructions from toggles + free text
        extras_cfg = llm_prompts.get("extra", {})
        extra_parts = []
        for ekey, cfg in extras_cfg.items():
            if kwargs.get(ekey):
                line = cfg.get("prompt") if isinstance(cfg, dict) else str(cfg)
                if line:
                    extra_parts.append(line.rstrip())
        extra_text = kwargs.get("extra_instructions", "")
        if extra_text:
            extra_parts.append(extra_text.strip())
        combined = ("\n\n".join(extra_parts)).strip()
        return io.NodeOutput(combined)

class Sage_OllamaAdvancedOptions(io.ComfyNode):
    """Get advanced options for Ollama LLMs."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_OllamaAdvancedOptions",
            display_name="Ollama Advanced Options",
            description="Get advanced options for LLMs.",
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
                OllamaOptions.Output("options")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        return io.NodeOutput(kwargs)

class Sage_OllamaLLMPromptText(io.ComfyNode):
    """Send a prompt to an Ollama language model and get a response."""
    @classmethod
    def define_schema(cls):
        models = get_cached_ollama_models_for_input_types()
        if not models:
            models = ["(Ollama not available)"]
        
        return io.Schema(
            node_id="Sage_OllamaLLMPromptText",
            display_name="Ollama LLM Prompt (Text)",
            description="Send a prompt to a language model and get a response. The model must be installed via Ollama.",
            category="Sage Utils/LLM/Ollama",
            inputs=[
                io.String.Input("prompt", default=DEFAULT_TEXT_PROMPT, multiline=True),
                io.Combo.Input("model", options=sorted(models)),
                io.Int.Input("seed", default=0, min=0, max=2**32 - 1, step=1),
                io.Float.Input("keep_alive", default=0.0, min=-1.0, max=60.0 * 60.0, step=1),
                OllamaOptions.Input("options", optional=True),
                io.String.Input("system_prompt", default="", multiline=True, optional=True)
            ],
            outputs=[
                io.String.Output("response")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        prompt = kwargs.get("prompt", DEFAULT_TEXT_PROMPT)
        model = kwargs.get("model")
        seed = kwargs.get("seed", 0)
        keep_alive = kwargs.get("keep_alive", 0.0)
        options = kwargs.get("options") or {}
        system_prompt = kwargs.get("system_prompt", "")

        if model == "(Ollama not available)" or not OLLAMA_AVAILABLE:
            return io.NodeOutput("")

        options = options or {}
        options["seed"] = seed
        try:
            response = llm.ollama_generate(model=model, prompt=prompt, system_prompt=system_prompt, keep_alive=keep_alive, options=options)
        except Exception:
            response = ""
        return io.NodeOutput(response)

class Sage_OllamaLLMPromptVision(io.ComfyNode):
    """Send a prompt with image to an Ollama vision model and get a response."""
    @classmethod
    def define_schema(cls):
        models = get_cached_ollama_vision_models_for_input_types()
        if not models:
            models = ["(No Ollama vision models available)"]
        
        return io.Schema(
            node_id="Sage_OllamaLLMPromptVision",
            display_name="Ollama LLM Prompt (Vision)",
            description="Send a prompt to a language model and get a response. Optionally, you can provide an image/s to the model if it supports multimodal input. The model must be installed via Ollama.",
            category="Sage Utils/LLM/Ollama",
            inputs=[
                io.String.Input("prompt", default=DEFAULT_VISION_PROMPT, multiline=True),
                io.Combo.Input("model", options=sorted(models)),
                io.Image.Input("image"),
                io.Int.Input("seed", default=0, min=0, max=2**32 - 1, step=1),
                io.Float.Input("keep_alive", default=0.0, min=-1.0, max=60.0 * 60.0, step=0.1),
                OllamaOptions.Input("options", optional=True),
                io.String.Input("system_prompt", default="", multiline=True, optional=True)
            ],
            outputs=[
                io.String.Output("response")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        prompt = kwargs.get("prompt", DEFAULT_VISION_PROMPT)
        model = kwargs.get("model")
        image = kwargs.get("image")
        seed = kwargs.get("seed", 0)
        keep_alive = kwargs.get("keep_alive", 0.0)
        options = kwargs.get("options") or {}
        system_prompt = kwargs.get("system_prompt", "")

        if model == "(No Ollama vision models available)" or not OLLAMA_AVAILABLE:
            return io.NodeOutput("")

        options = options or {}
        options["seed"] = seed
        try:
            response = llm.ollama_generate_vision(model=model, prompt=prompt, system_prompt=system_prompt, images=image, keep_alive=keep_alive, options=options)
        except Exception:
            response = ""
        return io.NodeOutput(response)

class Sage_OllamaLLMPromptVisionRefine(io.ComfyNode):
    """Send a prompt with image to an Ollama vision model, then refine the response."""
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
            description="Send a prompt to a language model and get a response. Optionally, you can provide an image/s to the model if it supports multimodal input. The model must be installed via Ollama.",
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
        prompt = kwargs.get("prompt", DEFAULT_VISION_PROMPT)
        model = kwargs.get("model")
        image = kwargs.get("image")
        seed = kwargs.get("seed", 0)
        refine_prompt = kwargs.get("refine_prompt", "")
        refine_model = kwargs.get("refine_model")
        refine_seed = kwargs.get("refine_seed", 0)

        if model == "(No Ollama vision models available)" or refine_model == "(Ollama not available)" or not OLLAMA_AVAILABLE:
            return io.NodeOutput("", "")

        try:
            initial, refined = llm.ollama_generate_vision_refine(
                model=model,
                prompt=prompt,
                images=image,
                options={"seed": seed},
                refine_model=refine_model,
                refine_prompt=refine_prompt,
                refine_options={"seed": refine_seed}
            )
        except Exception:
            initial, refined = "", ""
        return io.NodeOutput(initial, refined)

class Sage_LMStudioLLMPromptText(io.ComfyNode):
    """Send a prompt to an LM Studio language model and get a response."""
    @classmethod
    def define_schema(cls):
        models = get_cached_lmstudio_models_for_input_types()
        if not models:
            models = ["(LM Studio not available)"]
        
        return io.Schema(
            node_id="Sage_LMStudioLLMPromptText",
            display_name="LM Studio LLM Prompt (Text)",
            description="Send a prompt to a language model and get a response. The model must be installed via LM Studio.",
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
        prompt = kwargs.get("prompt", DEFAULT_TEXT_PROMPT)
        model = kwargs.get("model")
        seed = kwargs.get("seed", 0)
        load_for_seconds = kwargs.get("load_for_seconds", 0)

        if model == "(LM Studio not available)":
            return io.NodeOutput("")

        options = {"seed": seed}
        try:
            response = llm.lmstudio_generate(model=model, prompt=prompt, keep_alive=load_for_seconds, options=options)
        except Exception:
            response = ""
        return io.NodeOutput(response)

class Sage_LMStudioLLMPromptVision(io.ComfyNode):
    """Send a prompt with image to an LM Studio vision model and get a response."""
    @classmethod
    def define_schema(cls):
        models = get_cached_lmstudio_vision_models_for_input_types()
        if not models:
            models = ["(No LM Studio vision models available)"]
        
        return io.Schema(
            node_id="Sage_LMStudioLLMPromptVision",
            display_name="LM Studio LLM Prompt (Vision)",
            description="Send a prompt to a language model and get a response. Optionally, you can provide an image/s to the model if it supports multimodal input. The model must be installed via LM Studio.",
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
        prompt = kwargs.get("prompt", DEFAULT_VISION_PROMPT)
        model = kwargs.get("model")
        image = kwargs.get("image")
        seed = kwargs.get("seed", 0)
        load_for_seconds = kwargs.get("load_for_seconds", 0)

        if model == "(No LM Studio vision models available)":
            return io.NodeOutput("")

        options = {"seed": seed}
        try:
            response = llm.lmstudio_generate_vision(model=model, prompt=prompt, keep_alive=load_for_seconds, images=image, options=options)
        except Exception:
            response = ""
        return io.NodeOutput(response)

class Sage_LMStudioLLMPromptVisionRefine(io.ComfyNode):
    """Send a prompt with image to an LM Studio vision model, then refine the response."""
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
            description="Send a prompt to a language model and get a response. Optionally, you can provide an image/s to the model if it supports multimodal input. The model must be installed via LM Studio.",
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
        prompt = kwargs.get("prompt", DEFAULT_VISION_PROMPT)
        model = kwargs.get("model")
        image = kwargs.get("image")
        seed = kwargs.get("seed", 0)
        refine_prompt = kwargs.get("refine_prompt", "")
        refine_model = kwargs.get("refine_model")
        refine_seed = kwargs.get("refine_seed", 0)

        if model == "(No LM Studio vision models available)" or refine_model == "(LM Studio not available)":
            return io.NodeOutput("", "")

        try:
            initial, refined = llm.lmstudio_generate_vision_refine(
                model=model,
                prompt=prompt,
                images=image,
                options={"seed": seed},
                refine_model=refine_model,
                refine_prompt=refine_prompt,
                refine_options={"seed": refine_seed}
            )
        except Exception:
            initial, refined = "", ""
        return io.NodeOutput(initial, refined)

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
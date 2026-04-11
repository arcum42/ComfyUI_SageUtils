# This file contains nodes for working with Ollama LLMs.

from __future__ import annotations
from importlib.util import find_spec

from comfy_api.latest import io
from comfy.utils import ProgressBar

from ..utils.llm_wrapper import (
    ollama_generate_vision,
    ollama_generate_vision_refine,
    ollama_preload_model,
    ollama_generate_preloaded,
)
from ..utils.performance_fix import (
    get_cached_ollama_models_for_input_types,
    get_cached_ollama_vision_models_for_input_types,
)
from ..utils.settings import get_setting

import logging

from .custom_io_v3 import OllamaOptions

logger = logging.getLogger('sageutils.nodes.ollama_v3')

# Attempt to import ollama, if available. Set a flag if it is not available.
OLLAMA_AVAILABLE = find_spec("ollama") is not None

# Default vision prompt for LLMs.
DEFAULT_VISION_PROMPT = "Write a detailed description for this image. Use precise, unambiguous language. Avoid vague or general terms. This is going to be used as input for an AI image generator, so do not include anything other than the description, and do not break things into sections or use markdown."

# Default text prompt for LLMs.
DEFAULT_TEXT_PROMPT = "Write a detailed and coherent description of an image based on the provided list of tags."


def _should_reraise_llm_node_errors() -> bool:
    """Return whether LLM node exceptions should be re-raised after logging."""
    return bool(get_setting('llm_raise_node_exceptions', False))


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
                io.Int.Input("num_keep", display_name="num_keep", default=0, min=0, max=100, step=1),
                io.Int.Input("num_predict", display_name="num_predict", default=-1, min=-1, max=2048, step=1),
                io.Int.Input("top_k", display_name="top_k", default=40, min=1, max=1000, step=1),
                io.Float.Input("top_p", display_name="top_p", default=0.9, min=0.0, max=1.0, step=0.01),
                io.Int.Input("repeat_last_n", display_name="repeat_last_n", default=64, min=0, max=256, step=1),
                io.Float.Input("temperature", display_name="temperature", default=0.8, min=0.0, max=1.0, step=0.01),
                io.Float.Input("repeat_penalty", display_name="repeat_penalty", default=1.1, min=1.0, max=2.0, step=0.01),
                io.Float.Input("presence_penalty", display_name="presence_penalty", default=0.0, min=-2.0, max=2.0, step=0.01),
                io.Float.Input("frequency_penalty", display_name="frequency_penalty", default=0.0, min=-2.0, max=2.0, step=0.01)
            ],
            outputs=[
                OllamaOptions.Output("options", display_name="options")
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
                io.String.Input("prompt", display_name="prompt", default=DEFAULT_TEXT_PROMPT, multiline=True),
                io.Combo.Input("model", display_name="model", options=sorted(models)),
                io.Int.Input("seed", display_name="seed", default=0, min=0, max=2**32 - 1, step=1),
                io.Float.Input("keep_alive", display_name="keep_alive", default=0.0, min=-1.0, max=60.0 * 60.0, step=1),
                OllamaOptions.Input("options", display_name="options", optional=True),
                io.String.Input("system_prompt", display_name="system_prompt", default="", multiline=True, optional=True)
            ],
            outputs=[
                io.String.Output("response", display_name="response")
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
        pbar = ProgressBar(2)
        try:
            ollama_preload_model(model=model, keep_alive=keep_alive)
            pbar.update(1)
            response = ollama_generate_preloaded(model=model, prompt=prompt, keep_alive=keep_alive, options=options, system_prompt=system_prompt)
            pbar.update(1)
        except Exception:
            logger.exception('Ollama text node failed during preload or generation')
            if _should_reraise_llm_node_errors():
                raise
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
                io.String.Input("prompt", display_name="prompt", default=DEFAULT_VISION_PROMPT, multiline=True),
                io.Combo.Input("model", display_name="model", options=sorted(models)),
                io.Image.Input("image", display_name="image"),
                io.Int.Input("seed", display_name="seed", default=0, min=0, max=2**32 - 1, step=1),
                io.Float.Input("keep_alive", display_name="keep_alive", default=0.0, min=-1.0, max=60.0 * 60.0, step=0.1),
                OllamaOptions.Input("options", display_name="options", optional=True),
                io.String.Input("system_prompt", display_name="system_prompt", default="", multiline=True, optional=True)
            ],
            outputs=[
                io.String.Output("response", display_name="response")
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
        pbar = ProgressBar(2)
        try:
            ollama_preload_model(model=model, keep_alive=keep_alive)
            pbar.update(1)
            response = ollama_generate_vision(model=model, prompt=prompt, system_prompt=system_prompt, images=image, keep_alive=keep_alive, options=options)
            pbar.update(1)
        except Exception:
            logger.exception('Ollama vision node failed during preload or generation')
            if _should_reraise_llm_node_errors():
                raise
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

        pbar = ProgressBar(2)
        try:
            # Step 1: pre-warm the first model
            ollama_preload_model(model=model, keep_alive=0)
            pbar.update(1)
            # Step 2: generate initial vision response then refine
            initial, refined = ollama_generate_vision_refine(
                model=model,
                prompt=prompt,
                images=image,
                options={"seed": seed},
                refine_model=refine_model,
                refine_prompt=refine_prompt,
                refine_options={"seed": refine_seed}
            )
            pbar.update(1)
        except Exception:
            logger.exception('Ollama vision refine node failed during preload or generation')
            if _should_reraise_llm_node_errors():
                raise
            initial, refined = "", ""
        return io.NodeOutput(initial, refined)


OLLAMA_NODES = [
    Sage_OllamaAdvancedOptions,
    Sage_OllamaLLMPromptText,
    Sage_OllamaLLMPromptVision,
    Sage_OllamaLLMPromptVisionRefine,
]

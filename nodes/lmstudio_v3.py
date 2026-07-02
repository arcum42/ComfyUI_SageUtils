# This file contains nodes for working with LM Studio LLMs.

from __future__ import annotations

from comfy_api.latest import io
from comfy.utils import ProgressBar

from ..utils.llm.service import (
    lmstudio_rest_load_model,
    lmstudio_rest_generate,
    lmstudio_rest_generate_vision,
    lmstudio_rest_unload_model,
)
from ..utils.performance_fix import (
    get_cached_lmstudio_models_for_input_types,
    get_cached_lmstudio_vision_models_for_input_types,
)
from ..utils.settings import get_setting
from ..utils.constants import SAGE_UTILS_CAT

import logging

logger = logging.getLogger('sageutils.nodes.lmstudio_v3')

# Default vision prompt for LLMs.
DEFAULT_VISION_PROMPT = "Write a detailed description for this image. Use precise, unambiguous language. Avoid vague or general terms. This is going to be used as input for an AI image generator, so do not include anything other than the description, and do not break things into sections or use markdown."

# Default text prompt for LLMs.
DEFAULT_TEXT_PROMPT = "Write a detailed and coherent description of an image based on the provided list of tags."


def _should_reraise_llm_node_errors() -> bool:
    """Return whether LLM node exceptions should be re-raised after logging."""
    return bool(get_setting('llm_raise_node_exceptions', False))


class Sage_LMStudioLLMPromptText(io.ComfyNode):
    """Provider-specific text generation node using the LM Studio backend."""
    @classmethod
    def define_schema(cls):
        models = get_cached_lmstudio_models_for_input_types()
        if not models:
            models = ["(LM Studio not available)"]

        return io.Schema(
            node_id="Sage_LMStudioLLMPromptText",
            display_name="LM Studio LLM Prompt (Text)",
            description="Provider-specific text generation node for LM Studio models.",
            category=f"{SAGE_UTILS_CAT}/LLM/LM Studio",
            inputs=[
                io.String.Input("prompt", display_name="prompt", default=DEFAULT_TEXT_PROMPT, multiline=True, tooltip="Input value for prompt."),
                io.Combo.Input("model", display_name="model", options=sorted(models), tooltip="Input value for model."),
                io.Int.Input("seed", display_name="seed", default=0, min=0, max=2**32 - 1, step=1, tooltip="Input value for seed."),
                io.Int.Input("load_for_seconds", display_name="load_for_seconds", default=0, min=-1, max=60*60, step=1, tooltip="Input value for load_for_seconds.")
            ],
            outputs=[
                io.String.Output("response", display_name="response", tooltip="Output value for response.")
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        prompt = kwargs.get("prompt", DEFAULT_TEXT_PROMPT)
        model = kwargs.get("model")
        seed = kwargs.get("seed", 0)
        load_for_seconds = kwargs.get("load_for_seconds", 0)

        if not model or model == "(LM Studio not available)":
            return io.NodeOutput("")

        options = {"seed": seed}
        pbar = ProgressBar(2)
        model_loaded = False
        try:
            # Step 1: load model
            model_loaded = lmstudio_rest_load_model(model=model, keep_alive=load_for_seconds)
            pbar.update(1)
            # Step 2: generate
            response = lmstudio_rest_generate(model, prompt=prompt, options=options)
            if load_for_seconds < 1:
                lmstudio_rest_unload_model(model)
                model_loaded = False
            pbar.update(1)
        except Exception:
            logger.exception('LM Studio text node failed during load or generation')
            if model_loaded and load_for_seconds < 1:
                try:
                    lmstudio_rest_unload_model(model)
                except Exception:
                    pass
            if _should_reraise_llm_node_errors():
                raise
            response = ""
        return io.NodeOutput(response)


class Sage_LMStudioLLMPromptVision(io.ComfyNode):
    """Provider-specific vision generation node using the LM Studio backend."""
    @classmethod
    def define_schema(cls):
        models = get_cached_lmstudio_vision_models_for_input_types()
        if not models:
            models = ["(No LM Studio vision models available)"]

        return io.Schema(
            node_id="Sage_LMStudioLLMPromptVision",
            display_name="LM Studio LLM Prompt (Vision)",
            description="Provider-specific vision generation node for LM Studio models.",
            category=f"{SAGE_UTILS_CAT}/LLM/LM Studio",
            inputs=[
                io.String.Input("prompt", display_name="prompt", default=DEFAULT_VISION_PROMPT, multiline=True, tooltip="Input value for prompt."),
                io.Combo.Input("model", display_name="model", options=sorted(models), tooltip="Input value for model."),
                io.Image.Input("image", display_name="image", tooltip="Input value for image."),
                io.Int.Input("seed", display_name="seed", default=0, min=0, max=2**32 - 1, step=1, tooltip="Input value for seed."),
                io.Int.Input("load_for_seconds", display_name="load_for_seconds", default=0, min=-1, max=60*60, step=1, tooltip="Input value for load_for_seconds.")
            ],
            outputs=[
                io.String.Output("response", display_name="response", tooltip="Output value for response.")
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        prompt = kwargs.get("prompt", DEFAULT_VISION_PROMPT)
        model = kwargs.get("model")
        image = kwargs.get("image")
        seed = kwargs.get("seed", 0)
        load_for_seconds = kwargs.get("load_for_seconds", 0)

        if not model or model == "(No LM Studio vision models available)":
            return io.NodeOutput("")

        options = {"seed": seed}
        pbar = ProgressBar(2)
        model_loaded = False
        try:
            # Step 1: load model
            model_loaded = lmstudio_rest_load_model(model=model, keep_alive=load_for_seconds)
            pbar.update(1)
            # Step 2: generate vision response
            response = lmstudio_rest_generate_vision(model, prompt=prompt, images=image, options=options)
            if load_for_seconds < 1:
                lmstudio_rest_unload_model(model)
                model_loaded = False
            pbar.update(1)
        except Exception:
            logger.exception('LM Studio vision node failed during load or generation')
            if model_loaded and load_for_seconds < 1:
                try:
                    lmstudio_rest_unload_model(model)
                except Exception:
                    pass
            if _should_reraise_llm_node_errors():
                raise
            response = ""
        return io.NodeOutput(response)


class Sage_LMStudioLLMPromptVisionRefine(io.ComfyNode):
    """Provider-specific vision-refine node using the LM Studio backend."""
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
            description="Provider-specific vision-refine node for LM Studio models.",
            category=f"{SAGE_UTILS_CAT}/LLM/LM Studio",
            inputs=[
                io.String.Input("prompt", default=DEFAULT_VISION_PROMPT, multiline=True, tooltip="The text prompt for the initial vision generation pass."),
                io.Combo.Input("model", options=sorted(models), tooltip="The LM Studio vision model used for initial generation."),
                io.Image.Input("image", tooltip="The reference image sent to the LM Studio vision model."),
                io.Int.Input("seed", default=0, min=0, max=2**32 - 1, step=1, tooltip="Seed for the initial generation pass."),
                io.String.Input("refine_prompt", default="Take the provided text description and rewrite it to be more vivid, detailed, and engaging, while preserving the original meaning.", multiline=True, tooltip="Instructions used for the second, refinement pass."),
                io.Combo.Input("refine_model", options=sorted(refine_models), tooltip="The LM Studio model used for the refinement pass."),
                io.Int.Input("refine_seed", default=0, min=0, max=2**32 - 1, step=1, tooltip="Seed for the refinement pass."),
            ],
            outputs=[
                io.String.Output("initial_response", tooltip="The initial vision response returned by the LM Studio model."),
                io.String.Output("refined_response", tooltip="The refined vision response returned by the second pass."),
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        prompt = kwargs.get("prompt", DEFAULT_VISION_PROMPT)
        model = kwargs.get("model")
        image = kwargs.get("image")
        seed = kwargs.get("seed", 0)
        refine_prompt = kwargs.get("refine_prompt", "")
        refine_model = kwargs.get("refine_model") or model
        refine_seed = kwargs.get("refine_seed", 0)
        actual_refine_prompt = refine_prompt or prompt

        if (
            not model
            or not refine_model
            or model == "(No LM Studio vision models available)"
            or refine_model == "(LM Studio not available)"
        ):
            return io.NodeOutput("", "")

        pbar = ProgressBar(2)
        model_loaded = False
        loaded_model_name = ''
        try:
            # Step 1: load vision model
            model_loaded = lmstudio_rest_load_model(model=model, keep_alive=0)
            loaded_model_name = model
            pbar.update(1)
            # Step 2: generate initial vision response, then refine
            initial = lmstudio_rest_generate_vision(model, prompt=prompt, images=image, options={"seed": seed})
            if refine_model != model:
                lmstudio_rest_unload_model(model)
                model_loaded = lmstudio_rest_load_model(model=refine_model, keep_alive=0)
                loaded_model_name = refine_model
            combined_refine_prompt = f'{actual_refine_prompt}\n{initial}'
            refined = lmstudio_rest_generate(refine_model, prompt=combined_refine_prompt, options={"seed": refine_seed})
            lmstudio_rest_unload_model(loaded_model_name)
            model_loaded = False
            loaded_model_name = ''
            pbar.update(1)
        except Exception:
            logger.exception('LM Studio vision refine node failed during load or generation')
            if model_loaded and loaded_model_name:
                try:
                    lmstudio_rest_unload_model(loaded_model_name)
                except Exception:
                    pass
            if _should_reraise_llm_node_errors():
                raise
            initial, refined = "", ""
        return io.NodeOutput(initial, refined)


LMSTUDIO_NODES = [
    # lm studio llm nodes
    Sage_LMStudioLLMPromptText,
    Sage_LMStudioLLMPromptVision,
    Sage_LMStudioLLMPromptVisionRefine,
]

# This file contains nodes for working with LM Studio LLMs.

from __future__ import annotations

from comfy_api.latest import io
from comfy.utils import ProgressBar

from ..utils.llm_wrapper import (
    lmstudio_load_model,
    lmstudio_generate_with_model,
    lmstudio_generate_vision_with_model,
    lmstudio_unload_model,
)
from ..utils.performance_fix import (
    get_cached_lmstudio_models_for_input_types,
    get_cached_lmstudio_vision_models_for_input_types,
)
from ..utils.settings import get_setting

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
            category="Sage Utils/LLM/LM Studio",
            inputs=[
                io.String.Input("prompt", display_name="prompt", default=DEFAULT_TEXT_PROMPT, multiline=True),
                io.Combo.Input("model", display_name="model", options=sorted(models)),
                io.Int.Input("seed", display_name="seed", default=0, min=0, max=2**32 - 1, step=1),
                io.Int.Input("load_for_seconds", display_name="load_for_seconds", default=0, min=-1, max=60*60, step=1)
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
        load_for_seconds = kwargs.get("load_for_seconds", 0)

        if not model or model == "(LM Studio not available)":
            return io.NodeOutput("")

        options = {"seed": seed}
        pbar = ProgressBar(2)
        lms_model = None
        try:
            # Step 1: load model
            lms_model = lmstudio_load_model(model=model, keep_alive=load_for_seconds)
            pbar.update(1)
            # Step 2: generate
            response = lmstudio_generate_with_model(lms_model, prompt=prompt, options=options)
            if load_for_seconds < 1:
                lmstudio_unload_model(lms_model)
                lms_model = None
            pbar.update(1)
        except Exception:
            logger.exception('LM Studio text node failed during load or generation')
            if lms_model is not None and load_for_seconds < 1:
                try:
                    lmstudio_unload_model(lms_model)
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
            category="Sage Utils/LLM/LM Studio",
            inputs=[
                io.String.Input("prompt", display_name="prompt", default=DEFAULT_VISION_PROMPT, multiline=True),
                io.Combo.Input("model", display_name="model", options=sorted(models)),
                io.Image.Input("image", display_name="image"),
                io.Int.Input("seed", display_name="seed", default=0, min=0, max=2**32 - 1, step=1),
                io.Int.Input("load_for_seconds", display_name="load_for_seconds", default=0, min=-1, max=60*60, step=1)
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
        load_for_seconds = kwargs.get("load_for_seconds", 0)

        if not model or model == "(No LM Studio vision models available)":
            return io.NodeOutput("")

        options = {"seed": seed}
        pbar = ProgressBar(2)
        lms_model = None
        try:
            # Step 1: load model
            lms_model = lmstudio_load_model(model=model, keep_alive=load_for_seconds)
            pbar.update(1)
            # Step 2: generate vision response
            response = lmstudio_generate_vision_with_model(lms_model, prompt=prompt, images=image, options=options)
            if load_for_seconds < 1:
                lmstudio_unload_model(lms_model)
                lms_model = None
            pbar.update(1)
        except Exception:
            logger.exception('LM Studio vision node failed during load or generation')
            if lms_model is not None and load_for_seconds < 1:
                try:
                    lmstudio_unload_model(lms_model)
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
        lms_model = None
        try:
            # Step 1: load vision model
            lms_model = lmstudio_load_model(model=model, keep_alive=0)
            pbar.update(1)
            # Step 2: generate initial vision response, then refine
            initial = lmstudio_generate_vision_with_model(lms_model, prompt=prompt, images=image, options={"seed": seed})
            if refine_model != model:
                lmstudio_unload_model(lms_model)
                lms_model = lmstudio_load_model(model=refine_model, keep_alive=0)
            combined_refine_prompt = f'{actual_refine_prompt}\n{initial}'
            refined = lmstudio_generate_with_model(lms_model, prompt=combined_refine_prompt, options={"seed": refine_seed})
            lmstudio_unload_model(lms_model)
            lms_model = None
            pbar.update(1)
        except Exception:
            logger.exception('LM Studio vision refine node failed during load or generation')
            if lms_model is not None:
                try:
                    lmstudio_unload_model(lms_model)
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

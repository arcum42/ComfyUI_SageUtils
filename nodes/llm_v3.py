# This file contains nodes for working with LLMs.

# The llm_prompts.json file contains prompts that can be used with LLMs.
# The original source of some of these prompts is the ComfyUI-joycaption-beta-one-GGUF repository, 
# which adapted it from ComfyUI_LayerStyle_Advance.

# I've heavily modified the original prompts, adding some, getting rid of some, and rephrasing others.

# https://github.com/chflame163/ComfyUI_LayerStyle_Advance
# https://github.com/judian17/ComfyUI-joycaption-beta-one-GGUF

# See ref_docs/v3_migration.md for info on migrating to v3 nodes.

from __future__ import annotations

from comfy_api.latest import io

from ..utils.config_manager import llm_prompts

import logging

from ..utils.performance_fix import (
    get_cached_ollama_models_for_input_types,
    get_cached_ollama_vision_models_for_input_types,
)
from ..utils.performance_fix import (
    get_cached_lmstudio_models_for_input_types,
    get_cached_lmstudio_vision_models_for_input_types,
)

from .custom_io_v3 import *
from .ollama_v3 import (
    Sage_OllamaAdvancedOptions,
    Sage_OllamaLLMPromptText,
    Sage_OllamaLLMPromptVision,
    Sage_OllamaLLMPromptVisionRefine,
    OLLAMA_NODES,
)
from .lmstudio_v3 import (
    Sage_LMStudioLLMPromptText,
    Sage_LMStudioLLMPromptVision,
    Sage_LMStudioLLMPromptVisionRefine,
    LMSTUDIO_NODES,
)

from ..utils.model_discovery import get_model_list

logger = logging.getLogger('sageutils.nodes.llm_v3')

# Default vision prompt for LLMs.
DEFAULT_VISION_PROMPT = "Write a detailed description for this image. Use precise, unambiguous language. Avoid vague or general terms. This is going to be used as input for an AI image generator, so do not include anything other than the description, and do not break things into sections or use markdown."

# Default text prompt for LLMs.
DEFAULT_TEXT_PROMPT = "Write a detailed and coherent description of an image based on the provided list of tags."


class Sage_ConstructLLMPrompt(io.ComfyNode):
    """Construct a prompt for an LLM based on the provided options."""
    @classmethod
    def define_schema(cls):
        prompt_list = []
        for key in llm_prompts["base"].keys():
            category = llm_prompts["base"][key]["category"]
            prompt_list.append(f"{category}/{key}")
        
        # Dynamic extras: add boolean inputs for llm_prompts["extra"] keys
        # Only include extras in (style, quality, content_focus) categories
        extra_inputs = []
        try:
            for ekey in llm_prompts.get("extra", {}).keys():
                cfg = llm_prompts["extra"][ekey]
                if cfg.get("category") in ("style", "quality", "content_focus"):
                    if cfg.get("type") == "boolean":
                        default_value = cfg.get("default", False)
                        tooltip = cfg.get("name", ekey)
                        extra_inputs.append(io.Boolean.Input(ekey, default=default_value, tooltip=tooltip))
        except Exception:
            extra_inputs = []
        return io.Schema(
            node_id="Sage_ConstructLLMPrompt",
            display_name="Construct LLM Prompt",
            description="Construct a prompt for an LLM based on the provided image and prompt.",
            category="Sage Utils/LLM",
            inputs=[
                io.Combo.Input("prompt", display_name="prompt", options=prompt_list),
                io.String.Input("extra_instructions", display_name="extra_instructions", default="", multiline=True)
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
        # Only include extras NOT in (style, quality, content_focus) categories
        extra_inputs = []
        try:
            for ekey in llm_prompts.get("extra", {}).keys():
                cfg = llm_prompts["extra"][ekey]
                if cfg.get("category") not in ("style", "quality", "content_focus"):
                    if cfg.get("type") == "boolean":
                        default_value = cfg.get("default", False)
                        tooltip = cfg.get("name", ekey)
                        extra_inputs.append(io.Boolean.Input(ekey, default=default_value, tooltip=tooltip))
        except Exception:
            extra_inputs = []
        return io.Schema(
            node_id="Sage_ConstructLLMPromptExtra",
            display_name="Construct LLM Prompt Extra",
            description="Construct extra instructions for an LLM based on the provided options.",
            category="Sage Utils/LLM",
            inputs=[
                io.String.Input("extra_instructions", display_name="extra_instructions", default="", multiline=True),
            ] + extra_inputs,
            outputs=[
                io.String.Output("extra", display_name="extra")
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

class Sage_LLMPromptText(io.ComfyNode):
    """Base node for LLM text prompts."""
    @classmethod
    def define_schema(cls):
        default_provider = "ollama"
        ollama_models = get_cached_ollama_models_for_input_types()
        if not ollama_models:
            ollama_models = ["(Ollama not available)"]
            default_provider = "lmstudio"  # switch default to LM Studio if Ollama isn't available
        lm_models = get_cached_lmstudio_models_for_input_types()
        if not lm_models:
            lm_models = ["(LM Studio not available)"]

        provider_options = [
                    io.DynamicCombo.Option("Ollama", 
                        [io.Combo.Input("ollama_model", display_name="model", options=sorted(ollama_models)),],),
                    io.DynamicCombo.Option("LM Studio", 
                        [io.Combo.Input("lm_model", display_name="model", options=sorted(lm_models)),],),
                    io.DynamicCombo.Option("Native", 
                        [io.Combo.Input("native_model", display_name="model", options=get_model_list("clip")),])
                ]

        return io.Schema(
            node_id="Sage_LLMPromptText",
            display_name="Ollama LLM Prompt (Text)",
            description="Send a prompt to a language model and get a response. The model must be installed via Ollama.",
            category="Sage Utils/LLM",
            inputs=[
                io.String.Input("prompt", display_name="prompt", default=DEFAULT_TEXT_PROMPT, multiline=True),
                io.DynamicCombo.Input("provider", display_name="provider", options= provider_options),
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
        # This base node does not implement actual LLM logic, it just passes through the prompt.
        model_lists = kwargs.get("provider", {})
        
        prompt = kwargs.get("prompt", "")
        return io.NodeOutput(prompt)

class Sage_LLMPromptVision(io.ComfyNode):
    """Base node for LLM vision prompts."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_LLMPromptVision",
            display_name="LLM Prompt Vision",
            description="Base node for LLM vision prompts.",
            category="Sage Utils/LLM",
            inputs=[
                io.String.Input("prompt", display_name="prompt", multiline=True),
                io.Image.Input("images", display_name="images")
            ],
            outputs=[
                io.String.Output("out_prompt", display_name="prompt"),
                io.Image.Output("out_images", display_name="images")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        prompt = kwargs.get("prompt", "")
        images = kwargs.get("images", None)
        return io.NodeOutput(prompt, images)

class Sage_LLMPromptVisionRefine(io.ComfyNode):
    """Base node for refining LLM vision prompts."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_LLMPromptVisionRefine",
            display_name="LLM Prompt Vision Refine",
            description="Base node for refining LLM vision prompts.",
            category="Sage Utils/LLM",
            inputs=[
                io.String.Input("prompt", display_name="prompt", multiline=True),
                io.Image.Input("images", display_name="images"),
                io.String.Input("refine_instructions", display_name="refine_instructions", multiline=True)
            ],
            outputs=[
                io.String.Output("out_prompt", display_name="prompt"),
                io.Image.Output("out_images", display_name="images")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        prompt = kwargs.get("prompt", "")
        images = kwargs.get("images", None)
        refine_instructions = kwargs.get("refine_instructions", "")
        # This base node does not implement actual refinement logic, it just passes through inputs.
        return io.NodeOutput(prompt, images)

# ============================================================================

LLM_NODES = [
    Sage_ConstructLLMPrompt,
    Sage_ConstructLLMPromptExtra,
] + OLLAMA_NODES + LMSTUDIO_NODES
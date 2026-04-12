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
from comfy.utils import ProgressBar

from ..utils.config_manager import llm_prompts
from ..utils.settings import get_setting

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
        extra_inputs: list[io.Input] = []
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

        schema_inputs: list[io.Input] = [
            io.Combo.Input("prompt", display_name="prompt", options=prompt_list),
            io.String.Input("extra_instructions", display_name="extra_instructions", default="", multiline=True),
        ]
        schema_inputs.extend(extra_inputs)
        return io.Schema(
            node_id="Sage_ConstructLLMPrompt",
            display_name="Construct LLM Prompt",
            description="Construct a prompt for an LLM based on the provided image and prompt.",
            category="Sage Utils/LLM",
            inputs=schema_inputs,
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
        extra_inputs: list[io.Input] = []
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

        schema_inputs: list[io.Input] = [
            io.String.Input("extra_instructions", display_name="extra_instructions", default="", multiline=True),
        ]
        schema_inputs.extend(extra_inputs)
        return io.Schema(
            node_id="Sage_ConstructLLMPromptExtra",
            display_name="Construct LLM Prompt Extra",
            description="Construct extra instructions for an LLM based on the provided options.",
            category="Sage Utils/LLM",
            inputs=schema_inputs,
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
    """Unified text generation node that switches between Ollama, LM Studio, and Native providers."""
    @classmethod
    def define_schema(cls):
        ollama_models = get_cached_ollama_models_for_input_types()
        if not ollama_models:
            ollama_models = ["(Ollama not available)"]

        lm_models = get_cached_lmstudio_models_for_input_types()
        if not lm_models:
            lm_models = ["(LM Studio not available)"]

        native_inputs = [
            io.Clip.Input("native_clip", display_name="model"),
            io.Int.Input("native_max_length", display_name="max_length", default=256, min=1, max=2048),
            io.Boolean.Input("native_thinking", display_name="thinking", default=False, optional=True, tooltip="Enable model thinking mode if supported by the loaded CLIP model."),
            io.DynamicCombo.Input("native_sampling", display_name="sampling", options=[
                io.DynamicCombo.Option("Default", []),
                io.DynamicCombo.Option("Advanced", [
                    io.Boolean.Input("native_do_sample", display_name="do_sample", default=True, tooltip="Disable for deterministic greedy decoding."),
                    io.Float.Input("native_temperature", display_name="temperature", default=0.7, min=0.01, max=2.0, step=0.000001, tooltip="Higher values increase randomness."),
                    io.Int.Input("native_top_k", display_name="top_k", default=64, min=0, max=1000, tooltip="Limit token sampling to top K candidates."),
                    io.Float.Input("native_top_p", display_name="top_p", default=0.95, min=0.0, max=1.0, step=0.01, tooltip="Nucleus sampling cutoff probability."),
                    io.Float.Input("native_min_p", display_name="min_p", default=0.05, min=0.0, max=1.0, step=0.01, tooltip="Minimum probability floor for candidate tokens."),
                    io.Float.Input("native_repetition_penalty", display_name="repetition_penalty", default=1.05, min=0.0, max=5.0, step=0.01, tooltip="Penalize repeating previously generated tokens."),
                    io.Float.Input("native_presence_penalty", display_name="presence_penalty", default=0.0, min=0.0, max=5.0, step=0.01, tooltip="Encourage introducing new tokens/topics."),
                ]),
            ]),
        ]

        provider_options = [
            io.DynamicCombo.Option(
                "Ollama",
                [
                    io.Combo.Input("ollama_model", display_name="model", options=sorted(ollama_models)),
                    io.Float.Input("ollama_keep_alive", display_name="keep_alive", default=0.0, min=-1.0, max=60.0 * 60.0, step=1, advanced=True, tooltip="How long to keep the model loaded after generation (-1 keeps it resident)."),
                    OllamaOptions.Input("ollama_options", display_name="options", optional=True, advanced=True, tooltip="Optional low-level Ollama generation parameters."),
                    io.String.Input("ollama_system_prompt", display_name="system_prompt", default="", multiline=True, optional=True, advanced=True, tooltip="Optional system instruction prepended as model context."),
                ],
            ),
            io.DynamicCombo.Option(
                "LM Studio",
                [
                    io.Combo.Input("lm_model", display_name="model", options=sorted(lm_models)),
                    io.Int.Input("lm_load_for_seconds", display_name="load_for_seconds", default=0, min=-1, max=60 * 60, step=1, advanced=True, tooltip="How long to keep model loaded in LM Studio (seconds)."),
                ],
            ),
            io.DynamicCombo.Option("Native", native_inputs),
        ]

        return io.Schema(
            node_id="Sage_LLMPromptText",
            display_name="LLM Prompt (Text)",
            description="Unified provider-switching text generation node for Ollama, LM Studio, and Native CLIP.",
            category="Sage Utils/LLM",
            inputs=[
                io.String.Input("prompt", display_name="prompt", default=DEFAULT_TEXT_PROMPT, multiline=True),
                io.DynamicCombo.Input("provider", display_name="provider", options=provider_options, tooltip="Pick the backend provider and its model/runtime settings."),
                io.Int.Input("seed", display_name="seed", default=0, min=0, max=2**32 - 1, step=1, tooltip="Base seed used by all providers (provider-specific behavior may vary)."),
            ],
            outputs=[
                io.String.Output("response", display_name="response")
            ]
        )

    
    @classmethod
    def execute(cls, **kwargs):
        prompt = kwargs.get("prompt", DEFAULT_TEXT_PROMPT)
        seed = kwargs.get("seed", 0)
        provider_data = kwargs.get("provider") or {}
        provider = provider_data.get("provider", "Ollama")
        native_sampling = _get_native_sampling_config(provider_data)

        try:
            if provider == "Ollama":
                return Sage_OllamaLLMPromptText.execute(
                    prompt=prompt,
                    model=provider_data.get("ollama_model"),
                    seed=seed,
                    keep_alive=provider_data.get("ollama_keep_alive", 0.0),
                    options=provider_data.get("ollama_options") or {},
                    system_prompt=provider_data.get("ollama_system_prompt", ""),
                )

            if provider == "LM Studio":
                return Sage_LMStudioLLMPromptText.execute(
                    prompt=prompt,
                    model=provider_data.get("lm_model"),
                    seed=seed,
                    load_for_seconds=provider_data.get("lm_load_for_seconds", 0),
                )

            return io.NodeOutput(
                _native_generate_text(
                    clip=provider_data.get("native_clip"),
                    prompt=prompt,
                    seed=seed,
                    max_length=provider_data.get("native_max_length", 256),
                    thinking=provider_data.get("native_thinking", False),
                    do_sample=native_sampling["do_sample"],
                    temperature=native_sampling["temperature"],
                    top_k=native_sampling["top_k"],
                    top_p=native_sampling["top_p"],
                    min_p=native_sampling["min_p"],
                    repetition_penalty=native_sampling["repetition_penalty"],
                    presence_penalty=native_sampling["presence_penalty"],
                )
            )
        except Exception:
            logger.exception('Provider-switching text node failed during generation')
            if _should_reraise_llm_node_errors():
                raise
            return io.NodeOutput("")

class Sage_LLMPromptVision(io.ComfyNode):
    """Unified vision generation node that switches between Ollama, LM Studio, and Native providers."""
    @classmethod
    def define_schema(cls):
        ollama_models = get_cached_ollama_vision_models_for_input_types()
        if not ollama_models:
            ollama_models = ["(No Ollama vision models available)"]

        lm_models = get_cached_lmstudio_vision_models_for_input_types()
        if not lm_models:
            lm_models = ["(No LM Studio vision models available)"]

        native_inputs = [
            io.Clip.Input("native_clip", display_name="model"),
            io.Int.Input("native_max_length", display_name="max_length", default=256, min=1, max=2048),
            io.Boolean.Input("native_thinking", display_name="thinking", default=False, optional=True, tooltip="Enable model thinking mode if supported by the loaded CLIP model."),
            io.DynamicCombo.Input("native_sampling", display_name="sampling", options=[
                io.DynamicCombo.Option("Default", []),
                io.DynamicCombo.Option("Advanced", [
                    io.Boolean.Input("native_do_sample", display_name="do_sample", default=True, tooltip="Disable for deterministic greedy decoding."),
                    io.Float.Input("native_temperature", display_name="temperature", default=0.7, min=0.01, max=2.0, step=0.000001, tooltip="Higher values increase randomness."),
                    io.Int.Input("native_top_k", display_name="top_k", default=64, min=0, max=1000, tooltip="Limit token sampling to top K candidates."),
                    io.Float.Input("native_top_p", display_name="top_p", default=0.95, min=0.0, max=1.0, step=0.01, tooltip="Nucleus sampling cutoff probability."),
                    io.Float.Input("native_min_p", display_name="min_p", default=0.05, min=0.0, max=1.0, step=0.01, tooltip="Minimum probability floor for candidate tokens."),
                    io.Float.Input("native_repetition_penalty", display_name="repetition_penalty", default=1.05, min=0.0, max=5.0, step=0.01, tooltip="Penalize repeating previously generated tokens."),
                    io.Float.Input("native_presence_penalty", display_name="presence_penalty", default=0.0, min=0.0, max=5.0, step=0.01, tooltip="Encourage introducing new tokens/topics."),
                ]),
            ]),
        ]

        provider_options = [
            io.DynamicCombo.Option(
                "Ollama",
                [
                    io.Combo.Input("ollama_model", display_name="model", options=sorted(ollama_models)),
                    io.Float.Input("ollama_keep_alive", display_name="keep_alive", default=0.0, min=-1.0, max=60.0 * 60.0, step=0.1, advanced=True, tooltip="How long to keep the model loaded after generation (-1 keeps it resident)."),
                    OllamaOptions.Input("ollama_options", display_name="options", optional=True, advanced=True, tooltip="Optional low-level Ollama generation parameters."),
                    io.String.Input("ollama_system_prompt", display_name="system_prompt", default="", multiline=True, optional=True, advanced=True, tooltip="Optional system instruction prepended as model context."),
                ],
            ),
            io.DynamicCombo.Option(
                "LM Studio",
                [
                    io.Combo.Input("lm_model", display_name="model", options=sorted(lm_models)),
                    io.Int.Input("lm_load_for_seconds", display_name="load_for_seconds", default=0, min=-1, max=60 * 60, step=1, advanced=True, tooltip="How long to keep model loaded in LM Studio (seconds)."),
                ],
            ),
            io.DynamicCombo.Option("Native", native_inputs),
        ]

        return io.Schema(
            node_id="Sage_LLMPromptVision",
            display_name="LLM Prompt (Vision)",
            description="Unified provider-switching vision generation node for Ollama, LM Studio, and Native CLIP.",
            category="Sage Utils/LLM",
            inputs=[
                io.String.Input("prompt", display_name="prompt", default=DEFAULT_VISION_PROMPT, multiline=True),
                io.Image.Input("image", display_name="image"),
                io.DynamicCombo.Input("provider", display_name="provider", options=provider_options, tooltip="Pick the backend provider and its model/runtime settings."),
                io.Int.Input("seed", display_name="seed", default=0, min=0, max=2**32 - 1, step=1, tooltip="Base seed used by all providers (provider-specific behavior may vary)."),
            ],
            outputs=[
                io.String.Output("response", display_name="response")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        prompt = kwargs.get("prompt", DEFAULT_VISION_PROMPT)
        image = kwargs.get("image")
        seed = kwargs.get("seed", 0)
        provider_data = kwargs.get("provider") or {}
        provider = provider_data.get("provider", "Ollama")
        native_sampling = _get_native_sampling_config(provider_data)

        try:
            if provider == "Ollama":
                return Sage_OllamaLLMPromptVision.execute(
                    prompt=prompt,
                    model=provider_data.get("ollama_model"),
                    image=image,
                    seed=seed,
                    keep_alive=provider_data.get("ollama_keep_alive", 0.0),
                    options=provider_data.get("ollama_options") or {},
                    system_prompt=provider_data.get("ollama_system_prompt", ""),
                )

            if provider == "LM Studio":
                return Sage_LMStudioLLMPromptVision.execute(
                    prompt=prompt,
                    model=provider_data.get("lm_model"),
                    image=image,
                    seed=seed,
                    load_for_seconds=provider_data.get("lm_load_for_seconds", 0),
                )

            return io.NodeOutput(
                _native_generate_text(
                    clip=provider_data.get("native_clip"),
                    prompt=prompt,
                    image=image,
                    seed=seed,
                    max_length=provider_data.get("native_max_length", 256),
                    thinking=provider_data.get("native_thinking", False),
                    do_sample=native_sampling["do_sample"],
                    temperature=native_sampling["temperature"],
                    top_k=native_sampling["top_k"],
                    top_p=native_sampling["top_p"],
                    min_p=native_sampling["min_p"],
                    repetition_penalty=native_sampling["repetition_penalty"],
                    presence_penalty=native_sampling["presence_penalty"],
                )
            )
        except Exception:
            logger.exception('Provider-switching vision node failed during generation')
            if _should_reraise_llm_node_errors():
                raise
            return io.NodeOutput("")

class Sage_LLMPromptVisionRefine(io.ComfyNode):
    """Unified vision-refine node that performs initial generation plus a refinement pass per selected provider."""
    @classmethod
    def define_schema(cls):
        ollama_models = get_cached_ollama_vision_models_for_input_types()
        if not ollama_models:
            ollama_models = ["(No Ollama vision models available)"]

        ollama_refine_models = get_cached_ollama_models_for_input_types()
        if not ollama_refine_models:
            ollama_refine_models = ["(Ollama not available)"]

        lm_models = get_cached_lmstudio_vision_models_for_input_types()
        if not lm_models:
            lm_models = ["(No LM Studio vision models available)"]

        lm_refine_models = get_cached_lmstudio_models_for_input_types()
        if not lm_refine_models:
            lm_refine_models = ["(LM Studio not available)"]

        native_inputs = [
            io.Clip.Input("native_clip", display_name="model"),
            io.Clip.Input("native_refine_clip", display_name="refine_model", optional=True, advanced=True, tooltip="Optional second CLIP model used only for the refine pass."),
            io.Int.Input("native_max_length", display_name="max_length", default=256, min=1, max=2048),
            io.Boolean.Input("native_thinking", display_name="thinking", default=False, optional=True, tooltip="Enable model thinking mode if supported by the loaded CLIP model."),
            io.DynamicCombo.Input("native_sampling", display_name="sampling", options=[
                io.DynamicCombo.Option("Default", []),
                io.DynamicCombo.Option("Advanced", [
                    io.Boolean.Input("native_do_sample", display_name="do_sample", default=True, tooltip="Disable for deterministic greedy decoding."),
                    io.Float.Input("native_temperature", display_name="temperature", default=0.7, min=0.01, max=2.0, step=0.000001, tooltip="Higher values increase randomness."),
                    io.Int.Input("native_top_k", display_name="top_k", default=64, min=0, max=1000, tooltip="Limit token sampling to top K candidates."),
                    io.Float.Input("native_top_p", display_name="top_p", default=0.95, min=0.0, max=1.0, step=0.01, tooltip="Nucleus sampling cutoff probability."),
                    io.Float.Input("native_min_p", display_name="min_p", default=0.05, min=0.0, max=1.0, step=0.01, tooltip="Minimum probability floor for candidate tokens."),
                    io.Float.Input("native_repetition_penalty", display_name="repetition_penalty", default=1.05, min=0.0, max=5.0, step=0.01, tooltip="Penalize repeating previously generated tokens."),
                    io.Float.Input("native_presence_penalty", display_name="presence_penalty", default=0.0, min=0.0, max=5.0, step=0.01, tooltip="Encourage introducing new tokens/topics."),
                ]),
            ]),
        ]

        provider_options = [
            io.DynamicCombo.Option(
                "Ollama",
                [
                    io.Combo.Input("ollama_model", display_name="model", options=sorted(ollama_models)),
                    io.Combo.Input("ollama_refine_model", display_name="refine_model", options=sorted(ollama_refine_models)),
                ],
            ),
            io.DynamicCombo.Option(
                "LM Studio",
                [
                    io.Combo.Input("lm_model", display_name="model", options=sorted(lm_models)),
                    io.Combo.Input("lm_refine_model", display_name="refine_model", options=sorted(lm_refine_models)),
                ],
            ),
            io.DynamicCombo.Option("Native", native_inputs),
        ]

        return io.Schema(
            node_id="Sage_LLMPromptVisionRefine",
            display_name="LLM Prompt (Vision) Refined",
            description="Unified provider-switching vision-refine node that outputs both initial and refined responses.",
            category="Sage Utils/LLM",
            inputs=[
                io.String.Input("prompt", display_name="prompt", default=DEFAULT_VISION_PROMPT, multiline=True),
                io.Image.Input("image", display_name="image"),
                io.Int.Input("seed", display_name="seed", default=0, min=0, max=2**32 - 1, step=1, tooltip="Seed for the initial generation pass."),
                io.String.Input("refine_prompt", display_name="refine_prompt", default="Take the provided text description and rewrite it to be more vivid, detailed, and engaging, while preserving the original meaning.", multiline=True, tooltip="Instructions used for the second (refinement) pass."),
                io.Int.Input("refine_seed", display_name="refine_seed", default=0, min=0, max=2**32 - 1, step=1, tooltip="Seed for the refinement pass."),
                io.DynamicCombo.Input("provider", display_name="provider", options=provider_options, tooltip="Pick the backend provider and its model/runtime settings."),
            ],
            outputs=[
                io.String.Output("initial_response", display_name="initial_response"),
                io.String.Output("refined_response", display_name="refined_response"),
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        prompt = kwargs.get("prompt", DEFAULT_VISION_PROMPT)
        image = kwargs.get("image")
        seed = kwargs.get("seed", 0)
        refine_prompt = kwargs.get("refine_prompt", "")
        refine_seed = kwargs.get("refine_seed", 0)
        provider_data = kwargs.get("provider") or {}
        provider = provider_data.get("provider", "Ollama")
        native_sampling = _get_native_sampling_config(provider_data)

        try:
            if provider == "Ollama":
                return Sage_OllamaLLMPromptVisionRefine.execute(
                    prompt=prompt,
                    model=provider_data.get("ollama_model"),
                    image=image,
                    seed=seed,
                    refine_prompt=refine_prompt,
                    refine_model=provider_data.get("ollama_refine_model"),
                    refine_seed=refine_seed,
                )

            if provider == "LM Studio":
                return Sage_LMStudioLLMPromptVisionRefine.execute(
                    prompt=prompt,
                    model=provider_data.get("lm_model"),
                    image=image,
                    seed=seed,
                    refine_prompt=refine_prompt,
                    refine_model=provider_data.get("lm_refine_model"),
                    refine_seed=refine_seed,
                )

            pbar = ProgressBar(2)
            initial = _native_generate_text(
                clip=provider_data.get("native_clip"),
                prompt=prompt,
                image=image,
                seed=seed,
                max_length=provider_data.get("native_max_length", 256),
                thinking=provider_data.get("native_thinking", False),
                do_sample=native_sampling["do_sample"],
                temperature=native_sampling["temperature"],
                top_k=native_sampling["top_k"],
                top_p=native_sampling["top_p"],
                min_p=native_sampling["min_p"],
                repetition_penalty=native_sampling["repetition_penalty"],
                presence_penalty=native_sampling["presence_penalty"],
            )
            pbar.update(1)

            refine_clip = provider_data.get("native_refine_clip") or provider_data.get("native_clip")
            combined_refine_prompt = f'{refine_prompt or prompt}\n{initial}'
            refined = _native_generate_text(
                clip=refine_clip,
                prompt=combined_refine_prompt,
                seed=refine_seed,
                max_length=provider_data.get("native_max_length", 256),
                thinking=provider_data.get("native_thinking", False),
                do_sample=native_sampling["do_sample"],
                temperature=native_sampling["temperature"],
                top_k=native_sampling["top_k"],
                top_p=native_sampling["top_p"],
                min_p=native_sampling["min_p"],
                repetition_penalty=native_sampling["repetition_penalty"],
                presence_penalty=native_sampling["presence_penalty"],
            )
            pbar.update(1)
            return io.NodeOutput(initial, refined)
        except Exception:
            logger.exception('Provider-switching vision refine node failed during generation')
            if _should_reraise_llm_node_errors():
                raise
            return io.NodeOutput("", "")


def _should_reraise_llm_node_errors() -> bool:
    """Return whether LLM node exceptions should be re-raised after logging."""
    return bool(get_setting('llm_raise_node_exceptions', False))


def _get_native_sampling_config(provider_data: dict) -> dict:
    """Resolve native sampling settings from dynamic combo input with sane defaults."""
    defaults = {
        "do_sample": True,
        "temperature": 0.7,
        "top_k": 64,
        "top_p": 0.95,
        "min_p": 0.05,
        "repetition_penalty": 1.05,
        "presence_penalty": 0.0,
    }

    sampling = provider_data.get("native_sampling") or {}
    if not isinstance(sampling, dict) or sampling.get("native_sampling") != "Advanced":
        return defaults

    return {
        "do_sample": sampling.get("native_do_sample", defaults["do_sample"]),
        "temperature": sampling.get("native_temperature", defaults["temperature"]),
        "top_k": sampling.get("native_top_k", defaults["top_k"]),
        "top_p": sampling.get("native_top_p", defaults["top_p"]),
        "min_p": sampling.get("native_min_p", defaults["min_p"]),
        "repetition_penalty": sampling.get("native_repetition_penalty", defaults["repetition_penalty"]),
        "presence_penalty": sampling.get("native_presence_penalty", defaults["presence_penalty"]),
    }


def _native_generate_text(
    clip,
    prompt: str,
    seed: int,
    max_length: int,
    do_sample: bool,
    temperature: float,
    top_k: int,
    top_p: float,
    min_p: float,
    repetition_penalty: float,
    presence_penalty: float,
    thinking: bool,
    image=None,
) -> str:
    """Run native CLIP generation compatible with ComfyUI's TextGenerate node behavior."""
    if clip is None:
        return ""

    tokens = clip.tokenize(prompt, image=image, skip_template=False, min_length=1, thinking=thinking)
    generated_ids = clip.generate(
        tokens,
        do_sample=do_sample,
        max_length=max_length,
        temperature=temperature,
        top_k=top_k,
        top_p=top_p,
        min_p=min_p,
        repetition_penalty=repetition_penalty,
        presence_penalty=presence_penalty,
        seed=seed,
    )
    return clip.decode(generated_ids, skip_special_tokens=True)

# ============================================================================

LLM_NODES = [
    Sage_ConstructLLMPrompt,
    Sage_ConstructLLMPromptExtra,
    Sage_LLMPromptText,
    Sage_LLMPromptVision,
    Sage_LLMPromptVisionRefine,
] + OLLAMA_NODES + LMSTUDIO_NODES
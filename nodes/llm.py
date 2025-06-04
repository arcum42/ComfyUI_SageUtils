# This file contains nodes for working with LLMs.

# The llm_prompts.json file contains prompts that can be used with LLMs.
# The original source of some of these prompts is the ComfyUI-joycaption-beta-one-GGUF repository, 
# which adapted it from ComfyUI_LayerStyle_Advance.

# I've heavily modified the original prompts,, adding some, getting rid of some, and rephrasing others.

# https://github.com/chflame163/ComfyUI_LayerStyle_Advance
# https://github.com/judian17/ComfyUI-joycaption-beta-one-GGUF
from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO

from ..utils import *
from ..utils.config_manager import llm_prompts

from ..utils import llm_wrapper as llm

# Attempt to import ollama, if available. Set a flag if it is not available.
try:
    import ollama
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False

class Sage_OllamaLLMPrompt(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        models = llm.get_ollama_models()
        if not models:
            models = []
        models = sorted(models)

        return {
            "required": {
                "prompt": (IO.STRING, {"defaultInput": True, "multiline": True}),
                "model": (models, )
            },
            "optional": {
                "image": (IO.IMAGE, {"defaultInput": True})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("response",)

    FUNCTION = "get_response"

    CATEGORY = "Sage Utils/LLM"
    EXPERIMENTAL = True
    DESCRIPTION = "Send a prompt to a language model and get a response. Optionally, you can provide an image/s to the model if it supports multimodal input. The model must be installed via Ollama."

    def get_response(self, prompt: str, model: str, image) -> tuple:

        if not llm.OLLAMA_AVAILABLE:
            raise ImportError("Ollama is not available. Please install it to use this node.")
        
        if model not in llm.get_ollama_models():
            raise ValueError(f"Model '{model}' is not available. Available models: {llm.get_ollama_models()}")
        
        response = llm.ollama_generate(model=model, prompt=prompt, images=image)
        return (response,)
    
class Sage_ConstructLLMPrompt(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        print("Loading llm_prompts from config manager...")
        inputs: InputTypeDict =  {}
        inputs["required"] = {}
        
        prompt_list = []
        
        for key in llm_prompts["base"].keys():
            category = llm_prompts["base"][key]["category"]
            prompt_list.append(f"{category}/{key}")
        
        inputs["required"]["prompt"] = (prompt_list, {"defaultInput": True, "multiline": True})
        inputs["optional"] = { "extra_instructions": (IO.STRING, {"default": "", "multiline": True}) }

        return inputs

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("prompt",)

    FUNCTION = "construct_prompt"

    CATEGORY = "Sage Utils/LLM"
    EXPERIMENTAL = True
    DESCRIPTION = "Construct a prompt for an LLM based on the provided image and prompt."

    def construct_prompt(self, prompt: str, extra_instructions: str = "") -> tuple:
        category = prompt.split("/")[0]
        prompt = prompt.split("/")[1]

        prompt = llm_prompts["base"][prompt]["general"]

        # Ensure prompt ends with sentence-ending punctuation
        if not prompt or prompt[-1] not in ".!?":
            prompt = prompt + "."

        # Add a space if extra_instructions is not empty
        if extra_instructions.strip():
            prompt = prompt + " " + extra_instructions.strip()

        if not prompt:
            raise ValueError("Prompt cannot be empty.")
        return (prompt,)

# Don't use anything below this line.

class Sage_LMStudioLLMPrompt(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        models = llm.get_lmstudio_models()
        if not models:
            models = []
        models = sorted(models)

        return {
            "required": {
                "prompt": (IO.STRING, {"defaultInput": True, "multiline": True}),
                "model": (models, )
            },
            "optional": {
                "image": (IO.IMAGE, {"defaultInput": True})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("response",)

    FUNCTION = "get_response"

    CATEGORY = "Sage Utils/LLM"
    EXPERIMENTAL = True
    DESCRIPTION = "Send a prompt to a language model and get a response. Optionally, you can provide an image/s to the model if it supports multimodal input. The model must be installed via Ollama."

    def get_response(self, prompt: str, model: str, image = None) -> tuple:

        if not llm.LMSTUDIO_AVAILABLE:
            raise ImportError("LM Studio is not available. Please install it to use this node.")
        
        if model not in llm.get_lmstudio_models():
            raise ValueError(f"Model '{model}' is not available. Available models: {llm.get_lmstudio_models()}")
        
        response = llm.lmstudio_generate(model=model, prompt=prompt, images=image)
        return (response,)
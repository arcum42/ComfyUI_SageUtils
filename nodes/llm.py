# This file contains nodes for working with LLMs.

# The llm_prompts.json file contains prompts that can be used with LLMs.
# The original source of some of these prompts is the ComfyUI-joycaption-beta-one-GGUF repository, 
# which adapted it from ComfyUI_LayerStyle_Advance.

# I've heavily modified the original prompts,, adding some, getting rid of some, and rephrasing others.

# https://github.com/chflame163/ComfyUI_LayerStyle_Advance
# https://github.com/judian17/ComfyUI-joycaption-beta-one-GGUF
from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO

import folder_paths
from ..utils import *
from ..utils.config_manager import llm_prompts

from ..utils import llm_wrapper as llm

import PIL
import base64

# Attempt to import ollama, if available. Set a flag if it is not available.
try:
    import ollama
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False

class Sage_OllamaLLMPrompt(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        print("Loading available Ollama models X...")
        models = llm.get_ollama_models()
        print(f"Available models: {models}")
        if not models:
            models = ["gemma3:latest", "llama3.2:latest"]
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
    DESCRIPTION = "Send a prompt to a language model and get a response. Optionally, you can provide an image/s to the model if it supports multimodal input. The model must be installed via Ollama."

    def get_response(self, prompt: str, model: str, image) -> tuple:
        if image is None:
            input_images = []
        else:
            input_images = tensor_to_base64(image)

        if not OLLAMA_AVAILABLE:
            raise ImportError("Ollama is not available. Please install it to use this node.")
        
        if model not in llm.get_ollama_models():
            raise ValueError(f"Model '{model}' is not available. Available models: {get_ollama_models()}")
        
        response = None
        
        # If there isn't an image, just use the prompt
        if input_images != []:
            response = ollama.generate(
                model=model,
                prompt=prompt,
                images=input_images,
                stream=False  # Set to True if you want streaming responses
            )
        else:
            response = ollama.generate(
                model=model,
                prompt=prompt,
                stream=False  # Set to True if you want streaming responses
            )

        if not response or 'response' not in response:
            raise ValueError("No valid response received from the model.")
        response = response['response'].strip()
        return (response,)

class Sage_ConstructLLMPrompt(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        print("Loading llm_prompts from config manager...")
        inputs: InputTypeDict =  {}
        inputs["required"] = {}
        inputs["required"]["prompt"] = (list(llm_prompts["base"].keys()), )
        
        #for key in llm_prompts["extra_boolean"].keys():
        #    inputs["required"][key] = (IO.BOOLEAN, {"default": False, "defaultInput": True})
            
        #print(f"Available prompts: {prompts}")
        return inputs

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("prompt",)

    FUNCTION = "construct_prompt"

    CATEGORY = "Sage Utils/LLM"
    EXPERIMENTAL = True
    DESCRIPTION = "Construct a prompt for an LLM based on the provided image and prompt."

    def construct_prompt(self, prompt: str) -> tuple:
        prompt = llm_prompts["base"][prompt]["general"]
        if not prompt:
            raise ValueError("Prompt cannot be empty.")
        return (prompt,)
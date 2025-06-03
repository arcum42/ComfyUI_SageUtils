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

import PIL
import base64

# Attempt to import ollama, if available. Set a flag if it is not available.
try:
    import ollama
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False

def get_ollama_models() -> list[str]:
    """Retrieve a list of available models from Ollama."""
    if not OLLAMA_AVAILABLE:
        return []

    try:
        response = ollama.list()
        models = []
        for model in response.models:
            models.append(model.model)
        return models

    except Exception as e:
        print(f"Error retrieving models from Ollama: {e}")
        return []

class Sage_OllamaLLMPrompt(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        models = get_ollama_models()
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

    CATEGORY = "Sage LLM"
    DESCRIPTION = "Send a prompt to a language model and get a response. Optionally, you can provide an image/s to the model if it supports multimodal input. The model must be installed via Ollama."

    def get_response(self, prompt: str, model: str, image) -> tuple:
        if image is None:
            input_images = []
        else:
            input_images = tensor_to_base64(image)

        if not OLLAMA_AVAILABLE:
            raise ImportError("Ollama is not available. Please install it to use this node.")
        
        if model not in get_ollama_models():
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

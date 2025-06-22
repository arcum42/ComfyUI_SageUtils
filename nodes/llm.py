# This file contains nodes for working with LLMs.

# The llm_prompts.json file contains prompts that can be used with LLMs.
# The original source of some of these prompts is the ComfyUI-joycaption-beta-one-GGUF repository, 
# which adapted it from ComfyUI_LayerStyle_Advance.

# I've heavily modified the original prompts,, adding some, getting rid of some, and rephrasing others.

# https://github.com/chflame163/ComfyUI_LayerStyle_Advance
# https://github.com/judian17/ComfyUI-joycaption-beta-one-GGUF
from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO

# Import specific utilities instead of wildcard import
from ..utils import blank_image
from ..utils.config_manager import llm_prompts
from ..utils import llm_wrapper as llm

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

# Nodes to construct prompts for LLMs, including extra instructions and advanced options.

class Sage_ConstructLLMPrompt(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        inputs: InputTypeDict =  {}
        inputs["required"] = {}
        
        prompt_list = []
        
        for key in llm_prompts["base"].keys():
            category = llm_prompts["base"][key]["category"]
            prompt_list.append(f"{category}/{key}")
        
        inputs["required"] = {
            "prompt": (prompt_list, {"defaultInput": True, "multiline": True}),
            "extra_instructions": (IO.STRING, {"default": "", "multiline": True})
        }

        for key in llm_prompts["extra"].keys():
            if llm_prompts["extra"][key]["category"] in ("style", "quality", "content_focus"):
                if llm_prompts["extra"][key]["type"] == "boolean":
                    default_value = False
                    if "default" in llm_prompts["extra"][key]:
                        default_value = llm_prompts["extra"][key]["default"]
                    inputs["required"][key] = (IO.BOOLEAN, {"default": default_value, "tooltip": llm_prompts["extra"][key]["name"]})
        return inputs

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("prompt",)

    FUNCTION = "construct_prompt"

    CATEGORY = "Sage Utils/LLM"
    EXPERIMENTAL = True
    DESCRIPTION = "Construct a prompt for an LLM based on the provided image and prompt."

    def construct_prompt(self, **args) -> tuple:
        prompt = args["prompt"]
        extra_instructions = args.get("extra_instructions", "")

        category = prompt.split("/")[0]
        prompt = prompt.split("/")[1]

        prompt = llm_prompts["base"][prompt]["prompt"]

        # Ensure prompt ends with sentence-ending punctuation
        if not prompt or prompt[-1] not in ".!?":
            prompt = prompt + "."
        
        # Add a newline to the end of the prompt
        if not prompt.endswith("\n"):
            prompt = f"{prompt}\n\n"

        # Add extra instructions based on the selected options
        for key, value in args.items():
            if key in llm_prompts["extra"]:
                if llm_prompts["extra"][key]["type"] == "boolean" and value:
                    prompt += f"{llm_prompts['extra'][key]['prompt']}\n\n"

        # Add a space if extra_instructions is not empty
        if extra_instructions.strip():
            prompt = prompt + extra_instructions.strip()

        if not prompt:
            raise ValueError("Prompt cannot be empty.")
        return (prompt,)

class Sage_ConstructLLMPromptExtra(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(s) -> InputTypeDict:
        inputs: InputTypeDict =  {}
        inputs["required"] = { "extra_instructions": (IO.STRING, {"default": "", "defaultInput": True, "multiline": True}) }
        for key in llm_prompts["extra"].keys():
            if llm_prompts["extra"][key]["category"] not in ("style", "quality", "content_focus"):
                if llm_prompts["extra"][key]["type"] == "boolean":
                    default_value = False
                    if "default" in llm_prompts["extra"][key]:
                        default_value = llm_prompts["extra"][key]["default"]
                    inputs["required"][key] = (IO.BOOLEAN, {"default": default_value, "tooltip": llm_prompts["extra"][key]["name"]})
        return inputs

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("extra",)
    
    FUNCTION = "construct_extra"
    CATEGORY = "Sage Utils/LLM"
    EXPERIMENTAL = True
    DESCRIPTION = "Construct extra instructions for an LLM based on the provided options."
    def construct_extra(self, **args) -> tuple:
        extra_instructions = args["extra_instructions"] + "\n\n" if args["extra_instructions"] else ""
        
        for key, value in args.items():
            if key in llm_prompts["extra"]:
                if llm_prompts["extra"][key]["type"] == "boolean" and value:
                    extra_instructions += f"{llm_prompts['extra'][key]['prompt']}\n\n"

        # Remove the last newline if it exists
        if extra_instructions.endswith("\n\n"):
            extra_instructions = extra_instructions[:-2]

        return (extra_instructions.strip(),)

# Ollama based nodes for LLMs.
# These nodes allow you to send prompts to LLMs and get responses.
class Sage_OllamaAdvancedOptions(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "num_keep": (IO.INT, {"default": 0, "min": 0, "max": 100, "step": 1, "tooltip": "Number of tokens to keep from the previous output."}),
                "num_predict": (IO.INT, {"default": 128, "min": 1, "max": 2048, "step": 1, "tooltip": "Number of tokens to predict in the output."}),
                "top_k": (IO.INT, {"default": 50, "min": 1, "max": 1000, "step": 1, "tooltip": "Limits the number of tokens to consider for each step."}),
                "top_p": (IO.FLOAT, {"default": 0.9, "min": 0.0, "max": 1.0, "step": 0.01, "tooltip": "Controls the diversity of the output. Lower values make the output more focused."}),
                "tfs_z": (IO.FLOAT, {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01, "tooltip": "Top-p sampling threshold. Tokens with cumulative probability above this value are excluded."}),
                "typical_p": (IO.FLOAT, {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01, "tooltip": "Typical sampling threshold. Tokens with cumulative probability above this value are excluded."}),
                "repeat_last_n": (IO.INT, {"default": 64, "min": 0, "max": 256, "step": 1, "tooltip": "Number of tokens to consider for repetition penalty."}),
                "temperature": (IO.FLOAT, {"default": 0.7, "min": 0.0, "max": 1.0, "step": 0.01, "tooltip": "Controls the randomness of the output. Lower values make the output more deterministic."}),
                "repeat_penalty": (IO.FLOAT, {"default": 1.2, "min": 1.0, "max": 2.0, "step": 0.01, "tooltip": "Penalizes repeated tokens in the output."}),
                "presence_penalty": (IO.FLOAT, {"default": 0.0, "min": -2.0, "max": 2.0, "step": 0.01, "tooltip": "Penalizes new tokens based on their presence in the text so far."}),
                "frequency_penalty": (IO.FLOAT, {"default": 0.0, "min": -2.0, "max": 2.0, "step": 0.01, "tooltip": "Penalizes new tokens based on their frequency in the text so far."}),
                "mirostat": (IO.INT, {"default": 0, "min": 0, "max": 2, "step": 1, "tooltip": "Mirostat mode. 0 = off, 1 = Mirostat 1.0, 2 = Mirostat 2.0."}),
                "mirostat_tau": (IO.FLOAT, {"default": 5.0, "min": 0.0, "max": 100.0, "step": 0.1, "tooltip": "Mirostat tau parameter. Controls the target entropy."}),
                "mirostat_eta": (IO.FLOAT, {"default": 0.1, "min": 0.0, "max": 1.0, "step": 0.01, "tooltip": "Mirostat eta parameter. Controls the learning rate."}),
                "penalize_newline": (IO.BOOLEAN, {"default": False, "tooltip": "If true, penalizes newlines in the output."}),
                "stop": (IO.STRING, {"default": "", "tooltip": "Stop sequence. If the model generates this sequence, it will stop generating further tokens."})
                }
            }

    RETURN_TYPES = ("OLLAMA_OPTIONS",)
    RETURN_NAMES = ("options",)

    FUNCTION = "get_options"

    CATEGORY = "Sage Utils/LLM/Ollama"
    EXPERIMENTAL = True
    DESCRIPTION = "Get advanced options for LLMs."

    def get_options(self, num_keep, num_predict, top_k, top_p, tfs_z, typical_p, repeat_last_n, temperature, repeat_penalty, presence_penalty, frequency_penalty, mirostat, mirostat_tau, mirostat_eta, penalize_newline, stop) -> tuple:
        options = {
            "num_keep": num_keep,
            "num_predict": num_predict,
            "top_k": top_k,
            "top_p": top_p,
            "tfs_z": tfs_z,
            "typical_p": typical_p,
            "repeat_last_n": repeat_last_n,
            "temperature": temperature,
            "repeat_penalty": repeat_penalty,
            "presence_penalty": presence_penalty,
            "frequency_penalty": frequency_penalty,
            "mirostat": mirostat,
            "mirostat_tau": mirostat_tau,
            "mirostat_eta": mirostat_eta,
            "penalize_newline": penalize_newline,
            "stop": [stop]
        }
        return (options,)

class Sage_OllamaLLMPromptText(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        models = llm.get_ollama_models()
        if not models:
            models = []
        models = sorted(models)

        return {
            "required": {
                "prompt": (IO.STRING, {"defaultInput": True, "default": DEFAULT_TEXT_PROMPT, "multiline": True}),
                "model": (models, ),
                "seed": (IO.INT, {"default": 0, "min": 0, "max": 2**32 - 1, "step": 1, "tooltip": "Seed for random number generation."}),
                "load_for_seconds": (IO.FLOAT, {"default": 0.0, "min": -1.0, "max": 60.0 * 60.0, "step": 1, "tooltip": "Time in seconds to load the image for. -1 to load indefinitely."})
                }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("response",)

    FUNCTION = "get_response"

    CATEGORY = "Sage Utils/LLM/Ollama"
    EXPERIMENTAL = True
    DESCRIPTION = "Send a prompt to a language model and get a response. The model must be installed via Ollama."

    def get_response(self, prompt: str, model: str, seed: int = 0, load_for_seconds: float = 0.0) -> tuple:
        options = {}
        if not llm.OLLAMA_AVAILABLE:
            raise ImportError("Ollama is not available. Please install it to use this node.")
        
        if model not in llm.get_ollama_models():
            raise ValueError(f"Model '{model}' is not available. Available models: {llm.get_ollama_models()}")
        
        options["seed"] = seed  # Ensure the seed is included in the options
        response = llm.ollama_generate(model=model, prompt=prompt, keep_alive=load_for_seconds, options=options)
        return (response,)
class Sage_OllamaLLMPromptVision(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        models = llm.get_ollama_vision_models()
        if not models:
            models = []
        models = sorted(models)

        return {
            "required": {
                "prompt": (IO.STRING, {"defaultInput": True, "default": DEFAULT_VISION_PROMPT, "multiline": True}),
                "model": (models, ),
                "image": (IO.IMAGE, {"defaultInput": True}),
                "seed": (IO.INT, {"default": 0, "min": 0, "max": 2**32 - 1, "step": 1, "tooltip": "Seed for random number generation."}),
                "load_for_seconds": (IO.FLOAT, {"default": 0.0, "min": -1.0, "max": 60.0 * 60.0, "step": 0.1, "tooltip": "Time in seconds to load the image for. -1 to load indefinitely."})  
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("response",)

    FUNCTION = "get_response"

    CATEGORY = "Sage Utils/LLM/Ollama"
    EXPERIMENTAL = True
    DESCRIPTION = "Send a prompt to a language model and get a response. Optionally, you can provide an image/s to the model if it supports multimodal input. The model must be installed via Ollama."
    
    def get_response(self, prompt: str, model: str, image, seed: int, load_for_seconds: float = 0.0) -> tuple:
        options = {}
        if not llm.OLLAMA_AVAILABLE:
            raise ImportError("Ollama is not available. Please install it to use this node.")
        
        if model not in llm.get_ollama_vision_models():
            raise ValueError(f"Model '{model}' is not available or not a vision model. Available models: {llm.get_ollama_vision_models()}")
        
        if image is None:
            raise ValueError("Image input is required for vision models.")

        options["seed"] = seed  # Ensure the seed is included in the options
        response = llm.ollama_generate_vision(model=model, prompt=prompt, images=image, keep_alive = load_for_seconds, options=options)
        return (response,)

class Sage_OllamaLLMPromptVisionRefine(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        models = llm.get_ollama_vision_models()
        if not models:
            models = []
        models = sorted(models)
        
        refine_models = llm.get_ollama_models()
        if not refine_models:
            refine_models = []
        refine_models = sorted(refine_models)

        return {
            "required": {
                "prompt": (IO.STRING, {"defaultInput": True, "default": DEFAULT_VISION_PROMPT, "multiline": True}),
                "model": (models, ),
                "image": (IO.IMAGE, {"defaultInput": True}),
                "seed": (IO.INT, {"default": 0, "min": 0, "max": 2**32 - 1, "step": 1, "tooltip": "Seed for random number generation."}),
                "refine_prompt": (IO.STRING, {"default": "Take the provided text description and rewrite it to be more vivid, detailed, and engaging, while preserving the original meaning.", "multiline": True, "tooltip": "Prompt to refine the description of the image."}),
                "refine_model": (refine_models, ),
                "refine_seed": (IO.INT, {"default": 0, "min": 0, "max": 2**32 - 1, "step": 1, "tooltip": "Seed for random number generation."}),
            }
        } # type: ignore

    RETURN_TYPES = (IO.STRING, IO.STRING)
    RETURN_NAMES = ("initial_response", "refined_response")

    FUNCTION = "get_response"

    CATEGORY = "Sage Utils/LLM/Ollama"
    EXPERIMENTAL = True
    DESCRIPTION = "Send a prompt to a language model and get a response. Optionally, you can provide an image/s to the model if it supports multimodal input. The model must be installed via Ollama."
    
    def get_response(self, prompt: str, model: str, image, seed: int, refine_prompt: str, refine_model: str, refine_seed:int) -> tuple:
        options = {}
        refine_options = {}

        if not llm.OLLAMA_AVAILABLE:
            raise ImportError("Ollama is not available. Please install it to use this node.")
        
        if model not in llm.get_ollama_vision_models():
            raise ValueError(f"Model '{model}' is not available or not a vision model. Available models: {llm.get_ollama_vision_models()}")
        
        if image is None:
            raise ValueError("Image input is required for vision models.")

        options["seed"] = seed  # Ensure the seed is included in the options
        refine_options["seed"] = refine_seed  # Ensure the seed is included in the refine options
        responses = llm.ollama_generate_vision_refine(model=model, prompt=prompt, images=image, options=options, refine_model=refine_model, refine_prompt=refine_prompt, refine_options=refine_options)
        return (responses[0], responses[1])  # Return both the initial and refined responses as a tuple

# Nodes for LM Studio.

class Sage_LMStudioLLMPromptText(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        models = llm.get_lmstudio_models()
        if not models:
            models = []
        models = sorted(models)

        return {
            "required": {
                "prompt": (IO.STRING, {"defaultInput": True, "default": DEFAULT_TEXT_PROMPT, "multiline": True}),
                "model": (models, ),
                "seed": (IO.INT, {"default": 0, "min": 0, "max": 2**32 - 1, "step": 1, "tooltip": "Seed for random number generation."}),
                "load_for_seconds": (IO.INT, {"default": 0, "min": -1, "max": 60*60, "step": 1, "tooltip": "Time in seconds to load the image for. -1 to load indefinitely."})
                }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("response",)

    FUNCTION = "get_response"

    CATEGORY = "Sage Utils/LLM/LM Studio"
    EXPERIMENTAL = True
    DESCRIPTION = "Send a prompt to a language model and get a response. The model must be installed via LM Studio."

    def get_response(self, prompt: str, model: str, seed: int = 0, load_for_seconds: int = 0) -> tuple:
        options = {}
        if not llm.LMSTUDIO_AVAILABLE:
            raise ImportError("LM Studio is not available. Please install it to use this node.")
        
        if model not in llm.get_lmstudio_models():
            raise ValueError(f"Model '{model}' is not available. Available models: {llm.get_lmstudio_models()}")
        
        options["seed"] = seed  # Ensure the seed is included in the options
        response = llm.lmstudio_generate(model=model, prompt=prompt, keep_alive=load_for_seconds, options=options)
        return (response,)
class Sage_LMStudioLLMPromptVision(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        models = llm.get_lmstudio_vision_models()
        if not models:
            models = []
        models = sorted(models)

        return {
            "required": {
                "prompt": (IO.STRING, {"defaultInput": True, "default": DEFAULT_VISION_PROMPT, "multiline": True}),
                "model": (models, ),
                "image": (IO.IMAGE, {"defaultInput": True}),
                "seed": (IO.INT, {"default": 0, "min": 0, "max": 2**32 - 1, "step": 1, "tooltip": "Seed for random number generation."}),
                "load_for_seconds": (IO.INT, {"default": 0, "min": -1, "max": 60*60, "step": 1, "tooltip": "Time in seconds to load the image for. -1 to load indefinitely."})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("response",)

    FUNCTION = "get_response"

    CATEGORY = "Sage Utils/LLM/LM Studio"
    EXPERIMENTAL = True
    DESCRIPTION = "Send a prompt to a language model and get a response. Optionally, you can provide an image/s to the model if it supports multimodal input. The model must be installed via Ollama."
    
    def get_response(self, prompt: str, model: str, image, seed: int = 0, load_for_seconds: int = 0) -> tuple:
        options = {}
        if not llm.LMSTUDIO_AVAILABLE:
            raise ImportError("LM Studio is not available. Please install it to use this node.")
        
        if model not in llm.get_lmstudio_vision_models():
            raise ValueError(f"Model '{model}' is not available or not a vision model. Available models: {llm.get_lmstudio_vision_models()}")
        
        if image is None:
            raise ValueError("Image input is required for vision models.")

        options["seed"] = seed  # Ensure the seed is included in the options
        response = llm.lmstudio_generate_vision(model=model, prompt=prompt, images=image, keep_alive=load_for_seconds, options=options)
        return (response,)

class Sage_LMStudioLLMPromptVisionRefine(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        models = llm.get_lmstudio_vision_models()
        if not models:
            models = []
        models = sorted(models)
        
        refine_models = llm.get_lmstudio_models()
        if not refine_models:
            refine_models = []
        refine_models = sorted(refine_models)

        return {
            "required": {
                "prompt": (IO.STRING, {"defaultInput": True, "default": DEFAULT_VISION_PROMPT, "multiline": True}),
                "model": (models, ),
                "image": (IO.IMAGE, {"defaultInput": True}),
                "seed": (IO.INT, {"default": 0, "min": 0, "max": 2**32 - 1, "step": 1, "tooltip": "Seed for random number generation."}),
                "refine_prompt": (IO.STRING, {"default": "Take the provided text description and rewrite it to be more vivid, detailed, and engaging, while preserving the original meaning.", "multiline": True, "tooltip": "Prompt to refine the description of the image."}),
                "refine_model": (refine_models, ),
                "refine_seed": (IO.INT, {"default": 0, "min": 0, "max": 2**32 - 1, "step": 1, "tooltip": "Seed for random number generation."}),
            }
        } # type: ignore

    RETURN_TYPES = (IO.STRING, IO.STRING)
    RETURN_NAMES = ("initial_response", "refined_response")

    FUNCTION = "get_response"

    CATEGORY = "Sage Utils/LLM/LM Studio"
    EXPERIMENTAL = True
    DESCRIPTION = "Send a prompt to a language model and get a response. Optionally, you can provide an image/s to the model if it supports multimodal input. The model must be installed via LM Studio."
    
    def get_response(self, prompt: str, model: str, image, seed: int, refine_prompt: str, refine_model: str, refine_seed:int) -> tuple:
        options = {}
        refine_options = {}

        if not llm.LMSTUDIO_AVAILABLE:
            raise ImportError("LM Studio is not available. Please install it to use this node.")
        
        if model not in llm.get_lmstudio_vision_models():
            raise ValueError(f"Model '{model}' is not available or not a vision model. Available models: {llm.get_lmstudio_vision_models()}")
        if image is None:
            raise ValueError("Image input is required for vision models.")
        options["seed"] = seed  # Ensure the seed is included in the options
        refine_options["seed"] = refine_seed  # Ensure the seed is included in the refine options
        responses = llm.lmstudio_generate_vision_refine(model=model, prompt=prompt, images=image, options=options, refine_model=refine_model, refine_prompt=refine_prompt, refine_options=refine_options)
        return (responses[0], responses[1])  # Return both the initial and refined responses as a tuple
# This file will contain functions for working with llms that wrap around both the Ollama and LM Studio APIs.

# Attempt to import ollama, if available. Set a flag if it is not available.
OLLAMA_AVAILABLE = False
LMSTUDIO_AVAILABLE = False

from .helpers_image import tensor_to_base64, tensor_to_temp_image

try:
    import ollama
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False
    print("Ollama library not found.")

try:
    import lmstudio as lms
    LMSTUDIO_AVAILABLE = True
except ImportError:
    LMSTUDIO_AVAILABLE = False
    print("LM Studio library not found.")

# Neutral functions
def clean_response(response: str) -> str:
    """Clean the response from the model by removing unnecessary tags."""
    if not response:
        return ""

    response = response.strip()

    # Remove "</end_of_turn>" if it exists in the response
    if response.endswith("</end_of_turn>"):
        response = response[:-len("</end_of_turn>")].strip()

    # Remove ">end_of_turn>" if it exists in the response
    if response.endswith(">end_of_turn>"):
        response = response[:-len(">end_of_turn>")].strip()

    return response


# Ollama functions
def get_ollama_vision_models() -> list[str]:
    """Retrieve a list of available vision models from Ollama."""
    if not OLLAMA_AVAILABLE:
        return []

    try:
        response = ollama.list()
        models = []
        for model in response.models:
            vision = False
            if hasattr(model, 'capabilities') and model.capabilities:
                if 'vision' in model.capabilities:
                    vision = True
            else:
                response: ollama.ShowResponse = ollama.show(model.model)
                if hasattr(response, 'capabilities') and response.capabilities:
                    if 'vision' in response.capabilities:
                        vision = True
            if vision:
                # If the model has vision capabilities, add it to the list
                models.append(model.model)
        return models

    except Exception as e:
        print(f"Error retrieving models from Ollama: {e}")
        return []

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

def ollama_generate_vision(model, prompt, images = None, options = None) -> str:
    """Generate a response from an Ollama vision model."""
    if not OLLAMA_AVAILABLE:
        raise ImportError("Ollama is not available. Please install it to use this function.")

    if model not in get_ollama_vision_models():
        raise ValueError(f"Model '{model}' is not available. Available models: {get_ollama_vision_models()}")
    input_images = []
    if images is not None:
        input_images = tensor_to_base64(images)
    else:
        raise ValueError("No images provided for vision model.")

    response = None
    try:
        if input_images == []:
            raise ValueError("No images provided for vision model.")
        else:
            if options is not None and isinstance(options, dict):
                # If options are provided, pass them to the generate function
                response = ollama.generate(
                    model=model,
                    prompt=prompt,
                    images=input_images,
                    stream=False,
                    options=options
                )
            else:
                # If no options are provided, use the default generate function
                response = ollama.generate(
                    model=model,
                    prompt=prompt,
                    images=input_images,
                    stream=False
                )
        if not response or 'response' not in response:
            raise ValueError("No valid response received from the model.")
        
        return clean_response(response['response'])

    except Exception as e:
        print(f"Error generating response from Ollama vision model: {e}")
        return ""

def ollama_generate(model, prompt, options = None) -> str:
    """Generate a response from an Ollama model."""
    if not OLLAMA_AVAILABLE:
        raise ImportError("Ollama is not available. Please install it to use this function.")

    if model not in get_ollama_models():
        raise ValueError(f"Model '{model}' is not available. Available models: {get_ollama_models()}")

    response = None
    try:
        if options is not None and isinstance(options, dict):
            # If options are provided, pass them to the generate function
            response = ollama.generate(
                model=model,
                prompt=prompt,
                stream=False,
                options=options,
                keep_alive=False
            )
        else:
            # If no options are provided, use the default generate function
            response = ollama.generate(
                model=model,
                prompt=prompt,
                stream=False,
                keep_alive=False
            )
        if not response or 'response' not in response:
            raise ValueError("No valid response received from the model.")
        
        return clean_response(response['response'])

    except Exception as e:
        print(f"Error generating response from Ollama: {e}")
        return ""

# LM Studio functions
# These functions will be similar to the Ollama functions but will use the LM Studio API.
def get_lmstudio_models() -> list[str]:
    """Retrieve a list of available models from LM Studio."""
    if not LMSTUDIO_AVAILABLE:
        return []

    try:
        response = lms.list_downloaded_models("llm")
        models = []
        for model in response:
            if hasattr(model, 'model_key'):
                models.append(model.model_key)
        return models

    except Exception as e:
        print(f"Error retrieving models from LM Studio: {e}")
        return []
    
def get_lmstudio_vision_models() -> list[str]:
    """Retrieve a list of available models from LM Studio."""
    if not LMSTUDIO_AVAILABLE:
        return []

    try:
        response = lms.list_downloaded_models("llm")
        
        models=[]
        
        for model in response:
            
            if hasattr(model, 'model_key'):
                name = model.model_key
                if hasattr(model, 'info') and hasattr(model.info, 'vision') and model.info.vision:
                    models.append(name)

        return models

    except Exception as e:
        print(f"Error retrieving models from LM Studio: {e}")
        return []

def lmstudio_generate_vision(model, prompt, images = None, options = {}) -> str:
    """Generate a response from an LM Studio vision model."""
    if not LMSTUDIO_AVAILABLE:
        raise ImportError("LM Studio is not available. Please install it to use this function.")
    
    model_list = get_lmstudio_vision_models()

    if model not in model_list:
        raise ValueError(f"Model '{model}' is not available. Available models: {model_list}")
    seed = options.get('seed', 0)
    input_images = []
    if images is not None:
        input_images = tensor_to_temp_image(images)
    
    lms_model = None

    try:
        lms_model = lms.llm(model)
        chat = lms.Chat()
        if input_images == []:
            chat.add_user_message(prompt)
        else:
            image_handles = []
            for image in input_images:
                image_handles.append(lms.prepare_image(image))
            chat.add_user_message(prompt, images=image_handles)
        response = lms_model.respond(chat, config={"seed":seed})
        lms_model.unload()

        if not response:
            raise ValueError("No valid response received from the model.")
        
        return clean_response(response.content)

    except Exception as e:
        print(f"Error generating response from LM Studio vision model: {e}")
        if lms_model:
            lms_model.unload()
        return ""

def lmstudio_generate(model, prompt, options = {}) -> str:
    """Generate a response from an LM Studio model."""
    if not LMSTUDIO_AVAILABLE:
        raise ImportError("LM Studio is not available. Please install it to use this function.")

    model_list = get_lmstudio_models()
    if model not in model_list:
        raise ValueError(f"Model '{model}' is not available. Available models: {model_list}")

    seed = options.get('seed', 0)
    lms_model = None

    try:
        lms_model = lms.llm(model)
        if lms_model is None:
            raise ValueError(f"Model '{model}' could not be loaded from LM Studio.")

        chat = lms.Chat()
        chat.add_user_message(prompt)
        response = lms_model.respond(chat, config={"seed":seed})
        lms_model.unload()

        if not response:
            raise ValueError("No valid response received from the model.")

        return clean_response(response.content)

    except Exception as e:
        print(f"Error generating response from LM Studio: {e}")
        if lms_model:
            lms_model.unload()
        return ""
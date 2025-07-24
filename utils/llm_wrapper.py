import logging
from .helpers_image import tensor_to_base64, tensor_to_temp_image
from .llm_cache import get_llm_cache

# Attempt to import ollama, if available. Set a flag if it is not available.
try:
    import ollama
    OLLAMA_AVAILABLE = True
    ollama_client = None  # Will be initialized in init_ollama
except ImportError:
    ollama = None
    OLLAMA_AVAILABLE = False
    ollama_client = None
    logging.warning("Ollama library not found.")

try:
    import lmstudio as lms
    LMSTUDIO_AVAILABLE = True
except ImportError:
    lms = None
    LMSTUDIO_AVAILABLE = False
    logging.warning("LM Studio library not found.")


def _is_ollama_enabled() -> bool:
    """Check if Ollama is enabled in settings."""
    try:
        from .settings import is_feature_enabled
        return is_feature_enabled('enable_ollama')
    except ImportError:
        # Fallback to config manager
        try:
            from . import config_manager
            config = config_manager.settings_manager.data or {}
            return config.get('enable_ollama', True)
        except:
            return True  # Default to enabled if no config available


def _is_lmstudio_enabled() -> bool:
    """Check if LM Studio is enabled in settings."""
    try:
        from .settings import is_feature_enabled
        return is_feature_enabled('enable_lmstudio')
    except ImportError:
        # Fallback to config manager
        try:
            from . import config_manager
            config = config_manager.settings_manager.data or {}
            return config.get('enable_lmstudio', True)
        except:
            return True  # Default to enabled if no config available

def clean_response(response: str) -> str:
    """Clean the response from the model by removing unnecessary tags."""
    if not response:
        return ""
    response = response.strip()
    for tag in ("</end_of_turn>", ">end_of_turn>"):
        if response.endswith(tag):
            response = response[: -len(tag)].strip()
    return response


def get_ollama_vision_models() -> list[str]:
    """Retrieve a list of available vision models from Ollama."""
    if not OLLAMA_AVAILABLE or ollama_client is None:
        return []
    
    if not _is_ollama_enabled():
        return []
    
    def _fetch_ollama_vision_models(cache_instance):
        """Internal function to fetch vision models from Ollama."""
        if ollama_client is None:
            return []
            
        try:
            logging.debug("Fetching vision models from Ollama...")
            response = ollama_client.list()
            models = []
            
            for model in response.models:
                if model.model is None:
                    continue
                
                logging.debug(f"Checking model: {model.model}")
                
                # Check cache first (this doesn't acquire lock in fetch function)
                cached_vision = cache_instance.is_ollama_vision_model(model.model)
                if cached_vision is not None:
                    logging.debug(f"Model {model.model} cached as vision: {cached_vision}")
                    if cached_vision:
                        models.append(model.model)
                    continue
                
                # Determine vision capability
                is_vision = False
                capabilities = getattr(model, 'capabilities', None)
                if capabilities and 'vision' in capabilities:
                    is_vision = True
                elif not capabilities:
                    # Fallback to detailed model info
                    try:
                        show_response = ollama_client.show(str(model.model))
                        if 'vision' in getattr(show_response, 'capabilities', []):
                            is_vision = True
                    except Exception as e:
                        logging.debug(f"Failed to get capabilities for {model.model}: {e}")
                
                # Cache the result using unlocked method (we're already inside the lock)
                logging.debug(f"Caching vision capability for {model.model}: {is_vision}")
                cache_instance._set_ollama_vision_capability_unlocked(model.model, is_vision)
                if is_vision:
                    models.append(model.model)
            
            logging.debug(f"Found {len(models)} vision models.")
            return models
        except Exception as e:
            logging.error(f"Error retrieving vision models from Ollama: {e}")
            return []
    
    cache = get_llm_cache()
    return cache.get_ollama_vision_models(_fetch_ollama_vision_models)


def get_ollama_models() -> list[str]:
    """Retrieve a list of available models from Ollama."""
    if not OLLAMA_AVAILABLE or ollama_client is None:
        return []
    
    if not _is_ollama_enabled():
        return []
    
    def _fetch_ollama_models():
        """Internal function to fetch models from Ollama."""
        if ollama_client is None:
            return []
            
        try:
            print("Fetching models from Ollama...")
            response = ollama_client.list()
            print(f"Found {len(response.models)} models.")
            return [model.model for model in response.models if model.model is not None]
        except Exception as e:
            logging.error(f"Error retrieving models from Ollama: {e}")
            return []
    
    cache = get_llm_cache()
    print("Fetching Ollama models from cache...")
    return cache.get_ollama_models(_fetch_ollama_models)


def ollama_generate_vision(model: str, prompt: str, keep_alive: float = 0.0, images=None, options=None) -> str:
    """Generate a response from an Ollama vision model."""
    if not OLLAMA_AVAILABLE or ollama_client is None:
        raise ImportError("Ollama is not available. Please install it to use this function.")
    vision_models = get_ollama_vision_models()
    if model not in vision_models:
        raise ValueError(f"Model '{model}' is not available. Available models: {vision_models}")
    if images is None:
        raise ValueError("No images provided for vision model.")
    input_images = tensor_to_base64(images)
    if not input_images:
        raise ValueError("No images provided for vision model.")
    try:
        if options and isinstance(options, dict):
            response = ollama_client.generate(
                model=model,
                prompt=prompt,
                images=input_images,
                stream=False,
                keep_alive=keep_alive,
                options=options
            )
        else:
            response = ollama_client.generate(
                model=model,
                prompt=prompt,
                images=input_images,
                keep_alive=keep_alive,
                stream=False
            )
        if not response or 'response' not in response:
            raise ValueError("No valid response received from the model.")
        return clean_response(response['response'])
    except Exception as e:
        logging.error(f"Error generating response from Ollama vision model: {e}")
        return ""


def ollama_generate(model: str, prompt: str, keep_alive: float = 0.0, options=None) -> str:
    """Generate a response from an Ollama model."""
    if not OLLAMA_AVAILABLE or ollama_client is None:
        raise ImportError("Ollama is not available. Please install it to use this function.")
    models = get_ollama_models()
    if model not in models:
        raise ValueError(f"Model '{model}' is not available. Available models: {models}")
    try:
        if options and isinstance(options, dict):
            response = ollama_client.generate(
                model=model,
                prompt=prompt,
                stream=False,
                keep_alive=keep_alive,
                options=options
            )
        else:
            response = ollama_client.generate(
                model=model,
                prompt=prompt,
                stream=False,
                keep_alive=keep_alive
            )
        if not response or 'response' not in response:
            raise ValueError("No valid response received from the model.")
        return clean_response(response['response'])
    except Exception as e:
        logging.error(f"Error generating response from Ollama: {e}")
        return ""

def ollama_generate_vision_refine( model: str, prompt: str, images=None, options=None, refine_model: str = "", refine_prompt: str = "", refine_options = None) -> tuple[str, str]:
    """Generate a response from an Ollama vision model and refine it with another model."""
    if not OLLAMA_AVAILABLE or ollama_client is None:
        raise ImportError("Ollama is not available. Please install it to use this function.")
    vision_models = get_ollama_vision_models()
    if model not in vision_models:
        raise ValueError(f"Model '{model}' is not available. Available models: {vision_models}")
    if images is None:
        raise ValueError("No images provided for vision model.")
    input_images = tensor_to_base64(images)
    if not input_images:
        raise ValueError("No images provided for vision model.")
    
    try:
        options = options or {}
        options['seed'] = options.get('seed', 0)
        refine_options = refine_options or {}
        refine_options['seed'] = refine_options.get('seed', 0)
        if refine_model == "":
            refine_model = model
        if refine_prompt == "":
            refine_prompt = prompt

        response = ollama_client.generate(
            model=model,
            prompt=prompt,
            images=input_images,
            options=options,
            stream=False
        )
        if not response or 'response' not in response:
            raise ValueError("No valid response received from the vision model.")
        
        initial_response = clean_response(response['response'])
        refine_prompt = f"{refine_prompt}\n{initial_response}"
        
        refined_response = ollama_client.generate(
            model=refine_model,
            prompt=refine_prompt,
            options=refine_options,
            stream=False
        )
        if not refined_response or 'response' not in refined_response:
            raise ValueError("No valid response received from the refining model.")
        refined_response = clean_response(refined_response['response'])
        return (initial_response, refined_response)
    except Exception as e:
        logging.error(f"Error generating response from Ollama vision model: {e}")
        return ("", "")

def is_lmstudio_running() -> bool:
    """Check if LM Studio server is running by attempting a lightweight API call."""
    if not LMSTUDIO_AVAILABLE or lms is None:
        return False
    
    if not _is_lmstudio_enabled():
        return False
    
    try:
        lms.list_downloaded_models("llm")
        return True
    except Exception:
        return False


def get_lmstudio_models() -> list[str]:
    """Retrieve a list of available models from LM Studio."""
    if not LMSTUDIO_AVAILABLE or lms is None:
        return []
    
    if not _is_lmstudio_enabled():
        return []
    
    def _fetch_lmstudio_models():
        """Internal function to fetch models from LM Studio."""
        if lms is None or not is_lmstudio_running():
            return []
            
        try:
            logging.debug("Retrieving models from LM Studio...")
            response = lms.list_downloaded_models("llm")
            return [model.model_key for model in response if hasattr(model, 'model_key') and model.model_key is not None]
        except Exception as e:
            logging.error(f"Error retrieving models from LM Studio: {e}")
            return []
    
    cache = get_llm_cache()
    return cache.get_lmstudio_models(_fetch_lmstudio_models)


def get_lmstudio_vision_models() -> list[str]:
    """Retrieve a list of available vision models from LM Studio."""
    if not LMSTUDIO_AVAILABLE or lms is None:
        return []
    
    if not _is_lmstudio_enabled():
        return []
    
    def _fetch_lmstudio_vision_models(cache_instance):
        """Internal function to fetch vision models from LM Studio."""
        if lms is None or not is_lmstudio_running():
            return []
            
        try:
            logging.debug("Retrieving vision models from LM Studio...")
            response = lms.list_downloaded_models("llm")
            models = []
            
            for model in response:
                if not (hasattr(model, 'model_key') and model.model_key is not None):
                    continue
                
                # Check cache first
                cached_vision = cache_instance.is_lmstudio_vision_model(model.model_key)
                if cached_vision is not None:
                    if cached_vision:
                        models.append(model.model_key)
                    continue
                
                # Check if model supports vision
                is_vision = hasattr(model, 'info') and getattr(model.info, 'vision', False)
                
                # Cache the result using unlocked method (we're already inside the lock)
                cache_instance._set_lmstudio_vision_capability_unlocked(model.model_key, is_vision)
                if is_vision:
                    models.append(model.model_key)
            
            return models
        except Exception as e:
            logging.error(f"Error retrieving vision models from LM Studio: {e}")
            return []
    
    cache = get_llm_cache()
    return cache.get_lmstudio_vision_models(_fetch_lmstudio_vision_models)


def lmstudio_generate_vision(model: str, prompt: str, keep_alive: int = 0, images=None, options=None) -> str:
    """Generate a response from an LM Studio vision model."""
    if not LMSTUDIO_AVAILABLE or lms is None:
        raise ImportError("LM Studio is not available. Please install it to use this function.")
    model_list = get_lmstudio_vision_models()
    if model not in model_list:
        raise ValueError(f"Model '{model}' is not available. Available models: {model_list}")
    seed = (options or {}).get('seed', 0)
    input_images = tensor_to_temp_image(images) if images is not None else []
    lms_model = None
    try:
        if keep_alive >= 1:
            lms_model = lms.llm(model, ttl=keep_alive)
        else:
            lms_model = lms.llm(model)
        chat = lms.Chat()
        if not input_images:
            chat.add_user_message(prompt)
        else:
            image_handles = [lms.prepare_image(image) for image in input_images]
            chat.add_user_message(prompt, images=image_handles)
        response = lms_model.respond(chat)
        if keep_alive < 1:
            lms_model.unload()
        if not response:
            raise ValueError("No valid response received from the model.")
        return clean_response(response.content)
    except Exception as e:
        logging.error(f"Error generating response from LM Studio vision model: {e}")
        if lms_model is not None and keep_alive < 1:
            lms_model.unload()
        return ""


def lmstudio_generate(model: str, prompt: str, keep_alive: int = 0, options=None) -> str:
    """Generate a response from an LM Studio model."""
    if not LMSTUDIO_AVAILABLE or lms is None:
        raise ImportError("LM Studio is not available. Please install it to use this function.")
    model_list = get_lmstudio_models()
    if model not in model_list:
        raise ValueError(f"Model '{model}' is not available. Available models: {model_list}")
    seed = (options or {}).get('seed', 0)
    lms_model = None
    try:
        if keep_alive >= 1:
            lms_model = lms.llm(model, ttl=keep_alive)
        else:
            lms_model = lms.llm(model)

        if lms_model is None:
            raise ValueError(f"Model '{model}' could not be loaded from LM Studio.")
        chat = lms.Chat()
        chat.add_user_message(prompt)
        response = lms_model.respond(chat)
        if keep_alive < 1:
            lms_model.unload()
        if not response:
            raise ValueError("No valid response received from the model.")
        return clean_response(response.content)
    except Exception as e:
        logging.error(f"Error generating response from LM Studio: {e}")
        if lms_model is not None and keep_alive < 1:
            lms_model.unload()
        return ""

def lmstudio_generate_vision_refine(model: str, prompt: str, images=None, options=None, refine_model: str = "", refine_prompt: str = "", refine_options=None) -> tuple[str, str]:
    """Generate a response from an LM Studio vision model and refine it with another model."""
    if not LMSTUDIO_AVAILABLE or lms is None:
        raise ImportError("LM Studio is not available. Please install it to use this function.")
    model_list = get_lmstudio_vision_models()
    if model not in model_list:
        raise ValueError(f"Model '{model}' is not available. Available models: {model_list}")
    seed = (options or {}).get('seed', 0)
    input_images = tensor_to_temp_image(images) if images is not None else []
    lms_model = None
    try:
        lms_model = lms.llm(model)

        chat = lms.Chat()
        if not input_images:
            chat.add_user_message(prompt)
        else:
            image_handles = [lms.prepare_image(image) for image in input_images]
            chat.add_user_message(prompt, images=image_handles)

        response = lms_model.respond(chat)
        initial_response = clean_response(response.content)

        if refine_model == "":
            refine_model = model
        if refine_prompt == "":
            refine_prompt = prompt
        
        if refine_model != model:
            lms_model.unload()
            lms_model = lms.llm(refine_model)

        chat = lms.Chat()
        refine_prompt = f"{refine_prompt}\n{initial_response}"
        refine_options = refine_options or {}
        refine_options['seed'] = seed
        chat.add_user_message(refine_prompt)
        

        refined_response = clean_response(lms_model.respond(chat).content)

        if lms_model is not None:
            lms_model.unload()

        return (initial_response, refined_response)
    except Exception as e:
        logging.error(f"Error generating response from LM Studio model: {e}")
        if lms_model is not None:
            lms_model.unload()
        return ("", "")

def init_ollama():
    """Initialize Ollama if available. Print config values for Ollama."""
    global ollama_client
    
    if not OLLAMA_AVAILABLE or ollama is None:
        logging.info("Ollama is not available; skipping Ollama initialization.")
        return
    
    try:
        # Try to use new settings system
        try:
            from .settings import get_setting, is_feature_enabled
            
            if not is_feature_enabled('enable_ollama'):
                logging.info("Ollama is disabled in settings; skipping initialization.")
                return
            
            use_custom_url = get_setting('ollama_use_custom_url', False)
            custom_url = get_setting('ollama_custom_url', '')
        except ImportError:
            # Fallback to old config system
            from . import config_manager
            config = config_manager.settings_manager.data or {}
            use_custom_url = config.get('ollama_use_custom_url', False)
            custom_url = config.get('ollama_custom_url', '')
        
        if use_custom_url and custom_url:
            ollama_client = ollama.Client(host=custom_url)
            logging.info(f"Ollama client initialized with custom host: {custom_url}")
        else:
            ollama_client = ollama.Client()
            logging.info("Ollama client initialized with default settings.")
    except Exception as e:
        ollama_client = None
        logging.error(f"Failed to initialize Ollama client: {e}")


def init_lmstudio():
    """Initialize LM Studio if available. Print config values for LM Studio."""
    if not LMSTUDIO_AVAILABLE or lms is None:
        logging.info("LM Studio is not available; skipping LM Studio initialization.")
        return
    
    try:
        # Try to use new settings system
        try:
            from .settings import get_setting, is_feature_enabled
            
            if not is_feature_enabled('enable_lmstudio'):
                logging.info("LM Studio is disabled in settings; skipping initialization.")
                return
            
            use_custom_url = get_setting('lmstudio_use_custom_url', False)
            custom_url = get_setting('lmstudio_custom_url', '')
        except ImportError:
            # Fallback to old config system
            from . import config_manager
            config = config_manager.settings_manager.data or {}
            use_custom_url = config.get('lmstudio_use_custom_url', False)
            custom_url = config.get('lmstudio_custom_url', '')
        
        if use_custom_url and custom_url:
            lm_client = lms.get_default_client(custom_url)
            logging.info(f"LM Studio client configured with custom URL: {custom_url}")
        else:
            logging.info("LM Studio using default configuration.")
    except Exception as e:
        logging.error(f"Failed to configure LM Studio: {e}")


def init_llm():
    """Initialize LLM clients."""
    init_ollama()
    init_lmstudio()
    logging.info("LLM clients initialized.")

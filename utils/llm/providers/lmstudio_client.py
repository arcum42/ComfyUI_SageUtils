"""LM Studio provider operations extracted from llm_wrapper.py."""

from typing import Any, cast

from ...llm_cache import get_llm_cache
from ...logger import get_logger
from ...helpers_image import tensor_to_temp_image
from ..common import clean_response, build_lmstudio_config
from ..errors import raise_llm_error

logger = get_logger('llm.providers.lmstudio')


def is_running(lmstudio_available: bool, lms: Any, enabled: bool) -> bool:
    """Check if LM Studio server is running by attempting a lightweight API call."""
    if not lmstudio_available or lms is None:
        return False

    if not enabled:
        return False

    try:
        lms.list_downloaded_models('llm')
        return True
    except Exception:
        return False


def get_models(lmstudio_available: bool, lms: Any, enabled: bool) -> list[str]:
    """Retrieve a list of available models from LM Studio."""
    if not lmstudio_available or lms is None:
        return ['(LM Studio not available)']

    if not enabled:
        return ['(LM Studio not available)']

    def _fetch_lmstudio_models():
        if lms is None or not is_running(lmstudio_available, lms, enabled):
            return []

        try:
            logger.debug('Retrieving models from LM Studio...')
            response = lms.list_downloaded_models('llm')
            return [model.model_key for model in response if hasattr(model, 'model_key') and model.model_key is not None]
        except Exception as e:
            logger.error(f'Error retrieving models from LM Studio: {e}')
            return ['(LM Studio not available)']

    cache = get_llm_cache()
    return cache.get_lmstudio_models(_fetch_lmstudio_models)


def get_vision_models(lmstudio_available: bool, lms: Any, enabled: bool) -> list[str]:
    """Retrieve a list of available vision models from LM Studio."""
    if not lmstudio_available or lms is None:
        return ['(LM Studio not available)']

    if not enabled:
        return ['(LM Studio not available)']

    def _fetch_lmstudio_vision_models(cache_instance):
        if lms is None or not is_running(lmstudio_available, lms, enabled):
            return ['(LM Studio not available)']

        try:
            logger.debug('Retrieving vision models from LM Studio...')
            response = lms.list_downloaded_models('llm')
            models = []

            for model in response:
                if not (hasattr(model, 'model_key') and model.model_key is not None):
                    continue

                cached_vision = cache_instance.is_lmstudio_vision_model(model.model_key)
                if cached_vision is not None:
                    if cached_vision:
                        models.append(model.model_key)
                    continue

                is_vision = hasattr(model, 'info') and getattr(model.info, 'vision', False)
                cache_instance._set_lmstudio_vision_capability_unlocked(model.model_key, is_vision)
                if is_vision:
                    models.append(model.model_key)

            return models
        except Exception as e:
            logger.error(f'Error retrieving vision models from LM Studio: {e}')
            return []

    cache = get_llm_cache()
    return cache.get_lmstudio_vision_models(_fetch_lmstudio_vision_models)


def generate_vision(
    lmstudio_available: bool,
    lms: Any,
    enabled: bool,
    model: str,
    prompt: str,
    keep_alive: int,
    images,
    options,
) -> str:
    """Generate a response from an LM Studio vision model."""
    if not lmstudio_available or lms is None:
        raise_llm_error(ImportError, 'LM Studio is not available. Please install it to use this function.', provider='lmstudio', operation='generate_vision')

    model_list = get_vision_models(lmstudio_available, lms, enabled)
    if model not in model_list:
        raise_llm_error(ValueError, f"Model '{model}' is not available. Available models: {model_list}", provider='lmstudio', operation='generate_vision')

    _seed = (options or {}).get('seed', 0)
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
            raise_llm_error(ValueError, 'No valid response received from the model.', provider='lmstudio', operation='generate_vision')
        return clean_response(response.content)
    except Exception as e:
        logger.error(f'Error generating response from LM Studio vision model: {e}')
        if lms_model is not None and keep_alive < 1:
            lms_model.unload()
        return ''


def generate(
    lmstudio_available: bool,
    lms: Any,
    enabled: bool,
    model: str,
    prompt: str,
    keep_alive: int,
    options,
) -> str:
    """Generate a response from an LM Studio model."""
    if not lmstudio_available or lms is None:
        raise_llm_error(ImportError, 'LM Studio is not available. Please install it to use this function.', provider='lmstudio', operation='generate')

    model_list = get_models(lmstudio_available, lms, enabled)
    if model not in model_list:
        raise_llm_error(ValueError, f"Model '{model}' is not available. Available models: {model_list}", provider='lmstudio', operation='generate')

    _seed = (options or {}).get('seed', 0)
    lms_model = None
    try:
        if keep_alive >= 1:
            lms_model = lms.llm(model, ttl=keep_alive)
        else:
            lms_model = lms.llm(model)

        if lms_model is None:
            raise_llm_error(ValueError, f"Model '{model}' could not be loaded from LM Studio.", provider='lmstudio', operation='generate')

        chat = lms.Chat()
        chat.add_user_message(prompt)
        response = lms_model.respond(chat)
        if keep_alive < 1:
            lms_model.unload()
        if not response:
            raise_llm_error(ValueError, 'No valid response received from the model.', provider='lmstudio', operation='generate')
        return clean_response(response.content)
    except Exception as e:
        logger.error(f'Error generating response from LM Studio: {e}')
        if lms_model is not None and keep_alive < 1:
            lms_model.unload()
        return ''


def generate_vision_refine(
    lmstudio_available: bool,
    lms: Any,
    enabled: bool,
    model: str,
    prompt: str,
    images,
    options,
    refine_model: str,
    refine_prompt: str,
    refine_options,
) -> tuple[str, str]:
    """Generate a response from an LM Studio vision model and refine it with another model."""
    if not lmstudio_available or lms is None:
        raise_llm_error(ImportError, 'LM Studio is not available. Please install it to use this function.', provider='lmstudio', operation='generate_vision_refine')

    model_list = get_vision_models(lmstudio_available, lms, enabled)
    if model not in model_list:
        raise_llm_error(ValueError, f"Model '{model}' is not available. Available models: {model_list}", provider='lmstudio', operation='generate_vision_refine')

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

        if refine_model == '':
            refine_model = model
        if refine_prompt == '':
            refine_prompt = prompt

        if refine_model != model:
            lms_model.unload()
            lms_model = lms.llm(refine_model)

        chat = lms.Chat()
        refine_prompt = f'{refine_prompt}\n{initial_response}'
        refine_options = refine_options or {}
        refine_options['seed'] = seed
        chat.add_user_message(refine_prompt)

        refined_response = clean_response(lms_model.respond(chat).content)

        if lms_model is not None:
            lms_model.unload()

        return (initial_response, refined_response)
    except Exception as e:
        logger.error(f'Error generating response from LM Studio model: {e}')
        if lms_model is not None:
            lms_model.unload()
        return ('', '')


def generate_stream(
    lmstudio_available: bool,
    lms: Any,
    enabled: bool,
    model: str,
    prompt: str,
    keep_alive: int,
    options,
):
    """Generate a simulated streaming response from an LM Studio model."""
    if not lmstudio_available or lms is None:
        raise_llm_error(ImportError, 'LM Studio is not available. Please install it to use this function.', provider='lmstudio', operation='generate_stream')

    model_list = get_models(lmstudio_available, lms, enabled)
    if model not in model_list:
        raise_llm_error(ValueError, f"Model '{model}' is not available. Available models: {model_list}", provider='lmstudio', operation='generate_stream')

    lms_model = None
    try:
        if keep_alive >= 1:
            lms_model = lms.llm(model, ttl=keep_alive)
        else:
            lms_model = lms.llm(model)

        if lms_model is None:
            raise_llm_error(ValueError, f"Failed to load model: {model}", provider='lmstudio', operation='generate_stream')

        config = cast(Any, build_lmstudio_config(options or {}))
        chat = lms.Chat()
        chat.add_user_message(prompt)

        if config:
            response = lms_model.respond(chat, config=config)
        else:
            response = lms_model.respond(chat)

        if keep_alive < 1:
            lms_model.unload()

        if not response:
            raise_llm_error(ValueError, 'No valid response received from the model.', provider='lmstudio', operation='generate_stream')

        response_text = clean_response(response.content)
        chunk_size = 5
        for i in range(0, len(response_text), chunk_size):
            chunk = response_text[i:i + chunk_size]
            yield {
                'chunk': chunk,
                'done': False,
            }

        yield {
            'chunk': '',
            'done': True,
            'full_response': response_text,
        }
    except Exception as e:
        logger.error(f'Error streaming response from LM Studio: {e}')
        if lms_model is not None and keep_alive < 1:
            lms_model.unload()
        yield {
            'chunk': '',
            'done': True,
            'error': str(e),
        }


def generate_vision_stream(
    lmstudio_available: bool,
    lms: Any,
    enabled: bool,
    model: str,
    prompt: str,
    keep_alive: int,
    images,
    options,
):
    """Generate a simulated streaming response from an LM Studio vision model."""
    if not lmstudio_available or lms is None:
        raise_llm_error(ImportError, 'LM Studio is not available. Please install it to use this function.', provider='lmstudio', operation='generate_vision_stream')

    model_list = get_vision_models(lmstudio_available, lms, enabled)
    if model not in model_list:
        raise_llm_error(ValueError, f"Model '{model}' is not available. Available models: {model_list}", provider='lmstudio', operation='generate_vision_stream')

    input_images = tensor_to_temp_image(images) if images is not None else []
    lms_model = None
    try:
        if keep_alive >= 1:
            lms_model = lms.llm(model, ttl=keep_alive)
        else:
            lms_model = lms.llm(model)

        config = cast(Any, build_lmstudio_config(options or {}))
        chat = lms.Chat()
        if not input_images:
            raise_llm_error(ValueError, 'No images provided for vision model.', provider='lmstudio', operation='generate_vision_stream')

        image_handles = [lms.prepare_image(img_path) for img_path in input_images]
        chat.add_user_message(prompt, images=image_handles)

        if config:
            response = lms_model.respond(chat, config=config)
        else:
            response = lms_model.respond(chat)

        if keep_alive < 1:
            lms_model.unload()

        if not response:
            raise_llm_error(ValueError, 'No valid response received from the model.', provider='lmstudio', operation='generate_vision_stream')

        response_text = clean_response(response.content)
        chunk_size = 5
        for i in range(0, len(response_text), chunk_size):
            chunk = response_text[i:i + chunk_size]
            yield {
                'chunk': chunk,
                'done': False,
            }

        yield {
            'chunk': '',
            'done': True,
            'full_response': response_text,
        }
    except Exception as e:
        logger.error(f'Error streaming response from LM Studio vision model: {e}')
        if lms_model is not None and keep_alive < 1:
            lms_model.unload()
        yield {
            'chunk': '',
            'done': True,
            'error': str(e),
        }

"""LM Studio provider operations extracted from llm/service.py."""

import base64
import os
import tempfile
from typing import Any, cast

from ..cache import get_llm_cache
from ...logger import get_logger
from ...helpers_image import tensor_to_temp_image
from ..common import clean_response, build_lmstudio_config
from ..errors import raise_llm_error, report_llm_error, stringify_llm_error
from ..capabilities import ModelCapabilities, get_capability_cache

logger = get_logger('llm.providers.lmstudio')

_PROVIDER_NAME = 'lmstudio'


def _prepare_image_paths(images) -> tuple[list[str], bool]:
    """Normalize tensor or base64 image inputs into temporary file paths."""
    input_images = tensor_to_temp_image(images) if images is not None else []
    if input_images:
        return input_images, False

    image_entries = images if isinstance(images, list) else [images] if images is not None else []
    temp_paths: list[str] = []

    for image in image_entries:
        if not isinstance(image, str) or not image.strip():
            continue

        image_data = image.strip()
        if image_data.startswith('data:') and ',' in image_data:
            image_data = image_data.split(',', 1)[1]

        image_bytes = base64.b64decode(image_data)
        temp_fd, temp_path = tempfile.mkstemp(suffix='.png')
        os.close(temp_fd)
        with open(temp_path, 'wb') as file_handle:
            file_handle.write(image_bytes)
        temp_paths.append(temp_path)

    return temp_paths, True


def _cleanup_temp_paths(paths: list[str]) -> None:
    for path in paths:
        try:
            os.unlink(path)
        except OSError:
            pass


def _safe_get(mapping_or_obj: Any, key: str, default=None):
    if isinstance(mapping_or_obj, dict):
        return mapping_or_obj.get(key, default)
    return getattr(mapping_or_obj, key, default)


def _detect_capabilities_from_model_object(model_obj: Any, model_name: str) -> ModelCapabilities:
    print(f"Detecting capabilities for model '{model_name}' from model object.")
    info = _safe_get(model_obj, 'info', None)
    capabilities_obj = _safe_get(model_obj, 'capabilities', None)

    vision = bool(_safe_get(info, 'vision', False))
    tool_use = bool(_safe_get(info, 'trained_for_tool_use', False) or _safe_get(info, 'tool_use', False))
    reasoning = False
    thinking = False
    print(f"Model info for '{model_name}': {info}")
    print(f"Model capabilities object for '{model_name}': {capabilities_obj}")

    if isinstance(capabilities_obj, dict):
        print(f"Capabilities object for model '{model_name}': {capabilities_obj}")
        vision = vision or bool(capabilities_obj.get('vision'))
        tool_use = tool_use or bool(capabilities_obj.get('trained_for_tool_use') or capabilities_obj.get('tool_use'))
        # Check for reasoning in API metadata
        reasoning_obj = capabilities_obj.get('reasoning')
        if isinstance(reasoning_obj, dict):
            reasoning = True
            # reasoning implies thinking capability
            thinking = True

    context_window = _safe_get(info, 'max_context_length', None)
    if context_window is None:
        context_window = _safe_get(model_obj, 'max_context_length', None)
    if context_window is not None:
        try:
            context_window = int(context_window)
        except (TypeError, ValueError):
            context_window = None

    confidence = 'api' if (info is not None or capabilities_obj is not None) else 'heuristic'

    return ModelCapabilities(
        name=model_name,
        provider=_PROVIDER_NAME,
        vision=vision,
        tool_use=tool_use,
        reasoning=reasoning,
        thinking=thinking,
        supported_modalities=['text'] + (['image'] if vision else []),
        context_window=context_window,
        metadata={
            'info': info if isinstance(info, dict) else {},
            'capabilities': capabilities_obj if isinstance(capabilities_obj, dict) else {},
        },
        confidence=confidence,
    )


def get_model_capabilities(lmstudio_available: bool, lms: Any, enabled: bool, model_obj: Any) -> ModelCapabilities:
    print('Getting model capabilities for model object:', model_obj)
    print("Info:", model_obj.get_info() if hasattr(model_obj, 'get_info') else 'N/A')
    model_name = str(_safe_get(model_obj, 'model_key', '') or _safe_get(model_obj, 'id', '') or 'unknown')
    if not lmstudio_available or lms is None or not enabled:
        print('LM Studio not available or not enabled, returning default capabilities with low confidence.')
        return ModelCapabilities(name=model_name, provider=_PROVIDER_NAME, confidence='guess')

    cap_cache = get_capability_cache()
    cached = cap_cache.get(_PROVIDER_NAME, model_name)
    if cached is not None:
        print(f'Capabilities for model "{model_name}" found in cache: {cached}')
        return cached

    capabilities = _detect_capabilities_from_model_object(model_obj, model_name)
    cap_cache.set(capabilities)
    print(f'Capabilities for model "{model_name}" detected and cached: {capabilities}')
    return capabilities


# ===========================================================================
# PRIMITIVE FUNCTIONS FOR TWO-PHASE LOADING / GENERATION
# ===========================================================================

def load_model(lmstudio_available: bool, lms: Any, enabled: bool, model: str, keep_alive: int) -> Any:
    """Load and return an lms_model handle. Caller is responsible for unloading."""
    if not lmstudio_available or lms is None:
        raise_llm_error(ImportError, 'LM Studio is not available.', provider='lmstudio', operation='load_model')
    if not enabled:
        raise_llm_error(RuntimeError, 'LM Studio is not enabled.', provider='lmstudio', operation='load_model')
    logger.info(f"Loading model '{model}'...")
    lms_model = None
    try:
        if keep_alive >= 1:
            lms_model = lms.llm(model, ttl=keep_alive)
        else:
            lms_model = lms.llm(model)
    except Exception as e:
        normalized_cause = RuntimeError(stringify_llm_error(e))
        raise_llm_error(
            RuntimeError,
            f"Failed to load model '{model}'",
            provider='lmstudio',
            operation='load_model',
            cause=normalized_cause,
        )
    if lms_model is None:
        raise_llm_error(RuntimeError, f"Failed to load model '{model}'", provider='lmstudio', operation='load_model')
    logger.info(f"Model '{model}' loaded successfully.")
    return lms_model


def generate_with_model(lms_model: Any, lms: Any, prompt: str, options) -> str:
    """Run text inference on an already-loaded lms_model."""
    logger.debug(f'Generating with prompt: {prompt[:200]!r}')
    chat = lms.Chat()
    chat.add_user_message(prompt)
    config = cast(Any, build_lmstudio_config(options or {}))
    if config:
        response = lms_model.respond(chat, config=config)
    else:
        response = lms_model.respond(chat)
    if not response:
        raise_llm_error(ValueError, 'No valid response received from the model.', provider='lmstudio', operation='generate_with_model')
    result = clean_response(response.content)
    logger.debug(f'Generation complete. Response length: {len(result)} characters.')
    return result


def generate_stream_with_model(lms_model: Any, lms: Any, prompt: str, options):
    """Run streaming text inference on an already-loaded lms_model."""
    chat = lms.Chat()
    chat.add_user_message(prompt)
    config = cast(Any, build_lmstudio_config(options or {}))
    stream = lms_model.respond_stream(chat, config=config) if config else lms_model.respond_stream(chat)

    full_response = ''
    for fragment in stream:
        chunk = getattr(fragment, 'content', '')
        if not isinstance(chunk, str) or not chunk:
            continue
        full_response += chunk
        yield {
            'chunk': chunk,
            'done': False,
        }

    yield {
        'chunk': '',
        'done': True,
        'full_response': clean_response(full_response),
    }


def generate_vision_with_model(lms_model: Any, lms: Any, prompt: str, images, options) -> str:
    """Run vision inference on an already-loaded lms_model."""
    logger.debug(f'Generating vision with prompt: {prompt[:200]!r}')
    input_images, should_cleanup = _prepare_image_paths(images)
    try:
        chat = lms.Chat()
        if not input_images:
            chat.add_user_message(prompt)
        else:
            image_handles = [lms.prepare_image(image) for image in input_images]
            chat.add_user_message(prompt, images=image_handles)
        config = cast(Any, build_lmstudio_config(options or {}))
        if config:
            response = lms_model.respond(chat, config=config)
        else:
            response = lms_model.respond(chat)
        if not response:
            raise_llm_error(ValueError, 'No valid response received from the model.', provider='lmstudio', operation='generate_vision_with_model')
        result = clean_response(response.content)
        logger.debug(f'Generation complete. Response length: {len(result)} characters.')
        return result
    finally:
        if should_cleanup:
            _cleanup_temp_paths(input_images)


def generate_vision_stream_with_model(lms_model: Any, lms: Any, prompt: str, images, options):
    """Run streaming vision inference on an already-loaded lms_model."""
    input_images, should_cleanup = _prepare_image_paths(images)
    try:
        chat = lms.Chat()
        if not input_images:
            raise_llm_error(ValueError, 'No images provided for vision model.', provider='lmstudio', operation='generate_vision_stream_with_model')

        image_handles = [lms.prepare_image(image) for image in input_images]
        chat.add_user_message(prompt, images=image_handles)
        config = cast(Any, build_lmstudio_config(options or {}))
        stream = lms_model.respond_stream(chat, config=config) if config else lms_model.respond_stream(chat)

        full_response = ''
        for fragment in stream:
            chunk = getattr(fragment, 'content', '')
            if not isinstance(chunk, str) or not chunk:
                continue
            full_response += chunk
            yield {
                'chunk': chunk,
                'done': False,
            }

        yield {
            'chunk': '',
            'done': True,
            'full_response': clean_response(full_response),
        }
    finally:
        if should_cleanup:
            _cleanup_temp_paths(input_images)


def unload_model(lms_model: Any) -> None:
    """Unload an lms_model handle."""
    logger.debug('Unloading model.')
    lms_model.unload()


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
            report_llm_error('Error retrieving models from LM Studio', provider='lmstudio', operation='get_models', cause=e)
            return ['(LM Studio not available)']

    cache = get_llm_cache()
    return cache.get_model_list(
        _PROVIDER_NAME,
        'models',
        _fetch_lmstudio_models,
        label='LM Studio models',
    )


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

                print(model.__dict__)
                capabilities = get_model_capabilities(lmstudio_available, lms, enabled, model)
                cache_instance.set_model_capability(_PROVIDER_NAME, str(model.model_key), capabilities.vision)
                if capabilities.vision:
                    models.append(model.model_key)

            return models
        except Exception as e:
            report_llm_error('Error retrieving vision models from LM Studio', provider='lmstudio', operation='get_vision_models', cause=e)
            return []

    cache = get_llm_cache()
    return cache.get_model_list(
        _PROVIDER_NAME,
        'vision_models',
        _fetch_lmstudio_vision_models,
        label='LM Studio vision models',
        pass_self=True,
    )


def get_tool_models(lmstudio_available: bool, lms: Any, enabled: bool) -> list[str]:
    if not lmstudio_available or lms is None or not enabled:
        return ['(LM Studio not available)']

    def _fetch_tool_models() -> list[str]:
        if lms is None or not is_running(lmstudio_available, lms, enabled):
            return ['(LM Studio not available)']

        response = lms.list_downloaded_models('llm')
        models: list[str] = []
        for model in response:
            model_name = str(_safe_get(model, 'model_key', '') or '')
            if not model_name:
                continue
            if get_model_capabilities(lmstudio_available, lms, enabled, model).tool_use:
                models.append(model_name)
        return models

    cache = get_llm_cache()
    return cache.get_model_list(
        _PROVIDER_NAME,
        'tool_models',
        _fetch_tool_models,
        label='LM Studio tool-capable models',
    )


def get_reasoning_models(lmstudio_available: bool, lms: Any, enabled: bool) -> list[str]:
    if not lmstudio_available or lms is None or not enabled:
        return ['(LM Studio not available)']

    def _fetch_reasoning_models() -> list[str]:
        if lms is None or not is_running(lmstudio_available, lms, enabled):
            return ['(LM Studio not available)']

        response = lms.list_downloaded_models('llm')
        models: list[str] = []
        for model in response:
            model_name = str(_safe_get(model, 'model_key', '') or '')
            if not model_name:
                continue
            if get_model_capabilities(lmstudio_available, lms, enabled, model).reasoning:
                models.append(model_name)
        return models

    cache = get_llm_cache()
    return cache.get_model_list(
        _PROVIDER_NAME,
        'reasoning_models',
        _fetch_reasoning_models,
        label='LM Studio reasoning models',
    )


def get_model_capabilities_map(lmstudio_available: bool, lms: Any, enabled: bool) -> dict[str, ModelCapabilities]:
    if not lmstudio_available or lms is None or not enabled:
        return {}

    if not is_running(lmstudio_available, lms, enabled):
        return {}

    response = lms.list_downloaded_models('llm')
    capabilities_map: dict[str, ModelCapabilities] = {}
    for model in response:
        model_name = str(_safe_get(model, 'model_key', '') or '')
        if not model_name:
            continue
        capabilities_map[model_name] = get_model_capabilities(lmstudio_available, lms, enabled, model)
    return capabilities_map


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

    lms_model = None
    try:
        lms_model = load_model(lmstudio_available, lms, enabled, model, keep_alive)
        response = generate_vision_with_model(lms_model, lms, prompt, images, options)
        if keep_alive < 1:
            unload_model(lms_model)
        return response
    except Exception as e:
        report_llm_error('Error generating response from LM Studio vision model', provider='lmstudio', operation='generate_vision', cause=e)
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

    lms_model = None
    try:
        lms_model = load_model(lmstudio_available, lms, enabled, model, keep_alive)
        response = generate_with_model(lms_model, lms, prompt, options)
        if keep_alive < 1:
            unload_model(lms_model)
        return response
    except Exception as e:
        report_llm_error('Error generating response from LM Studio', provider='lmstudio', operation='generate', cause=e)
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
    lms_model = None
    try:
        lms_model = load_model(lmstudio_available, lms, enabled, model, 0)
        initial_response = generate_vision_with_model(lms_model, lms, prompt, images, options)

        if refine_model == '':
            refine_model = model
        if refine_prompt == '':
            refine_prompt = prompt

        if refine_model != model:
            unload_model(lms_model)
            lms_model = load_model(lmstudio_available, lms, enabled, refine_model, 0)

        refine_prompt = f'{refine_prompt}\n{initial_response}'
        refine_options = refine_options or {}
        refine_options['seed'] = seed
        refined_response = generate_with_model(lms_model, lms, refine_prompt, refine_options)
        unload_model(lms_model)
        lms_model = None

        return (initial_response, refined_response)
    except Exception as e:
        report_llm_error('Error generating response from LM Studio model', provider='lmstudio', operation='generate_vision_refine', cause=e)
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
    """Generate a real streaming response from an LM Studio model."""
    if not lmstudio_available or lms is None:
        raise_llm_error(ImportError, 'LM Studio is not available. Please install it to use this function.', provider='lmstudio', operation='generate_stream')

    model_list = get_models(lmstudio_available, lms, enabled)
    if model not in model_list:
        raise_llm_error(ValueError, f"Model '{model}' is not available. Available models: {model_list}", provider='lmstudio', operation='generate_stream')

    lms_model = None
    try:
        lms_model = load_model(lmstudio_available, lms, enabled, model, keep_alive)
        for chunk_data in generate_stream_with_model(lms_model, lms, prompt, options):
            yield chunk_data
        if keep_alive < 1:
            unload_model(lms_model)
    except Exception as e:
        report_llm_error('Error streaming response from LM Studio', provider='lmstudio', operation='generate_stream', cause=e)
        if lms_model is not None and keep_alive < 1:
            lms_model.unload()
        yield {
            'chunk': '',
            'done': True,
            'error': stringify_llm_error(e),
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
    """Generate a real streaming response from an LM Studio vision model."""
    if not lmstudio_available or lms is None:
        raise_llm_error(ImportError, 'LM Studio is not available. Please install it to use this function.', provider='lmstudio', operation='generate_vision_stream')

    model_list = get_vision_models(lmstudio_available, lms, enabled)
    if model not in model_list:
        raise_llm_error(ValueError, f"Model '{model}' is not available. Available models: {model_list}", provider='lmstudio', operation='generate_vision_stream')

    lms_model = None
    try:
        lms_model = load_model(lmstudio_available, lms, enabled, model, keep_alive)
        if images is None:
            raise_llm_error(ValueError, 'No images provided for vision model.', provider='lmstudio', operation='generate_vision_stream')

        for chunk_data in generate_vision_stream_with_model(lms_model, lms, prompt, images, options):
            yield chunk_data
        if keep_alive < 1:
            unload_model(lms_model)
    except Exception as e:
        report_llm_error('Error streaming response from LM Studio vision model', provider='lmstudio', operation='generate_vision_stream', cause=e)
        if lms_model is not None and keep_alive < 1:
            lms_model.unload()
        yield {
            'chunk': '',
            'done': True,
            'error': stringify_llm_error(e),
        }

"""Ollama provider operations extracted from llm_wrapper.py."""

from typing import Any

from ...llm_cache import get_llm_cache
from ...logger import get_logger
from ..common import clean_response, build_response_parameters
from ..errors import raise_llm_error, report_llm_error, stringify_llm_error

logger = get_logger('llm.providers.ollama')

_OLLAMA_UNAVAILABLE_MESSAGE = '(Ollama not available)'


def _ollama_unavailable_models() -> list[str]:
    return [_OLLAMA_UNAVAILABLE_MESSAGE]


def _is_ollama_unavailable(ollama_available: bool, ollama_client: Any, enabled: bool) -> bool:
    return (not ollama_available) or ollama_client is None or (not enabled)


def get_vision_models(ollama_available: bool, ollama_client: Any, enabled: bool) -> list[str]:
    """Retrieve a list of available vision models from Ollama."""
    if _is_ollama_unavailable(ollama_available, ollama_client, enabled):
        return _ollama_unavailable_models()

    def _fetch_ollama_vision_models(cache_instance):
        if ollama_client is None:
            return _ollama_unavailable_models()

        try:
            logger.debug('Fetching vision models from Ollama...')
            response = ollama_client.list()
            models = []

            for model in response.models:
                if model.model is None:
                    continue

                logger.debug(f'Checking model: {model.model}')

                cached_vision = cache_instance.is_ollama_vision_model(model.model)
                if cached_vision is not None:
                    logger.debug(f'Model {model.model} cached as vision: {cached_vision}')
                    if cached_vision:
                        models.append(model.model)
                    continue

                is_vision = False
                capabilities = getattr(model, 'capabilities', None)
                if capabilities and 'vision' in capabilities:
                    is_vision = True
                elif not capabilities:
                    try:
                        show_response = ollama_client.show(str(model.model))
                        if 'vision' in getattr(show_response, 'capabilities', []):
                            is_vision = True
                    except Exception as e:
                        logger.debug(f'Failed to get capabilities for {model.model}: {e}')

                logger.debug(f'Caching vision capability for {model.model}: {is_vision}')
                cache_instance._set_ollama_vision_capability_unlocked(model.model, is_vision)
                if is_vision:
                    models.append(model.model)

            logger.debug(f'Found {len(models)} vision models.')
            return models
        except Exception as e:
            report_llm_error('Error retrieving vision models from Ollama', provider='ollama', operation='get_vision_models', cause=e)
            return []

    cache = get_llm_cache()
    return cache.get_ollama_vision_models(_fetch_ollama_vision_models)


def get_models(ollama_available: bool, ollama_client: Any, enabled: bool) -> list[str]:
    """Retrieve a list of available models from Ollama."""
    if _is_ollama_unavailable(ollama_available, ollama_client, enabled):
        return _ollama_unavailable_models()

    def _fetch_ollama_models():
        if ollama_client is None:
            return _ollama_unavailable_models()

        try:
            logger.info('Fetching models from Ollama...')
            response = ollama_client.list()
            logger.info(f'Found {len(response.models)} models.')
            return [model.model for model in response.models if model.model is not None]
        except Exception as e:
            report_llm_error('Error retrieving models from Ollama', provider='ollama', operation='get_models', cause=e)
            return []

    cache = get_llm_cache()
    logger.debug('Fetching Ollama models from cache...')
    return cache.get_ollama_models(_fetch_ollama_models)


# ===========================================================================
# PRIMITIVE FUNCTIONS FOR TWO-PHASE LOADING / GENERATION
# ===========================================================================

def preload_model(ollama_available: bool, ollama_client: Any, enabled: bool, model: str, keep_alive: float) -> bool:
    """Pre-warm a model by sending a generate request with an empty prompt.

    Ollama loads the model into GPU memory and responds with done_reason='load'.
    Subsequent generate calls will not incur the initial load delay as long as
    keep_alive has not expired.

    Returns True if the model was loaded successfully, False otherwise.
    """
    if _is_ollama_unavailable(ollama_available, ollama_client, enabled):
        return False

    logger.info(f"Loading model '{model}'...")
    try:
        response = ollama_client.generate(model=model, prompt='', keep_alive=keep_alive)
        loaded = getattr(response, 'done_reason', None) == 'load'
        if loaded:
            logger.info(f"Model '{model}' loaded successfully.")
        else:
            logger.debug(f"Preload response for '{model}': done_reason={getattr(response, 'done_reason', None)!r}")
        return True
    except Exception as e:
        report_llm_error(f"Failed to preload model '{model}'", provider='ollama', operation='preload_model', cause=e)
        return False


def generate_preloaded(
    ollama_available: bool,
    ollama_client: Any,
    enabled: bool,
    model: str,
    prompt: str,
    keep_alive: float,
    options,
    system_prompt: str,
) -> str:
    """Generate a response assuming the model is already loaded in Ollama.

    Semantically identical to generate() but signals to the caller that no
    initial load delay is expected (the model was pre-warmed via preload_model).
    """
    logger.debug(f'Generating with prompt: {prompt[:200]!r}')
    if not ollama_available or ollama_client is None:
        raise_llm_error(ImportError, 'Ollama is not available. Please install it to use this function.', provider='ollama', operation='generate_preloaded')

    try:
        options = options or {}
        response_parameters = build_response_parameters(model, prompt, keep_alive, options, system_prompt, None)
        response = ollama_client.generate(**response_parameters)
        if not response or 'response' not in response:
            raise_llm_error(ValueError, 'No valid response received from the model.', provider='ollama', operation='generate_preloaded')
        result = clean_response(response['response'])
        logger.debug(f'Generation complete. Response length: {len(result)} characters.')
        return result
    except Exception as e:
        report_llm_error('Error generating response from Ollama (preloaded)', provider='ollama', operation='generate_preloaded', cause=e)
        return ''


def generate_vision(
    ollama_available: bool,
    ollama_client: Any,
    enabled: bool,
    model: str,
    prompt: str,
    keep_alive: float,
    images,
    options,
    system_prompt: str,
) -> str:
    """Generate a response from an Ollama vision model."""
    if not ollama_available or ollama_client is None:
        raise_llm_error(ImportError, 'Ollama is not available. Please install it to use this function.', provider='ollama', operation='generate_vision')

    vision_models = get_vision_models(ollama_available, ollama_client, enabled)
    if model not in vision_models:
        raise_llm_error(ValueError, f"Model '{model}' is not available. Available models: {vision_models}", provider='ollama', operation='generate_vision')
    if images is None:
        raise_llm_error(ValueError, 'No images provided for vision model.', provider='ollama', operation='generate_vision')

    try:
        options = options or {}
        options['seed'] = options.get('seed', 0)
        response_parameters = build_response_parameters(model, prompt, keep_alive, options, system_prompt, images)
        response = ollama_client.generate(**response_parameters)
        if not response or 'response' not in response:
            raise_llm_error(ValueError, 'No valid response received from the model.', provider='ollama', operation='generate_vision')
        return clean_response(response['response'])
    except Exception as e:
        report_llm_error('Error generating response from Ollama vision model', provider='ollama', operation='generate_vision', cause=e)
        return ''


def generate(
    ollama_available: bool,
    ollama_client: Any,
    enabled: bool,
    model: str,
    prompt: str,
    keep_alive: float,
    options,
    system_prompt: str,
) -> str:
    """Generate a response from an Ollama model."""
    if not ollama_available or ollama_client is None:
        raise_llm_error(ImportError, 'Ollama is not available. Please install it to use this function.', provider='ollama', operation='generate')

    models = get_models(ollama_available, ollama_client, enabled)
    if model not in models:
        raise_llm_error(ValueError, f"Model '{model}' is not available. Available models: {models}", provider='ollama', operation='generate')

    try:
        options = options or {}
        response_parameters = build_response_parameters(model, prompt, keep_alive, options, system_prompt, None)
        response = ollama_client.generate(**response_parameters)
        if not response or 'response' not in response:
            raise_llm_error(ValueError, 'No valid response received from the model.', provider='ollama', operation='generate')
        return clean_response(response['response'])
    except Exception as e:
        report_llm_error('Error generating response from Ollama', provider='ollama', operation='generate', cause=e)
        return ''


def generate_vision_refine(
    ollama_available: bool,
    ollama_client: Any,
    enabled: bool,
    model: str,
    prompt: str,
    images,
    options,
    refine_model: str,
    refine_prompt: str,
    refine_options,
) -> tuple[str, str]:
    """Generate a response from an Ollama vision model and refine it with another model."""
    if not ollama_available or ollama_client is None:
        raise_llm_error(ImportError, 'Ollama is not available. Please install it to use this function.', provider='ollama', operation='generate_vision_refine')

    vision_models = get_vision_models(ollama_available, ollama_client, enabled)
    if model not in vision_models:
        raise_llm_error(ValueError, f"Model '{model}' is not available. Available models: {vision_models}", provider='ollama', operation='generate_vision_refine')
    if images is None:
        raise_llm_error(ValueError, 'No images provided for vision model.', provider='ollama', operation='generate_vision_refine')

    try:
        options = options or {}
        options['seed'] = options.get('seed', 0)
        refine_options = refine_options or {}
        refine_options['seed'] = refine_options.get('seed', 0)

        if refine_model == '':
            refine_model = model
        if refine_prompt == '':
            refine_prompt = prompt

        response_parameters = build_response_parameters(model, prompt, 0, options, '', images)
        response = ollama_client.generate(**response_parameters)
        if not response or 'response' not in response:
            raise_llm_error(ValueError, 'No valid response received from the vision model.', provider='ollama', operation='generate_vision_refine')

        initial_response = clean_response(response['response'])
        refine_prompt = f'{refine_prompt}\n{initial_response}'
        refine_options['seed'] = options.get('seed', 0)
        refined_response_parameters = build_response_parameters(refine_model, refine_prompt, 0, refine_options, '', None)

        refined_response = ollama_client.generate(**refined_response_parameters)
        if not refined_response or 'response' not in refined_response:
            raise_llm_error(ValueError, 'No valid response received from the refining model.', provider='ollama', operation='generate_vision_refine')

        return (initial_response, clean_response(refined_response['response']))
    except Exception as e:
        report_llm_error('Error generating response from Ollama vision model', provider='ollama', operation='generate_vision_refine', cause=e)
        return ('', '')


def generate_stream(
    ollama_available: bool,
    ollama_client: Any,
    enabled: bool,
    model: str,
    prompt: str,
    keep_alive: float,
    options,
    system_prompt: str,
):
    """Generate a streaming response from an Ollama model."""
    if not ollama_available or ollama_client is None:
        raise_llm_error(ImportError, 'Ollama is not available. Please install it to use this function.', provider='ollama', operation='generate_stream')

    models = get_models(ollama_available, ollama_client, enabled)
    if model not in models:
        raise_llm_error(ValueError, f"Model '{model}' is not available. Available models: {models}", provider='ollama', operation='generate_stream')

    try:
        options = options or {}
        response_parameters = build_response_parameters(model, prompt, keep_alive, options, system_prompt, None)
        response_parameters['stream'] = True

        full_response = ''
        for chunk in ollama_client.generate(**response_parameters):
            if 'response' not in chunk:
                continue

            chunk_text = chunk['response']
            full_response += chunk_text
            done = chunk.get('done', False)

            yield {
                'chunk': chunk_text,
                'done': done,
            }

            if done:
                break

        yield {
            'chunk': '',
            'done': True,
            'full_response': clean_response(full_response),
        }
    except Exception as e:
        report_llm_error('Error streaming response from Ollama', provider='ollama', operation='generate_stream', cause=e)
        yield {
            'chunk': '',
            'done': True,
            'error': stringify_llm_error(e),
        }


def generate_vision_stream(
    ollama_available: bool,
    ollama_client: Any,
    enabled: bool,
    model: str,
    prompt: str,
    keep_alive: float,
    images,
    options,
    system_prompt: str,
):
    """Generate a streaming response from an Ollama vision model."""
    if not ollama_available or ollama_client is None:
        raise_llm_error(ImportError, 'Ollama is not available. Please install it to use this function.', provider='ollama', operation='generate_vision_stream')

    vision_models = get_vision_models(ollama_available, ollama_client, enabled)
    if model not in vision_models:
        raise_llm_error(ValueError, f"Model '{model}' is not available. Available models: {vision_models}", provider='ollama', operation='generate_vision_stream')
    if images is None:
        raise_llm_error(ValueError, 'No images provided for vision model.', provider='ollama', operation='generate_vision_stream')

    try:
        options = options or {}
        options['seed'] = options.get('seed', 0)

        response_parameters = build_response_parameters(model, prompt, keep_alive, options, system_prompt, images)
        response_parameters['stream'] = True

        full_response = ''
        for chunk in ollama_client.generate(**response_parameters):
            if 'response' not in chunk:
                continue

            chunk_text = chunk['response']
            full_response += chunk_text
            done = chunk.get('done', False)

            yield {
                'chunk': chunk_text,
                'done': done,
            }

            if done:
                break

        yield {
            'chunk': '',
            'done': True,
            'full_response': clean_response(full_response),
        }
    except Exception as e:
        report_llm_error('Error streaming response from Ollama vision model', provider='ollama', operation='generate_vision_stream', cause=e)
        yield {
            'chunk': '',
            'done': True,
            'error': stringify_llm_error(e),
        }

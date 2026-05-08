"""Ollama provider operations extracted from llm/service.py."""

from typing import Any

from ..cache import get_llm_cache
from ...logger import get_logger
from ..common import clean_response, build_response_parameters
from ..errors import raise_llm_error, report_llm_error, stringify_llm_error
from ..capabilities import ModelCapabilities, get_capability_cache

logger = get_logger('llm.providers.ollama')

_PROVIDER_NAME = 'ollama'

_OLLAMA_UNAVAILABLE_MESSAGE = '(Ollama not available)'


def _ollama_unavailable_models() -> list[str]:
    return [_OLLAMA_UNAVAILABLE_MESSAGE]


def _is_ollama_unavailable(ollama_available: bool, ollama_client: Any, enabled: bool) -> bool:
    return (not ollama_available) or ollama_client is None or (not enabled)


def _safe_get(mapping_or_obj: Any, key: str, default=None):
    if isinstance(mapping_or_obj, dict):
        return mapping_or_obj.get(key, default)
    return getattr(mapping_or_obj, key, default)


def _detect_capabilities_from_metadata(model_name: str, model_obj: Any, show_response: Any) -> ModelCapabilities:
    capabilities_obj = _safe_get(model_obj, 'capabilities', None)
    capabilities_list: list[str] = []
    if isinstance(capabilities_obj, list):
        capabilities_list = [str(item).lower() for item in capabilities_obj]

    show_capabilities = _safe_get(show_response, 'capabilities', None)
    if isinstance(show_capabilities, list):
        for item in show_capabilities:
            lowered = str(item).lower()
            if lowered not in capabilities_list:
                capabilities_list.append(lowered)

    details = _safe_get(show_response, 'details', None)
    families: list[str] = []
    if isinstance(details, dict):
        families_obj = details.get('families')
        if isinstance(families_obj, list):
            families = [str(item).lower() for item in families_obj]

    template = str(_safe_get(show_response, 'template', '')).lower()
    lowered_name = model_name.lower()

    vision = ('vision' in capabilities_list) or ('vision' in families) or ('clip' in families)
    tool_use = any(token in capabilities_list for token in ('tools', 'tool_use', 'function_calling'))
    thinking = ('thinking' in capabilities_list) or ('<think>' in template)
    reasoning = thinking or any(marker in lowered_name for marker in ('deepseek-r1', 'qwq', 'o1', 'o3', 'reasoning'))

    context_window = None
    model_info = _safe_get(show_response, 'model_info', None)
    if isinstance(model_info, dict):
        for key, value in model_info.items():
            if 'context_length' in str(key).lower():
                try:
                    context_window = int(value)
                    break
                except (TypeError, ValueError):
                    continue

    has_api_metadata = bool(capabilities_list or families or template or context_window)
    confidence = 'api' if has_api_metadata else 'heuristic'

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
            'capabilities': capabilities_list,
            'details': details if isinstance(details, dict) else {},
            'template': template,
        },
        confidence=confidence,
    )


def get_model_capabilities(ollama_available: bool, ollama_client: Any, enabled: bool, model_name: str, model_obj: Any = None) -> ModelCapabilities:
    if _is_ollama_unavailable(ollama_available, ollama_client, enabled):
        return ModelCapabilities(name=model_name, provider=_PROVIDER_NAME, confidence='guess')

    cap_cache = get_capability_cache()
    cached = cap_cache.get(_PROVIDER_NAME, model_name)
    if cached is not None:
        return cached

    show_response = {}
    if ollama_client is not None:
        try:
            show_response = ollama_client.show(model_name)
        except Exception as e:
            logger.debug(f'Failed to query Ollama show metadata for {model_name}: {e}')

    capabilities = _detect_capabilities_from_metadata(model_name, model_obj or {}, show_response or {})
    cap_cache.set(capabilities)
    return capabilities


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

                capabilities = get_model_capabilities(ollama_available, ollama_client, enabled, str(model.model), model)
                logger.debug(f'Caching vision capability for {model.model}: {capabilities.vision}')
                cache_instance.set_model_capability(_PROVIDER_NAME, str(model.model), capabilities.vision)
                if capabilities.vision:
                    models.append(model.model)

            logger.debug(f'Found {len(models)} vision models.')
            return models
        except Exception as e:
            report_llm_error('Error retrieving vision models from Ollama', provider='ollama', operation='get_vision_models', cause=e)
            return []

    cache = get_llm_cache()
    return cache.get_model_list(
        _PROVIDER_NAME,
        'vision_models',
        _fetch_ollama_vision_models,
        label='Ollama vision models',
        pass_self=True,
    )


def get_tool_models(ollama_available: bool, ollama_client: Any, enabled: bool) -> list[str]:
    if _is_ollama_unavailable(ollama_available, ollama_client, enabled):
        return _ollama_unavailable_models()

    def _fetch_tool_models() -> list[str]:
        models = get_models(ollama_available, ollama_client, enabled)
        return [
            model_name
            for model_name in models
            if not model_name.startswith('(')
            and get_model_capabilities(ollama_available, ollama_client, enabled, model_name).tool_use
        ]

    cache = get_llm_cache()
    return cache.get_model_list(
        _PROVIDER_NAME,
        'tool_models',
        _fetch_tool_models,
        label='Ollama tool-capable models',
    )


def get_reasoning_models(ollama_available: bool, ollama_client: Any, enabled: bool) -> list[str]:
    if _is_ollama_unavailable(ollama_available, ollama_client, enabled):
        return _ollama_unavailable_models()

    def _fetch_reasoning_models() -> list[str]:
        models = get_models(ollama_available, ollama_client, enabled)
        return [
            model_name
            for model_name in models
            if not model_name.startswith('(')
            and get_model_capabilities(ollama_available, ollama_client, enabled, model_name).reasoning
        ]

    cache = get_llm_cache()
    return cache.get_model_list(
        _PROVIDER_NAME,
        'reasoning_models',
        _fetch_reasoning_models,
        label='Ollama reasoning models',
    )


def get_model_capabilities_map(ollama_available: bool, ollama_client: Any, enabled: bool) -> dict[str, ModelCapabilities]:
    if _is_ollama_unavailable(ollama_available, ollama_client, enabled):
        return {}

    model_names = get_models(ollama_available, ollama_client, enabled)
    capabilities_map: dict[str, ModelCapabilities] = {}
    for model_name in model_names:
        if model_name.startswith('('):
            continue
        capabilities_map[model_name] = get_model_capabilities(ollama_available, ollama_client, enabled, model_name)
    return capabilities_map


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
    return cache.get_model_list(
        _PROVIDER_NAME,
        'models',
        _fetch_ollama_models,
        label='Ollama models',
    )


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

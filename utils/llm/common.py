"""Shared LLM helper utilities extracted from llm_wrapper.py."""

from .tensor import tensor_to_base64_safe


def clean_response(response: str) -> str:
    """Clean the response from the model by removing unnecessary tags."""
    if not response:
        return ''
    response = response.strip()
    for tag in ('</end_of_turn>', '>end_of_turn>'):
        if response.endswith(tag):
            response = response[: -len(tag)].strip()
    return response


def build_response_parameters(model: str, prompt: str, keep_alive: float, options: dict, system_prompt: str, images) -> dict:
    """Build the response parameters for Ollama generate call."""
    response_parameters = {
        'model': model,
        'prompt': prompt,
        'stream': False,
        'keep_alive': keep_alive,
    }
    if system_prompt and isinstance(system_prompt, str) and system_prompt != '':
        response_parameters['system'] = system_prompt

    if options and isinstance(options, dict):
        response_parameters['options'] = options

    if images is not None:
        response_parameters['images'] = tensor_to_base64_safe(images)

    return response_parameters


def build_lmstudio_config(options: dict) -> dict:
    """Build LM Studio configuration from options dictionary."""
    config = {}

    if not options:
        return config

    if 'temperature' in options:
        config['temperature'] = options['temperature']

    if 'max_tokens' in options:
        config['maxTokens'] = options['max_tokens']

    if 'topKSampling' in options:
        config['topKSampling'] = options['topKSampling']

    if 'topPSampling' in options:
        config['topPSampling'] = options['topPSampling']

    if 'repeatPenalty' in options:
        config['repeatPenalty'] = options['repeatPenalty']

    if 'minPSampling' in options:
        config['minPSampling'] = options['minPSampling']

    return config

"""
LLM Routes Module
Handles LLM chat endpoints for Ollama, LM Studio, and Native CLIP integration.
"""

# This module is intentionally thin. It delegates business logic, provider
# capability checks, model discovery, and validation to `utils/llm/service.py`
# and `utils/llm/routes_helpers.py`.

import json
from aiohttp import web
from pathlib import Path
from datetime import datetime

# ComfyUI related imports
from server import PromptServer

# SageUtils specific imports
from ..utils.logger import get_logger
from ..utils.settings import get_setting
from ..utils.llm import native as llm_native, presets, routes_helpers, set_llm_error_reporter, system_prompts
from ..utils.llm import service as llm
from ..utils.llm.routes_helpers import (
    get_compatible_models,
    get_available_presets_full,
    clear_last_llm_error,
    set_last_llm_error,
    write_sse_error_from_exception,
    write_provider_and_native_error_if_unavailable,
    error_response as llm_error_response,
    error_response_from_exception as llm_error_response_from_exception,
)
from ..utils.llm.provider_keys import (
    LMSTUDIO_REST_KEY,
    NATIVE_KEY,
    OLLAMA_REST_KEY,
    OPENAI_KEY,
    ROUTE_PROVIDER_KEYS,
)
from ..utils.config_manager import llm_prompts

from .base import route_error_handler, success_response, error_response, validate_json_body

logger = get_logger('routes.llm')

STATUS_KEY_SUFFIX = '_available'


def _status_key(provider_key: str) -> str:
    return f'{provider_key}{STATUS_KEY_SUFFIX}'

# Route list for documentation and registration tracking
_route_list = []


def _append_route(method: str, path: str, description: str) -> None:
    _route_list.append({
        'method': method,
        'path': path,
        'description': description,
    })


def _ensure_promptserver_progress_context():
    """Ensure PromptServer progress hook state exists for direct native generation calls.

    Native CLIP generation from routes can run outside queued prompt execution,
    where ComfyUI's global progress hook may still expect these attributes.
    """
    try:
        server_instance = getattr(PromptServer, 'instance', None)
        if server_instance is None:
            return

        if not hasattr(server_instance, 'last_prompt_id'):
            server_instance.last_prompt_id = 'sageutils_llm_sidebar'

        if not hasattr(server_instance, 'last_node_id'):
            server_instance.last_node_id = 'sageutils_llm_native'
    except Exception as e:
        logger.debug(f"PromptServer progress context setup skipped: {e}")


def handle_llm_error_callback(payload):
    """Capture structured LLM errors raised in provider helpers for route responses."""
    set_last_llm_error(payload)


def _register_status_and_model_routes(routes_instance):
    @routes_instance.get('/sage_llm/status')
    @route_error_handler
    async def get_llm_status(request):
        """
        Check if REST/OpenAI/Native providers are available and enabled.
        """
        try:
            status = llm.get_llm_status()

            if get_setting("lmstudio_use_custom_url", False):
                status[LMSTUDIO_REST_KEY]["url"] = get_setting("lmstudio_custom_url", "")

            if get_setting("openai_use_custom_url", False):
                status[OPENAI_KEY]["url"] = get_setting("openai_base_url", "")

            return success_response(data=status)
        except Exception as e:
            logger.error(f"LLM status error: {str(e)}")
            return error_response(f"Failed to get LLM status: {str(e)}", status=500)

    _append_route("GET", "/sage_llm/status", "Check REST/OpenAI/Native availability")

    @routes_instance.get('/sage_llm/models')
    @route_error_handler
    async def get_llm_models(request):
        """Get available text models from REST providers, OpenAI, and Native CLIP."""
        try:
            force = request.rel_url.query.get('force', '').lower() == 'true'
            data = llm.get_llm_models(force=force)
            return success_response(data=data)
        except Exception as e:
            logger.error(f"Failed to get models: {str(e)}")
            return error_response(f"Failed to get models: {str(e)}", status=500)

    _append_route("GET", "/sage_llm/models", "Get available text models")

    @routes_instance.get('/sage_llm/vision_models')
    @route_error_handler
    async def get_llm_vision_models(request):
        """Get available vision models from REST providers and OpenAI."""
        try:
            force = request.rel_url.query.get('force', '').lower() == 'true'
            data = llm.get_llm_vision_models(force=force)
            return success_response(data=data)
        except Exception as e:
            logger.error(f"Failed to get vision models: {str(e)}")
            return error_response(f"Failed to get vision models: {str(e)}", status=500)

    _append_route("GET", "/sage_llm/vision_models", "Get available vision models")


def _register_prompt_routes(routes_instance):
    @routes_instance.get('/sage_llm/prompts')
    @route_error_handler
    async def get_llm_prompts(request):
        """Get available LLM prompt templates from llm_prompts.json."""
        try:
            return success_response(data={"prompts": llm_prompts})
        except Exception as e:
            logger.error(f"Failed to get prompts: {str(e)}")
            return error_response(f"Failed to get prompts: {str(e)}", status=500)

    _append_route("GET", "/sage_llm/prompts", "Get LLM prompt templates")

    @routes_instance.get('/sage_llm/integration_profiles')
    @route_error_handler
    async def get_llm_integration_profiles(request):
        """Get tool and MCP integration profile metadata for selector population."""
        try:
            profiles = routes_helpers.get_integration_profiles()
            return success_response(data={'profiles': profiles})
        except Exception as e:
            logger.error(f"Failed to get integration profiles: {str(e)}")
            return error_response(f"Failed to get integration profiles: {str(e)}", status=500)

    _append_route("GET", "/sage_llm/integration_profiles", "Get tool and MCP profile metadata")


def _register_generation_routes(routes_instance):
    @routes_instance.post('/sage_llm/generate')
    @route_error_handler
    async def generate_llm_response(request):
        """Generate a response from an LLM (non-streaming for Phase 1)."""
        try:
            clear_last_llm_error()
            data = await request.json()

            is_valid, error_msg, payload = routes_helpers.parse_generation_request(data)
            if not is_valid:
                return llm_error_response(error_msg or 'Invalid generation request', status=400, error_code='LLM_VALIDATION_ERROR')

            provider = payload['provider']
            model = payload['model']
            prompt = payload['prompt']
            system_prompt = payload['system_prompt']
            options = payload['options']

            if not llm.is_provider_available(provider, force=True):
                return llm_error_response(
                    f"Provider {provider} is not available",
                    status=503,
                    error_code='LLM_PROVIDER_UNAVAILABLE',
                    provider=provider,
                    operation='generate',
                )
            if provider == routes_helpers.NATIVE_KEY and not llm.is_native_model_available(model):
                return llm_error_response(
                    f"Native CLIP model '{model}' is not available",
                    status=404,
                    error_code='LLM_MODEL_NOT_FOUND',
                    provider=provider,
                    operation='generate',
                )

            response_text = llm.generate(
                provider,
                model=model,
                prompt=prompt,
                options=options,
                system_prompt=system_prompt,
            )

            return success_response(data={
                "response": response_text,
                "provider": provider,
                "model": model,
            })
        except ValueError as e:
            logger.error(f"Validation error in generate: {str(e)}")
            return llm_error_response_from_exception('Validation error in generate', e, status=400, default_error_code='LLM_VALIDATION_ERROR')
        except Exception as e:
            logger.error(f"Failed to generate response: {str(e)}")
            return llm_error_response_from_exception('Failed to generate response', e, status=500, default_error_code='LLM_GENERATION_ERROR')

    _append_route("POST", "/sage_llm/generate", "Generate text response from LLM")

    @routes_instance.post('/sage_llm/generate_stream')
    @route_error_handler
    async def generate_llm_response_stream(request):
        """Generate a streaming response from an LLM using Server-Sent Events."""
        try:
            clear_last_llm_error()
            data = await request.json()

            is_valid, error_msg, payload = routes_helpers.parse_generation_request(data)
            if not is_valid:
                return llm_error_response(error_msg or 'Invalid generation request', status=400, error_code='LLM_VALIDATION_ERROR')

            provider = payload['provider']
            model = payload['model']
            prompt = payload['prompt']
            system_prompt = payload['system_prompt']
            options = payload['options']

            response = await routes_helpers.prepare_sse_response(request)

            try:
                if not llm.is_provider_available(provider, force=True):
                    await routes_helpers.write_sse_error_and_close(
                        response,
                        f"Provider {provider} is not available",
                        error_code='LLM_PROVIDER_UNAVAILABLE',
                        provider=provider,
                        operation='generate_stream',
                    )
                    return response

                if provider == routes_helpers.NATIVE_KEY and not llm.is_native_model_available(model):
                    await routes_helpers.write_sse_error_and_close(
                        response,
                        f"Native CLIP model '{model}' is not available",
                        error_code='LLM_MODEL_NOT_FOUND',
                        provider=provider,
                        operation='generate_stream',
                    )
                    return response

                await routes_helpers.stream_sse_chunks(
                    response,
                    llm.generate_stream(
                        provider,
                        model=model,
                        prompt=prompt,
                        options=options,
                        system_prompt=system_prompt,
                    ),
                )
                await response.write_eof()
                return response
            except Exception as e:
                logger.error(f"Error during streaming: {str(e)}")
                await write_sse_error_from_exception(response, e, 'generate_stream', prefix='Streaming error')
                return response
        except Exception as e:
            logger.error(f"Failed to initialize streaming: {str(e)}")
            return llm_error_response_from_exception('Failed to initialize streaming', e, status=500, default_error_code='LLM_STREAM_INIT_ERROR')

    _append_route("POST", "/sage_llm/generate_stream", "Generate streaming text response from LLM (SSE)")

    @routes_instance.post('/sage_llm/vision_generate')
    @route_error_handler
    async def generate_vision_response(request):
        """Generate a response from a vision LLM (non-streaming)."""
        try:
            clear_last_llm_error()
            data = await request.json()

            is_valid, error_msg, payload = routes_helpers.parse_vision_generation_request(data)
            if not is_valid:
                return llm_error_response(error_msg or 'Invalid vision generation request', status=400, error_code='LLM_VALIDATION_ERROR')

            provider = payload['provider']
            model = payload['model']
            prompt = payload['prompt']
            images_data = payload['images']
            system_prompt = payload['system_prompt']
            options = payload['options']

            can_do_vision, capability_error = llm.is_model_vision_capable(provider, model)
            if not can_do_vision:
                return llm_error_response(
                    capability_error or 'Model does not support vision',
                    status=400,
                    error_code='LLM_MODEL_CAPABILITY_ERROR',
                    provider=provider,
                )

            if not llm.is_provider_available(provider, force=True):
                return llm_error_response(
                    f"Provider {provider} is not available",
                    status=503,
                    error_code='LLM_PROVIDER_UNAVAILABLE',
                    provider=provider,
                    operation='vision_generate',
                )
            if provider == routes_helpers.NATIVE_KEY and not llm.is_native_model_available(model):
                return llm_error_response(
                    f"Native CLIP model '{model}' is not available",
                    status=404,
                    error_code='LLM_MODEL_NOT_FOUND',
                    provider=provider,
                    operation='vision_generate',
                )

            response_text = llm.generate_vision(
                provider,
                model=model,
                prompt=prompt,
                images=images_data,
                options=options,
                system_prompt=system_prompt,
            )
            return success_response(data={
                "response": response_text,
                "provider": provider,
                "model": model,
            })
        except ValueError as e:
            logger.error(f"Validation error in vision generate: {str(e)}")
            return llm_error_response_from_exception('Validation error in vision generate', e, status=400, default_error_code='LLM_VALIDATION_ERROR')
        except Exception as e:
            logger.error(f"Failed to generate vision response: {str(e)}")
            return llm_error_response_from_exception('Failed to generate vision response', e, status=500, default_error_code='LLM_VISION_GENERATION_ERROR')

    _append_route("POST", "/sage_llm/vision_generate", "Generate vision response from LLM")

    @routes_instance.post('/sage_llm/vision_generate_stream')
    @route_error_handler
    async def generate_vision_response_stream(request):
        """Generate a streaming response from a vision LLM using Server-Sent Events."""
        try:
            clear_last_llm_error()
            data = await request.json()

            is_valid, error_msg, payload = routes_helpers.parse_vision_generation_request(data)
            if not is_valid:
                return llm_error_response(error_msg or 'Invalid vision generation request', status=400, error_code='LLM_VALIDATION_ERROR')

            provider = payload['provider']
            model = payload['model']
            prompt = payload['prompt']
            images_data = payload['images']
            system_prompt = payload['system_prompt']
            options = payload['options']

            can_do_vision, capability_error = llm.is_model_vision_capable(provider, model)
            if not can_do_vision:
                return llm_error_response(
                    capability_error or 'Model does not support vision',
                    status=400,
                    error_code='LLM_MODEL_CAPABILITY_ERROR',
                    provider=provider,
                )

            response = await routes_helpers.prepare_sse_response(request)

            try:
                if not llm.is_provider_available(provider, force=True):
                    await routes_helpers.write_sse_error_and_close(
                        response,
                        f"Provider {provider} is not available",
                        error_code='LLM_PROVIDER_UNAVAILABLE',
                        provider=provider,
                        operation='vision_generate_stream',
                    )
                    return response

                if provider == routes_helpers.NATIVE_KEY and not llm.is_native_model_available(model):
                    await routes_helpers.write_sse_error_and_close(
                        response,
                        f"Native CLIP model '{model}' is not available",
                        error_code='LLM_MODEL_NOT_FOUND',
                        provider=provider,
                        operation='vision_generate_stream',
                    )
                    return response

                await routes_helpers.stream_sse_chunks(
                    response,
                    llm.generate_vision_stream(
                        provider,
                        model=model,
                        prompt=prompt,
                        images=images_data,
                        options=options,
                        system_prompt=system_prompt,
                    ),
                )
                await response.write_eof()
                return response
            except Exception as e:
                logger.error(f"Error during vision streaming: {str(e)}")
                await write_sse_error_from_exception(response, e, 'vision_generate_stream', prefix='Vision streaming error')
                return response
        except Exception as e:
            logger.error(f"Failed to initialize vision streaming: {str(e)}")
            return llm_error_response_from_exception('Failed to initialize vision streaming', e, status=500, default_error_code='LLM_VISION_STREAM_INIT_ERROR')

    _append_route("POST", "/sage_llm/vision_generate_stream", "Generate streaming vision response from LLM (SSE)")


def _register_system_prompt_routes(routes_instance):
    @routes_instance.get('/sage_utils/system_prompts/{prompt_id}.md')
    @route_error_handler
    async def get_system_prompt(request):
        """Serve system prompt markdown files from assets or user directory."""
        try:
            prompt_id = request.match_info['prompt_id']
            content = system_prompts.get_system_prompt_text(prompt_id)

            if not content and prompt_id != 'default':
                return error_response(f"System prompt '{prompt_id}' not found", status=404)

            return web.Response(text=content, content_type='text/markdown')
        except Exception as e:
            logger.error(f"Error loading system prompt: {str(e)}")
            return error_response(f"Failed to load system prompt: {str(e)}", status=500)

    _append_route("GET", "/sage_utils/system_prompts/{prompt_id}.md", "Get system prompt markdown file")

    @routes_instance.post('/sage_llm/system_prompts/save')
    @route_error_handler
    async def save_system_prompt(request):
        """Save a custom system prompt to user directory."""
        try:
            data = await request.json()

            is_valid, error_msg, payload = routes_helpers.parse_system_prompt_save_request(data)
            if not is_valid:
                return error_response(error_msg or 'Invalid system prompt save request', status=400)

            system_prompts.save_system_prompt(
                payload['id'],
                payload['name'],
                payload['content'],
                payload['description'],
            )
            return success_response({"id": payload['id'], "name": payload['name']})
        except ValueError as e:
            logger.error(f"Validation error saving system prompt: {str(e)}")
            return error_response(str(e), status=400)
        except Exception as e:
            logger.error(f"Error saving system prompt: {str(e)}")
            return error_response(f"Failed to save system prompt: {str(e)}", status=500)

    _append_route("POST", "/sage_llm/system_prompts/save", "Save custom system prompt")

    @routes_instance.post('/sage_llm/system_prompts/delete')
    @route_error_handler
    async def delete_system_prompt(request):
        """Delete a custom system prompt."""
        try:
            data = await request.json()

            is_valid, error_msg, payload = routes_helpers.parse_system_prompt_delete_request(data)
            if not is_valid:
                return error_response(error_msg or 'Invalid system prompt delete request', status=400)

            deleted = system_prompts.delete_system_prompt(payload['id'])
            if not deleted:
                return error_response(f"System prompt '{payload['id']}' not found", status=404)

            return success_response({"deleted": payload['id']})
        except Exception as e:
            logger.error(f"Error deleting system prompt: {str(e)}")
            return error_response(f"Failed to delete system prompt: {str(e)}", status=500)

    _append_route("POST", "/sage_llm/system_prompts/delete", "Delete custom system prompt")

    @routes_instance.get('/sage_llm/system_prompts/list')
    @route_error_handler
    async def list_system_prompts(request):
        """List all available system prompts (built-in + custom)."""
        try:
            prompts = system_prompts.list_system_prompts()
            return success_response({"prompts": prompts})
        except Exception as e:
            logger.error(f"Error listing system prompts: {str(e)}")
            return error_response(f"Failed to list system prompts: {str(e)}", status=500)

    _append_route("GET", "/sage_llm/system_prompts/list", "List all system prompts")


def _register_preset_routes(routes_instance):
    @routes_instance.get('/sage_llm/presets/list')
    @route_error_handler
    async def list_presets(request):
        """List all available LLM presets (built-in + custom)."""
        try:
            return success_response({"presets": presets.list_presets()})
        except Exception as e:
            logger.error(f"Error listing presets: {str(e)}")
            return error_response(f"Failed to list presets: {str(e)}", status=500)

    _append_route("GET", "/sage_llm/presets/list", "List all LLM presets")

    @routes_instance.post('/sage_llm/presets/save')
    @route_error_handler
    async def save_preset(request):
        """Save an LLM preset to user directory."""
        try:
            data = await request.json()

            is_valid, error_msg, payload = routes_helpers.parse_preset_save_request(data)
            if not is_valid:
                return error_response(error_msg or 'Invalid preset save request', status=400)

            saved_preset = presets.save_preset(payload['id'], payload['preset'])
            return success_response({"id": payload['id'], "preset": saved_preset})
        except ValueError as e:
            logger.error(f"Validation error saving preset: {str(e)}")
            return error_response(str(e), status=400)
        except Exception as e:
            logger.error(f"Error saving preset: {str(e)}")
            return error_response(f"Failed to save preset: {str(e)}", status=500)

    _append_route("POST", "/sage_llm/presets/save", "Save LLM preset")

    @routes_instance.post('/sage_llm/presets/delete')
    @route_error_handler
    async def delete_preset(request):
        """Delete a custom preset."""
        try:
            data = await request.json()

            is_valid, error_msg, payload = routes_helpers.parse_preset_delete_request(data)
            if not is_valid:
                return error_response(error_msg or 'Invalid preset delete request', status=400)

            deleted = presets.delete_preset(payload['id'])
            if not deleted:
                return error_response(f"Preset '{payload['id']}' not found", status=404)

            return success_response({"deleted": payload['id']})
        except Exception as e:
            logger.error(f"Error deleting preset: {str(e)}")
            return error_response(f"Failed to delete preset: {str(e)}", status=500)

    _append_route("POST", "/sage_llm/presets/delete", "Delete LLM preset")

    @routes_instance.get('/sage_llm/presets/all')
    @route_error_handler
    async def get_all_presets(request):
        """Get all available LLM presets (built-in + custom) with full details."""
        try:
            all_presets = get_available_presets_full()
            return success_response({"presets": all_presets})
        except Exception as e:
            logger.error(f"Error getting all presets: {str(e)}")
            return error_response(f"Failed to get presets: {str(e)}", status=500)

    _append_route("GET", "/sage_llm/presets/all", "Get all LLM presets with full details")

    @routes_instance.post('/sage_llm/presets/generate_with_image')
    @route_error_handler
    async def generate_with_preset_and_image(request):
        """Generate a response using a preset with an image."""
        try:
            data = await request.json()
            
            is_valid, error_msg, payload = routes_helpers.parse_preset_image_generation_request(data)
            if not is_valid:
                return error_response(error_msg or 'Invalid preset generation request', status=400)

            preset_id = payload['preset_id']
            images_data = payload['images']
            prompt_override = payload['prompt_override']
            system_prompt_override = payload['system_prompt_override']
            settings_override = payload['settings_override']
            
            try:
                preset = presets.load_preset(preset_id)
            except ValueError:
                return error_response(f"Preset '{preset_id}' not found", status=404)

            provider = routes_helpers.normalize_provider(preset.get('provider', LMSTUDIO_REST_KEY))
            model = preset.get('model')
            
            if not model:
                return error_response(f"Preset '{preset_id}' does not specify a model", status=400)

            prompt_text = routes_helpers.resolve_preset_prompt_text(preset, prompt_override)
            if not prompt_text:
                prompt_text = "Describe this image in detail."

            system_prompt_text = routes_helpers.resolve_preset_system_prompt_text(
                preset,
                system_prompt_override,
            )

            options = routes_helpers.build_preset_generation_options(
                provider,
                preset.get('settings', {}),
                settings_override,
            )

            is_valid, error_msg, error_code, status_code = routes_helpers.get_provider_and_native_error(
                provider,
                model,
                'preset_generate_with_image',
            )
            if not is_valid:
                return llm_error_response(
                    error_msg or 'Provider or model unavailable',
                    status=status_code or 500,
                    error_code=error_code or 'LLM_PROVIDER_UNAVAILABLE',
                    provider=provider,
                    operation='preset_generate_with_image',
                )

            keep_alive = None
            if isinstance(settings_override, dict) and 'keepAlive' in settings_override:
                keep_alive = settings_override['keepAlive']
            elif isinstance(preset.get('settings'), dict):
                keep_alive = preset['settings'].get('keepAlive')

            response_text = llm.generate_vision(
                provider,
                model=model,
                prompt=prompt_text,
                images=images_data,
                options=options,
                system_prompt=system_prompt_text,
                keep_alive=keep_alive,
            )

            return success_response({
                "response": response_text,
                "preset_used": preset_id,
                "provider": provider,
                "model": model,
            })
        except ValueError as e:
            logger.error(f"Validation error in preset generation: {str(e)}")
            return error_response(str(e), status=400)
        except Exception as e:
            logger.error(f"Failed to generate with preset: {str(e)}")
            import traceback
            traceback.print_exc()
            return error_response(f"Failed to generate with preset: {str(e)}", status=500)

    _append_route("POST", "/sage_llm/presets/generate_with_image", "Generate response using preset with image")


def _register_load_routes(routes_instance):
    @routes_instance.post('/sage_llm/load_model')
    @route_error_handler
    async def load_llm_model(request):
        """Load a model into memory without generating a response."""
        try:
            clear_last_llm_error()
            data = await request.json()

            is_valid, error_msg, payload = routes_helpers.parse_load_model_request(data)
            if not is_valid:
                return llm_error_response(error_msg or 'Invalid load model request', status=400, error_code='LLM_VALIDATION_ERROR')

            provider = payload['provider']
            model = payload['model']
            keep_alive = payload['keep_alive']
            options = payload.get('options')

            from ..utils.llm import service as llm

            if not llm.is_provider_available(provider, force=True):
                return llm_error_response(
                    f"Provider {provider} is not available",
                    status=503,
                    error_code='LLM_PROVIDER_UNAVAILABLE',
                    provider=provider,
                    operation='load_model',
                )
            if provider == routes_helpers.NATIVE_KEY and not llm.is_native_model_available(model):
                return llm_error_response(
                    f"Native CLIP model '{model}' is not available",
                    status=404,
                    error_code='LLM_MODEL_NOT_FOUND',
                    provider=provider,
                    operation='load_model',
                )

            load_success = llm.load_model(provider, model, keep_alive=keep_alive, options=options)
            if not load_success:
                return llm_error_response(
                    f"Model '{model}' could not be loaded for provider {provider}",
                    status=500,
                    error_code='LLM_MODEL_LOAD_ERROR',
                    provider=provider,
                    operation='load_model',
                )

            return success_response(data={
                "loaded": True,
                "provider": provider,
                "model": model,
            })
        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            return llm_error_response_from_exception('Failed to load model', e, status=500, default_error_code='LLM_LOAD_ERROR')

    _append_route("POST", "/sage_llm/load_model", "Validate/preload selected model for REST/OpenAI/Native providers")

    @routes_instance.post('/sage_llm/generate_only')
    @route_error_handler
    async def generate_only(request):
        """Generate a response from an already-loaded model."""
        try:
            clear_last_llm_error()
            data = await request.json()

            is_valid, error_msg, payload = routes_helpers.parse_generation_request(data)
            if not is_valid:
                return llm_error_response(error_msg or 'Invalid generation request', status=400, error_code='LLM_VALIDATION_ERROR')

            provider = payload['provider']
            model = payload['model']
            prompt = payload['prompt']
            system_prompt = payload['system_prompt']
            options = payload['options']
            keep_alive = data.get('keep_alive', 0)

            from ..utils.llm import service as llm

            try:
                response_text = llm.generate_only(
                    provider,
                    model,
                    prompt,
                    options=options,
                    system_prompt=system_prompt,
                    keep_alive=keep_alive,
                )
            except ValueError as e:
                return llm_error_response(
                    str(e),
                    status=400,
                    error_code='LLM_VALIDATION_ERROR',
                    provider=provider,
                    operation='generate_only',
                )
            return success_response(data={
                "response": response_text,
                "provider": provider,
                "model": model,
            })
        except ValueError as e:
            logger.error(f"Validation error in generate_only: {str(e)}")
            return llm_error_response_from_exception('Validation error in generate_only', e, status=400, default_error_code='LLM_VALIDATION_ERROR')
        except Exception as e:
            logger.error(f"Failed to generate response: {str(e)}")
            return llm_error_response_from_exception('Failed to generate response', e, status=500, default_error_code='LLM_GENERATION_ERROR')

    _append_route("POST", "/sage_llm/generate_only", "Generate text response assuming model is already loaded")


def register_routes(routes_instance):
    """Register LLM-related routes."""
    set_llm_error_reporter(handle_llm_error_callback)

    global _route_list
    _route_list.clear()

    _register_status_and_model_routes(routes_instance)
    _register_prompt_routes(routes_instance)
    _register_generation_routes(routes_instance)
    _register_system_prompt_routes(routes_instance)
    _register_preset_routes(routes_instance)
    _register_load_routes(routes_instance)

    return len(_route_list)


def get_route_list():
    """
    Get list of registered routes for documentation.

    Returns:
        list: Route information
    """
    return _route_list.copy()

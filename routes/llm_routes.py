"""
LLM Routes Module
Handles LLM chat endpoints for Ollama, LM Studio, and Native CLIP integration.
"""

import json
from contextvars import ContextVar
from ..utils.logger import get_logger
from ..utils.llm import clean_response
from ..utils.llm import routes_helpers
from aiohttp import web
from .base import route_error_handler, success_response, error_response, validate_json_body

logger = get_logger('routes.llm')

# Route list for documentation and registration tracking
_route_list = []
_last_llm_error = ContextVar('sageutils_last_llm_error', default=None)


def _ensure_promptserver_progress_context():
    """Ensure PromptServer progress hook state exists for direct native generation calls.

    Native CLIP generation from routes can run outside queued prompt execution,
    where ComfyUI's global progress hook may still expect these attributes.
    """
    try:
        from server import PromptServer

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
    _last_llm_error.set(payload)


def _clear_last_llm_error():
    """Clear any stale LLM error payload before route handling."""
    _last_llm_error.set(None)


def _error_response_with_metadata(message, status=500, error_code='LLM_ERROR', provider=None, operation=None, cause=None):
    """Return a standardized error response including optional LLM metadata."""
    extra = {'error_code': error_code}
    if provider:
        extra['provider'] = provider
    if operation:
        extra['operation'] = operation
    if cause:
        extra['cause'] = cause
    return error_response(message, status=status, **extra)


def _error_response_from_exception(prefix, exc, status=500, default_error_code='LLM_ROUTE_ERROR'):
    """Build a standardized error response from the last structured LLM error (if available)."""
    payload = _last_llm_error.get()
    _clear_last_llm_error()

    if payload:
        message = payload.get('scoped_message') or payload.get('message') or f'{prefix}: {str(exc)}'
        error_type = str(payload.get('error_type', 'ERROR')).upper()
        return _error_response_with_metadata(
            message,
            status=status,
            error_code=f'LLM_{error_type}',
            provider=payload.get('provider'),
            operation=payload.get('operation'),
            cause=payload.get('cause'),
        )

    return _error_response_with_metadata(
        f'{prefix}: {str(exc)}',
        status=status,
        error_code=default_error_code,
    )


def _sse_error_chunk(message, *, error_code='LLM_STREAM_ERROR', provider=None, operation=None, cause=None):
    """Create a standardized SSE error chunk payload."""
    payload = {
        'error': message,
        'error_code': error_code,
        'done': True,
    }
    if provider:
        payload['provider'] = provider
    if operation:
        payload['operation'] = operation
    if cause:
        payload['cause'] = cause
    return routes_helpers.format_sse_chunk(payload)


def _native_chunk_text(text: str, chunk_size: int = 8):
    """Yield fixed-size chunks for simulated streaming responses."""
    if not text:
        return
    for i in range(0, len(text), chunk_size):
        yield text[i:i + chunk_size]


def _get_native_clip_models() -> list[str]:
    """Return available native CLIP text encoder models for sidebar provider selection."""
    try:
        import folder_paths
        models = folder_paths.get_filename_list("text_encoders") or []
        return sorted([m for m in models if isinstance(m, str) and m])
    except Exception as e:
        logger.warning(f"Failed to list native CLIP models: {e}")
        return []


def _load_native_clip(clip_name: str):
    """Load a single CLIP text encoder via ComfyUI's native CLIP loader."""
    import nodes as comfy_nodes

    loader = comfy_nodes.CLIPLoader()
    loaded = loader.load_clip(clip_name=clip_name, type="stable_diffusion", device="default")
    if isinstance(loaded, (tuple, list)) and loaded:
        return loaded[0]
    return loaded


def _native_generate_response(model: str, prompt: str, system_prompt: str, options: dict) -> str:
    """Generate text with a native CLIP model selected from the text_encoders directory."""
    if not model:
        raise ValueError("Missing CLIP model for native provider")

    clip = _load_native_clip(model)
    if clip is None:
        raise RuntimeError(f"Failed to load native CLIP model '{model}'")

    _ensure_promptserver_progress_context()

    full_prompt = prompt or ""
    if system_prompt:
        full_prompt = f"{system_prompt.strip()}\n\n{full_prompt}"

    seed = int(options.get("seed", 0) or 0)
    sampling_seed = None if seed < 0 else seed
    max_length = int(options.get("max_length", options.get("max_tokens", 256)) or 256)
    max_length = max(1, min(max_length, 4096))

    tokens = clip.tokenize(
        full_prompt,
        skip_template=False,
        min_length=1,
        thinking=bool(options.get("thinking", False)),
    )
    generated_ids = clip.generate(
        tokens,
        do_sample=bool(options.get("do_sample", True)),
        max_length=max_length,
        temperature=float(options.get("temperature", 0.7)),
        top_k=int(options.get("top_k", 64)),
        top_p=float(options.get("top_p", 0.95)),
        min_p=float(options.get("min_p", 0.05)),
        repetition_penalty=float(options.get("repetition_penalty", 1.05)),
        presence_penalty=float(options.get("presence_penalty", 0.0)),
        seed=sampling_seed,
    )
    generated_text = clip.decode(generated_ids, skip_special_tokens=True)
    return clean_response(generated_text)


def register_routes(routes_instance):
    """
    Register LLM-related routes.
    
    Args:
        routes_instance: The PromptServer routes instance
        
    Returns:
        int: Number of routes registered
    """
    from ..utils.llm import set_llm_error_reporter

    # Wire up structured LLM error payloads so frontend can display backend messages.
    set_llm_error_reporter(handle_llm_error_callback)
    
    global _route_list
    _route_list.clear()
    
    @routes_instance.get('/sage_llm/status')
    @route_error_handler
    async def get_llm_status(request):
        """
        Check if Ollama, LM Studio, and Native providers are available and enabled.
        
        Returns:
            {
                "success": true,
                "ollama": {
                    "available": bool,
                    "enabled": bool,
                    "url": str (if custom)
                },
                "lmstudio": {
                    "available": bool,
                    "enabled": bool,
                    "url": str (if custom)
                },
                "native": {
                    "available": bool,
                    "enabled": bool
                }
            }
        """
        try:
            from ..utils.settings import get_setting
            from ..utils import llm_wrapper as llm
            
            # Ensure initialization has been attempted
            try:
                llm.ensure_llm_initialized()
            except Exception as init_error:
                logger.warning(f"LLM initialization warning: {init_error}")
            
            # Check settings
            ollama_enabled = get_setting("enable_ollama", True)
            lmstudio_enabled = get_setting("enable_lmstudio", True)
            
            # Check availability
            ollama_available = llm.OLLAMA_AVAILABLE and ollama_enabled
            lmstudio_available = llm.LMSTUDIO_AVAILABLE and lmstudio_enabled
            native_models = _get_native_clip_models()
            native_available = len(native_models) > 0
            
            # Get custom URLs if applicable
            ollama_info = {
                "available": ollama_available,
                "enabled": ollama_enabled
            }
            lmstudio_info = {
                "available": lmstudio_available,
                "enabled": lmstudio_enabled
            }
            
            if get_setting("ollama_use_custom_url", False):
                ollama_info["url"] = get_setting("ollama_custom_url", "")
            
            if get_setting("lmstudio_use_custom_url", False):
                lmstudio_info["url"] = get_setting("lmstudio_custom_url", "")

            native_info = {
                "available": native_available,
                "enabled": True,
            }
            
            return success_response(data={
                "ollama": ollama_info,
                "lmstudio": lmstudio_info,
                "native": native_info,
            })
            
        except Exception as e:
            logger.error(f"LLM status error: {str(e)}")
            return error_response(f"Failed to get LLM status: {str(e)}", status=500)
    
    _route_list.append({
        "method": "GET",
        "path": "/sage_llm/status",
        "description": "Check Ollama and LM Studio availability"
    })
    
    @routes_instance.get('/sage_llm/models')
    @route_error_handler
    async def get_llm_models(request):
        """
        Get available text models from Ollama, LM Studio, and Native CLIP.
        
        Query params:
            force: bool - Force re-initialization of LLM providers (default: False)
        
        Returns:
            {
                "success": true,
                "models": {
                    "ollama": ["model1", "model2", ...],
                    "lmstudio": ["model1", "model2", ...],
                    "native": ["clip1.safetensors", ...]
                },
                "status": {
                    "ollama_available": bool,
                    "lmstudio_available": bool,
                    "native_available": bool
                }
            }
        """
        try:
            from ..utils import llm_wrapper as llm
            from ..utils.settings import get_setting
            from ..utils.llm.routes_helpers import get_compatible_models
            
            # Check if force re-initialization is requested
            force = request.rel_url.query.get('force', '').lower() == 'true'
            
            if force:
                logger.info("Force re-initializing LLM providers...")
                # Reset initialization flags to force re-init
                llm._ollama_initialized = False
                llm._lmstudio_initialized = False
            
            # Initialize LLM services if needed
            llm.ensure_llm_initialized()
            
            # Get models from both providers
            ollama_models = []
            lmstudio_models = []
            native_models = _get_native_clip_models()
            
            ollama_enabled = get_setting("enable_ollama", True)
            lmstudio_enabled = get_setting("enable_lmstudio", True)
            
            if ollama_enabled and llm.OLLAMA_AVAILABLE:
                try:
                    models = llm.get_ollama_models()
                    ollama_models = get_compatible_models('ollama', models)
                except Exception as e:
                    logger.warning(f"Failed to get Ollama models: {e}")
            
            if lmstudio_enabled and llm.LMSTUDIO_AVAILABLE:
                try:
                    models = llm.get_lmstudio_models()
                    lmstudio_models = get_compatible_models('lmstudio', models)
                except Exception as e:
                    logger.warning(f"Failed to get LM Studio models: {e}")
            
            return success_response(data={
                "models": {
                    "ollama": ollama_models,
                    "lmstudio": lmstudio_models,
                    "native": native_models,
                },
                "status": {
                    "ollama_available": len(ollama_models) > 0,
                    "lmstudio_available": len(lmstudio_models) > 0,
                    "native_available": len(native_models) > 0,
                }
            })
            
        except Exception as e:
            logger.error(f"Failed to get models: {str(e)}")
            return error_response(f"Failed to get models: {str(e)}", status=500)
    
    _route_list.append({
        "method": "GET",
        "path": "/sage_llm/models",
        "description": "Get available text models"
    })
    
    @routes_instance.get('/sage_llm/vision_models')
    @route_error_handler
    async def get_llm_vision_models(request):
        """
        Get available vision models from Ollama and LM Studio.
        
        Query params:
            force: bool - Force re-initialization of LLM providers (default: False)
        
        Returns:
            {
                "success": true,
                "models": {
                    "ollama": ["llava", "bakllava", ...],
                    "lmstudio": ["llava-v1.6", ...],
                    "native": []
                },
                "status": {
                    "ollama_available": bool,
                    "lmstudio_available": bool,
                    "native_available": bool
                }
            }
        """
        try:
            from ..utils import llm_wrapper as llm
            from ..utils.settings import get_setting
            from ..utils.llm.routes_helpers import get_compatible_models
            
            # Check if force re-initialization is requested
            force = request.rel_url.query.get('force', '').lower() == 'true'
            
            if force:
                logger.info("Force re-initializing LLM providers for vision models...")
                # Reset initialization flags to force re-init
                llm._ollama_initialized = False
                llm._lmstudio_initialized = False
            
            # Initialize LLM services if needed
            llm.ensure_llm_initialized()
            
            # Get vision models from both providers
            ollama_models = []
            lmstudio_models = []
            native_models = []
            
            ollama_enabled = get_setting("enable_ollama", True)
            lmstudio_enabled = get_setting("enable_lmstudio", True)
            
            if ollama_enabled and llm.OLLAMA_AVAILABLE:
                try:
                    models = llm.get_ollama_vision_models()
                    ollama_models = get_compatible_models('ollama', models)
                except Exception as e:
                    logger.warning(f"Failed to get Ollama vision models: {e}")
            
            if lmstudio_enabled and llm.LMSTUDIO_AVAILABLE:
                try:
                    models = llm.get_lmstudio_vision_models()
                    lmstudio_models = get_compatible_models('lmstudio', models)
                except Exception as e:
                    logger.warning(f"Failed to get LM Studio vision models: {e}")
            
            return success_response(data={
                "models": {
                    "ollama": ollama_models,
                    "lmstudio": lmstudio_models,
                    "native": native_models,
                },
                "status": {
                    "ollama_available": len(ollama_models) > 0,
                    "lmstudio_available": len(lmstudio_models) > 0,
                    "native_available": False,
                }
            })
            
        except Exception as e:
            logger.error(f"Failed to get vision models: {str(e)}")
            return error_response(f"Failed to get vision models: {str(e)}", status=500)
    
    _route_list.append({
        "method": "GET",
        "path": "/sage_llm/vision_models",
        "description": "Get available vision models"
    })
    
    @routes_instance.get('/sage_llm/prompts')
    @route_error_handler
    async def get_llm_prompts(request):
        """
        Get available LLM prompt templates from llm_prompts.json.
        
        Returns:
            {
                "success": true,
                "prompts": {
                    "base": {...},
                    "extra": {...}
                }
            }
        """
        try:
            from ..utils.config_manager import llm_prompts
            
            return success_response(data={
                "prompts": llm_prompts
            })
            
        except Exception as e:
            logger.error(f"Failed to get prompts: {str(e)}")
            return error_response(f"Failed to get prompts: {str(e)}", status=500)
    
    _route_list.append({
        "method": "GET",
        "path": "/sage_llm/prompts",
        "description": "Get LLM prompt templates"
    })
    
    @routes_instance.post('/sage_llm/generate')
    @route_error_handler
    async def generate_llm_response(request):
        """
        Generate a response from an LLM (non-streaming for Phase 1).
        
        Request body:
            {
                "provider": "ollama" | "lmstudio" | "native",
                "model": str,
                "prompt": str,
                "system_prompt": str (optional),
                "options": {
                    "temperature": float,
                    "seed": int,
                    ...
                }
            }
        
        Returns:
            {
                "success": true,
                "response": str,
                "provider": str,
                "model": str
            }
        """
        try:
            _clear_last_llm_error()
            data = await request.json()
            
            # Validate generation input
            is_valid, error_msg = routes_helpers.validate_generation_data(data)
            if not is_valid:
                return _error_response_with_metadata(error_msg, status=400, error_code='LLM_VALIDATION_ERROR')
            
            provider = data["provider"].lower()
            model = data["model"]
            prompt = data["prompt"]
            system_prompt = data.get("system_prompt", "")
            options = data.get("options", {})
            
            from ..utils import llm_wrapper as llm
            
            # Initialize LLM services if needed
            llm.ensure_llm_initialized()
            
            # Generate response based on provider
            response_text = ""
            
            if provider == "ollama":
                if not llm.OLLAMA_AVAILABLE:
                    return _error_response_with_metadata(
                        'Ollama is not available',
                        status=503,
                        error_code='LLM_PROVIDER_UNAVAILABLE',
                        provider='ollama',
                        operation='generate',
                    )
                
                response_text = llm.ollama_generate(
                    model=model,
                    prompt=prompt,
                    system_prompt=system_prompt,
                    keep_alive=0.0,
                    options=options
                )
            
            elif provider == "lmstudio":
                if not llm.LMSTUDIO_AVAILABLE:
                    return _error_response_with_metadata(
                        'LM Studio is not available',
                        status=503,
                        error_code='LLM_PROVIDER_UNAVAILABLE',
                        provider='lmstudio',
                        operation='generate',
                    )
                
                response_text = llm.lmstudio_generate(
                    model=model,
                    prompt=prompt,
                    keep_alive=0,
                    options=options
                )

            elif provider == "native":
                available_native = _get_native_clip_models()
                if model not in available_native:
                    return _error_response_with_metadata(
                        f"Native CLIP model '{model}' is not available",
                        status=404,
                        error_code='LLM_MODEL_NOT_FOUND',
                        provider='native',
                        operation='generate',
                    )

                response_text = _native_generate_response(
                    model=model,
                    prompt=prompt,
                    system_prompt=system_prompt,
                    options=options,
                )
            
            return success_response(data={
                "response": response_text,
                "provider": provider,
                "model": model
            })
            
        except ValueError as e:
            logger.error(f"Validation error in generate: {str(e)}")
            return _error_response_from_exception('Validation error in generate', e, status=400, default_error_code='LLM_VALIDATION_ERROR')
        except Exception as e:
            logger.error(f"Failed to generate response: {str(e)}")
            return _error_response_from_exception('Failed to generate response', e, status=500, default_error_code='LLM_GENERATION_ERROR')
    
    _route_list.append({
        "method": "POST",
        "path": "/sage_llm/generate",
        "description": "Generate text response from LLM"
    })
    
    @routes_instance.post('/sage_llm/generate_stream')
    @route_error_handler
    async def generate_llm_response_stream(request):
        """
        Generate a streaming response from an LLM using Server-Sent Events.
        
        Request body:
            {
                "provider": "ollama" | "lmstudio" | "native",
                "model": str,
                "prompt": str,
                "system_prompt": str (optional),
                "options": {
                    "temperature": float,
                    "seed": int,
                    ...
                }
            }
        
        Response: Server-Sent Events (SSE) stream
            data: {"chunk": "text", "done": false}
            data: {"chunk": "more", "done": false}
            data: {"chunk": "", "done": true, "full_response": "complete text"}
        """
        try:
            _clear_last_llm_error()
            data = await request.json()
            
            # Validate required fields
            required = ["provider", "model", "prompt"]
            missing = [f for f in required if f not in data]
            if missing:
                return _error_response_with_metadata(
                    f"Missing required fields: {', '.join(missing)}",
                    status=400,
                    error_code='LLM_VALIDATION_ERROR',
                )
            
            provider = data["provider"].lower()
            model = data["model"]
            prompt = data["prompt"]
            system_prompt = data.get("system_prompt", "")
            options = data.get("options", {})
            
            # Validate provider
            if provider not in ["ollama", "lmstudio", "native"]:
                return _error_response_with_metadata(
                    f"Invalid provider: {provider}. Must be 'ollama', 'lmstudio', or 'native'",
                    status=400,
                    error_code='LLM_VALIDATION_ERROR',
                )
            
            from ..utils import llm_wrapper as llm
            
            # Initialize LLM services if needed
            llm.ensure_llm_initialized()
            
            # Create SSE response
            response = web.StreamResponse()
            response.headers['Content-Type'] = 'text/event-stream'
            response.headers['Cache-Control'] = 'no-cache'
            response.headers['Connection'] = 'keep-alive'
            await response.prepare(request)
            
            try:
                # Generate streaming response based on provider
                if provider == "ollama":
                    if not llm.OLLAMA_AVAILABLE:
                        error_chunk = _sse_error_chunk(
                            'Ollama is not available',
                            error_code='LLM_PROVIDER_UNAVAILABLE',
                            provider='ollama',
                            operation='generate_stream',
                        )
                        await response.write(error_chunk.encode('utf-8'))
                        await response.write_eof()
                        return response
                    
                    for chunk_data in llm.ollama_generate_stream(
                        model=model,
                        prompt=prompt,
                        system_prompt=system_prompt,
                        keep_alive=0.0,
                        options=options
                    ):
                        # Send chunk as SSE
                        sse_data = routes_helpers.format_sse_chunk(chunk_data)
                        await response.write(sse_data.encode('utf-8'))
                        
                        if chunk_data.get("done", False):
                            break
                
                elif provider == "lmstudio":
                    if not llm.LMSTUDIO_AVAILABLE:
                        error_chunk = _sse_error_chunk(
                            'LM Studio is not available',
                            error_code='LLM_PROVIDER_UNAVAILABLE',
                            provider='lmstudio',
                            operation='generate_stream',
                        )
                        await response.write(error_chunk.encode('utf-8'))
                        await response.write_eof()
                        return response
                    
                    for chunk_data in llm.lmstudio_generate_stream(
                        model=model,
                        prompt=prompt,
                        keep_alive=0,
                        options=options
                    ):
                        # Send chunk as SSE
                        sse_data = routes_helpers.format_sse_chunk(chunk_data)
                        await response.write(sse_data.encode('utf-8'))
                        
                        if chunk_data.get("done", False):
                            break

                elif provider == "native":
                    available_native = _get_native_clip_models()
                    if model not in available_native:
                        error_chunk = _sse_error_chunk(
                            f"Native CLIP model '{model}' is not available",
                            error_code='LLM_MODEL_NOT_FOUND',
                            provider='native',
                            operation='generate_stream',
                        )
                        await response.write(error_chunk.encode('utf-8'))
                        await response.write_eof()
                        return response

                    response_text = _native_generate_response(
                        model=model,
                        prompt=prompt,
                        system_prompt=system_prompt,
                        options=options,
                    )

                    for chunk in _native_chunk_text(response_text):
                        chunk_data = {
                            "chunk": chunk,
                            "done": False,
                        }
                        sse_data = routes_helpers.format_sse_chunk(chunk_data)
                        await response.write(sse_data.encode('utf-8'))

                    final_data = {
                        "chunk": "",
                        "done": True,
                        "full_response": response_text,
                    }
                    sse_data = routes_helpers.format_sse_chunk(final_data)
                    await response.write(sse_data.encode('utf-8'))
                
                await response.write_eof()
                return response
                
            except Exception as e:
                logger.error(f"Error during streaming: {str(e)}")
                payload = _last_llm_error.get()
                _clear_last_llm_error()
                error_chunk = _sse_error_chunk(
                    payload.get('scoped_message') if payload else str(e),
                    error_code=f"LLM_{str(payload.get('error_type', 'STREAM_ERROR')).upper()}" if payload else 'LLM_STREAM_ERROR',
                    provider=payload.get('provider') if payload else provider,
                    operation=payload.get('operation') if payload else 'generate_stream',
                    cause=payload.get('cause') if payload else None,
                )
                await response.write(error_chunk.encode('utf-8'))
                await response.write_eof()
                return response
                
        except Exception as e:
            logger.error(f"Failed to initialize streaming: {str(e)}")
            return _error_response_from_exception('Failed to initialize streaming', e, status=500, default_error_code='LLM_STREAM_INIT_ERROR')
    
    _route_list.append({
        "method": "POST",
        "path": "/sage_llm/generate_stream",
        "description": "Generate streaming text response from LLM (SSE)"
    })
    
    @routes_instance.post('/sage_llm/vision_generate')
    @route_error_handler
    async def generate_vision_response(request):
        """
        Generate a response from a vision LLM (non-streaming).
        
        Request body:
            {
                "provider": "ollama" | "lmstudio",
                "model": str,
                "prompt": str,
                "images": [base64_encoded_image, ...],
                "system_prompt": str (optional),
                "options": {...}
            }
        
        Returns:
            {
                "success": true,
                "response": str,
                "provider": str,
                "model": str
            }
        """
        try:
            _clear_last_llm_error()
            data = await request.json()
            
            # Validate vision input
            is_valid, error_msg = routes_helpers.validate_vision_data(data)
            if not is_valid:
                return _error_response_with_metadata(error_msg, status=400, error_code='LLM_VALIDATION_ERROR')
            
            provider = data["provider"].lower()
            model = data["model"]
            prompt = data["prompt"]
            images_data = data["images"]
            system_prompt = data.get("system_prompt", "")
            options = data.get("options", {})
            
            from ..utils import llm_wrapper as llm
            
            # Initialize LLM services if needed
            llm.ensure_llm_initialized()
            
            response_text = ""
            
            if provider == "ollama":
                if not llm.OLLAMA_AVAILABLE:
                    return _error_response_with_metadata(
                        'Ollama is not available',
                        status=503,
                        error_code='LLM_PROVIDER_UNAVAILABLE',
                        provider='ollama',
                        operation='vision_generate',
                    )
                
                # Build Ollama vision generation parameters
                response_parameters = {
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "images": images_data,  # Already base64
                    "keep_alive": 0.0
                }
                
                if system_prompt:
                    response_parameters["system"] = system_prompt
                
                if options:
                    response_parameters["options"] = options
                
                response = llm.ollama_client.generate(**response_parameters)
                
                if not response or 'response' not in response:
                    return _error_response_with_metadata(
                        'No valid response received from model',
                        status=500,
                        error_code='LLM_EMPTY_RESPONSE',
                        provider='ollama',
                        operation='vision_generate',
                    )
                
                response_text = clean_response(response['response'])
            
            elif provider == "lmstudio":
                if not llm.LMSTUDIO_AVAILABLE:
                    return _error_response_with_metadata(
                        'LM Studio is not available',
                        status=503,
                        error_code='LLM_PROVIDER_UNAVAILABLE',
                        provider='lmstudio',
                        operation='vision_generate',
                    )
                
                # LM Studio requires temp file conversion
                temp_files = []
                try:
                    temp_files = routes_helpers.decode_base64_images_to_temp(images_data)
                    
                    # Use LM Studio's vision generation
                    import lmstudio as lms
                    keep_alive = options.get('keep_alive', 0)
                    
                    lms_model = lms.llm(model, ttl=keep_alive) if keep_alive >= 1 else lms.llm(model)
                    
                    # Create chat with system prompt (if provided)
                    chat = lms.Chat(system_prompt) if system_prompt else lms.Chat()
                    
                    # Prepare image handles
                    image_handles = [lms.prepare_image(img_path) for img_path in temp_files]
                    chat.add_user_message(prompt, images=image_handles)
                    
                    response = lms_model.respond(chat)
                    
                    if keep_alive < 1:
                        lms_model.unload()
                    
                    if not response:
                        return _error_response_with_metadata(
                            'No valid response received from model',
                            status=500,
                            error_code='LLM_EMPTY_RESPONSE',
                            provider='lmstudio',
                            operation='vision_generate',
                        )
                    
                    response_text = clean_response(response.content)
                
                finally:
                    routes_helpers.cleanup_temp_files(temp_files)
            
            return success_response(data={
                "response": response_text,
                "provider": provider,
                "model": model
            })
            
        except ValueError as e:
            logger.error(f"Validation error in vision generate: {str(e)}")
            return _error_response_from_exception('Validation error in vision generate', e, status=400, default_error_code='LLM_VALIDATION_ERROR')
        except Exception as e:
            logger.error(f"Failed to generate vision response: {str(e)}")
            return _error_response_from_exception('Failed to generate vision response', e, status=500, default_error_code='LLM_VISION_GENERATION_ERROR')
    
    _route_list.append({
        "method": "POST",
        "path": "/sage_llm/vision_generate",
        "description": "Generate vision response from LLM"
    })
    
    @routes_instance.post('/sage_llm/vision_generate_stream')
    @route_error_handler
    async def generate_vision_response_stream(request):
        """
        Generate a streaming response from a vision LLM using Server-Sent Events.
        
        Request body:
            {
                "provider": "ollama" | "lmstudio",
                "model": str,
                "prompt": str,
                "images": [base64_encoded_image, ...],
                "system_prompt": str (optional),
                "options": {...}
            }
        
        Response: Server-Sent Events (SSE) stream
        """
        try:
            _clear_last_llm_error()
            data = await request.json()
            
            # Validate vision input
            is_valid, error_msg = routes_helpers.validate_vision_data(data)
            if not is_valid:
                return _error_response_with_metadata(error_msg, status=400, error_code='LLM_VALIDATION_ERROR')
            
            provider = data["provider"].lower()
            model = data["model"]
            prompt = data["prompt"]
            images_data = data["images"]
            system_prompt = data.get("system_prompt", "")
            options = data.get("options", {})
            
            from ..utils import llm_wrapper as llm
            
            # Initialize LLM services if needed
            llm.ensure_llm_initialized()
            
            # Create SSE response
            response = web.StreamResponse()
            response.headers['Content-Type'] = 'text/event-stream'
            response.headers['Cache-Control'] = 'no-cache'
            response.headers['Connection'] = 'keep-alive'
            await response.prepare(request)
            
            try:
                if provider == "ollama":
                    if not llm.OLLAMA_AVAILABLE:
                        error_chunk = _sse_error_chunk(
                            'Ollama is not available',
                            error_code='LLM_PROVIDER_UNAVAILABLE',
                            provider='ollama',
                            operation='vision_generate_stream',
                        )
                        await response.write(error_chunk.encode('utf-8'))
                        await response.write_eof()
                        return response
                    
                    # Ollama vision streaming with base64 images
                    response_parameters = {
                        "model": model,
                        "prompt": prompt,
                        "stream": True,
                        "images": images_data,
                        "keep_alive": 0.0
                    }
                    
                    if system_prompt:
                        response_parameters["system"] = system_prompt
                    
                    if options:
                        response_parameters["options"] = options
                    
                    full_response = ""
                    
                    for chunk in llm.ollama_client.generate(**response_parameters):
                        if 'response' in chunk:
                            chunk_text = chunk['response']
                            full_response += chunk_text
                            
                            chunk_data = {
                                "chunk": chunk_text,
                                "done": chunk.get('done', False)
                            }
                            sse_data = routes_helpers.format_sse_chunk(chunk_data)
                            await response.write(sse_data.encode('utf-8'))
                            
                            if chunk.get('done', False):
                                # Send final message
                                final_data = {
                                    "chunk": "",
                                    "done": True,
                                    "full_response": clean_response(full_response)
                                }
                                sse_data = routes_helpers.format_sse_chunk(final_data)
                                await response.write(sse_data.encode('utf-8'))
                                break
                
                elif provider == "lmstudio":
                    if not llm.LMSTUDIO_AVAILABLE:
                        error_chunk = _sse_error_chunk(
                            'LM Studio is not available',
                            error_code='LLM_PROVIDER_UNAVAILABLE',
                            provider='lmstudio',
                            operation='vision_generate_stream',
                        )
                        await response.write(error_chunk.encode('utf-8'))
                        await response.write_eof()
                        return response
                    
                    # LM Studio vision streaming (requires temp files)
                    temp_files = []
                    try:
                        temp_files = routes_helpers.decode_base64_images_to_temp(images_data)
                        
                        # Use streaming function
                        import lmstudio as lms
                        keep_alive = options.get('keep_alive', 0)
                        
                        lms_model = lms.llm(model, ttl=keep_alive) if keep_alive >= 1 else lms.llm(model)
                        
                        # Create chat with system prompt (if provided)
                        chat = lms.Chat(system_prompt) if system_prompt else lms.Chat()
                        
                        # Prepare image handles
                        image_handles = [lms.prepare_image(img_path) for img_path in temp_files]
                        chat.add_user_message(prompt, images=image_handles)
                        
                        # Get response and simulate streaming
                        lms_response = lms_model.respond(chat)
                        
                        if keep_alive < 1:
                            lms_model.unload()
                        
                        if lms_response:
                            response_text = clean_response(lms_response.content)
                            
                            # Simulate streaming by chunking
                            chunk_size = 5
                            for i in range(0, len(response_text), chunk_size):
                                chunk = response_text[i:i + chunk_size]
                                chunk_data = {"chunk": chunk, "done": False}
                                sse_data = routes_helpers.format_sse_chunk(chunk_data)
                                await response.write(sse_data.encode('utf-8'))
                            
                            # Final message
                            final_data = {"chunk": "", "done": True, "full_response": response_text}
                            sse_data = routes_helpers.format_sse_chunk(final_data)
                            await response.write(sse_data.encode('utf-8'))
                    
                    finally:
                        routes_helpers.cleanup_temp_files(temp_files)
                
                await response.write_eof()
                return response
                
            except Exception as e:
                logger.error(f"Error during vision streaming: {str(e)}")
                payload = _last_llm_error.get()
                _clear_last_llm_error()
                error_chunk = _sse_error_chunk(
                    payload.get('scoped_message') if payload else str(e),
                    error_code=f"LLM_{str(payload.get('error_type', 'STREAM_ERROR')).upper()}" if payload else 'LLM_STREAM_ERROR',
                    provider=payload.get('provider') if payload else provider,
                    operation=payload.get('operation') if payload else 'vision_generate_stream',
                    cause=payload.get('cause') if payload else None,
                )
                await response.write(error_chunk.encode('utf-8'))
                await response.write_eof()
                return response
                
        except Exception as e:
            logger.error(f"Failed to initialize vision streaming: {str(e)}")
            return _error_response_from_exception('Failed to initialize vision streaming', e, status=500, default_error_code='LLM_VISION_STREAM_INIT_ERROR')
    
    _route_list.append({
        "method": "POST",
        "path": "/sage_llm/vision_generate_stream",
        "description": "Generate streaming vision response from LLM (SSE)"
    })
    
    @routes_instance.get('/sage_utils/system_prompts/{prompt_id}.md')
    @route_error_handler
    async def get_system_prompt(request):
        """
        Serve system prompt markdown files from assets (built-in) or user directory (custom).
        
        Args:
            prompt_id: ID of the system prompt to retrieve
            
        Returns:
            Markdown content of the system prompt
        """
        try:
            from pathlib import Path
            from ..utils import sage_users_path
            
            prompt_id = request.match_info['prompt_id']
            
            # Map built-in prompt IDs to files in assets
            builtin_prompts = {
                'e621_prompt_generator': 'system_prompt.md',
            }
            
            # Check if it's a built-in prompt
            if prompt_id in builtin_prompts:
                current_dir = Path(__file__).parent.parent
                assets_dir = current_dir / "assets"
                prompt_file = assets_dir / builtin_prompts[prompt_id]
            else:
                # Check user directory for custom prompts
                user_prompts_dir = Path(sage_users_path) / "llm_system_prompts"
                prompt_file = user_prompts_dir / f"{prompt_id}.md"
            
            if not prompt_file.exists():
                return error_response(f"System prompt '{prompt_id}' not found", status=404)
            
            # Read and return the file
            with open(prompt_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            return web.Response(text=content, content_type='text/markdown')
            
        except Exception as e:
            logger.error(f"Error loading system prompt: {str(e)}")
            return error_response(f"Failed to load system prompt: {str(e)}", status=500)
    
    _route_list.append({
        "method": "GET",
        "path": "/sage_utils/system_prompts/{prompt_id}.md",
        "description": "Get system prompt markdown file"
    })
    
    @routes_instance.post('/sage_llm/system_prompts/save')
    @route_error_handler
    async def save_system_prompt(request):
        """
        Save a custom system prompt to user directory.
        
        Body:
            {
                "id": str,
                "name": str,
                "content": str,
                "description": str (optional)
            }
        """
        try:
            from pathlib import Path
            from ..utils import sage_users_path
            
            data = await request.json()
            
            prompt_id = data.get('id')
            name = data.get('name')
            content = data.get('content')
            description = data.get('description', '')
            
            if not prompt_id or not name or not content:
                return error_response("Missing required fields: id, name, content", status=400)
            
            # Create user directory for system prompts
            user_prompts_dir = Path(sage_users_path) / "llm_system_prompts"
            user_prompts_dir.mkdir(parents=True, exist_ok=True)
            
            # Save markdown file
            prompt_file = user_prompts_dir / f"{prompt_id}.md"
            with open(prompt_file, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # Save metadata
            metadata_file = user_prompts_dir / "_metadata.json"
            metadata = {}
            if metadata_file.exists():
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
            
            from datetime import datetime
            metadata[prompt_id] = {
                "name": name,
                "description": description,
                "created": metadata.get(prompt_id, {}).get('created', datetime.now().isoformat()),
                "updated": datetime.now().isoformat()
            }
            
            with open(metadata_file, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2)
            
            return success_response({"id": prompt_id, "name": name})
            
        except Exception as e:
            logger.error(f"Error saving system prompt: {str(e)}")
            return error_response(f"Failed to save system prompt: {str(e)}", status=500)
    
    _route_list.append({
        "method": "POST",
        "path": "/sage_llm/system_prompts/save",
        "description": "Save custom system prompt"
    })
    
    @routes_instance.post('/sage_llm/system_prompts/delete')
    @route_error_handler
    async def delete_system_prompt(request):
        """
        Delete a custom system prompt.
        
        Body:
            {"id": str}
        """
        try:
            from pathlib import Path
            from ..utils import sage_users_path
            
            data = await request.json()
            prompt_id = data.get('id')
            
            if not prompt_id:
                return error_response("Missing prompt id", status=400)
            
            user_prompts_dir = Path(sage_users_path) / "llm_system_prompts"
            prompt_file = user_prompts_dir / f"{prompt_id}.md"
            
            if not prompt_file.exists():
                return error_response(f"System prompt '{prompt_id}' not found", status=404)
            
            # Delete file
            prompt_file.unlink()
            
            # Update metadata
            metadata_file = user_prompts_dir / "_metadata.json"
            if metadata_file.exists():
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                
                if prompt_id in metadata:
                    del metadata[prompt_id]
                    
                with open(metadata_file, 'w', encoding='utf-8') as f:
                    json.dump(metadata, f, indent=2)
            
            return success_response({"deleted": prompt_id})
            
        except Exception as e:
            logger.error(f"Error deleting system prompt: {str(e)}")
            return error_response(f"Failed to delete system prompt: {str(e)}", status=500)
    
    _route_list.append({
        "method": "POST",
        "path": "/sage_llm/system_prompts/delete",
        "description": "Delete custom system prompt"
    })
    
    @routes_instance.get('/sage_llm/system_prompts/list')
    @route_error_handler
    async def list_system_prompts(request):
        """
        List all available system prompts (built-in + custom).
        
        Returns:
            {
                "success": true,
                "prompts": {
                    "prompt_id": {"name": str, "description": str, "isBuiltin": bool}
                }
            }
        """
        try:
            from pathlib import Path
            from ..utils import sage_users_path
            
            prompts = {}
            
            # Add built-in prompts
            prompts['default'] = {
                "name": "Default",
                "description": "Basic helpful assistant",
                "isBuiltin": True
            }
            prompts['e621_prompt_generator'] = {
                "name": "E621 Prompt Generator",
                "description": "Advanced image description for E621-style prompts",
                "isBuiltin": True
            }
            
            # Add custom prompts from user directory
            user_prompts_dir = Path(sage_users_path) / "llm_system_prompts"
            if user_prompts_dir.exists():
                metadata_file = user_prompts_dir / "_metadata.json"
                if metadata_file.exists():
                    with open(metadata_file, 'r', encoding='utf-8') as f:
                        metadata = json.load(f)
                    
                    for prompt_id, meta in metadata.items():
                        prompts[prompt_id] = {
                            "name": meta.get('name', prompt_id),
                            "description": meta.get('description', ''),
                            "isBuiltin": False
                        }
            
            return success_response({"prompts": prompts})
            
        except Exception as e:
            logger.error(f"Error listing system prompts: {str(e)}")
            return error_response(f"Failed to list system prompts: {str(e)}", status=500)
    
    _route_list.append({
        "method": "GET",
        "path": "/sage_llm/system_prompts/list",
        "description": "List all system prompts"
    })
    
    @routes_instance.get('/sage_llm/presets/list')
    @route_error_handler
    async def list_presets(request):
        """
        List all available LLM presets (built-in + custom).
        
        Returns:
            {
                "success": true,
                "presets": {
                    "preset_id": {preset_data}
                }
            }
        """
        try:
            from pathlib import Path
            from ..utils import sage_users_path
            
            # Load custom presets from user directory
            user_presets_file = Path(sage_users_path) / "llm_presets.json"
            custom_presets = {}
            
            if user_presets_file.exists():
                with open(user_presets_file, 'r', encoding='utf-8') as f:
                    custom_presets = json.load(f)
            
            return success_response({"presets": custom_presets})
            
        except Exception as e:
            logger.error(f"Error listing presets: {str(e)}")
            return error_response(f"Failed to list presets: {str(e)}", status=500)
    
    _route_list.append({
        "method": "GET",
        "path": "/sage_llm/presets/list",
        "description": "List all LLM presets"
    })
    
    @routes_instance.post('/sage_llm/presets/save')
    @route_error_handler
    async def save_preset(request):
        """
        Save an LLM preset to user directory.
        
        Body:
            {
                "id": str,
                "preset": {preset_data}
            }
        """
        try:
            from pathlib import Path
            from ..utils import sage_users_path
            from datetime import datetime
            
            data = await request.json()
            preset_id = data.get('id')
            preset_data = data.get('preset')
            
            if not preset_id or not preset_data:
                return error_response("Missing required fields: id, preset", status=400)
            
            # Load existing presets
            user_presets_file = Path(sage_users_path) / "llm_presets.json"
            presets = {}
            
            if user_presets_file.exists():
                with open(user_presets_file, 'r', encoding='utf-8') as f:
                    presets = json.load(f)
            
            # Update preset with timestamps
            preset_data['updatedAt'] = datetime.now().isoformat()
            if preset_id not in presets:
                preset_data['createdAt'] = datetime.now().isoformat()
            
            presets[preset_id] = preset_data
            
            # Save to file
            user_presets_file.parent.mkdir(parents=True, exist_ok=True)
            with open(user_presets_file, 'w', encoding='utf-8') as f:
                json.dump(presets, f, indent=2)
            
            return success_response({"id": preset_id, "preset": preset_data})
            
        except Exception as e:
            logger.error(f"Error saving preset: {str(e)}")
            return error_response(f"Failed to save preset: {str(e)}", status=500)
    
    _route_list.append({
        "method": "POST",
        "path": "/sage_llm/presets/save",
        "description": "Save LLM preset"
    })
    
    @routes_instance.post('/sage_llm/presets/delete')
    @route_error_handler
    async def delete_preset(request):
        """
        Delete a custom preset.
        
        Body:
            {"id": str}
        """
        try:
            from pathlib import Path
            from ..utils import sage_users_path
            
            data = await request.json()
            preset_id = data.get('id')
            
            if not preset_id:
                return error_response("Missing preset id", status=400)
            
            # Load existing presets
            user_presets_file = Path(sage_users_path) / "llm_presets.json"
            
            if not user_presets_file.exists():
                return error_response(f"Preset '{preset_id}' not found", status=404)
            
            with open(user_presets_file, 'r', encoding='utf-8') as f:
                presets = json.load(f)
            
            if preset_id not in presets:
                return error_response(f"Preset '{preset_id}' not found", status=404)
            
            # Delete preset
            del presets[preset_id]
            
            # Save updated presets
            with open(user_presets_file, 'w', encoding='utf-8') as f:
                json.dump(presets, f, indent=2)
            
            return success_response({"deleted": preset_id})
            
        except Exception as e:
            logger.error(f"Error deleting preset: {str(e)}")
            return error_response(f"Failed to delete preset: {str(e)}", status=500)
    
    _route_list.append({
        "method": "POST",
        "path": "/sage_llm/presets/delete",
        "description": "Delete LLM preset"
    })
    
    @routes_instance.get('/sage_llm/presets/all')
    @route_error_handler
    async def get_all_presets(request):
        """
        Get all available LLM presets (built-in + custom) with full details.
        This is useful for programmatic access from other parts of the code.
        
        Returns:
            {
                "success": true,
                "presets": {
                    "preset_id": {
                        "name": str,
                        "description": str,
                        "provider": str,
                        "model": str,
                        "category": str,
                        "isBuiltin": bool,
                        "promptTemplate": str,
                        "systemPrompt": str,
                        "settings": {...}
                    }
                }
            }
        """
        try:
            from ..utils.llm.routes_helpers import get_available_presets_full
            
            all_presets = get_available_presets_full()
            return success_response({"presets": all_presets})
            
        except Exception as e:
            logger.error(f"Error getting all presets: {str(e)}")
            return error_response(f"Failed to get presets: {str(e)}", status=500)
    
    _route_list.append({
        "method": "GET",
        "path": "/sage_llm/presets/all",
        "description": "Get all LLM presets with full details"
    })
    
    @routes_instance.post('/sage_llm/presets/generate_with_image')
    @route_error_handler
    async def generate_with_preset_and_image(request):
        """
        Generate a response using a preset with an image.
        This allows other parts of the code to use LLM presets programmatically.
        
        Request body:
            {
                "preset_id": str,              # ID of the preset to use
                "images": [base64, ...],       # Array of base64-encoded images
                "prompt_override": str,        # Optional: Override the preset's prompt template
                "system_prompt_override": str, # Optional: Override the preset's system prompt
                "settings_override": {...}     # Optional: Override specific settings
            }
        
        Returns:
            {
                "success": true,
                "response": str,
                "preset_used": str,
                "provider": str,
                "model": str
            }
        """
        try:
            from pathlib import Path
            from ..utils import sage_users_path
            from ..utils import llm_wrapper as llm
            from ..utils.config_manager import llm_prompts
            
            data = await request.json()
            
            preset_id = data.get('preset_id')
            images_data = data.get('images', [])
            prompt_override = data.get('prompt_override')
            system_prompt_override = data.get('system_prompt_override')
            settings_override = data.get('settings_override', {})
            
            if not preset_id:
                return error_response("Missing required field: preset_id", status=400)
            
            if not images_data or not isinstance(images_data, list):
                return error_response("Images must be a non-empty array", status=400)
            
            # Get all presets
            builtin_presets = {
                'descriptive_prompt': {
                    'provider': 'ollama',
                    'model': 'gemma3:12b',
                    'promptTemplate': 'description/Descriptive Prompt',
                    'systemPrompt': 'e621_prompt_generator',
                    'settings': {
                        'temperature': 0.7,
                        'seed': -1,
                        'maxTokens': 512,
                        'keepAlive': 300
                    }
                },
                'e621_description': {
                    'provider': 'ollama',
                    'model': 'gemma3:12b',
                    'promptTemplate': 'description/Descriptive Prompt',
                    'systemPrompt': 'e621_prompt_generator',
                    'settings': {
                        'temperature': 0.8,
                        'seed': -1,
                        'maxTokens': 1024,
                        'keepAlive': 300
                    }
                },
                'casual_chat': {
                    'provider': 'ollama',
                    'model': None,
                    'promptTemplate': '',
                    'systemPrompt': 'default',
                    'settings': {
                        'temperature': 0.9,
                        'seed': -1,
                        'maxTokens': 1024,
                        'keepAlive': 300
                    }
                }
            }
            
            # Check for user override
            preset = builtin_presets.get(preset_id)
            user_presets_file = Path(sage_users_path) / "llm_presets.json"
            if user_presets_file.exists():
                with open(user_presets_file, 'r', encoding='utf-8') as f:
                    custom_presets = json.load(f)
                if preset_id in custom_presets:
                    preset = custom_presets[preset_id]
            
            if not preset:
                return error_response(f"Preset '{preset_id}' not found", status=404)
            
            # Get provider and model
            provider = preset.get('provider', 'ollama')
            model = preset.get('model')
            
            if not model:
                return error_response(f"Preset '{preset_id}' does not specify a model", status=400)
            
            # Build prompt
            prompt_text = prompt_override
            
            if not prompt_text and preset.get('promptTemplate'):
                # Load prompt from template
                template_path = preset['promptTemplate']  # e.g., "description/Descriptive Prompt"
                if '/' in template_path:
                    category, template_name = template_path.split('/', 1)
                    
                    # Find template in llm_prompts
                    for key, template in llm_prompts.get('base', {}).items():
                        if template.get('category') == category and template.get('name') == template_name:
                            prompt_text = template.get('prompt', '')
                            break
            
            if not prompt_text:
                prompt_text = "Describe this image in detail."
            
            # Get system prompt
            system_prompt_text = system_prompt_override
            
            if not system_prompt_text and preset.get('systemPrompt'):
                system_prompt_id = preset['systemPrompt']
                
                # Map system prompts
                if system_prompt_id == 'default':
                    system_prompt_text = 'You are a helpful AI assistant.'
                elif system_prompt_id == 'e621_prompt_generator':
                    # Load from file
                    current_dir = Path(__file__).parent.parent
                    assets_dir = current_dir / "assets"
                    prompt_file = assets_dir / "system_prompt.md"
                    
                    if prompt_file.exists():
                        with open(prompt_file, 'r', encoding='utf-8') as f:
                            system_prompt_text = f.read()
                    else:
                        system_prompt_text = 'You are an AI assistant specialized in generating detailed image descriptions.'
                else:
                    # Try to load from user directory
                    user_prompts_dir = Path(sage_users_path) / "llm_system_prompts"
                    prompt_file = user_prompts_dir / f"{system_prompt_id}.md"
                    
                    if prompt_file.exists():
                        with open(prompt_file, 'r', encoding='utf-8') as f:
                            system_prompt_text = f.read()
            
            # Merge settings
            settings = preset.get('settings', {})
            settings.update(settings_override)
            
            # Build options for LLM
            options = {
                'temperature': settings.get('temperature', 0.7),
                'seed': settings.get('seed', -1)
            }
            
            # Add provider-specific options
            if provider == 'ollama':
                if 'top_k' in settings:
                    options['top_k'] = settings['top_k']
                if 'top_p' in settings:
                    options['top_p'] = settings['top_p']
                if 'repeat_penalty' in settings:
                    options['repeat_penalty'] = settings['repeat_penalty']
            
            # Initialize LLM services
            llm.ensure_llm_initialized()
            
            # Generate response
            response_text = ""
            
            if provider == "ollama":
                if not llm.OLLAMA_AVAILABLE:
                    return error_response("Ollama is not available", status=503)
                
                # Build parameters for Ollama vision generation
                response_parameters = {
                    "model": model,
                    "prompt": prompt_text,
                    "stream": False,
                    "images": images_data,
                    "keep_alive": settings.get('keepAlive', 300) / 60.0  # Convert seconds to minutes
                }
                
                if system_prompt_text:
                    response_parameters["system"] = system_prompt_text
                
                if options:
                    response_parameters["options"] = options
                
                response = llm.ollama_client.generate(**response_parameters)
                
                if not response or 'response' not in response:
                    return error_response("No valid response received from model", status=500)
                
                response_text = clean_response(response['response'])
            
            elif provider == "lmstudio":
                if not llm.LMSTUDIO_AVAILABLE:
                    return error_response("LM Studio is not available", status=503)
                
                # Convert base64 to temp files for LM Studio
                import base64
                import tempfile
                import os
                import lmstudio as lms
                
                temp_files = []
                try:
                    for img_b64 in images_data:
                        img_bytes = base64.b64decode(img_b64)
                        temp_fd, temp_path = tempfile.mkstemp(suffix='.png')
                        os.close(temp_fd)
                        with open(temp_path, 'wb') as f:
                            f.write(img_bytes)
                        temp_files.append(temp_path)
                    
                    keep_alive = settings.get('keepAlive', 0)
                    lms_model = lms.llm(model, ttl=keep_alive) if keep_alive >= 1 else lms.llm(model)
                    
                    # Create chat with system prompt (if provided)
                    chat = lms.Chat(system_prompt_text) if system_prompt_text else lms.Chat()
                    
                    image_handles = [lms.prepare_image(img_path) for img_path in temp_files]
                    chat.add_user_message(prompt_text, images=image_handles)
                    
                    lms_response = lms_model.respond(chat)
                    
                    if keep_alive < 1:
                        lms_model.unload()
                    
                    if not lms_response:
                        return error_response("No valid response received from model", status=500)
                    
                    response_text = clean_response(lms_response.content)
                
                finally:
                    for temp_path in temp_files:
                        try:
                            os.unlink(temp_path)
                        except:
                            pass
            
            return success_response({
                "response": response_text,
                "preset_used": preset_id,
                "provider": provider,
                "model": model
            })
            
        except ValueError as e:
            logger.error(f"Validation error in preset generation: {str(e)}")
            return error_response(str(e), status=400)
        except Exception as e:
            logger.error(f"Failed to generate with preset: {str(e)}")
            import traceback
            traceback.print_exc()
            return error_response(f"Failed to generate with preset: {str(e)}", status=500)
    
    _route_list.append({
        "method": "POST",
        "path": "/sage_llm/presets/generate_with_image",
        "description": "Generate response using preset with image"
    })

    @routes_instance.post('/sage_llm/load_model')
    @route_error_handler
    async def load_llm_model(request):
        """
        Load a model into memory without generating a response.

        For LM Studio this loads the model handle and immediately unloads it
        (the purpose is just to confirm the model can be loaded and to log the
        event).  Pass keep_alive > 0 to keep it resident.

        For Ollama this sends a blank-prompt generate to pre-warm the model so
        it is resident in GPU memory for subsequent /sage_llm/generate_only
        calls.

        Request body:
            {
                "provider": "ollama" | "lmstudio" | "native",
                "model": str,
                "keep_alive": float | int  (optional, seconds; default 60)
            }

        Returns:
            {
                "success": true,
                "loaded": true,
                "provider": str,
                "model": str
            }
        """
        try:
            _clear_last_llm_error()
            data = await request.json()

            provider = str(data.get("provider", "")).lower()
            model = str(data.get("model", ""))
            keep_alive = data.get("keep_alive", 60)

            if not provider or provider not in ("ollama", "lmstudio", "native"):
                return _error_response_with_metadata(
                    f"Invalid or missing provider: {provider!r}. Must be 'ollama', 'lmstudio', or 'native'",
                    status=400,
                    error_code='LLM_VALIDATION_ERROR',
                )
            if not model:
                return _error_response_with_metadata(
                    "Missing required field: model",
                    status=400,
                    error_code='LLM_VALIDATION_ERROR',
                )

            from ..utils import llm_wrapper as llm

            llm.ensure_llm_initialized()

            if provider == "ollama":
                if not llm.OLLAMA_AVAILABLE:
                    return _error_response_with_metadata(
                        'Ollama is not available',
                        status=503,
                        error_code='LLM_PROVIDER_UNAVAILABLE',
                        provider='ollama',
                        operation='load_model',
                    )
                loaded = llm.ollama_preload_model(model=model, keep_alive=float(keep_alive))
                if not loaded:
                    return _error_response_with_metadata(
                        f"Failed to preload model '{model}' in Ollama",
                        status=500,
                        error_code='LLM_LOAD_ERROR',
                        provider='ollama',
                        operation='load_model',
                    )

            elif provider == "lmstudio":
                if not llm.LMSTUDIO_AVAILABLE:
                    return _error_response_with_metadata(
                        'LM Studio is not available',
                        status=503,
                        error_code='LLM_PROVIDER_UNAVAILABLE',
                        provider='lmstudio',
                        operation='load_model',
                    )
                lms_model = llm.lmstudio_load_model(model=model, keep_alive=int(keep_alive))
                if keep_alive < 1:
                    llm.lmstudio_unload_model(lms_model)

            elif provider == "native":
                available_native = _get_native_clip_models()
                if model not in available_native:
                    return _error_response_with_metadata(
                        f"Native CLIP model '{model}' is not available",
                        status=404,
                        error_code='LLM_MODEL_NOT_FOUND',
                        provider='native',
                        operation='load_model',
                    )
                # Native models are loaded on demand for generation; this validates selection.

            return success_response(data={
                "loaded": True,
                "provider": provider,
                "model": model,
            })

        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            return _error_response_from_exception('Failed to load model', e, status=500, default_error_code='LLM_LOAD_ERROR')

    _route_list.append({
        "method": "POST",
        "path": "/sage_llm/load_model",
        "description": "Load a model into memory (Ollama pre-warm / LM Studio load)"
    })

    @routes_instance.post('/sage_llm/generate_only')
    @route_error_handler
    async def generate_only(request):
        """
        Generate a response from an already-loaded model.

        Semantically equivalent to /sage_llm/generate but signals to the
        backend (and logs) that the model is expected to already be in memory.
        Callers should call /sage_llm/load_model first if they want to separate
        the two phases.

        Request body:
            {
                "provider": "ollama" | "lmstudio" | "native",
                "model": str,
                "prompt": str,
                "system_prompt": str  (optional, Ollama only),
                "keep_alive": float | int  (optional, seconds; default 0),
                "options": {
                    "temperature": float,
                    "seed": int,
                    ...
                }
            }

        Returns:
            {
                "success": true,
                "response": str,
                "provider": str,
                "model": str
            }
        """
        try:
            _clear_last_llm_error()
            data = await request.json()

            is_valid, error_msg = routes_helpers.validate_generation_data(data)
            if not is_valid:
                return _error_response_with_metadata(error_msg, status=400, error_code='LLM_VALIDATION_ERROR')

            provider = data["provider"].lower()
            model = data["model"]
            prompt = data["prompt"]
            system_prompt = data.get("system_prompt", "")
            keep_alive = data.get("keep_alive", 0)
            options = data.get("options", {})

            from ..utils import llm_wrapper as llm

            llm.ensure_llm_initialized()

            response_text = ""

            if provider == "ollama":
                if not llm.OLLAMA_AVAILABLE:
                    return _error_response_with_metadata(
                        'Ollama is not available',
                        status=503,
                        error_code='LLM_PROVIDER_UNAVAILABLE',
                        provider='ollama',
                        operation='generate_only',
                    )
                response_text = llm.ollama_generate_preloaded(
                    model=model,
                    prompt=prompt,
                    keep_alive=float(keep_alive),
                    options=options,
                    system_prompt=system_prompt,
                )

            elif provider == "lmstudio":
                if not llm.LMSTUDIO_AVAILABLE:
                    return _error_response_with_metadata(
                        'LM Studio is not available',
                        status=503,
                        error_code='LLM_PROVIDER_UNAVAILABLE',
                        provider='lmstudio',
                        operation='generate_only',
                    )
                lms_model = llm.lmstudio_load_model(model=model, keep_alive=int(keep_alive))
                try:
                    response_text = llm.lmstudio_generate_with_model(lms_model, prompt=prompt, options=options)
                finally:
                    if keep_alive < 1:
                        llm.lmstudio_unload_model(lms_model)

            elif provider == "native":
                available_native = _get_native_clip_models()
                if model not in available_native:
                    return _error_response_with_metadata(
                        f"Native CLIP model '{model}' is not available",
                        status=404,
                        error_code='LLM_MODEL_NOT_FOUND',
                        provider='native',
                        operation='generate_only',
                    )

                response_text = _native_generate_response(
                    model=model,
                    prompt=prompt,
                    system_prompt=system_prompt,
                    options=options,
                )

            return success_response(data={
                "response": response_text,
                "provider": provider,
                "model": model,
            })

        except ValueError as e:
            logger.error(f"Validation error in generate_only: {str(e)}")
            return _error_response_from_exception('Validation error in generate_only', e, status=400, default_error_code='LLM_VALIDATION_ERROR')
        except Exception as e:
            logger.error(f"Failed to generate response: {str(e)}")
            return _error_response_from_exception('Failed to generate response', e, status=500, default_error_code='LLM_GENERATION_ERROR')

    _route_list.append({
        "method": "POST",
        "path": "/sage_llm/generate_only",
        "description": "Generate text response assuming model is already loaded"
    })

    return len(_route_list)


def get_route_list():
    """
    Get list of registered routes for documentation.
    
    Returns:
        list: Route information
    """
    return _route_list.copy()

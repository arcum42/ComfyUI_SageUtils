"""
LLM Routes Module
Handles LLM chat endpoints for Ollama and LM Studio integration.
"""

import json
import logging
from aiohttp import web
from .base import route_error_handler, success_response, error_response, validate_json_body

# Route list for documentation and registration tracking
_route_list = []


def register_routes(routes_instance):
    """
    Register LLM-related routes.
    
    Args:
        routes_instance: The PromptServer routes instance
        
    Returns:
        int: Number of routes registered
    """
    global _route_list
    _route_list.clear()
    
    @routes_instance.get('/sage_llm/status')
    @route_error_handler
    async def get_llm_status(request):
        """
        Check if Ollama and LM Studio are available and enabled.
        
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
                }
            }
        """
        try:
            from ..utils.settings import get_setting
            from ..utils import llm_wrapper as llm
            
            # Check settings
            ollama_enabled = get_setting("enable_ollama", True)
            lmstudio_enabled = get_setting("enable_lmstudio", True)
            
            # Check availability
            ollama_available = llm.OLLAMA_AVAILABLE and ollama_enabled
            lmstudio_available = llm.LMSTUDIO_AVAILABLE and lmstudio_enabled
            
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
            
            return success_response(data={
                "ollama": ollama_info,
                "lmstudio": lmstudio_info
            })
            
        except Exception as e:
            logging.error(f"LLM status error: {str(e)}")
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
        Get available text models from Ollama and LM Studio.
        
        Query params:
            force: bool - Force re-initialization of LLM providers (default: False)
        
        Returns:
            {
                "success": true,
                "models": {
                    "ollama": ["model1", "model2", ...],
                    "lmstudio": ["model1", "model2", ...]
                },
                "status": {
                    "ollama_available": bool,
                    "lmstudio_available": bool
                }
            }
        """
        try:
            from ..utils import llm_wrapper as llm
            from ..utils.settings import get_setting
            
            # Check if force re-initialization is requested
            force = request.rel_url.query.get('force', '').lower() == 'true'
            
            if force:
                logging.info("Force re-initializing LLM providers...")
                # Reset initialization flags to force re-init
                llm._ollama_initialized = False
                llm._lmstudio_initialized = False
            
            # Initialize LLM services if needed
            llm.ensure_llm_initialized()
            
            # Get models from both providers
            ollama_models = []
            lmstudio_models = []
            
            ollama_enabled = get_setting("enable_ollama", True)
            lmstudio_enabled = get_setting("enable_lmstudio", True)
            
            if ollama_enabled and llm.OLLAMA_AVAILABLE:
                try:
                    ollama_models = llm.get_ollama_models()
                    # Filter out placeholder messages
                    if ollama_models and ollama_models[0].startswith("("):
                        ollama_models = []
                except Exception as e:
                    logging.warning(f"Failed to get Ollama models: {e}")
            
            if lmstudio_enabled and llm.LMSTUDIO_AVAILABLE:
                try:
                    lmstudio_models = llm.get_lmstudio_models()
                    # Filter out placeholder messages
                    if lmstudio_models and lmstudio_models[0].startswith("("):
                        lmstudio_models = []
                except Exception as e:
                    logging.warning(f"Failed to get LM Studio models: {e}")
            
            return success_response(data={
                "models": {
                    "ollama": ollama_models,
                    "lmstudio": lmstudio_models
                },
                "status": {
                    "ollama_available": len(ollama_models) > 0,
                    "lmstudio_available": len(lmstudio_models) > 0
                }
            })
            
        except Exception as e:
            logging.error(f"Failed to get models: {str(e)}")
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
                    "lmstudio": ["llava-v1.6", ...]
                },
                "status": {
                    "ollama_available": bool,
                    "lmstudio_available": bool
                }
            }
        """
        try:
            from ..utils import llm_wrapper as llm
            from ..utils.settings import get_setting
            
            # Check if force re-initialization is requested
            force = request.rel_url.query.get('force', '').lower() == 'true'
            
            if force:
                logging.info("Force re-initializing LLM providers for vision models...")
                # Reset initialization flags to force re-init
                llm._ollama_initialized = False
                llm._lmstudio_initialized = False
            
            # Initialize LLM services if needed
            llm.ensure_llm_initialized()
            
            # Get vision models from both providers
            ollama_models = []
            lmstudio_models = []
            
            ollama_enabled = get_setting("enable_ollama", True)
            lmstudio_enabled = get_setting("enable_lmstudio", True)
            
            if ollama_enabled and llm.OLLAMA_AVAILABLE:
                try:
                    ollama_models = llm.get_ollama_vision_models()
                    # Filter out placeholder messages
                    if ollama_models and ollama_models[0].startswith("("):
                        ollama_models = []
                except Exception as e:
                    logging.warning(f"Failed to get Ollama vision models: {e}")
            
            if lmstudio_enabled and llm.LMSTUDIO_AVAILABLE:
                try:
                    lmstudio_models = llm.get_lmstudio_vision_models()
                    # Filter out placeholder messages
                    if lmstudio_models and lmstudio_models[0].startswith("("):
                        lmstudio_models = []
                except Exception as e:
                    logging.warning(f"Failed to get LM Studio vision models: {e}")
            
            return success_response(data={
                "models": {
                    "ollama": ollama_models,
                    "lmstudio": lmstudio_models
                },
                "status": {
                    "ollama_available": len(ollama_models) > 0,
                    "lmstudio_available": len(lmstudio_models) > 0
                }
            })
            
        except Exception as e:
            logging.error(f"Failed to get vision models: {str(e)}")
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
            logging.error(f"Failed to get prompts: {str(e)}")
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
                "provider": "ollama" | "lmstudio",
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
            data = await request.json()
            
            # Validate required fields
            required = ["provider", "model", "prompt"]
            missing = [f for f in required if f not in data]
            if missing:
                return error_response(f"Missing required fields: {', '.join(missing)}", status=400)
            
            provider = data["provider"].lower()
            model = data["model"]
            prompt = data["prompt"]
            system_prompt = data.get("system_prompt", "")
            options = data.get("options", {})
            
            # Validate provider
            if provider not in ["ollama", "lmstudio"]:
                return error_response(f"Invalid provider: {provider}. Must be 'ollama' or 'lmstudio'", status=400)
            
            from ..utils import llm_wrapper as llm
            
            # Initialize LLM services if needed
            llm.ensure_llm_initialized()
            
            # Generate response based on provider
            response_text = ""
            
            if provider == "ollama":
                if not llm.OLLAMA_AVAILABLE:
                    return error_response("Ollama is not available", status=503)
                
                response_text = llm.ollama_generate(
                    model=model,
                    prompt=prompt,
                    system_prompt=system_prompt,
                    keep_alive=0.0,
                    options=options
                )
            
            elif provider == "lmstudio":
                if not llm.LMSTUDIO_AVAILABLE:
                    return error_response("LM Studio is not available", status=503)
                
                response_text = llm.lmstudio_generate(
                    model=model,
                    prompt=prompt,
                    keep_alive=0,
                    options=options
                )
            
            return success_response(data={
                "response": response_text,
                "provider": provider,
                "model": model
            })
            
        except ValueError as e:
            logging.error(f"Validation error in generate: {str(e)}")
            return error_response(str(e), status=400)
        except Exception as e:
            logging.error(f"Failed to generate response: {str(e)}")
            return error_response(f"Failed to generate response: {str(e)}", status=500)
    
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
                "provider": "ollama" | "lmstudio",
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
            data = await request.json()
            
            # Validate required fields
            required = ["provider", "model", "prompt"]
            missing = [f for f in required if f not in data]
            if missing:
                return error_response(f"Missing required fields: {', '.join(missing)}", status=400)
            
            provider = data["provider"].lower()
            model = data["model"]
            prompt = data["prompt"]
            system_prompt = data.get("system_prompt", "")
            options = data.get("options", {})
            
            # Validate provider
            if provider not in ["ollama", "lmstudio"]:
                return error_response(f"Invalid provider: {provider}. Must be 'ollama' or 'lmstudio'", status=400)
            
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
                        await response.write(b'data: {"error": "Ollama is not available", "done": true}\n\n')
                        return response
                    
                    for chunk_data in llm.ollama_generate_stream(
                        model=model,
                        prompt=prompt,
                        system_prompt=system_prompt,
                        keep_alive=0.0,
                        options=options
                    ):
                        # Send chunk as SSE
                        import json
                        sse_data = f"data: {json.dumps(chunk_data)}\n\n"
                        await response.write(sse_data.encode('utf-8'))
                        
                        if chunk_data.get("done", False):
                            break
                
                elif provider == "lmstudio":
                    if not llm.LMSTUDIO_AVAILABLE:
                        await response.write(b'data: {"error": "LM Studio is not available", "done": true}\n\n')
                        return response
                    
                    for chunk_data in llm.lmstudio_generate_stream(
                        model=model,
                        prompt=prompt,
                        keep_alive=0,
                        options=options
                    ):
                        # Send chunk as SSE
                        import json
                        sse_data = f"data: {json.dumps(chunk_data)}\n\n"
                        await response.write(sse_data.encode('utf-8'))
                        
                        if chunk_data.get("done", False):
                            break
                
                await response.write_eof()
                return response
                
            except Exception as e:
                logging.error(f"Error during streaming: {str(e)}")
                import json
                error_data = json.dumps({"error": str(e), "done": True})
                await response.write(f"data: {error_data}\n\n".encode('utf-8'))
                await response.write_eof()
                return response
                
        except Exception as e:
            logging.error(f"Failed to initialize streaming: {str(e)}")
            return error_response(f"Failed to initialize streaming: {str(e)}", status=500)
    
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
            data = await request.json()
            
            # Validate required fields
            required = ["provider", "model", "prompt", "images"]
            missing = [f for f in required if f not in data]
            if missing:
                return error_response(f"Missing required fields: {', '.join(missing)}", status=400)
            
            provider = data["provider"].lower()
            model = data["model"]
            prompt = data["prompt"]
            images_data = data["images"]
            system_prompt = data.get("system_prompt", "")
            options = data.get("options", {})
            
            # Validate provider
            if provider not in ["ollama", "lmstudio"]:
                return error_response(f"Invalid provider: {provider}. Must be 'ollama' or 'lmstudio'", status=400)
            
            # Validate images
            if not images_data or not isinstance(images_data, list):
                return error_response("Images must be a non-empty array", status=400)
            
            from ..utils import llm_wrapper as llm
            
            # Initialize LLM services if needed
            llm.ensure_llm_initialized()
            
            # Convert base64 images to tensor format (if needed by backend)
            # For Ollama, we can pass base64 directly
            # For consistency, we'll keep images as base64
            
            response_text = ""
            
            if provider == "ollama":
                if not llm.OLLAMA_AVAILABLE:
                    return error_response("Ollama is not available", status=503)
                
                # Ollama expects images as base64 in the generate call
                # Build parameters manually to pass base64 images
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
                    return error_response("No valid response received from model", status=500)
                
                response_text = llm.clean_response(response['response'])
            
            elif provider == "lmstudio":
                if not llm.LMSTUDIO_AVAILABLE:
                    return error_response("LM Studio is not available", status=503)
                
                # For LM Studio, we need to convert base64 to temp files
                # This is handled by helpers_image
                import base64
                import tempfile
                import os
                
                temp_files = []
                try:
                    # Convert base64 to temporary image files
                    for img_b64 in images_data:
                        # Decode base64
                        img_bytes = base64.b64decode(img_b64)
                        
                        # Create temp file
                        temp_fd, temp_path = tempfile.mkstemp(suffix='.png')
                        os.close(temp_fd)
                        
                        with open(temp_path, 'wb') as f:
                            f.write(img_bytes)
                        
                        temp_files.append(temp_path)
                    
                    # Use LM Studio's vision generation
                    import lmstudio as lms
                    seed = options.get('seed', 0)  # Note: LM Studio doesn't use seed parameter
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
                        return error_response("No valid response received from model", status=500)
                    
                    response_text = llm.clean_response(response.content)
                
                finally:
                    # Cleanup temp files
                    for temp_path in temp_files:
                        try:
                            os.unlink(temp_path)
                        except:
                            pass
            
            return success_response(data={
                "response": response_text,
                "provider": provider,
                "model": model
            })
            
        except ValueError as e:
            logging.error(f"Validation error in vision generate: {str(e)}")
            return error_response(str(e), status=400)
        except Exception as e:
            logging.error(f"Failed to generate vision response: {str(e)}")
            return error_response(f"Failed to generate vision response: {str(e)}", status=500)
    
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
            data = await request.json()
            
            # Validate required fields
            required = ["provider", "model", "prompt", "images"]
            missing = [f for f in required if f not in data]
            if missing:
                return error_response(f"Missing required fields: {', '.join(missing)}", status=400)
            
            provider = data["provider"].lower()
            model = data["model"]
            prompt = data["prompt"]
            images_data = data["images"]
            system_prompt = data.get("system_prompt", "")
            options = data.get("options", {})
            
            # Validate provider
            if provider not in ["ollama", "lmstudio"]:
                return error_response(f"Invalid provider: {provider}. Must be 'ollama' or 'lmstudio'", status=400)
            
            # Validate images
            if not images_data or not isinstance(images_data, list):
                return error_response("Images must be a non-empty array", status=400)
            
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
                        await response.write(b'data: {"error": "Ollama is not available", "done": true}\n\n')
                        return response
                    
                    # For Ollama vision streaming, we need to pass images as base64
                    # Create a custom generator that passes images correctly
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
                            
                            import json
                            sse_data = f"data: {json.dumps(chunk_data)}\n\n"
                            await response.write(sse_data.encode('utf-8'))
                            
                            if chunk.get('done', False):
                                # Send final message
                                final_data = {
                                    "chunk": "",
                                    "done": True,
                                    "full_response": llm.clean_response(full_response)
                                }
                                sse_data = f"data: {json.dumps(final_data)}\n\n"
                                await response.write(sse_data.encode('utf-8'))
                                break
                
                elif provider == "lmstudio":
                    if not llm.LMSTUDIO_AVAILABLE:
                        await response.write(b'data: {"error": "LM Studio is not available", "done": true}\n\n')
                        return response
                    
                    # Convert base64 to temp files for LM Studio
                    import base64
                    import tempfile
                    import os
                    
                    temp_files = []
                    try:
                        for img_b64 in images_data:
                            img_bytes = base64.b64decode(img_b64)
                            temp_fd, temp_path = tempfile.mkstemp(suffix='.png')
                            os.close(temp_fd)
                            with open(temp_path, 'wb') as f:
                                f.write(img_bytes)
                            temp_files.append(temp_path)
                        
                        # Use streaming function
                        import lmstudio as lms
                        seed = options.get('seed', 0)  # Note: LM Studio doesn't use seed parameter
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
                            response_text = llm.clean_response(lms_response.content)
                            
                            # Simulate streaming
                            chunk_size = 5
                            for i in range(0, len(response_text), chunk_size):
                                chunk = response_text[i:i + chunk_size]
                                chunk_data = {"chunk": chunk, "done": False}
                                
                                import json
                                sse_data = f"data: {json.dumps(chunk_data)}\n\n"
                                await response.write(sse_data.encode('utf-8'))
                            
                            # Final message
                            final_data = {"chunk": "", "done": True, "full_response": response_text}
                            sse_data = f"data: {json.dumps(final_data)}\n\n"
                            await response.write(sse_data.encode('utf-8'))
                    
                    finally:
                        # Cleanup temp files
                        for temp_path in temp_files:
                            try:
                                os.unlink(temp_path)
                            except:
                                pass
                
                await response.write_eof()
                return response
                
            except Exception as e:
                logging.error(f"Error during vision streaming: {str(e)}")
                import json
                error_data = json.dumps({"error": str(e), "done": True})
                await response.write(f"data: {error_data}\n\n".encode('utf-8'))
                await response.write_eof()
                return response
                
        except Exception as e:
            logging.error(f"Failed to initialize vision streaming: {str(e)}")
            return error_response(f"Failed to initialize vision streaming: {str(e)}", status=500)
    
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
            logging.error(f"Error loading system prompt: {str(e)}")
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
            import json
            
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
            logging.error(f"Error saving system prompt: {str(e)}")
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
            import json
            
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
            logging.error(f"Error deleting system prompt: {str(e)}")
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
            import json
            
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
            logging.error(f"Error listing system prompts: {str(e)}")
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
            import json
            
            # Load custom presets from user directory
            user_presets_file = Path(sage_users_path) / "llm_presets.json"
            custom_presets = {}
            
            if user_presets_file.exists():
                with open(user_presets_file, 'r', encoding='utf-8') as f:
                    custom_presets = json.load(f)
            
            return success_response({"presets": custom_presets})
            
        except Exception as e:
            logging.error(f"Error listing presets: {str(e)}")
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
            import json
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
            logging.error(f"Error saving preset: {str(e)}")
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
            import json
            
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
            logging.error(f"Error deleting preset: {str(e)}")
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
            from pathlib import Path
            from ..utils import sage_users_path
            import json
            
            # Built-in presets
            builtin_presets = {
                'descriptive_prompt': {
                    'name': 'Descriptive Prompt',
                    'description': 'Generate detailed image descriptions',
                    'provider': 'ollama',
                    'model': 'gemma3:12b',
                    'promptTemplate': 'description/Descriptive Prompt',
                    'systemPrompt': 'e621_prompt_generator',
                    'settings': {
                        'temperature': 0.7,
                        'seed': -1,
                        'maxTokens': 512,
                        'keepAlive': 300,
                        'includeHistory': False
                    },
                    'isBuiltin': True,
                    'category': 'description'
                },
                'e621_description': {
                    'name': 'E621 Image Description',
                    'description': 'Generate E621-style detailed image descriptions',
                    'provider': 'ollama',
                    'model': 'gemma3:12b',
                    'promptTemplate': 'description/Descriptive Prompt',
                    'systemPrompt': 'e621_prompt_generator',
                    'settings': {
                        'temperature': 0.8,
                        'seed': -1,
                        'maxTokens': 1024,
                        'keepAlive': 300,
                        'includeHistory': False
                    },
                    'isBuiltin': True,
                    'category': 'description'
                },
                'casual_chat': {
                    'name': 'Casual Chat',
                    'description': 'Friendly conversational assistant',
                    'provider': 'ollama',
                    'model': None,
                    'promptTemplate': '',
                    'systemPrompt': 'default',
                    'settings': {
                        'temperature': 0.9,
                        'seed': -1,
                        'maxTokens': 1024,
                        'keepAlive': 300,
                        'includeHistory': True,
                        'maxHistoryMessages': 10
                    },
                    'isBuiltin': True,
                    'category': 'chat'
                }
            }
            
            # Start with built-in presets
            all_presets = builtin_presets.copy()
            
            # Load custom presets and overrides from user directory
            user_presets_file = Path(sage_users_path) / "llm_presets.json"
            if user_presets_file.exists():
                with open(user_presets_file, 'r', encoding='utf-8') as f:
                    custom_presets = json.load(f)
                
                # Override built-ins or add custom presets
                for preset_id, preset_data in custom_presets.items():
                    all_presets[preset_id] = preset_data
            
            return success_response({"presets": all_presets})
            
        except Exception as e:
            logging.error(f"Error getting all presets: {str(e)}")
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
            import json
            
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
                
                response_text = llm.clean_response(response['response'])
            
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
                    
                    response_text = llm.clean_response(lms_response.content)
                
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
            logging.error(f"Validation error in preset generation: {str(e)}")
            return error_response(str(e), status=400)
        except Exception as e:
            logging.error(f"Failed to generate with preset: {str(e)}")
            import traceback
            traceback.print_exc()
            return error_response(f"Failed to generate with preset: {str(e)}", status=500)
    
    _route_list.append({
        "method": "POST",
        "path": "/sage_llm/presets/generate_with_image",
        "description": "Generate response using preset with image"
    })
    
    logging.info(f"Registered {len(_route_list)} LLM routes")
    return len(_route_list)


def get_route_list():
    """
    Get list of registered routes for documentation.
    
    Returns:
        list: Route information
    """
    return _route_list.copy()

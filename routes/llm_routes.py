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
                    
                    chat = lms.Chat()
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
                        
                        chat = lms.Chat()
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
    
    logging.info(f"Registered {len(_route_list)} LLM routes")
    return len(_route_list)


def get_route_list():
    """
    Get list of registered routes for documentation.
    
    Returns:
        list: Route information
    """
    return _route_list.copy()

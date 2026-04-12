/**
 * LLM API Client
 * Handles communication with LLM backend routes
 * Supports SSE streaming for real-time token generation
 */

const BASE_URL = '/sage_llm';

function createApiError(message, metadata = {}) {
    const error = new Error(message || 'Request failed');
    Object.assign(error, metadata);
    return error;
}

function createApiErrorFromPayload(payload, fallbackMessage, status) {
    const message = payload?.error || payload?.message || fallbackMessage || 'Request failed';
    const errorCode = payload?.error_code;
    return createApiError(message, {
        status,
        errorCode,
        error_code: errorCode,
        provider: payload?.provider,
        operation: payload?.operation,
        cause: payload?.cause
    });
}

async function createApiErrorFromResponse(response, fallbackMessage) {
    const fallback = fallbackMessage || `HTTP ${response.status}: ${response.statusText}`;

    try {
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            const payload = await response.json();
            return createApiErrorFromPayload(payload, fallback, response.status);
        }

        const text = await response.text();
        return createApiError(text || fallback, { status: response.status });
    } catch {
        return createApiError(fallback, { status: response.status });
    }
}

/**
 * Get status of Ollama and LM Studio services
 * @returns {Promise<Object>} - Service status data
 */
export async function getStatus() {
    try {
        const response = await fetch(`${BASE_URL}/status`);

        if (!response.ok) {
            throw await createApiErrorFromResponse(response, 'Failed to get status');
        }

        const data = await response.json();
        
        if (!data.success) {
            throw createApiErrorFromPayload(data, 'Failed to get status', response.status);
        }
        
        return data.data;
    } catch (error) {
        console.error('Error fetching LLM status:', error);
        throw error;
    }
}

/**
 * Get available models from all providers
 * @param {boolean} force - Force re-initialization of providers
 * @returns {Promise<Object>} Models grouped by provider
 */
export async function getModels(force = false) {
    try {
        const url = force ? `${BASE_URL}/models?force=true` : `${BASE_URL}/models`;
        const response = await fetch(url);

        if (!response.ok) {
            throw await createApiErrorFromResponse(response, 'Failed to fetch models');
        }

        const data = await response.json();
        
        if (!data.success) {
            throw createApiErrorFromPayload(data, 'Failed to fetch models', response.status);
        }
        
        return data.data;
    } catch (error) {
        console.error('Error fetching models:', error);
        throw error;
    }
}

/**
 * Get list of available vision models
 * @param {boolean} force - Force re-initialization of providers
 * @returns {Promise<Object>} - Vision models data with provider lists
 */
export async function getVisionModels(force = false) {
    try {
        const url = force ? `${BASE_URL}/vision_models?force=true` : `${BASE_URL}/vision_models`;
        const response = await fetch(url);

        if (!response.ok) {
            throw await createApiErrorFromResponse(response, 'Failed to get vision models');
        }

        const data = await response.json();
        
        if (!data.success) {
            throw createApiErrorFromPayload(data, 'Failed to get vision models', response.status);
        }
        
        return data.data;
    } catch (error) {
        console.error('Error fetching vision models:', error);
        throw error;
    }
}

/**
 * Get available prompt templates
 * @returns {Promise<Object>} - Prompt templates from llm_prompts.json
 */
export async function getPrompts() {
    try {
        const response = await fetch(`${BASE_URL}/prompts`);

        if (!response.ok) {
            throw await createApiErrorFromResponse(response, 'Failed to get prompts');
        }

        const data = await response.json();
        
        if (!data.success) {
            throw createApiErrorFromPayload(data, 'Failed to get prompts', response.status);
        }
        
        return data.data.prompts;
    } catch (error) {
        console.error('Error fetching prompts:', error);
        throw error;
    }
}

/**
 * Generate text response (non-streaming)
 * @param {Object} params - Generation parameters
 * @param {string} params.provider - 'ollama', 'lmstudio', or 'native'
 * @param {string} params.model - Model name
 * @param {string} params.prompt - Input prompt
 * @param {string} [params.system_prompt] - Optional system prompt
 * @param {Object} [params.options] - Generation options (temperature, seed, etc.)
 * @returns {Promise<Object>} - Generation response
 */
export async function generateText(params) {
    try {
        const response = await fetch(`${BASE_URL}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            throw await createApiErrorFromResponse(response, 'Generation failed');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw createApiErrorFromPayload(data, 'Generation failed', response.status);
        }
        
        return data.data;
    } catch (error) {
        console.error('Error generating text:', error);
        throw error;
    }
}

/**
 * Generate text response with SSE streaming
 * @param {Object} params - Generation parameters
 * @param {string} params.provider - 'ollama', 'lmstudio', or 'native'
 * @param {string} params.model - Model name
 * @param {string} params.prompt - Input prompt
 * @param {string} [params.system_prompt] - Optional system prompt
 * @param {Object} [params.options] - Generation options
 * @param {Function} onChunk - Callback for each chunk: (chunk, done, fullResponse) => void
 * @param {Function} [onError] - Callback for errors: (error) => void
 * @returns {Promise<Object>} - Controller object with stop() method
 */
export async function generateStream(params, onChunk, onError) {
    try {
        const response = await fetch(`${BASE_URL}/generate_stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });
        
        if (!response.ok) {
            throw await createApiErrorFromResponse(response, `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let stopped = false;
        
        // Controller object to allow stopping the stream
        const controller = {
            stop: () => {
                stopped = true;
                reader.cancel();
            }
        };
        
        // Read stream asynchronously
        (async () => {
            try {
                while (!stopped) {
                    const { done, value } = await reader.read();
                    
                    if (done) {
                        break;
                    }
                    
                    // Decode chunk and add to buffer
                    buffer += decoder.decode(value, { stream: true });
                    
                    // Process complete SSE messages
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep incomplete line in buffer
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6)); // Remove 'data: ' prefix
                                
                                // Call chunk callback
                                if (onChunk) {
                                    onChunk(
                                        data.chunk || '',
                                        data.done || false,
                                        data.full_response || null
                                    );
                                }
                                
                                // Handle errors in stream
                                if (data.error) {
                                    if (onError) {
                                        onError(createApiErrorFromPayload(data, data.error || 'Streaming failed', response.status));
                                    }
                                    break;
                                }
                                
                                // Stop on completion
                                if (data.done) {
                                    break;
                                }
                            } catch (parseError) {
                                console.error('Error parsing SSE data:', parseError, line);
                            }
                        }
                    }
                }
            } catch (error) {
                if (!stopped && onError) {
                    onError(error);
                }
            }
        })();
        
        return controller;
    } catch (error) {
        console.error('Error in generateStream:', error);
        if (onError) {
            onError(error);
        }
        throw error;
    }
}

/**
 * Generate response with vision (non-streaming)
 * @param {Object} params - Generation parameters
 * @param {string} params.provider - 'ollama', 'lmstudio', or 'native'
 * @param {string} params.model - Vision model name
 * @param {string} params.prompt - Input prompt
 * @param {string[]} params.images - Array of base64-encoded images
 * @param {string} [params.system_prompt] - Optional system prompt
 * @param {Object} [params.options] - Generation options
 * @returns {Promise<Object>} - Generation response
 */
export async function generateVision(params) {
    try {
        const response = await fetch(`${BASE_URL}/vision_generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            throw await createApiErrorFromResponse(response, 'Vision generation failed');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw createApiErrorFromPayload(data, 'Vision generation failed', response.status);
        }
        
        return data.data;
    } catch (error) {
        console.error('Error generating vision:', error);
        throw error;
    }
}

/**
 * Generate response with vision and SSE streaming
 * @param {Object} params - Generation parameters
 * @param {string} params.provider - 'ollama', 'lmstudio', or 'native'
 * @param {string} params.model - Vision model name
 * @param {string} params.prompt - Input prompt
 * @param {string[]} params.images - Array of base64-encoded images
 * @param {string} [params.system_prompt] - Optional system prompt
 * @param {Object} [params.options] - Generation options
 * @param {Function} onChunk - Callback for each chunk: (chunk, done, fullResponse) => void
 * @param {Function} [onError] - Callback for errors: (error) => void
 * @returns {Promise<Object>} - Controller object with stop() method
 */
export async function generateVisionStream(params, onChunk, onError) {
    try {
        const response = await fetch(`${BASE_URL}/vision_generate_stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });
        
        if (!response.ok) {
            throw await createApiErrorFromResponse(response, `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let stopped = false;
        
        // Controller object to allow stopping the stream
        const controller = {
            stop: () => {
                stopped = true;
                reader.cancel();
            }
        };
        
        // Read stream asynchronously
        (async () => {
            try {
                while (!stopped) {
                    const { done, value } = await reader.read();
                    
                    if (done) {
                        break;
                    }
                    
                    // Decode chunk and add to buffer
                    buffer += decoder.decode(value, { stream: true });
                    
                    // Process complete SSE messages
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep incomplete line in buffer
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6)); // Remove 'data: ' prefix
                                
                                // Call chunk callback
                                if (onChunk) {
                                    onChunk(
                                        data.chunk || '',
                                        data.done || false,
                                        data.full_response || null
                                    );
                                }
                                
                                // Handle errors in stream
                                if (data.error) {
                                    if (onError) {
                                        onError(createApiErrorFromPayload(data, data.error || 'Vision streaming failed', response.status));
                                    }
                                    break;
                                }
                                
                                // Stop on completion
                                if (data.done) {
                                    break;
                                }
                            } catch (parseError) {
                                console.error('Error parsing SSE data:', parseError, line);
                            }
                        }
                    }
                }
            } catch (error) {
                if (!stopped && onError) {
                    onError(error);
                }
            }
        })();
        
        return controller;
    } catch (error) {
        console.error('Error in generateVisionStream:', error);
        if (onError) {
            onError(error);
        }
        throw error;
    }
}

/**
 * Helper: Convert File/Blob to base64 string
 * @param {File|Blob} file - Image file
 * @returns {Promise<string>} - Base64-encoded image (without data URI prefix)
 */
export async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            // Remove data URI prefix (e.g., "data:image/png;base64,")
            const base64 = e.target.result.split(',')[1];
            resolve(base64);
        };
        
        reader.onerror = (error) => {
            reject(error);
        };
        
        reader.readAsDataURL(file);
    });
}

/**
 * Helper: Convert image URL to base64 string
 * @param {string} url - Image URL
 * @returns {Promise<string>} - Base64-encoded image
 */
export async function urlToBase64(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return await fileToBase64(blob);
    } catch (error) {
        console.error('Error converting URL to base64:', error);
        throw error;
    }
}

/**
 * Pre-load a model into memory without generating a response.
 * For Ollama this pre-warms the model; for LM Studio it loads the handle; for Native it validates the selected CLIP.
 * @param {Object} params
 * @param {string} params.provider - 'ollama', 'lmstudio', or 'native'
 * @param {string} params.model - Model name
 * @param {number} [params.keep_alive=60] - Seconds to keep model resident (default 60)
 * @returns {Promise<Object>} - { loaded: true, provider, model }
 */
export async function loadModel(params) {
    try {
        const response = await fetch(`${BASE_URL}/load_model`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });

        if (!response.ok) {
            throw await createApiErrorFromResponse(response, 'Model load failed');
        }

        const data = await response.json();

        if (!data.success) {
            throw createApiErrorFromPayload(data, 'Model load failed', response.status);
        }

        return data.data;
    } catch (error) {
        console.error('Error loading model:', error);
        throw error;
    }
}

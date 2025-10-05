# LLM Routes - Phase 1 & 2 Documentation

## Overview
Phase 1 provides core backend API endpoints for interacting with Ollama and LM Studio language models. Phase 2 adds real-time streaming and vision capabilities.

**Phase 1 Features:**
- Service status checking
- Model discovery (text and vision)
- Prompt template loading
- Basic text generation

**Phase 2 Features:**
- Server-Sent Events (SSE) streaming for real-time token generation
- Vision generation (single image + multi-image)
- Vision streaming (SSE)
- Error handling for disconnects and timeouts

## Endpoints Summary

| Endpoint | Method | Phase | Description |
|----------|--------|-------|-------------|
| `/sage_llm/status` | GET | 1 | Check service availability |
| `/sage_llm/models` | GET | 1 | List text models |
| `/sage_llm/vision_models` | GET | 1 | List vision models |
| `/sage_llm/prompts` | GET | 1 | Get prompt templates |
| `/sage_llm/generate` | POST | 1 | Generate text (non-streaming) |
| `/sage_llm/generate_stream` | POST | 2 | Generate text (SSE streaming) |
| `/sage_llm/vision_generate` | POST | 2 | Generate with vision (non-streaming) |
| `/sage_llm/vision_generate_stream` | POST | 2 | Generate with vision (SSE streaming) |

---

## Endpoints

### 1. GET /sage_llm/status
**Description:** Check availability and status of Ollama and LM Studio services.

**Response:**
```json
{
  "success": true,
  "data": {
    "ollama": {
      "available": true,
      "enabled": true,
      "url": "http://custom-url:11434" // if using custom URL
    },
    "lmstudio": {
      "available": false,
      "enabled": true
    }
  }
}
```

**Use Case:** Frontend can check which services are available before showing model selection.

---

### 2. GET /sage_llm/models
**Description:** Get list of available text-only models from both providers.

**Response:**
```json
{
  "success": true,
  "data": {
    "models": {
      "ollama": ["llama3", "mistral", "codellama"],
      "lmstudio": ["llama-2-7b-chat"]
    },
    "status": {
      "ollama_available": true,
      "lmstudio_available": true
    }
  }
}
```

**Notes:**
- Uses existing model cache from `llm_wrapper.py`
- Filters out placeholder messages like "(Ollama not available)"
- Returns empty arrays if service is disabled or unavailable

---

### 3. GET /sage_llm/vision_models
**Description:** Get list of available vision-capable models from both providers.

**Response:**
```json
{
  "success": true,
  "data": {
    "models": {
      "ollama": ["llava", "bakllava", "llava-phi3"],
      "lmstudio": ["llava-v1.6-mistral"]
    },
    "status": {
      "ollama_available": true,
      "lmstudio_available": true
    }
  }
}
```

**Notes:**
- Similar to `/sage_llm/models` but for multimodal models
- Vision generation will be implemented in Phase 2

---

### 4. GET /sage_llm/prompts
**Description:** Get available LLM prompt templates from `assets/llm_prompts.json`.

**Response:**
```json
{
  "success": true,
  "data": {
    "prompts": {
      "base": {
        "descriptive": {
          "name": "Descriptive Prompt",
          "category": "description",
          "input_type": "image",
          "prompt": "Write a detailed description for this image."
        },
        "danbooru": {
          "name": "Danbooru Tag List",
          "category": "tagging",
          "input_type": "image",
          "prompt": "Generate only comma-separated Danbooru tags..."
        }
        // ... more prompts
      },
      "extra": {
        "be_specific": {
          "name": "Be Specific",
          "category": "content_focus",
          "type": "boolean",
          "prompt": "Use precise, unambiguous language..."
        }
        // ... more extra options
      }
    }
  }
}
```

**Notes:**
- Serves the entire `llm_prompts.json` file
- Frontend can use this to populate prompt template dropdowns
- Includes both base prompts and extra instruction options

---

### 5. POST /sage_llm/generate
**Description:** Generate a text response from a language model (non-streaming in Phase 1).

**Request Body:**
```json
{
  "provider": "ollama",  // "ollama" or "lmstudio"
  "model": "llama3",
  "prompt": "Explain quantum computing in simple terms.",
  "system_prompt": "You are a helpful assistant.",  // optional
  "options": {
    "temperature": 0.7,
    "seed": 42,
    "max_tokens": 1024,
    // Ollama-specific options
    "num_predict": 256,
    "top_k": 40,
    "top_p": 0.9,
    "repeat_penalty": 1.1
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "response": "Quantum computing is a revolutionary approach to computation...",
    "provider": "ollama",
    "model": "llama3"
  }
}
```

**Response (Error - Missing Fields):**
```json
{
  "success": false,
  "error": "Missing required fields: model, prompt"
}
```

**Response (Error - Service Unavailable):**
```json
{
  "success": false,
  "error": "Ollama is not available"
}
```

**Notes:**
- Non-streaming in Phase 1 (full response returned at once)
- **Phase 2 adds SSE streaming** (see `/sage_llm/generate_stream`)
- Validates required fields and provider type
- Uses existing `llm_wrapper.py` functions
- System prompt optional (useful for context/persona)

---

### 6. POST /sage_llm/generate_stream (Phase 2)
**Description:** Generate text with Server-Sent Events (SSE) for real-time token streaming.

**Request Body:**
```json
{
  "provider": "ollama",  // "ollama" or "lmstudio"
  "model": "llama3",
  "prompt": "Write a haiku about coding in Python.",
  "system_prompt": "You are a poetic assistant.",  // optional
  "options": {
    "temperature": 0.8,
    "seed": 42,
    "max_tokens": 1024
  }
}
```

**SSE Stream Format:**
```
data: {"chunk": "Quantum", "done": false}

data: {"chunk": " computing", "done": false}

data: {"chunk": " is", "done": false}

data: {"chunk": "", "done": true, "full_response": "Quantum computing is..."}

```

**Response Structure:**
- Each line: `data: {json}\n\n`
- **chunk**: Text fragment to append
- **done**: Boolean indicating completion
- **full_response**: Complete text (only in final chunk)
- **error**: Error message (only if error occurred)

**JavaScript Example:**
```javascript
const eventSource = new EventSource('/sage_llm/generate_stream?' + new URLSearchParams({
  provider: 'ollama',
  model: 'llama3',
  prompt: 'Write a haiku about coding',
  options: JSON.stringify({ temperature: 0.8 })
}));

let fullText = '';

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.chunk) {
    fullText += data.chunk;
    document.getElementById('output').textContent = fullText;
  }
  
  if (data.done) {
    console.log('Generation complete:', fullText);
    eventSource.close();
  }
  
  if (data.error) {
    console.error('Error:', data.error);
    eventSource.close();
  }
};

eventSource.onerror = () => {
  console.error('Connection error');
  eventSource.close();
};
```

**curl Example:**
```bash
curl -N -X POST http://localhost:8188/sage_llm/generate_stream \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "ollama",
    "model": "llama3",
    "prompt": "Write a haiku about coding",
    "options": {"temperature": 0.8}
  }'
```

**Notes:**
- Uses HTTP chunked transfer encoding
- Content-Type: `text/event-stream`
- Client must support SSE (browsers, curl -N, Python SSE libraries)
- Ollama: True streaming from API
- LM Studio: Simulated streaming (5-character chunks)

---

### 7. POST /sage_llm/vision_generate (Phase 2)
**Description:** Generate text from images (non-streaming vision generation).

**Request Body:**
```json
{
  "provider": "ollama",  // "ollama" or "lmstudio"
  "model": "llava",
  "prompt": "Describe this image in detail.",
  "images": [
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ...",  // base64 PNG/JPEG
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA..."  // data URI also supported
  ],
  "system_prompt": "You are a detailed image analyst.",  // optional
  "options": {
    "temperature": 0.7,
    "seed": 42
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "response": "This image shows a red square on a white background...",
    "provider": "ollama",
    "model": "llava"
  }
}
```

**Image Format Notes:**
- **Ollama**: Accepts base64 strings directly (with or without data URI prefix)
- **LM Studio**: Requires temp file conversion (handled automatically)
- Supported formats: PNG, JPEG, GIF, WebP
- Multiple images supported (multi-modal models only)
- Images automatically cleaned up after generation

**Python Example (Encoding Image):**
```python
import base64

# Read and encode image
with open('image.png', 'rb') as f:
    img_b64 = base64.b64encode(f.read()).decode('utf-8')

# Use in request
response = requests.post('http://localhost:8188/sage_llm/vision_generate', json={
    'provider': 'ollama',
    'model': 'llava',
    'prompt': 'What is in this image?',
    'images': [img_b64]
})
```

---

### 8. POST /sage_llm/vision_generate_stream (Phase 2)
**Description:** Generate text from images with SSE streaming for real-time token generation.

**Request Body:**
```json
{
  "provider": "ollama",
  "model": "llava",
  "prompt": "Describe what you see in this image.",
  "images": [
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ..."
  ],
  "system_prompt": "You are a visual analyst.",  // optional
  "options": {
    "temperature": 0.7,
    "seed": 42
  }
}
```

**SSE Stream Format:**
```
data: {"chunk": "This", "done": false}

data: {"chunk": " image", "done": false}

data: {"chunk": " shows", "done": false}

data: {"chunk": "", "done": true, "full_response": "This image shows..."}

```

**JavaScript Example:**
```javascript
// Encode image to base64
async function encodeImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result.split(',')[1]; // Remove data URI prefix
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });
}

// Stream vision generation
async function streamVisionGeneration(imageFile, prompt) {
  const imageBase64 = await encodeImage(imageFile);
  
  const response = await fetch('/sage_llm/vision_generate_stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'ollama',
      model: 'llava',
      prompt: prompt,
      images: [imageBase64],
      options: { temperature: 0.7 }
    })
  });
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        
        if (data.chunk) {
          fullText += data.chunk;
          updateDisplay(fullText);  // Your UI update function
        }
        
        if (data.done) {
          console.log('Complete:', fullText);
          return fullText;
        }
        
        if (data.error) {
          throw new Error(data.error);
        }
      }
    }
  }
}
```

**curl Example:**
```bash
# Encode image
IMAGE_B64=$(base64 -w 0 image.png)

# Stream vision generation
curl -N -X POST http://localhost:8188/sage_llm/vision_generate_stream \
  -H "Content-Type: application/json" \
  -d "{
    \"provider\": \"ollama\",
    \"model\": \"llava\",
    \"prompt\": \"Describe this image\",
    \"images\": [\"$IMAGE_B64\"],
    \"options\": {\"temperature\": 0.7}
  }"
```

**Notes:**
- Combines vision capabilities with real-time streaming
- Base64 encoding required for all images
- Temp files auto-cleaned after generation (LM Studio)
- Multiple images supported (model-dependent)
- SSE format identical to text streaming

---

## Next Steps (Phase 2)

Phase 2 will add:
1. **Streaming responses** using Server-Sent Events (SSE)
2. **Vision generation** endpoints
3. **Stop generation** capability
4. **Progress indicators**
5. **Connection error handling**

The non-streaming endpoint will remain available for compatibility.

## Error Handling

All endpoints use consistent error format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

**SSE Error Format:**
```
data: {"chunk": "", "done": true, "error": "Error message"}

```

Common HTTP status codes:
- `200` - Success (including SSE streams)
- `400` - Bad request (invalid input, missing fields)
- `500` - Internal server error
- `503` - Service unavailable (LLM service not running)

**Common Errors:**

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Missing required fields: model, prompt" | Request missing parameters | Include all required fields |
| "Ollama is not available" | Ollama not running | Start Ollama service |
| "LM Studio is not available" | LM Studio not running | Start LM Studio |
| "Provider must be 'ollama' or 'lmstudio'" | Invalid provider | Use valid provider name |
| "No images provided" | Vision endpoint called without images | Include base64 images array |
| "Model [name] not found" | Model not installed | Install model or use different model |

---

## Testing

### Phase 1 Tests (Basic Endpoints):
```bash
# Bash version
bash test_llm_routes.sh

# Python version
python test_llm_routes.py
```

### Phase 2 Tests (Streaming & Vision):
```bash
# Bash version (uses curl with SSE)
bash test_llm_routes_phase2.sh

# Python version (uses requests with streaming)
python test_llm_routes_phase2.py
```

### Manual Testing with curl:

**Test Status:**
```bash
curl http://localhost:8188/sage_llm/status
```

**Test Models:**
```bash
curl http://localhost:8188/sage_llm/models
```

**Test Text Generation:**
```bash
curl -X POST http://localhost:8188/sage_llm/generate \
  -H "Content-Type: application/json" \
  -d '{"provider":"ollama","model":"llama3","prompt":"Hello!"}'
```

**Test Streaming (SSE):**
```bash
curl -N -X POST http://localhost:8188/sage_llm/generate_stream \
  -H "Content-Type: application/json" \
  -d '{"provider":"ollama","model":"llama3","prompt":"Write a haiku"}'
```

**Test Vision:**
```bash
# Encode image
IMAGE_B64=$(base64 -w 0 test_image.png)

# Non-streaming
curl -X POST http://localhost:8188/sage_llm/vision_generate \
  -H "Content-Type: application/json" \
  -d "{\"provider\":\"ollama\",\"model\":\"llava\",\"prompt\":\"Describe this\",\"images\":[\"$IMAGE_B64\"]}"

# Streaming
curl -N -X POST http://localhost:8188/sage_llm/vision_generate_stream \
  -H "Content-Type: application/json" \
  -d "{\"provider\":\"ollama\",\"model\":\"llava\",\"prompt\":\"Describe this\",\"images\":[\"$IMAGE_B64\"]}"
```

---

## Testing

### Using curl:
```bash
# Test status
curl http://localhost:8188/sage_llm/status

# Test models
curl http://localhost:8188/sage_llm/models

# Test generation
curl -X POST http://localhost:8188/sage_llm/generate \
  -H "Content-Type: application/json" \
  -d '{"provider":"ollama","model":"llama3","prompt":"Hello!"}'
```

### Using the test script:
```bash
# Bash version
bash test_llm_routes.sh

# Python version (better output)
python test_llm_routes.py
```

---

## Testing

### Using curl:
```bash
# Test status
curl http://localhost:8188/sage_llm/status

# Test models
curl http://localhost:8188/sage_llm/models

# Test generation
curl -X POST http://localhost:8188/sage_llm/generate \
  -H "Content-Type: application/json" \
  -d '{"provider":"ollama","model":"llama3","prompt":"Hello!"}'
```

### Using the test script:
```bash
# Bash version
bash test_llm_routes.sh

# Python version (better output)
python test_llm_routes.py
```

---

## Integration with Existing Code

### LLM Wrapper Integration
Routes use the existing `utils/llm_wrapper.py` module:

**Phase 1 Functions:**
- `ensure_llm_initialized()` - Initialize services lazily
- `get_ollama_models()` - Get Ollama text models
- `get_ollama_vision_models()` - Get Ollama vision models
- `get_lmstudio_models()` - Get LM Studio text models
- `get_lmstudio_vision_models()` - Get LM Studio vision models
- `ollama_generate()` - Generate with Ollama (non-streaming)
- `lmstudio_generate()` - Generate with LM Studio (non-streaming)

**Phase 2 Functions (Streaming):**
- `ollama_generate_stream()` - Streaming text generation (Ollama)
- `ollama_generate_vision_stream()` - Streaming vision generation (Ollama)
- `lmstudio_generate_stream()` - Simulated streaming text (LM Studio)
- `lmstudio_generate_vision_stream()` - Simulated streaming vision (LM Studio)

### Model Cache Integration
Routes leverage the existing LLM model cache:
- `utils/llm_cache.py` - Thread-safe caching (5-minute TTL)
- Reduces API calls during node initialization
- Shared between routes and Python nodes

### Settings Integration
Routes respect existing settings:
- `enable_ollama` - Enable/disable Ollama
- `enable_lmstudio` - Enable/disable LM Studio
- `ollama_use_custom_url` - Use custom Ollama URL
- `ollama_custom_url` - Custom Ollama URL
- `lmstudio_use_custom_url` - Use custom LM Studio URL
- `lmstudio_custom_url` - Custom LM Studio URL

---

## Next Steps (Phase 3+)

**Phase 3: Frontend Core**
- Build LLM tab UI in sidebar
- Model selection dropdown
- Chat interface with message history
- Streaming token display
- Send/stop buttons

**Phase 4: Settings Integration**
- Model parameter controls (temperature, seed, etc.)
- Provider selection
- Custom system prompts
- Save/load chat history

**Phase 5: Vision UI**
- Image upload area
- Gallery integration hooks
- Multi-image support
- Preview thumbnails

**Phase 8: Cross-Tab Integration**
- Gallery → LLM: Attach images to chat
- LLM → Prompts: Send generated text
- Prompts → LLM: Use prompt templates

---

## Security Considerations

- All endpoints validate input data
- Model names validated against available models
- Provider type restricted to "ollama" or "lmstudio"
- File paths sanitized (for future vision endpoints)
- Error messages don't expose sensitive information

---

## Performance Notes

**Caching:**
- Model lists are cached (5-minute TTL)
- First request may be slower (initializes services)
- Subsequent requests use cached model lists

**Generation Performance:**
- Depends on model size, prompt length, hardware
- Streaming provides perceived faster response (tokens appear immediately)
- Non-streaming waits for complete response

**Resource Management:**
- Temp files cleaned up automatically (LM Studio vision)
- SSE connections closed after completion
- Graceful error handling prevents resource leaks

**Optimization Tips:**
- Use smaller models for faster responses
- Lower `max_tokens` for shorter outputs
- Adjust `temperature` for creativity vs consistency
- Use caching for repeated model list requests

---

## Troubleshooting

### "Ollama is not available"
- Check if Ollama is running: `ollama list`
- Verify `enable_ollama` setting is true
- Check custom URL if configured

### "LM Studio is not available"
- Verify LM Studio is running
- Check if server is enabled in LM Studio settings
- Verify `enable_lmstudio` setting is true

### Empty model lists
- Ensure at least one model is installed
- Check service logs for errors
- Try refreshing cache (restart ComfyUI)

### "Missing required fields" error
- Verify request body includes: `provider`, `model`, `prompt`
- For vision endpoints, also include `images` array
- Check JSON syntax is valid
- Ensure Content-Type header is `application/json`

### SSE Stream Not Connecting
- Check browser supports EventSource API
- For curl, use `-N` flag for no buffering
- Verify Content-Type is `text/event-stream`
- Check firewall/proxy settings

### Vision Generation Errors
- Ensure model supports vision (llava, bakllava, etc.)
- Verify image is valid base64-encoded PNG/JPEG
- Check image size (very large images may fail)
- Remove data URI prefix if present (or keep it, both work)

### "Stream ended without completion"
- Check provider logs for errors
- Verify model is installed and accessible
- Check disk space (temp files for LM Studio)
- Ensure stable network connection to provider

---

## Example Usage

### JavaScript Fetch Example:
```javascript
// Get status
const status = await fetch('/sage_llm/status').then(r => r.json());
console.log('Ollama available:', status.data.ollama.available);

// Get models
const models = await fetch('/sage_llm/models').then(r => r.json());
console.log('Ollama models:', models.data.models.ollama);

// Generate text (non-streaming)
const response = await fetch('/sage_llm/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'ollama',
    model: 'llama3',
    prompt: 'Write a haiku about coding',
    options: { temperature: 0.9, seed: 42 }
  })
}).then(r => r.json());
console.log('Response:', response.data.response);

// Generate text (streaming SSE)
const eventSource = new EventSource('/sage_llm/generate_stream?' + new URLSearchParams({
  provider: 'ollama',
  model: 'llama3',
  prompt: 'Write a story',
  options: JSON.stringify({ temperature: 0.8 })
}));

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.chunk) {
    appendToOutput(data.chunk);  // Your UI update function
  }
  if (data.done) {
    console.log('Complete');
    eventSource.close();
  }
};

// Vision generation (with image upload)
async function generateWithImage(imageFile) {
  // Convert to base64
  const base64 = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result.split(',')[1]);
    reader.readAsDataURL(imageFile);
  });
  
  // Generate
  const response = await fetch('/sage_llm/vision_generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'ollama',
      model: 'llava',
      prompt: 'Describe this image',
      images: [base64]
    })
  }).then(r => r.json());
  
  console.log('Description:', response.data.response);
}
```

---

## Route Registration

Routes are automatically registered via the modular route system:
1. `routes/__init__.py` imports `llm_routes`
2. `register_routes()` called on ComfyUI startup
3. Routes added to PromptServer instance
4. Available immediately at `http://localhost:8188/sage_llm/*`

Logging confirms registration:
```
SageUtils: Registered 9 LLM routes (Phase 1: 5, Phase 2: 4)
```

**Phase 1 Routes (5):**
- GET `/sage_llm/status`
- GET `/sage_llm/models`
- GET `/sage_llm/vision_models`
- GET `/sage_llm/prompts`
- POST `/sage_llm/generate`

**Phase 2 Routes (4):**
- POST `/sage_llm/generate_stream`
- POST `/sage_llm/vision_generate`
- POST `/sage_llm/vision_generate_stream`
- *(Future: POST `/sage_llm/stop`)*

````

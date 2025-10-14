# API Documentation

Complete API reference for Sage Utils backend endpoints.

## Table of Contents

1. [Overview](#overview)
2. [LLM Endpoints](#llm-endpoints)
3. [Response Formats](#response-formats)
4. [Error Handling](#error-handling)
5. [SSE Streaming](#sse-streaming)
6. [Integration Examples](#integration-examples)

---

## Overview

### Base URL

All endpoints are relative to your ComfyUI server:

```
http://localhost:8188/api
```

For custom ports or remote servers, adjust accordingly.

### Authentication

Most endpoints don't require authentication as they're accessed through the ComfyUI UI. If you're integrating externally, ensure you have network access to the ComfyUI server.

### Content Types

**Request**:
- `Content-Type: application/json` for POST endpoints
- No content type needed for GET endpoints

**Response**:
- `Content-Type: application/json` for standard responses
- `Content-Type: text/event-stream` for SSE streaming endpoints

---

## LLM Endpoints

### GET /sage_llm/status

Check availability and configuration of LLM providers (Ollama and LM Studio).

**Request**:
```http
GET /sage_llm/status
```

**Response**:
```json
{
  "success": true,
  "ollama": {
    "available": true,
    "enabled": true,
    "url": "http://custom-host:11434"  // Only if custom URL configured
  },
  "lmstudio": {
    "available": true,
    "enabled": true,
    "url": "http://custom-host:1234"  // Only if custom URL configured
  }
}
```

**Fields**:
- `available` (boolean): Provider library is installed and service is reachable
- `enabled` (boolean): Provider is enabled in settings
- `url` (string, optional): Custom endpoint URL if configured (otherwise uses defaults)

**Default Endpoints**:
- Ollama: `http://localhost:11434`
- LM Studio: `http://localhost:1234/v1`

**Use Cases**:
- Check if LLM providers are ready before making requests
- Display provider status in UI
- Validate configuration
- Troubleshoot connection issues

---

### GET /sage_llm/models

Get available text generation models from all enabled providers.

**Request**:
```http
GET /sage_llm/models
```

**Response**:
```json
{
  "success": true,
  "models": {
    "ollama": [
      "llama3.2",
      "mistral",
      "codellama"
    ],
    "lmstudio": [
      "llama-3.2-3b-instruct",
      "mistral-7b-instruct"
    ]
  }
}
```

**Fields**:
- `models` (object): Dictionary mapping provider names to model arrays
- Provider keys: `"ollama"`, `"lmstudio"`
- Each value is an array of model name strings

**Use Cases**:
- Populate model selection dropdown
- Validate model availability before generation
- Display available models to users

---

### GET /sage_llm/vision_models

Get available vision-capable models from all enabled providers.

**Request**:
```http
GET /sage_llm/vision_models
```

**Response**:
```json
{
  "success": true,
  "models": {
    "ollama": [
      "llava",
      "bakllava"
    ],
    "lmstudio": [
      "llava-1.5-7b"
    ]
  }
}
```

**Fields**:
- Same structure as `/sage_llm/models`
- Only includes models with vision capabilities

**Use Cases**:
- Populate vision model dropdown
- Enable/disable vision features based on availability
- Guide users to install vision models

---

### GET /sage_llm/prompts

Get predefined system prompts and templates.

**Request**:
```http
GET /sage_llm/prompts
```

**Response**:
```json
{
  "success": true,
  "prompts": {
    "system": {
      "default": "You are a helpful assistant specialized in creating detailed prompts for image generation.",
      "creative": "You are a creative writer helping to craft vivid, artistic prompts.",
      "technical": "You are a technical expert focused on precise, detailed specifications."
    },
    "templates": {
      "enhance": "Enhance this prompt with better details: {prompt}",
      "expand": "Expand this basic idea into a detailed prompt: {prompt}",
      "refine": "Refine this prompt for better quality: {prompt}"
    }
  }
}
```

**Fields**:
- `system` (object): System prompt presets
- `templates` (object): User prompt templates with `{prompt}` placeholder

**Use Cases**:
- Populate system prompt presets
- Provide quick prompt enhancement templates
- Guide users on effective prompt patterns

---

### POST /sage_llm/generate

Generate text response (non-streaming).

**Request**:
```http
POST /sage_llm/generate
Content-Type: application/json

{
  "provider": "ollama",
  "model": "llama3.2",
  "prompt": "Create a detailed prompt for a fantasy castle",
  "system": "You are a helpful assistant.",
  "temperature": 0.7,
  "max_tokens": 2048,
  "top_p": 0.9,
  "presence_penalty": 0.0,
  "frequency_penalty": 0.0
}
```

**Parameters**:
- `provider` (string, required): `"ollama"` or `"lmstudio"`
- `model` (string, required): Model name from `/sage_llm/models`
- `prompt` (string, required): User prompt
- `system` (string, optional): System prompt, default: ""
- `temperature` (number, optional): 0.0-2.0, default: 0.7
- `max_tokens` (number, optional): Max response length, default: 2048
- `top_p` (number, optional): 0.0-1.0, default: 0.9
- `presence_penalty` (number, optional): -2.0 to 2.0, default: 0.0
- `frequency_penalty` (number, optional): -2.0 to 2.0, default: 0.0

**Response**:
```json
{
  "success": true,
  "response": "A majestic fantasy castle perched atop a floating island, surrounded by cascading waterfalls and mystical clouds. Gothic architecture with towering spires reaching toward the sky, intricate stone carvings, and glowing magical runes. Dramatic lighting with golden sunset rays, volumetric god rays, atmospheric perspective. High detail, epic composition, fantasy art style, masterpiece quality."
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Model 'unknown-model' not found",
  "status": 400
}
```

**Use Cases**:
- Simple request/response pattern
- When streaming not needed
- Batch processing multiple prompts
- Testing and debugging

---

### POST /sage_llm/generate_stream

Generate text response with Server-Sent Events (SSE) streaming.

**Request**:
```http
POST /sage_llm/generate_stream
Content-Type: application/json

{
  "provider": "ollama",
  "model": "llama3.2",
  "prompt": "Create a detailed prompt for a fantasy castle",
  "system": "You are a helpful assistant.",
  "temperature": 0.7,
  "max_tokens": 2048
}
```

**Parameters**: Same as `/sage_llm/generate`

**Response** (SSE Stream):
```
data: {"token": "A"}

data: {"token": " majestic"}

data: {"token": " fantasy"}

data: {"token": " castle"}

...

data: {"done": true, "full_response": "A majestic fantasy castle..."}
```

**Event Types**:
- `data: {"token": "..."}` - Individual token
- `data: {"done": true, "full_response": "..."}` - Final event

**Error in Stream**:
```
data: {"error": "Generation failed", "done": true}
```

**Use Cases**:
- Real-time UI updates
- Better user experience (shows progress)
- Long-running generations
- Interactive applications

**JavaScript Example**:
```javascript
const eventSource = new EventSource('/sage_llm/generate_stream');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.token) {
    // Append token to UI
    responseDiv.textContent += data.token;
  }
  
  if (data.done) {
    // Generation complete
    eventSource.close();
  }
  
  if (data.error) {
    // Handle error
    console.error(data.error);
    eventSource.close();
  }
};
```

---

### POST /sage_llm/vision_generate

Generate text response with image input (non-streaming).

**Request**:
```http
POST /sage_llm/vision_generate
Content-Type: application/json

{
  "provider": "ollama",
  "model": "llava",
  "prompt": "Describe this image in detail",
  "images": [
    "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  ],
  "system": "",
  "temperature": 0.7,
  "max_tokens": 2048
}
```

**Parameters**:
- All parameters from `/sage_llm/generate`, plus:
- `images` (array, required): Array of base64-encoded images
  - Format: `"data:image/[type];base64,[data]"`
  - Supported types: jpeg, png, webp, gif
  - Max size: 10MB per image
  - Max count: 10 images

**Response**:
```json
{
  "success": true,
  "response": "This image shows a serene mountain landscape at sunset. The composition features snow-capped peaks in the background, a crystal-clear alpine lake in the foreground, and dense pine forests on both sides. The lighting is dramatic with golden hour tones, creating long shadows and warm highlights on the mountain faces. The sky displays vibrant oranges and purples. This would translate to a prompt like: 'Mountain landscape, alpine lake, sunset, golden hour lighting, snow-capped peaks, pine forest, dramatic sky, photorealistic, highly detailed, 8k, nature photography'"
}
```

**Use Cases**:
- Image-to-prompt generation
- Image analysis and description
- Reference image understanding
- Style identification

---

### POST /sage_llm/vision_generate_stream

Generate vision response with SSE streaming.

**Request**:
```http
POST /sage_llm/vision_generate_stream
Content-Type: application/json

{
  "provider": "ollama",
  "model": "llava",
  "prompt": "Describe this image",
  "images": ["data:image/jpeg;base64,..."],
  "temperature": 0.7
}
```

**Parameters**: Same as `/sage_llm/vision_generate`

**Response**: Same SSE format as `/sage_llm/generate_stream`

**Use Cases**:
- Real-time vision analysis
- Interactive image exploration
- Progressive image description

---

## Response Formats

### Success Response

All successful non-streaming endpoints return:

```json
{
  "success": true,
  "data": { /* endpoint-specific data */ }
}
```

Or simplified:

```json
{
  "success": true,
  "response": "generated text",
  "models": [...],
  /* other fields */
}
```

### Error Response

All errors return:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "status": 400  // HTTP status code
}
```

**Common Status Codes**:
- `400`: Bad Request (invalid parameters)
- `404`: Not Found (model or provider not found)
- `500`: Internal Server Error (generation failed)
- `503`: Service Unavailable (provider not running)

---

## Error Handling

### Client-Side Error Handling

**Recommended Pattern**:

```javascript
async function callAPI(endpoint, data) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const json = await response.json();
    
    if (!json.success) {
      throw new Error(json.error || 'Unknown error');
    }
    
    return json;
    
  } catch (error) {
    console.error('API Error:', error);
    // Show error to user
    showNotification(error.message, 'error');
    throw error;
  }
}
```

### Common Errors

#### "Model not found"
**Cause**: Model name doesn't exist or provider not available  
**Solution**: Check `/sage_llm/models` first, validate model name

#### "Provider not available"
**Cause**: Ollama or LM Studio not running  
**Solution**: Start the service, check `/sage_llm/status`

#### "Invalid image format"
**Cause**: Image not base64-encoded or wrong format  
**Solution**: Ensure proper base64 encoding with data URI prefix

#### "Max tokens exceeded"
**Cause**: Requested too many tokens  
**Solution**: Reduce `max_tokens` or use streaming

---

## SSE Streaming

### Server-Sent Events (SSE)

SSE provides real-time streaming of AI responses.

### Connection

```javascript
const eventSource = new EventSource(endpoint);
```

**Note**: SSE uses GET by default. For POST, use fetch with streaming:

```javascript
const response = await fetch('/sage_llm/generate_stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(requestData)
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      handleToken(data);
    }
  }
}
```

### Event Data Format

**Token Event**:
```json
{"token": "word"}
```

**Completion Event**:
```json
{
  "done": true,
  "full_response": "complete response text"
}
```

**Error Event**:
```json
{
  "error": "error message",
  "done": true
}
```

### Best Practices

✅ **Always close connections**:
```javascript
eventSource.close();
```

✅ **Handle errors**:
```javascript
eventSource.onerror = (error) => {
  console.error('SSE Error:', error);
  eventSource.close();
};
```

✅ **Accumulate tokens**:
```javascript
let fullText = '';
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.token) {
    fullText += data.token;
    updateUI(fullText);
  }
};
```

---

## Integration Examples

### Basic Text Generation

```javascript
async function generatePrompt(userInput) {
  const response = await fetch('/sage_llm/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'ollama',
      model: 'llama3.2',
      prompt: `Create a detailed image prompt: ${userInput}`,
      temperature: 0.7,
      max_tokens: 1024
    })
  });
  
  const data = await response.json();
  return data.response;
}

// Usage
const prompt = await generatePrompt('cyberpunk city at night');
console.log(prompt);
```

### Streaming Generation

```javascript
async function streamGeneration(prompt, onToken, onComplete) {
  const response = await fetch('/sage_llm/generate_stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'ollama',
      model: 'llama3.2',
      prompt: prompt,
      temperature: 0.7
    })
  });
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete line in buffer
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        
        if (data.token) {
          onToken(data.token);
        }
        
        if (data.done) {
          onComplete(data.full_response);
          return;
        }
        
        if (data.error) {
          throw new Error(data.error);
        }
      }
    }
  }
}

// Usage
let fullText = '';
await streamGeneration(
  'Create a fantasy prompt',
  (token) => {
    fullText += token;
    document.getElementById('response').textContent = fullText;
  },
  (complete) => {
    console.log('Generation complete:', complete);
  }
);
```

### Vision Analysis

```javascript
async function analyzeImage(base64Image, question) {
  const response = await fetch('/sage_llm/vision_generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'ollama',
      model: 'llava',
      prompt: question,
      images: [base64Image],
      temperature: 0.7,
      max_tokens: 2048
    })
  });
  
  const data = await response.json();
  return data.response;
}

// Convert file to base64
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Usage
const fileInput = document.getElementById('imageUpload');
const base64 = await fileToBase64(fileInput.files[0]);
const description = await analyzeImage(
  base64,
  'Describe this image and suggest a prompt to recreate it'
);
```

### Model List Caching

```javascript
class LLMClient {
  constructor() {
    this.modelsCache = null;
    this.cacheTimestamp = 0;
    this.cacheDuration = 60000; // 1 minute
  }
  
  async getModels(refresh = false) {
    const now = Date.now();
    
    if (!refresh && this.modelsCache && 
        (now - this.cacheTimestamp) < this.cacheDuration) {
      return this.modelsCache;
    }
    
    const response = await fetch('/sage_llm/models');
    const data = await response.json();
    
    this.modelsCache = data.models;
    this.cacheTimestamp = now;
    
    return this.modelsCache;
  }
}

// Usage
const client = new LLMClient();
const models = await client.getModels();
```

### Complete Workflow

```javascript
// 1. Check status
const status = await fetch('/sage_llm/status').then(r => r.json());
if (!status.ollama.available) {
  alert('Ollama is not running!');
  return;
}

// 2. Get models
const models = await fetch('/sage_llm/models').then(r => r.json());
const selectedModel = models.models.ollama[0];

// 3. Generate with streaming
let fullResponse = '';
await streamGeneration(
  'Create a detailed cyberpunk scene prompt',
  (token) => {
    fullResponse += token;
    updateUI(fullResponse);
  },
  (complete) => {
    // Save to clipboard
    navigator.clipboard.writeText(complete);
    showNotification('Prompt copied to clipboard!', 'success');
  }
);
```

---

## Rate Limiting & Performance

### Client-Side Rate Limiting

Implement debouncing for frequent requests:

```javascript
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

const debouncedGenerate = debounce(async (prompt) => {
  const result = await generatePrompt(prompt);
  updateUI(result);
}, 300);

// Usage in input handler
inputField.addEventListener('input', (e) => {
  debouncedGenerate(e.target.value);
});
```

### Concurrent Requests

Limit concurrent generations:

```javascript
class RequestQueue {
  constructor(maxConcurrent = 2) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = [];
  }
  
  async add(requestFn) {
    if (this.running >= this.maxConcurrent) {
      await new Promise(resolve => this.queue.push(resolve));
    }
    
    this.running++;
    try {
      return await requestFn();
    } finally {
      this.running--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

const queue = new RequestQueue(2);
await queue.add(() => generatePrompt('prompt 1'));
await queue.add(() => generatePrompt('prompt 2'));
```

---

## Related Documentation

- [LLM Tab Guide](LLM_TAB_GUIDE.md) - User guide for LLM interface
- [Prompt Builder Guide](PROMPT_BUILDER_GUIDE.md) - Tag-based prompt construction
- [Architecture](ARCHITECTURE.md) - System design and technical details

---

**API Version**: 1.0  
**Last Updated**: Phase 10 Documentation

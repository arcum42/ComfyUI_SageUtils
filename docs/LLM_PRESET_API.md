# LLM Preset API Documentation

This document describes the backend API endpoints for programmatically using LLM presets without going through the UI.

## Endpoints

### 1. Get All Presets

Get a complete list of all available LLM presets (built-in + custom).

**Endpoint**: `GET /sage_llm/presets/all`

**Response**:
```json
{
    "success": true,
    "data": {
        "presets": {
            "descriptive_prompt": {
                "name": "Descriptive Prompt",
                "description": "Generate detailed image descriptions",
                "provider": "ollama",
                "model": "gemma3:12b",
                "category": "description",
                "isBuiltin": true,
                "promptTemplate": "description/Descriptive Prompt",
                "systemPrompt": "e621_prompt_generator",
                "settings": {
                    "temperature": 0.7,
                    "seed": -1,
                    "maxTokens": 512,
                    "keepAlive": 300,
                    "includeHistory": false
                }
            },
            "e621_description": {
                "name": "E621 Image Description",
                "description": "Generate E621-style detailed image descriptions",
                "provider": "ollama",
                "model": "gemma3:12b",
                "category": "description",
                "isBuiltin": true,
                "promptTemplate": "description/Descriptive Prompt",
                "systemPrompt": "e621_prompt_generator",
                "settings": {
                    "temperature": 0.8,
                    "seed": -1,
                    "maxTokens": 1024,
                    "keepAlive": 300,
                    "includeHistory": false
                }
            },
            "casual_chat": {
                "name": "Casual Chat",
                "description": "Friendly conversational assistant",
                "provider": "ollama",
                "model": null,
                "category": "chat",
                "isBuiltin": true,
                "promptTemplate": "",
                "systemPrompt": "default",
                "settings": {
                    "temperature": 0.9,
                    "seed": -1,
                    "maxTokens": 1024,
                    "keepAlive": 300,
                    "includeHistory": true,
                    "maxHistoryMessages": 10
                }
            }
        }
    }
}
```

**Python Example**:
```python
import requests

response = requests.get('http://127.0.0.1:8188/sage_llm/presets/all')
data = response.json()

if data['success']:
    presets = data['data']['presets']
    
    # List all preset names
    for preset_id, preset in presets.items():
        print(f"{preset_id}: {preset['name']}")
        print(f"  Model: {preset['model']}")
        print(f"  Category: {preset['category']}")
        print()
```

---

### 2. Generate with Preset and Image

Use a preset to generate a response with an image, all programmatically.

**Endpoint**: `POST /sage_llm/presets/generate_with_image`

**Request Body**:
```json
{
    "preset_id": "descriptive_prompt",
    "images": ["base64_encoded_image_data"],
    "prompt_override": "Optional: custom prompt instead of preset's template",
    "system_prompt_override": "Optional: custom system prompt",
    "settings_override": {
        "temperature": 0.9,
        "seed": 12345
    }
}
```

**Parameters**:
- `preset_id` (required): ID of the preset to use
- `images` (required): Array of base64-encoded images
- `prompt_override` (optional): Override the preset's prompt template
- `system_prompt_override` (optional): Override the preset's system prompt
- `settings_override` (optional): Override specific settings (temperature, seed, etc.)

**Response**:
```json
{
    "success": true,
    "data": {
        "response": "Generated description text...",
        "preset_used": "descriptive_prompt",
        "provider": "ollama",
        "model": "gemma3:12b"
    }
}
```

**Python Example**:
```python
import requests
import base64
from pathlib import Path

# Read and encode image
image_path = Path("path/to/image.png")
with open(image_path, 'rb') as f:
    image_data = base64.b64encode(f.read()).decode('utf-8')

# Generate description using preset
response = requests.post(
    'http://127.0.0.1:8188/sage_llm/presets/generate_with_image',
    json={
        'preset_id': 'descriptive_prompt',
        'images': [image_data]
    }
)

data = response.json()
if data['success']:
    print(f"Generated description: {data['data']['response']}")
    print(f"Used model: {data['data']['model']}")
```

**Python Example with Overrides**:
```python
import requests
import base64

# Read image
with open('image.png', 'rb') as f:
    image_b64 = base64.b64encode(f.read()).decode('utf-8')

# Use preset but override specific settings
response = requests.post(
    'http://127.0.0.1:8188/sage_llm/presets/generate_with_image',
    json={
        'preset_id': 'e621_description',
        'images': [image_b64],
        'prompt_override': 'Analyze this image and describe the main subjects.',
        'settings_override': {
            'temperature': 0.5,  # More deterministic
            'seed': 42  # Reproducible
        }
    }
)

result = response.json()
if result['success']:
    description = result['data']['response']
    print(description)
```

---

## Use Cases

### 1. Batch Image Processing
```python
import requests
import base64
from pathlib import Path

def describe_images_batch(image_paths, preset_id='descriptive_prompt'):
    """Process multiple images with a preset."""
    results = []
    
    for img_path in image_paths:
        with open(img_path, 'rb') as f:
            img_b64 = base64.b64encode(f.read()).decode('utf-8')
        
        response = requests.post(
            'http://127.0.0.1:8188/sage_llm/presets/generate_with_image',
            json={
                'preset_id': preset_id,
                'images': [img_b64]
            }
        )
        
        if response.json()['success']:
            results.append({
                'image': img_path,
                'description': response.json()['data']['response']
            })
    
    return results

# Use it
images = list(Path('images/').glob('*.png'))
descriptions = describe_images_batch(images)

for result in descriptions:
    print(f"{result['image']}: {result['description']}\n")
```

### 2. Custom Node Integration
```python
class LLMPresetDescriptionNode:
    """ComfyUI node that uses LLM presets."""
    
    @classmethod
    def INPUT_TYPES(cls):
        # Get available presets
        import requests
        response = requests.get('http://127.0.0.1:8188/sage_llm/presets/all')
        presets = []
        if response.json()['success']:
            presets = list(response.json()['data']['presets'].keys())
        
        return {
            "required": {
                "image": ("IMAGE",),
                "preset": (presets,),
            }
        }
    
    RETURN_TYPES = ("STRING",)
    FUNCTION = "generate"
    CATEGORY = "sage_utils/llm"
    
    def generate(self, image, preset):
        import requests
        import base64
        import numpy as np
        from PIL import Image
        import io
        
        # Convert ComfyUI image tensor to base64
        i = 255. * image[0].cpu().numpy()
        img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))
        
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        # Generate using preset
        response = requests.post(
            'http://127.0.0.1:8188/sage_llm/presets/generate_with_image',
            json={
                'preset_id': preset,
                'images': [img_b64]
            }
        )
        
        if response.json()['success']:
            return (response.json()['data']['response'],)
        else:
            return ("Error generating description",)
```

### 3. Workflow Automation
```python
def auto_tag_images(folder_path, output_file='tags.json'):
    """Automatically tag all images in a folder."""
    import requests
    import base64
    import json
    from pathlib import Path
    
    tags = {}
    
    for img_path in Path(folder_path).glob('*.png'):
        with open(img_path, 'rb') as f:
            img_b64 = base64.b64encode(f.read()).decode('utf-8')
        
        # Use e621_description preset for detailed tags
        response = requests.post(
            'http://127.0.0.1:8188/sage_llm/presets/generate_with_image',
            json={
                'preset_id': 'e621_description',
                'images': [img_b64]
            }
        )
        
        if response.json()['success']:
            tags[str(img_path)] = response.json()['data']['response']
    
    # Save to file
    with open(output_file, 'w') as f:
        json.dump(tags, f, indent=2)
    
    return tags

# Use it
tags = auto_tag_images('output/images')
print(f"Tagged {len(tags)} images")
```

---

## Error Handling

Both endpoints return errors in a consistent format:

```json
{
    "success": false,
    "error": "Error message here"
}
```

Common errors:
- `400`: Missing required parameters or invalid data
- `404`: Preset not found
- `500`: Server error (LLM unavailable, file error, etc.)
- `503`: LLM provider (Ollama/LM Studio) not available

**Example Error Handling**:
```python
import requests

response = requests.post(
    'http://127.0.0.1:8188/sage_llm/presets/generate_with_image',
    json={'preset_id': 'invalid_preset', 'images': ['...']},
    timeout=60
)

data = response.json()

if data['success']:
    print(data['data']['response'])
else:
    print(f"Error: {data['error']}")
    
    # Check status code
    if response.status_code == 404:
        print("Preset not found")
    elif response.status_code == 503:
        print("LLM provider unavailable")
```

---

## Notes

1. **Image Format**: Images must be base64-encoded. Any image format supported by PIL can be used.

2. **Multiple Images**: You can pass multiple images in the `images` array. This is useful for vision models that support multiple image inputs.

3. **Preset Overrides**: User-customized versions of built-in presets automatically take precedence.

4. **System Prompts**: The API handles loading system prompts from both built-in assets and user custom prompts.

5. **Prompt Templates**: If a preset specifies a `promptTemplate`, it will be loaded from the LLM prompts configuration unless overridden.

6. **Keep Alive**: The `keepAlive` setting controls how long the model stays loaded in memory (in seconds). Convert to minutes for Ollama.

7. **Async Operations**: For better performance in production, consider using async HTTP clients like `aiohttp` or `httpx`.

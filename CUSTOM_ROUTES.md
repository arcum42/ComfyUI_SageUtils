# SageUtils Custom API Routes

SageUtils adds custom HTTP routes to ComfyUI that expose the SageCache data. These routes allow you to access model metadata, file hashes, and cache statistics programmatically.

## Available Endpoints

All endpoints are available under the `/sage_cache/` prefix and can also be accessed with the `/api/sage_cache/` prefix.

### 1. Get Cache Info
**GET** `/sage_cache/info`

Returns the complete contents of SageCache.info as JSON. This contains model metadata, Civitai information, and cache details for all models.

**Example Response:**
```json
{
  "abc123hash": {
    "hash": "abc123hash",
    "civitai": "true",
    "modelId": "12345",
    "name": "Model Name",
    "baseModel": "SDXL",
    "lastUsed": "2025-06-22T10:30:00"
  }
}
```

### 2. Get Cache Hash Mapping
**GET** `/sage_cache/hash`

Returns the complete contents of SageCache.hash as JSON. This contains the mapping from file paths to their SHA256 hashes.

**Example Response:**
```json
{
  "/path/to/model1.safetensors": "abc123hash",
  "/path/to/model2.ckpt": "def456hash"
}
```

### 3. Get Cache Statistics
**GET** `/sage_cache/stats`

Returns statistics about the SageCache including file counts, Civitai status, and cache file locations.

**Example Response:**
```json
{
  "total_files": 25,
  "total_info_entries": 23,
  "cache_files": {
    "hash_path": "/path/to/sage_cache_hash.json",
    "info_path": "/path/to/sage_cache_info.json",
    "main_path": "/path/to/sage_cache.json",
    "ollama_models_path": "/path/to/sage_cache_ollama.json"
  },
  "civitai_stats": {
    "found_on_civitai": 18,
    "not_found_on_civitai": 5
  }
}
```

### 4. Get File Information by Hash
**GET** `/sage_cache/file/{file_hash}`

Returns detailed information for a specific file hash, including all file paths that use this hash.

**Example Response:**
```json
{
  "hash": "abc123hash",
  "info": {
    "hash": "abc123hash",
    "civitai": "true",
    "modelId": "12345",
    "name": "Model Name",
    "baseModel": "SDXL",
    "lastUsed": "2025-06-22T10:30:00"
  },
  "file_paths": [
    "/path/to/model1.safetensors"
  ]
}
```

### 5. Get File Information by Path
**GET** `/sage_cache/path?file_path={file_path}`

Returns detailed information for a file by its path. Looks up the hash from the file path in cache.hash, then retrieves the info from cache.info.

**Parameters:**
- `file_path` (query parameter, required): The full file path to look up

**Example Response:**
```json
{
  "file_path": "/path/to/model1.safetensors",
  "hash": "abc123hash",
  "info": {
    "hash": "abc123hash",
    "civitai": "true",
    "modelId": "12345",
    "name": "Model Name",
    "baseModel": "SDXL",
    "lastUsed": "2025-06-22T10:30:00"
  },
  "all_paths_with_same_hash": [
    "/path/to/model1.safetensors"
  ]
}
```

## Usage Examples

### Using cURL

```bash
# Get all cache info
curl http://localhost:8188/sage_cache/info

# Get hash mappings
curl http://localhost:8188/sage_cache/hash

# Get cache statistics
curl http://localhost:8188/sage_cache/stats

# Get specific file info by hash
curl http://localhost:8188/sage_cache/file/abc123hash456def

# Get specific file info by path
curl "http://localhost:8188/sage_cache/path?file_path=/path/to/model1.safetensors"
```

### Using JavaScript/Fetch

```javascript
// Get cache statistics
async function getCacheStats() {
    const response = await fetch('/api/sage_cache/stats');
    const stats = await response.json();
    console.log('Cache stats:', stats);
}

// Get info for a specific hash
async function getFileInfo(hash) {
    const response = await fetch(`/api/sage_cache/file/${hash}`);
    const info = await response.json();
    console.log('File info:', info);
}

// Get info for a specific file path
async function getFileInfoByPath(filePath) {
    const response = await fetch(`/api/sage_cache/path?file_path=${encodeURIComponent(filePath)}`);
    const info = await response.json();
    console.log('File info by path:', info);
}
```

### Using Python

```python
import requests

# Get all cache info
response = requests.get('http://localhost:8188/sage_cache/info')
cache_info = response.json()

# Get cache statistics
response = requests.get('http://localhost:8188/sage_cache/stats')
stats = response.json()
print(f"Total files: {stats['total_files']}")
print(f"Found on Civitai: {stats['civitai_stats']['found_on_civitai']}")

# Get file info by hash
file_hash = 'abc123hash'
response = requests.get(f'http://localhost:8188/sage_cache/file/{file_hash}')
file_info = response.json()
print(f"File info for hash {file_hash}: {file_info}")

# Get file info by path
file_path = '/path/to/model1.safetensors'
response = requests.get('http://localhost:8188/sage_cache/path', params={'file_path': file_path})
file_info = response.json()
print(f"File info for path {file_path}: {file_info}")
```

## Error Handling

All endpoints return appropriate HTTP status codes:
- **200**: Success
- **400**: Bad Request (e.g., missing file hash)
- **404**: Not Found (e.g., hash doesn't exist)
- **500**: Internal Server Error

Error responses include an `error` field with a descriptive message:

```json
{
  "error": "No information found for hash: invalid_hash"
}
```

The implementation includes graceful fallback if PromptServer is not available during development or ComfyUI startup issues.
```

## Implementation Details

### Route Registration

The custom routes are registered using `PromptServer.instance.routes` to add new endpoints to ComfyUI's existing web server. Routes are automatically registered when the custom node imports during ComfyUI startup.

### Cache Access

Each request calls `cache.load()` to ensure fresh data is returned, respecting any changes made to the cache files while ComfyUI is running.

### File Structure

```text
comfyui_sageutils/
├── server_routes.py          # Custom route implementations
├── CUSTOM_ROUTES.md          # This documentation
├── test_routes.py            # Testing script
├── demo_routes.py            # Demonstration script  
├── __init__.py               # Modified to import routes
└── utils/
    └── model_cache.py        # Contains SageCache class
```

### Technical Notes

- The implementation is read-only (no routes modify cache data)
- Routes respect ComfyUI's security model
- Compatible with existing ComfyUI routing infrastructure
- No additional dependencies required beyond what SageUtils already uses
- Routes only register if PromptServer is available (fails silently otherwise)
- All routes are also available with the `/api/` prefix for consistency with ComfyUI standards

### Testing and Validation

When ComfyUI is running properly, you should see the message "SageUtils custom routes loaded successfully!" in the console, indicating the routes are available.

Use the provided test script to validate functionality:

```bash
cd /path/to/comfyui_sageutils
python test_routes.py
```

The cache is automatically loaded when endpoints are accessed, and all endpoints are read-only and do not modify the cache. The endpoints respect the same security model as other ComfyUI routes.

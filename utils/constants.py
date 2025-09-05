# Common constants for SageUtils
"""
This module contains common constants used throughout the SageUtils project.
These constants help maintain consistency and avoid hardcoded values in multiple files.
"""

# Supported model file extensions (based on ComfyUI's supported_pt_extensions)
# These are the file types that ComfyUI can load as models
# Additional extensions (.gguf, .nf4) supported via custom extensions
MODEL_FILE_EXTENSIONS = {'.ckpt', '.pt', '.pt2', '.bin', '.pth', '.safetensors', '.pkl', '.sft', '.gguf', '.nf4'}

# Common model file extensions (most frequently used)
# Subset of MODEL_FILE_EXTENSIONS for the most common model formats
COMMON_MODEL_EXTENSIONS = {'.safetensors', '.ckpt'}

# Model types supported by the system
MODEL_TYPES = {
    'CHECKPOINT': 'Checkpoint',
    'LORA': 'LORA',  
    'UNET': 'UNET',
    'CLIP': 'CLIP',
    'VAE': 'VAE',
    'CONTROLNET': 'ControlNet',
    'EMBEDDING': 'Embedding',
    'HYPERNETWORK': 'Hypernetwork',
    'UPSCALE': 'Upscale',
    'STYLE': 'Style',
    'GLIGEN': 'GLIGEN',
    'PHOTOMAKER': 'Photomaker'
}

# File size constants
BYTES_PER_KB = 1024
BYTES_PER_MB = BYTES_PER_KB * 1024
BYTES_PER_GB = BYTES_PER_MB * 1024

# Cache-related constants
DEFAULT_CACHE_EXPIRY_DAYS = 7
MAX_BACKUPS_TO_KEEP = 7

# Civitai API related constants
CIVITAI_BASE_URL = "https://civitai.com/api/v1"
CIVITAI_MODEL_URL_TEMPLATE = "https://civitai.com/models/{}"
DEFAULT_REQUEST_TIMEOUT = 30  # seconds

# Image size constants for reports
DEFAULT_THUMBNAIL_WIDTH = 150
DEFAULT_THUMBNAIL_HEIGHT = 100

# Progress reporting
DEFAULT_BATCH_SIZE = 50
PROGRESS_UPDATE_INTERVAL = 10  # milliseconds

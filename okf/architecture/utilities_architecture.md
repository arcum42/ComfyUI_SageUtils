---
type: Guide
title: Python Utilities Architecture
description: Architecture of the Sage Utils Python utility modules.
resource: Unsloth_Project_Docs.md
tags: [architecture, utilities, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents the utility modules that support the Sage Utils backend.

## Core utilities

### Path and file management
- `path_manager.py` centralizes paths for project, assets, user data, backups, notes, and wildcards.
- `file_utils.py` provides atomic JSON writes and safe file I/O.

### Configuration
- `config_manager.py` loads static JSON configs such as prompts, styles, metadata templates, and tag libraries.
- Supports user override files that shadow bundled defaults.

### Settings
- `settings.py` defines a Pydantic model for all Sage Utils settings.
- `settings_crypto.py` encrypts sensitive values like API keys.

### Cache
- `model_cache.py` persists model metadata, hashes, and CivitAI info.
- Uses batch saves, backups, and a manifest.

### Model metadata
- `model_info.py` extracts model info tuples from file metadata.
- `model_metadata.py` reads safetensors/CKPT headers.
- `model_info_utils.py` normalizes structured model info.

### Graph helpers
- `helpers_graph.py` builds dynamic node subgraphs for loaders, model shifts, and LoRA wiring.

### LoRA stack helpers
- `lora_stack.py` normalizes LoRA stack formats.
- `lora_utils.py` extracts keywords and converts stacks to prompts.

### Image helpers
- `helpers_image.py` provides VAE decode and tiled decode utilities.

### CivitAI helpers
- `helpers_civitai.py` maps sampler names, constructs model dictionaries, and supports metadata integration.

### Prompt utilities
- `prompt_utils.py` handles keyword cleaning and prompt text transformations.

### Performance tools
- `performance_timer.py` measures import and startup timing.
- `performance_fix.py` preloads model list caches asynchronously.

### Logger
- `logger.py` configures structured logging and third-party log capture.

These utilities form the backbone of Sage Utils backend behavior and integration.

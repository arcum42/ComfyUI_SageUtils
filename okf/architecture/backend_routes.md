---
type: Guide
title: Backend Routes Architecture
description: Overview of Sage Utils backend route organization and endpoints.
resource: Unsloth_Project_Docs.md
tags: [architecture, backend, routes, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents the aiohttp route architecture for Sage Utils and the major backend endpoints.

## Route orchestration

- `routes/__init__.py` imports route modules and registers routes with the server.
- `_routes_initialized` prevents duplicate registration.
- `base.py` provides decorators, validation helpers, error handling, and secure path utilities.

## Route groups

### LLM routes
Prefix: `/sage_llm/`
- `POST /chat` — send chat messages and stream responses
- `POST /generate` — text/vision generation
- `GET /models` — list available models for a provider
- `GET /status` — provider health and availability
- `POST /presets` — preset management

### Settings routes
Prefix: `/sage_utils/settings`
- `GET /sage_utils/settings` — fetch settings schema and values
- `POST /sage_utils/settings` — update settings

### Cache routes
Prefix: `/sage_cache/`
- `GET /sage_cache/info` — model cache metadata
- `GET /sage_cache/hash` — model file hashes

### Scanning routes
- `GET/POST /scan_model_folders` — scan model folders
- `GET /scan_progress` — SSE progress updates
- `POST /cancel_scan` — cancel scan
- `GET /available_folders` — list model folders

### Gallery routes
- `POST /sage_utils/civitai_images` — fetch CivitAI images
- `POST /sage_utils/list_images` — list images in folders
- `POST /sage_utils/thumbnail` — generate thumbnails
- `POST /sage_utils/image_metadata` — extract image metadata
- Dataset text endpoints for text file management

### Notes, wildcard, tag, prompt storage, and utility routes
- Notes CRUD and file serving
- Wildcard prompt endpoints
- Tag library management
- Prompt storage CRUD
- Miscellaneous utilities

## Design principles

- Keep API routes local and self-contained.
- Use standardized JSON responses and structured error handling.
- Support both data retrieval and state mutation through clearly named endpoints.

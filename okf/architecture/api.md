---
type: Guide
title: API Guidance
description: API design and service contract guidance for Sage Utils.
resource: docs/deprecated/API.md
tags: [architecture, api, guide, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept captures the Sage Utils backend API surfaces and the request/response contracts used by the sidebar and local integrations.

# Overview

Sage Utils exposes local backend routes under two prefixes:

- `/sage_llm/` — LLM and prompt integration endpoints
- `/sage_utils/` — supporting utilities, system prompts, and metadata endpoints

All endpoints are served from the local ComfyUI process and do not require external cloud services unless specific providers are configured.

## Response format

Successful non-streaming responses generally return:

```json
{
  "success": true,
  "data": { ... }
}
```

Error responses return:

```json
{
  "success": false,
  "error": "Human-readable message",
  "status": 400
}
```

Streaming endpoints use Server-Sent Events (SSE) with data chunks and a final completion event.

# Provider keys

Sage Utils normalizes provider names to these internal keys:

- `lmstudio_rest`
- `ollama_rest`
- `openai`
- `native`

These keys appear in request payloads, status responses, and model listings.

# Core LLM endpoints

### GET /sage_llm/status

Check provider availability and enabled state.

Returns:

```json
{
  "success": true,
  "lmstudio_rest": {"available": true, "enabled": true, "url": "..."},
  "ollama_rest": {"available": true, "enabled": true, "url": "..."},
  "openai": {"available": true, "enabled": true, "url": "..."},
  "native": {"available": true, "enabled": true}
}
```

### GET /sage_llm/models

List available text models for enabled providers.

Returns model lists, capability maps, tool model lists, reasoning model lists, and availability status.

### GET /sage_llm/vision_models

List available vision-capable models for enabled providers.

Returns the same set of metadata as `/sage_llm/models` but for vision models.

### GET /sage_llm/prompts

Returns the loaded prompt templates from `assets/llm_prompts.json`.

### GET /sage_llm/integration_profiles

Returns tool/MCP integration profile metadata used by the LLM UI.

# Generation endpoints

### POST /sage_llm/generate

Non-streaming text generation.

Request body:

```json
{
  "provider": "lmstudio_rest|ollama_rest|openai|native",
  "model": "model_name",
  "prompt": "...",
  "system_prompt": "...",
  "options": { ... }
}
```

Returns:

```json
{
  "success": true,
  "response": "...",
  "provider": "...",
  "model": "..."
}
```

### POST /sage_llm/generate_stream

Streaming text generation using SSE.

Each SSE event contains the current chunk and completion state.

Example event payloads:

```json
{"chunk": "text", "done": false}
```

```json
{"chunk": "", "done": true, "full_response": "..."}
```

### POST /sage_llm/vision_generate

Non-streaming vision generation with image input.

Request body adds:

- `images`: array of base64 data URIs

### POST /sage_llm/vision_generate_stream

Streaming vision generation with image input.

# Presets and system prompt endpoints

### GET /sage_llm/prompts

Prompt templates and system prompt presets.

### GET /sage_llm/system_prompts/list

List built-in and custom system prompts.

### GET /sage_utils/system_prompts/{prompt_id}.md

Serve the markdown content for a system prompt.

### POST /sage_llm/system_prompts/save

Save a custom system prompt to the Sage Utils user directory.

### POST /sage_llm/system_prompts/delete

Delete a custom system prompt.

### GET /sage_llm/presets/list

List custom LLM presets.

### GET /sage_llm/presets/all

Get all presets with full metadata.

### POST /sage_llm/presets/save

Save a preset definition.

### POST /sage_llm/presets/delete

Delete a saved preset.

### POST /sage_llm/presets/generate_with_image

Generate a response from a preset using image input.

# Model readiness endpoints

### POST /sage_llm/load_model

Validate or preload a model selection without generating text.

### POST /sage_llm/generate_only

Generate text from an already-loaded model, useful when model loading and generation are separated.

# Notes

- Use `/sage_llm/status` and `/sage_llm/models` to validate provider and model availability before generation.
- The local native provider (`native`) uses ComfyUI CLIP text encoders and is only available if native CLIP models are installed.
- `openai` is an OpenAI-compatible provider and may be disabled if no endpoint is configured.

# References

See `docs/API.md` for the canonical API reference location for this project.

---
type: Guide
title: Design Patterns & Conventions
description: Key design patterns and development conventions for Sage Utils.
resource: Unsloth_Project_Docs.md
tags: [developer, conventions, patterns, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents the core design patterns and conventions used throughout Sage Utils.

## GraphBuilder pattern

Nodes that need to create sub-graphs use `GraphBuilder` rather than direct graph mutation.
This supports dynamic node creation and keeps node logic composable.

Example:
```python
graph = GraphBuilder()
unet_node = graph.node("UNETLoader", unet_name="model.safetensors", weight_dtype="default")
clip_node = graph.node("CLIPTextEncode", text="prompt", clip=...)
return io.NodeOutput(unet_out, clip_out, vae_out, expand=graph.finalize())
```

## Custom I/O types

Use `@io.comfytype()` decorators in v3 to define structured custom types.
This is preferred over string-passing because it provides:
- type safety
- clearer contracts between nodes
- better editor support
- easier debugging

## Provider abstraction

The LLM backend is layered:
1. service facade (`service.py`)
2. provider registry (`registry.py`)
3. provider clients (`providers/*/client.py`)
4. shared utilities (`rest.py`, `cache.py`, `errors.py`)

Adding a provider requires updating provider keys, registry, service descriptor, routes, settings, and frontend integration.

## Event bus / Pub-Sub

Use `js/shared/crossTabMessaging.js` for inter-tab communication rather than direct imports.
This decouples sidebar tabs and allows them to communicate through typed messages.

Message examples:
- `IMAGE_TRANSFER`
- `TEXT_TO_PROMPT_BUILDER`
- `TEXT_TO_LLM`
- `NOTIFICATION`

## Data caching strategy

Three layers of caching:
1. backend persistent cache (`utils/model_cache.py`)
2. LLM provider cache (`utils/llm/cache.py`)
3. frontend cache (`js/shared/dataCache.js`)

## Error handling pattern

- backend routes use `@route_error_handler`
- LLM backend uses `llm_raise()` / `llm_report()` / `llm_stringify()`
- frontend uses `errorHandler.js`
- SSE streams return structured error payloads for the UI

## Important notes for future modifications

- Respect the v3 API: all new nodes should use `comfy_api.latest.io` rather than legacy widget APIs.
- Use `GraphBuilder` when a node needs to create sub-graphs.
- Follow the provider abstraction pattern: service → registry → client.
- Keep thread safety in mind for LLM cache and shared resources.
- Store user-facing settings via the Pydantic settings model only.
- Centralize path management in `path_manager.py` and `file_utils.py`.
- Return standardized error responses from routes and use the logger for diagnostics.
- Use timing instrumentation for startup or runtime performance work.
- Use cross-tab messaging for sidebar components rather than direct imports.
- Check `docs/` before complex changes as many features are documented there.

## Notes

- Respect the v3 API in new node development.
- Use centralized path and file management utilities.
- Keep settings inside the Pydantic settings system.
- Prefer shared component utilities for UI code.

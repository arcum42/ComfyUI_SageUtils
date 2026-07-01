---
type: Guide
title: Communication Patterns
description: The data flow and communication patterns used across Sage Utils.
resource: Unsloth_Project_Docs.md
tags: [architecture, communication, patterns, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept describes the main communication patterns used by Sage Utils, from node execution to sidebar messaging.

## Node-to-backend

Python nodes use ComfyUI's v3 input/output wiring and may dynamically build sub-graphs with `GraphBuilder`.
Nodes remain local to the backend and expose structured outputs to the workflow graph.

## Frontend-to-backend

Sidebar and UI components communicate with backend routes using `fetch()`.
Common route prefixes include:
- `/sage_utils/`
- `/sage_cache/`
- `/sage_llm/`

LLM generation uses SSE for real-time token streaming to the frontend.

## Cross-tab messaging

The sidebar implements a pub-sub event bus in `js/shared/crossTabMessaging.js`.
Tabs publish and subscribe to message types such as:
- `image-transfer`
- `text-to-prompt-builder`
- `text-to-llm`
- `notification`

This decouples tabs and enables features like sending gallery images to the LLM tab.

## Data caching

Sage Utils uses a three-layer caching strategy:
- **Frontend `DataCache`** (`js/shared/dataCache.js`) for API responses with TTL invalidation
- **Backend `SageCache`** (`utils/model_cache.py`) for persistent model metadata and hashes
- **LLM provider cache** (`utils/llm/cache.py`) for model lists and capability metadata

## Error handling

Errors are normalized and surfaced consistently:
- Backend routes use `@route_error_handler`
- LLM backend uses structured errors via `llm_raise()` and `llm_report()`
- Frontend uses centralized `errorHandler.js`

These patterns ensure consistent behavior across UI and backend layers.

---
type: Reference
title: LM Studio REST API
description: LM Studio REST API endpoints, payloads, and example usage.
resource: docs/LLM_REST_API_LM_STUDIO.md
tags: [docs, llm, api, lm_studio, reference, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept describes the key LM Studio REST API endpoints and request patterns used by the SageUtils provider.

Most of the relevant documentation for this concept will come from the LM Studio REST API developer docs:

- https://lmstudio.ai/docs/developer/rest
- https://lmstudio.ai/docs/developer/rest/list
- https://lmstudio.ai/docs/developer/rest/chat
- https://lmstudio.ai/docs/developer/rest/load
- https://lmstudio.ai/docs/developer/rest/unload
- https://lmstudio.ai/docs/developer/rest/download
- https://lmstudio.ai/docs/developer/rest/download-status

## Base URL and Authentication

- Default base URL: `http://localhost:1234`
- Uses bearer authentication via `LMSTUDIO_API_TOKEN` or equivalent SageUtils settings.

## Endpoints

### Non-streaming endpoints
- `GET /api/v1/models` — list models and their status.
- `POST /api/v1/chat` — send a chat request to a model. This endpoint is stateful by default and returns a `response_id` for conversation continuation.
- `POST /api/v1/models/load` — load a model.
- `POST /api/v1/models/unload` — unload a model.

### Streaming endpoints
- `POST /api/v1/chat` — streaming chat responses.

### Not currently used endpoints
- `POST /api/v1/models/download` — trigger a model download.
- `GET /api/v1/models/download/status` — check model download status.

## Load options

When loading a model, LM Studio may accept options such as:

- `model` — model identifier.
- `context_length` — maximum tokens the model considers.
- `eval_batch_size` — batch size for llama.cpp backends.
- `flash_attention` — optimize attention computation.
- `num_experts` — number of experts for MoE models.
- `offload_kv_cache_to_gpu` — offload KV cache to GPU.
- `echo_load_config` — include the load config in the response.

## Compatibility

- Older v0 API docs are available at `https://lmstudio.ai/docs/developer/rest/endpoints`.

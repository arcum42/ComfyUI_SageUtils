---
type: Reference
title: Ollama REST API
description: Ollama REST API endpoints, payloads, and example usage.
resource: docs/LLM_REST_API_OLLAMA.md
tags: [docs, llm, api, ollama, reference, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept describes the key Ollama REST API endpoints and the request patterns used by the SageUtils provider.

Most of the relevant documentation for this concept will come from the Ollama API introduction:

- https://docs.ollama.com/api/introduction
- https://docs.ollama.com/api/streaming
- https://docs.ollama.com/api/errors
- https://docs.ollama.com/api/usage

## Base URL and Authentication

- Default base URL: `http://localhost:11434`
- Uses bearer authentication via `OLLAMA_API_KEY` or `OLLAMA_API_TOKEN`, or equivalent SageUtils settings.

## Endpoints

### Non-streaming endpoints
- `POST /api/chat` — chat requests.
- `POST /api/show` — show model details.
- `GET /api/tags` — list tags.
- `POST /api/generate` — generate text output.

### Streaming endpoint
- `POST /api/chat` — streaming chat responses.

### Not currently used endpoints
- `POST /api/embed` — embeddings.
  - https://docs.ollama.com/api/embed
- `GET /api/ps` — list currently running models.
  - https://docs.ollama.com/api/ps
- `POST /api/create` — create a model.
  - https://docs.ollama.com/api/create
- `POST /api/copy` — copy a model.
  - https://docs.ollama.com/api/copy
- `POST /api/pull` — pull a model.
  - https://docs.ollama.com/api/pull
- `POST /api/push` — push a model.
  - https://docs.ollama.com/api/push
- `DELETE /api/delete` — delete a model.
  - https://docs.ollama.com/api/delete
- `GET /api/version` — server version.
  - https://docs.ollama.com/api-reference/get-version

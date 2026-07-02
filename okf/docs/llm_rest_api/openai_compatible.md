---
type: Reference
title: OpenAI-Compatible REST APIs
description: OpenAI-compatible REST API reference, including request/response patterns and compatibility notes.
resource: docs/LLM_REST_API_OPENAI_COMPATIBLE.md
tags: [docs, llm, api, openai, compatible, reference, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept describes the OpenAI-compatible REST API endpoints and compatibility notes used by SageUtils.

## Source documentation

- OpenAI docs: https://developers.openai.com/api/docs
- LM Studio OpenAI-compatible docs: https://lmstudio.ai/docs/developer/openai-compat
- LM Studio OpenAI-compatible models reference: https://lmstudio.ai/docs/developer/openai-compat/models
- LM Studio OpenAI-compatible chat completions reference: https://lmstudio.ai/docs/developer/openai-compat/chat-completions
- LM Studio OpenAI-compatible responses reference: https://lmstudio.ai/docs/developer/openai-compat/responses
- LM Studio OpenAI-compatible embeddings reference: https://lmstudio.ai/docs/developer/openai-compat/embeddings
- LM Studio OpenAI-compatible completions reference: https://lmstudio.ai/docs/developer/openai-compat/completions

## Base URL and Authentication

- Default base URL: `https://api.openai.com`
- Uses bearer authentication via `OPENAI_API_KEY` or equivalent SageUtils settings.
- Custom base URL is supported through SageUtils settings when `openai_use_custom_url` is enabled.

## Endpoints

### Non-streaming endpoints
- `GET /v1/models`
- `POST /v1/chat/completions`

### Streaming endpoint
- `POST /v1/chat/completions`

### Other OpenAI-compatible endpoints (not currently used)
- `POST /v1/responses`
- `POST /v1/embeddings`
- `POST /v1/completions`

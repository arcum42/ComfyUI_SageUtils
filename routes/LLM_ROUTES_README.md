# LLM Routes Documentation

## Overview

LLM routes expose model discovery, text generation, vision generation, streaming, prompts, presets, and model load flows.

Current route implementation lives in:

- `routes/llm_routes.py`
- helper normalization/validation in `utils/llm/routes_helpers.py`

## Provider Naming

Canonical backend provider keys used in route responses and internal dispatch:

- `lmstudio_rest`
- `ollama_rest`
- `openai`
- `native`

Compatibility aliases accepted in request payloads:

- `lmstudio` is normalized to `lmstudio_rest`
- `ollama` is normalized to `ollama_rest`

Normalization is handled by `routes_helpers.normalize_provider(...)`.

## Core Endpoints

- `GET /sage_llm/status`
- `GET /sage_llm/models`
- `GET /sage_llm/vision_models`
- `GET /sage_llm/prompts`
- `GET /sage_llm/integration_profiles`
- `POST /sage_llm/generate`
- `POST /sage_llm/generate_stream`
- `POST /sage_llm/vision_generate`
- `POST /sage_llm/vision_generate_stream`
- `POST /sage_llm/load_model`
- `POST /sage_llm/generate_only`

Additional preset/system prompt endpoints are also registered in `routes/llm_routes.py`.

## Status Response Shape

`GET /sage_llm/status` returns canonical keys:

```json
{
  "success": true,
  "data": {
    "lmstudio_rest": {"available": true, "enabled": true},
    "ollama_rest": {"available": true, "enabled": true},
    "openai": {"available": false, "enabled": false},
    "native": {"available": true, "enabled": true}
  }
}
```

## Models Response Shape

`GET /sage_llm/models` and `GET /sage_llm/vision_models` return provider-model maps keyed by canonical provider names.

`status` subfields also use canonical naming, for example:

- `lmstudio_rest_available`
- `ollama_rest_available`
- `openai_available`
- `native_available`

## Generation Request Notes

For `POST /sage_llm/generate` and streaming/vision variants:

- Required fields vary by endpoint, but always include `provider`, `model`, and `prompt`.
- Vision endpoints also require `images`.
- Provider is normalized before dispatch, so legacy aliases continue to work.

## Streaming Notes

Streaming routes use SSE (`text/event-stream`) and emit chunks in this form:

```text
data: {"chunk":"...","done":false}

data: {"chunk":"","done":true,"full_response":"..."}

```

Error chunks include standardized metadata fields such as `error_code`, and when available, `provider`, `operation`, and `cause`.

## Phase 6 Direction

- Keep aliases supported only at route boundary.
- Keep all internal service/provider dispatch canonical.
- Add new providers through shared provider-key and registry/service integration paths documented in `docs/LLM_ARCHITECTURE_NOTE.md`.

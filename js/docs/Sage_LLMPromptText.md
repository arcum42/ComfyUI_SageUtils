---
type: NodeDoc
title: LLM Prompt (Text)
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# LLM Prompt (Text)

* **Node ID:** `Sage_LLMPromptText`
* **Category:** `Sage Utils/LLM`

Unified provider-switching text generation node for REST/OpenAI and Native CLIP.

## Inputs

### `prompt` — `STRING`
- **Name:** `prompt`
- **Description:** The text prompt sent to the selected LLM provider.

### `provider` — `COMFY_DYNAMICCOMBO_V3`
- **Name:** `provider`
- **Description:** Pick the backend provider and its model/runtime settings.

### `lmstudio_rest_model` — `COMBO`
- **Name:** `model`
- **Description:** Input value for lmstudio_rest_model.

### `lmstudio_rest_load_for_seconds` — `INT`
- **Name:** `load_for_seconds`
- **Description:** Compatibility field for LM Studio REST model load duration.

### `lmstudio_rest_system_prompt` — `STRING` (optional)
- **Name:** `system_prompt`
- **Description:** Optional system instruction prepended as model context.

### `ollama_rest_model` — `COMBO`
- **Name:** `model`
- **Description:** Input value for ollama_rest_model.

### `ollama_rest_keep_alive` — `STRING`
- **Name:** `keep_alive`
- **Description:** How long to keep the model loaded after generation (Ollama duration string).

### `ollama_rest_options` — `OLLAMA_OPTIONS` (optional)
- **Name:** `options`
- **Description:** Optional low-level Ollama generation parameters.

### `ollama_rest_system_prompt` — `STRING` (optional)
- **Name:** `system_prompt`
- **Description:** Optional system instruction prepended as model context.

### `openai_model` — `COMBO`
- **Name:** `model`
- **Description:** Input value for openai_model.

### `openai_system_prompt` — `STRING` (optional)
- **Name:** `system_prompt`
- **Description:** Optional system instruction prepended as model context.

### `openai_temperature` — `FLOAT`
- **Name:** `temperature`
- **Description:** Input value for openai_temperature.

### `openai_max_tokens` — `INT`
- **Name:** `max_tokens`
- **Description:** Input value for openai_max_tokens.

### `native_clip` — `CLIP`
- **Name:** `model`
- **Description:** The native CLIP model used for local LLM generation.

### `native_max_length` — `INT`
- **Name:** `max_length`
- **Description:** Maximum sequence length for native generation.

### `native_thinking` — `BOOLEAN` (optional)
- **Name:** `thinking`
- **Description:** Enable model thinking mode if supported by the loaded CLIP model.

### `native_sampling` — `COMFY_DYNAMICCOMBO_V3`
- **Name:** `sampling`
- **Description:** Choose native sampling settings for the local model.

### `seed` — `INT`
- **Name:** `seed`
- **Description:** Base seed used by all providers (provider-specific behavior may vary).


## Outputs

### `response` — `STRING`
- **Name:** `response`
- **Description:** The text response returned by the selected provider.


## Notes



Generated from the node schema.

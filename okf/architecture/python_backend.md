---
type: Guide
title: Python Backend Architecture
description: Overview of the Sage Utils Python backend, node registration, and utility subsystems.
resource: Unsloth_Project_Docs.md
tags: [architecture, backend, python, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents the Python backend architecture for Sage Utils, including startup flow, node registration, utilities, and LLM backend support.

## Startup and initialization

- `__init__.py` is the entry point that initializes logging, settings, asset configs, the LLM subsystem, routes, and node imports.
- Initialization includes persistent cache loading, environment timing, provider availability checks, and background cache preloading.
- `SAGEUTILS_PRINT_TIMING=1` enables startup timing diagnostics.

## Node registration and execution

- The project uses ComfyUI v3 node APIs via `comfy_api.latest.io`.
- Node modules under `nodes/` implement `define_schema()` and `execute(**kwargs)`.
- `GraphBuilder` is used when nodes need to build dynamic sub-graphs.
- Custom I/O types support structured graph data flows for models, samplers, and LoRA stacks.

## Utility subsystems

- `utils/path_manager.py` and `utils/file_utils.py` centralize file paths and safe I/O operations.
- `utils/config_manager.py` loads static JSON asset data and supports user override files.
- `utils/settings.py` and `utils/settings_crypto.py` provide Pydantic-backed settings and encrypted fields.
- `utils/model_cache.py` maintains persistent model metadata, hashes, and backups.
- `utils/model_info.py`, `model_metadata.py`, and `model_info_utils.py` extract and normalize model metadata.
- `utils/helpers_graph.py` builds ComfyUI graph nodes for model loading and shift operations.
- `utils/lora_stack.py` and `lora_utils.py` normalize LoRA stacks and extract prompt keywords.

## LLM backend layering

- The `utils/llm/` package implements provider abstraction, caching, routes, and shared HTTP helpers.
- The service facade orchestrates provider descriptors, registry state, and generation calls.
- Provider implementations include Ollama, LM Studio, and OpenAI-compatible clients.
- Shared utilities handle streaming, capability detection, error normalization, tensor conversion, and route-level helpers.

## Why this matters

This architecture keeps the backend modular and testable while isolating provider-specific behavior behind a shared service layer. It also centralizes file management, settings, and caching so nodes and routes can rely on consistent state.

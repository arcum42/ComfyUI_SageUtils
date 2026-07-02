---
type: Guide
title: Project Overview
description: High-level project summary, environment setup, directory structure, and asset references for Sage Utils.
resource: Unsloth_Project_Docs.md
tags: [developer, overview, project, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents the overall Sage Utils project, including its purpose, installation layout, environment setup, and the locations of key assets and examples.

## Project Summary

Sage Utils is a ComfyUI custom node pack that adds:
- 100+ custom nodes
- LLM integration with Ollama, LM Studio, and OpenAI-compatible backends
- Prompt builder and AI-assisted prompt generation
- Image gallery and metadata extraction
- Model management, scanning, and CivitAI metadata support
- File and notes management
- A rich sidebar interface and cross-tab workflows

## Environment & Setup

- ComfyUI is installed at `~/ai/programs/comfyui/`.
- Sage Utils lives at `~/ai/programs/comfyui/custom_nodes/comfyui_sageutils/`.
- Use the ComfyUI Python environment and launch via `start.sh`.
- ComfyUI is typically available at `http://127.0.0.1:8188/`.
- User data is stored under `~/ai/programs/comfyui/user/default/SageUtils/`.

## Directory Structure

The repository is organized into the following top-level directories:

- `assets/` — static JSON and markdown configuration files
- `docs/` — development and architecture documentation
- `example_workflows/` — JSON workflows demonstrating common use cases
- `js/` — frontend UI and sidebar code
- `nodes/` — Python node definitions using ComfyUI v3 API
- `utils/` — Python utilities and backend helpers
- `routes/` — aiohttp backend endpoints
- `tests/` — Python test suite

### JavaScript subdirectories

The `js/` folder is further organized into:

- `js/components/` — reusable UI components and interface elements
- `js/shared/` — shared JavaScript utilities and infrastructure
- `js/sidebar/` — sidebar tab orchestration and tab-specific modules
- `js/nodes/` — node-specific frontend UI helpers
- `js/promptBuilder/` — prompt builder workflow modules
- `js/llm/` — LLM client, provider management, and conversation state
- `js/gallery/` — gallery UI and image transfer logic
- `js/file/` — file browser and text editor components

### Documentation and reference

- `docs/` contains design notes, architecture guides, and implementation plans.
- `docs/ref_docs/` holds developer reference materials and walkthroughs.
- `okf/` contains the structured, agent-friendly knowledge bundle used as the canonical reference for project organization, architecture, and documentation.
- `js/docs/` is the local node documentation source for custom nodes and should be considered when authoring or updating Sage Utils node docs.

## Assets & Static Data

Key asset files include:
- `config.json` — legacy settings and provider URLs
- `default_tag_library.json` — tag library for Prompt Builder
- `llm_integration_profiles.json` — provider tool/MCP profiles
- `llm_prompts.json` — LLM prompt templates
- `metadata_templates.json` — metadata output templates
- `sage_styles.json` — UI styling overrides
- `system_prompt.md` — system prompt for image analysis

## Example Workflows

Example workflows are stored in `example_workflows/` and include:
- Ace 1.5 Example
- Chroma Example
- Flux Dev Example
- LLM Example
- Lumina 2 Example
- NetaYume Lumina Example
- NoobXL Example
- Pony Example / Pony Upscaling Example
- Z-Image Example

These examples are intended as starting templates for users and developers.

## Testing

The repository includes a Python test suite for backend and provider functionality. Key test modules include:
- `test_llm_service.py`
- `test_llm_registry.py`
- `test_llm_provider_keys.py`
- `test_llm_routes_helpers.py`
- `test_llm_routes_contract.py`
- `test_llm_compat.py`
- `test_llm_init.py`
- `test_llm_provider_availability.py`
- `test_ollama_capabilities.py`
- `test_ollama_tool_loop.py`
- `test_logger.py`

## Documentation

Primary documentation lives in `docs/` and includes:
- `ARCHITECTURE.md`
- `LLM_ARCHITECTURE_NOTE.md`
- `LOGGING.md`
- `docs/planning/PHASE1_LOGGING_COMPLETE.md`
- `docs/planning/PHASE2_COMPLETE.md`
- `TAB_MANAGER_GUIDE.md`
- `PROMPT_BUILDER_GUIDE.md`
- `LLM_TAB_GUIDE.md`
- UI component guides (`BUTTON_COMPONENT_GUIDE.md`, `FORM_ELEMENTS_GUIDE.md`, `LAYOUT_COMPONENT_GUIDE.md`)
- `okf/docs/civitai_api.md` — CivitAI REST API reference for model metadata and integration.

## Notes

This concept is intended as a starting point for developers new to the project and provides the high-level information they need to navigate the codebase.

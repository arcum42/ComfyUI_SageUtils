---
type: Guide
title: Architecture Overview
description: High-level architecture and system design for ComfyUI SageUtils.
resource: docs/ARCHITECTURE.md
tags: [architecture, guide, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents the architecture of Sage Utils and its integration with ComfyUI.
It describes the primary components, their responsibilities, and the boundaries between UI, node logic, and backend services.

# Scope

Sage Utils extends ComfyUI with:
- Custom nodes for metadata, model loading, and workflow utilities.
- Sidebar UI tabs for LLM chat and prompt building.
- Local LLM provider support for LM Studio and Ollama.
- Cross-tab messaging and behavior coordination.
- Model metadata caching, diagnostics, and reporting.

# Key components

- **Custom node layer**: Nodes live under `nodes/`, provide data transformation, metadata assembly, and model-loading behavior.
- **UI tab layer**: Sidebar tabs surfaced by the extension add interactive experiences for prompt generation, LLM chat, and model management.
- **Service layer**: Routes and backend helpers manage provider configuration, model metadata queries, and local persistence.
- **Cache and metadata store**: Local caches under `comfyui/user/default/SageUtils` store model info, Civitai metadata, and derived artifacts.

# Design principles

- Preserve ComfyUI compatibility by keeping custom node behavior isolated from core engine internals.
- Favor explicit metadata flows: nodes emit structured metadata objects that are consumed by metadata construction and save workflows.
- Keep UI features reusable and decoupled from any single workflow or node graph.
- Use the existing ComfyUI extension and tab-management APIs rather than duplicating core navigation behavior.

# References

See the linked architecture document for full implementation detail and the rationale behind major design decisions.

---
type: Index
title: Architecture Subbundle
description: Entrypoint for Sage Utils architecture knowledge.
tags: [okf, architecture, index]
resource: docs/ARCHITECTURE.md
timestamp: 2026-07-01T00:00:00Z
---

# Architecture Subbundle

This subbundle gathers architecture-level knowledge for ComfyUI SageUtils.

## Concepts

- [Architecture overview](architecture.md) — high-level system design, component boundaries, and integration patterns.
- [Technology stack](technology_stack.md) — frontend, backend, and provider stack details.
- [Communication patterns](communication_patterns.md) — node, frontend, backend, and cross-tab communication flows.
- [Python backend architecture](python_backend.md) — startup flow, node registration, utilities, and LLM backend layering.
- [Python node architecture](nodes_architecture.md) — ComfyUI v3 node design, custom I/O types, and GraphBuilder usage.
- [Python utilities architecture](utilities_architecture.md) — backend utility modules that support file, cache, and provider behavior.
- [Assets and static data](assets.md) — reference for bundled assets and default configuration files.
- [Backend routes architecture](backend_routes.md) — aiohttp route groups and endpoint responsibilities.
- [Backend JavaScript architecture](backend_js_architecture.md) — frontend JS structure, sidebar orchestration, and shared utilities.
- [LLM architecture note](llm_architecture.md) — provider abstraction, streaming, vision, and conversation state design.
- [API guidance](api.md) — service responsibilities, route design, and local backend contract guidance.
- [Tab manager design](tab_manager.md) — sidebar/tab lifecycle, cross-tab messaging, and UI integration patterns.
- [Logging guidance](logging.md) — logging strategy, categories, and diagnostics best practices.

---
type: Guide
title: Architecture Overview
description: High-level architecture and system design for ComfyUI SageUtils.
resource: docs/deprecated/ARCHITECTURE.md
tags: [architecture, guide, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents the Sage Utils architecture and its integration with ComfyUI.
It describes the primary components, their responsibilities, and the boundaries between UI, node logic, and backend services.

# System overview

Sage Utils extends ComfyUI with three main layers:

- **Frontend UI**: A ComfyUI sidebar extension with tabs for models, notes, gallery, prompt builder, and LLM.
- **Backend API**: Python `aiohttp` routes under the Sage Utils custom server, handling LLM requests, prompt storage, cache access, and user settings.
- **External providers**: Local or compatible LLM services (Ollama REST, LM Studio REST, OpenAI-compatible endpoints) plus native CLIP text models.

The UI uses JSON REST for control and SSE for real-time streaming. The sidebar tabs communicate internally through a cross-tab event bus.

# Technology stack

- Frontend: plain JavaScript ES6 modules, native Web APIs (`fetch`, `EventSource`, `FileReader`), CSS3
- Backend: Python 3.9+, `aiohttp`, ComfyUI v3 node API, Pydantic settings, JSON configuration
- Communication: JSON REST, SSE streaming, local user data storage, no external telemetry

# Module structure

Key repository areas:

- `js/` — frontend sidebar, prompt builder, gallery, shared utilities, LLM client
- `routes/` — backend route definitions and route helpers
- `utils/` — shared backend utilities, settings, cache, LLM provider service abstraction
- `nodes/` — ComfyUI v3 custom nodes and custom I/O types
- `assets/` — bundled prompts, tag libraries, metadata templates, and UI styles
- `docs/` — legacy documentation and implementation notes
- `okf/` — canonical structured knowledge bundle for project documentation

## Gallery and LLM integration

The frontend now includes a shared gallery/vision integration path:
- `js/shared/imageLoader.js` centralizes raw image and thumbnail fetches.
- `js/shared/imageViewer.js` provides the unified viewer for gallery and LLM preview items.
- `js/sidebar/llmTab/compose/llmVisionSection.js` receives gallery handoff payloads and preserves source metadata.
- Cross-tab messaging supports image, prompt, and metadata transfer among Gallery, Prompt Builder, and LLM.

## Frontend architecture

The frontend is built as a ComfyUI extension. The sidebar uses tabs that are created once and hidden/shown to preserve state.

The main sidebar orchestrator is `js/sidebar/cacheSidebar.js`. It imports tab modules, initializes shared state, and coordinates tab activation.

Shared utilities are stored in `js/shared/` and include:

- `crossTabMessaging.js` — pub/sub event bus for sidebar communication
- `stateManager.js` — centralized sidebar state persistence
- `dataCache.js` — frontend TTL cache
- `errorHandler.js` — user-facing error handling
- `notifications.js` — toast notifications

## Backend architecture

Backend routes are organized under `routes/` with one module per feature area. The LLM route module, `routes/llm_routes.py`, defines provider status, model listing, generation, vision, prompt, and preset endpoints.

Shared route helpers live in `routes/base.py` and provide validation decorators, standardized error responses, and secure path handling.

The backend also includes a service layer in `utils/llm/` that abstracts provider initialization, model capabilities, streaming integration, and error normalization.

# Cross-tab messaging

The sidebar uses `js/shared/crossTabMessaging.js` as the event bus. It sends typed messages between tabs without coupling them directly.

Common message flows:

- `image-transfer` — gallery images sent to the LLM tab
- `text-to-prompt-builder` — prompts moved from LLM or other tabs into the prompt builder
- `text-to-llm` — prompt builder output sent to the LLM tab
- `tab-switch-request` — request to change the active sidebar tab
- `notification` — user feedback messages

The event bus supports helper functions such as `sendImageToLLM()`, `sendTextToPromptBuilder()`, `sendTextToLLM()`, and `requestTabSwitch()`.

Rate limiting is applied to high-frequency messages to protect UI performance.

# Event handling

Sidebar components follow a standard event flow:

1. User action triggers a handler
2. Business logic runs and may call backend APIs
3. Local state is updated
4. Cross-tab messages are published if needed
5. Subscribers react and update UI

Components must unsubscribe from events during cleanup to avoid leaks.

# Performance and state

Performance helpers in `js/shared/performanceUtils.js` provide debouncing, throttling, and memoization.

State is managed in `js/shared/stateManager.js` and persisted in browser storage for sidebar settings, active tabs, and workflow state.

Backend persistence uses `comfyui/user/default/SageUtils` and JSON caches for metadata and presets.

# Error handling

Error handling is layered across the system:

- Backend routes use `routes/base.py` and `@route_error_handler`
- LLM backend uses structured payloads and provider-specific metadata
- Frontend uses `errorHandler.js` and notifications for user feedback
- SSE streams return error chunks with `done: true`

# Accessibility and testing

The architecture is designed to fit within ComfyUI’s sidebar and use standard controls where possible. Specific tab-level accessibility details are documented in the UI guide concepts.

Testing focuses on backend provider behavior, route contracts, model listing, preset management, and error handling. UI behavior is validated through exploratory testing and targeted manual review.

# References

- `okf/architecture/backend_routes.md`
- `okf/architecture/communication_patterns.md`
- `okf/architecture/llm_architecture.md`
- `okf/architecture/tab_manager.md`
- `okf/architecture/logging.md`

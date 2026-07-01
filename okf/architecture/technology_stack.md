---
type: Guide
title: Technology Stack
description: The high-level technology stack and architecture diagram for Sage Utils.
resource: Unsloth_Project_Docs.md
tags: [architecture, technology, stack, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents the core technology stack used by Sage Utils and summarizes the system architecture.

## High-level architecture

Sage Utils is built as a ComfyUI extension with three primary layers:

- **ComfyUI frontend** — workflow canvas, sidebar tabs, and gallery UI
- **Backend API** — Python aiohttp routes serving LLM, cache, gallery, and utility endpoints
- **External providers** — Ollama, LM Studio, and OpenAI-compatible endpoints

## Frontend

- Pure JavaScript (ES6 modules)
- Native Web APIs including `fetch`, `EventSource`, and `FileReader`
- CSS3 for styling
- Registered with ComfyUI via `app.registerExtension()`

## Backend

- Python 3.9+
- aiohttp for custom routes
- ComfyUI v3 API via `comfy_api.latest.io`
- Pydantic and pydantic-settings for configuration validation
- Server-Sent Events (SSE) for streaming LLM outputs

## Communication

- REST JSON for frontend-backend requests
- SSE for real-time LLM token streaming
- Custom event bus for cross-tab messaging in the sidebar
- ComfyUI node graph for node-to-backend graph execution

## Why this matters

This stack keeps Sage Utils lightweight and compatible with local, self-hosted workflows while enabling rich frontend interactions and real-time model streaming.

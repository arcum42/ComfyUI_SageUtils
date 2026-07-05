---
type: Guide
title: Frontend JavaScript Architecture
description: Architecture overview of the Sage Utils frontend JavaScript structure.
resource: Unsloth_Project_Docs.md
tags: [architecture, frontend, javascript, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents the overall frontend JavaScript architecture of Sage Utils.

## Main entry

- `js/sage.js` registers the ComfyUI extension and starts background preload.
- It registers the sidebar tab with `app.extensionManager.registerSidebarTab()`.
- It also enables debug mode via URL parameters.

## Sidebar structure

- `js/sidebar/cacheSidebar.js` orchestrates tab creation and state management.
- The sidebar includes tabs for Models, Notes, CivitAI, Gallery, Prompt Builder, and LLM.
- Tabs are hidden/shown rather than recreated to preserve state.

## Shared utilities

- `js/shared/crossTabMessaging.js` — event bus for sidebar message passing.
- `js/shared/stateManager.js` — centralized state persistence.
- `js/shared/dataCache.js` — frontend TTL cache.
- `js/shared/errorHandler.js` — normalized error handling.
- `js/shared/notifications.js` — toast messages.

## Subsystems

- `js/llm/` — LLM API client, conversation state, provider management, presets, and settings.
- `js/promptBuilder/` — prompt generation, saved prompts, and tag library.
- `js/gallery/` — gallery components and transfer events.
- `js/shared/` — shared image loading, viewer, cross-tab messaging, and browser utility helpers.
- `js/reports/` — model report generation.
- `js/nodes/` — node-specific frontend helpers.
- `js/file/` — file management components.

## Gallery and vision integration

- `js/shared/imageLoader.js` centralizes raw gallery image and thumbnail fetch behavior behind `API_ENDPOINTS`.
- `js/shared/imageViewer.js` provides the unified full-image modal used by both gallery thumbnails and LLM preview items.
- `js/gallery/galleryEvents.js` and `js/sidebar/imageGalleryTab.js` now open images through the shared viewer instead of duplicate rendering logic.
- `js/sidebar/llmTab/compose/llmVisionSection.js` receives gallery image transfer payloads, preserves source metadata, and renders preview items that can open in the shared viewer.
- `js/sidebar/llmTab/llmTabShell.js` subscribes to gallery `IMAGE_TRANSFER` events and routes incoming images into the LLM vision upload flow.
- Cross-tab messaging now supports richer handoff semantics for text, metadata, and images between Gallery, Prompt Builder, and LLM.

## Design notes

The frontend is built with plain JavaScript modules and avoids heavyweight frameworks. This keeps the extension lightweight and easier to integrate with ComfyUI.

---
type: Guide
title: UI Component Architecture
description: Architecture of reusable UI components and shared utilities in Sage Utils.
resource: Unsloth_Project_Docs.md
tags: [ui, components, architecture, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents the reusable UI components and shared sidebar utilities used across Sage Utils.

## Component categories

- Buttons and action controls (`buttons.js`, `buttons.css`)
- Form elements and inputs (`formElements.js`)
- Layout helpers (`layout.js`, `layout.css`)
- Dialog and modal management (`dialogManager.js`)
- Tabs and navigation (`tabs.js`, `navigation.js`)
- Display and info panels (`display.js`, `infoDisplay.js`)
- Progress indicators (`progressBar.js`)
- Clipboard utilities (`clipboard.js`)

## Shared utilities

- `errorHandler.js` — centralized frontend error handling.
- `notifications.js` — toast notification system.
- `imageUtils.js` / `lazyImageLoader.js` — image loading and thumbnail support.
- `stateManager.js` — sidebar state persistence and subscription.
- `dataCache.js` — frontend cache with TTL and preload support.
- API wrappers for backend communication.

## Design goals

- Provide a consistent UI foundation for all sidebar tabs.
- Reduce duplication by centralizing common controls and behaviors.
- Keep component APIs small and reusable.

## Integration

The shared component library is used by:
- LLM Tab
- Models Tab
- Gallery Tab
- Prompt Builder Tab
- Files Tab
- Reports and dialogs

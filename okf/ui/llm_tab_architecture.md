---
type: Guide
title: LLM Tab Architecture
description: Architecture and structure of the Sage Utils LLM sidebar tab.
resource: Unsloth_Project_Docs.md
tags: [ui, architecture, llm, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents the architecture of the Sage Utils LLM tab and its subcomponents.

## Key components

- `js/sidebar/llmTab/index.js` — entrypoint that exports the tab creation function.
- `llmTabShell.js` — compositional shell for the LLM tab.
- `chat/` — chat transcript rendering and conversation display.
- `compose/` — prompt composition and generation controls.
- `settings/` — provider/model options and advanced settings.
- `shared/` — utilities shared across the LLM tab.
- `styles/` — tab-specific styling.
- `experimental/` — optional experimental features.

## Responsibilities

The LLM tab handles:
- provider/model selection,
- streaming text generation,
- optional vision image transfer,
- conversation history,
- prompt presets and system prompts,
- cross-tab integration with Prompt Builder and Gallery.

## Messages and data flow

- Sends provider requests to backend `/sage_llm/` endpoints.
- Receives streaming token updates via SSE.
- Publishes events to the cross-tab messaging bus.
- Saves and restores tab state across refreshes.

## Design notes

The tab is designed to be decomposed into specialized subcomponents rather than a single monolith. Each subdirectory owns a specific aspect of the LLM UI.

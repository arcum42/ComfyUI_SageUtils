---
type: Guide
title: Prompt Builder Architecture
description: Architecture and workflow of the Sage Utils Prompt Builder.
resource: Unsloth_Project_Docs.md
tags: [ui, architecture, prompt-builder, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents the architecture of the Prompt Builder subsystem and how it integrates with the rest of Sage Utils.

## Components

- `js/promptBuilder/promptGeneration.js` — AI-assisted prompt generation logic.
- `js/promptBuilder/savedPrompts.js` — prompt template storage and retrieval.
- `js/promptBuilder/tagLibrary.js` — tag library management.
- `js/promptBuilder/promptBuilderApi.js` — backend API integration.
- `js/sidebar/promptBuilderTab.js` — UI tab that hosts the prompt builder.

## Features

- wildcard-based prompt generation using tag categories
- separate handling for positive and negative prompt content
- seed-controlled prompt variations
- saved prompt templates and collections
- integration with LLM tab for refinement

## Data flow

- prompt generation uses static tag library data from `default_tag_library.json`.
- saved prompts are persisted through the backend prompt storage routes.
- generated prompts can be sent to the LLM tab or copied into workflow nodes.

## Notes

The prompt builder is designed as a standalone subsystem that can interact with the LLM tab and be extended with new prompt templates or tag categories.

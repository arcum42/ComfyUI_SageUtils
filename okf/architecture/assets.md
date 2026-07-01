---
type: Guide
title: Assets and Static Data
description: Reference for Sage Utils static assets and configuration files.
resource: Unsloth_Project_Docs.md
tags: [architecture, assets, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents the static assets and configuration data used by Sage Utils.

## Key asset files

- `assets/config.json` — legacy settings and provider URL overrides.
- `assets/default_tag_library.json` — prompt builder tag library.
- `assets/llm_integration_profiles.json` — provider tool and MCP profiles.
- `assets/llm_prompts.json` — LLM prompt templates and extra instruction definitions.
- `assets/metadata_templates.json` — metadata output template formats.
- `assets/sage_styles.json` — UI styling overrides.
- `assets/system_prompt.md` — system prompt used for image analysis.

## Purpose

These assets provide the default static configuration for Sage Utils and are loaded by the backend on startup. User overrides may be stored in the user directory, while the bundled assets serve as the source of truth for defaults.

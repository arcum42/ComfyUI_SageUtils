---
type: Guide
title: Available AI Tools
description: Documentation for AI-run tools available in Sage Utils and what each tool does.
tags: [okf, tools, guide]
timestamp: 2026-07-01T00:00:00Z
---

# Available AI Tools

This page documents tools that an AI can call for generally useful tasks inside Sage Utils.

## Current tool set

### `sync_ref_docs`
- **Purpose:** Sync selected upstream ComfyUI docs into the local `docs/ref_docs/upstream_docs/` mirror.
- **Invoked by:** `docs/ref_docs/sync_upstream_docs.sh` / `docs/ref_docs/sync_upstream_docs.py`
- **Actions:** clones `https://github.com/Comfy-Org/docs.git`, performs a sparse checkout of selected folders, copies them locally, and writes sync metadata.

### `civitai_api_reference`
- **Purpose:** Provide reference information for the CivitAI REST API endpoints used by Sage Utils.
- **Content location:** `okf/docs/civitai_api.md`
- **Actions:** Offers endpoint details, query parameters, and response field descriptions for model, image, and creator data.

## Using tools

- The tools documented here are available as part of the Sage Utils knowledge bundle.
- Reference these tools from the OKF index or developer docs when you need standard behavior or API reference information.
- When adding a new tool, update this page and the relevant OKF index entry.

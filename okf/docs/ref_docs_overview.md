---
type: Guide
title: Local Reference Docs Overview
description: How Sage Utils maintains a local mirror of ComfyUI reference documentation and the upstream sync workflow.
tags: [okf, docs, reference, sync]
resource: docs/ref_docs/overview.md
timestamp: 2026-07-01T00:00:00Z
---

# Local Reference Docs Overview

This concept describes how Sage Utils keeps a local mirror of selected ComfyUI documentation and where that reference material lives.

## Purpose

`docs/ref_docs/` is the local reference docs collection for Sage Utils developers. It includes:

- `docs/ref_docs/upstream_docs/` — a mirror of selected official ComfyUI docs from `https://github.com/Comfy-Org/docs.git`
- `docs/ref_docs/backend/` — local backend development guidance and walkthroughs
- `docs/ref_docs/frontend/` — local frontend JavaScript development reference
- `docs/ref_docs/extra/` — additional resources such as workflow templates and tips

The local mirror is intended as a stable, offline-friendly reference for Sage Utils development.

> Note: Custom node docs are authored under `js/docs/` in the Sage Utils extension and are a primary source for node help content in the UI. See [Node Documentation and Local JS Docs](../nodes/node_documentation.md) for the supported pattern.

## Sync workflow

The current sync workflow is:

1. Run `./docs/ref_docs/sync_upstream_docs.sh`
2. That wrapper invokes `docs/ref_docs/sync_upstream_docs.py`
3. The script clones `https://github.com/Comfy-Org/docs.git` at the configured ref (default `main`)
4. It performs a sparse checkout of these upstream folders:
   - `custom-nodes`
   - `development`
   - `interface`
   - `installation`
5. The selected content is copied into `docs/ref_docs/upstream_docs/`

The mirror keeps `.mdx` source files intact but renames them to `.md` locally.

## Sync metadata

Each sync run writes `docs/ref_docs/upstream_docs/SYNC_INFO.txt` with:

- source repository URL
- source ref
- source commit
- sync timestamp
- included paths

## Maintenance guidance

- Keep `docs/ref_docs/sync_upstream_docs.py` aligned with upstream path changes.
- Add or remove upstream folders only after verifying the target repo layout and intended developer use cases.
- Use this OKF concept as the canonical overview location; the original `docs/ref_docs/overview.md` has been retired.
- Update `.github/instructions/sage.instructions.md` if the local docs entry points change.

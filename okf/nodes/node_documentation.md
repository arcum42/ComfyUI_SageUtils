---
type: Guide
title: Node Documentation and Local JS Docs
description: How ComfyUI custom node documentation is authored in the local `js/docs` folder and loaded into the UI.
tags: [okf, nodes, docs, custom nodes]
timestamp: 2026-07-01T00:00:00Z
---

# Node Documentation and Local JS Docs

ComfyUI custom nodes can include rich Markdown documentation that is shown in the node documentation panel instead of the generic node description.

## How documentation is authored

Create a `docs` folder under your extension’s `WEB_DIRECTORY`:

- `WEB_DIRECTORY/docs/NodeName.md` — default node documentation
- `WEB_DIRECTORY/docs/NodeName/en.md` — English localized documentation
- `WEB_DIRECTORY/docs/NodeName/zh.md` — Chinese localized documentation
- Add additional locale files as needed, such as `fr.md` or `de.md`

The documentation loader automatically selects the active locale and falls back to `NodeName.md` when a localized version is not available.

## What it replaces

When rich node docs are present, the UI displays the Markdown content in the node documentation panel instead of the generic tooltip-based description.

If a node already defines tooltips for its inputs, that information remains available in the node panel as supplemental quick-help.

## Supported markdown features

The supported documentation format includes:

- Standard Markdown syntax: headings, lists, code blocks, tables, etc.
- Images using Markdown syntax: `![alt text](image.png)`
- HTML media elements for video playback, including:
  - `<video>` and `<source>`
  - allowed attributes: `controls`, `autoplay`, `loop`, `muted`, `preload`, `poster`

## Example structure

```text
my-custom-node/
├── __init__.py
├── web/              # WEB_DIRECTORY
│   ├── js/
│   │   └── my-node.js
│   └── docs/
│       ├── MyNode.md           # Fallback documentation
│       └── MyNode/
│           ├── en.md           # English version
│           └── zh.md           # Chinese version
```

## Why this matters for Sage Utils nodes

This is the supported ComfyUI pattern for custom node documentation, so Sage Utils node development should take `js/docs` into account when adding or updating node help content.

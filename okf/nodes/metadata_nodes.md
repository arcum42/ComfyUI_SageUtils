---
type: Guide
title: Metadata Nodes
description: Documentation for metadata-focused Sage Utils nodes.
resource: README.md
tags: [nodes, metadata, guide, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept covers Sage Utils metadata-oriented nodes, which are used to assemble, enrich, and persist prompt and image metadata.

## Key metadata nodes

- `Construct Metadata` — builds a full metadata string from model info, sampler info, and additional workflow fields.
- `Construct Metadata Lite` — produces a smaller metadata payload for lighter output.
- `Save Image w/ Added Metadata` — saves the generated image while embedding `param_metadata` and `extra_metadata` in A1111-compatible format.
- `Load Image w/ Size & Metadata` — reads saved images and extracts embedded metadata plus pixel dimensions.

## Workflow role

Metadata nodes are typically placed at the end of a workflow where:
1. model and LoRA info has been combined,
2. sampler parameters are available,
3. and the final image output is ready to be written.

This ensures metadata accurately reflects the generation context.

## Recommended usage

- Prefer `Construct Metadata` for full auditability and provenance.
- Use `Construct Metadata Lite` when you need faster metadata assembly with fewer fields.
- Connect model metadata outputs from loader nodes and sampler outputs from `Sampler Info` into metadata construction.
- Write metadata through `Save Image w/ Added Metadata` for compatibility with A1111-style tooling.

## Diagnostic patterns

- Use `Load Image w/ Size & Metadata` to verify saved metadata after image export.
- Use cache and loader nodes in tandem to ensure model metadata and Civitai fields are recorded.

## Links

- [ComfyUI Sage Utils README](../README.md)

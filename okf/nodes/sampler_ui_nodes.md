---
type: Guide
title: Sampler and UI Nodes
description: Documentation for sampler-related and UI-friendly Sage Utils nodes.
resource: README.md
tags: [nodes, ui, sampler, guide, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents nodes that expose sampler and workflow UX features while simplifying ComfyUI graph wiring.

## Key sampler/UI nodes

- `Sampler Info` — outputs sampler settings that can be consumed by metadata and logging nodes.
- `KSampler w/ Sampler Info` — a combined sampler node that emits both image output and sampler metadata.
- `KSampler + Tiled Decoder` — adds tiled VAE decode support to the sampler node for large images.
- `KSampler + Audio Decoder` — provides an audio-compatible decoder path for sampler outputs.
- `Empty Latent Passthrough` — passes a latent through while preserving width/height information.
- `Switch` — selects between two inputs based on a boolean condition.

## Workflow patterns

- Use `Sampler Info` when you want sampler settings available independently of the sampler node itself.
- Use `KSampler w/ Sampler Info` to reduce wiring and generate both image output and metadata in one node.
- Use `KSampler + Tiled Decoder` when working with large images or memory-constrained decoding.
- Use `Empty Latent Passthrough` to preserve image size metadata across conditional branches.

## Design notes

These nodes are intended to keep UI-friendly workflows readable and maintainable by separating state-reporting concerns from pure image generation.

## Links

- [ComfyUI Sage Utils README](../README.md)

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

## Visual Resolution Picker

`Visual Resolution Picker` (`Sage_VisualResolutionPicker`, under
`Sage Utils/image/res`) outputs integer width and height values. Set
`longest_side`, then click or drag on the grid to change the rectangle's
width and height. The grid's lower-left corner is fixed; its upper-right
handle selects the shape. The displayed grid width and height controls can
also be edited directly and are saved with the workflow. The **Swap width and
height** button exchanges the two grid values and updates the rectangle.

The rectangle specifies an aspect ratio rather than an absolute pixel size.
Before scaling, the longer side is exactly `longest_side` (8 to ComfyUI's
maximum resolution). The other side is rounded to the nearest multiple of 8,
with a minimum of 8 and a maximum of `longest_side`. The `multiplier` defaults
to 1 and scales both sides after this calculation; each result is rounded to
the nearest pixel, with halves rounded up. For example, a 100-by-50 rectangle
with a longest side of 1024 and multiplier of 1.5 outputs 1536 by 768. The
multiplier accepts values from 0.1 to 10. Scaled values need not be multiples
of 8 and can exceed ComfyUI's maximum resolution, so downstream nodes may
reject them. When `longest_side` or `multiplier` is linked, the actual
dimensions depend on the upstream value and the grid does not display a
potentially misleading preview.

## Workflow patterns

- Use `Sampler Info` when you want sampler settings available independently of the sampler node itself.
- Use `KSampler w/ Sampler Info` to reduce wiring and generate both image output and metadata in one node.
- Use `KSampler + Tiled Decoder` when working with large images or memory-constrained decoding.
- Use `Empty Latent Passthrough` to preserve image size metadata across conditional branches.

## Design notes

These nodes are intended to keep UI-friendly workflows readable and maintainable by separating state-reporting concerns from pure image generation.

## Links

- [ComfyUI Sage Utils README](../README.md)

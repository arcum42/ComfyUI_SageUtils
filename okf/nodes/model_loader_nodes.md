---
type: Guide
title: Model Loader Nodes
description: Documentation for model and LoRA loading nodes in Sage Utils.
resource: README.md
tags: [nodes, models, loader, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept describes Sage Utils nodes dedicated to model and LoRA loading, along with the metadata they publish.

## Key model loader nodes

- `Load Checkpoint w/ Metadata` — loads a checkpoint and emits `model_info`, including hash values and any cached Civitai metadata.
- `Load Diffusion Model w/ Metadata` — loads a UNET model while preserving metadata and model provenance.
- `Simple LoRA Stack` / `Triple LoRA Stack` — build LoRA stacks with individual enable switches and per-LoRA weights.
- `LoRA Stack Loader` — loads all configured LoRAs in a stack.
- `Model + LoRA Stack Loader` — loads a checkpoint model and a LoRA stack together in one step.
- `Last LoRA Info` — returns Civitai URLs, sample images, and summary info for the last LoRA in a stack.
- `LoRA Stack → Keywords` — extracts keyword tags from LoRAs in a stack for use in prompts or metadata.

## Workflow patterns

- Build LoRA stacks separately from model loading for better reuse across multiple model choices.
- Use the loader nodes that emit metadata when you need to keep audit trails for generated outputs.
- If you need both model and LoRA information in metadata, connect the loader outputs into `Construct Metadata`.

## Metadata integration

Loader nodes are a key source of provenance data. Their outputs should flow into metadata assembly so saved images and workflows can record:
- model checkpoint path and hash,
- LoRA names, IDs, and weights,
- Civitai metadata for retracing asset sources.

## Links

- [ComfyUI Sage Utils README](../README.md)

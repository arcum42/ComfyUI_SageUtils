---
type: Guide
title: Node Families
description: Overview of major Sage Utils node families and their roles.
resource: README.md
tags: [nodes, guide, categories, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept describes the major Sage Utils node families and how they map to common workflow tasks.

## Node families

- **Metadata nodes** — Assemble and serialize workflow metadata for image saves and diagnostics.
  - Example nodes: `Construct Metadata`, `Construct Metadata Lite`, `Save Image w/ Added Metadata`, `Load Image w/ Size & Metadata`.
- **Model loader nodes** — Load models, checkpoints, LoRAs, and LoRA stacks while preserving metadata and Civitai provenance.
  - Example nodes: `Load Checkpoint w/ Metadata`, `Load Diffusion Model w/ Metadata`, `LoRA Stack Loader`, `Model + LoRA Stack Loader`.
- **Sampler/UI nodes** — Expose sampler settings, tiled decoding and audio decoder variants, and workflow-friendly wrapper nodes.
  - Example nodes: `Sampler Info`, `KSampler w/ Sampler Info`, `KSampler + Tiled Decoder`, `KSampler + Audio Decoder`, `Empty Latent Passthrough`.
- **Utility nodes** — Support conditional logic, hashing, model cache analysis, and other developer-facing workflow helpers.
  - Example nodes: `Switch`, `Get Sha256 Hash`, `Cache Maintenance`, `Model Scan & Report`, `LoRA Stack → Keywords`, `Last LoRA Info`.

## Purpose

Grouping nodes by family makes it easier to:
- choose the right node for a task,
- understand where capability overlaps occur,
- keep workflow graphs composable,
- and evolve Sage Utils features with limited cross-family coupling.

## How to use this guide

Use this document as a quick entry point when you need to:
- add metadata tracking to a workflow,
- build or load LoRA stacks,
- connect sampler state into metadata,
- or inspect model and cache health.

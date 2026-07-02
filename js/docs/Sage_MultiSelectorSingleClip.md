---
type: NodeDoc
title: Multi Selector Single CLIP
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# Multi Selector Single CLIP

* **Node ID:** `Sage_MultiSelectorSingleClip`
* **Category:** `Sage Utils/selector`

Selects checkpoint, UNET, VAE, and single CLIP models from lists.

## Inputs

### `unet_name` — `COMBO`
- **Name:** `unet_name`
- **Description:** Choose a UNET model to include in the loaded model bundle.

### `weight_dtype` — `COMBO`
- **Name:** `weight_dtype`
- **Description:** Choose the UNET weight dtype.

### `clip_name` — `COMBO`
- **Name:** `clip_name`
- **Description:** Choose a single CLIP model to include.

### `clip_type` — `COMBO`
- **Name:** `clip_type`
- **Description:** Choose the loader type for the single CLIP model.

### `vae_name` — `COMBO`
- **Name:** `vae_name`
- **Description:** Choose a VAE model to include in the loaded model bundle.


## Outputs

### `model_info` — `MODEL_INFO`
- **Name:** `model_info`
- **Description:** Combined model info bundle including UNET, CLIP, and VAE.


## Notes



Generated from the node schema.

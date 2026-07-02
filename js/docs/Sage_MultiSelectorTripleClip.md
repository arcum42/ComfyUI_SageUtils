---
type: NodeDoc
title: Multi Selector Triple CLIP
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# Multi Selector Triple CLIP

* **Node ID:** `Sage_MultiSelectorTripleClip`
* **Category:** `Sage Utils/selector`

Selects checkpoint, UNET, VAE, and three CLIP models from lists.

## Inputs

### `unet_name` — `COMBO`
- **Name:** `unet_name`
- **Description:** Choose a UNET model to include in the loaded model bundle.

### `weight_dtype` — `COMBO`
- **Name:** `weight_dtype`
- **Description:** Choose the UNET weight dtype.

### `clip_name_1` — `COMBO`
- **Name:** `clip_name_1`
- **Description:** Choose the first CLIP model for the loaded bundle.

### `clip_name_2` — `COMBO`
- **Name:** `clip_name_2`
- **Description:** Choose the second CLIP model for the loaded bundle.

### `clip_name_3` — `COMBO`
- **Name:** `clip_name_3`
- **Description:** Choose the third CLIP model for the loaded bundle.

### `vae_name` — `COMBO`
- **Name:** `vae_name`
- **Description:** Choose a VAE model to include in the loaded model bundle.


## Outputs

### `model_info` — `MODEL_INFO`
- **Name:** `model_info`
- **Description:** Combined model info bundle including UNET, CLIP, and VAE.


## Notes



Generated from the node schema.

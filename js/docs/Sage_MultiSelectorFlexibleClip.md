---
type: NodeDoc
title: Multi Selector Flexible CLIP
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# Multi Selector Flexible CLIP

* **Node ID:** `Sage_MultiSelectorFlexibleClip`
* **Category:** `Sage Utils/selector`

Selects checkpoint, UNET, VAE, and a flexible number of CLIP models from lists.

## Inputs

### `unet_name` — `COMBO`
- **Name:** `unet_name`
- **Description:** Choose a UNET model to include in the combined model bundle.

### `weight_dtype` — `COMBO`
- **Name:** `weight_dtype`
- **Description:** Choose the dtype used to load the UNET model.

### `num_of_clips` — `COMFY_DYNAMICCOMBO_V3`
- **Name:** `num_of_clips`
- **Description:** Choose how many CLIP models to include in the combined model bundle.

### `clip_name_1` — `COMBO`
- **Name:** `clip_name_1`
- **Description:** Select a CLIP model to include in the combined clip set.

### `clip_type` — `COMBO`
- **Name:** `clip_type`
- **Description:** Choose the loader type to use for a single CLIP model.

### `clip_name_1` — `COMBO`
- **Name:** `clip_name_1`
- **Description:** Select a CLIP model to include in the combined clip set.

### `clip_name_2` — `COMBO`
- **Name:** `clip_name_2`
- **Description:** Select a CLIP model to include in the combined clip set.

### `clip_type` — `COMBO`
- **Name:** `clip_type`
- **Description:** Choose the loader type to use for a dual CLIP model pair.

### `clip_name_1` — `COMBO`
- **Name:** `clip_name_1`
- **Description:** Select a CLIP model to include in the combined clip set.

### `clip_name_2` — `COMBO`
- **Name:** `clip_name_2`
- **Description:** Select a CLIP model to include in the combined clip set.

### `clip_name_3` — `COMBO`
- **Name:** `clip_name_3`
- **Description:** Select a CLIP model to include in the combined clip set.

### `clip_name_1` — `COMBO`
- **Name:** `clip_name_1`
- **Description:** Select a CLIP model to include in the combined clip set.

### `clip_name_2` — `COMBO`
- **Name:** `clip_name_2`
- **Description:** Select a CLIP model to include in the combined clip set.

### `clip_name_3` — `COMBO`
- **Name:** `clip_name_3`
- **Description:** Select a CLIP model to include in the combined clip set.

### `clip_name_4` — `COMBO`
- **Name:** `clip_name_4`
- **Description:** Select a CLIP model to include in the combined clip set.

### `vae_name` — `COMBO`
- **Name:** `vae_name`
- **Description:** Choose a VAE model to include in the combined model bundle.


## Outputs

### `model_info` — `MODEL_INFO`
- **Name:** `model_info`
- **Description:** Combined model info bundle including UNET, CLIP, and VAE.


## Notes



Generated from the node schema.

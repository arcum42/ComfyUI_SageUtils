---
type: NodeDoc
title: Dual CLIP Text Encode Qwen
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# Dual CLIP Text Encode Qwen

* **Node ID:** `Sage_DualCLIPTextEncodeQwen`
* **Category:** `Sage Utils/clip/encode/image`

Turns a positive and negative prompt into conditionings, and passes through the prompts. Saves space over two Qwen Image Edit Text Encoders, and zeros any input not hooked up.

## Inputs

### `clip` — `CLIP`
- **Name:** `clip`
- **Description:** The CLIP model used for encoding the text.

### `clean` — `BOOLEAN`
- **Name:** `clean`
- **Description:** Clean up the text, getting rid of extra spaces, commas, etc.

### `vae` — `VAE` (optional)
- **Name:** `vae`
- **Description:** The VAE model used for encoding the reference image.

### `pos` — `STRING` (optional)
- **Name:** `pos`
- **Description:** The positive prompt's text.

### `neg` — `STRING` (optional)
- **Name:** `neg`
- **Description:** The negative prompt's text.

### `pos_image` — `IMAGE` (optional)
- **Name:** `pos_image`
- **Description:** The positive prompt's image.

### `neg_image` — `IMAGE` (optional)
- **Name:** `neg_image`
- **Description:** The negative prompt's image.


## Outputs

### `positive` — `CONDITIONING`
- **Name:** `positive`
- **Description:** A conditioning containing the embedded text used to guide the diffusion model.

### `negative` — `CONDITIONING`
- **Name:** `negative`
- **Description:** A conditioning containing the embedded text used to guide the diffusion model.

### `pos_text` — `STRING`
- **Name:** `pos_text`
- **Description:** The positive prompt's text.

### `neg_text` — `STRING`
- **Name:** `neg_text`
- **Description:** The negative prompt's text.


## Notes



Generated from the node schema.

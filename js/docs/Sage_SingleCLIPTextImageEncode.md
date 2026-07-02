---
type: NodeDoc
title: Single CLIP Text Image Encode
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# Single CLIP Text Image Encode

* **Node ID:** `Sage_SingleCLIPTextImageEncode`
* **Category:** `Sage Utils/clip/encode/image`

Turns a prompt into conditioning, and passes through the prompt. Zeros any input not hooked up.

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

### `text` — `STRING` (optional)
- **Name:** `text`
- **Description:** The prompt's text.

### `image` — `IMAGE` (optional)
- **Name:** `image`
- **Description:** The prompt's image.


## Outputs

### `conditioning` — `CONDITIONING`
- **Name:** `conditioning`
- **Description:** A conditioning containing the embedded text used to guide the diffusion model.

### `text` — `STRING`
- **Name:** `text`
- **Description:** The positive prompt's text.


## Notes



Generated from the node schema.

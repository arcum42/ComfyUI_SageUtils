---
type: NodeDoc
title: Dual CLIP Text Encode Lumina 2
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# Dual CLIP Text Encode Lumina 2

* **Node ID:** `Sage_DualCLIPTextEncodeLumina2`
* **Category:** `Sage Utils/clip/encode/text`

Turns a positive and negative prompt into conditionings, and passes through the prompts. Saves space over two CLIP Text Encoders, and zeros any input not hooked up.

## Inputs

### `clip` — `CLIP`
- **Name:** `clip`
- **Description:** The CLIP model used for encoding the text.

### `system_prompt` — `COMBO`
- **Name:** `system_prompt`
- **Description:** Lumina2 provide two types of system prompts: Superior: You are an assistant designed to generate superior images with the superior degree of image-text alignment based on textual prompts or user prompts. Alignment: You are an assistant designed to generate high-quality images with the highest degree of image-text alignment based on textual prompts.

### `clean` — `BOOLEAN`
- **Name:** `clean`
- **Description:** Clean up the text, getting rid of extra spaces, commas, etc.

### `pos` — `STRING` (optional)
- **Name:** `pos`
- **Description:** The positive prompt's text.

### `neg` — `STRING` (optional)
- **Name:** `neg`
- **Description:** The negative prompt's text.


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

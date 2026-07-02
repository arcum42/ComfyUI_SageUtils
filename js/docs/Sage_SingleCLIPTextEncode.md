---
type: NodeDoc
title: Single CLIP Text Encode
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# Single CLIP Text Encode

* **Node ID:** `Sage_SingleCLIPTextEncode`
* **Category:** `Sage Utils/clip/encode/text`

Turns text into conditioning, and passes through the prompt. Zeros any input not hooked up.

## Inputs

### `clip` — `CLIP`
- **Name:** `clip`
- **Description:** The CLIP model used for encoding the text.

### `text` — `STRING`
- **Name:** `text`
- **Description:** The positive prompt's text.


## Outputs

### `conditioning` — `CONDITIONING`
- **Name:** `conditioning`
- **Description:** A conditioning containing the embedded text used to guide the diffusion model.

### `text_output` — `STRING`
- **Name:** `text`
- **Description:** The positive prompt's text.


## Notes



Generated from the node schema.

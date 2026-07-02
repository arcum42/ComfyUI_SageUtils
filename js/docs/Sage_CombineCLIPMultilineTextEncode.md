---
type: NodeDoc
title: Combine CLIP Multiline Text Encode
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# Combine CLIP Multiline Text Encode

* **Node ID:** `Sage_CombineCLIPMultilineTextEncode`
* **Category:** `Sage Utils/clip/helpers`

Encodes each non-empty line of multiline text with CLIP and combines them into one conditioning.

## Inputs

### `clip` — `CLIP`
- **Name:** `clip`
- **Description:** The CLIP model used for encoding the text.

### `mode` — `COMBO`
- **Name:** `mode`
- **Description:** How to merge line conditionings.

### `operation` — `COMFY_DYNAMICCOMBO_V3`
- **Name:** `operation`
- **Description:** Choose whether to scale the per-line conditioning output.

### `value` — `FLOAT`
- **Name:** `value`
- **Description:** Multiply by this value.

### `value` — `FLOAT`
- **Name:** `value`
- **Description:** Divide by this value.

### `text` — `STRING`
- **Name:** `text`
- **Description:** Multiline text where each line is encoded separately.


## Outputs

### `conditioning` — `CONDITIONING`
- **Name:** `conditioning`
- **Description:** A conditioning containing all encoded lines combined.


## Notes



Generated from the node schema.

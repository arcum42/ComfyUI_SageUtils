---
type: NodeDoc
title: Lora Stack
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# Lora Stack

* **Node ID:** `Sage_LoraStack`
* **Category:** `Sage Utils/lora`

Choose a lora with weights, and add it to a lora_stack. Compatible with other node packs that have lora_stacks.

## Inputs

### `enabled` — `BOOLEAN`
- **Name:** `enabled`
- **Description:** Enable or disable this LoRA stack entry.

### `lora_name` — `COMBO`
- **Name:** `lora_name`
- **Description:** Choose a LoRA model to add.

### `model_weight` — `FLOAT`
- **Name:** `model_weight`
- **Description:** Weight for the LoRA model branch.

### `clip_weight` — `FLOAT`
- **Name:** `clip_weight`
- **Description:** Weight for the LoRA clip branch.

### `lora_stack` — `LORA_STACK` (optional)
- **Name:** `lora_stack`
- **Description:** Existing LoRA stack to append to.


## Outputs

### `out_lora_stack` — `LORA_STACK`
- **Name:** `lora_stack`
- **Description:** Combined LoRA stack output.


## Notes



Generated from the node schema.

---
type: NodeDoc
title: Lora Stack (x3)
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# Lora Stack (x3)

* **Node ID:** `Sage_TripleLoraStack`
* **Category:** `Sage Utils/lora`

Choose three loras with weights, and add them to a lora_stack.

## Inputs

### `enabled_1` — `BOOLEAN`
- **Name:** `enabled_1`
- **Description:** Enable or disable this LoRA entry in the stack.

### `lora_1_name` — `COMBO`
- **Name:** `lora_1_name`
- **Description:** Select a LoRA model to include in this stack entry.

### `model_1_weight` — `FLOAT`
- **Name:** `model_1_weight`
- **Description:** Weight for the LoRA model branch.

### `clip_1_weight` — `FLOAT`
- **Name:** `clip_1_weight`
- **Description:** Weight for the LoRA clip branch.

### `enabled_2` — `BOOLEAN`
- **Name:** `enabled_2`
- **Description:** Enable or disable this LoRA entry in the stack.

### `lora_2_name` — `COMBO`
- **Name:** `lora_2_name`
- **Description:** Select a LoRA model to include in this stack entry.

### `model_2_weight` — `FLOAT`
- **Name:** `model_2_weight`
- **Description:** Weight for the LoRA model branch.

### `clip_2_weight` — `FLOAT`
- **Name:** `clip_2_weight`
- **Description:** Weight for the LoRA clip branch.

### `enabled_3` — `BOOLEAN`
- **Name:** `enabled_3`
- **Description:** Enable or disable this LoRA entry in the stack.

### `lora_3_name` — `COMBO`
- **Name:** `lora_3_name`
- **Description:** Select a LoRA model to include in this stack entry.

### `model_3_weight` — `FLOAT`
- **Name:** `model_3_weight`
- **Description:** Weight for the LoRA model branch.

### `clip_3_weight` — `FLOAT`
- **Name:** `clip_3_weight`
- **Description:** Weight for the LoRA clip branch.

### `lora_stack` — `LORA_STACK` (optional)
- **Name:** `lora_stack`
- **Description:** An existing LoRA stack to append this entry to.


## Outputs

### `out_lora_stack` — `LORA_STACK`
- **Name:** `lora_stack`
- **Description:** Combined LoRA stack containing the selected entries.


## Notes



Generated from the node schema.

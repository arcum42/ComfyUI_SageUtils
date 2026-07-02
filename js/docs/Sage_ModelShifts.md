---
type: NodeDoc
title: Model Shifts
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# Model Shifts

* **Node ID:** `Sage_ModelShifts`
* **Category:** `Sage Utils/model`

Get the model shifts and free_u2 settings to apply to the model. This is used by the model loader node.

## Inputs

### `settings` — `COMFY_DYNAMICCOMBO_V3`

### `shift_type` — `COMBO`
- **Name:** `shift_type`
- **Description:** The type of shift to apply to the model. x1 for Auraflow and Lumina2, x1000 for other models.

### `shift` — `FLOAT`
- **Name:** `shift`
- **Description:** How much shift to apply to the model when shift-only mode is selected.

### `freeu_v2` — `BOOLEAN`
- **Name:** `freeu_v2`
- **Description:** Enable FreeU v2 adjustments.

### `b1` — `FLOAT`
- **Name:** `b1`
- **Description:** FreeU v2 b1 parameter.

### `b2` — `FLOAT`
- **Name:** `b2`
- **Description:** FreeU v2 b2 parameter.

### `s1` — `FLOAT`
- **Name:** `s1`
- **Description:** FreeU v2 s1 parameter.

### `s2` — `FLOAT`
- **Name:** `s2`
- **Description:** FreeU v2 s2 parameter.

### `shift_type` — `COMBO`
- **Name:** `shift_type`
- **Description:** The type of shift to apply to the model. x1 for Auraflow and Lumina2, x1000 for other models.

### `shift` — `FLOAT`
- **Name:** `shift`
- **Description:** How much shift to apply to the model.

### `freeu_v2` — `BOOLEAN`
- **Name:** `freeu_v2`
- **Description:** Enable FreeU v2 adjustments.

### `b1` — `FLOAT`
- **Name:** `b1`
- **Description:** FreeU v2 b1 parameter.

### `b2` — `FLOAT`
- **Name:** `b2`
- **Description:** FreeU v2 b2 parameter.

### `s1` — `FLOAT`
- **Name:** `s1`
- **Description:** FreeU v2 s1 parameter.

### `s2` — `FLOAT`
- **Name:** `s2`
- **Description:** FreeU v2 s2 parameter.


## Outputs

### `model_shifts` — `MODEL_SHIFTS`
- **Name:** `model_shifts`
- **Description:** Settings to apply to the model loader, including shift and FreeU v2 values.


## Notes



Generated from the node schema.

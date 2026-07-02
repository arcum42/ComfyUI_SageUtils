---
type: NodeDoc
title: Check LoRAs For Updates
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# Check LoRAs For Updates

* **Node ID:** `Sage_CheckLorasForUpdates`
* **Category:** `Sage Utils/lora`

Check if LoRAs in the stack have updates available on Civitai.

## Inputs

### `lora_stack` — `LORA_STACK`
- **Name:** `lora_stack`

### `force` — `BOOLEAN`
- **Name:** `force`
- **Description:** Force a check even if marked up to date.


## Outputs

### `out_lora_stack` — `LORA_STACK`
- **Name:** `lora_stack`
- **Description:** The original LoRA stack after update checking.

### `path` — `STRING`
- **Name:** `path`
- **Description:** Stringified paths for any LoRAs with updates.

### `latest_url` — `STRING`
- **Name:** `latest_url`
- **Description:** Latest Civitai URLs for LoRAs with updates.


## Notes



Generated from the node schema.

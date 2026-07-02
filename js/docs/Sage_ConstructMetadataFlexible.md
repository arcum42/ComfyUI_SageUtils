---
type: NodeDoc
title: Construct Metadata Flexible
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# Construct Metadata Flexible

* **Node ID:** `Sage_ConstructMetadataFlexible`
* **Category:** `Sage Utils/metadata`

Flexible metadata constructor supporting multiple styles: A1111 Full (with LoRA hashes), A1111 Lite (simplified, only includes models on Civitai), Simple (No models or LoRAs) as well as any others defined in metadata_templates.

## Inputs

### `model_info` — `MODEL_INFO`
- **Name:** `model_info`
- **Description:** Model info used to build metadata, such as checkpoint and model details.

### `positive_string` — `STRING`
- **Name:** `positive_string`
- **Description:** The positive prompt text to include in metadata.

### `negative_string` — `STRING`
- **Name:** `negative_string`
- **Description:** The negative prompt text to include in metadata.

### `sampler_info` — `SAMPLER_INFO`
- **Name:** `sampler_info`
- **Description:** Sampler settings used to generate the image.

### `width` — `INT`
- **Name:** `width`
- **Description:** Image width used in metadata.

### `height` — `INT`
- **Name:** `height`
- **Description:** Image height used in metadata.

### `metadata_style` — `COMBO`
- **Name:** `metadata_style`
- **Description:** The metadata style format to produce.

### `lora_stack` — `LORA_STACK` (optional)
- **Name:** `lora_stack`
- **Description:** Optional LoRA stack information to include in metadata.


## Outputs

### `param_metadata` — `STRING`
- **Name:** `param_metadata`
- **Description:** The generated metadata string.


## Notes



Generated from the node schema.

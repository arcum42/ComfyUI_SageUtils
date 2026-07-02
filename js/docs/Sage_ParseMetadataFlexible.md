---
type: NodeDoc
title: Parse Metadata Flexible
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# Parse Metadata Flexible

* **Node ID:** `Sage_ParseMetadataFlexible`
* **Category:** `Sage Utils/metadata`

Parses A1111 Full format metadata string and extracts individual components. Returns parsed values for positive prompt, negative prompt, sampler info (sampler, scheduler, cfg, steps, seed), dimensions (width, height), and attempts to find models and LoRAs by hash in the local cache.

## Inputs

### `metadata_string` — `STRING`
- **Name:** `metadata_string`
- **Description:** The metadata string to parse.

### `default_seed` — `INT` (optional)
- **Name:** `default_seed`
- **Description:** Default seed used when the metadata does not specify one.

### `default_steps` — `INT` (optional)
- **Name:** `default_steps`
- **Description:** Default steps used when the metadata does not specify them.

### `default_cfg` — `FLOAT` (optional)
- **Name:** `default_cfg`
- **Description:** Default CFG scale used when the metadata does not specify it.

### `default_sampler` — `COMBO` (optional)
- **Name:** `default_sampler`
- **Description:** Default sampler to use when the metadata string does not specify one.

### `default_scheduler` — `COMBO` (optional)
- **Name:** `default_scheduler`
- **Description:** Default scheduler to use when the metadata string does not specify one.

### `default_width` — `INT` (optional)
- **Name:** `default_width`
- **Description:** Default width used when the metadata does not specify dimensions.

### `default_height` — `INT` (optional)
- **Name:** `default_height`
- **Description:** Default height used when the metadata does not specify dimensions.

### `default_model_info` — `MODEL_INFO` (optional)
- **Name:** `default_model_info`
- **Description:** Default model info used when the metadata string does not identify a model.


## Outputs

### `positive_string` — `STRING`
- **Name:** `positive_string`
- **Description:** Extracted positive prompt string.

### `negative_string` — `STRING`
- **Name:** `negative_string`
- **Description:** Extracted negative prompt string.

### `seed` — `INT`
- **Name:** `seed`
- **Description:** Extracted seed value.

### `steps` — `INT`
- **Name:** `steps`
- **Description:** Extracted number of steps.

### `cfg` — `FLOAT`
- **Name:** `cfg`
- **Description:** Extracted CFG scale.

### `sampler_name` — `COMBO`
- **Name:** `sampler_name`
- **Description:** Extracted sampler name.

### `scheduler` — `COMBO`
- **Name:** `scheduler`
- **Description:** Extracted scheduler name.

### `width` — `INT`
- **Name:** `width`
- **Description:** Extracted image width.

### `height` — `INT`
- **Name:** `height`
- **Description:** Extracted image height.

### `model_info` — `MODEL_INFO`
- **Name:** `model_info`
- **Description:** Extracted default model info from metadata, if available.

### `lora_stack` — `LORA_STACK`
- **Name:** `lora_stack`
- **Description:** Extracted LoRA stack information from the metadata.


## Notes



Generated from the node schema.

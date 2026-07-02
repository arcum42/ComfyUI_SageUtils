---
type: NodeDoc
title: Adv KSampler Info
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# Adv KSampler Info

* **Node ID:** `Sage_AdvSamplerInfo`
* **Category:** `Sage Utils/sampler`

Adds more optional values to the KSampler.

## Inputs

### `add_noise` — `BOOLEAN`
- **Name:** `add_noise`
- **Description:** Whether to add noise during sampling.

### `start_at_step` — `INT`
- **Name:** `start_at_step`
- **Description:** The first step at which to apply noise.

### `end_at_step` — `INT`
- **Name:** `end_at_step`
- **Description:** The last step at which to apply noise.

### `return_with_leftover_noise` — `BOOLEAN`
- **Name:** `return_with_leftover_noise`
- **Description:** Return the extra noise if not fully denoised.


## Outputs

### `adv_sampler_info` — `ADV_SAMPLER_INFO`
- **Name:** `adv_sampler_info`
- **Description:** The advanced sampler settings.


## Notes



Generated from the node schema.

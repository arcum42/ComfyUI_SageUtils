---
type: NodeDoc
title: KSampler Info
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# KSampler Info

* **Node ID:** `Sage_SamplerInfo`
* **Category:** `Sage Utils/sampler`

Grabs most of the sampler info. Should be routed both to the Construct Metadata node and the KSampler w/ Sampler Info node.

## Inputs

### `seed` — `INT`
- **Name:** `seed`
- **Description:** Random seed for sampling.

### `steps` — `INT`
- **Name:** `steps`
- **Description:** Number of sampling steps.

### `cfg` — `FLOAT`
- **Name:** `cfg`
- **Description:** CFG scale for the sampler.

### `sampler_name` — `COMBO`
- **Name:** `sampler_name`
- **Description:** Sampler algorithm to use.

### `scheduler` — `COMBO`
- **Name:** `scheduler`
- **Description:** Scheduler algorithm to use.

### `advanced_info` — `ADV_SAMPLER_INFO` (optional)
- **Name:** `advanced_info`
- **Description:** Optional advanced sampler settings.


## Outputs

### `sampler_info` — `SAMPLER_INFO`
- **Name:** `sampler_info`
- **Description:** The collected sampler configuration.


## Notes



Generated from the node schema.

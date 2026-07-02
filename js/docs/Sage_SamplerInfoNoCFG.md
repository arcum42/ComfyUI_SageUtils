---
type: NodeDoc
title: KSampler Info (No CFG)
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# KSampler Info (No CFG)

* **Node ID:** `Sage_SamplerInfoNoCFG`
* **Category:** `Sage Utils/sampler`

Grabs most of the sampler info (with cfg at 1.0). Should be routed both to the Construct Metadata node and the KSampler w/ Sampler Info node.

## Inputs

### `seed` — `INT`
- **Name:** `seed`
- **Description:** Random seed for sampling.

### `steps` — `INT`
- **Name:** `steps`
- **Description:** Number of sampling steps.

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

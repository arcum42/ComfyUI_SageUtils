---
type: NodeDoc
title: Scheduler Selector
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# Scheduler Selector

* **Node ID:** `Sage_SchedulerSelector`
* **Category:** `Sage Utils/sampler`

Selects a scheduler for use in the pipeline, and passes the steps to be used in the KSampler.

## Inputs

### `steps` — `INT`
- **Name:** `steps`
- **Description:** The number of sampling steps.

### `scheduler_name` — `COMBO`
- **Name:** `scheduler_name`
- **Description:** The scheduler algorithm to use.


## Outputs

### `out_steps` — `INT`
- **Name:** `steps`
- **Description:** The validated number of sampling steps.

### `scheduler` — `STRING`
- **Name:** `scheduler`
- **Description:** The selected scheduler name.


## Notes



Generated from the node schema.

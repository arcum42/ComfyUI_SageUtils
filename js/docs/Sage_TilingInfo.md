---
type: NodeDoc
title: Tiling Info
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# Tiling Info

* **Node ID:** `Sage_TilingInfo`
* **Category:** `Sage Utils/sampler`

Adds tiling information to the KSampler.

## Inputs

### `tile_size` — `INT`
- **Name:** `tile_size`
- **Description:** Size of each tile for tiled sampling.

### `overlap` — `INT`
- **Name:** `overlap`
- **Description:** Overlap size between tiles.

### `temporal_size` — `INT`
- **Name:** `temporal_size`
- **Description:** Only used for video VAEs: Amount of frames to decode at a time.

### `temporal_overlap` — `INT`
- **Name:** `temporal_overlap`
- **Description:** Only used for video VAEs: Amount of frames to overlap.


## Outputs

### `tiling_info` — `TILING_INFO`
- **Name:** `tiling_info`
- **Description:** Tiling parameters for the sampler.


## Notes



Generated from the node schema.

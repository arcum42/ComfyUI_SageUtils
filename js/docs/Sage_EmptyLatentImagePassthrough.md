---
type: NodeDoc
title: Empty Latent Image Passthrough
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# Empty Latent Image Passthrough

* **Node ID:** `Sage_EmptyLatentImagePassthrough`
* **Category:** `Sage Utils/image`

Passes through an empty latent image.

## Inputs

### `width` — `INT`
- **Name:** `width`
- **Description:** The width of the empty latent image.

### `height` — `INT`
- **Name:** `height`
- **Description:** The height of the empty latent image.

### `batch_size` — `INT`
- **Name:** `batch_size`
- **Description:** The number of latent images in the batch.

### `type` — `COMBO`
- **Name:** `type`
- **Description:** The type of latent to create. 4_channel is for standard latent diffusion models, 16_channel is for SD3 models, and radiance is for Chroma Radiance models.


## Outputs

### `latent` — `LATENT`
- **Name:** `latent`
- **Description:** The generated empty latent image tensor.

### `out_width` — `INT`
- **Name:** `width`
- **Description:** The width of the output latent image.

### `out_height` — `INT`
- **Name:** `height`
- **Description:** The height of the output latent image.


## Notes



Generated from the node schema.

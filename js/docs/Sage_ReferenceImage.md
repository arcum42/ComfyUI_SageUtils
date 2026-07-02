---
type: NodeDoc
title: Reference Image
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# Reference Image

* **Node ID:** `Sage_ReferenceImage`
* **Category:** `Sage Utils/clip/encode/image`

This node sets the guiding latent for an edit model. If the model supports it you can chain multiple to set multiple reference images.

## Inputs

### `conditioning` — `CONDITIONING`
- **Name:** `conditioning`
- **Description:** The input conditioning.

### `image` — `IMAGE`
- **Name:** `image`
- **Description:** The reference image.

### `vae` — `VAE`
- **Name:** `vae`
- **Description:** The VAE model for encoding the image.


## Outputs

### `out_conditioning` — `CONDITIONING`
- **Name:** `conditioning`
- **Description:** The output conditioning.

### `out_latent` — `LATENT`
- **Name:** `latent`
- **Description:** The encoded latent.


## Notes



Generated from the node schema.

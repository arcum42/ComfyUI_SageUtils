---
type: NodeDoc
title: KSampler w/ Sampler Info
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# KSampler w/ Sampler Info

* **Node ID:** `Sage_KSampler`
* **Category:** `Sage Utils/sampler`

Uses the provided model, positive and negative conditioning to denoise the latent image. Designed to work with the Sampler info node.

## Inputs

### `model` — `MODEL`
- **Name:** `model`
- **Description:** The model used for denoising.

### `sampler_info` — `SAMPLER_INFO`
- **Name:** `sampler_info`
- **Description:** Sampler configuration for the KSampler.

### `positive` — `CONDITIONING`
- **Name:** `positive`
- **Description:** Positive conditioning for generation.

### `negative` — `CONDITIONING`
- **Name:** `negative`
- **Description:** Negative conditioning for generation.

### `latent_image` — `LATENT`
- **Name:** `latent_image`
- **Description:** The latent image to denoise.

### `denoise` — `FLOAT`
- **Name:** `denoise`
- **Description:** The denoising strength.


## Outputs

### `latent` — `LATENT`
- **Name:** `latent`
- **Description:** The denoised latent output.


## Notes



Generated from the node schema.

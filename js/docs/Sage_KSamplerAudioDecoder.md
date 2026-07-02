---
type: NodeDoc
title: KSampler + Audio Decoder
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# KSampler + Audio Decoder

* **Node ID:** `Sage_KSamplerAudioDecoder`
* **Category:** `Sage Utils/sampler`

Uses the provided model, positive and negative conditioning to denoise the latent audio, and generate audio with the provided vae. Designed to work with the Sampler info node.

## Inputs

### `model` — `MODEL`
- **Name:** `model`
- **Description:** The model used for denoising audio latent.

### `sampler_info` — `SAMPLER_INFO`
- **Name:** `sampler_info`
- **Description:** Sampler configuration for the KSampler.

### `positive` — `CONDITIONING`
- **Name:** `positive`
- **Description:** Positive conditioning for audio generation.

### `negative` — `CONDITIONING`
- **Name:** `negative`
- **Description:** Negative conditioning for audio generation.

### `latent_audio` — `LATENT`
- **Name:** `latent_audio`
- **Description:** The latent audio tensor to denoise.

### `vae` — `VAE`
- **Name:** `vae`
- **Description:** The audio VAE used to decode the denoised latent.

### `denoise` — `FLOAT`
- **Name:** `denoise`
- **Description:** The denoising strength.


## Outputs

### `latent` — `LATENT`
- **Name:** `latent`
- **Description:** The denoised latent audio output.

### `audio` — `AUDIO`
- **Name:** `audio`
- **Description:** The decoded audio result.


## Notes



Generated from the node schema.

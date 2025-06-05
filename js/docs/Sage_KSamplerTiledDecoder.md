# Sage_KSamplerTiledDecoder

**KSampler + Tiled Decoder**

A KSampler node with a built-in tiled VAE decoder. Outputs both a latent and an image. If a Tiling Info node is connected, performs tiled VAE decoding.

## Parameters
- **model**: The model to sample from.
- **sampler_info**: Sampler settings input.
- **tiling_info** (optional): Tiling information for tiled decoding.

## Usage
Use for workflows that require tiled decoding and flexible sampler configuration.

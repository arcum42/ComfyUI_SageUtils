# Sage_KSamplerTiledDecoder

**KSampler + Tiled Decoder**

A KSampler node with integrated VAE decoder that supports optional tiled decoding for memory-efficient processing of large images.

## Inputs

### Required

- **model** (MODEL): The model used for denoising the input latent
- **sampler_info** (SAMPLER_INFO): Sampler settings from Sage_SamplerInfo node
- **positive** (CONDITIONING): Conditioning describing attributes to include in the image
- **negative** (CONDITIONING): Conditioning describing attributes to exclude from the image
- **latent_image** (LATENT): The latent image to denoise
- **vae** (VAE): The VAE used for decoding the latent image
- **denoise** (FLOAT): Amount of denoising applied
  - Default: 1.0, Range: 0.0 to 1.0, Step: 0.01

### Optional

- **tiling_info** (TILING_INFO): Tiling parameters from Sage_TilingInfo node for memory-efficient decoding
- **advanced_info** (ADV_SAMPLER_INFO): Advanced sampler options from Sage_AdvSamplerInfo node

## Outputs

- **LATENT**: The denoised latent image
- **IMAGE**: The decoded image (tiled if tiling_info provided)

## Usage

Use for workflows that require both sampling and immediate image output with optional memory-efficient tiled decoding. Connect Sage_TilingInfo to enable tiled VAE decoding for large images, and optionally connect Sage_AdvSamplerInfo for advanced sampling control.

## Notes

- Combines sampling and VAE decoding in a single node
- Automatically uses tiled decoding when Sage_TilingInfo is connected
- Tiling enables processing of high-resolution images with limited VRAM
- Supports both spatial and temporal tiling for video content
- Advanced sampling options available through Sage_AdvSamplerInfo
- Automatically adjusts tiling parameters for compatibility
- Handles video batch reshaping for proper output format
- More efficient than separate sampler + decoder nodes
- Essential for high-resolution workflows with VRAM constraints

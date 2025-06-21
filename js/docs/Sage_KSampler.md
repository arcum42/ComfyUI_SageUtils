# Sage_KSampler

**KSampler w/ Sampler Info**

A KSampler node designed to work with Sampler Info nodes for streamlined configuration and workflow integration.

## Inputs

### Required

- **model** (MODEL): The model used for denoising the input latent
- **sampler_info** (SAMPLER_INFO): Sampler settings from Sage_SamplerInfo node
- **positive** (CONDITIONING): Conditioning describing attributes to include in the image
- **negative** (CONDITIONING): Conditioning describing attributes to exclude from the image
- **latent_image** (LATENT): The latent image to denoise
- **denoise** (FLOAT): Amount of denoising applied
  - Default: 1.0, Range: 0.0 to 1.0, Step: 0.01

### Optional

- **advanced_info** (ADV_SAMPLER_INFO): Advanced sampler options from Sage_AdvSamplerInfo node

## Outputs

- **LATENT**: The denoised latent image

## Usage

Use for workflows that require flexible sampler configuration and metadata integration. Connect a Sage_SamplerInfo node to provide centralized sampler settings, and optionally connect Sage_AdvSamplerInfo for advanced control options.

## Notes

- Designed to work with Sage_SamplerInfo for centralized configuration
- Supports advanced sampling options when Sage_AdvSamplerInfo is connected
- Lower denoise values maintain structure for image-to-image workflows
- Sampler info should be routed to both this node and metadata construction
- Uses ComfyUI's common_ksampler internally for compatibility
- Advanced info enables step ranges, noise control, and leftover noise options
- Streamlines workflow by separating sampler configuration from execution

# Sage_SamplerInfo

**Sampler Info**

Collects and packages sampler settings for use in metadata construction and KSampler nodes.

## Inputs

- **seed** (INT, required): Random seed for noise generation
  - Default: 0, Range: 0 to 2^64-1
- **steps** (INT, required): Number of denoising steps
  - Default: 20, Range: 1 to 10,000
- **cfg** (FLOAT, required): Classifier-Free Guidance scale
  - Default: 5.5, Range: 0.0 to 100.0, Step: 0.1
- **sampler_name** (dropdown, required): Sampling algorithm
  - Default: "dpmpp_2m"
  - Options: All available ComfyUI samplers
- **scheduler** (dropdown, required): Noise scheduling algorithm
  - Default: "beta"
  - Options: All available ComfyUI schedulers

## Outputs

- **SAMPLER_INFO**: Dictionary containing all sampler parameters

## Usage

Connect to both the Construct Metadata node and KSampler nodes to standardize and share sampler configuration across your workflow. This node centralizes sampler settings, making it easy to maintain consistency and modify parameters in one place.

## Notes

- Designed to work with Sage_KSampler and other sampler nodes
- Output should be routed to both metadata construction and sampling nodes
- CFG scale balances creativity and prompt adherence
- Higher CFG values increase prompt adherence but may reduce quality if too high
- Sampler algorithm affects quality, speed, and style of generation
- Scheduler controls how noise is gradually removed during denoising
- Centralizes sampler configuration for workflow consistency

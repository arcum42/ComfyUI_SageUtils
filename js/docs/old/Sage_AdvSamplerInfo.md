# Sage_AdvSamplerInfo

**Adv Sampler Info**

Provides advanced sampler settings for granular control over the sampling process.

## Inputs

- **add_noise** (BOOLEAN, required): Whether to add noise during sampling
  - Default: True
- **start_at_step** (INT, required): Step number to start sampling from
  - Default: 0, Range: 0 to 10,000
- **end_at_step** (INT, required): Step number to end sampling at
  - Default: 10,000, Range: 0 to 10,000
- **return_with_leftover_noise** (BOOLEAN, required): Whether to return result with remaining noise
  - Default: False

## Outputs

- **ADV_SAMPLER_INFO**: Dictionary containing advanced sampler parameters

## Usage

Use when you need granular control over the sampling process beyond basic parameters. Connect to KSampler nodes to enable advanced sampling features like partial denoising, step ranges, and noise control.

## Notes

- Designed to work with Sage_KSampler and related sampler nodes
- `add_noise`: Set to False for img2img workflows where noise should not be added
- `start_at_step` and `end_at_step`: Enable partial sampling for multi-stage workflows
- `return_with_leftover_noise`: Useful for multi-pass sampling or when preserving noise structure
- Step range allows for sampling only specific portions of the denoising process
- Provides functionality similar to ComfyUI's advanced KSampler
- Optional input for sampler nodes - basic functionality works without it

# Sage_EmptyLatentImagePassthrough

**Empty Latent Passthrough**

Creates an empty latent image and passes width/height for easier wiring. Includes a switch for SD3 compatibility.

## Inputs

### Required

- **width** (INT): The width of the latent images in pixels (default: 1024, range: 16 to MAX_RESOLUTION, step: 8)
- **height** (INT): The height of the latent images in pixels (default: 1024, range: 16 to MAX_RESOLUTION, step: 8)
- **batch_size** (INT): The number of latent images in the batch (default: 1, range: 1-4096)
- **sd3** (BOOLEAN): Enable for SD3 compatibility - changes latent channels from 4 to 16 (default: False)

## Outputs

- **latent** (LATENT): The empty latent image batch
- **width** (INT): Pass through the image width
- **height** (INT): Pass through the image height

## Usage

Use to generate latent images and pass dimensions to downstream nodes. The passthrough outputs make it easier to wire width/height to other nodes without additional connections.

## Notes

- Creates empty latent tensors on intermediate device for memory efficiency
- SD3 mode uses 16 channels instead of 4 for compatibility with SD3 models
- Latent dimensions are automatically scaled down by factor of 8 (standard for diffusion models)
- Width and height must be multiples of 8 for proper latent space alignment
- Batch size allows creating multiple latent images in a single tensor
- Useful for starting generation workflows with proper dimension tracking

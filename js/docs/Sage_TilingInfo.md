# Sage_TilingInfo

**Tiling Info**

Provides tiling parameters for memory-efficient processing of large images and videos.

## Inputs

- **tile_size** (INT, required): Size of each spatial tile in pixels
  - Default: 512, Range: 64 to 4096, Step: 32
- **overlap** (INT, required): Overlap between spatial tiles in pixels
  - Default: 64, Range: 0 to 4096, Step: 32
- **temporal_size** (INT, required): Number of frames to process at once (video VAEs only)
  - Default: 64, Range: 8 to 4096, Step: 4
- **temporal_overlap** (INT, required): Number of frames to overlap (video VAEs only)
  - Default: 8, Range: 4 to 4096, Step: 4

## Outputs

- **TILING_INFO**: Dictionary containing all tiling parameters

## Usage

Connect to tiled decoder nodes like Sage_KSamplerTiledDecoder to enable memory-efficient processing of large images or videos. Tiling breaks down large content into smaller chunks that can be processed with limited VRAM.

## Notes

- Designed for use with Sage_KSamplerTiledDecoder and similar tiled processing nodes
- Spatial tiling (tile_size/overlap) applies to all content types
- Temporal tiling (temporal_size/temporal_overlap) only used for video VAEs
- Larger tile sizes use more VRAM but may produce better quality
- Overlap helps reduce seam artifacts between tiles
- System automatically adjusts parameters if they're incompatible (e.g., overlap too large)
- Temporal parameters are scaled based on VAE compression ratios
- Essential for processing high-resolution images with limited VRAM
- Optional input - nodes work without tiling if not provided

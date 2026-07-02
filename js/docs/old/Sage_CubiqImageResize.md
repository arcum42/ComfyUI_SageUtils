# Sage_CubiqImageResize

## Advanced Image Resize

An advanced image resizing node based on ComfyUI-Essentials functionality. Provides high-quality image resizing with multiple interpolation methods and precise dimension control.

## Inputs

### Required

- **image** (IMAGE): The input image to resize
- **width** (INT): Target width in pixels (default: 1024, range: 0 to MAX_RESOLUTION)
- **height** (INT): Target height in pixels (default: 1024, range: 0 to MAX_RESOLUTION)
- **interpolation** (COMBO): Interpolation method - "nearest", "bilinear", "bicubic", "area", "nearest-exact", "lanczos", "bislerp"
- **method** (COMBO): Resize method - "stretch", "keep proportion", "fill / crop", "pad"
- **condition** (COMBO): When to resize - "always", "downscale if bigger", "upscale if smaller", "if bigger area", "if smaller area"
- **multiple_of** (INT): Ensure dimensions are multiples of this value (default: 0, range: 0-1024)

## Outputs

- **IMAGE** (IMAGE): The resized image
- **width** (INT): Actual output width
- **height** (INT): Actual output height

## Resize Methods

- **stretch**: Stretch image to exact dimensions (may distort aspect ratio)
- **keep proportion**: Maintain aspect ratio, fit within target dimensions
- **fill / crop**: Fill target dimensions, crop excess while maintaining aspect ratio
- **pad**: Fit within dimensions and pad with black borders if needed

## Interpolation Options

- **nearest**: Fastest, pixelated results for pixel art
- **bilinear**: Good balance of speed and quality
- **bicubic**: Higher quality, smoother results
- **area**: Best for downscaling operations
- **nearest-exact**: Precise nearest neighbor
- **lanczos**: Highest quality, best for upscaling
- **bislerp**: ComfyUI's optimized bicubic interpolation

## Condition Options

- **always**: Always resize regardless of current size
- **downscale if bigger**: Only resize if image is larger than target
- **upscale if smaller**: Only resize if image is smaller than target
- **if bigger area**: Resize if total pixel area is larger
- **if smaller area**: Resize if total pixel area is smaller

## Usage

This node is ideal for:

- Resizing images for specific model requirements
- Preparing images for different processing stages
- Maintaining or adjusting aspect ratios
- Batch processing images to consistent dimensions

## Notes

- Based on the proven ComfyUI-Essentials resize implementation (MIT license)
- Original author: cubiq (Matteo Spinelli)
- The multiple_of parameter ensures compatibility with models requiring specific dimension alignment
- Conditional resizing prevents unnecessary processing
- Supports both upscaling and downscaling with appropriate quality settings
- Output dimensions are clamped to valid ranges and multiples as specified

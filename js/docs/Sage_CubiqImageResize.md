# Sage_CubiqImageResize

## Description

An advanced image resizing node based on the ComfyUI-Essentials image resize functionality. This node provides high-quality image resizing with multiple interpolation methods and advanced options for precise image dimension control.

## Inputs

- **image** (IMAGE): The input image to resize
- **width** (INT): Target width in pixels
- **height** (INT): Target height in pixels
- **interpolation** (COMBO): Resizing method (nearest, linear, cubic, area, lanczos)
- **method** (COMBO): Resize method (stretch, fit, fill, crop)
- **condition** (COMBO): When to resize (always, bigger, smaller)
- **multiple_of** (INT): Ensure dimensions are multiples of this value

## Outputs

- **image** (IMAGE): The resized image
- **width** (INT): Actual output width
- **height** (INT): Actual output height

## Resize Methods

- **stretch**: Stretch image to exact dimensions (may distort aspect ratio)
- **fit**: Fit image within dimensions while maintaining aspect ratio
- **fill**: Fill dimensions while maintaining aspect ratio (may crop)
- **crop**: Crop image to exact dimensions from center

## Interpolation Options

- **nearest**: Fastest, pixelated results
- **linear**: Good balance of speed and quality
- **cubic**: Higher quality, slower
- **area**: Best for downscaling
- **lanczos**: Highest quality, slowest

## Usage

This node is ideal for:

- Resizing images for specific model requirements
- Preparing images for different processing stages
- Maintaining or adjusting aspect ratios
- Batch processing images to consistent dimensions

## Notes

- Based on the proven Essentials resize implementation
- The multiple_of parameter is useful for ensuring compatibility with certain models
- Choose interpolation method based on your quality vs. speed requirements
- The condition parameter allows conditional resizing based on current image size

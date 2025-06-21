# Sage_GuessResolutionByRatio

## Description

An intelligent resolution calculation node that determines appropriate image dimensions based on a target aspect ratio. This node helps find the closest standard resolution that matches your desired aspect ratio while maintaining practical image dimensions.

## Inputs

- **target_ratio** (FLOAT): The desired aspect ratio (width/height)
- **base_resolution** (INT): Base resolution to scale from (default: 512 or 1024)
- **max_dimension** (INT): Maximum allowed width or height
- **prefer_landscape** (BOOLEAN): Prefer landscape orientation when possible

## Outputs

- **width** (INT): Calculated width dimension
- **height** (INT): Calculated height dimension
- **actual_ratio** (FLOAT): The actual aspect ratio of the calculated dimensions
- **ratio_difference** (FLOAT): Difference between target and actual ratio

## Usage

This node is useful for:

- Converting aspect ratios to practical pixel dimensions
- Finding the best resolution match for specific ratio requirements
- Ensuring generated images fit desired proportions
- Automatically calculating dimensions for custom aspect ratios

## Examples

- Input ratio 1.77 (16:9) might output 1024x576 or 896x512
- Input ratio 0.75 (3:4 portrait) might output 512x684 or 768x1024
- Input ratio 1.0 (square) might output 512x512 or 1024x1024

## Notes

- The node attempts to find dimensions that are divisible by common factors (8, 16, 32)
- Results are optimized for AI image generation requirements
- The algorithm considers memory efficiency and processing speed
- Useful for maintaining aspect ratio consistency across different base resolutions

# Sage_GuessResolutionByRatio

## Guess Resolution by Ratio

Analyzes input dimensions and suggests the closest standard resolution from common aspect ratios, rounded to multiples of 64.

## Inputs

### Required

- **width** (INT): Input width dimension (range: 64-8192)
- **height** (INT): Input height dimension (range: 64-8192)

## Outputs

- **width** (INT): Suggested width dimension
- **height** (INT): Suggested height dimension

## Usage

Based on the input width and height, this node guesses a resolution that matches one of the common aspect ratios. The output is rounded to the nearest multiple of 64.

## Notes

- Supports 11 common aspect ratios including 1:1, 5:12, 9:16, 10:16, 5:7, 2:3, 3:4, 4:7, 7:9, 8:10, and 13:19
- Automatically detects landscape vs portrait orientation
- Finds the closest aspect ratio by comparing input ratio to predefined ratios
- All outputs are rounded to nearest multiple of 64 for optimal AI generation
- Swaps dimensions appropriately to maintain landscape/portrait orientation
- Defaults to 1024x1024 if no close match is found
- Useful for standardizing arbitrary input dimensions to known good ratios
- Optimized for AI image generation workflows requiring specific aspect ratios

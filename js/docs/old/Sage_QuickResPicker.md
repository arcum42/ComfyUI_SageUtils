# Sage_QuickResPicker

## Quick Resolution Picker

A convenient node for quickly selecting common image resolutions from predefined aspect ratios with orientation and scaling options.

## Inputs

### Required

- **aspect_ratio** (COMBO): Predefined aspect ratio selection - "1:1", "5:12", "9:16", "10:16", "5:7", "2:3", "3:4", "4:7", "7:9", "8:10", "13:19"
- **orientation** (COMBO): "Portrait" or "Landscape" orientation
- **multiplier** (FLOAT): Scale factor for the resolution (default: 1.0, range: 0.1-10.0, step: 0.1)

## Outputs

- **width** (INT): The calculated width dimension
- **height** (INT): The calculated height dimension

## Usage

Pick a resolution from a list of common aspect ratios. The multiplier can be used to scale the resolution up or down, rounded to the nearest unit of 64.

## Available Aspect Ratios

- **1:1** - Square (1024 x 1024)
- **5:12** - Portrait (512 x 1216)  
- **9:16** - Portrait (720 x 1280)
- **10:16** - Portrait (640 x 1024)
- **5:7** - Portrait (1280 x 1792)
- **2:3** - Portrait (768 x 1152)
- **3:4** - Portrait (768 x 1024)
- **4:7** - Portrait (768 x 1344)
- **7:9** - Portrait (896 x 1152)
- **8:10** - Portrait (1024 x 1280)
- **13:19** - Portrait (832 x 1216)

## Notes

- All base resolutions are listed in portrait orientation
- Landscape orientation swaps width and height
- Multiplier allows scaling while maintaining aspect ratio
- All outputs are rounded to nearest multiple of 64 for optimal AI generation
- Defaults to 1:1 aspect ratio if invalid selection
- Useful for quickly setting up standard image dimensions
- Covers common aspect ratios used in AI image generation

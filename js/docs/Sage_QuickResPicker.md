# Sage_QuickResPicker

## Description

A convenient node for quickly selecting common image resolutions. This node provides a dropdown interface for choosing from predefined resolution presets, making it easy to set up standard image dimensions without manual input.

## Inputs

- **resolution** (COMBO): Dropdown selection of predefined resolutions
- **custom_width** (INT): Custom width override (optional)
- **custom_height** (INT): Custom height override (optional)

## Outputs

- **width** (INT): The selected or custom width value
- **height** (INT): The selected or custom height value
- **resolution_string** (STRING): Human-readable resolution description

## Available Resolutions

Common presets typically include:

- Standard definitions (SD): 512x512, 512x768, 768x512
- High definitions: 1024x1024, 1024x1536, 1536x1024
- Widescreen formats: 1920x1080, 1280x720
- Portrait and landscape orientations
- Square, 4:3, 16:9, and other aspect ratios

## Usage

This node is perfect for:

- Quickly setting up standard image dimensions
- Ensuring consistent resolution choices across workflows
- Avoiding manual width/height input errors
- Providing preset options for different use cases

## Notes

- The exact list of available resolutions depends on the node's configuration
- Custom width/height inputs can override the preset selection
- Useful for maintaining consistent aspect ratios and common dimensions
- Streamlines the process of setting up image generation parameters

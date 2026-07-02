# Sage_SaveImageWithMetadata

**Save Image w/ Added Metadata**

Saves images with comprehensive metadata options including custom parameters, extra metadata, and ComfyUI workflow information.

## Inputs

### Required

- **images** (IMAGE): The images to save
- **filename_prefix** (STRING): The prefix for the file to save, supports formatting like %date:yyyy-MM-dd% or %Empty Latent Image.width% (default: "ComfyUI_Meta")
- **include_node_metadata** (BOOLEAN): Whether to include ComfyUI prompt/workflow metadata (default: True)
- **include_extra_pnginfo_metadata** (BOOLEAN): Whether to include extra PNG info metadata (default: True)

### Optional

- **param_metadata** (STRING): Metadata string for "parameters" field (A1111-style)
- **extra_metadata** (STRING): Additional metadata for "Extra" field

### Hidden

- **prompt**: ComfyUI workflow prompt (automatically provided)
- **extra_pnginfo**: Extra PNG info (automatically provided)

## Outputs

- **None** (Output Node): Saves images to ComfyUI output directory

## Usage

Use to save images with custom and standard metadata for better tracking and sharing. Connect param_metadata from Construct Metadata node for A1111-compatible metadata.

## Notes

- Saves images as PNG with customizable compression level
- param_metadata is stored under "parameters" key (A1111 standard)
- extra_metadata is stored under "Extra" key
- Filename prefix supports dynamic formatting with node values and dates
- Batch number support with %batch_num% placeholder
- Respects ComfyUI's --disable-metadata flag
- Compatible with A1111 and Civitai metadata standards
- Output node that appears in ComfyUI's image output interface
- Useful for workflows requiring comprehensive metadata tracking

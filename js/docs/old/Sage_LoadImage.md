# Sage_LoadImage

**Load Image w/ Size & Metadata**

Loads an image and outputs its size and embedded metadata along with the image and mask.

## Inputs

### Required

- **image** (STRING): The image file to load from the input directory (supports image upload)

## Outputs

- **image** (IMAGE): The loaded image
- **mask** (MASK): The alpha channel mask (if present)
- **width** (INT): The image width in pixels
- **height** (INT): The image height in pixels
- **metadata** (STRING): Embedded metadata from the image file

## Usage

Use to inspect images and extract their metadata for use in workflows. Provides both the image data and useful information about dimensions and embedded metadata.

## Notes

- Automatically scans all files in the ComfyUI input directory
- Supports image upload functionality
- Extracts alpha channel as mask if present
- Metadata includes EXIF data, PNG text chunks, and other embedded information
- File validation ensures only valid image files are processed
- Uses SHA256 hash to detect file changes for cache invalidation
- Supports all common image formats (PNG, JPEG, WebP, etc.)
- Useful for loading reference images and extracting generation parameters

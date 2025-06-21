# Sage_GetFileHash

**Get Sha256 Hash**

Computes the SHA256 hash of a file from ComfyUI's configured directories. Useful for verifying file integrity or identifying models.

## Inputs

- **base_dir** (dropdown, required): Base directory from ComfyUI's configured folder paths
  - Options include: models, loras, checkpoints, etc.
- **filename** (STRING, required): Name of the file to hash within the selected directory

## Outputs

- **hash** (STRING): SHA256 hash of the specified file

## Usage

Use in workflows where you need to check file uniqueness, verify downloads, or identify models by their hash. The node uses ComfyUI's folder path system to locate files in the proper directories.

## Notes

- Uses ComfyUI's configured folder paths for file location
- Generates SHA256 hash for file identification and integrity verification
- Returns empty string if file cannot be found or hashed
- Handles exceptions gracefully with error logging
- Prints hash result to console for debugging
- Useful for model verification and duplicate detection
- Hash is cached for performance on repeated requests
- File must exist in the specified base directory

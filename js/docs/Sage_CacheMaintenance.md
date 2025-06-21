# Sage_CacheMaintenance

**Cache Maintenance**

Checks for missing or duplicate entries in the model cache, with options to clean up ghost entries and identify duplicates.

## Inputs

### Required

- **remove_ghost_entries** (BOOLEAN): Whether to remove entries for models that are no longer present on disk

## Outputs

- **ghost_entries** (STRING): Comma-separated list of cache entries for files that no longer exist
- **dup_hash** (STRING): JSON list of files with the same hash (exact duplicates)
- **dup_model** (STRING): JSON list of files with the same Civitai model ID (different versions of same model)
- **not_on_civitai** (STRING): List of models not found on Civitai

## Usage

Use to keep your model cache organized and up to date. Helps identify missing files, duplicate models, and models not available on Civitai.

## Notes

- Ghost entries are automatically removed from cache if remove_ghost_entries is True
- dup_hash identifies exact duplicates (same file hash)
- dup_model identifies different versions of the same model from Civitai
- not_on_civitai lists models that couldn't be found on Civitai
- Cache is automatically saved after removing ghost entries
- Useful for cleaning up after moving or deleting model files

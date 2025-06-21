# Sage_ModelReport

**Model Scan & Report**

Scans and hashes all LoRAs and checkpoints, queries Civitai, and generates sorted model and LoRA lists for reporting and organization.

## Inputs

### Required

- **scan_models** (STRING): Type of models to scan - "none", "loras", "checkpoints", or "all" (default: "none")
- **force_recheck** (BOOLEAN): Whether to force re-scanning of models even if already cached (default: False)

## Outputs

- **model_list** (STRING): JSON-formatted list of checkpoint models organized by base model type
- **lora_list** (STRING): JSON-formatted list of LoRA models organized by base model type

## Usage

Use to audit, organize, and report on your model and LoRA library. Generates comprehensive reports of all models sorted by their base model type.

## Notes

- Scans specified model types and updates cache with hashes and Civitai metadata
- Organizes models by base model type (SD1.5, SDXL, etc.)
- Only processes models of type "Checkpoint" and "LORA" from Civitai metadata
- Returns empty strings for model types that have no cached entries
- force_recheck will re-process all models even if they're already in cache
- Useful for generating model inventories and organization reports
- JSON output is formatted with indentation for readability

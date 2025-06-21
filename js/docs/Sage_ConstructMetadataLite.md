# Sage_ConstructMetadataLite

**Construct Metadata Lite**

Assembles a minimal set of metadata from workflow inputs in A1111-like format without individual LoRA hashes.

## Inputs

### Required

- **model_info** (MODEL_INFO): Model information including path and hash
- **positive_string** (STRING): The positive prompt text
- **negative_string** (STRING): The negative prompt text
- **sampler_info** (SAMPLER_INFO): Sampler settings including steps, CFG, seed, sampler, and scheduler
- **width** (INT): Image width
- **height** (INT): Image height

### Optional

- **lora_stack** (LORA_STACK): LoRA stack with models and weights

## Outputs

- **param_metadata** (STRING): Simplified A1111-style metadata string

## Usage

Use when you want a lightweight metadata string for images or outputs. This version includes Civitai resources but omits individual LoRA hashes for a cleaner format.

## Notes

- Generates A1111-style metadata without LoRA tags embedded in the prompt
- Does not include individual "Lora hashes:" section (unlike full version)
- Still includes Civitai resource information for tracking
- Converts sampler names to Civitai-compatible format
- Returns a manipulable string that can be processed by other nodes
- Automatically pulls metadata for all models and LoRAs in the resource list
- Lighter alternative to full metadata construction for simpler workflows

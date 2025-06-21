# Sage_ConstructMetadata

**Construct Metadata**

Assembles metadata strings from various workflow inputs for embedding in images or outputs in A1111-like format with full LoRA hash support.

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

- **param_metadata** (STRING): Complete A1111-style metadata string

## Usage

Use to build comprehensive metadata for images or outputs, compatible with A1111/Civitai formats. This is the full version that includes LoRA hashes and complete Civitai resource information.

## Notes

- Generates A1111-style metadata with embedded LoRA tags in the prompt
- Includes individual LoRA hashes in "Lora hashes:" section
- Adds complete Civitai resource information for all models and LoRAs
- Converts sampler names to Civitai-compatible format
- Returns a manipulable string that can be processed by other nodes
- Automatically pulls metadata for all LoRAs in the stack
- Compatible with image embedding workflows for complete generation tracking

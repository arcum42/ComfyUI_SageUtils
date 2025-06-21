# Sage_ModelLoraStackLoader

**Model + Lora Stack Loader**

Loads both a checkpoint and a LoRA stack in one node, with optional model shifts.

## Inputs

### Required

- **model_info** (MODEL_INFO): The diffusion model info to load. Should be from the checkpoint info node, not a loader node, to avoid loading the model twice

### Optional

- **lora_stack** (LORA_STACK): The stack of LoRAs to load and apply
- **model_shifts** (MODEL_SHIFTS): The model shifts & FreeU2 settings to apply to the model

## Outputs

- **model** (MODEL): The modified diffusion model with LoRAs applied
- **clip** (CLIP): The modified CLIP model with LoRAs applied
- **vae** (VAE): The VAE model from the checkpoint
- **lora_stack** (LORA_STACK): The stack of LoRAs (passed through)
- **keywords** (STRING): Keywords from the LoRA stack

## Usage

Use to streamline workflows that require both a model and a LoRA stack. Loads the checkpoint and applies all LoRAs in a single efficient operation.

## Notes

- Inherits functionality from Sage_LoraStackLoader
- Loads model, CLIP, and VAE from checkpoint using model_info
- Applies all LoRAs in the stack to the loaded model and CLIP
- Shows progress bar during loading process
- Extracts and returns keywords from all LoRAs in the stack
- Supports model shifts and FreeU v2 settings
- More efficient than separate model loading and LoRA application
- Requires checkpoint model_info (not UNET-only models)
- Part of "Sage Utils/model" category for complete model loading

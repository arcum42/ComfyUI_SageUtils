# Sage_LoraStackLoader

**Lora Stack Loader**

Loads all LoRAs in a stack and applies them to the model and CLIP, with optional model shifts.

## Inputs

### Required

- **model** (MODEL): The diffusion model the LoRA will be applied to
- **clip** (CLIP): The CLIP model the LoRA will be applied to

### Optional

- **lora_stack** (LORA_STACK): The stack of LoRAs to load and apply
- **model_shifts** (MODEL_SHIFTS): The model shifts & FreeU2 settings to apply to the model

## Outputs

- **model** (MODEL): The modified diffusion model with LoRAs applied
- **clip** (CLIP): The modified CLIP model with LoRAs applied
- **lora_stack** (LORA_STACK): The stack of LoRAs (passed through)
- **keywords** (STRING): Keywords from the LoRA stack

## Usage

Connect to a LoRA stack node to load all LoRAs at once. Supports model shifts for advanced model modifications.

## Notes

- Applies all LoRAs in the stack to both model and CLIP
- Shows progress bar during loading process
- Extracts and returns keywords from all LoRAs in the stack
- Supports model shifts including discrete flow sampling and FreeU v2
- Model shifts can apply x1 or x1000 multipliers for different model types
- FreeU v2 can be enabled for improved quality with specific parameters
- Compatible with LoRA stacks from other node packs

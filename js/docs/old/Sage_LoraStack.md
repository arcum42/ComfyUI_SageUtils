# Sage_LoraStack

**Simple Lora Stack**

Builds and manages a stack of LoRAs with toggles and weights.

## Inputs

### Required

- **enabled** (BOOLEAN): Whether to add this LoRA to the stack (default: True)
- **lora_name** (STRING): The name of the LoRA from available LoRAs
- **model_weight** (FLOAT): How strongly to modify the diffusion model. This value can be negative (default: 1.0, range: -100.0 to 100.0)
- **clip_weight** (FLOAT): How strongly to modify the CLIP model. This value can be negative (default: 1.0, range: -100.0 to 100.0)

### Optional

- **lora_stack** (LORA_STACK): Existing LoRA stack to add this LoRA to

## Outputs

- **lora_stack** (LORA_STACK): The updated LoRA stack

## Usage

Chain multiple nodes for complex LoRA stacking. Connect to LoRA Stack Loader or metadata nodes. If enabled is False, the LoRA is not added to the stack.

## Notes

- Compatible with other node packs that have lora_stacks
- Negative weights can be used to subtract the LoRA effect
- Each LoRA can be individually enabled/disabled
- Can be chained together to build complex LoRA combinations
- Shows all available LoRAs in the dropdown

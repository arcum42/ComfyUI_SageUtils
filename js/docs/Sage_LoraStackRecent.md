# Sage_LoraStackRecent

**Recent Lora Stack**

Builds a stack from recently used LoRAs with toggles and weights.

## Inputs

### Required

- **enabled** (BOOLEAN): Whether to add this LoRA to the stack (default: True)
- **lora_name** (STRING): The name of the LoRA from recently used LoRAs
- **model_weight** (FLOAT): How strongly to modify the diffusion model. This value can be negative (default: 1.0, range: -100.0 to 100.0)
- **clip_weight** (FLOAT): How strongly to modify the CLIP model. This value can be negative (default: 1.0, range: -100.0 to 100.0)

### Optional

- **lora_stack** (LORA_STACK): Existing LoRA stack to add this LoRA to

## Outputs

- **lora_stack** (LORA_STACK): The updated LoRA stack

## Usage

Use to quickly build a stack from your most recently used LoRAs. Shows only recently used LoRAs in the dropdown for faster selection.

## Notes

- Compatible with other node packs that have lora_stacks
- Only shows LoRAs that have been recently used
- Same functionality as regular Sage_LoraStack but with filtered dropdown
- Negative weights can be used to subtract the LoRA effect
- Each LoRA can be individually enabled/disabled
- Can be chained together to build complex LoRA combinations

# Sage_TripleLoraStack

**Triple Lora Stack**

Stack up to three LoRAs with individual toggles and weights in a single node.

## Inputs

### Required

- **enabled_1** (BOOLEAN): Whether to add the first LoRA to the stack (default: True)
- **lora_1_name** (STRING): The name of the first LoRA
- **model_1_weight** (FLOAT): Model weight for the first LoRA (default: 1.0, range: -100.0 to 100.0)
- **clip_1_weight** (FLOAT): CLIP weight for the first LoRA (default: 1.0, range: -100.0 to 100.0)
- **enabled_2** (BOOLEAN): Whether to add the second LoRA to the stack (default: True)
- **lora_2_name** (STRING): The name of the second LoRA
- **model_2_weight** (FLOAT): Model weight for the second LoRA (default: 1.0, range: -100.0 to 100.0)
- **clip_2_weight** (FLOAT): CLIP weight for the second LoRA (default: 1.0, range: -100.0 to 100.0)
- **enabled_3** (BOOLEAN): Whether to add the third LoRA to the stack (default: True)
- **lora_3_name** (STRING): The name of the third LoRA
- **model_3_weight** (FLOAT): Model weight for the third LoRA (default: 1.0, range: -100.0 to 100.0)
- **clip_3_weight** (FLOAT): CLIP weight for the third LoRA (default: 1.0, range: -100.0 to 100.0)

### Optional

- **lora_stack** (LORA_STACK): Existing LoRA stack to add these LoRAs to

## Outputs

- **lora_stack** (LORA_STACK): The updated LoRA stack with up to three additional LoRAs

## Usage

Use for workflows that require up to three LoRAs with fine control in a single compact node. More efficient than chaining three individual LoRA stack nodes.

## Notes

- Compatible with other node packs that have lora_stacks
- Each of the three LoRAs can be individually enabled/disabled
- Processes LoRAs in order (1, 2, 3) when building the stack
- Only enabled LoRAs are added to the stack
- Negative weights can be used to subtract LoRA effects
- Useful for common LoRA combinations that are used together frequently

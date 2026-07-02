# Sage_CollectKeywordsFromLoraStack

**Lora Stack → Keywords**

Extracts Civitai keywords from a LoRA stack and combines them into a single string.

## Inputs

### Required

- **lora_stack** (LORA_STACK): The stack of LoRAs to extract keywords from

## Outputs

- **keywords** (STRING): Combined keywords from all LoRAs in the stack

## Usage

Use to extract and use keywords for metadata or prompt construction. Place at the end of a LoRA stack, or you won't get keywords for the entire stack.

## Notes

- Goes through each model in the LoRA stack and grabs keywords from Civitai
- Combines all keywords into one string for easy use
- Returns empty string if no LoRA stack is provided
- Must be connected after all LoRAs have been added to the stack
- Useful for automatic prompt enhancement based on LoRA metadata
- Keywords are sourced from Civitai model information

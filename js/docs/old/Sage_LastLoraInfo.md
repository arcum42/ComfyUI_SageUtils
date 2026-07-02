# Sage_LastLoraInfo

**Last LoRA Info**

Retrieves Civitai information for the last LoRA in a LoRA stack.

## Inputs

- **lora_stack** (LORA_STACK, required): Stack of LoRA models

## Outputs

- **base_model** (STRING): The base model type the LoRA is trained for
- **name** (STRING): LoRA name with version information
- **url** (STRING): Civitai URL for the specific LoRA version
- **latest_url** (STRING): Civitai URL for the latest version of the LoRA
- **image** (IMAGE): Preview image from Civitai

## Usage

Use to retrieve and display comprehensive information about the most recent LoRA in your stack. The node extracts the last LoRA from the stack, gets its hash, and queries Civitai's API to fetch metadata, URLs, and preview images.

## Notes

- Requires internet connection to fetch data from Civitai
- Uses the last LoRA in the stack (most recently added)
- Gets LoRA hash and queries Civitai API for model information
- Returns empty strings and blank image if LoRA info is unavailable
- Handles exceptions gracefully by returning empty values
- The "latest_url" provides a link to the most recent version of the LoRA
- Preview image is fetched from Civitai's image URLs
- Note: The last LoRA in the stack may not be the one this node is connected to if that node is disabled
- Useful for LoRA documentation and workflow metadata

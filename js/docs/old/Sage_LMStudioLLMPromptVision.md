# Sage_LMStudioLLMPromptVision

## LM Studio LLM Prompt (Vision)

Sends a vision prompt with image input to an LM Studio LLM and returns the response.

## Inputs

### Required

- **prompt** (STRING): The text prompt to send to the model (multiline, default: detailed image description prompt)
- **model** (STRING): The LM Studio vision model to use (from available installed vision models)
- **image** (IMAGE): The image to analyze and describe
- **seed** (INT): Seed for random number generation (default: 0, range: 0 to 2^32-1)
- **load_for_seconds** (INT): Time in seconds to keep model loaded, -1 for indefinitely (default: 0, range: -1 to 3600)

## Outputs

- **response** (STRING): The LLM's text response describing the image

## Usage

Use to generate vision-based completions or responses from an LM Studio LLM in your workflow. Ideal for image captioning, analysis, and description tasks.

## Notes

- **EXPERIMENTAL**: This node is experimental and may change in future versions
- Requires LM Studio to be installed and running
- Only shows vision-capable models in the dropdown
- Image input is required for vision models
- Seed ensures reproducible results when set to same value
- load_for_seconds controls how long model stays in memory after generation
- Default prompt is optimized for detailed image descriptions suitable for AI generators
- Currently has Ollama dependency in error handling (may be implementation bug)
- Supports multimodal input (image + text prompt)

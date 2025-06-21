# Sage_LMStudioLLMPromptText

## LM Studio LLM Prompt (Text)

Sends a text prompt to an LM Studio LLM and returns the response.

## Inputs

### Required

- **prompt** (STRING): The text prompt to send to the model (multiline, default: detailed description prompt)
- **model** (STRING): The LM Studio model to use (from available installed models)
- **seed** (INT): Seed for random number generation (default: 0, range: 0 to 2^32-1)
- **load_for_seconds** (INT): Time in seconds to keep model loaded, -1 for indefinitely (default: 0, range: -1 to 3600)

## Outputs

- **response** (STRING): The LLM's text response to the prompt

## Usage

Use to generate text completions or responses from an LM Studio LLM in your workflow. Requires LM Studio to be running with models available.

## Notes

- **EXPERIMENTAL**: This node is experimental and may change in future versions
- Requires LM Studio to be installed and running
- Model list is populated from available LM Studio models
- Seed ensures reproducible results when set to same value
- load_for_seconds controls how long model stays in memory after generation
- Default prompt is optimized for detailed descriptions
- Currently has Ollama dependency in error handling (may be implementation bug)
- Supports all text-based LM Studio models

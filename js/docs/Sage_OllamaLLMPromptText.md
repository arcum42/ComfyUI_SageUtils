# Sage_OllamaLLMPromptText

**Ollama LLM Prompt (Text)**

Sends a text prompt to an Ollama LLM and returns the response.

## Inputs

### Required

- **prompt** (STRING): The text prompt to send to the model (multiline, default: detailed description prompt)
- **model** (STRING): The Ollama model to use (from available installed models)
- **seed** (INT): Seed for random number generation (default: 0, range: 0 to 2^32-1)
- **load_for_seconds** (FLOAT): Time in seconds to keep model loaded, -1 for indefinitely (default: 0.0, range: -1.0 to 3600.0)

## Outputs

- **response** (STRING): The LLM's text response to the prompt

## Usage

Use to generate text completions or responses from an Ollama LLM in your workflow. Requires Ollama to be installed and models to be available.

## Notes

- **EXPERIMENTAL**: This node is experimental and may change in future versions
- Requires Ollama to be installed and running
- Model list is populated from available Ollama models
- Seed ensures reproducible results when set to same value
- load_for_seconds controls how long model stays in memory after generation
- Default prompt is optimized for detailed descriptions
- Raises error if Ollama is not available or model not found
- Supports all text-based Ollama models

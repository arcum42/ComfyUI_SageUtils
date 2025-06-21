# Sage_ConstructLLMPromptExtra

**Construct LLM Prompt Extra**

Builds extra instructions for LLM prompts using advanced options not covered in the main prompt constructor.

## Inputs

### Required

- **extra_instructions** (STRING): Custom extra instructions to include (multiline, default: "")
- **Various advanced options** (BOOLEAN): Dynamic options for categories other than style, quality, and content_focus

## Outputs

- **extra** (STRING): The constructed extra instructions string

## Usage

Use to assemble advanced extra instructions for LLM nodes. This node provides access to additional prompt options not available in the main constructor.

## Notes

- **EXPERIMENTAL**: This node is experimental and may change in future versions
- Complements Sage_ConstructLLMPrompt by handling advanced options
- Options are loaded from llm_prompts.json configuration
- Only shows options NOT in style, quality, or content_focus categories
- Each enabled boolean option adds its associated prompt text
- Custom extra_instructions are prepended to the generated options
- Results can be combined with main prompt outputs
- Automatic formatting with proper line breaks and spacing

# Sage_ConstructLLMPrompt

**Construct LLM Prompt**

Builds a comprehensive prompt for use with LLM nodes based on predefined templates and customizable options.

## Inputs

### Required

- **prompt** (STRING): Base prompt template from available categories (multiline)
- **extra_instructions** (STRING): Additional custom instructions to append (multiline, default: "")
- **Various style/quality/content options** (BOOLEAN): Dynamic options based on available prompt extras (style, quality, content_focus categories)

## Outputs

- **prompt** (STRING): The constructed prompt ready for LLM use

## Usage

Use to assemble comprehensive prompts for LLM nodes in your workflow. Select from predefined prompt templates and add custom instructions and style options.

## Notes

- **EXPERIMENTAL**: This node is experimental and may change in future versions
- Prompt templates are loaded from llm_prompts.json configuration
- Available prompts are organized by category and shown as "category/prompt_name"
- Style, quality, and content focus options are dynamically generated based on configuration
- Ensures proper sentence-ending punctuation and formatting
- Extra instructions are appended after the base prompt and options
- Boolean options add their associated prompt text when enabled
- Prompt cannot be empty after construction

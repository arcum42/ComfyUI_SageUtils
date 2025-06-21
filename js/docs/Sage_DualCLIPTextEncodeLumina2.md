# Sage_DualCLIPTextEncodeLumina2

**Dual Prompt Encode (Lumina 2)**

Encodes positive and negative prompts using a CLIP model with Lumina 2-specific system prompts for enhanced image-text alignment.

## Inputs

### Required

- **clip** (CLIP): The CLIP model used for encoding the text
- **system_prompt** (STRING): Lumina 2 system prompt type selection
- **clean** (BOOLEAN): Clean up the text, getting rid of extra spaces, commas, etc. (default: False)

### Optional

- **pos** (STRING): The positive prompt's text (multiline, supports dynamic prompts)
- **neg** (STRING): The negative prompt's text (multiline, supports dynamic prompts)

## Outputs

- **pos_cond** (CONDITIONING): Conditioning containing the embedded positive text with system prompt
- **neg_cond** (CONDITIONING): Conditioning containing the embedded negative text with system prompt. If neg is not connected, it'll be automatically zeroed
- **pos_text** (STRING): The positive prompt text with system prompt prefix (cleaned if clean=True)
- **neg_text** (STRING): The negative prompt text with system prompt prefix (cleaned if clean=True)

## System Prompt Options

### Superior

"You are an assistant designed to generate superior images with the superior degree of image-text alignment based on textual prompts or user prompts."

### Alignment

"You are an assistant designed to generate high-quality images with the highest degree of image-text alignment based on textual prompts."

## Usage

Use for workflows that require Lumina 2 prompt encoding with specialized system prompts. The system prompts are automatically prepended to your prompts with `<Prompt Start>` delimiter.

## Notes

- Specifically designed for Lumina 2 model compatibility
- System prompts enhance image-text alignment quality
- Automatically formats prompts as: `{system_prompt} <Prompt Start> {user_prompt}`
- More efficient than using two separate CLIP Text Encoder nodes
- Automatically handles unconnected inputs by zeroing the conditioning
- Text cleaning removes extra spaces, commas, and formatting issues
- Supports dynamic prompts for both positive and negative inputs
- Progress bar shows encoding progress for both prompts
- Part of "Sage Utils/clip" category for conditioning operations

# Sage_DualCLIPTextEncode

**Dual Prompt Encode**

Encodes positive and negative prompts using a CLIP model, returning both conditionings and the input text with optional text cleaning.

## Inputs

### Required

- **clip** (CLIP): The CLIP model used for encoding the text
- **clean** (BOOLEAN): Clean up the text, getting rid of extra spaces, commas, etc. (default: False)

### Optional

- **pos** (STRING): The positive prompt's text (multiline, supports dynamic prompts)
- **neg** (STRING): The negative prompt's text (multiline, supports dynamic prompts)

## Outputs

- **positive** (CONDITIONING): Conditioning containing the embedded positive text used to guide the diffusion model
- **negative** (CONDITIONING): Conditioning containing the embedded negative text. If neg is not connected, it'll be automatically zeroed
- **pos_text** (STRING): The positive prompt text (cleaned if clean=True)
- **neg_text** (STRING): The negative prompt text (cleaned if clean=True)

## Usage

Use to generate conditioning for both positive and negative prompts in workflows. Saves space over two separate CLIP Text Encoders, and automatically zeros any input not connected.

## Notes

- More efficient than using two separate CLIP Text Encoder nodes
- Automatically handles unconnected inputs by zeroing the conditioning
- Text cleaning removes extra spaces, commas, and formatting issues
- Supports dynamic prompts for both positive and negative inputs
- Progress bar shows encoding progress for both prompts
- Part of "Sage Utils/clip" category for conditioning operations
- Returns both the conditioning tensors and the original text for further processing

# Sage_HiDreamE1_Instruction

**HiDreamE1 Instruction**

Generates a formatted prompt for HiDream E1 models based on instruction and description inputs.

## Inputs

- **instruction** (STRING, required): The instruction text for the model
- **description** (STRING, required): The description text for the model

## Outputs

- **prompt** (STRING): Formatted prompt combining instruction and description

## Usage

Use to create properly formatted prompts for HiDream E1 models. The node takes separate instruction and description inputs and combines them into the specific format expected by HiDream E1.

## Notes

- Both instruction and description inputs are required and cannot be empty
- Text inputs are automatically cleaned (whitespace trimmed, etc.)
- If the instruction doesn't end with a period, one is automatically added
- Output format: "Instruction: {instruction}\nDescription: {description}"
- Designed specifically for HiDream E1 model prompt formatting requirements

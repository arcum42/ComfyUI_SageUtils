# Sage_SetText

**Set Text**

Sets and outputs a text string with optional prefix and suffix. Useful for providing static or user-defined text to workflows.

## Inputs

### Required

- **str** (STRING): The main text string to output

### Optional

- **prefix** (STRING): Text to add before the main string
- **suffix** (STRING): Text to add after the main string

## Outputs

- **str** (STRING): The combined text string (prefix + str + suffix)

## Usage

Connect to nodes that require a text input, such as prompt or metadata nodes. The node combines prefix, main text, and suffix into a single output string.

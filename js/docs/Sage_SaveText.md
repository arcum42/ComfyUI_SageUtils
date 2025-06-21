# Sage_SaveText

## Description
A utility node for saving text content to a file. This node allows you to write text strings to files on disk, useful for logging, debugging, or storing generated content.

## Inputs
- **text** (STRING): The text content to save to file
- **filename** (STRING): The name/path of the file where the text will be saved
- **append** (BOOLEAN): Whether to append to existing file (True) or overwrite (False)

## Outputs
- **text** (STRING): Passthrough of the input text
- **filepath** (STRING): The full path of the saved file

## Usage
This node is helpful for:
- Saving generated prompts or text to files
- Creating logs of your workflow outputs
- Storing intermediate text results for later use
- Debugging by writing node outputs to files

## Notes
- If the specified directory doesn't exist, it will be created automatically
- When append is False, the file will be completely overwritten
- When append is True, new text is added to the end of the existing file
- The node passes through the input text, so it can be chained with other text processing nodes

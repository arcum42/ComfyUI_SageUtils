# Sage_SaveText

## Description

A utility node for saving text content to a file. This node allows you to write text strings to files on disk with customizable filename and extension.

## Inputs

### Required

- **filename_prefix** (STRING): The prefix for the file to save (default: "ComfyUI_Text"). This may include formatting information such as %date:yyyy-MM-dd% to include values from nodes.
- **file_extension** (STRING): The file extension to use for the saved file (default: "txt")
- **text** (STRING): The text content to save to file

## Outputs

- **filepath** (STRING): The full path of the saved file

## Usage

This node is helpful for:

- Saving generated prompts or text to files
- Creating logs of your workflow outputs
- Storing intermediate text results for later use
- Debugging by writing node outputs to files

## Notes

- The filename prefix supports formatting patterns for dynamic naming
- File extension can be specified with or without the leading dot
- A counter will be added to the end of the filename, based on how many files with that name there are.
- If the file path is invalid, an error will be raised

# Sage_ViewAnything

**View Any Node as Text**

Displays the output of any node as text in the UI and returns it as a string. This is an output node useful for debugging, inspecting non-string outputs, and visualizing data flow.

## Inputs

### Required

- **any** (ANY): The value to display as text (accepts any data type, including lists)

## Outputs

- **STRING**: The converted text representation of the input

## Usage

Connect to any node to visualize its output as a string. This node:

- Accepts any data type as input
- Handles both single values and lists
- Displays the result in the ComfyUI interface
- Returns the text representation for use in other nodes
- Is particularly useful for debugging and data inspection

## Notes

- This is an output node that displays results in the UI
- When input is a list, each item is displayed on a new line
- The node converts any input type to its string representation

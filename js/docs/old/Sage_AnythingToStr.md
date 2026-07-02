# Sage_AnythingToStr

**Anything to String**

Converts any incoming value to a string and outputs it without rendering preview text in the UI.

## Category

- **Sage Utils/text/util**

## Inputs

### Required

- **any** (ANY): Any input value, including strings, numbers, lists, or custom types

## Outputs

- **STRING**: String representation of the input value

## Usage

Use this node when you need string conversion for downstream nodes but do not want an output display node. This node:

- Accepts any input type
- Converts non-list values with standard string conversion
- Converts lists by joining each item as a line
- Outputs only the string value (no preview panel)

## Notes

- Unlike Sage_ViewAnything, this node is not an output display node
- For list inputs, items are joined with newline separators

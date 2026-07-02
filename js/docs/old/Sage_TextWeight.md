# Sage_TextWeight

**Text Weight**

Applies a weight to a text string for prompt conditioning.

## Inputs

- **text** (STRING, required): The text string to apply weight to
- **weight** (FLOAT, required): The weight value to apply
  - Default: 1.0
  - Range: -10.0 to 10.0
  - Step: 0.05

## Outputs

- **weighted_text** (STRING): The text wrapped in weight syntax with trailing comma

## Usage

Use to emphasize or de-emphasize parts of a prompt by applying numerical weights. The node formats the text in the standard prompt weighting syntax `(text:weight),` which is recognized by most AI image generation models.

## Notes

- Weights greater than 1.0 emphasize the text (make it stronger)
- Weights less than 1.0 de-emphasize the text (make it weaker)
- Weight is formatted to 2 decimal places
- Output includes trailing comma for easy prompt concatenation
- Standard prompt weighting syntax: `(text:weight),`

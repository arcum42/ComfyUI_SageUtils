# SageSetWildcardText

## Description

A text processing node that supports wildcard functionality for dynamic text generation. This node allows you to use wildcard patterns in text that can be randomly selected or processed to create varied outputs.

## Inputs

### Required

- **str** (STRING): The input text containing wildcard patterns
- **seed** (INT): Random seed for consistent wildcard selection (default: 0, range: 0 to 4294967295)
- **clean** (BOOLEAN): Whether to clean the output text (default: False)

### Optional

- **prefix** (STRING): Text to add before the main string
- **suffix** (STRING): Text to add after the main string

## Outputs

- **str** (STRING): The processed text with wildcards resolved

## Usage

This node is useful for:

- Creating varied prompts with random elements
- Dynamic text generation with predefined choices
- Adding randomness to your workflow text outputs
- Supporting wildcard syntax like {option1|option2|option3}

## Wildcard Syntax

- Use curly braces to define wildcard groups: `{option1|option2|option3}`
- Separate options with pipe characters `|`
- Can be nested for complex combinations
- Supports file-based wildcards if wildcard files are available

## Notes

- The seed parameter ensures reproducible results when using the same seed value
- Without a seed, wildcards will be randomly selected each time
- This node extends the basic text functionality with wildcard processing capabilities
- Compatible with standard wildcard formats used in other AI art tools

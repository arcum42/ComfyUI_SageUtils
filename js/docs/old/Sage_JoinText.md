# Sage_JoinText

**Join Text**

Joins two text strings together with a customizable separator. Useful for building prompts or metadata with controlled formatting.

## Inputs

### Required

- **separator** (STRING): The separator to use between strings (default: ', ')
- **add_separator_to_end** (BOOLEAN): Whether to add separator to the end of the joined string (default: False)
- **str1** (STRING): First string to join
- **str2** (STRING): Second string to join

## Outputs

- **str** (STRING): The joined string with separator

## Usage

Use to concatenate text for prompts, metadata, or other string fields. The separator parameter allows you to control how the strings are joined (comma, space, newline, etc.), and the add_separator_to_end option lets you append the separator to the final result.

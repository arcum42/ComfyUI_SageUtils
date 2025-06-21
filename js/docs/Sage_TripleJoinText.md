# Sage_TripleJoinText

**Join Text x3**

Joins three text strings together with a customizable separator. Useful for building complex prompts or metadata with controlled formatting.

## Inputs

### Required

- **separator** (STRING): The separator to use between strings (default: ', ')
- **add_separator_to_end** (BOOLEAN): Whether to add separator to the end of the joined string (default: False)
- **str1** (STRING): First string to join
- **str2** (STRING): Second string to join
- **str3** (STRING): Third string to join

## Outputs

- **str** (STRING): The joined string with separator

## Usage

Use to concatenate multiple text fields for prompts or metadata. The separator parameter allows you to control how the strings are joined (comma, space, newline, etc.), and the add_separator_to_end option lets you append the separator to the final result.

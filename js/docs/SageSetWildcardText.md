---
type: NodeDoc
title: Text w/ Dynamic Prompts
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# Text w/ Dynamic Prompts

* **Node ID:** `SageSetWildcardText`
* **Category:** `Sage Utils/text/input`

Loads user defined wildcard from the wildcards directory, and applies them to any wildcards in the text using the dynamic prompts library.

## Inputs

### `str_input` — `STRING`
- **Name:** `str`
- **Description:** Text containing dynamic prompt wildcards.

### `seed` — `INT`
- **Name:** `seed`
- **Description:** Seed for wildcard generation.

### `clean` — `BOOLEAN`
- **Name:** `clean`
- **Description:** Remove unwanted whitespace or formatting after prompt generation.

### `prefix` — `STRING` (optional)
- **Name:** `prefix`
- **Description:** Text to prepend before dynamic prompt expansion.

### `suffix` — `STRING` (optional)
- **Name:** `suffix`
- **Description:** Text to append after dynamic prompt expansion.


## Outputs

### `str_output` — `STRING`
- **Name:** `str`
- **Description:** Output value for str_output.


## Notes



Generated from the node schema.

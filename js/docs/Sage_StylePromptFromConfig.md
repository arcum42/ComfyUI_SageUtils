---
type: NodeDoc
title: Style Prompt From Config
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# Style Prompt From Config

* **Node ID:** `Sage_StylePromptFromConfig`
* **Category:** `Sage Utils/text/prompt/style`

Builds positive and negative prompts from sage_styles.json. If a style template contains {prompt}, your input is inserted there; otherwise your input is appended with ', '.

## Inputs

### `model` — `COMFY_DYNAMICCOMBO_V3`
- **Description:** Input value for model.

### `style` — `COMBO`
- **Name:** `style`
- **Description:** Input value for style.

### `style` — `COMBO`
- **Name:** `style`
- **Description:** Input value for style.

### `style` — `COMBO`
- **Name:** `style`
- **Description:** Input value for style.

### `positive` — `STRING`
- **Name:** `positive`
- **Description:** User positive prompt text to insert into the style template (or append if no {prompt} token exists).

### `negative` — `STRING`
- **Name:** `negative`
- **Description:** User negative prompt text to insert into the style template (or append if no {prompt} token exists).


## Outputs

### `positive_prompt` — `STRING`
- **Name:** `positive_prompt`
- **Description:** The generated positive prompt string.

### `negative_prompt` — `STRING`
- **Name:** `negative_prompt`
- **Description:** The generated negative prompt string.


## Notes



Generated from the node schema.

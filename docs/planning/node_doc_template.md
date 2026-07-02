---
type: Template
title: Sage Utils Node Documentation Template
description: Markdown template for automatically generating Sage Utils node documentation in js/docs.
tags: [planning, docs, nodes, template]
timestamp: 2026-07-01T00:00:00Z
---

# {{display_name}}

* **Node ID:** `{{node_id}}`
* **Category:** `{{category}}`

{{description}}

## Inputs

{{#inputs}}
### `{{name}}` — `{{type}}`
- **Name:** `{{display_name}}`
- **Description:** {{description}}
- **Optional:** {{optional}}

{{/inputs}}

## Outputs

{{#outputs}}
### `{{name}}` — `{{type}}`
- **Name:** `{{display_name}}`
- **Description:** {{description}}
- **List output:** {{is_output_list}}

{{/outputs}}

## Notes

- Replace placeholder values with the actual schema values for each node.
- If a node has no inputs or outputs, omit the corresponding section or leave a short note.
- Use this template as the base for generating `js/docs/<NodeName>.md` files.

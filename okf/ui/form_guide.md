---
type: Guide
title: Form Component Guide
description: Guide to Sage Utils form elements and layout components.
resource: docs/FORM_ELEMENTS_GUIDE.md
tags: [ui, components, form, guide, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents the Sage Utils form element APIs and common patterns for building consistent UI controls.

## Core APIs

- `createInput(options)` — styled text or number input.
- `createSelect(options)` — dropdown selection control.
- `createTextarea(options)` — multi-line text entry.
- `createCheckbox(options)` — boolean toggle.
- `createSlider(options)` — numeric slider control.
- `createRadioGroup(options)` — group of radio buttons.
- `createFormRow(label, control)` — horizontal label/control row.
- `createFormGroup(title, rows)` — grouped section of related inputs.

## Typical options

- `type` — input type such as `text`, `number`, `email`.
- `placeholder` — hint text for inputs.
- `value` — initial value.
- `min`, `max`, `step` — slider and number input constraints.
- `className` — additional CSS classes.
- `onInput`, `onChange`, `onKeydown` — event handlers.
- `ariaLabel` — accessibility label.

## Use cases

- Use `createInput` for model names, prompt text, and configuration fields.
- Use `createSelect` for provider and model selection.
- Use `createTextarea` for prompt editing and system prompt entry.
- Use `createSlider` for temperature, top-p, and other ranged numeric settings.

## Accessibility

- Always provide `ariaLabel` for inputs with non-obvious purpose.
- Use `createFormRow` to associate labels and controls visually and semantically.
- Keep keyboard interaction consistent with native form patterns.

For implementation examples and more API details, see `docs/FORM_ELEMENTS_GUIDE.md`.

---
type: Guide
title: Button Component Guide
description: Guide to Sage Utils button components and usage.
resource: docs/BUTTON_COMPONENT_GUIDE.md
tags: [ui, components, button, guide, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents Sage Utils button components, including creation APIs, variants, and accessibility patterns.

## Core APIs

- `createButton(text, options)` — create a standard button.
- `createIconButton(text, options)` — create a button with an icon.
- `createButtonGroup(buttons, options)` — group buttons together.
- `createConfigButton(options)` — create a button that opens configuration actions.

## Common usage

- Use `BUTTON_VARIANTS.SUCCESS` for positive actions.
- Use `BUTTON_VARIANTS.DANGER` for destructive or stop actions.
- Use `BUTTON_VARIANTS.INFO` for informational commands.
- Override colors with `options.color` for custom branding.

## Accessibility

- Provide `ariaLabel` when button text is not descriptive.
- Keep focus order logical within forms and dialogs.
- Use icon buttons only when paired with text labels or accessible labels.

## Examples

```javascript
const saveBtn = createButton('Save', {
  variant: BUTTON_VARIANTS.SUCCESS,
  onClick: () => saveWorkflow(),
});

const refreshBtn = createIconButton('Refresh', {
  icon: '🔄',
  variant: BUTTON_VARIANTS.INFO,
});
```

For implementation details and additional examples, see `docs/BUTTON_COMPONENT_GUIDE.md`.

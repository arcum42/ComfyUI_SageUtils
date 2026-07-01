---
type: Guide
title: Button Component Guide
description: Guide to Sage Utils button components and usage.
resource: docs/deprecated/BUTTON_COMPONENT_GUIDE.md
tags: [ui, components, button, guide, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents Sage Utils button components, usage patterns, and example code.

> Note: This content was migrated from `docs/BUTTON_COMPONENT_GUIDE.md`. It should be reviewed against `js/components/buttons.js` for current implementation accuracy.

## Import

```javascript
import {
  createButton,
  createIconButton,
  createButtonGroup,
  createConfigButton,
  BUTTON_VARIANTS,
  BUTTON_SIZES,
  BUTTON_CONFIGS,
} from '../components/buttons.js';
```

## Basic Usage

### Simple Button

```javascript
const button = createButton('Click Me');
```

### Button with Variant

```javascript
const saveBtn = createButton('Save', {
  variant: BUTTON_VARIANTS.SUCCESS,
});

const deleteBtn = createButton('Delete', {
  variant: BUTTON_VARIANTS.DANGER,
});
```

### Button with Click Handler

```javascript
const refreshBtn = createButton('Refresh', {
  variant: BUTTON_VARIANTS.INFO,
  onClick: () => {
    console.log('Refreshing...');
  },
});
```

### Button with Icon

```javascript
const saveBtn = createButton('Save', {
  variant: BUTTON_VARIANTS.SUCCESS,
  icon: '💾',
});
```

### Button with Custom Color

```javascript
const customBtn = createButton('Custom', {
  color: '#9C27B0',
});
```

## Sizes

```javascript
const smallBtn = createButton('Small', {
  size: BUTTON_SIZES.SMALL,
});

const mediumBtn = createButton('Medium', {
  size: BUTTON_SIZES.MEDIUM,
});

const largeBtn = createButton('Large', {
  size: BUTTON_SIZES.LARGE,
});
```

## Variants

```javascript
const variants = {
  primary: createButton('Primary', { variant: BUTTON_VARIANTS.PRIMARY }),
  secondary: createButton('Secondary', { variant: BUTTON_VARIANTS.SECONDARY }),
  success: createButton('Success', { variant: BUTTON_VARIANTS.SUCCESS }),
  warning: createButton('Warning', { variant: BUTTON_VARIANTS.WARNING }),
  danger: createButton('Danger', { variant: BUTTON_VARIANTS.DANGER }),
  info: createButton('Info', { variant: BUTTON_VARIANTS.INFO }),
};
```

## Pre-configured Buttons

Use `createConfigButton()` for common actions:

```javascript
const refreshBtn = createConfigButton('refresh');
const pullBtn = createConfigButton('pull');
const editBtn = createConfigButton('edit');
const scanBtn = createConfigButton('scan');
const reportBtn = createConfigButton('report');
const saveBtn = createConfigButton('save');
const deleteBtn = createConfigButton('delete');
const cancelBtn = createConfigButton('cancel');
const confirmBtn = createConfigButton('confirm');
```

### Override Config Options

```javascript
const saveBtn = createConfigButton('save', {
  onClick: () => saveFile(),
  disabled: true,
});
```

## Icon Buttons

```javascript
const editIcon = createIconButton('✏️', {
  variant: BUTTON_VARIANTS.WARNING,
  title: 'Edit item',
});

const deleteIcon = createIconButton('🗑️', {
  variant: BUTTON_VARIANTS.DANGER,
  title: 'Delete item',
});
```

## Button Groups

```javascript
const saveBtn = createButton('Save', { variant: BUTTON_VARIANTS.SUCCESS });
const cancelBtn = createButton('Cancel', { variant: BUTTON_VARIANTS.SECONDARY });
const deleteBtn = createButton('Delete', { variant: BUTTON_VARIANTS.DANGER });

const buttonGroup = createButtonGroup([saveBtn, cancelBtn, deleteBtn], {
  gap: '8px',
  marginTop: '16px',
  wrap: true,
});

container.appendChild(buttonGroup);
```

## Advanced Options

```javascript
const button = createButton('Advanced', {
  variant: BUTTON_VARIANTS.PRIMARY,
  size: BUTTON_SIZES.MEDIUM,
  icon: '🚀',
  color: '#custom',
  onClick: () => {},
  disabled: false,
  id: 'my-button-id',
  className: 'my-button',
  title: 'Tooltip text',
  hoverEffect: true,
  marginTop: '8px',
  style: {
    fontWeight: 'bold',
    borderRadius: '8px',
  },
});
```

## Button with ID

```javascript
const searchBtn = createButton('Search', {
  id: 'search-button',
  variant: BUTTON_VARIANTS.SUCCESS,
});
```

## Disabled Button

```javascript
const disabledBtn = createButton('Disabled', {
  disabled: true,
  variant: BUTTON_VARIANTS.SUCCESS,
});
```

## No Hover Effect

```javascript
const staticBtn = createButton('Static', {
  hoverEffect: false,
});
```

## Custom Margin

```javascript
const noMarginBtn = createButton('No Margin', {
  marginTop: '0',
});
```

## Complete Examples

### File Browser Action Buttons

```javascript
const actions = document.createElement('div');
actions.style.cssText = 'display: flex; gap: 8px;';

if (allowCreate) {
  const createBtn = createButton('Create File', {
    variant: BUTTON_VARIANTS.SUCCESS,
    size: 'small',
    marginTop: '0',
    onClick: () => this.callbacks.onFileCreate(),
  });
  actions.appendChild(createBtn);
}

const refreshBtn = createButton('Refresh', {
  variant: BUTTON_VARIANTS.WARNING,
  size: 'small',
  marginTop: '0',
  onClick: () => this.loadFiles(),
});
actions.appendChild(refreshBtn);
```

### File Editor Buttons

```javascript
const saveBtn = createButton('Save', {
  variant: BUTTON_VARIANTS.SUCCESS,
  icon: '💾',
  disabled: true,
  onClick: () => this.saveFile(),
});

const deleteBtn = createButton('Delete', {
  variant: BUTTON_VARIANTS.DANGER,
  icon: '🗑️',
  disabled: true,
  onClick: async () => {
    if (confirm('Delete this file?')) {
      await this.deleteFile();
    }
  },
});
```

### Modal Dialog Buttons

```javascript
const confirmBtn = createButton('Confirm', {
  variant: BUTTON_VARIANTS.PRIMARY,
  icon: '✓',
  onClick: () => {
    dialog.close();
    onConfirm();
  },
});

const cancelBtn = createButton('Cancel', {
  variant: BUTTON_VARIANTS.SECONDARY,
  icon: '✖',
  onClick: () => dialog.close(),
});

const buttonGroup = createButtonGroup([confirmBtn, cancelBtn], {
  gap: '12px',
  marginTop: '20px',
});

dialog.appendChild(buttonGroup);
```

## Migration from Old Patterns

### From `createStyledButton()`

```javascript
const btn = createStyledButton('Save', '#4CAF50', '💾');
```

becomes:

```javascript
const btn = createButton('Save', {
  variant: BUTTON_VARIANTS.SUCCESS,
  icon: '💾',
});
```

### From `createActionButton()`

```javascript
const btn = this.createActionButton('Delete', '#f44336', () => {
  this.deleteFile();
});
```

becomes:

```javascript
const btn = createButton('Delete', {
  variant: BUTTON_VARIANTS.DANGER,
  size: 'small',
  onClick: () => this.deleteFile(),
});
```

### From Manual Button Creation

```javascript
const button = document.createElement('button');
button.textContent = 'Save';
button.style.cssText = `
  background: #4CAF50;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
`;
button.addEventListener('click', () => save());
```

becomes:

```javascript
const button = createButton('Save', {
  variant: BUTTON_VARIANTS.SUCCESS,
  onClick: () => save(),
});
```

## Style Customization

### Override Individual Styles

```javascript
const button = createButton('Custom', {
  variant: BUTTON_VARIANTS.PRIMARY,
  style: {
    borderRadius: '20px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    minWidth: '120px',
  },
});
```

### Use Custom Colors with Variants

```javascript
const purpleBtn = createButton('Custom Purple', {
  color: '#9C27B0',
  size: BUTTON_SIZES.LARGE,
});
```

## Available Constants

### BUTTON_VARIANTS

```javascript
BUTTON_VARIANTS = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  SUCCESS: 'success',
  WARNING: 'warning',
  DANGER: 'danger',
  INFO: 'info',
};
```

### BUTTON_SIZES

```javascript
BUTTON_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
};
```

### BUTTON_CONFIGS

```javascript
BUTTON_CONFIGS = {
  refresh: { text: 'Refresh', variant: BUTTON_VARIANTS.SUCCESS, icon: '↻' },
  pull: { text: 'Pull', variant: BUTTON_VARIANTS.INFO, icon: '⬇' },
  edit: { text: 'Edit', variant: BUTTON_VARIANTS.WARNING, icon: '✏' },
  scan: { text: 'Scan All', color: '#9C27B0', icon: '🔍' },
  report: { text: 'Generate Report', color: '#673AB7', icon: '📊' },
  save: { text: 'Save', variant: BUTTON_VARIANTS.SUCCESS, icon: '💾' },
  delete: { text: 'Delete', variant: BUTTON_VARIANTS.DANGER, icon: '🗑️' },
  cancel: { text: 'Cancel', variant: BUTTON_VARIANTS.SECONDARY, icon: '✖' },
  confirm: { text: 'Confirm', variant: BUTTON_VARIANTS.PRIMARY, icon: '✓' },
};
```

## Best Practices

- Use `variant` over `color` for consistency
- Use `createConfigButton()` for common buttons
- Group related buttons with `createButtonGroup()`
- Add `title` for tooltips on icon buttons
- Disable buttons with `disabled: true`
- Set `marginTop: '0'` inside flex containers

## Common Patterns

### Conditional Button

```javascript
const button = allowEdit
  ? createConfigButton('edit', { onClick: () => edit() })
  : createButton('View', { variant: BUTTON_VARIANTS.INFO });
```

### Toggle Button State

```javascript
function setModified(isModified) {
  saveBtn.disabled = !isModified;
}
```

### Dynamic Button Group

```javascript
const buttons = [];
if (allowSave) buttons.push(createConfigButton('save', { onClick: save }));
if (allowDelete) buttons.push(createConfigButton('delete', { onClick: del }));
buttons.push(createConfigButton('cancel', { onClick: cancel }));
const group = createButtonGroup(buttons);
```

## Notes

This content was migrated from `docs/BUTTON_COMPONENT_GUIDE.md`. Review it against `js/components/buttons.js` for current implementation details.

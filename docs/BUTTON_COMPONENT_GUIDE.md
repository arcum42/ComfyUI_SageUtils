# Button Component Quick Reference

**Component:** `js/components/buttons.js`  
**Status:** ✅ Ready to Use  
**Updated:** October 12, 2025

---

## Import

```javascript
import { 
    createButton, 
    createIconButton, 
    createButtonGroup,
    createConfigButton,
    BUTTON_VARIANTS, 
    BUTTON_SIZES,
    BUTTON_CONFIGS 
} from '../components/buttons.js';
```

---

## Basic Usage

### Simple Button

```javascript
const button = createButton('Click Me');
```

### Button with Variant

```javascript
const saveBtn = createButton('Save', {
    variant: BUTTON_VARIANTS.SUCCESS
});

const deleteBtn = createButton('Delete', {
    variant: BUTTON_VARIANTS.DANGER
});
```

### Button with Click Handler

```javascript
const refreshBtn = createButton('Refresh', {
    variant: BUTTON_VARIANTS.INFO,
    onClick: () => {
        console.log('Refreshing...');
    }
});
```

### Button with Icon

```javascript
const saveBtn = createButton('Save', {
    variant: BUTTON_VARIANTS.SUCCESS,
    icon: '💾'
});
// Result: "💾 Save"
```

### Button with Custom Color

```javascript
const customBtn = createButton('Custom', {
    color: '#9C27B0'  // Overrides variant
});
```

---

## Sizes

```javascript
const smallBtn = createButton('Small', {
    size: BUTTON_SIZES.SMALL  // 11px font, 4px 8px padding
});

const mediumBtn = createButton('Medium', {
    size: BUTTON_SIZES.MEDIUM  // 12px font, 6px 12px padding (default)
});

const largeBtn = createButton('Large', {
    size: BUTTON_SIZES.LARGE  // 14px font, 8px 16px padding
});
```

---

## Variants

```javascript
const variants = {
    primary: createButton('Primary', { variant: BUTTON_VARIANTS.PRIMARY }),     // Blue #2196F3
    secondary: createButton('Secondary', { variant: BUTTON_VARIANTS.SECONDARY }), // Gray #757575
    success: createButton('Success', { variant: BUTTON_VARIANTS.SUCCESS }),     // Green #4CAF50
    warning: createButton('Warning', { variant: BUTTON_VARIANTS.WARNING }),     // Orange #FF9800
    danger: createButton('Danger', { variant: BUTTON_VARIANTS.DANGER }),       // Red #f44336
    info: createButton('Info', { variant: BUTTON_VARIANTS.INFO })             // Cyan #00BCD4
};
```

---

## Pre-configured Buttons

Use `createConfigButton()` for common buttons:

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
    disabled: true
});
```

---

## Icon Buttons

Icon-only buttons (no text):

```javascript
const editIcon = createIconButton('✏️', {
    variant: BUTTON_VARIANTS.WARNING,
    title: 'Edit item'
});

const deleteIcon = createIconButton('🗑️', {
    variant: BUTTON_VARIANTS.DANGER,
    title: 'Delete item'
});
```

---

## Button Groups

Multiple buttons in a row:

```javascript
const saveBtn = createButton('Save', { variant: BUTTON_VARIANTS.SUCCESS });
const cancelBtn = createButton('Cancel', { variant: BUTTON_VARIANTS.SECONDARY });
const deleteBtn = createButton('Delete', { variant: BUTTON_VARIANTS.DANGER });

const buttonGroup = createButtonGroup([saveBtn, cancelBtn, deleteBtn], {
    gap: '8px',
    marginTop: '16px',
    wrap: true
});

container.appendChild(buttonGroup);
```

---

## Advanced Options

### All Available Options

```javascript
const button = createButton('Advanced', {
    // Appearance
    variant: BUTTON_VARIANTS.PRIMARY,  // Button variant
    size: BUTTON_SIZES.MEDIUM,         // Button size
    icon: '🚀',                        // Icon/emoji to prepend
    color: '#custom',                  // Custom color (overrides variant)
    
    // Behavior
    onClick: () => {},                 // Click handler
    disabled: false,                   // Disabled state
    
    // Attributes
    id: 'my-button-id',                // Element ID
    className: 'my-button',            // Additional CSS class
    title: 'Tooltip text',             // Tooltip
    
    // Styling
    hoverEffect: true,                 // Enable hover opacity (default: true)
    marginTop: '8px',                  // Top margin (default: '8px')
    
    // Custom overrides
    style: {                           // Any CSS style overrides
        fontWeight: 'bold',
        borderRadius: '8px'
    }
});
```

### Button with ID

```javascript
const searchBtn = createButton('Search', {
    id: 'search-button',
    variant: BUTTON_VARIANTS.SUCCESS
});
// Can now be found with: document.getElementById('search-button')
```

### Disabled Button

```javascript
const disabledBtn = createButton('Disabled', {
    disabled: true,
    variant: BUTTON_VARIANTS.SUCCESS
});
// Automatically: cursor: not-allowed, opacity: 0.6, click handler disabled
```

### No Hover Effect

```javascript
const staticBtn = createButton('Static', {
    hoverEffect: false
});
```

### Custom Margin

```javascript
const noMarginBtn = createButton('No Margin', {
    marginTop: '0'
});
```

---

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
        onClick: () => this.callbacks.onFileCreate()
    });
    actions.appendChild(createBtn);
}

const refreshBtn = createButton('Refresh', {
    variant: BUTTON_VARIANTS.WARNING,
    size: 'small',
    marginTop: '0',
    onClick: () => this.loadFiles()
});
actions.appendChild(refreshBtn);
```

### File Editor Buttons

```javascript
const saveBtn = createButton('Save', {
    variant: BUTTON_VARIANTS.SUCCESS,
    icon: '💾',
    disabled: true,
    onClick: () => this.saveFile()
});

const deleteBtn = createButton('Delete', {
    variant: BUTTON_VARIANTS.DANGER,
    icon: '🗑️',
    disabled: true,
    onClick: async () => {
        if (confirm('Delete this file?')) {
            await this.deleteFile();
        }
    }
});

// Enable when file is loaded
this.currentFile = file;
saveBtn.disabled = false;
deleteBtn.disabled = false;
```

### Modal Dialog Buttons

```javascript
const confirmBtn = createButton('Confirm', {
    variant: BUTTON_VARIANTS.PRIMARY,
    icon: '✓',
    onClick: () => {
        dialog.close();
        onConfirm();
    }
});

const cancelBtn = createButton('Cancel', {
    variant: BUTTON_VARIANTS.SECONDARY,
    icon: '✖',
    onClick: () => dialog.close()
});

const buttonGroup = createButtonGroup([confirmBtn, cancelBtn], {
    gap: '12px',
    marginTop: '20px'
});

dialog.appendChild(buttonGroup);
```

---

## Migration from Old Patterns

### From `createStyledButton()`

```javascript
// OLD ❌
const btn = createStyledButton('Save', '#4CAF50', '💾');

// NEW ✅
const btn = createButton('Save', {
    variant: BUTTON_VARIANTS.SUCCESS,
    icon: '💾'
});

// OR use config ✅
const btn = createConfigButton('save');
```

### From `createActionButton()`

```javascript
// OLD ❌
const btn = this.createActionButton('Delete', '#f44336', () => {
    this.deleteFile();
});

// NEW ✅
const btn = createButton('Delete', {
    variant: BUTTON_VARIANTS.DANGER,
    size: 'small',
    onClick: () => this.deleteFile()
});

// OR use config ✅
const btn = createConfigButton('delete', {
    size: 'small',
    onClick: () => this.deleteFile()
});
```

### From Manual Button Creation

```javascript
// OLD ❌
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

// NEW ✅
const button = createButton('Save', {
    variant: BUTTON_VARIANTS.SUCCESS,
    onClick: () => save()
});
```

---

## Style Customization

### Override Individual Styles

```javascript
const button = createButton('Custom', {
    variant: BUTTON_VARIANTS.PRIMARY,
    style: {
        borderRadius: '20px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        minWidth: '120px'
    }
});
```

### Use Custom Colors with Variants

```javascript
// Purple button with all variant features
const purpleBtn = createButton('Custom Purple', {
    color: '#9C27B0',
    size: BUTTON_SIZES.LARGE
});
```

---

## Available Constants

### BUTTON_VARIANTS

```javascript
BUTTON_VARIANTS = {
    PRIMARY: 'primary',      // #2196F3
    SECONDARY: 'secondary',  // #757575
    SUCCESS: 'success',      // #4CAF50
    WARNING: 'warning',      // #FF9800
    DANGER: 'danger',        // #f44336
    INFO: 'info'            // #00BCD4
}
```

### BUTTON_SIZES

```javascript
BUTTON_SIZES = {
    SMALL: 'small',    // 11px, 4px 8px
    MEDIUM: 'medium',  // 12px, 6px 12px (default)
    LARGE: 'large'     // 14px, 8px 16px
}
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
    confirm: { text: 'Confirm', variant: BUTTON_VARIANTS.PRIMARY, icon: '✓' }
}
```

---

## Best Practices

1. **Use Variants:** Prefer `variant` over custom `color` for consistency
2. **Use Configs:** Use `createConfigButton()` for common buttons
3. **Group Buttons:** Use `createButtonGroup()` for multiple related buttons
4. **Set Titles:** Add `title` for tooltips on icon buttons
5. **Disable Properly:** Use `disabled: true` instead of manual opacity changes
6. **Reset Margins:** Set `marginTop: '0'` when inside flex containers

---

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
    // Disabled state automatically handles opacity
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

---

**Need Help?** Check the main component documentation in `components/buttons.js`


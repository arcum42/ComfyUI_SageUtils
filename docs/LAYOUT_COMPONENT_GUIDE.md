# Layout Component Guide

## Overview

The `layout.js` component library provides a comprehensive set of reusable layout utilities for creating consistent, responsive UI structures. These components eliminate the need for repetitive CSS and provide a clean, functional API for common layout patterns.

**Location:** `js/components/layout.js`

## When to Use Layout Components

Use layout components when you need:
- Consistent spacing and alignment across UI elements
- Responsive grids that adapt to container size
- Flex or grid layouts without writing repetitive CSS
- Cards with headers and actions
- Collapsible sections
- Split panes with optional resizing
- Scrollable containers
- Centered content areas

## Component Overview

| Function | Purpose | Common Use Cases |
|----------|---------|------------------|
| `createFlexContainer()` | Flexible box layout | Toolbars, button groups, form rows |
| `createGrid()` | CSS Grid layout | Model cards, image galleries, dashboards |
| `createResponsiveGrid()` | Auto-fitting grid | Thumbnail grids, product lists |
| `createCard()` | Card with title/actions | Settings panels, info displays |
| `createSection()` | Titled section | Organizing content areas |
| `createScrollContainer()` | Scrollable area | Long lists, log outputs |
| `createSplitPane()` | Two-column layout | File browser, preview panes |
| `createCenteredContainer()` | Centered content | Forms, dialogs, main content |
| `createStack()` | Vertical list | Form fields, menu items |
| `createInline()` | Horizontal list | Tags, badges, action buttons |

---

## API Reference

### createFlexContainer(options)

Creates a flexbox container with common configurations.

**Parameters:**
```javascript
{
    direction: 'row' | 'column' | 'row-reverse' | 'column-reverse',  // default: 'row'
    justify: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly',  // default: 'flex-start'
    align: 'stretch' | 'flex-start' | 'flex-end' | 'center' | 'baseline',  // default: 'stretch'
    gap: string,          // default: '0'
    wrap: boolean,        // default: false
    padding: string,      // default: '0'
    background: string,   // default: 'transparent'
    className: string,
    style: object,
    children: HTMLElement[]
}
```

**Returns:** `HTMLElement`

**Examples:**

```javascript
import { createFlexContainer } from '../components/layout.js';

// Horizontal button row
const buttonRow = createFlexContainer({
    direction: 'row',
    gap: '8px',
    align: 'center'
});

// Vertical form layout
const formLayout = createFlexContainer({
    direction: 'column',
    gap: '16px',
    padding: '20px'
});

// Space-between toolbar
const toolbar = createFlexContainer({
    direction: 'row',
    justify: 'space-between',
    align: 'center',
    padding: '12px',
    background: '#2a2a2a'
});

// Centered content
const centeredBox = createFlexContainer({
    direction: 'column',
    justify: 'center',
    align: 'center',
    style: { minHeight: '200px' }
});
```

---

### createGrid(options)

Creates a CSS Grid container.

**Parameters:**
```javascript
{
    columns: number | string,  // e.g., 3 or '1fr 2fr 1fr' or 'repeat(auto-fill, minmax(200px, 1fr))'
    rows: number | string,     // optional
    gap: string,               // default: '16px'
    columnGap: string,         // optional (overrides gap)
    rowGap: string,            // optional (overrides gap)
    padding: string,           // default: '0'
    background: string,        // default: 'transparent'
    className: string,
    style: object,
    children: HTMLElement[]
}
```

**Returns:** `HTMLElement`

**Examples:**

```javascript
import { createGrid } from '../components/layout.js';

// 3-column grid
const threeColumns = createGrid({
    columns: 3,
    gap: '16px'
});

// 2-column form grid
const formGrid = createGrid({
    columns: '1fr 1fr',
    gap: '12px',
    padding: '16px'
});

// Custom grid template
const customGrid = createGrid({
    columns: '200px 1fr 200px',
    rows: 'auto 1fr auto',
    gap: '20px'
});

// Different column/row gaps
const asymmetricGrid = createGrid({
    columns: 4,
    columnGap: '20px',
    rowGap: '10px'
});
```

---

### createResponsiveGrid(options)

Creates an auto-fitting responsive grid.

**Parameters:**
```javascript
{
    minItemWidth: number,     // default: 200 (pixels)
    maxItemWidth: string,     // default: '1fr'
    gap: string,              // default: '16px'
    padding: string,          // default: '0'
    background: string,       // default: 'transparent'
    className: string,
    style: object,
    children: HTMLElement[]
}
```

**Returns:** `HTMLElement`

**Examples:**

```javascript
import { createResponsiveGrid } from '../components/layout.js';

// Image gallery (auto-fits based on container width)
const gallery = createResponsiveGrid({
    minItemWidth: 150,
    gap: '12px',
    padding: '20px'
});

// Model card grid
const modelGrid = createResponsiveGrid({
    minItemWidth: 250,
    maxItemWidth: '300px',
    gap: '16px'
});

// Tag cloud
const tagCloud = createResponsiveGrid({
    minItemWidth: 100,
    gap: '8px'
});
```

---

### createCard(options)

Creates a card container with optional title and action buttons.

**Parameters:**
```javascript
{
    title: string,            // optional
    content: HTMLElement | string,
    actions: HTMLElement[],   // optional - buttons to display in header
    padding: string,          // default: '16px'
    background: string,       // default: '#2a2a2a'
    borderColor: string,      // default: '#444'
    borderRadius: string,     // default: '8px'
    className: string,
    style: object
}
```

**Returns:** `HTMLElement`

**Examples:**

```javascript
import { createCard } from '../components/layout.js';
import { createButton, BUTTON_VARIANTS } from '../components/buttons.js';

// Simple card
const simpleCard = createCard({
    title: 'Settings',
    content: '<p>Your settings go here</p>'
});

// Card with actions
const editBtn = createButton('Edit', { variant: BUTTON_VARIANTS.INFO });
const deleteBtn = createButton('Delete', { variant: BUTTON_VARIANTS.DANGER });

const actionCard = createCard({
    title: 'Model Information',
    content: modelDetailsElement,
    actions: [editBtn, deleteBtn]
});

// Card with custom styling
const customCard = createCard({
    title: 'Custom Card',
    content: contentElement,
    padding: '24px',
    background: '#1a1a1a',
    borderColor: '#4CAF50',
    borderRadius: '12px'
});

// Card without title
const noTitleCard = createCard({
    content: '<div>Content only card</div>',
    padding: '12px'
});
```

---

### createSection(title, content, options)

Creates a section with a titled header and content area.

**Parameters:**
```javascript
// Required
title: string
content: HTMLElement | string

// Options
{
    titleColor: string,       // default: '#569cd6'
    titleSize: string,        // default: '16px'
    borderColor: string,      // default: '#4CAF50'
    padding: string,          // default: '16px'
    marginTop: string,        // default: '16px'
    background: string,       // default: 'transparent'
    collapsible: boolean,     // default: false
    collapsed: boolean,       // default: false (initial state if collapsible)
    className: string,
    style: object
}
```

**Returns:** `HTMLElement`

**Examples:**

```javascript
import { createSection } from '../components/layout.js';

// Basic section
const basicSection = createSection('General Settings', settingsForm);

// Collapsible section
const collapsibleSection = createSection('Advanced Options', advancedForm, {
    collapsible: true,
    collapsed: true
});

// Custom styled section
const customSection = createSection('API Configuration', apiForm, {
    titleColor: '#ff9800',
    borderColor: '#ff9800',
    titleSize: '18px',
    padding: '20px',
    background: 'rgba(255, 152, 0, 0.05)'
});

// Section with HTML content
const htmlSection = createSection('Instructions', `
    <p>Follow these steps:</p>
    <ol>
        <li>Step one</li>
        <li>Step two</li>
        <li>Step three</li>
    </ol>
`);
```

---

### createScrollContainer(content, options)

Creates a scrollable container with max-height/max-width.

**Parameters:**
```javascript
// Required
content: HTMLElement | string

// Options
{
    maxHeight: string,        // default: '400px'
    maxWidth: string,         // default: '100%'
    padding: string,          // default: '0'
    background: string,       // default: 'transparent'
    showScrollbar: boolean,   // default: true
    className: string,
    style: object
}
```

**Returns:** `HTMLElement`

**Examples:**

```javascript
import { createScrollContainer } from '../components/layout.js';

// Log viewer
const logViewer = createScrollContainer(logContent, {
    maxHeight: '300px',
    padding: '12px',
    background: '#1a1a1a'
});

// Wide content scroller
const wideScroller = createScrollContainer(wideTable, {
    maxHeight: '500px',
    maxWidth: '800px'
});

// Hidden scrollbar
const hiddenScroll = createScrollContainer(content, {
    maxHeight: '400px',
    showScrollbar: false
});

// Full-height scroller
const fullHeight = createScrollContainer(longList, {
    maxHeight: 'calc(100vh - 200px)',
    padding: '16px'
});
```

---

### createSplitPane(leftContent, rightContent, options)

Creates a two-column split pane layout with optional resizing.

**Parameters:**
```javascript
// Required
leftContent: HTMLElement
rightContent: HTMLElement

// Options
{
    splitRatio: string,       // default: '50-50' (e.g., '30-70', '40-60')
    gap: string,              // default: '8px'
    minLeftWidth: string,     // default: '200px'
    minRightWidth: string,    // default: '200px'
    resizable: boolean,       // default: false
    className: string,
    style: object
}
```

**Returns:** `HTMLElement`

**Examples:**

```javascript
import { createSplitPane } from '../components/layout.js';

// 50-50 split
const equalSplit = createSplitPane(sidebarElement, mainElement);

// 30-70 split
const asymmetricSplit = createSplitPane(navElement, contentElement, {
    splitRatio: '30-70'
});

// Resizable split pane
const resizableSplit = createSplitPane(fileListElement, previewElement, {
    splitRatio: '40-60',
    resizable: true,
    minLeftWidth: '250px',
    minRightWidth: '300px'
});

// File browser layout
const fileBrowser = createSplitPane(
    folderTreeElement,
    fileDetailsElement,
    {
        splitRatio: '25-75',
        resizable: true,
        gap: '12px'
    }
);
```

---

### createCenteredContainer(content, options)

Creates a centered container with max-width.

**Parameters:**
```javascript
// Required
content: HTMLElement | string

// Options
{
    maxWidth: string,         // default: '800px'
    padding: string,          // default: '16px'
    marginTop: string,        // default: '0'
    background: string,       // default: 'transparent'
    className: string,
    style: object
}
```

**Returns:** `HTMLElement`

**Examples:**

```javascript
import { createCenteredContainer } from '../components/layout.js';

// Centered form
const centeredForm = createCenteredContainer(formElement, {
    maxWidth: '600px',
    padding: '32px',
    marginTop: '40px'
});

// Centered article
const article = createCenteredContainer(articleContent, {
    maxWidth: '900px',
    padding: '20px'
});

// Narrow centered content
const narrow = createCenteredContainer(messageElement, {
    maxWidth: '400px',
    padding: '24px',
    background: '#2a2a2a'
});
```

---

### createStack(items, options)

Creates a vertical stack of items with consistent spacing.

**Parameters:**
```javascript
// Required
items: HTMLElement[]

// Options
{
    gap: string,              // default: '16px'
    padding: string,          // default: '0'
    background: string,       // default: 'transparent'
    className: string,
    style: object
}
```

**Returns:** `HTMLElement`

**Examples:**

```javascript
import { createStack } from '../components/layout.js';
import { createInput, createSelect } from '../components/formElements.js';

// Form field stack
const formFields = createStack([
    createInput({ type: 'text', placeholder: 'Name' }),
    createInput({ type: 'email', placeholder: 'Email' }),
    createSelect({ items: ['Option 1', 'Option 2'] })
], {
    gap: '12px',
    padding: '16px'
});

// Menu items
const menuStack = createStack([
    menuItem1,
    menuItem2,
    menuItem3
], {
    gap: '4px'
});

// Card stack
const cardStack = createStack([
    card1,
    card2,
    card3
], {
    gap: '20px',
    padding: '24px'
});
```

---

### createInline(items, options)

Creates a horizontal inline layout with consistent spacing.

**Parameters:**
```javascript
// Required
items: HTMLElement[]

// Options
{
    gap: string,              // default: '8px'
    align: string,            // default: 'center' (vertical alignment)
    wrap: boolean,            // default: true
    padding: string,          // default: '0'
    background: string,       // default: 'transparent'
    className: string,
    style: object
}
```

**Returns:** `HTMLElement`

**Examples:**

```javascript
import { createInline } from '../components/layout.js';
import { createButton, BUTTON_VARIANTS } from '../components/buttons.js';

// Button row
const buttonRow = createInline([
    createButton('Save', { variant: BUTTON_VARIANTS.SUCCESS }),
    createButton('Cancel', { variant: BUTTON_VARIANTS.SECONDARY }),
    createButton('Delete', { variant: BUTTON_VARIANTS.DANGER })
], {
    gap: '8px'
});

// Tag list
const tagList = createInline(tagElements, {
    gap: '6px',
    wrap: true
});

// Icon row
const iconRow = createInline(iconElements, {
    gap: '12px',
    align: 'center'
});

// Badge row (no wrap)
const badgeRow = createInline(badgeElements, {
    gap: '4px',
    wrap: false
});
```

---

## Migration Guide

### From Manual Flex to createFlexContainer

**Before:**
```javascript
const container = document.createElement('div');
container.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px;
    background: #2a2a2a;
`;
```

**After:**
```javascript
const container = createFlexContainer({
    direction: 'column',
    gap: '16px',
    padding: '20px',
    background: '#2a2a2a'
});
```

---

### From Manual Grid to createGrid

**Before:**
```javascript
const grid = document.createElement('div');
grid.style.cssText = `
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 15px;
    margin-bottom: 15px;
`;
```

**After:**
```javascript
const grid = createGrid({
    columns: 3,
    gap: '15px',
    style: { marginBottom: '15px' }
});
```

---

### From Manual Card to createCard

**Before:**
```javascript
const card = document.createElement('div');
card.style.cssText = `
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 8px;
    padding: 16px;
`;

const title = document.createElement('h3');
title.textContent = 'Settings';
title.style.cssText = 'margin: 0 0 12px 0; color: #ccc;';

card.appendChild(title);
card.appendChild(contentElement);
```

**After:**
```javascript
const card = createCard({
    title: 'Settings',
    content: contentElement
});
```

---

### From Manual Responsive Grid to createResponsiveGrid

**Before:**
```javascript
const gallery = document.createElement('div');
gallery.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
    padding: 20px;
`;
```

**After:**
```javascript
const gallery = createResponsiveGrid({
    minItemWidth: 200,
    gap: '16px',
    padding: '20px'
});
```

---

## Complete Examples

### Settings Panel with Sections

```javascript
import { createCard, createSection, createStack } from '../components/layout.js';
import { createInput, createSelect, createCheckbox } from '../components/formElements.js';

// Create form fields
const nameInput = createInput({ type: 'text', placeholder: 'Your name' });
const emailInput = createInput({ type: 'email', placeholder: 'your@email.com' });
const themeSelect = createSelect({ items: ['Dark', 'Light', 'Auto'] });
const { label: notifyCheckbox } = createCheckbox('Enable notifications');

// Create sections
const profileSection = createSection('Profile', createStack([
    nameInput,
    emailInput
], { gap: '12px' }));

const preferencesSection = createSection('Preferences', createStack([
    themeSelect,
    notifyCheckbox
], { gap: '12px' }), {
    collapsible: true
});

// Wrap in card
const settingsPanel = createCard({
    title: 'Settings',
    content: createStack([profileSection, preferencesSection], { gap: '24px' }),
    padding: '24px'
});
```

---

### Image Gallery with Grid

```javascript
import { createResponsiveGrid, createScrollContainer } from '../components/layout.js';

// Create image elements
const imageElements = imageUrls.map(url => {
    const img = document.createElement('img');
    img.src = url;
    img.style.cssText = `
        width: 100%;
        height: 200px;
        object-fit: cover;
        border-radius: 4px;
        cursor: pointer;
    `;
    img.addEventListener('click', () => openImagePreview(url));
    return img;
});

// Create responsive grid
const imageGrid = createResponsiveGrid({
    minItemWidth: 150,
    gap: '12px',
    children: imageElements
});

// Wrap in scrollable container
const gallery = createScrollContainer(imageGrid, {
    maxHeight: '600px',
    padding: '16px'
});
```

---

### File Browser with Split Pane

```javascript
import { createSplitPane, createStack, createScrollContainer } from '../components/layout.js';

// Left: File tree
const fileTree = createScrollContainer(createStack(fileTreeItems, {
    gap: '4px'
}), {
    maxHeight: '100%'
});

// Right: File preview
const filePreview = createScrollContainer(previewContent, {
    maxHeight: '100%',
    padding: '16px'
});

// Create split pane
const fileBrowser = createSplitPane(fileTree, filePreview, {
    splitRatio: '30-70',
    resizable: true,
    minLeftWidth: '200px',
    minRightWidth: '400px'
});
```

---

### Dashboard with Multiple Cards

```javascript
import { createGrid, createCard, createResponsiveGrid } from '../components/layout.js';

// Create stat cards
const statsCard = createCard({
    title: 'Statistics',
    content: createGrid({
        columns: 2,
        gap: '12px',
        children: [totalModels, totalImages, totalTags, totalSize]
    })
});

const recentCard = createCard({
    title: 'Recent Activity',
    content: activityList
});

const quickActionsCard = createCard({
    title: 'Quick Actions',
    content: createStack(actionButtons, { gap: '8px' })
});

// Arrange cards in responsive grid
const dashboard = createResponsiveGrid({
    minItemWidth: 300,
    gap: '20px',
    padding: '24px',
    children: [statsCard, recentCard, quickActionsCard]
});
```

---

### Form with Two-Column Layout

```javascript
import { createGrid, createStack, createInline, createCenteredContainer } from '../components/layout.js';
import { createInput, createSelect } from '../components/formElements.js';
import { createButton, BUTTON_VARIANTS } from '../components/buttons.js';

// Create form fields
const firstName = createInput({ type: 'text', placeholder: 'First name' });
const lastName = createInput({ type: 'text', placeholder: 'Last name' });
const email = createInput({ type: 'email', placeholder: 'Email' });
const country = createSelect({ items: ['USA', 'UK', 'Canada'] });

// Two-column grid for name fields
const nameGrid = createGrid({
    columns: 2,
    gap: '12px',
    children: [firstName, lastName]
});

// Full-width fields
const fullWidthFields = createStack([email, country], { gap: '12px' });

// Button row
const buttons = createInline([
    createButton('Submit', { variant: BUTTON_VARIANTS.SUCCESS }),
    createButton('Cancel', { variant: BUTTON_VARIANTS.SECONDARY })
], { gap: '8px' });

// Assemble form
const form = createStack([nameGrid, fullWidthFields, buttons], {
    gap: '16px'
});

// Center the form
const centeredForm = createCenteredContainer(form, {
    maxWidth: '600px',
    padding: '32px'
});
```

---

## Best Practices

### 1. Choose the Right Component

```javascript
// ✅ GOOD: Use createStack for vertical lists
const formFields = createStack([input1, input2, input3], { gap: '12px' });

// ❌ BAD: Manual flex for simple vertical stack
const container = createFlexContainer({ direction: 'column', gap: '12px' });
container.appendChild(input1);
container.appendChild(input2);
container.appendChild(input3);
```

### 2. Use Responsive Grid for Dynamic Content

```javascript
// ✅ GOOD: Responsive grid adapts to container
const gallery = createResponsiveGrid({
    minItemWidth: 200,
    children: imageElements
});

// ❌ BAD: Fixed columns might overflow
const gallery = createGrid({
    columns: 4,  // Breaks on small screens
    children: imageElements
});
```

### 3. Leverage Composition

```javascript
// ✅ GOOD: Compose layouts
const panel = createCard({
    title: 'Settings',
    content: createStack([
        createSection('General', generalForm),
        createSection('Advanced', advancedForm)
    ], { gap: '20px' })
});

// ❌ BAD: Flat structure is harder to maintain
```

### 4. Use Semantic Layout Functions

```javascript
// ✅ GOOD: Clear intent with createInline
const buttonRow = createInline(buttons, { gap: '8px' });

// ❌ BAD: Less clear with generic flex
const buttonRow = createFlexContainer({
    direction: 'row',
    gap: '8px',
    children: buttons
});
```

### 5. Consistent Spacing

```javascript
// ✅ GOOD: Use consistent gap values
const form = createStack(fields, { gap: '16px' });  // Standard spacing
const toolbar = createInline(buttons, { gap: '8px' });  // Compact spacing

// ❌ BAD: Random spacing values
```

---

## Performance Considerations

### Lazy Loading with Scrollable Containers

```javascript
// Only render visible items initially
const visibleItems = items.slice(0, 50);
const scrollContainer = createScrollContainer(
    createStack(visibleItems),
    { maxHeight: '600px' }
);

// Load more on scroll
scrollContainer.addEventListener('scroll', () => {
    if (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 100) {
        loadMoreItems();
    }
});
```

### Efficient Grid Updates

```javascript
// Create grid once
const grid = createResponsiveGrid({ minItemWidth: 200 });

// Add items efficiently
items.forEach(item => {
    grid.appendChild(createItemElement(item));
});

// Better than recreating grid each time
```

---

## Troubleshooting

### Layout Not Displaying

**Problem:** Container has no height/width

**Solution:** Set explicit dimensions or use min-height/min-width

```javascript
const container = createFlexContainer({
    style: { minHeight: '400px' }
});
```

### Grid Items Not Sizing Correctly

**Problem:** Grid items expanding beyond expected size

**Solution:** Add `overflow: hidden` or set explicit item sizes

```javascript
const grid = createGrid({
    columns: 3,
    style: { overflow: 'hidden' }
});
```

### Split Pane Not Resizing

**Problem:** Resizable split pane not working

**Solution:** Ensure parent container has defined width

```javascript
const parent = document.createElement('div');
parent.style.width = '100%';  // Important!

const splitPane = createSplitPane(left, right, {
    resizable: true
});

parent.appendChild(splitPane);
```

---

## Related Documentation

- [Button Component Guide](BUTTON_COMPONENT_GUIDE.md)
- [Form Elements Guide](FORM_ELEMENTS_GUIDE.md)
- [Tab Manager Guide](TAB_MANAGER_GUIDE.md)
- [Component System README](../js/components/README.md)

---

## Support

For issues or questions:
1. Check this guide's Troubleshooting section
2. Review the layout.js source code (`js/components/layout.js`)
3. Check `COMPONENT_DUPLICATION_ANALYSIS.md` for migration examples
4. Submit an issue with minimal reproduction case

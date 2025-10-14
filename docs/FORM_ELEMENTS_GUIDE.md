# Form Elements Component Guide

**Status:** ✅ Complete  
**Created:** October 12, 2025  
**Module:** `js/components/formElements.js`

---

## Overview

The Form Elements component library provides a centralized, consistent way to create form inputs, selects, textareas, sliders, checkboxes, radio buttons, and form layouts across the application. All components follow common styling patterns and provide extensive customization options.

---

## Quick Start

```javascript
import {
  createInput,
  createSelect,
  createTextarea,
  createCheckbox,
  createSlider,
  createRadioGroup,
  createFormRow,
  createFormGroup
} from '../components/formElements.js';
```

---

## API Reference

### `createInput(options)`

Create a styled text input element.

**Parameters:**
- `options.type` (string) - Input type: 'text', 'number', 'email', 'password', etc. Default: 'text'
- `options.placeholder` (string) - Placeholder text
- `options.value` (string|number) - Initial value
- `options.min` (string) - Minimum value (for number type)
- `options.max` (string) - Maximum value (for number type)
- `options.step` (string) - Step value (for number type)
- `options.className` (string) - Additional CSS classes
- `options.onInput` (Function) - Input event handler
- `options.onChange` (Function) - Change event handler
- `options.onKeydown` (Function) - Keydown event handler
- `options.style` (Object) - Custom style overrides
- `options.disabled` (boolean) - Disabled state
- `options.id` (string) - Element ID
- `options.name` (string) - Element name attribute
- `options.ariaLabel` (string) - ARIA label for accessibility

**Returns:** `HTMLInputElement`

**Examples:**

```javascript
// Basic text input
const nameInput = createInput({
  placeholder: 'Enter your name',
  value: 'John Doe'
});

// Number input with range
const ageInput = createInput({
  type: 'number',
  min: '0',
  max: '120',
  step: '1',
  value: '25',
  placeholder: 'Age'
});

// Email input with validation
const emailInput = createInput({
  type: 'email',
  placeholder: 'email@example.com',
  onInput: (e) => {
    console.log('Valid:', e.target.checkValidity());
  }
});

// Password input
const passwordInput = createInput({
  type: 'password',
  placeholder: 'Enter password',
  onKeydown: (e) => {
    if (e.key === 'Enter') {
      // Submit form
    }
  }
});

// Custom styled input
const customInput = createInput({
  placeholder: 'Custom',
  style: {
    background: '#222',
    border: '2px solid #4CAF50'
  }
});
```

---

### `createSelect(options)`

Create a styled select dropdown.

**Parameters:**
- `options.items` (Array) - Array of strings or `{value, text, disabled}` objects
- `options.value` (string|number) - Initially selected value
- `options.className` (string) - Additional CSS classes
- `options.onChange` (Function) - Change event handler
- `options.style` (Object) - Custom style overrides
- `options.disabled` (boolean) - Disabled state
- `options.id` (string) - Element ID
- `options.name` (string) - Element name attribute
- `options.ariaLabel` (string) - ARIA label
- `options.placeholder` (string) - Placeholder option text

**Returns:** `HTMLSelectElement`

**Examples:**

```javascript
// Simple string array
const modelSelect = createSelect({
  items: ['GPT-4', 'Claude', 'Llama'],
  value: 'GPT-4',
  onChange: (e) => console.log('Selected:', e.target.value)
});

// Object array with values
const themeSelect = createSelect({
  items: [
    { value: 'dark', text: 'Dark Theme' },
    { value: 'light', text: 'Light Theme' },
    { value: 'auto', text: 'Auto' }
  ],
  value: 'dark'
});

// With placeholder
const providerSelect = createSelect({
  items: ['Ollama', 'LM Studio', 'OpenAI'],
  placeholder: 'Select provider...',
  onChange: (e) => {
    if (e.target.value) {
      loadModels(e.target.value);
    }
  }
});

// Disabled options
const tierSelect = createSelect({
  items: [
    { value: 'free', text: 'Free' },
    { value: 'pro', text: 'Pro' },
    { value: 'enterprise', text: 'Enterprise', disabled: true }
  ]
});
```

---

### `createTextarea(options)`

Create a styled textarea element.

**Parameters:**
- `options.placeholder` (string) - Placeholder text
- `options.value` (string) - Initial value
- `options.rows` (number) - Number of rows. Default: 6
- `options.cols` (number) - Number of columns
- `options.monospace` (boolean) - Use monospace font. Default: true
- `options.className` (string) - Additional CSS classes
- `options.onInput` (Function) - Input event handler
- `options.onChange` (Function) - Change event handler
- `options.onKeydown` (Function) - Keydown event handler
- `options.style` (Object) - Custom style overrides
- `options.disabled` (boolean) - Disabled state
- `options.id` (string) - Element ID
- `options.name` (string) - Element name attribute
- `options.ariaLabel` (string) - ARIA label
- `options.resize` (string) - CSS resize property: 'vertical', 'horizontal', 'both', 'none'. Default: 'vertical'

**Returns:** `HTMLTextAreaElement`

**Examples:**

```javascript
// Basic textarea
const promptArea = createTextarea({
  placeholder: 'Enter your prompt...',
  rows: 8,
  onInput: (e) => {
    console.log(`${e.target.value.length} characters`);
  }
});

// Code editor style
const codeArea = createTextarea({
  placeholder: '// Enter code here',
  rows: 15,
  monospace: true,
  resize: 'both',
  style: {
    fontFamily: 'Consolas, Monaco, monospace',
    fontSize: '14px'
  }
});

// Non-monospace textarea
const descriptionArea = createTextarea({
  placeholder: 'Description...',
  rows: 4,
  monospace: false,
  resize: 'none'
});

// With keyboard shortcuts
const editorArea = createTextarea({
  rows: 10,
  onKeydown: (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      submitForm();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      // Insert tab
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      e.target.value = e.target.value.substring(0, start) + '\t' + 
                       e.target.value.substring(end);
      e.target.selectionStart = e.target.selectionEnd = start + 1;
    }
  }
});
```

---

### `createCheckbox(labelText, options)`

Create a checkbox with label.

**Parameters:**
- `labelText` (string) - Label text
- `options.checked` (boolean) - Initial checked state. Default: false
- `options.className` (string) - Additional CSS classes for container
- `options.checkboxClass` (string) - Additional CSS classes for checkbox
- `options.labelClass` (string) - Additional CSS classes for label
- `options.onChange` (Function) - Change event handler
- `options.style` (Object) - Custom style overrides for container
- `options.disabled` (boolean) - Disabled state
- `options.id` (string) - Element ID for checkbox
- `options.name` (string) - Element name attribute
- `options.value` (string) - Checkbox value attribute

**Returns:** `{container, checkbox, label}`

**Examples:**

```javascript
// Simple checkbox
const { container, checkbox } = createCheckbox('Enable feature', {
  checked: true,
  onChange: (e) => {
    console.log('Enabled:', e.target.checked);
  }
});

// Multiple checkboxes
const features = ['Auto-save', 'Notifications', 'Dark mode'];
const checkboxes = features.map(feature => {
  return createCheckbox(feature, {
    name: 'features',
    value: feature.toLowerCase().replace(' ', '-'),
    onChange: (e) => {
      updateSettings(e.target.value, e.target.checked);
    }
  });
});

// Disabled checkbox
const { container: disabledBox } = createCheckbox('Premium feature', {
  checked: false,
  disabled: true
});

// With ID for external control
const { container, checkbox } = createCheckbox('Remember me', {
  id: 'remember-checkbox',
  checked: localStorage.getItem('remember') === 'true',
  onChange: (e) => {
    localStorage.setItem('remember', e.target.checked);
  }
});
```

---

### `createSlider(labelText, options)`

Create a slider with label and value display.

**Parameters:**
- `labelText` (string) - Label text
- `options.min` (number) - Minimum value. Default: 0
- `options.max` (number) - Maximum value. Default: 100
- `options.step` (number) - Step increment. Default: 1
- `options.value` (number) - Initial value. Default: 50
- `options.className` (string) - Additional CSS classes for container
- `options.sliderClass` (string) - Additional CSS classes for slider
- `options.labelClass` (string) - Additional CSS classes for label
- `options.valueClass` (string) - Additional CSS classes for value display
- `options.onInput` (Function) - Input event handler (fires during dragging)
- `options.onChange` (Function) - Change event handler (fires on release)
- `options.formatValue` (Function) - Function to format displayed value
- `options.style` (Object) - Custom style overrides for container
- `options.disabled` (boolean) - Disabled state
- `options.id` (string) - Element ID
- `options.name` (string) - Element name attribute
- `options.showValue` (boolean) - Whether to show value display. Default: true

**Returns:** `{container, slider, valueDisplay, label}`

**Examples:**

```javascript
// Temperature slider
const { container, slider } = createSlider('Temperature', {
  min: 0,
  max: 2,
  step: 0.1,
  value: 0.7,
  formatValue: (v) => parseFloat(v).toFixed(1),
  onInput: (e) => {
    updateTemperature(e.target.value);
  }
});

// Percentage slider
const { container, slider } = createSlider('Opacity', {
  min: 0,
  max: 100,
  step: 5,
  value: 80,
  formatValue: (v) => `${v}%`,
  onChange: (e) => {
    element.style.opacity = e.target.value / 100;
  }
});

// Integer slider
const { container, slider } = createSlider('Count', {
  min: 1,
  max: 10,
  step: 1,
  value: 5,
  formatValue: (v) => `${v} items`
});

// Without value display
const { container, slider } = createSlider('Volume', {
  min: 0,
  max: 100,
  value: 50,
  showValue: false,
  onInput: (e) => {
    setVolume(e.target.value);
  }
});

// Custom styling
const { container, slider } = createSlider('Brightness', {
  min: 0,
  max: 100,
  value: 75,
  style: {
    marginBottom: '20px'
  },
  sliderClass: 'custom-slider'
});
```

---

### `createRadioGroup(name, items, options)`

Create a radio button group.

**Parameters:**
- `name` (string) - Group name (same name for all radios in group)
- `items` (Array) - Array of strings or `{value, label, checked, disabled}` objects
- `options.selectedValue` (string) - Initially selected value
- `options.className` (string) - Additional CSS classes for container
- `options.radioClass` (string) - Additional CSS classes for radio buttons
- `options.labelClass` (string) - Additional CSS classes for labels
- `options.onChange` (Function) - Change event handler
- `options.style` (Object) - Custom style overrides
- `options.disabled` (boolean) - Disabled state for all radios
- `options.layout` (string) - Layout direction: 'vertical' or 'horizontal'. Default: 'vertical'

**Returns:** `{container, radios}` where `radios` is an array of `{radio, label, container}` objects

**Examples:**

```javascript
// Simple radio group
const { container, radios } = createRadioGroup('theme', 
  ['Dark', 'Light', 'Auto'],
  {
    selectedValue: 'Dark',
    onChange: (e) => {
      setTheme(e.target.value);
    }
  }
);

// Object-based items
const { container } = createRadioGroup('plan', [
  { value: 'free', label: 'Free Plan' },
  { value: 'pro', label: 'Pro Plan ($10/mo)' },
  { value: 'enterprise', label: 'Enterprise Plan' }
], {
  selectedValue: 'free'
});

// Horizontal layout
const { container } = createRadioGroup('size', 
  ['Small', 'Medium', 'Large'],
  {
    selectedValue: 'Medium',
    layout: 'horizontal'
  }
);

// With disabled option
const { container } = createRadioGroup('tier', [
  { value: 'basic', label: 'Basic' },
  { value: 'premium', label: 'Premium', disabled: true },
  { value: 'unlimited', label: 'Unlimited' }
], {
  selectedValue: 'basic',
  onChange: (e) => {
    console.log('Selected:', e.target.value);
  }
});

// Access individual radios
const { container, radios } = createRadioGroup('option', ['A', 'B', 'C']);
radios.forEach((item, index) => {
  item.radio.addEventListener('focus', () => {
    console.log(`Option ${index} focused`);
  });
});
```

---

### `createFormRow(labelText, element, options)`

Create a form row with label and element.

**Parameters:**
- `labelText` (string) - Label text
- `element` (HTMLElement) - Form element to include
- `options.className` (string) - Additional CSS classes for container
- `options.labelClass` (string) - Additional CSS classes for label
- `options.style` (Object) - Custom style overrides
- `options.id` (string) - ID for the element (will set `for` attribute on label)
- `options.required` (boolean) - Whether field is required (adds asterisk)
- `options.helpText` (string) - Optional help text below the element
- `options.layout` (string) - Layout: 'vertical' or 'horizontal'. Default: 'vertical'

**Returns:** `HTMLElement` (container with label and element)

**Examples:**

```javascript
// Basic form row
const nameInput = createInput({ placeholder: 'Enter name' });
const nameRow = createFormRow('Name', nameInput);

// Required field
const emailInput = createInput({ type: 'email' });
const emailRow = createFormRow('Email', emailInput, {
  required: true,
  helpText: 'We will never share your email'
});

// Horizontal layout
const themeSelect = createSelect({ items: ['Dark', 'Light'] });
const themeRow = createFormRow('Theme', themeSelect, {
  layout: 'horizontal'
});

// With ID for linking
const passwordInput = createInput({ type: 'password', id: 'pwd' });
const passwordRow = createFormRow('Password', passwordInput, {
  id: 'pwd',
  required: true,
  helpText: 'At least 8 characters'
});
```

---

### `createFormGroup(elements, options)`

Create a form group container with optional title.

**Parameters:**
- `elements` (Array<HTMLElement>) - Array of form elements or rows
- `options.className` (string) - Additional CSS classes
- `options.title` (string) - Optional group title
- `options.style` (Object) - Custom style overrides

**Returns:** `HTMLElement` (form group container)

**Examples:**

```javascript
// Basic form group
const group = createFormGroup([
  createFormRow('First Name', createInput()),
  createFormRow('Last Name', createInput()),
  createFormRow('Email', createInput({ type: 'email' }))
]);

// With title
const loginGroup = createFormGroup([
  createFormRow('Username', createInput()),
  createFormRow('Password', createInput({ type: 'password' }))
], {
  title: 'Login Credentials'
});

// Multiple groups
const personalInfo = createFormGroup([
  createFormRow('Name', createInput()),
  createFormRow('Age', createInput({ type: 'number' }))
], { title: 'Personal Information' });

const contactInfo = createFormGroup([
  createFormRow('Email', createInput({ type: 'email' })),
  createFormRow('Phone', createInput({ type: 'tel' }))
], { title: 'Contact Information' });

const form = document.createElement('form');
form.appendChild(personalInfo);
form.appendChild(contactInfo);
```

---

## Complete Form Example

```javascript
import {
  createInput,
  createSelect,
  createTextarea,
  createCheckbox,
  createSlider,
  createRadioGroup,
  createFormRow,
  createFormGroup
} from '../components/formElements.js';

// Create form elements
const nameInput = createInput({
  placeholder: 'Enter your name',
  id: 'name'
});

const emailInput = createInput({
  type: 'email',
  placeholder: 'email@example.com',
  id: 'email'
});

const providerSelect = createSelect({
  items: ['Ollama', 'LM Studio', 'OpenAI'],
  placeholder: 'Select provider...',
  id: 'provider'
});

const promptArea = createTextarea({
  placeholder: 'Enter your prompt...',
  rows: 8,
  id: 'prompt'
});

const { container: tempSlider } = createSlider('Temperature', {
  min: 0,
  max: 2,
  step: 0.1,
  value: 0.7,
  formatValue: (v) => parseFloat(v).toFixed(1)
});

const { container: streamCheckbox } = createCheckbox('Enable streaming', {
  checked: true,
  id: 'streaming'
});

const { container: modelRadios } = createRadioGroup('modelType', [
  { value: 'small', label: 'Small (Fast)' },
  { value: 'medium', label: 'Medium (Balanced)' },
  { value: 'large', label: 'Large (Accurate)' }
], {
  selectedValue: 'medium',
  layout: 'horizontal'
});

// Create form groups
const basicInfo = createFormGroup([
  createFormRow('Name', nameInput, { required: true, id: 'name' }),
  createFormRow('Email', emailInput, { required: true, id: 'email' })
], {
  title: 'Basic Information'
});

const llmSettings = createFormGroup([
  createFormRow('Provider', providerSelect, { id: 'provider' }),
  createFormRow('Model Type', modelRadios),
  tempSlider,
  streamCheckbox
], {
  title: 'LLM Settings'
});

const promptSection = createFormGroup([
  createFormRow('Prompt', promptArea, { id: 'prompt' })
], {
  title: 'Prompt'
});

// Build complete form
const form = document.createElement('form');
form.appendChild(basicInfo);
form.appendChild(llmSettings);
form.appendChild(promptSection);

// Add submit button
const submitBtn = document.createElement('button');
submitBtn.textContent = 'Submit';
submitBtn.type = 'submit';
form.appendChild(submitBtn);

// Handle form submission
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = {
    name: nameInput.value,
    email: emailInput.value,
    provider: providerSelect.value,
    prompt: promptArea.value
  };
  console.log('Form data:', formData);
});
```

---

## Migration Guide

### Before (Manual Creation)

```javascript
// Old way - manual creation
const slider = document.createElement('input');
slider.type = 'range';
slider.min = '0';
slider.max = '2';
slider.step = '0.1';
slider.value = '0.7';
slider.style.cssText = `width: 100%; margin: 5px 0;`;

const valueDisplay = document.createElement('span');
valueDisplay.textContent = '0.7';
valueDisplay.style.cssText = `color: #fff; font-size: 12px;`;

slider.addEventListener('input', () => {
  valueDisplay.textContent = slider.value;
});

const container = document.createElement('div');
container.appendChild(slider);
container.appendChild(valueDisplay);
```

### After (Using Component)

```javascript
// New way - using component
import { createSlider } from '../components/formElements.js';

const { container, slider, valueDisplay } = createSlider('Temperature', {
  min: 0,
  max: 2,
  step: 0.1,
  value: 0.7
});
```

**Benefits:**
- **15+ lines → 5 lines** (70% reduction)
- Consistent styling
- Automatic value display
- Better accessibility
- Easier to maintain

---

## Best Practices

### 1. Use Form Rows for Better Structure

```javascript
// Good - structured with form rows
const emailInput = createInput({ type: 'email', id: 'email' });
const emailRow = createFormRow('Email', emailInput, {
  required: true,
  helpText: 'Your email address'
});

// Less ideal - bare input
const emailInput = createInput({ type: 'email' });
```

### 2. Group Related Fields

```javascript
// Good - grouped related fields
const accountInfo = createFormGroup([
  createFormRow('Username', createInput()),
  createFormRow('Password', createInput({ type: 'password' }))
], { title: 'Account' });

const personalInfo = createFormGroup([
  createFormRow('Name', createInput()),
  createFormRow('Age', createInput({ type: 'number' }))
], { title: 'Personal' });
```

### 3. Use Appropriate Input Types

```javascript
// Good - semantic types
const emailInput = createInput({ type: 'email' });
const urlInput = createInput({ type: 'url' });
const telInput = createInput({ type: 'tel' });
const dateInput = createInput({ type: 'date' });

// Less ideal - all text
const emailInput = createInput({ type: 'text' });
```

### 4. Provide Helpful Labels and Help Text

```javascript
// Good - clear labels and help text
const apiKeyRow = createFormRow('API Key', createInput({ type: 'password' }), {
  required: true,
  helpText: 'Your OpenAI API key (starts with sk-)'
});

// Less ideal - minimal context
const apiKeyInput = createInput({ type: 'password' });
```

### 5. Use Format Functions for Sliders

```javascript
// Good - formatted display
const { container } = createSlider('Opacity', {
  min: 0,
  max: 100,
  value: 80,
  formatValue: (v) => `${v}%`
});

// Good - precision control
const { container } = createSlider('Temperature', {
  min: 0,
  max: 2,
  step: 0.1,
  value: 0.7,
  formatValue: (v) => parseFloat(v).toFixed(1)
});
```

---

## Styling Customization

All components accept a `style` parameter for customization:

```javascript
// Custom input styling
const input = createInput({
  placeholder: 'Custom',
  style: {
    background: '#222',
    border: '2px solid #4CAF50',
    borderRadius: '8px',
    fontSize: '14px',
    padding: '12px'
  }
});

// Custom slider styling
const { container, slider } = createSlider('Custom Slider', {
  min: 0,
  max: 100,
  value: 50,
  style: {
    marginBottom: '24px',
    padding: '12px',
    background: '#1a1a1a',
    borderRadius: '8px'
  }
});
```

---

## Accessibility Features

All components include accessibility features:

- **ARIA labels** - Use `ariaLabel` option for screen readers
- **Label associations** - Labels linked to inputs via `for`/`id`
- **Keyboard navigation** - Full keyboard support
- **Required indicators** - Visual indicators for required fields
- **Help text** - Descriptive help text for complex fields

```javascript
// Accessible form example
const emailInput = createInput({
  type: 'email',
  id: 'user-email',
  ariaLabel: 'User email address'
});

const emailRow = createFormRow('Email', emailInput, {
  id: 'user-email',
  required: true,
  helpText: 'We will send a confirmation to this address'
});
```

---

## Performance Tips

1. **Reuse components** - Create once, append multiple times if needed
2. **Batch updates** - Group multiple form changes together
3. **Event delegation** - Use single handler for multiple similar elements
4. **Lazy loading** - Create forms only when needed

```javascript
// Good - event delegation
const { container, radios } = createRadioGroup('option', ['A', 'B', 'C']);
container.addEventListener('change', (e) => {
  if (e.target.type === 'radio') {
    handleChange(e.target.value);
  }
});

// Less efficient - individual handlers
radios.forEach(({ radio }) => {
  radio.addEventListener('change', (e) => handleChange(e.target.value));
});
```

---

## Common Patterns

### Dynamic Option Lists

```javascript
// Load options dynamically
async function createModelSelect() {
  const models = await fetchModels();
  return createSelect({
    items: models.map(m => ({ value: m.id, text: m.name })),
    placeholder: 'Select a model...',
    onChange: (e) => loadModel(e.target.value)
  });
}
```

### Conditional Fields

```javascript
// Show/hide based on selection
const typeSelect = createSelect({
  items: ['Simple', 'Advanced'],
  onChange: (e) => {
    advancedOptions.style.display = 
      e.target.value === 'Advanced' ? 'block' : 'none';
  }
});

const advancedOptions = createFormGroup([
  createFormRow('Option 1', createInput()),
  createFormRow('Option 2', createInput())
]);
advancedOptions.style.display = 'none';
```

### Form Validation

```javascript
// Validate on input
const emailInput = createInput({
  type: 'email',
  onInput: (e) => {
    const isValid = e.target.checkValidity();
    e.target.style.borderColor = isValid ? '#555' : '#f44336';
  }
});

// Validate on submit
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const inputs = form.querySelectorAll('input[required]');
  const allValid = Array.from(inputs).every(input => input.checkValidity());
  
  if (allValid) {
    submitForm();
  } else {
    showToast('Please fill in all required fields', NOTIFICATION_TYPES.ERROR);
  }
});
```

---

## Troubleshooting

### Issue: Styles not applying

**Solution:** Check that custom styles don't conflict with default styles. Use `!important` if necessary or override the entire style object.

```javascript
const input = createInput({
  style: {
    background: '#000 !important'
  }
});
```

### Issue: Event handlers not firing

**Solution:** Ensure you're using the correct event type (`onInput` vs `onChange`). `onInput` fires during typing, `onChange` fires on blur.

```javascript
// Use onInput for live updates
const input = createInput({
  onInput: (e) => console.log('Typing:', e.target.value)
});

// Use onChange for final value
const input = createInput({
  onChange: (e) => console.log('Final:', e.target.value)
});
```

### Issue: Form elements not aligned

**Solution:** Use `createFormRow` with consistent `layout` option, or use `createFormGroup` for better structure.

---

## Version History

- **1.0** (October 12, 2025) - Initial release
  - All core form element creators
  - Form row and group utilities
  - Comprehensive documentation

---

## See Also

- [Button Component Guide](BUTTON_COMPONENT_GUIDE.md)
- [Component Duplication Analysis](COMPONENT_DUPLICATION_ANALYSIS.md)
- [Refactoring Progress](REFACTORING_PROGRESS.md)

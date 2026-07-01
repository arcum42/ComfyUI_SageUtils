---
type: Guide
title: Form Component Guide
description: Guide to Sage Utils form elements and layout components.
resource: docs/deprecated/FORM_ELEMENTS_GUIDE.md
tags: [ui, components, form, guide, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents the Sage Utils form element APIs, layout helpers, and example usage. It was migrated from `docs/FORM_ELEMENTS_GUIDE.md`.

> Note: This content may be out of date. Some form component styling and markup have since moved into separate CSS and HTML files. Review `js/components/formElements.js` and current UI asset files when updating this guide.

## Overview

The Sage Utils form component library provides consistent input controls and form layout helpers across the application. Components are built for accessibility, configurable styling, and reusable label/control grouping.

## Import

```javascript
import {
  createInput,
  createSelect,
  createTextarea,
  createCheckbox,
  createSlider,
  createRadioGroup,
  createFormRow,
  createFormGroup,
} from '../components/formElements.js';
```

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
const nameInput = createInput({
  placeholder: 'Enter your name',
  value: 'John Doe',
});

const ageInput = createInput({
  type: 'number',
  min: '0',
  max: '120',
  step: '1',
  value: '25',
  placeholder: 'Age',
});

const emailInput = createInput({
  type: 'email',
  placeholder: 'email@example.com',
  onInput: (e) => {
    console.log('Valid:', e.target.checkValidity());
  },
});

const passwordInput = createInput({
  type: 'password',
  placeholder: 'Enter password',
  onKeydown: (e) => {
    if (e.key === 'Enter') {
      // Submit form
    }
  },
});

const customInput = createInput({
  placeholder: 'Custom',
  style: {
    background: '#222',
    border: '2px solid #4CAF50',
  },
});
```

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
const modelSelect = createSelect({
  items: ['GPT-4', 'Claude', 'Llama'],
  value: 'GPT-4',
  onChange: (e) => console.log('Selected:', e.target.value),
});

const themeSelect = createSelect({
  items: [
    { value: 'dark', text: 'Dark Theme' },
    { value: 'light', text: 'Light Theme' },
    { value: 'auto', text: 'Auto' },
  ],
  value: 'dark',
});

const providerSelect = createSelect({
  items: ['Ollama', 'LM Studio', 'OpenAI'],
  placeholder: 'Select provider...',
  onChange: (e) => {
    if (e.target.value) {
      loadModels(e.target.value);
    }
  },
});

const tierSelect = createSelect({
  items: [
    { value: 'free', text: 'Free' },
    { value: 'pro', text: 'Pro' },
    { value: 'enterprise', text: 'Enterprise', disabled: true },
  ],
});
```

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
const promptArea = createTextarea({
  placeholder: 'Enter your prompt...',
  rows: 8,
  onInput: (e) => {
    console.log(`${e.target.value.length} characters`);
  },
});

const codeArea = createTextarea({
  placeholder: '// Enter code here',
  rows: 15,
  monospace: true,
  resize: 'both',
  style: {
    fontFamily: 'Consolas, Monaco, monospace',
    fontSize: '14px',
  },
});

const descriptionArea = createTextarea({
  placeholder: 'Description...',
  rows: 4,
  monospace: false,
  resize: 'none',
});

const editorArea = createTextarea({
  rows: 10,
  onKeydown: (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      submitForm();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      e.target.value = e.target.value.substring(0, start) + '\t' +
        e.target.value.substring(end);
      e.target.selectionStart = e.target.selectionEnd = start + 1;
    }
  },
});
```

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
const { container, checkbox } = createCheckbox('Enable feature', {
  checked: true,
  onChange: (e) => {
    console.log('Enabled:', e.target.checked);
  },
});

const checkboxes = ['Auto-save', 'Notifications', 'Dark mode'].map((feature) =>
  createCheckbox(feature, {
    name: 'features',
    value: feature.toLowerCase().replace(' ', '-'),
    onChange: (e) => {
      updateSettings(e.target.value, e.target.checked);
    },
  })
);

const { container: disabledBox } = createCheckbox('Premium feature', {
  checked: false,
  disabled: true,
});

const { container: rememberRow } = createCheckbox('Remember me', {
  id: 'remember-checkbox',
  checked: localStorage.getItem('remember') === 'true',
  onChange: (e) => {
    localStorage.setItem('remember', e.target.checked);
  },
});
```

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
const { container: temperatureRow } = createSlider('Temperature', {
  min: 0,
  max: 2,
  step: 0.1,
  value: 0.7,
  formatValue: (v) => parseFloat(v).toFixed(1),
  onInput: (e) => {
    updateTemperature(e.target.value);
  },
});

const { container: volumeRow } = createSlider('Opacity', {
  min: 0,
  max: 100,
  step: 5,
  value: 80,
  formatValue: (v) => `${v}%`,
  onChange: (e) => {
    element.style.opacity = e.target.value / 100;
  },
});

const { container: countRow } = createSlider('Count', {
  min: 1,
  max: 10,
  step: 1,
  value: 5,
  formatValue: (v) => `${v} items`,
});

const { container: hiddenValueRow } = createSlider('Volume', {
  min: 0,
  max: 100,
  value: 50,
  showValue: false,
  onInput: (e) => {
    setVolume(e.target.value);
  },
});

const { container: customSliderRow } = createSlider('Brightness', {
  min: 0,
  max: 100,
  value: 75,
  style: {
    marginBottom: '20px',
  },
  sliderClass: 'custom-slider',
});
```

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
const { container: themeRadios } = createRadioGroup(
  'theme',
  ['Dark', 'Light', 'Auto'],
  {
    selectedValue: 'Dark',
    onChange: (e) => {
      setTheme(e.target.value);
    },
  }
);

const { container: planRadios } = createRadioGroup(
  'plan',
  [
    { value: 'free', label: 'Free Plan' },
    { value: 'pro', label: 'Pro Plan ($10/mo)' },
    { value: 'enterprise', label: 'Enterprise Plan' },
  ],
  {
    selectedValue: 'free',
  }
);

const { container: sizeRadios } = createRadioGroup(
  'size',
  ['Small', 'Medium', 'Large'],
  {
    selectedValue: 'Medium',
    layout: 'horizontal',
  }
);

const { container: tierRadios } = createRadioGroup(
  'tier',
  [
    { value: 'basic', label: 'Basic' },
    { value: 'premium', label: 'Premium', disabled: true },
    { value: 'unlimited', label: 'Unlimited' },
  ],
  {
    selectedValue: 'basic',
    onChange: (e) => {
      console.log('Selected:', e.target.value);
    },
  }
);

const { container, radios } = createRadioGroup('option', ['A', 'B', 'C']);
radios.forEach((item, index) => {
  item.radio.addEventListener('focus', () => {
    console.log(`Option ${index} focused`);
  });
});
```

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

**Returns:** `HTMLElement`

**Examples:**

```javascript
const nameInput = createInput({ placeholder: 'Enter name' });
const nameRow = createFormRow('Name', nameInput);

const emailInput = createInput({ type: 'email' });
const emailRow = createFormRow('Email', emailInput, {
  required: true,
  helpText: 'We will never share your email',
});

const themeSelect = createSelect({ items: ['Dark', 'Light'] });
const themeRow = createFormRow('Theme', themeSelect, {
  layout: 'horizontal',
});

const passwordInput = createInput({ type: 'password', id: 'pwd' });
const passwordRow = createFormRow('Password', passwordInput, {
  id: 'pwd',
  required: true,
  helpText: 'At least 8 characters',
});
```

### `createFormGroup(elements, options)`

Create a form group container with optional title.

**Parameters:**
- `elements` (Array<HTMLElement>) - Array of form elements or rows
- `options.className` (string) - Additional CSS classes
- `options.title` (string) - Optional group title
- `options.style` (Object) - Custom style overrides

**Returns:** `HTMLElement`

**Examples:**

```javascript
const group = createFormGroup([
  createFormRow('First Name', createInput()),
  createFormRow('Last Name', createInput()),
  createFormRow('Email', createInput({ type: 'email' })),
]);

const loginGroup = createFormGroup(
  [
    createFormRow('Username', createInput()),
    createFormRow('Password', createInput({ type: 'password' })),
  ],
  {
    title: 'Login Credentials',
  }
);

const personalInfo = createFormGroup([
  createFormRow('Name', createInput()),
  createFormRow('Age', createInput({ type: 'number' })),
], { title: 'Personal Information' });

const contactInfo = createFormGroup([
  createFormRow('Email', createInput({ type: 'email' })),
  createFormRow('Phone', createInput({ type: 'tel' })),
], { title: 'Contact Information' });

const form = document.createElement('form');
form.appendChild(personalInfo);
form.appendChild(contactInfo);
```

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
  createFormGroup,
} from '../components/formElements.js';

const nameInput = createInput({ placeholder: 'Enter your name', id: 'name' });
const emailInput = createInput({ type: 'email', placeholder: 'email@example.com', id: 'email' });
const providerSelect = createSelect({
  items: ['Ollama', 'LM Studio', 'OpenAI'],
  placeholder: 'Select provider...',
  id: 'provider',
});
const promptArea = createTextarea({ placeholder: 'Enter your prompt...', rows: 8, id: 'prompt' });
const { container: tempSlider } = createSlider('Temperature', {
  min: 0,
  max: 2,
  step: 0.1,
  value: 0.7,
  formatValue: (v) => parseFloat(v).toFixed(1),
});
const { container: streamCheckbox } = createCheckbox('Enable streaming', {
  checked: true,
  id: 'streaming',
});
const { container: modelRadios } = createRadioGroup(
  'modelType',
  [
    { value: 'small', label: 'Small (Fast)' },
    { value: 'medium', label: 'Medium (Balanced)' },
    { value: 'large', label: 'Large (Accurate)' },
  ],
  {
    selectedValue: 'medium',
    layout: 'horizontal',
  }
);
const basicInfo = createFormGroup([
  createFormRow('Name', nameInput, { required: true, id: 'name' }),
  createFormRow('Email', emailInput, { required: true, id: 'email' }),
], { title: 'Basic Information' });
const llmSettings = createFormGroup([
  createFormRow('Provider', providerSelect, { id: 'provider' }),
  createFormRow('Model Type', modelRadios),
  tempSlider,
  streamCheckbox,
], { title: 'LLM Settings' });
const promptSection = createFormGroup([
  createFormRow('Prompt', promptArea, { id: 'prompt' }),
], { title: 'Prompt' });
const form = document.createElement('form');
form.appendChild(basicInfo);
form.appendChild(llmSettings);
form.appendChild(promptSection);
const submitBtn = document.createElement('button');
submitBtn.textContent = 'Submit';
submitBtn.type = 'submit';
form.appendChild(submitBtn);
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = {
    name: nameInput.value,
    email: emailInput.value,
    provider: providerSelect.value,
    prompt: promptArea.value,
  };
  console.log('Form data:', formData);
});
```

## Migration Guide

### Before (Manual Creation)

```javascript
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
import { createSlider } from '../components/formElements.js';

const { container, slider, valueDisplay } = createSlider('Temperature', {
  min: 0,
  max: 2,
  step: 0.1,
  value: 0.7,
});
```

## Best Practices

- Use `createFormRow()` for consistent label + control layout.
- Use `createFormGroup()` to group related fields under a title.
- Prefer semantic input types such as `email`, `url`, `tel`, and `date`.
- Provide help text for non-obvious fields.
- Use `ariaLabel` when labels are not sufficient.
- Use `formatValue()` on sliders to show contextual units.
- Keep custom styling narrow and prefer component props over manual CSS when possible.

## Styling Customization

All components support a `style` parameter for custom overrides.

```javascript
const input = createInput({
  placeholder: 'Custom',
  style: {
    background: '#222',
    border: '2px solid #4CAF50',
    borderRadius: '8px',
    fontSize: '14px',
    padding: '12px',
  },
});
```

```javascript
const { container, slider } = createSlider('Custom Slider', {
  min: 0,
  max: 100,
  value: 50,
  style: {
    marginTop: '12px',
  },
});
```

## Notes

This guide was migrated from the legacy `docs/FORM_ELEMENTS_GUIDE.md` file. Because the UI implementation has changed over time, verify the current behavior against `js/components/formElements.js` and related CSS/HTML assets when making future updates.

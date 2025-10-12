/**
 * Form Elements Component Library
 * 
 * Centralized form element creation utilities providing consistent styling
 * and behavior across the application. All form elements follow common
 * design patterns with customizable options.
 * 
 * @module components/formElements
 */

/**
 * Default style configurations for form elements
 */
const DEFAULT_STYLES = {
  input: {
    width: '100%',
    padding: '8px',
    background: '#333',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'inherit'
  },
  select: {
    width: '100%',
    padding: '8px',
    background: '#333',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  textarea: {
    width: '100%',
    minHeight: '150px',
    padding: '8px',
    background: '#333',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    resize: 'vertical'
  },
  slider: {
    width: '100%',
    margin: '5px 0'
  },
  checkbox: {
    marginRight: '8px',
    cursor: 'pointer'
  },
  radio: {
    marginRight: '6px',
    cursor: 'pointer'
  },
  label: {
    display: 'block',
    marginBottom: '4px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '500'
  }
};

/**
 * Apply styles to an element from a style object
 * @param {HTMLElement} element - Element to style
 * @param {Object} styles - Style object
 */
function applyStyles(element, styles) {
  Object.entries(styles).forEach(([key, value]) => {
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    element.style[key] = value;
  });
}

/**
 * Create a styled text input
 * 
 * @param {Object} options - Configuration options
 * @param {string} [options.type='text'] - Input type (text, number, email, password, etc.)
 * @param {string} [options.placeholder=''] - Placeholder text
 * @param {string|number} [options.value=''] - Initial value
 * @param {string} [options.min] - Minimum value (for number type)
 * @param {string} [options.max] - Maximum value (for number type)
 * @param {string} [options.step] - Step value (for number type)
 * @param {string} [options.className=''] - Additional CSS classes
 * @param {Function} [options.onInput] - Input event handler
 * @param {Function} [options.onChange] - Change event handler
 * @param {Function} [options.onKeydown] - Keydown event handler
 * @param {Object} [options.style] - Custom style overrides
 * @param {boolean} [options.disabled=false] - Disabled state
 * @param {string} [options.id] - Element ID
 * @param {string} [options.name] - Element name attribute
 * @param {string} [options.ariaLabel] - ARIA label for accessibility
 * @returns {HTMLInputElement} The styled input element
 * 
 * @example
 * const input = createInput({
 *   type: 'number',
 *   placeholder: 'Enter value',
 *   min: '0',
 *   max: '100',
 *   value: '50',
 *   onInput: (e) => console.log(e.target.value)
 * });
 */
export function createInput(options = {}) {
  const {
    type = 'text',
    placeholder = '',
    value = '',
    min,
    max,
    step,
    className = '',
    onInput,
    onChange,
    onKeydown,
    style = {},
    disabled = false,
    id,
    name,
    ariaLabel
  } = options;

  const input = document.createElement('input');
  input.type = type;
  
  if (placeholder) input.placeholder = placeholder;
  if (value !== '') input.value = value;
  if (min !== undefined) input.min = min;
  if (max !== undefined) input.max = max;
  if (step !== undefined) input.step = step;
  if (id) input.id = id;
  if (name) input.name = name;
  if (ariaLabel) input.setAttribute('aria-label', ariaLabel);
  if (disabled) input.disabled = disabled;
  
  if (className) {
    input.className = className;
  }
  
  // Apply default styles
  applyStyles(input, { ...DEFAULT_STYLES.input, ...style });
  
  // Event handlers
  if (onInput) input.addEventListener('input', onInput);
  if (onChange) input.addEventListener('change', onChange);
  if (onKeydown) input.addEventListener('keydown', onKeydown);
  
  return input;
}

/**
 * Create a styled select dropdown
 * 
 * @param {Object} options - Configuration options
 * @param {Array} [options.items=[]] - Array of items (strings or {value, text} objects)
 * @param {string|number} [options.value=''] - Initially selected value
 * @param {string} [options.className=''] - Additional CSS classes
 * @param {Function} [options.onChange] - Change event handler
 * @param {Object} [options.style] - Custom style overrides
 * @param {boolean} [options.disabled=false] - Disabled state
 * @param {string} [options.id] - Element ID
 * @param {string} [options.name] - Element name attribute
 * @param {string} [options.ariaLabel] - ARIA label for accessibility
 * @param {string} [options.placeholder] - Placeholder option text
 * @returns {HTMLSelectElement} The styled select element
 * 
 * @example
 * const select = createSelect({
 *   items: [
 *     { value: 'opt1', text: 'Option 1' },
 *     { value: 'opt2', text: 'Option 2' }
 *   ],
 *   value: 'opt1',
 *   onChange: (e) => console.log(e.target.value)
 * });
 * 
 * // Or with simple string array
 * const select2 = createSelect({
 *   items: ['Option 1', 'Option 2', 'Option 3'],
 *   placeholder: 'Select an option...'
 * });
 */
export function createSelect(options = {}) {
  const {
    items = [],
    value = '',
    className = '',
    onChange,
    style = {},
    disabled = false,
    id,
    name,
    ariaLabel,
    placeholder
  } = options;

  const select = document.createElement('select');
  
  if (id) select.id = id;
  if (name) select.name = name;
  if (ariaLabel) select.setAttribute('aria-label', ariaLabel);
  if (disabled) select.disabled = disabled;
  if (className) select.className = className;
  
  // Apply default styles
  applyStyles(select, { ...DEFAULT_STYLES.select, ...style });
  
  // Add placeholder option if provided
  if (placeholder) {
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    placeholderOption.disabled = true;
    placeholderOption.selected = !value;
    select.appendChild(placeholderOption);
  }
  
  // Add items
  items.forEach(item => {
    const option = document.createElement('option');
    
    if (typeof item === 'string') {
      option.value = item;
      option.textContent = item;
    } else {
      option.value = item.value;
      option.textContent = item.text || item.value;
      if (item.disabled) option.disabled = true;
    }
    
    if (option.value === value) {
      option.selected = true;
    }
    
    select.appendChild(option);
  });
  
  // Event handlers
  if (onChange) select.addEventListener('change', onChange);
  
  return select;
}

/**
 * Create a styled textarea
 * 
 * @param {Object} options - Configuration options
 * @param {string} [options.placeholder=''] - Placeholder text
 * @param {string} [options.value=''] - Initial value
 * @param {number} [options.rows=6] - Number of rows
 * @param {number} [options.cols] - Number of columns
 * @param {boolean} [options.monospace=true] - Use monospace font
 * @param {string} [options.className=''] - Additional CSS classes
 * @param {Function} [options.onInput] - Input event handler
 * @param {Function} [options.onChange] - Change event handler
 * @param {Function} [options.onKeydown] - Keydown event handler
 * @param {Object} [options.style] - Custom style overrides
 * @param {boolean} [options.disabled=false] - Disabled state
 * @param {string} [options.id] - Element ID
 * @param {string} [options.name] - Element name attribute
 * @param {string} [options.ariaLabel] - ARIA label for accessibility
 * @param {string} [options.resize='vertical'] - CSS resize property (vertical, horizontal, both, none)
 * @returns {HTMLTextAreaElement} The styled textarea element
 * 
 * @example
 * const textarea = createTextarea({
 *   placeholder: 'Enter your text...',
 *   rows: 10,
 *   monospace: true,
 *   onInput: (e) => console.log(e.target.value.length, 'characters')
 * });
 */
export function createTextarea(options = {}) {
  const {
    placeholder = '',
    value = '',
    rows = 6,
    cols,
    monospace = true,
    className = '',
    onInput,
    onChange,
    onKeydown,
    style = {},
    disabled = false,
    id,
    name,
    ariaLabel,
    resize = 'vertical'
  } = options;

  const textarea = document.createElement('textarea');
  
  if (placeholder) textarea.placeholder = placeholder;
  if (value) textarea.value = value;
  textarea.rows = rows;
  if (cols) textarea.cols = cols;
  if (id) textarea.id = id;
  if (name) textarea.name = name;
  if (ariaLabel) textarea.setAttribute('aria-label', ariaLabel);
  if (disabled) textarea.disabled = disabled;
  if (className) textarea.className = className;
  
  // Apply default styles
  const textareaStyles = {
    ...DEFAULT_STYLES.textarea,
    fontFamily: monospace ? 'monospace' : 'inherit',
    resize,
    ...style
  };
  applyStyles(textarea, textareaStyles);
  
  // Event handlers
  if (onInput) textarea.addEventListener('input', onInput);
  if (onChange) textarea.addEventListener('change', onChange);
  if (onKeydown) textarea.addEventListener('keydown', onKeydown);
  
  return textarea;
}

/**
 * Create a checkbox with label
 * 
 * @param {string} labelText - Label text
 * @param {Object} options - Configuration options
 * @param {boolean} [options.checked=false] - Initial checked state
 * @param {string} [options.className=''] - Additional CSS classes for container
 * @param {string} [options.checkboxClass=''] - Additional CSS classes for checkbox
 * @param {string} [options.labelClass=''] - Additional CSS classes for label
 * @param {Function} [options.onChange] - Change event handler
 * @param {Object} [options.style] - Custom style overrides for container
 * @param {boolean} [options.disabled=false] - Disabled state
 * @param {string} [options.id] - Element ID for checkbox
 * @param {string} [options.name] - Element name attribute
 * @param {string} [options.value] - Checkbox value attribute
 * @returns {Object} Object containing {container, checkbox, label}
 * 
 * @example
 * const { container, checkbox } = createCheckbox('Enable feature', {
 *   checked: true,
 *   onChange: (e) => console.log('Checked:', e.target.checked)
 * });
 */
export function createCheckbox(labelText, options = {}) {
  const {
    checked = false,
    className = '',
    checkboxClass = '',
    labelClass = '',
    onChange,
    style = {},
    disabled = false,
    id,
    name,
    value
  } = options;

  const container = document.createElement('div');
  container.className = `checkbox-container ${className}`.trim();
  applyStyles(container, {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
    ...style
  });

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = checked;
  checkbox.className = checkboxClass;
  if (id) checkbox.id = id;
  if (name) checkbox.name = name;
  if (value !== undefined) checkbox.value = value;
  if (disabled) checkbox.disabled = disabled;
  
  applyStyles(checkbox, DEFAULT_STYLES.checkbox);
  
  const label = document.createElement('label');
  label.textContent = labelText;
  label.className = labelClass;
  if (id) label.setAttribute('for', id);
  
  applyStyles(label, {
    cursor: disabled ? 'default' : 'pointer',
    color: disabled ? '#888' : '#fff',
    fontSize: '12px',
    userSelect: 'none'
  });
  
  if (onChange) checkbox.addEventListener('change', onChange);
  
  container.appendChild(checkbox);
  container.appendChild(label);
  
  return { container, checkbox, label };
}

/**
 * Create a slider with label and value display
 * 
 * @param {string} labelText - Label text
 * @param {Object} options - Configuration options
 * @param {number} [options.min=0] - Minimum value
 * @param {number} [options.max=100] - Maximum value
 * @param {number} [options.step=1] - Step increment
 * @param {number} [options.value=50] - Initial value
 * @param {string} [options.className=''] - Additional CSS classes for container
 * @param {string} [options.sliderClass=''] - Additional CSS classes for slider
 * @param {string} [options.labelClass=''] - Additional CSS classes for label
 * @param {string} [options.valueClass=''] - Additional CSS classes for value display
 * @param {Function} [options.onInput] - Input event handler (fires during dragging)
 * @param {Function} [options.onChange] - Change event handler (fires on release)
 * @param {Function} [options.formatValue] - Function to format displayed value
 * @param {Object} [options.style] - Custom style overrides for container
 * @param {boolean} [options.disabled=false] - Disabled state
 * @param {string} [options.id] - Element ID for slider
 * @param {string} [options.name] - Element name attribute
 * @param {boolean} [options.showValue=true] - Whether to show value display
 * @returns {Object} Object containing {container, slider, valueDisplay, label}
 * 
 * @example
 * const { container, slider } = createSlider('Temperature', {
 *   min: 0,
 *   max: 2,
 *   step: 0.1,
 *   value: 0.7,
 *   formatValue: (v) => v.toFixed(1),
 *   onInput: (e) => console.log('Current:', e.target.value)
 * });
 */
export function createSlider(labelText, options = {}) {
  const {
    min = 0,
    max = 100,
    step = 1,
    value = 50,
    className = '',
    sliderClass = '',
    labelClass = '',
    valueClass = '',
    onInput,
    onChange,
    formatValue = (v) => v,
    style = {},
    disabled = false,
    id,
    name,
    showValue = true
  } = options;

  const container = document.createElement('div');
  container.className = `slider-container ${className}`.trim();
  applyStyles(container, {
    marginBottom: '12px',
    ...style
  });

  // Header with label and value
  const header = document.createElement('div');
  applyStyles(header, {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px'
  });

  const label = document.createElement('label');
  label.textContent = labelText;
  label.className = labelClass;
  if (id) label.setAttribute('for', id);
  applyStyles(label, DEFAULT_STYLES.label);

  const valueDisplay = document.createElement('span');
  valueDisplay.className = `slider-value ${valueClass}`.trim();
  valueDisplay.textContent = formatValue(value);
  applyStyles(valueDisplay, {
    color: '#fff',
    fontSize: '12px',
    fontWeight: '500',
    minWidth: '40px',
    textAlign: 'right'
  });

  header.appendChild(label);
  if (showValue) {
    header.appendChild(valueDisplay);
  }

  // Slider
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = min;
  slider.max = max;
  slider.step = step;
  slider.value = value;
  slider.className = sliderClass;
  if (id) slider.id = id;
  if (name) slider.name = name;
  if (disabled) slider.disabled = disabled;
  
  applyStyles(slider, DEFAULT_STYLES.slider);

  // Update value display on input
  const updateValue = (e) => {
    if (showValue) {
      valueDisplay.textContent = formatValue(e.target.value);
    }
    if (onInput) onInput(e);
  };

  slider.addEventListener('input', updateValue);
  if (onChange) slider.addEventListener('change', onChange);

  container.appendChild(header);
  container.appendChild(slider);

  return { container, slider, valueDisplay, label };
}

/**
 * Create a radio button group
 * 
 * @param {string} name - Group name (same name for all radios in group)
 * @param {Array} items - Array of {value, label, checked} objects or strings
 * @param {Object} options - Configuration options
 * @param {string} [options.selectedValue] - Initially selected value
 * @param {string} [options.className=''] - Additional CSS classes for container
 * @param {string} [options.radioClass=''] - Additional CSS classes for radio buttons
 * @param {string} [options.labelClass=''] - Additional CSS classes for labels
 * @param {Function} [options.onChange] - Change event handler
 * @param {Object} [options.style] - Custom style overrides for container
 * @param {boolean} [options.disabled=false] - Disabled state for all radios
 * @param {string} [options.layout='vertical'] - Layout direction (vertical or horizontal)
 * @returns {Object} Object containing {container, radios}
 * 
 * @example
 * const { container, radios } = createRadioGroup('theme', [
 *   { value: 'dark', label: 'Dark Theme' },
 *   { value: 'light', label: 'Light Theme' },
 *   { value: 'auto', label: 'Auto' }
 * ], {
 *   selectedValue: 'dark',
 *   onChange: (e) => console.log('Selected:', e.target.value)
 * });
 */
export function createRadioGroup(name, items = [], options = {}) {
  const {
    selectedValue,
    className = '',
    radioClass = '',
    labelClass = '',
    onChange,
    style = {},
    disabled = false,
    layout = 'vertical'
  } = options;

  const container = document.createElement('div');
  container.className = `radio-group ${className}`.trim();
  applyStyles(container, {
    display: 'flex',
    flexDirection: layout === 'horizontal' ? 'row' : 'column',
    gap: layout === 'horizontal' ? '16px' : '8px',
    ...style
  });

  const radios = [];

  items.forEach((item, index) => {
    const itemValue = typeof item === 'string' ? item : item.value;
    const itemLabel = typeof item === 'string' ? item : (item.label || item.value);
    const itemChecked = typeof item === 'string' ? (itemValue === selectedValue) : (item.checked || itemValue === selectedValue);
    const itemDisabled = typeof item === 'string' ? disabled : (item.disabled || disabled);

    const radioContainer = document.createElement('div');
    applyStyles(radioContainer, {
      display: 'flex',
      alignItems: 'center'
    });

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = name;
    radio.value = itemValue;
    radio.id = `${name}-${index}`;
    radio.checked = itemChecked;
    radio.disabled = itemDisabled;
    radio.className = radioClass;
    
    applyStyles(radio, DEFAULT_STYLES.radio);

    const label = document.createElement('label');
    label.textContent = itemLabel;
    label.setAttribute('for', radio.id);
    label.className = labelClass;
    
    applyStyles(label, {
      cursor: itemDisabled ? 'default' : 'pointer',
      color: itemDisabled ? '#888' : '#fff',
      fontSize: '12px',
      userSelect: 'none'
    });

    if (onChange) radio.addEventListener('change', onChange);

    radioContainer.appendChild(radio);
    radioContainer.appendChild(label);
    container.appendChild(radioContainer);

    radios.push({ radio, label, container: radioContainer });
  });

  return { container, radios };
}

/**
 * Create a form row with label and element
 * 
 * @param {string} labelText - Label text
 * @param {HTMLElement} element - Form element
 * @param {Object} options - Configuration options
 * @param {string} [options.className=''] - Additional CSS classes for container
 * @param {string} [options.labelClass=''] - Additional CSS classes for label
 * @param {Object} [options.style] - Custom style overrides for container
 * @param {string} [options.id] - ID for the label (will set for attribute)
 * @param {boolean} [options.required=false] - Whether field is required
 * @param {string} [options.helpText] - Optional help text below the element
 * @param {string} [options.layout='vertical'] - Layout (vertical or horizontal)
 * @returns {HTMLElement} Container with label and element
 * 
 * @example
 * const input = createInput({ placeholder: 'Enter name' });
 * const row = createFormRow('Name', input, {
 *   required: true,
 *   helpText: 'Your full name'
 * });
 */
export function createFormRow(labelText, element, options = {}) {
  const {
    className = '',
    labelClass = '',
    style = {},
    id,
    required = false,
    helpText,
    layout = 'vertical'
  } = options;

  const container = document.createElement('div');
  container.className = `form-row ${className}`.trim();
  
  const containerStyles = {
    marginBottom: '16px',
    ...style
  };
  
  if (layout === 'horizontal') {
    containerStyles.display = 'flex';
    containerStyles.alignItems = 'center';
    containerStyles.gap = '12px';
  }
  
  applyStyles(container, containerStyles);

  const label = document.createElement('label');
  label.textContent = labelText + (required ? ' *' : '');
  label.className = labelClass;
  if (id) label.setAttribute('for', id);
  
  const labelStyles = { ...DEFAULT_STYLES.label };
  if (layout === 'horizontal') {
    labelStyles.minWidth = '120px';
    labelStyles.marginBottom = '0';
  }
  applyStyles(label, labelStyles);

  container.appendChild(label);
  
  if (layout === 'horizontal') {
    const elementWrapper = document.createElement('div');
    applyStyles(elementWrapper, { flex: '1' });
    elementWrapper.appendChild(element);
    container.appendChild(elementWrapper);
  } else {
    container.appendChild(element);
  }

  if (helpText) {
    const help = document.createElement('div');
    help.className = 'form-help-text';
    help.textContent = helpText;
    applyStyles(help, {
      fontSize: '11px',
      color: '#999',
      marginTop: '4px',
      fontStyle: 'italic'
    });
    container.appendChild(help);
  }

  return container;
}

/**
 * Create a form group container
 * 
 * @param {Array<HTMLElement>} elements - Array of form elements or rows
 * @param {Object} options - Configuration options
 * @param {string} [options.className=''] - Additional CSS classes
 * @param {string} [options.title] - Optional group title
 * @param {Object} [options.style] - Custom style overrides
 * @returns {HTMLElement} Form group container
 * 
 * @example
 * const group = createFormGroup([
 *   createFormRow('Email', createInput({ type: 'email' })),
 *   createFormRow('Password', createInput({ type: 'password' }))
 * ], {
 *   title: 'Login Credentials'
 * });
 */
export function createFormGroup(elements, options = {}) {
  const {
    className = '',
    title,
    style = {}
  } = options;

  const container = document.createElement('div');
  container.className = `form-group ${className}`.trim();
  applyStyles(container, {
    marginBottom: '24px',
    ...style
  });

  if (title) {
    const titleElement = document.createElement('h3');
    titleElement.textContent = title;
    applyStyles(titleElement, {
      color: '#fff',
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '12px',
      marginTop: '0'
    });
    container.appendChild(titleElement);
  }

  elements.forEach(element => {
    container.appendChild(element);
  });

  return container;
}

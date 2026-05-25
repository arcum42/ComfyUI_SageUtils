/**
 * Cache Sidebar UI Components
 * Reusable UI component factory functions for the cache sidebar
 */

// Import centralized button components
export { createButton, createIconButton, createButtonGroup, BUTTON_VARIANTS, BUTTON_SIZES, BUTTON_CONFIGS } from './buttons.js';

/**
 * Create a labeled container with consistent styling
 */
export function createLabeledContainer(labelText, marginBottom = '10px') {
    const container = document.createElement('div');
    container.classList.add('sage-labeled-container');
    if (marginBottom !== '10px') {
        container.style.setProperty('--sage-label-margin-bottom', marginBottom);
    }

    const label = document.createElement('label');
    label.textContent = labelText;
    label.classList.add('sage-label');

    container.appendChild(label);
    return { container, label };
}

/**
 * Create a styled select dropdown
 */
export function createStyledSelect(options = []) {
    const select = document.createElement('select');
    select.classList.add('sage-select');

    // Add options if provided
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text;
        select.appendChild(optionElement);
    });

    return select;
}

/**
 * Create a styled input field
 */
export function createStyledInput(type = 'text', placeholder = '') {
    const input = document.createElement('input');
    input.type = type;
    input.placeholder = placeholder;
    input.classList.add('sage-input');

    return input;
}

/**
 * Create a styled button
 * @deprecated Use createButton() from buttons.js instead
 */
export function createStyledButton(text, backgroundColor = '#4CAF50', icon = '') {
    console.warn('createStyledButton is deprecated. Use createButton() from buttons.js instead.');
    // Use the centralized button component
    const { createButton } = require('./buttons.js');
    return createButton(text, {
        color: backgroundColor,
        icon
    });
}

/**
 * Create a filter section with label and select
 */
export function createFilterSection(labelText, options, marginBottom = '10px') {
    const { container, label } = createLabeledContainer(labelText, marginBottom);
    const select = createStyledSelect(options);
    
    container.appendChild(select);
    
    return { container, label, select };
}

/**
 * Create a search input section
 */
export function createSearchSection(labelText = 'Search Models:', placeholder = 'Type to search...') {
    const { container, label } = createLabeledContainer(labelText);
    const input = createStyledInput('text', placeholder);
    
    container.appendChild(input);
    
    return { container, label, input };
}

/**
 * Create a toggle checkbox with label
 */
export function createToggleSection(labelText, checkboxId) {
    const container = document.createElement('div');
    container.classList.add('sage-toggle-row');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = checkboxId;
    checkbox.classList.add('sage-checkbox');

    const label = document.createElement('label');
    label.htmlFor = checkboxId;
    label.textContent = labelText;
    label.classList.add('sage-toggle-label');

    container.appendChild(checkbox);
    container.appendChild(label);

    return { container, checkbox, label };
}

/**
 * Create a custom dropdown with button and menu
 */
export function createCustomDropdown(buttonText = 'Select a file...') {
    const container = document.createElement('div');
    container.classList.add('sage-dropdown-container');
    
    const button = document.createElement('div');
    button.classList.add('sage-dropdown-button');
    button.innerHTML = `<span>${buttonText}</span><span>▼</span>`;
    
    const menu = document.createElement('div');
    menu.classList.add('sage-dropdown-menu');
    
    container.appendChild(button);
    // Append menu to body to avoid container constraints
    document.body.appendChild(menu);
    
    return { container, button, menu };
}

// Progress bar functionality moved to progressBar.js
export { createProgressBar } from './progressBar.js';

/**
 * Create a button container for multiple buttons
 * @deprecated Use createButtonGroup() from buttons.js instead
 */
export function createButtonContainer() {
    console.warn('createButtonContainer is deprecated. Use createButtonGroup() from buttons.js instead.');
    const container = document.createElement('div');
    container.classList.add('sage-button-group');

    return container;
}

/**
 * Create the main container with consistent styling
 */
export function createMainContainer() {
    const container = document.createElement('div');
    container.classList.add('sage-main-container');

    return container;
}

/**
 * Create a header section
 */
export function createHeader(title, subtitle) {
    const header = document.createElement('div');
    header.classList.add('sage-header');
    
    const titleHtml = `<h3 class="sage-header-title">${title}</h3>`;
    const subtitleHtml = subtitle ? `<p class="sage-header-subtitle">${subtitle}</p>` : '';
    
    header.innerHTML = titleHtml + subtitleHtml;

    return header;
}

/**
 * Create a loading indicator
 */
export function createLoadingIndicator(text = 'Loading...') {
    const indicator = document.createElement('div');
    indicator.classList.add('sage-loading-indicator');
    indicator.textContent = text;

    return indicator;
}

/**
 * Create an info display container
 */
export function createInfoDisplay() {
    const display = document.createElement('div');
    display.id = 'cache-info-display';

    return display;
}

/**
 * Add dropdown styles to the document head
 */
export function addDropdownStyles() {
    // Styles are provided by the shared component stylesheet.
}

/**
 * Create tab button with hover effects
 * @deprecated Use TabManager class from components/tabs.js instead for complete tab management
 * @param {string} text - Button text
 * @param {boolean} isActive - Whether the button is initially active
 * @returns {HTMLElement} Tab button element
 */
export function createTabButton(text, isActive = false) {
    console.warn('[DEPRECATED] createTabButton from cacheUI.js is deprecated. Use TabManager class from components/tabs.js instead.');
    
    const button = document.createElement('button');
    button.textContent = text;
    button.className = `tab-button sage-tab-button${isActive ? ' active' : ''}`;
    
    return button;
}

// BUTTON_CONFIGS has been moved to buttons.js and is re-exported above

/**
 * Pre-defined filter options
 */
export const FILTER_OPTIONS = {
    modelType: [
        { value: 'all', text: 'All Models' },
        { value: 'Checkpoint', text: 'Checkpoints Only' },
        { value: 'LORA', text: 'LoRAs Only' }
    ],
    lastUsed: [
        { value: 'all', text: 'All Models' },
        { value: 'today', text: 'Used Today' },
        { value: 'week', text: 'Used This Week' },
        { value: 'month', text: 'Used This Month' },
        { value: 'never', text: 'Never Used' }
    ],
    updates: [
        { value: 'all', text: 'All Models' },
        { value: 'available', text: 'Updates Available' },
        { value: 'none', text: 'No Updates Available' }
    ],
    sort: [
        { value: 'name', text: 'Name (A-Z)' },
        { value: 'name-desc', text: 'Name (Z-A)' },
        { value: 'lastused', text: 'Last Used (Recent First)' },
        { value: 'lastused-desc', text: 'Last Used (Oldest First)' },
        { value: 'size', text: 'File Size (Small to Large)' },
        { value: 'size-desc', text: 'File Size (Large to Small)' },
        { value: 'type', text: 'Type' }
    ]
};

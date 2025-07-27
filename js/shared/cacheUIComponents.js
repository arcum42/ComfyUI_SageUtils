/**
 * Cache Sidebar UI Components
 * Reusable UI component factory functions for the cache sidebar
 */

/**
 * Create a labeled container with consistent styling
 */
export function createLabeledContainer(labelText, marginBottom = '10px') {
    const container = document.createElement('div');
    container.style.marginBottom = marginBottom;

    const label = document.createElement('label');
    label.textContent = labelText;
    label.style.cssText = `
        display: block;
        margin-bottom: 5px;
        color: #ffffff;
        font-size: 13px;
        font-weight: bold;
    `;

    container.appendChild(label);
    return { container, label };
}

/**
 * Create a styled select dropdown
 */
export function createStyledSelect(options = []) {
    const select = document.createElement('select');
    select.style.cssText = `
        width: 100%;
        padding: 8px;
        background: #333;
        color: #fff;
        border: 1px solid #555;
        border-radius: 4px;
        font-size: 12px;
        margin-bottom: 10px;
    `;

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
    input.style.cssText = `
        width: 100%;
        padding: 8px;
        background: #333;
        color: #fff;
        border: 1px solid #555;
        border-radius: 4px;
        font-size: 12px;
        margin-bottom: 10px;
        box-sizing: border-box;
    `;

    return input;
}

/**
 * Create a styled button
 */
export function createStyledButton(text, backgroundColor = '#4CAF50', icon = '') {
    const button = document.createElement('button');
    button.textContent = `${icon} ${text}`.trim();
    button.style.cssText = `
        margin-top: 8px;
        padding: 6px 12px;
        background: ${backgroundColor};
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    `;

    return button;
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
    container.style.cssText = `
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 8px;
    `;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = checkboxId;
    checkbox.style.cssText = `
        margin: 0;
        transform: scale(1.2);
    `;

    const label = document.createElement('label');
    label.htmlFor = checkboxId;
    label.textContent = labelText;
    label.style.cssText = `
        color: #ffffff;
        font-size: 13px;
        font-weight: bold;
        cursor: pointer;
        user-select: none;
    `;

    container.appendChild(checkbox);
    container.appendChild(label);

    return { container, checkbox, label };
}

/**
 * Create a custom dropdown with button and menu
 */
export function createCustomDropdown(buttonText = 'Select a file...') {
    const container = document.createElement('div');
    container.style.cssText = `
        position: relative;
        width: 100%;
    `;
    
    const button = document.createElement('div');
    button.style.cssText = `
        width: 100%;
        padding: 8px;
        background: #333;
        color: #fff;
        border: 1px solid #555;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
    `;
    button.innerHTML = `<span>${buttonText}</span><span>▼</span>`;
    
    const menu = document.createElement('div');
    menu.style.cssText = `
        position: fixed;
        background: #333;
        border: 1px solid #555;
        border-top: none;
        border-radius: 0 0 4px 4px;
        max-height: 600px;
        overflow-y: auto;
        z-index: 1000;
        display: none;
        box-shadow: 2px 2px 8px rgba(0,0,0,0.3);
    `;
    
    container.appendChild(button);
    // Append menu to body to avoid container constraints
    document.body.appendChild(menu);
    
    return { container, button, menu };
}

/**
 * Create a progress bar component
 */
export function createProgressBar(labelText = 'Progress...') {
    const container = document.createElement('div');
    container.style.cssText = `
        margin-top: 10px;
        display: none;
    `;

    const label = document.createElement('div');
    label.style.cssText = `
        color: #fff;
        font-size: 12px;
        margin-bottom: 5px;
    `;
    label.textContent = labelText;

    const barOuter = document.createElement('div');
    barOuter.style.cssText = `
        width: 100%;
        height: 20px;
        background: #333;
        border: 1px solid #555;
        border-radius: 4px;
        overflow: hidden;
    `;

    const barInner = document.createElement('div');
    barInner.style.cssText = `
        height: 100%;
        background: linear-gradient(90deg, #9C27B0, #E91E63);
        width: 0%;
        transition: width 0.3s ease;
        position: relative;
    `;

    const text = document.createElement('div');
    text.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 11px;
        font-weight: bold;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
    `;
    text.textContent = '0%';

    barInner.appendChild(text);
    barOuter.appendChild(barInner);
    container.appendChild(label);
    container.appendChild(barOuter);

    return { container, label, barOuter, barInner, text };
}

/**
 * Create a button container for multiple buttons
 */
export function createButtonContainer() {
    const container = document.createElement('div');
    container.style.cssText = `
        display: flex;
        gap: 4px;
        margin-top: 8px;
        flex-wrap: wrap;
    `;

    return container;
}

/**
 * Create the main container with consistent styling
 */
export function createMainContainer() {
    const container = document.createElement('div');
    container.style.cssText = `
        padding: 10px;
        height: 100%;
        overflow-y: auto;
        background: #1e1e1e;
        color: #ffffff;
    `;

    return container;
}

/**
 * Create a header section
 */
export function createHeader(title, subtitle) {
    const header = document.createElement('div');
    header.style.cssText = `
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid #444;
    `;
    header.innerHTML = `
        <h3 style="margin: 0; color: #ffffff; font-size: 16px;">${title}</h3>
        <p style="margin: 5px 0 0 0; color: #aaa; font-size: 12px;">${subtitle}</p>
    `;

    return header;
}

/**
 * Create a loading indicator
 */
export function createLoadingIndicator(text = 'Loading...') {
    const indicator = document.createElement('div');
    indicator.style.cssText = `
        text-align: center;
        padding: 20px;
        color: #888;
        font-style: italic;
    `;
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
    const style = document.createElement('style');
    style.textContent = `
        .cache-dropdown-item {
            padding: 6px 10px;
            cursor: pointer;
            position: relative;
            border-bottom: 1px solid #444;
            font-size: 11px;
        }
        .cache-dropdown-item:hover {
            background: #444;
        }
        .cache-dropdown-item.folder {
            background: #383838;
            font-weight: bold;
        }
        .cache-dropdown-item.folder:hover {
            background: #484848;
        }
        .cache-dropdown-item.folder::after {
            content: "▶";
            float: right;
        }
        .cache-dropdown-submenu {
            position: fixed;
            background: #333;
            border: 1px solid #555;
            border-radius: 4px;
            min-width: 250px;
            max-height: 300px;
            overflow-y: auto;
            z-index: 1001;
            display: none;
            box-shadow: 2px 2px 8px rgba(0,0,0,0.3);
        }
        .cache-dropdown-item.file {
            color: #e0e0e0;
        }
        .cache-dropdown-item.selected {
            background: #4CAF50;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Create tab button with hover effects
 * @param {string} text - Button text
 * @param {boolean} isActive - Whether the button is initially active
 * @returns {HTMLElement} Tab button element
 */
export function createTabButton(text, isActive = false) {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.cssText = `
        padding: 10px 20px;
        border: none;
        background: ${isActive ? '#4CAF50' : '#2a2a2a'};
        color: ${isActive ? 'white' : '#ccc'};
        cursor: pointer;
        border-radius: 6px 6px 0 0;
        margin-right: 2px;
        font-size: 13px;
        font-weight: ${isActive ? 'bold' : 'normal'};
        transition: all 0.2s ease;
        border-bottom: 2px solid ${isActive ? '#4CAF50' : 'transparent'};
        position: relative;
        top: 2px;
    `;
    
    // Hover effects
    button.addEventListener('mouseenter', () => {
        if (!button.classList.contains('active')) {
            button.style.background = '#3a3a3a';
            button.style.color = 'white';
            button.style.transform = 'translateY(-1px)';
        }
    });
    
    button.addEventListener('mouseleave', () => {
        if (!button.classList.contains('active')) {
            button.style.background = '#2a2a2a';
            button.style.color = '#ccc';
            button.style.transform = 'translateY(0)';
        }
    });
    
    return button;
}

/**
 * Pre-defined button configurations
 */
export const BUTTON_CONFIGS = {
    refresh: { text: 'Refresh', color: '#4CAF50', icon: '↻' },
    pull: { text: 'Pull', color: '#2196F3', icon: '⬇' },
    edit: { text: 'Edit', color: '#FF9800', icon: '✏' },
    scan: { text: 'Scan All', color: '#9C27B0', icon: '🔍' },
    report: { text: 'Generate Report', color: '#673AB7', icon: '📊' }
};

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

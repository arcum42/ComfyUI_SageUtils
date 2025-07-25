/**
 * UI Components for SageUtils Cache Browser
 * Handles creation of UI elements and styling
 */

/**
 * Common button styling
 */
export const BUTTON_STYLES = {
    base: `
        margin-top: 8px;
        padding: 6px 12px;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    `,
    refresh: '#4CAF50',
    pull: '#2196F3',
    edit: '#FF9800',
    scan: '#9C27B0',
    report: '#673AB7'
};

/**
 * Common input styling
 */
export const INPUT_STYLES = {
    select: `
        width: 100%;
        padding: 8px;
        background: #333;
        color: #fff;
        border: 1px solid #555;
        border-radius: 4px;
        font-size: 12px;
        margin-bottom: 10px;
    `,
    input: `
        width: 100%;
        padding: 8px;
        background: #333;
        color: #fff;
        border: 1px solid #555;
        border-radius: 4px;
        font-size: 12px;
        margin-bottom: 10px;
        box-sizing: border-box;
    `,
    label: `
        display: block;
        margin-bottom: 5px;
        color: #ffffff;
        font-size: 13px;
        font-weight: bold;
    `
};

/**
 * Create a styled button element
 * @param {string} text - Button text
 * @param {string} color - Background color
 * @param {boolean} disabled - Whether button is disabled
 * @returns {HTMLButtonElement} - Created button element
 */
export function createButton(text, color, disabled = false) {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.cssText = BUTTON_STYLES.base + `background: ${color};`;
    
    if (disabled) {
        button.disabled = true;
        button.style.opacity = '0.5';
    }
    
    return button;
}

/**
 * Create a styled select dropdown
 * @param {Array} options - Array of {value, text} option objects
 * @param {string} defaultValue - Default selected value
 * @returns {HTMLSelectElement} - Created select element
 */
export function createSelect(options, defaultValue = null) {
    const select = document.createElement('select');
    select.style.cssText = INPUT_STYLES.select;
    
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text;
        if (defaultValue && option.value === defaultValue) {
            optionElement.selected = true;
        }
        select.appendChild(optionElement);
    });
    
    return select;
}

/**
 * Create a styled input element
 * @param {string} type - Input type
 * @param {string} placeholder - Placeholder text
 * @returns {HTMLInputElement} - Created input element
 */
export function createInput(type = 'text', placeholder = '') {
    const input = document.createElement('input');
    input.type = type;
    input.placeholder = placeholder;
    input.style.cssText = INPUT_STYLES.input;
    return input;
}

/**
 * Create a styled label element
 * @param {string} text - Label text
 * @param {string} htmlFor - Associated input ID
 * @returns {HTMLLabelElement} - Created label element
 */
export function createLabel(text, htmlFor = null) {
    const label = document.createElement('label');
    label.textContent = text;
    label.style.cssText = INPUT_STYLES.label;
    if (htmlFor) {
        label.htmlFor = htmlFor;
    }
    return label;
}

/**
 * Create a container div with specified styling
 * @param {string} marginBottom - Bottom margin
 * @returns {HTMLDivElement} - Created container element
 */
export function createContainer(marginBottom = '10px') {
    const container = document.createElement('div');
    container.style.marginBottom = marginBottom;
    return container;
}

/**
 * Create progress bar component
 * @returns {Object} - Object containing progress elements and update function
 */
export function createProgressBar() {
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
    label.textContent = 'Scanning models...';

    const outer = document.createElement('div');
    outer.style.cssText = `
        width: 100%;
        height: 20px;
        background: #333;
        border: 1px solid #555;
        border-radius: 4px;
        overflow: hidden;
    `;

    const inner = document.createElement('div');
    inner.style.cssText = `
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

    inner.appendChild(text);
    outer.appendChild(inner);
    container.appendChild(label);
    container.appendChild(outer);

    return {
        container,
        label,
        outer,
        inner,
        text,
        show() {
            container.style.display = 'block';
        },
        hide() {
            container.style.display = 'none';
        },
        update(percentage, labelText) {
            inner.style.width = `${percentage}%`;
            text.textContent = `${percentage}%`;
            if (labelText) {
                label.textContent = labelText;
            }
        }
    };
}

/**
 * Create dropdown CSS styles and add to document
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
 * Create custom dropdown component
 * @param {string} placeholder - Placeholder text
 * @returns {Object} - Object containing dropdown elements and methods
 */
export function createCustomDropdown(placeholder = 'Select an option...') {
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
    button.innerHTML = `<span>${placeholder}</span><span>▼</span>`;
    
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
    document.body.appendChild(menu); // Append to body to avoid container constraints
    
    let isOpen = false;
    
    return {
        container,
        button,
        menu,
        get isOpen() { return isOpen; },
        set isOpen(value) { isOpen = value; },
        show() {
            const rect = button.getBoundingClientRect();
            menu.style.left = `${rect.left}px`;
            menu.style.top = `${rect.bottom}px`;
            menu.style.width = `${rect.width}px`;
            menu.style.display = 'block';
            button.innerHTML = button.innerHTML.replace('▼', '▲');
            isOpen = true;
        },
        hide() {
            menu.style.display = 'none';
            button.innerHTML = button.innerHTML.replace('▲', '▼');
            isOpen = false;
        },
        clear() {
            menu.innerHTML = '';
        },
        setPlaceholder(text) {
            if (!isOpen) {
                button.innerHTML = `<span>${text}</span><span>▼</span>`;
            }
        }
    };
}

/**
 * Create NSFW toggle component
 * @param {string} id - Element ID
 * @returns {Object} - Object containing checkbox and label elements
 */
export function createNsfwToggle(id = 'nsfw-toggle') {
    const container = document.createElement('div');
    container.style.cssText = `
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 8px;
    `;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = id;
    checkbox.style.cssText = `
        margin: 0;
        transform: scale(1.2);
    `;

    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = 'Show NSFW Images';
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

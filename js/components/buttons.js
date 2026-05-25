/**
 * Button Components
 * Centralized button creation system with consistent styling and behavior
 */

/**
 * Button variants with predefined colors
 */
import { loadComponentStyles as ensureComponentStyles } from './styleLoader.js';

export const BUTTON_VARIANTS = {
    PRIMARY: 'primary',
    SECONDARY: 'secondary',
    SUCCESS: 'success',
    WARNING: 'warning',
    DANGER: 'danger',
    INFO: 'info'
};

function loadComponentStyles() {
    ensureComponentStyles('buttons.js');
}

try {
    loadComponentStyles();
    console.log('[SageUtils] buttons.js import-time style injection succeeded');
} catch (err) {
    console.error('[SageUtils] buttons.js import-time style injection failed', err);
}

/**
 * Button sizes
 */
export const BUTTON_SIZES = {
    SMALL: 'small',
    MEDIUM: 'medium',
    LARGE: 'large'
};

/**
 * Get color for button variant
 * @param {string} variant - Button variant
 * @returns {string} - Background color
 */

/**
 * Create a styled button
 * @param {string} text - Button text
 * @param {Object} options - Configuration options
 * @param {string} options.variant - Button variant (from BUTTON_VARIANTS)
 * @param {string} options.size - Button size (from BUTTON_SIZES)
 * @param {string} options.icon - Icon/emoji to prepend
 * @param {string} options.color - Custom background color (overrides variant)
 * @param {Function} options.onClick - Click handler
 * @param {boolean} options.disabled - Disabled state
 * @param {Object} options.style - Custom style overrides
 * @param {string} options.title - Tooltip text
 * @param {string} options.className - Additional CSS class
 * @param {string} options.id - Element ID
 * @param {boolean} options.hoverEffect - Enable hover opacity effect (default: true)
 * @param {string} options.marginTop - Margin top value (default: '8px')
 * @returns {HTMLButtonElement}
 */
export function createButton(text, options = {}) {
    const {
        variant = BUTTON_VARIANTS.PRIMARY,
        size = BUTTON_SIZES.MEDIUM,
        icon = '',
        color = null,
        onClick = null,
        disabled = false,
        style = {},
        title = '',
        className = '',
        id = '',
        hoverEffect = true,
        marginTop = '8px'
    } = options;

    const button = document.createElement('button');
    
    // Set button text with optional icon
    button.textContent = icon ? `${icon} ${text}`.trim() : text;
    
    // Set attributes
    if (title) button.title = title;
    if (className) button.className = className;
    if (id) button.id = id;
    button.disabled = disabled;

    loadComponentStyles();
    button.classList.add('sage-button');
    button.classList.add(`sage-button--${size}`);
    if (!hoverEffect) {
        button.classList.add('sage-button--no-hover');
    }
    
    if (color) {
        button.classList.add('sage-button--custom');
        button.style.setProperty('--sage-button-bg', color);
    } else {
        button.classList.add(`sage-button--${variant}`);
    }
    
    if (marginTop && marginTop !== '8px') {
        if (marginTop === '0') {
            button.classList.add('sage-button--no-margin');
        } else {
            button.style.setProperty('--sage-button-margin-top', marginTop);
        }
    }

    // Apply custom style overrides
    Object.assign(button.style, style);
    
    // Add click handler
    if (onClick && !disabled) {
        button.addEventListener('click', onClick);
    }
    
    return button;
}

/**
 * Create an icon button (icon only, no text)
 * @param {string} icon - Icon/emoji
 * @param {Object} options - Same as createButton
 * @returns {HTMLButtonElement}
 */
export function createIconButton(icon, options = {}) {
    const iconClasses = ['sage-button--icon', options.className].filter(Boolean).join(' ');
    return createButton('', {
        ...options,
        icon,
        className: iconClasses,
        style: {
            ...options.style
        }
    });
}

/**
 * Create a button group (multiple buttons in a row)
 * @param {Array} buttons - Array of button elements
 * @param {Object} options - Container options
 * @param {string} options.gap - Gap between buttons (default: '4px')
 * @param {string} options.marginTop - Margin top value (default: '8px')
 * @param {boolean} options.wrap - Allow wrapping (default: true)
 * @returns {HTMLElement} - Button group container
 */
export function createButtonGroup(buttons, options = {}) {
    const {
        gap = '4px',
        marginTop = '8px',
        wrap = true
    } = options;
    
    const container = document.createElement('div');
    container.classList.add('sage-button-group');
    if (!wrap) {
        container.classList.add('sage-button-group--nowrap');
    }
    
    if (gap !== '4px') {
        container.style.setProperty('--sage-button-group-gap', gap);
    }
    if (marginTop !== '8px') {
        container.style.setProperty('--sage-button-group-margin-top', marginTop);
    }
    
    buttons.forEach(button => {
        // Remove individual margin-top from buttons in group
        if (button.style.marginTop) {
            button.style.removeProperty('--sage-button-margin-top');
            button.style.marginTop = '';
        }
        button.classList.add('sage-button--no-margin');
        container.appendChild(button);
    });
    
    return container;
}

/**
 * Legacy compatibility: Create a styled button with the old API
 * @deprecated Use createButton() instead
 * @param {string} text - Button text
 * @param {string} backgroundColor - Background color
 * @param {string} icon - Icon/emoji
 * @returns {HTMLButtonElement}
 */
export function createStyledButton(text, backgroundColor = '#4CAF50', icon = '') {
    console.warn('createStyledButton is deprecated. Use createButton() instead.');
    return createButton(text, {
        color: backgroundColor,
        icon
    });
}

/**
 * Legacy compatibility: Create an action button with the old API
 * @deprecated Use createButton() instead
 * @param {string} text - Button text
 * @param {string} color - Background color
 * @param {Function} onClick - Click handler
 * @param {Object} options - Additional options
 * @returns {HTMLButtonElement}
 */
export function createActionButton(text, color, onClick, options = {}) {
    console.warn('createActionButton is deprecated. Use createButton() instead.');
    return createButton(text, {
        color,
        onClick,
        hoverEffect: true,
        ...options
    });
}

/**
 * Pre-defined button configurations for common use cases
 */
export const BUTTON_CONFIGS = {
    refresh: { 
        text: 'Refresh', 
        variant: BUTTON_VARIANTS.SUCCESS, 
        icon: '↻' 
    },
    pull: { 
        text: 'Pull', 
        variant: BUTTON_VARIANTS.INFO, 
        icon: '⬇' 
    },
    edit: { 
        text: 'Edit', 
        variant: BUTTON_VARIANTS.WARNING, 
        icon: '✏' 
    },
    scan: { 
        text: 'Scan All', 
        color: '#9C27B0', 
        icon: '🔍' 
    },
    report: { 
        text: 'Generate Report', 
        color: '#673AB7', 
        icon: '📊' 
    },
    save: {
        text: 'Save',
        variant: BUTTON_VARIANTS.SUCCESS,
        icon: '💾'
    },
    delete: {
        text: 'Delete',
        variant: BUTTON_VARIANTS.DANGER,
        icon: '🗑️'
    },
    cancel: {
        text: 'Cancel',
        variant: BUTTON_VARIANTS.SECONDARY,
        icon: '✖'
    },
    confirm: {
        text: 'Confirm',
        variant: BUTTON_VARIANTS.PRIMARY,
        icon: '✓'
    }
};

/**
 * Create a button from a predefined configuration
 * @param {string} configKey - Key from BUTTON_CONFIGS
 * @param {Object} overrides - Options to override the config
 * @returns {HTMLButtonElement}
 */
export function createConfigButton(configKey, overrides = {}) {
    const config = BUTTON_CONFIGS[configKey];
    if (!config) {
        console.warn(`Unknown button config: ${configKey}`);
        return createButton('Button', overrides);
    }
    
    return createButton(config.text, {
        variant: config.variant,
        color: config.color,
        icon: config.icon,
        ...overrides
    });
}

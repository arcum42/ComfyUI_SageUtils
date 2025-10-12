/**
 * Button Components
 * Centralized button creation system with consistent styling and behavior
 */

/**
 * Button variants with predefined colors
 */
export const BUTTON_VARIANTS = {
    PRIMARY: 'primary',
    SECONDARY: 'secondary',
    SUCCESS: 'success',
    WARNING: 'warning',
    DANGER: 'danger',
    INFO: 'info'
};

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
function getVariantColor(variant) {
    const colors = {
        [BUTTON_VARIANTS.PRIMARY]: '#2196F3',
        [BUTTON_VARIANTS.SECONDARY]: '#757575',
        [BUTTON_VARIANTS.SUCCESS]: '#4CAF50',
        [BUTTON_VARIANTS.WARNING]: '#FF9800',
        [BUTTON_VARIANTS.DANGER]: '#f44336',
        [BUTTON_VARIANTS.INFO]: '#00BCD4'
    };
    return colors[variant] || colors[BUTTON_VARIANTS.PRIMARY];
}

/**
 * Get padding for button size
 * @param {string} size - Button size
 * @returns {string} - CSS padding value
 */
function getSizePadding(size) {
    const paddings = {
        [BUTTON_SIZES.SMALL]: '4px 8px',
        [BUTTON_SIZES.MEDIUM]: '6px 12px',
        [BUTTON_SIZES.LARGE]: '8px 16px'
    };
    return paddings[size] || paddings[BUTTON_SIZES.MEDIUM];
}

/**
 * Get font size for button size
 * @param {string} size - Button size
 * @returns {string} - CSS font-size value
 */
function getSizeFontSize(size) {
    const fontSizes = {
        [BUTTON_SIZES.SMALL]: '11px',
        [BUTTON_SIZES.MEDIUM]: '12px',
        [BUTTON_SIZES.LARGE]: '14px'
    };
    return fontSizes[size] || fontSizes[BUTTON_SIZES.MEDIUM];
}

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
        hoverEffect = true,
        marginTop = '8px'
    } = options;

    const button = document.createElement('button');
    
    // Set button text with optional icon
    button.textContent = icon ? `${icon} ${text}`.trim() : text;
    
    // Set attributes
    if (title) button.title = title;
    if (className) button.className = className;
    button.disabled = disabled;
    
    // Determine background color
    const backgroundColor = color || getVariantColor(variant);
    const padding = getSizePadding(size);
    const fontSize = getSizeFontSize(size);
    
    // Apply base styles
    button.style.cssText = `
        background: ${backgroundColor};
        color: white;
        border: none;
        padding: ${padding};
        border-radius: 4px;
        cursor: ${disabled ? 'not-allowed' : 'pointer'};
        font-size: ${fontSize};
        margin-top: ${marginTop};
        transition: ${hoverEffect ? 'opacity 0.2s' : 'none'};
        opacity: ${disabled ? '0.6' : '1'};
    `;
    
    // Apply custom style overrides
    Object.assign(button.style, style);
    
    // Add click handler
    if (onClick && !disabled) {
        button.addEventListener('click', onClick);
    }
    
    // Add hover effects if enabled
    if (hoverEffect && !disabled) {
        button.addEventListener('mouseenter', () => {
            button.style.opacity = '0.8';
        });
        button.addEventListener('mouseleave', () => {
            button.style.opacity = '1';
        });
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
    return createButton('', {
        ...options,
        icon,
        style: {
            minWidth: '32px',
            padding: '6px',
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
    container.style.cssText = `
        display: flex;
        gap: ${gap};
        margin-top: ${marginTop};
        flex-wrap: ${wrap ? 'wrap' : 'nowrap'};
    `;
    
    buttons.forEach(button => {
        // Remove individual margin-top from buttons in group
        if (button.style.marginTop) {
            button.style.marginTop = '0';
        }
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

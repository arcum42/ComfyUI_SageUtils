/**
 * Navigation Components Module
 * Provides reusable navigation controls for image galleries and editors
 */

/**
 * Create a set of navigation buttons with consistent styling
 * @param {Object} options - Configuration options
 * @param {boolean} options.showLabels - Whether to show text labels (default: true)
 * @param {boolean} options.showCounter - Whether to include a counter (default: true)
 * @param {string} options.size - Size variant: 'small', 'medium', 'large' (default: 'medium')
 * @param {string} options.variant - Style variant: 'gradient', 'flat' (default: 'gradient')
 * @returns {Object} Navigation controls with buttons and helper functions
 */
export function createNavigationControls(options = {}) {
    const {
        showLabels = true,
        showCounter = true,
        size = 'medium',
        variant = 'gradient'
    } = options;

    // Size configurations
    const sizeConfig = {
        small: {
            padding: '4px 8px',
            fontSize: '12px',
            borderRadius: '3px',
            minWidth: '30px'
        },
        medium: {
            padding: '8px 12px',
            fontSize: '13px',
            borderRadius: '6px',
            minWidth: '40px'
        },
        large: {
            padding: '10px 16px',
            fontSize: '14px',
            borderRadius: '8px',
            minWidth: '50px'
        }
    };

    // Style variants
    const styleVariants = {
        gradient: {
            background: 'linear-gradient(145deg, #404040, #303030)',
            border: '1px solid #555',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            hoverBackground: 'linear-gradient(145deg, #505050, #404040)',
            hoverBorder: '#666'
        },
        flat: {
            background: '#555',
            border: 'none',
            boxShadow: 'none',
            hoverBackground: '#666',
            hoverBorder: 'none'
        }
    };

    const currentSize = sizeConfig[size];
    const currentStyle = styleVariants[variant];

    // Create button base style
    const getButtonStyle = (disabled = false) => `
        background: ${disabled ? '#333' : currentStyle.background};
        color: ${disabled ? '#666' : '#fff'};
        border: ${currentStyle.border};
        padding: ${currentSize.padding};
        border-radius: ${currentSize.borderRadius};
        cursor: ${disabled ? 'not-allowed' : 'pointer'};
        font-size: ${currentSize.fontSize};
        font-weight: 500;
        transition: all 0.2s ease;
        box-shadow: ${disabled ? 'none' : currentStyle.boxShadow};
        min-width: ${currentSize.minWidth};
    `;

    // First button
    const firstButton = document.createElement('button');
    firstButton.innerHTML = showLabels ? '⏮ First' : '⏮️';
    firstButton.title = 'First Item';
    firstButton.style.cssText = getButtonStyle();

    // Previous button
    const prevButton = document.createElement('button');
    prevButton.innerHTML = showLabels ? '◀ Prev' : '◀️';
    prevButton.title = 'Previous Item';
    prevButton.style.cssText = getButtonStyle();

    // Next button
    const nextButton = document.createElement('button');
    nextButton.innerHTML = showLabels ? 'Next ▶' : '▶️';
    nextButton.title = 'Next Item';
    nextButton.style.cssText = getButtonStyle();

    // Last button
    const lastButton = document.createElement('button');
    lastButton.innerHTML = showLabels ? 'Last ⏭' : '⏭️';
    lastButton.title = 'Last Item';
    lastButton.style.cssText = getButtonStyle();

    // Counter element (optional)
    let counterElement = null;
    if (showCounter) {
        counterElement = document.createElement('span');
        counterElement.style.cssText = `
            color: #ccc;
            font-size: ${currentSize.fontSize === '12px' ? '11px' : '12px'};
            margin: 0 10px;
            min-width: 50px;
            text-align: center;
        `;
    }

    // Add hover effects to all buttons
    const buttons = [firstButton, prevButton, nextButton, lastButton];
    
    buttons.forEach(button => {
        button.addEventListener('mouseenter', () => {
            if (!button.disabled) {
                button.style.background = currentStyle.hoverBackground;
                if (currentStyle.hoverBorder !== 'none') {
                    button.style.borderColor = currentStyle.hoverBorder;
                }
            }
        });

        button.addEventListener('mouseleave', () => {
            if (!button.disabled) {
                button.style.background = currentStyle.background;
                if (currentStyle.border !== 'none') {
                    button.style.borderColor = '#555';
                }
            }
        });
    });

    // Update button states based on current position
    const updateButtonStates = (currentIndex, totalCount) => {
        const isFirst = currentIndex === 0;
        const isLast = currentIndex === totalCount - 1;

        // Update disabled states
        firstButton.disabled = isFirst;
        prevButton.disabled = isFirst;
        nextButton.disabled = isLast;
        lastButton.disabled = isLast;

        // Update styles for disabled state
        buttons.forEach(button => {
            button.style.cssText = getButtonStyle(button.disabled);
        });

        // Update counter if present
        if (counterElement && totalCount > 0) {
            counterElement.textContent = `${currentIndex + 1} / ${totalCount}`;
        }
    };

    // Create container for the controls
    const createContainer = (containerStyle = '') => {
        const container = document.createElement('div');
        container.style.cssText = containerStyle || `
            display: flex;
            gap: 10px;
            align-items: center;
        `;

        container.appendChild(firstButton);
        container.appendChild(prevButton);
        if (counterElement) {
            container.appendChild(counterElement);
        }
        container.appendChild(nextButton);
        container.appendChild(lastButton);

        return container;
    };

    return {
        // Button elements
        firstButton,
        prevButton,
        nextButton,
        lastButton,
        counterElement,
        
        // Helper functions
        updateButtonStates,
        createContainer,
        
        // For manual container creation
        getAllElements: () => {
            const elements = [firstButton, prevButton];
            if (counterElement) elements.push(counterElement);
            elements.push(nextButton, lastButton);
            return elements;
        }
    };
}

/**
 * Create navigation controls specifically for dataset text editor
 * @returns {Object} Navigation controls configured for dataset text editor
 */
export function createDatasetNavigationControls() {
    return createNavigationControls({
        showLabels: true,
        showCounter: true,
        size: 'medium',
        variant: 'gradient'
    });
}

/**
 * Create navigation controls specifically for image gallery modal
 * @returns {Object} Navigation controls configured for image gallery modal
 */
export function createGalleryNavigationControls() {
    return createNavigationControls({
        showLabels: false,
        showCounter: true,
        size: 'small',
        variant: 'flat'
    });
}

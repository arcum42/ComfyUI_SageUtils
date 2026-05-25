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

    const validSizes = ['small', 'medium', 'large'];
    const validVariants = ['gradient', 'flat'];
    const buttonSize = validSizes.includes(size) ? size : 'medium';
    const buttonVariant = validVariants.includes(variant) ? variant : 'gradient';

    const createNavButton = (text, title) => {
        const button = document.createElement('button');
        button.innerHTML = text;
        button.title = title;
        button.className = `sage-button sage-nav-button sage-nav-button--${buttonVariant} sage-nav-button--${buttonSize}`;
        return button;
    };

    const firstButton = createNavButton(showLabels ? '⏮ First' : '⏮️', 'First Item');
    const prevButton = createNavButton(showLabels ? '◀ Prev' : '◀️', 'Previous Item');
    const nextButton = createNavButton(showLabels ? 'Next ▶' : '▶️', 'Next Item');
    const lastButton = createNavButton(showLabels ? 'Last ⏭' : '⏭️', 'Last Item');

    // Counter element (optional)
    let counterElement = null;
    if (showCounter) {
        counterElement = document.createElement('span');
        counterElement.className = `sage-nav-counter sage-nav-counter--${buttonSize}`;
    }

    const buttons = [firstButton, prevButton, nextButton, lastButton];

    // Update button states based on current position
    const updateButtonStates = (currentIndex, totalCount) => {
        const isFirst = currentIndex === 0;
        const isLast = currentIndex === totalCount - 1;

        firstButton.disabled = isFirst;
        prevButton.disabled = isFirst;
        nextButton.disabled = isLast;
        lastButton.disabled = isLast;

        if (counterElement && totalCount > 0) {
            counterElement.textContent = `${currentIndex + 1} / ${totalCount}`;
        }
    };

    // Create container for the controls
    const applyContainerStyleString = (element, styleString) => {
        styleString.split(';').forEach(rule => {
            const [key, value] = rule.split(':').map(token => token && token.trim());
            if (key && value) {
                const camelKey = key.replace(/-([a-z])/g, (match, char) => char.toUpperCase());
                element.style[camelKey] = value;
            }
        });
    };

    const createContainer = (containerStyle = '') => {
        const container = document.createElement('div');
        container.className = 'sage-nav-container';
        if (containerStyle) {
            if (typeof containerStyle === 'string') {
                applyContainerStyleString(container, containerStyle);
            } else if (typeof containerStyle === 'object') {
                Object.assign(container.style, containerStyle);
            }
        }

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

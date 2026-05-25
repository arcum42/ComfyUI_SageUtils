/**
 * @fileoverview Layout Component Library
 * Provides reusable layout utilities for consistent UI structure:
 * - Cards with titles and actions
 * - Grid and flex containers
 * - Sections with headers
 * - Split panes
 * - Scrollable containers
 * 
 * @module components/layout
 */

import { loadComponentStyles as ensureComponentStyles } from './styleLoader.js';

console.log('[SageUtils] layout.js imported');

function loadComponentStyles() {
    ensureComponentStyles('layout.js');
}

/**
 * Create a flex container with common configurations
 * @param {Object} options - Configuration options
 * @param {string} options.direction - Flex direction: 'row' | 'column' | 'row-reverse' | 'column-reverse' (default: 'row')
 * @param {string} options.justify - Justify content: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly' (default: 'flex-start')
 * @param {string} options.align - Align items: 'stretch' | 'flex-start' | 'flex-end' | 'center' | 'baseline' (default: 'stretch')
 * @param {string} options.gap - Gap between items (e.g., '8px', '1rem') (default: '0')
 * @param {boolean} options.wrap - Enable flex wrap (default: false)
 * @param {string} options.padding - Container padding (default: '0')
 * @param {string} options.background - Background color (default: 'transparent')
 * @param {string} options.className - Additional CSS class
 * @param {Object} options.style - Custom style overrides
 * @param {HTMLElement[]} options.children - Child elements to append
 * @returns {HTMLElement} Configured flex container
 */
export function createFlexContainer(options = {}) {
    const {
        direction = 'row',
        justify = 'flex-start',
        align = 'stretch',
        alignItems = null,
        gap = '0',
        wrap = false,
        padding = '0',
        background = 'transparent',
        className = '',
        style = {},
        children = []
    } = options;

    const effectiveAlign = alignItems || align;

    loadComponentStyles();

    const container = document.createElement('div');
    container.classList.add('sage-flex-container');
    if (className) container.classList.add(...className.split(' ').filter(Boolean));

    container.style.setProperty('--sage-flex-direction', direction);
    container.style.setProperty('--sage-flex-justify', justify);
    container.style.setProperty('--sage-flex-align', effectiveAlign);
    container.style.setProperty('--sage-flex-gap', gap);
    container.style.setProperty('--sage-flex-wrap', wrap ? 'wrap' : 'nowrap');
    container.style.setProperty('--sage-flex-padding', padding);
    container.style.setProperty('--sage-flex-background', background);

    // Apply custom style overrides
    Object.assign(container.style, style);

    // Append children
    children.forEach(child => {
        if (child instanceof HTMLElement) {
            container.appendChild(child);
        }
    });

    return container;
}

/**
 * Create a grid container with common configurations
 * @param {Object} options - Configuration options
 * @param {string|number} options.columns - Column definition: number (e.g., 3) or CSS value (e.g., '1fr 2fr 1fr', 'repeat(auto-fill, minmax(200px, 1fr))')
 * @param {string|number} options.rows - Row definition (optional): number or CSS value
 * @param {string} options.gap - Gap between items (default: '16px')
 * @param {string} options.columnGap - Gap between columns (overrides gap)
 * @param {string} options.rowGap - Gap between rows (overrides gap)
 * @param {string} options.padding - Container padding (default: '0')
 * @param {string} options.background - Background color (default: 'transparent')
 * @param {string} options.className - Additional CSS class
 * @param {Object} options.style - Custom style overrides
 * @param {HTMLElement[]} options.children - Child elements to append
 * @returns {HTMLElement} Configured grid container
 */
export function createGrid(options = {}) {
    const {
        columns = 1,
        rows = null,
        gap = '16px',
        columnGap = null,
        rowGap = null,
        padding = '0',
        background = 'transparent',
        className = '',
        style = {},
        children = []
    } = options;

    loadComponentStyles();

    const container = document.createElement('div');
    container.classList.add('sage-grid-container');
    if (className) container.classList.add(...className.split(' ').filter(Boolean));

    // Build grid-template-columns
    let gridColumns;
    if (typeof columns === 'number') {
        gridColumns = `repeat(${columns}, 1fr)`;
    } else {
        gridColumns = columns;
    }

    container.style.setProperty('--sage-grid-columns', gridColumns);
    if (rows !== null) {
        if (typeof rows === 'number') {
            container.style.setProperty('--sage-grid-rows', `repeat(${rows}, 1fr)`);
        } else {
            container.style.setProperty('--sage-grid-rows', rows);
        }
    }
    container.style.setProperty('--sage-grid-gap', gap);
    if (columnGap) container.style.setProperty('--sage-grid-column-gap', columnGap);
    if (rowGap) container.style.setProperty('--sage-grid-row-gap', rowGap);
    container.style.setProperty('--sage-grid-padding', padding);
    container.style.setProperty('--sage-grid-background', background);

    // Apply custom style overrides
    Object.assign(container.style, style);

    // Append children
    children.forEach(child => {
        if (child instanceof HTMLElement) {
            container.appendChild(child);
        }
    });

    return container;
}

/**
 * Create a card container with optional title and actions
 * @param {Object} options - Configuration options
 * @param {string} options.title - Card title (optional)
 * @param {HTMLElement|string} options.content - Card content (HTMLElement or HTML string)
 * @param {HTMLElement[]} options.actions - Action buttons to display in header (optional)
 * @param {string} options.padding - Content padding (default: '16px')
 * @param {string} options.background - Background color (default: '#2a2a2a')
 * @param {string} options.borderColor - Border color (default: '#444')
 * @param {string} options.borderRadius - Border radius (default: '8px')
 * @param {string} options.className - Additional CSS class
 * @param {Object} options.style - Custom style overrides
 * @returns {HTMLElement} Card container
 */
export function createCard(options = {}) {
    const {
        title = '',
        content = null,
        actions = [],
        padding = '16px',
        background = '#2a2a2a',
        borderColor = '#444',
        borderRadius = '8px',
        className = '',
        style = {}
    } = options;

    loadComponentStyles();

    const card = document.createElement('div');
    card.classList.add('sage-card');
    if (className) card.classList.add(...className.split(' ').filter(Boolean));

    card.style.setProperty('--sage-card-background', background);
    card.style.setProperty('--sage-card-border', `1px solid ${borderColor}`);
    card.style.setProperty('--sage-card-border-radius', borderRadius);

    // Apply custom style overrides
    Object.assign(card.style, style);

    // Create header if title or actions are provided
    if (title || actions.length > 0) {
        const header = document.createElement('div');
        header.classList.add('sage-card-header');
        header.style.setProperty('--sage-card-header-padding', `12px ${padding}`);
        header.style.setProperty('--sage-card-header-border-color', borderColor);

        if (title) {
            const titleElement = document.createElement('h3');
            titleElement.textContent = title;
            titleElement.classList.add('sage-card-title');
            header.appendChild(titleElement);
        }

        if (actions.length > 0) {
            const actionsContainer = document.createElement('div');
            actionsContainer.classList.add('sage-card-actions');
            actions.forEach(action => {
                if (action instanceof HTMLElement) {
                    actionsContainer.appendChild(action);
                }
            });
            header.appendChild(actionsContainer);
        }

        card.appendChild(header);
    }

    // Create content area
    if (content) {
        const contentArea = document.createElement('div');
        contentArea.classList.add('sage-card-content');
        contentArea.style.setProperty('--sage-card-content-padding', padding);

        if (typeof content === 'string') {
            contentArea.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            contentArea.appendChild(content);
        }

        card.appendChild(contentArea);
    }

    return card;
}

/**
 * Create a section with title and content
 * @param {string} title - Section title
 * @param {HTMLElement|string} content - Section content
 * @param {Object} options - Configuration options
 * @param {string} options.titleColor - Title color (default: '#569cd6')
 * @param {string} options.titleSize - Title font size (default: '16px')
 * @param {string} options.borderColor - Border color (default: '#4CAF50')
 * @param {string} options.padding - Content padding (default: '16px')
 * @param {string} options.marginTop - Section margin top (default: '16px')
 * @param {string} options.background - Background color (default: 'transparent')
 * @param {boolean} options.collapsible - Make section collapsible (default: false)
 * @param {boolean} options.collapsed - Initial collapsed state (default: false)
 * @param {string} options.className - Additional CSS class
 * @param {Object} options.style - Custom style overrides
 * @returns {HTMLElement} Section container
 */
export function createSection(title, content, options = {}) {
    const {
        titleColor = '#569cd6',
        titleSize = '16px',
        borderColor = '#4CAF50',
        padding = '16px',
        marginTop = '16px',
        background = 'transparent',
        collapsible = false,
        collapsed = false,
        className = '',
        style = {}
    } = options;

    loadComponentStyles();

    const section = document.createElement('div');
    section.classList.add('sage-section');
    if (className) section.classList.add(...className.split(' ').filter(Boolean));

    section.style.setProperty('--sage-section-margin-top', marginTop);
    section.style.setProperty('--sage-section-background', background);

    // Apply custom style overrides
    Object.assign(section.style, style);

    // Create title
    const titleElement = document.createElement('div');
    titleElement.classList.add('sage-section-title');
    if (collapsible) {
        titleElement.classList.add('sage-section-title--collapsible');
    }
    titleElement.style.setProperty('--sage-section-title-size', titleSize);
    titleElement.style.setProperty('--sage-section-title-color', titleColor);
    titleElement.style.setProperty('--sage-section-border-color', borderColor);

    if (collapsible) {
        const arrow = document.createElement('span');
        arrow.textContent = collapsed ? '▶ ' : '▼ ';
        arrow.classList.add('sage-section-title-arrow');
        titleElement.appendChild(arrow);
    }

    const titleText = document.createElement('span');
    titleText.textContent = title;
    titleElement.appendChild(titleText);

    section.appendChild(titleElement);

    // Create content area
    const contentArea = document.createElement('div');
    contentArea.classList.add('sage-section-content');
    contentArea.style.setProperty('--sage-section-content-padding', padding);
    if (collapsed) {
        contentArea.classList.add('sage-section-content--collapsed');
    }

    if (typeof content === 'string') {
        contentArea.innerHTML = content;
    } else if (content instanceof HTMLElement) {
        contentArea.appendChild(content);
    }

    section.appendChild(contentArea);

    // Add collapsible functionality
    if (collapsible) {
        titleElement.addEventListener('click', () => {
            const isCollapsed = contentArea.classList.toggle('sage-section-content--collapsed');
            const arrow = titleElement.querySelector('span');
            arrow.textContent = isCollapsed ? '▶ ' : '▼ ';
        });
    }

    return section;
}

/**
 * Create a scrollable container
 * @param {HTMLElement|string} content - Content to make scrollable
 * @param {Object} options - Configuration options
 * @param {string} options.maxHeight - Maximum height before scrolling (default: '400px')
 * @param {string} options.maxWidth - Maximum width before scrolling (default: '100%')
 * @param {string} options.padding - Container padding (default: '0')
 * @param {string} options.background - Background color (default: 'transparent')
 * @param {boolean} options.showScrollbar - Show scrollbar (default: true)
 * @param {string} options.className - Additional CSS class
 * @param {Object} options.style - Custom style overrides
 * @returns {HTMLElement} Scrollable container
 */
export function createScrollContainer(content, options = {}) {
    const {
        maxHeight = '400px',
        maxWidth = '100%',
        padding = '0',
        background = 'transparent',
        showScrollbar = true,
        className = '',
        style = {}
    } = options;

    loadComponentStyles();

    const container = document.createElement('div');
    container.classList.add('sage-scroll-container');
    if (className) container.classList.add(...className.split(' ').filter(Boolean));

    container.style.setProperty('--sage-scroll-max-height', maxHeight);
    container.style.setProperty('--sage-scroll-max-width', maxWidth);
    container.style.setProperty('--sage-scroll-padding', padding);
    container.style.setProperty('--sage-scroll-background', background);
    if (!showScrollbar) {
        container.classList.add('sage-scroll-container--hidden-scrollbar');
    }

    // Apply custom style overrides
    Object.assign(container.style, style);

    // Add content
    if (typeof content === 'string') {
        container.innerHTML = content;
    } else if (content instanceof HTMLElement) {
        container.appendChild(content);
    }

    return container;
}

/**
 * Create a split pane layout (two-column layout with optional resizing)
 * @param {HTMLElement} leftContent - Left pane content
 * @param {HTMLElement} rightContent - Right pane content
 * @param {Object} options - Configuration options
 * @param {string} options.splitRatio - Split ratio: '30-70', '50-50', '40-60', etc. (default: '50-50')
 * @param {string} options.gap - Gap between panes (default: '8px')
 * @param {string} options.minLeftWidth - Minimum left pane width (default: '200px')
 * @param {string} options.minRightWidth - Minimum right pane width (default: '200px')
 * @param {boolean} options.resizable - Enable resize handle (default: false)
 * @param {string} options.className - Additional CSS class
 * @param {Object} options.style - Custom style overrides
 * @returns {HTMLElement} Split pane container
 */
export function createSplitPane(leftContent, rightContent, options = {}) {
    const {
        splitRatio = '50-50',
        gap = '8px',
        minLeftWidth = '200px',
        minRightWidth = '200px',
        resizable = false,
        className = '',
        style = {}
    } = options;

    loadComponentStyles();

    const container = document.createElement('div');
    container.classList.add('sage-split-pane');
    if (className) container.classList.add(...className.split(' ').filter(Boolean));

    // Parse split ratio
    const [leftRatio, rightRatio] = splitRatio.split('-').map(Number);
    const totalRatio = leftRatio + rightRatio;
    const leftPercent = (leftRatio / totalRatio) * 100;
    const rightPercent = (rightRatio / totalRatio) * 100;

    container.style.setProperty('--sage-split-gap', gap);

    // Apply custom style overrides
    Object.assign(container.style, style);

    // Create left pane
    const leftPane = document.createElement('div');
    leftPane.classList.add('sage-split-pane-left');
    leftPane.style.setProperty('--sage-split-left-flex', `0 0 ${leftPercent}%`);
    leftPane.style.setProperty('--sage-split-left-min-width', minLeftWidth);
    leftPane.appendChild(leftContent);

    // Create right pane
    const rightPane = document.createElement('div');
    rightPane.classList.add('sage-split-pane-right');
    rightPane.style.setProperty('--sage-split-right-flex', `0 0 ${rightPercent}%`);
    rightPane.style.setProperty('--sage-split-right-min-width', minRightWidth);
    rightPane.appendChild(rightContent);

    container.appendChild(leftPane);

    // Add resize handle if resizable
    if (resizable) {
        const resizeHandle = document.createElement('div');
        resizeHandle.classList.add('sage-split-pane-handle');

        resizeHandle.addEventListener('mouseenter', () => {
            resizeHandle.classList.add('sage-split-pane-handle-active');
        });

        resizeHandle.addEventListener('mouseleave', () => {
            resizeHandle.classList.remove('sage-split-pane-handle-active');
        });

        // Implement resize functionality
        let isResizing = false;
        let startX = 0;
        let startLeftWidth = 0;

        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startLeftWidth = leftPane.offsetWidth;
            document.body.classList.add('sage-resizing');
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const deltaX = e.clientX - startX;
            const newLeftWidth = startLeftWidth + deltaX;
            const containerWidth = container.offsetWidth;
            const newRightWidth = containerWidth - newLeftWidth - resizeHandle.offsetWidth - (parseInt(gap) * 2);

            // Check minimum widths
            if (newLeftWidth >= parseInt(minLeftWidth) && newRightWidth >= parseInt(minRightWidth)) {
                leftPane.style.setProperty('--sage-split-left-flex', `0 0 ${newLeftWidth}px`);
                rightPane.style.setProperty('--sage-split-right-flex', `0 0 ${newRightWidth}px`);
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.classList.remove('sage-resizing');
            }
        });

        container.appendChild(resizeHandle);
    }

    container.appendChild(rightPane);

    return container;
}

/**
 * Create a responsive grid that auto-fits items
 * @param {Object} options - Configuration options
 * @param {number} options.minItemWidth - Minimum width per grid item in pixels (default: 200)
 * @param {number} options.maxItemWidth - Maximum width per grid item (default: '1fr')
 * @param {string} options.gap - Gap between items (default: '16px')
 * @param {string} options.padding - Container padding (default: '0')
 * @param {string} options.background - Background color (default: 'transparent')
 * @param {string} options.className - Additional CSS class
 * @param {Object} options.style - Custom style overrides
 * @param {HTMLElement[]} options.children - Child elements to append
 * @returns {HTMLElement} Responsive grid container
 */
export function createResponsiveGrid(options = {}) {
    const {
        minItemWidth = 200,
        maxItemWidth = '1fr',
        gap = '16px',
        padding = '0',
        background = 'transparent',
        className = '',
        style = {},
        children = []
    } = options;

    return createGrid({
        columns: `repeat(auto-fill, minmax(${minItemWidth}px, ${maxItemWidth}))`,
        gap,
        padding,
        background,
        className,
        style,
        children
    });
}

/**
 * Create a centered container
 * @param {HTMLElement|string} content - Content to center
 * @param {Object} options - Configuration options
 * @param {string} options.maxWidth - Maximum width of centered content (default: '800px')
 * @param {string} options.padding - Container padding (default: '16px')
 * @param {string} options.marginTop - Top margin (default: '0')
 * @param {string} options.background - Background color (default: 'transparent')
 * @param {string} options.className - Additional CSS class
 * @param {Object} options.style - Custom style overrides
 * @returns {HTMLElement} Centered container
 */
export function createCenteredContainer(content, options = {}) {
    const {
        maxWidth = '800px',
        padding = '16px',
        marginTop = '0',
        background = 'transparent',
        className = '',
        style = {}
    } = options;

    loadComponentStyles();

    const container = document.createElement('div');
    container.classList.add('sage-centered-container');
    if (className) container.classList.add(...className.split(' ').filter(Boolean));

    container.style.setProperty('--sage-centered-max-width', maxWidth);
    container.style.setProperty('--sage-centered-margin', `${marginTop} auto 0 auto`);
    container.style.setProperty('--sage-centered-padding', padding);
    container.style.setProperty('--sage-centered-background', background);

    // Apply custom style overrides
    Object.assign(container.style, style);

    // Add content
    if (typeof content === 'string') {
        container.innerHTML = content;
    } else if (content instanceof HTMLElement) {
        container.appendChild(content);
    }

    return container;
}

/**
 * Create a stack layout (vertical list with consistent spacing)
 * @param {HTMLElement[]} items - Items to stack
 * @param {Object} options - Configuration options
 * @param {string} options.gap - Gap between items (default: '16px')
 * @param {string} options.padding - Container padding (default: '0')
 * @param {string} options.background - Background color (default: 'transparent')
 * @param {string} options.className - Additional CSS class
 * @param {Object} options.style - Custom style overrides
 * @returns {HTMLElement} Stack container
 */
export function createStack(items, options = {}) {
    const {
        gap = '16px',
        padding = '0',
        background = 'transparent',
        className = '',
        style = {}
    } = options;

    return createFlexContainer({
        direction: 'column',
        gap,
        padding,
        background,
        className,
        style,
        children: items
    });
}

/**
 * Create an inline layout (horizontal list with consistent spacing)
 * @param {HTMLElement[]} items - Items to arrange inline
 * @param {Object} options - Configuration options
 * @param {string} options.gap - Gap between items (default: '8px')
 * @param {string} options.align - Vertical alignment (default: 'center')
 * @param {boolean} options.wrap - Allow wrapping (default: true)
 * @param {string} options.padding - Container padding (default: '0')
 * @param {string} options.background - Background color (default: 'transparent')
 * @param {string} options.className - Additional CSS class
 * @param {Object} options.style - Custom style overrides
 * @returns {HTMLElement} Inline container
 */
export function createInline(items, options = {}) {
    const {
        gap = '8px',
        align = 'center',
        wrap = true,
        padding = '0',
        background = 'transparent',
        className = '',
        style = {}
    } = options;

    return createFlexContainer({
        direction: 'row',
        align,
        gap,
        wrap,
        padding,
        background,
        className,
        style,
        children: items
    });
}

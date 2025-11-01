/**
 * Viewport-aware Priority Rendering
 * Uses IntersectionObserver to prioritize rendering of visible elements
 */

/**
 * Calculate which items should be rendered first based on viewport visibility
 * @param {Array} items - Array of items to prioritize
 * @param {HTMLElement} container - Container element
 * @param {number} itemHeight - Approximate height of each item (for calculation)
 * @returns {Object} Object with {priority: [], deferred: []} arrays
 */
export function prioritizeByViewport(items, container, itemHeight = 150) {
    if (!items || items.length === 0) {
        return { priority: [], deferred: [] };
    }
    
    // Get container dimensions and scroll position
    const containerRect = container.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const scrollTop = container.scrollTop || 0;
    
    // Calculate how many items fit in the viewport
    const containerTop = containerRect.top;
    const containerBottom = containerRect.bottom;
    const visibleHeight = Math.min(containerBottom, viewportHeight) - Math.max(containerTop, 0);
    
    // Estimate items per row based on container width and typical item width
    const containerWidth = containerRect.width;
    const itemWidth = 200; // Approximate thumbnail width
    const itemsPerRow = Math.max(1, Math.floor(containerWidth / itemWidth));
    
    // Calculate rows that are visible or near-visible
    const rowHeight = itemHeight + 10; // Include gap
    const visibleRows = Math.ceil(visibleHeight / rowHeight);
    const bufferRows = 2; // Pre-load 2 rows above and below
    const totalPriorityRows = visibleRows + (bufferRows * 2);
    
    // Calculate priority item count
    const priorityCount = Math.min(
        items.length,
        itemsPerRow * totalPriorityRows
    );
    
    return {
        priority: items.slice(0, priorityCount),
        deferred: items.slice(priorityCount)
    };
}

/**
 * Create an IntersectionObserver for lazy loading thumbnails
 * @param {Function} onVisible - Callback when element becomes visible (element) => void
 * @param {Object} options - Observer options
 * @returns {IntersectionObserver} Observer instance
 */
export function createVisibilityObserver(onVisible, options = {}) {
    const {
        rootMargin = '200px', // Start loading 200px before entering viewport
        threshold = 0.01
    } = options;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                onVisible(entry.target);
                observer.unobserve(entry.target); // Stop observing once loaded
            }
        });
    }, {
        rootMargin,
        threshold
    });
    
    return observer;
}

/**
 * Sort items by their vertical position in the container
 * (Items closer to the top get higher priority)
 * @param {Array} items - Array of items to sort
 * @param {HTMLElement} container - Container element
 * @returns {Array} Sorted array with items closest to viewport first
 */
export function sortByVerticalPosition(items, container) {
    if (!items || items.length === 0) {
        return [];
    }
    
    const scrollTop = container.scrollTop || 0;
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + container.clientHeight;
    
    // Calculate approximate vertical position for each item
    // (This is a heuristic; actual position depends on grid layout)
    return items.map((item, index) => ({
        item,
        index,
        // Simple heuristic: earlier items are typically higher in the grid
        score: index
    }))
    .sort((a, b) => a.score - b.score)
    .map(entry => entry.item);
}

/**
 * Batch items into priority and deferred groups with size limits
 * @param {Array} items - All items to render
 * @param {number} prioritySize - Number of items to render with priority
 * @returns {Object} Object with {priority: [], deferred: []} arrays
 */
export function batchWithPriority(items, prioritySize = 24) {
    if (!items || items.length === 0) {
        return { priority: [], deferred: [] };
    }
    
    const actualPrioritySize = Math.min(prioritySize, items.length);
    
    return {
        priority: items.slice(0, actualPrioritySize),
        deferred: items.slice(actualPrioritySize)
    };
}

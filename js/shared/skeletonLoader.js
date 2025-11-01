/**
 * Skeleton Loader Components
 * Provides loading placeholder components for gallery thumbnails
 */

/**
 * Create a skeleton loader for a thumbnail
 * @param {Object} options - Configuration options
 * @param {number} options.width - Width of the skeleton (default: 200px)
 * @param {number} options.height - Height of the skeleton (default: 150px)
 * @param {boolean} options.animated - Whether to show shimmer animation (default: true)
 * @returns {HTMLElement} Skeleton loader element
 */
export function createSkeletonThumbnail(options = {}) {
    const {
        width = 200,
        height = 150,
        animated = true
    } = options;
    
    const skeleton = document.createElement('div');
    skeleton.className = 'gallery-skeleton-item';
    skeleton.setAttribute('data-skeleton', 'true');
    
    skeleton.style.cssText = `
        position: relative;
        background: #333;
        border-radius: 6px;
        overflow: hidden;
        min-height: ${height}px;
        width: 100%;
        border: 2px solid transparent;
    `;
    
    // Create shimmer overlay if animated
    if (animated) {
        const shimmer = document.createElement('div');
        shimmer.className = 'skeleton-shimmer';
        shimmer.style.cssText = `
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(
                90deg,
                transparent 0%,
                rgba(255, 255, 255, 0.05) 50%,
                transparent 100%
            );
            animation: shimmer 1.5s infinite;
        `;
        skeleton.appendChild(shimmer);
        
        // Inject shimmer animation if not already present
        if (!document.querySelector('#skeleton-shimmer-style')) {
            const style = document.createElement('style');
            style.id = 'skeleton-shimmer-style';
            style.textContent = `
                @keyframes shimmer {
                    0% {
                        left: -100%;
                    }
                    100% {
                        left: 100%;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Create placeholder icon
    const icon = document.createElement('div');
    icon.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 32px;
        opacity: 0.3;
        color: #666;
    `;
    icon.textContent = '🖼️';
    skeleton.appendChild(icon);
    
    return skeleton;
}

/**
 * Create multiple skeleton loaders
 * @param {number} count - Number of skeletons to create
 * @param {Object} options - Options passed to createSkeletonThumbnail
 * @returns {HTMLElement[]} Array of skeleton elements
 */
export function createSkeletonGrid(count, options = {}) {
    const skeletons = [];
    for (let i = 0; i < count; i++) {
        skeletons.push(createSkeletonThumbnail(options));
    }
    return skeletons;
}

/**
 * Replace a skeleton with actual content
 * @param {HTMLElement} skeleton - Skeleton element to replace
 * @param {HTMLElement} actualContent - Actual content element
 * @param {boolean} fadeTransition - Whether to fade in the content (default: true)
 */
export function replaceSkeletonWithContent(skeleton, actualContent, fadeTransition = true) {
    if (!skeleton || !skeleton.parentNode) {
        return;
    }
    
    if (fadeTransition) {
        // Fade in the actual content
        actualContent.style.opacity = '0';
        actualContent.style.transition = 'opacity 0.2s ease-in';
        
        skeleton.parentNode.replaceChild(actualContent, skeleton);
        
        // Trigger fade-in after a small delay
        requestAnimationFrame(() => {
            actualContent.style.opacity = '1';
        });
    } else {
        skeleton.parentNode.replaceChild(actualContent, skeleton);
    }
}

/**
 * Remove all skeleton loaders from a container
 * @param {HTMLElement} container - Container element
 */
export function removeAllSkeletons(container) {
    if (!container) return;
    
    const skeletons = container.querySelectorAll('[data-skeleton="true"]');
    skeletons.forEach(skeleton => {
        if (skeleton.parentNode) {
            skeleton.remove();
        }
    });
}

/**
 * Get count of remaining skeleton loaders in a container
 * @param {HTMLElement} container - Container element
 * @returns {number} Number of skeleton loaders
 */
export function getSkeletonCount(container) {
    if (!container) return 0;
    return container.querySelectorAll('[data-skeleton="true"]').length;
}

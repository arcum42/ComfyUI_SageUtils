/**
 * Centralized Image Loading Service
 * Provides consistent image loading across all gallery features
 * Uses the correct API endpoints and handles errors consistently
 */

/**
 * Loads a full-size image using the sage_utils API
 * @param {Object|string} imageInput - Image object or path string
 * @returns {Promise<string>} Promise that resolves to a blob URL
 */
export async function loadFullImage(imageInput) {
    const imagePath = typeof imageInput === 'string' 
        ? imageInput 
        : (imageInput.path || imageInput.relative_path || imageInput.name);

    if (!imagePath) {
        throw new Error('No valid image path provided');
    }

    try {
        const response = await fetch('/sage_utils/image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image_path: imagePath
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to load image: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        return imageUrl;
    } catch (error) {
        console.error('Error loading full image:', error);
        throw error;
    }
}

/**
 * Loads a thumbnail image using the sage_utils API
 * @param {Object|string} imageInput - Image object or path string
 * @param {string} size - Thumbnail size ('small', 'medium', 'large')
 * @returns {Promise<string>} Promise that resolves to a blob URL
 */
export async function loadThumbnail(imageInput, size = 'large') {
    const imagePath = typeof imageInput === 'string' 
        ? imageInput 
        : (imageInput.path || imageInput.relative_path || imageInput.name);

    if (!imagePath) {
        throw new Error('No valid image path provided');
    }

    try {
        const response = await fetch('/sage_utils/thumbnail', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image_path: imagePath,
                size: size
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to load thumbnail: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        return imageUrl;
    } catch (error) {
        console.error('Error loading thumbnail:', error);
        throw error;
    }
}

/**
 * Creates a fallback SVG image for error states
 * @param {string} message - Error message to display
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {string} Data URL for fallback SVG
 */
export function createFallbackImage(message = 'Failed to load image', width = 400, height = 300) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <rect width="${width}" height="${height}" fill="#333"/>
        <text x="${width/2}" y="${height/2}" text-anchor="middle" font-size="16" fill="#999">${message}</text>
    </svg>`;
    
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Loads an image with automatic fallback handling
 * @param {Object|string} imageInput - Image object or path string
 * @param {Object} options - Loading options
 * @param {boolean} options.thumbnail - Whether to load as thumbnail
 * @param {string} options.thumbnailSize - Thumbnail size if thumbnail is true
 * @param {boolean} options.fallbackOnError - Whether to return fallback image on error
 * @returns {Promise<string>} Promise that resolves to image URL or fallback
 */
export async function loadImageWithFallback(imageInput, options = {}) {
    const {
        thumbnail = false,
        thumbnailSize = 'large',
        fallbackOnError = true
    } = options;

    try {
        if (thumbnail) {
            return await loadThumbnail(imageInput, thumbnailSize);
        } else {
            return await loadFullImage(imageInput);
        }
    } catch (error) {
        if (fallbackOnError) {
            console.warn('Image loading failed, using fallback:', error);
            return createFallbackImage('Error loading image');
        } else {
            throw error;
        }
    }
}

/**
 * Opens an image in a new browser tab
 * @param {Object|string} imageInput - Image object or path string
 */
export async function openImageInNewTab(imageInput) {
    try {
        const imageUrl = await loadFullImage(imageInput);
        window.open(imageUrl, '_blank');
    } catch (error) {
        console.error('Failed to open image in new tab:', error);
        // Could show a user notification here
    }
}

/**
 * Utility to clean up blob URLs to prevent memory leaks
 * @param {string} blobUrl - The blob URL to revoke
 */
export function cleanupImageUrl(blobUrl) {
    if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
    }
}

/**
 * Preloads an image for faster display
 * @param {Object|string} imageInput - Image object or path string
 * @param {Object} options - Loading options (same as loadImageWithFallback)
 * @returns {Promise<HTMLImageElement>} Promise that resolves to loaded image element
 */
export async function preloadImage(imageInput, options = {}) {
    const imageUrl = await loadImageWithFallback(imageInput, options);
    
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to preload image'));
        img.src = imageUrl;
    });
}

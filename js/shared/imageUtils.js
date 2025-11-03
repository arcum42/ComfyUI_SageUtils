/**
 * Image Operations Module
 * Handles image loading, thumbnail generation, metadata, and clipboard operations
 */

import { API_ENDPOINTS } from './config.js';
import { actions } from './stateManager.js';
import { MetadataCache } from './metadataCache.js';

/**
 * Load images from a specified folder
 * @param {string} folderType - Type of folder ('notes', 'input', 'output', 'custom')
 * @param {string|null} customPath - Custom path for browsing subfolders
 * @returns {Promise<Object>} Object containing images and folders arrays
 */
export async function loadImagesFromFolder(folderType, customPath = null) {
    try {
        let url = API_ENDPOINTS.listImages;
        const params = new URLSearchParams({ folder_type: folderType });
        
        if (customPath) {
            params.append('custom_path', customPath);
        }
        
        const response = await fetch(`${url}?${params}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Unknown error occurred');
        }
        
        const images = result.images || [];
        const folders = result.folders || [];
        
        // Update state with loaded images and folders
        actions.setImages(images);
        actions.setFolders(folders);
        
        // Manage current path based on folder type and custom path
        if (folderType === 'custom' && customPath) {
            // We're in a custom subfolder, set the path
            actions.setCurrentPath(customPath);
        } else {
            // We're in a standard folder (input, output, etc.) or no custom path
            actions.setCurrentPath('');
        }
        
        return { images, folders };
        
    } catch (error) {
        console.error('Error loading images:', error);
        throw error;
    }
}

/**
 * Generate a thumbnail for an image
 * @param {Object} image - Image object with path and metadata
 * @param {number} size - Thumbnail size (default: 200)
 * @returns {Promise<string|null>} Thumbnail URL or null if failed
 */
export async function generateThumbnail(image, size = 200) {
    try {
        const params = new URLSearchParams({
            image_path: image.path,
            size: size.toString()
        });
        
        const response = await fetch(`${API_ENDPOINTS.getThumbnail}?${params}`);
        
        if (response.ok) {
            const blob = await response.blob();
            const thumbnailUrl = URL.createObjectURL(blob);
            return thumbnailUrl;
        } else {
            console.error('Thumbnail generation failed:', response.statusText);
            return null;
        }
    } catch (error) {
        console.error('Error generating thumbnail:', error);
        return null;
    }
}

/**
 * Copy an image to the clipboard
 * @param {string} imagePath - Path to the image file
 */
export async function copyImageToClipboard(imagePath) {
    try {
        const response = await fetch('/sage_utils/copy_image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_path: imagePath })
        });
        
        const result = await response.json();
        if (result.success) {
            // Show temporary success message
            showTemporaryMessage('Image copied to clipboard!', 'success');
        } else {
            console.error('Copy failed:', result.error);
            showTemporaryMessage(`Copy failed: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error copying image:', error);
        showTemporaryMessage(`Error copying image: ${error.message}`, 'error');
    }
}

/**
 * Load image metadata
 * @param {Object} image - Image object with path
 * @returns {Promise<Object>} Metadata object
 */
export async function loadImageMetadata(image, options = {}) {
    const { useCache = true, forceRefresh = false } = options;
    try {
        // Serve from cache when available and not forcing refresh
        if (useCache && !forceRefresh) {
            const cached = MetadataCache.get(image);
            if (cached) {
                return cached;
            }
        }

        const response = await fetch('/sage_utils/image_metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_path: image.path })
        });

        const result = await response.json();
        if (result && result.success) {
            const metadata = result.metadata || {};
            // Persist in cache for future sessions
            MetadataCache.set(image, metadata);
            return metadata;
        } else {
            console.error('Metadata loading failed:', result ? result.error : 'unknown error');
            // Fall back to cached if available
            if (useCache) {
                const cached = MetadataCache.get(image);
                if (cached) return cached;
            }
            return {};
        }
    } catch (error) {
        console.error('Error loading metadata:', error);
        // Fall back to cached if available
        if (useCache) {
            const cached = MetadataCache.get(image);
            if (cached) return cached;
        }
        return {};
    }
}

/**
 * Get cached metadata without network access
 * @param {Object} image - Image object with path
 * @returns {Object|null}
 */
export function getCachedImageMetadata(image) {
    return MetadataCache.get(image);
}

/**
 * Check if cached metadata is stale by TTL
 * @param {Object} image - Image object with path
 * @returns {boolean}
 */
export function isCachedMetadataStale(image) {
    return MetadataCache.isStale(image);
}

/**
 * Load full-size image for viewing
 * @param {string} imagePath - Path to the image
 * @returns {Promise<string|null>} Image URL or null if failed
 */
export async function loadFullImage(imagePath) {
    try {
        const params = new URLSearchParams({ image_path: imagePath });
        const response = await fetch(`/sage_utils/get_image?${params}`);
        
        if (response.ok) {
            const blob = await response.blob();
            return URL.createObjectURL(blob);
        } else {
            console.error('Full image loading failed:', response.statusText);
            return null;
        }
    } catch (error) {
        console.error('Error loading full image:', error);
        return null;
    }
}

/**
 * Browse a custom folder
 * @param {string} folderPath - Path to browse
 * @returns {Promise<Object>} Object containing images and folders
 */
export async function browseFolder(folderPath) {
    try {
        const response = await fetch('/sage_utils/browse_folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder_path: folderPath })
        });
        
        const result = await response.json();
        if (result.success) {
            return {
                images: result.images || [],
                folders: result.folders || []
            };
        } else {
            throw new Error(result.error || 'Failed to browse folder');
        }
    } catch (error) {
        console.error('Error browsing folder:', error);
        throw error;
    }
}

/**
 * Get the parent path for navigation
 * @param {string} currentPath - Current folder path
 * @returns {string} Parent path
 */
export function getParentPath(currentPath) {
    if (!currentPath || currentPath === '/') return '/';
    const parts = currentPath.split('/').filter(part => part !== '');
    if (parts.length <= 1) return '/';
    return '/' + parts.slice(0, -1).join('/');
}

/**
 * Show a temporary status message
 * @param {string} message - Message to show
 * @param {string} type - Message type ('success', 'error', 'info')
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
export function showTemporaryMessage(message, type = 'info', duration = 3000) {
    // Create or find status element
    let statusElement = document.querySelector('.gallery-temp-status');
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.className = 'gallery-temp-status';
        statusElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 15px;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 500;
            z-index: 9999;
            max-width: 300px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(statusElement);
    }
    
    // Set message and style based on type
    statusElement.textContent = message;
    
    const colors = {
        success: { bg: '#4CAF50', text: '#fff' },
        error: { bg: '#F44336', text: '#fff' },
        info: { bg: '#2196F3', text: '#fff' },
        warning: { bg: '#FF9800', text: '#fff' }
    };
    
    const color = colors[type] || colors.info;
    statusElement.style.backgroundColor = color.bg;
    statusElement.style.color = color.text;
    statusElement.style.opacity = '1';
    
    // Auto-hide after duration
    clearTimeout(statusElement.hideTimeout);
    statusElement.hideTimeout = setTimeout(() => {
        statusElement.style.opacity = '0';
        setTimeout(() => {
            if (statusElement.parentNode) {
                statusElement.parentNode.removeChild(statusElement);
            }
        }, 300);
    }, duration);
}

/**
 * Check if a file is a supported image format
 * @param {string} filename - The filename to check
 * @returns {boolean} True if the file is a supported image
 */
export function isSupportedImageFile(filename) {
    if (!filename) return false;
    const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff|tif|ico|heic|heif|avif)$/i;
    return imageExtensions.test(filename);
}

/**
 * Get file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Create an image element with loading states
 * @param {string} src - Image source URL
 * @param {string} alt - Alt text
 * @param {Object} options - Additional options (className, style, etc.)
 * @returns {HTMLImageElement} Image element
 */
export function createImageElement(src, alt = '', options = {}) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    
    if (options.className) {
        img.className = options.className;
    }
    
    if (options.style) {
        Object.assign(img.style, options.style);
    }
    
    // Add loading states
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.3s ease';
    
    img.addEventListener('load', () => {
        img.style.opacity = '1';
    });
    
    img.addEventListener('error', () => {
        img.style.opacity = '0.5';
        img.style.filter = 'grayscale(100%)';
        img.alt = 'Failed to load image';
    });
    
    return img;
}

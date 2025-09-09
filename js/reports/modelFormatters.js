/**
 * Model Formatting Utilities for SageUtils Reports
 * Contains utility functions for formatting model data and display
 */

/**
 * Get file size from backend
 * @param {string} filePath - Path to the file
 * @returns {Promise<number|null>} File size in bytes or null if failed
 */
export async function getFileSize(filePath) {
    try {
        const response = await fetch(`/sage_utils/file_size?path=${encodeURIComponent(filePath)}`);
        if (response.ok) {
            const data = await response.json();
            return data.success ? data.file_size : null;
        }
        return null;
    } catch (error) {
        console.warn('Failed to get file size:', error);
        return null;
    }
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} - Escaped HTML
 */
export function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export function formatFileSize(bytes) {
    // Handle null, undefined, 0, or non-numeric values
    if (!bytes || isNaN(bytes) || bytes <= 0) return 'Unknown';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    // Ensure we don't go out of bounds
    const sizeIndex = Math.min(i, sizes.length - 1);
    const formattedSize = Math.round(bytes / Math.pow(1024, sizeIndex) * 100) / 100;
    
    return formattedSize + ' ' + sizes[sizeIndex];
}

/**
 * Get CSS styling based on base model type
 * @param {string} baseModel - Base model name
 * @returns {string} - CSS style string
 */
export function getBaseModelStyle(baseModel) {
    if (!baseModel) return 'color:green;background-color:orange;';
    
    if (baseModel.startsWith("Flux")) {
        return 'color:yellow;background-color:maroon;';
    } else if (baseModel.startsWith("Pony")) {
        return 'color:white;background-color:green;';
    } else if (baseModel.startsWith("SDXL")) {
        return 'color:yellow;background-color:green;';
    } else if (baseModel.startsWith("SD ")) {
        return 'color:white;background-color:blue;';
    } else {
        return 'color:black;background-color:lightgray;';
    }
}

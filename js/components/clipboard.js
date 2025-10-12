/**
 * Clipboard Utilities
 * Centralized clipboard operations with fallback support for older browsers
 */

/**
 * Copy text to clipboard with fallback support
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
export async function copyToClipboard(text) {
    try {
        // Modern clipboard API (preferred)
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for older browsers using execCommand
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            textArea.style.top = '0';
            textArea.setAttribute('readonly', '');
            
            document.body.appendChild(textArea);
            textArea.select();
            
            let success = false;
            try {
                success = document.execCommand('copy');
            } catch (err) {
                console.error('Fallback copy failed:', err);
            }
            
            document.body.removeChild(textArea);
            return success;
        }
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return false;
    }
}

/**
 * Read text from clipboard
 * @returns {Promise<string|null>} - Clipboard text or null if failed/not supported
 */
export async function readFromClipboard() {
    try {
        if (navigator.clipboard && navigator.clipboard.readText) {
            const text = await navigator.clipboard.readText();
            return text;
        } else {
            console.warn('Clipboard read not supported in this browser');
            return null;
        }
    } catch (error) {
        // Permission denied or other error
        console.error('Failed to read from clipboard:', error);
        return null;
    }
}

/**
 * Copy text to clipboard and show notification
 * @param {string} text - Text to copy
 * @param {string} successMessage - Message to show on success (optional)
 * @param {Function} showNotification - Optional notification function
 * @returns {Promise<boolean>} - Success status
 */
export async function copyWithNotification(text, successMessage = 'Copied to clipboard', showNotification = null) {
    const success = await copyToClipboard(text);
    
    if (showNotification) {
        if (success) {
            showNotification(successMessage, 'success');
        } else {
            showNotification('Failed to copy to clipboard', 'error');
        }
    }
    
    return success;
}

/**
 * Check if clipboard API is available
 * @returns {boolean} - True if clipboard operations are supported
 */
export function isClipboardSupported() {
    return !!(navigator.clipboard && (navigator.clipboard.writeText || navigator.clipboard.readText));
}

/**
 * Check if clipboard write is available
 * @returns {boolean} - True if clipboard write is supported
 */
export function isClipboardWriteSupported() {
    return !!(navigator.clipboard && navigator.clipboard.writeText) || 
           (document.queryCommandSupported && document.queryCommandSupported('copy'));
}

/**
 * Check if clipboard read is available
 * @returns {boolean} - True if clipboard read is supported
 */
export function isClipboardReadSupported() {
    return !!(navigator.clipboard && navigator.clipboard.readText);
}

// Re-export image clipboard utilities from shared modules
export { copyImageToClipboard } from '../shared/imageUtils.js';

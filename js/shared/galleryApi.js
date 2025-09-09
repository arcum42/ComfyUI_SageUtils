/**
 * Gallery API Functions
 * Handles backend communication and data processing for the image gallery
 * Extracted from imageGalleryTab.js for better organization and maintainability
 */

import { api } from "../../../scripts/api.js";
import { actions } from "./stateManager.js";
import { handleError } from "./errorHandler.js";
import { formatFileSize } from "../reports/reportGenerator.js";

/**
 * Load images and folders from a specified folder type
 * @param {string} folderType - Type of folder ('notes', 'input', 'output', 'custom')
 * @param {string|null} customPath - Custom path for 'custom' folder type
 * @param {Function} setStatus - Status callback function
 * @returns {Object} Result object with images, folders, and success status
 */
export async function loadImagesFromFolder(folderType, customPath = null, setStatus = null) {
    try {
        if (setStatus) setStatus(`Loading images from ${folderType} folder...`);
        actions.setGalleryLoading(true);
        
        // Prepare request body
        const requestBody = { folder: folderType };
        if (customPath) {
            requestBody.path = customPath;
        }
        
        const response = await api.fetchApi('/sage_utils/list_images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
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
        
        if (setStatus) {
            setStatus(`Loaded ${images.length} images and ${folders.length} folders from ${folderType} folder`);
        }
        
        return {
            success: true,
            images,
            folders,
            totalItems: images.length + folders.length
        };
        
    } catch (error) {
        console.error('Error loading images:', error);
        
        if (setStatus) {
            setStatus(`Error loading images: ${error.message}`, true);
        }
        
        // Let the calling function handle state cleanup
        throw error;
        
    } finally {
        actions.setGalleryLoading(false);
    }
}

/**
 * Load metadata for a specific image
 * @param {Object} image - Image object with path property
 * @param {Function} setStatus - Status callback function
 * @returns {Object} Metadata object or throws error
 */
export async function loadImageMetadata(image, setStatus = null) {
    try {
        if (setStatus) setStatus('Loading image metadata...');
        actions.toggleMetadata(true);
        
        const response = await api.fetchApi('/sage_utils/image_metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_path: image.path })
        });
        
        const result = await response.json();
        
        if (result.success) {
            const metadataObj = result.metadata;
            
            if (setStatus) {
                setStatus('Metadata loaded');
            }
            
            return {
                success: true,
                metadata: metadataObj,
                hasErrors: false
            };
            
        } else {
            throw new Error(result.error || 'Failed to load metadata');
        }
        
    } catch (error) {
        console.error('Error loading metadata:', error);
        
        if (setStatus) {
            setStatus('Metadata extraction failed, showing basic info', true);
        }
        
        // Return basic fallback information
        return {
            success: false,
            error: error.message,
            fallbackData: {
                path: image.path,
                filename: image.filename || 'Unknown',
                modified: image.modified
            }
        };
    }
}

/**
 * Process and format metadata for display
 * @param {Object} metadataObj - Raw metadata object from API
 * @returns {Object} Formatted metadata with HTML and error status
 */
export function formatMetadataForDisplay(metadataObj) {
    let html = '';
    let hasErrors = false;
    
    // File Information - always try to show this first
    try {
        if (metadataObj.file_info) {
            html += '<div style="color: #4CAF50; margin-bottom: 10px; font-weight: bold;">📄 File Information</div>';
            const fileInfo = metadataObj.file_info;
            
            if (fileInfo.filename) html += `<div>Name: ${fileInfo.filename}</div>`;
            if (fileInfo.dimensions) {
                html += `<div>Dimensions: ${fileInfo.dimensions.width} × ${fileInfo.dimensions.height}</div>`;
            }
            if (fileInfo.size_human || fileInfo.size) {
                html += `<div>Size: ${fileInfo.size_human || formatFileSize(fileInfo.size)}</div>`;
            }
            if (fileInfo.format) html += `<div>Format: ${fileInfo.format}</div>`;
            if (fileInfo.modified) {
                html += `<div>Modified: ${new Date(fileInfo.modified).toLocaleString()}</div>`;
            }
            if (fileInfo.error) {
                html += `<div style="color: #ff9800;">⚠️ ${fileInfo.error}</div>`;
                hasErrors = true;
            }
            html += '<br>';
        }
    } catch (fileInfoError) {
        html += '<div style="color: #ff9800;">⚠️ Could not load file information</div><br>';
        hasErrors = true;
    }
    
    // EXIF Data - handle gracefully if it fails
    try {
        if (metadataObj.exif && Object.keys(metadataObj.exif).length > 0) {
            html += '<div style="color: #2196F3; margin-bottom: 10px; font-weight: bold;">📷 EXIF Data</div>';
            Object.entries(metadataObj.exif).forEach(([key, value]) => {
                try {
                    // Handle values that might have conversion issues
                    let displayValue = value;
                    if (typeof value === 'number' && !Number.isFinite(value)) {
                        displayValue = 'N/A';
                    } else if (typeof value === 'object' && value !== null) {
                        displayValue = JSON.stringify(value);
                    }
                    html += `<div>${key}: ${displayValue}</div>`;
                } catch (exifItemError) {
                    html += `<div>${key}: <em style="color: #ff9800;">Error reading value</em></div>`;
                }
            });
            html += '<br>';
        }
    } catch (exifError) {
        html += '<div style="color: #ff9800;">⚠️ EXIF data could not be fully loaded</div><br>';
        hasErrors = true;
    }
    
    // Generation Parameters - handle gracefully if it fails
    try {
        if (metadataObj.generation_params && Object.keys(metadataObj.generation_params).length > 0) {
            html += '<div style="color: #FF9800; margin-bottom: 10px; font-weight: bold;">🎨 Generation Parameters</div>';
            Object.entries(metadataObj.generation_params).forEach(([key, value]) => {
                try {
                    if (typeof value === 'object') {
                        html += `<div>${key}: <pre style="margin: 5px 0; background: #444; padding: 5px; border-radius: 3px; font-size: 10px;">${JSON.stringify(value, null, 2)}</pre></div>`;
                    } else {
                        html += `<div>${key}: ${value}</div>`;
                    }
                } catch (paramError) {
                    html += `<div>${key}: <em style="color: #ff9800;">Error reading parameter</em></div>`;
                }
            });
            html += '<br>';
        }
    } catch (paramsError) {
        html += '<div style="color: #ff9800;">⚠️ Generation parameters could not be fully loaded</div><br>';
        hasErrors = true;
    }
    
    if (!html) {
        html = '<em style="color: #999;">No metadata available for this image</em>';
    }
    
    if (hasErrors) {
        html = '<div style="color: #ff9800; margin-bottom: 10px;">⚠️ Some metadata could not be loaded completely</div>' + html;
    }
    
    return {
        html,
        hasErrors
    };
}

/**
 * Generate fallback metadata display for when full metadata fails
 * @param {Object} image - Image object with basic properties
 * @param {string} errorMessage - Error message to display
 * @returns {string} HTML string for fallback display
 */
export function generateFallbackMetadata(image, errorMessage) {
    let fallbackHtml = '';
    
    try {
        fallbackHtml += '<div style="color: #4CAF50; margin-bottom: 10px; font-weight: bold;">📄 Basic File Information</div>';
        fallbackHtml += `<div>Path: ${image.path}</div>`;
        fallbackHtml += `<div>Filename: ${image.filename || 'Unknown'}</div>`;
        if (image.modified) {
            fallbackHtml += `<div>Modified: ${new Date(image.modified).toLocaleString()}</div>`;
        }
        fallbackHtml += '<br>';
    } catch (fallbackError) {
        // If even basic info fails, show minimal info
        fallbackHtml = `<div>Path: ${image.path}</div><br>`;
    }
    
    fallbackHtml += `
        <div style="color: #f44336;">❌ Full metadata extraction failed</div>
        <div style="color: #888; font-size: 10px; margin-top: 5px;">${errorMessage}</div>
        <div style="color: #ff9800; font-size: 10px; margin-top: 5px;">
            This may be due to complex EXIF data that cannot be processed.
        </div>
    `;
    
    return fallbackHtml;
}

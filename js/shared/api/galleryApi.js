/**
 * Gallery API Functions
 * Handles backend communication and data processing for the image gallery
 * Extracted from imageGalleryTab.js for better organization and maintainability
 */

import { api } from "../../../../scripts/api.js";
import { actions, selectors } from "../stateManager.js";
import { handleError } from "../errorHandler.js";
import { formatFileSize } from "../../reports/reportGenerator.js";

/**
 * Check if an image has generation parameters in its metadata
 * @param {Object} metadata - Metadata object from API
 * @returns {boolean} True if image has generation parameters
 */
function hasGenerationParameters(metadata) {
    if (!metadata) return false;
    
    // AI generation keywords that we're looking for
    const generationKeywords = ['parameters', 'prompt', 'extra_pnginfo', 'extra'];
    
    // Check for generation_params field and verify it has generation keywords
    if (metadata.generation_params && typeof metadata.generation_params === 'object') {
        const genParamKeys = Object.keys(metadata.generation_params);
        const hasGenerationKeyword = genParamKeys.some(key => {
            const lowerKey = key.toLowerCase();
            return generationKeywords.some(keyword => lowerKey === keyword || lowerKey.includes(keyword));
        });
        
        if (hasGenerationKeyword) {
            return true;
        }
    }
    
    // Only check PNG/image metadata for AI generation keywords
    // AI generators typically save to PNG with specific keywords
    if (metadata.exif && typeof metadata.exif === 'object') {
        const exifKeys = Object.keys(metadata.exif);
        
        // Check if ANY key contains one of our generation keywords (case-insensitive)
        const hasGenerationKeyword = exifKeys.some(key => {
            const lowerKey = key.toLowerCase();
            return generationKeywords.some(keyword => lowerKey === keyword || lowerKey.includes(keyword));
        });
        
        // Only return true if we found a generation keyword
        if (hasGenerationKeyword) {
            return true;
        }
        
        // If no generation keywords found, return false
        // This will exclude JPEG/JFIF metadata and other non-AI metadata
        return false;
    }
    
    // Check file_info for generation-specific metadata
    if (metadata.file_info && metadata.file_info.generation_info) {
        return true;
    }
    
    // Default to false - no generation parameters found
    return false;
}

/**
 * Check metadata status for a batch of images
 * @param {Array} images - Array of image objects
 * @param {Function} setStatus - Status callback function
 * @param {AbortSignal} signal - Optional abort signal to cancel the operation
 * @returns {Promise<Map>} Map of image paths to boolean indicating if they have generation params
 */
export async function checkImagesForGenerationParams(images, setStatus = null, signal = null) {
    const metadataMap = new Map();
    
    if (!images || images.length === 0) {
        return metadataMap;
    }
    
    const batchSize = 10;
    const totalImages = images.length;
    
    for (let i = 0; i < images.length; i += batchSize) {
        // Check if operation was aborted
        if (signal && signal.aborted) {
            throw new DOMException('Operation aborted', 'AbortError');
        }
        
        const batch = images.slice(i, i + batchSize);
        
        if (setStatus) {
            const progress = Math.min(i + batchSize, totalImages);
            setStatus(`Loading images ${progress}/${totalImages}...`);
        }
        
        // Check each image in the batch concurrently
        const results = await Promise.allSettled(
            batch.map(async (image) => {
                try {
                    const response = await api.fetchApi('/sage_utils/image_metadata', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ image_path: image.path }),
                        signal: signal // Pass abort signal to fetch
                    });
                    
                    const result = await response.json();
                    
                    if (result.success && result.metadata) {
                        return {
                            path: image.path,
                            hasParams: hasGenerationParameters(result.metadata)
                        };
                    }
                    
                    return { path: image.path, hasParams: false };
                } catch (error) {
                    console.warn(`Error checking metadata for ${image.filename}:`, error);
                    return { path: image.path, hasParams: false };
                }
            })
        );
        
        // Collect results
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                metadataMap.set(result.value.path, result.value.hasParams);
            }
        });
    }
    
    return metadataMap;
}

/**
 * Load metadata in the background and update state progressively
 * @param {Array} images - Array of image objects
 * @param {AbortSignal} signal - Abort signal
 * @param {Function} setStatus - Status callback
 * @param {Function} onProgress - Progress callback
 */
async function loadMetadataInBackground(images, signal, setStatus, onProgress) {
    if (!images || images.length === 0) {
        return;
    }
    
    const batchSize = 10;
    const totalImages = images.length;
    let processedCount = 0;
    let imagesWithParams = 0;
    
    for (let i = 0; i < images.length; i += batchSize) {
        // Check if aborted
        if (signal && signal.aborted) {
            throw new DOMException('Operation aborted', 'AbortError');
        }
        
        const batch = images.slice(i, i + batchSize);
        
        // Check metadata for this batch
        const results = await Promise.allSettled(
            batch.map(async (image) => {
                try {
                    const response = await api.fetchApi('/sage_utils/image_metadata', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ image_path: image.path }),
                        signal: signal
                    });
                    
                    const result = await response.json();
                    
                    if (result.success && result.metadata) {
                        return {
                            path: image.path,
                            hasParams: hasGenerationParameters(result.metadata)
                        };
                    }
                    
                    return { path: image.path, hasParams: false };
                } catch (error) {
                    return { path: image.path, hasParams: false };
                }
            })
        );
        
        // Update state with new metadata info
        const currentImages = selectors.galleryImages();
        if (currentImages) {
            const updatedImages = currentImages.map(img => {
                const metadataResult = results.find(r => 
                    r.status === 'fulfilled' && r.value.path === img.path
                );
                
                if (metadataResult) {
                    const hasParams = metadataResult.value.hasParams;
                    if (hasParams) imagesWithParams++;
                    return {
                        ...img,
                        hasGenerationParams: hasParams,
                        metadataLoading: false
                    };
                }
                return img;
            });
            
            actions.setImages(updatedImages);
        }
        
        processedCount += batch.length;
        
        // Update progress
        if (setStatus) {
            setStatus(`Checking metadata ${processedCount}/${totalImages}... (${imagesWithParams} with params)`);
        }
        
        if (onProgress) {
            onProgress({
                current: processedCount,
                total: totalImages,
                withParams: imagesWithParams
            });
        }
    }
    
    // Final update
    if (setStatus) {
        setStatus(`Loaded ${totalImages} images (${imagesWithParams} with generation params)`);
    }
}

/**
 * Load images and folders from a specified folder type (optimized version)
 * Returns images immediately and loads metadata in background
 * @param {string} folderType - Type of folder ('notes', 'input', 'output', 'custom')
 * @param {string|null} customPath - Custom path for 'custom' folder type
 * @param {Function} setStatus - Status callback function
 * @param {AbortSignal} signal - Optional abort signal to cancel the operation
 * @param {Function} onMetadataProgress - Optional callback for metadata loading progress
 * @returns {Object} Result object with images, folders, and success status
 */
export async function loadImagesFromFolder(folderType, customPath = null, setStatus = null, signal = null, onMetadataProgress = null) {
    try {
        if (setStatus) setStatus(`Loading images from ${folderType} folder...`);
        actions.setGalleryLoading(true);
        
        // Check if operation was aborted before starting
        if (signal && signal.aborted) {
            throw new DOMException('Operation aborted', 'AbortError');
        }
        
        // Prepare request body
        const requestBody = { folder: folderType };
        if (customPath) {
            requestBody.path = customPath;
        }
        
        const response = await api.fetchApi('/sage_utils/list_images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: signal // Pass abort signal to fetch
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
        
        // Check if operation was aborted after fetching image list
        if (signal && signal.aborted) {
            throw new DOMException('Operation aborted', 'AbortError');
        }
        
        // Create images with pending metadata status
        const imagesWithPendingMetadata = images.map(img => ({
            ...img,
            hasGenerationParams: false, // Default to false, will update progressively
            metadataLoading: true
        }));
        
        // Update state with loaded images and folders immediately
        actions.setImages(imagesWithPendingMetadata);
        actions.setFolders(folders);
        
        // Manage current path based on folder type and custom path
        if (folderType === 'custom' && customPath) {
            actions.setCurrentPath(customPath);
        } else {
            actions.setCurrentPath('');
        }
        
        if (setStatus) {
            setStatus(`Loaded ${images.length} images, ${folders.length} folders`);
        }
        
        // Return immediately with images - metadata will load in background
        const returnValue = {
            success: true,
            images: imagesWithPendingMetadata,
            folders,
            totalItems: images.length + folders.length,
            metadataLoading: true
        };
        
        // Start loading metadata in background (don't await)
        loadMetadataInBackground(images, signal, setStatus, onMetadataProgress).catch(err => {
            if (err.name !== 'AbortError') {
                console.warn('Background metadata loading error:', err);
            }
        });
        
        return returnValue;
        
    } catch (error) {
        // Don't log abort errors - these are expected when user changes folders
        if (error.name !== 'AbortError' && error.name !== 'DOMException') {
            console.error('Error loading images:', error);
        }
        
        // Don't show status for abort errors
        if (error.name !== 'AbortError' && error.name !== 'DOMException' && setStatus) {
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

/**
 * Find duplicate images in a folder
 * @param {string} folderPath - Path to the folder to scan
 * @param {boolean} includeSubfolders - Whether to include subfolders
 * @param {Function} setStatus - Status callback function
 * @returns {Promise<Object>} Duplicate scan results
 */
export async function findDuplicateImages(folderPath, includeSubfolders = false, setStatus = null) {
    try {
        if (setStatus) {
            setStatus('Scanning for duplicates...');
        }
        
        const response = await api.fetchApi('/sage_utils/find_duplicates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                folder_path: folderPath,
                include_subfolders: includeSubfolders
            })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to find duplicates');
        }
        
        if (setStatus) {
            setStatus(`Found ${result.duplicate_groups} duplicate groups`);
        }
        
        return result;
        
    } catch (error) {
        console.error('Error finding duplicates:', error);
        if (setStatus) {
            setStatus(`Error: ${error.message}`, true);
        }
        throw error;
    }
}

/**
 * Delete multiple images
 * @param {Array<string>} imagePaths - Array of image paths to delete
 * @param {Function} setStatus - Status callback function
 * @returns {Promise<Object>} Deletion results
 */
export async function deleteImages(imagePaths, setStatus = null) {
    try {
        if (setStatus) {
            setStatus(`Deleting ${imagePaths.length} images...`);
        }
        
        const response = await api.fetchApi('/sage_utils/delete_images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_paths: imagePaths
            })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to delete images');
        }
        
        if (setStatus) {
            setStatus(`Deleted ${result.deleted} images`);
        }
        
        return result;
        
    } catch (error) {
        console.error('Error deleting images:', error);
        if (setStatus) {
            setStatus(`Error: ${error.message}`, true);
        }
        throw error;
    }
}

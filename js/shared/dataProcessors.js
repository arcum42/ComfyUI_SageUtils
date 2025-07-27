/**
 * Data processing utilities for Models tab
 * Handles filtering, sorting, and processing of model data
 */

import { 
    getFileType,
    supportsPreview,
    FILE_TYPES
} from "./config.js";

/**
 * Processes raw model data combining hash data with info data
 * @param {Object} hashData - Hash data from cache
 * @param {Object} infoData - Info data from cache
 * @param {Object} filters - Current filter settings
 * @returns {Array} Processed model data array
 */
export function processModelData(hashData, infoData, filters = {}) {
    if (!hashData || !infoData) {
        return [];
    }

    const processedData = [];
    
    // Combine hash data with info data
    for (const [filename, hashInfo] of Object.entries(hashData)) {
        const info = infoData[hashInfo.hash] || {};
        
        const modelData = {
            filename,
            hash: hashInfo.hash,
            lastUsed: hashInfo.lastUsed,
            filePath: hashInfo.filePath,
            fileSize: hashInfo.fileSize,
            ...info // Spread info data (name, description, baseModel, etc.)
        };

        processedData.push(modelData);
    }

    return processedData;
}

/**
 * Filters model data based on filter criteria
 * @param {Array} models - Array of model data objects
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered model data array
 */
export function filterModels(models, filters = {}) {
    if (!Array.isArray(models)) {
        return [];
    }

    return models.filter(model => {
        // Type filter
        if (filters.type && filters.type !== 'all') {
            const modelType = (model.type || '').toLowerCase();
            if (modelType !== filters.type.toLowerCase()) {
                return false;
            }
        }

        // Search filter
        if (filters.search && filters.search.trim()) {
            const searchTerm = filters.search.toLowerCase().trim();
            const searchableText = [
                model.filename || '',
                model.name || '',
                model.description || '',
                model.baseModel || '',
                ...(model.trainedWords || [])
            ].join(' ').toLowerCase();
            
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }

        // Last used filter
        if (filters.lastUsed && filters.lastUsed !== 'all') {
            const lastUsed = model.lastUsed;
            const now = Date.now();
            const day = 24 * 60 * 60 * 1000;
            
            switch (filters.lastUsed) {
                case 'today':
                    if (!lastUsed || now - lastUsed > day) return false;
                    break;
                case 'week':
                    if (!lastUsed || now - lastUsed > 7 * day) return false;
                    break;
                case 'month':
                    if (!lastUsed || now - lastUsed > 30 * day) return false;
                    break;
                case 'never':
                    if (lastUsed) return false;
                    break;
            }
        }

        // Update available filter
        if (filters.updates && filters.updates !== 'all') {
            const hasUpdate = model.update_available;
            if (filters.updates === 'available' && !hasUpdate) return false;
            if (filters.updates === 'none' && hasUpdate) return false;
        }

        // NSFW filter
        if (!filters.showNSFW && model.nsfw === true) {
            return false;
        }

        return true;
    });
}

/**
 * Sorts model data based on sort criteria
 * @param {Array} models - Array of model data objects
 * @param {string} sortBy - Sort criteria
 * @returns {Array} Sorted model data array
 */
export function sortModels(models, sortBy = 'name') {
    if (!Array.isArray(models)) {
        return [];
    }

    const sortedModels = [...models];

    sortedModels.sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return (a.name || a.filename || '').localeCompare(b.name || b.filename || '');
            
            case 'filename':
                return (a.filename || '').localeCompare(b.filename || '');
            
            case 'lastUsed':
                return (b.lastUsed || 0) - (a.lastUsed || 0);
            
            case 'fileSize':
                return (b.fileSize || 0) - (a.fileSize || 0);
            
            case 'type':
                return (a.type || '').localeCompare(b.type || '');
            
            case 'baseModel':
                return (a.baseModel || '').localeCompare(b.baseModel || '');
            
            default:
                return 0;
        }
    });

    return sortedModels;
}

/**
 * Groups models by folder structure
 * @param {Array} models - Array of model data objects
 * @returns {Object} Grouped model data by folders
 */
export function groupModelsByFolder(models) {
    if (!Array.isArray(models)) {
        return {};
    }

    const grouped = {};

    models.forEach(model => {
        const filePath = model.filePath || '';
        const pathParts = filePath.split('/').filter(part => part.length > 0);
        
        // Remove filename from path
        pathParts.pop();
        
        const folderPath = pathParts.length > 0 ? pathParts.join('/') : 'root';
        
        if (!grouped[folderPath]) {
            grouped[folderPath] = [];
        }
        
        grouped[folderPath].push(model);
    });

    return grouped;
}

/**
 * Finds other versions of the same model by modelId
 * @param {Array} models - Array of all model data
 * @param {string} modelId - The model ID to find versions for
 * @param {string} currentHash - Current model hash to exclude
 * @returns {Array} Array of other model versions
 */
export function findOtherModelVersions(models, modelId, currentHash) {
    if (!Array.isArray(models) || !modelId) {
        return [];
    }

    return models.filter(model => {
        return model.modelId === modelId && model.hash !== currentHash;
    });
}

/**
 * Extracts and formats metadata for display
 * @param {Object} modelData - Model data object
 * @returns {Object} Formatted metadata object
 */
export function formatModelMetadata(modelData) {
    if (!modelData) {
        return {};
    }

    return {
        name: modelData.name || modelData.filename || 'Unknown',
        type: modelData.type || 'Unknown',
        baseModel: modelData.baseModel || 'Unknown',
        description: modelData.description || '',
        trainedWords: modelData.trainedWords || [],
        hash: modelData.hash || '',
        fileSize: formatFileSize(modelData.fileSize || 0),
        lastUsed: formatLastUsed(modelData.lastUsed),
        updateAvailable: modelData.update_available || false,
        nsfw: modelData.nsfw || false,
        external_url: modelData.external_url || '',
        notes: modelData.notes || ''
    };
}

/**
 * Formats file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formats last used timestamp
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted last used string
 */
function formatLastUsed(timestamp) {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours === 0) {
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            return diffMinutes <= 1 ? 'Just now' : `${diffMinutes} minutes ago`;
        }
        return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

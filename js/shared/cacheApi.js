/**
 * Cache API Functions for SageUtils
 * Handles all server communication for cache operations
 */

/**
 * Cache API Module for SageUtils
 * Handles all server communication and cache data management
 */

import { api } from "../../../scripts/api.js";

// Global cache data store
export let cacheData = {
    hash: {},
    info: {}
};

/**
 * Fetch cache hash data from server
 * @returns {Promise<Object>} - Hash data mapping file paths to hashes
 */
export async function fetchCacheHash() {
    try {
        const response = await api.fetchApi('/sage_cache/hash');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        cacheData.hash = data;
        return data;
    } catch (error) {
        console.error('Error fetching cache hash:', error);
        throw error;
    }
}

/**
 * Fetch cache info data from server
 * @returns {Promise<Object>} - Info data mapping hashes to model information
 */
export async function fetchCacheInfo() {
    try {
        const response = await api.fetchApi('/sage_cache/info');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        cacheData.info = data;
        return data;
    } catch (error) {
        console.error('Error fetching cache info:', error);
        throw error;
    }
}

/**
 * Pull metadata for a specific file from Civitai
 * @param {string} filePath - Full path to the model file
 * @param {boolean} force - Whether to force re-pull even if data exists
 * @returns {Promise<Object>} - API response
 */
export async function pullMetadata(filePath, force = false) {
    try {
        const response = await api.fetchApi('/sage_utils/pull_metadata', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                file_path: filePath,
                force: force
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Unknown error occurred');
        }

        return result;
    } catch (error) {
        console.error('Error pulling metadata:', error);
        throw error;
    }
}

/**
 * Update cache info for a specific model
 * @param {string} hash - Model hash
 * @param {Object} updatedInfo - Updated model information
 * @returns {Promise<Object>} - API response
 */
export async function updateCacheInfo(hash, updatedInfo) {
    try {
        const response = await api.fetchApi('/sage_utils/update_cache_info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                hash: hash,
                info: updatedInfo
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Unknown error occurred');
        }

        // Update local cache data
        cacheData.info[hash] = updatedInfo;
        
        return result;
    } catch (error) {
        console.error('Error updating cache info:', error);
        throw error;
    }
}

/**
 * Refresh both hash and info cache data
 * @returns {Promise<Array>} - Array containing [hashData, infoData]
 */
export async function refreshCacheData() {
    try {
        const [hashData, infoData] = await Promise.all([
            fetchCacheHash(),
            fetchCacheInfo()
        ]);
        
        return [hashData, infoData];
    } catch (error) {
        console.error('Error refreshing cache data:', error);
        throw error;
    }
}

/**
 * Get file path for a given hash
 * @param {string} hash - Model hash to find
 * @returns {string|null} - File path or null if not found
 */
export function getFilePathForHash(hash) {
    for (const [filePath, fileHash] of Object.entries(cacheData.hash)) {
        if (fileHash === hash) {
            return filePath;
        }
    }
    return null;
}

/**
 * Civitai API Integration Module
 * Centralized interface for all Civitai API interactions
 */

/**
 * Configuration for Civitai API calls
 */
const CIVITAI_CONFIG = {
    BASE_URL: 'https://civitai.com',
    API_BASE: 'https://civitai.com/api/v1',
    MAX_NSFW_LEVEL: 1,      // Maximum NSFW level for images (0=None, 1=Soft, 2=Mature, 3=X)
};

/**
 * Generate direct Civitai image URL for a model hash
 * This allows the browser to load images directly from Civitai without pre-fetching
 * @param {string} hash - Model file hash
 * @param {Object} options - Request options
 * @param {number} [options.maxNsfwLevel] - Maximum NSFW level to include
 * @returns {string} - Direct Civitai API URL for images
 */
export function getCivitaiImageApiUrl(hash, options = {}) {
    const { maxNsfwLevel = CIVITAI_CONFIG.MAX_NSFW_LEVEL } = options;
    
    if (!hash) {
        return null;
    }
    
    // Return the direct Civitai API URL - let the browser handle the CORS and loading
    return `${CIVITAI_CONFIG.API_BASE}/model-versions/by-hash/${hash}`;
}

/**
 * Generate direct Civitai model API URL for a model ID
 * @param {string|number} modelId - Civitai model ID
 * @returns {string} - Direct Civitai API URL for model data
 */
export function getCivitaiModelApiUrl(modelId) {
    if (!modelId || modelId === 'Unknown') {
        return null;
    }
    
    return `${CIVITAI_CONFIG.API_BASE}/models/${modelId}`;
}

/**
 * Extract image URLs from Civitai API response data
 * @param {Object} civitaiData - Response from Civitai API
 * @param {Object} options - Filtering options
 * @param {number} [options.maxNsfwLevel] - Maximum NSFW level to include
 * @param {number} [options.maxImages] - Maximum number of images to return
 * @returns {Array} - Array of filtered image objects
 */
export function extractImageUrls(civitaiData, options = {}) {
    const { 
        maxNsfwLevel = CIVITAI_CONFIG.MAX_NSFW_LEVEL,
        maxImages = 1 
    } = options;
    
    if (!civitaiData || !civitaiData.images || !Array.isArray(civitaiData.images)) {
        return [];
    }
    
    // Filter images by NSFW level and limit count
    const filteredImages = civitaiData.images
        .filter(img => (img.nsfwLevel || 0) <= maxNsfwLevel)
        .slice(0, maxImages);
    
    return filteredImages;
}

/**
 * Get the first appropriate image URL from cached model info
 * @param {Object} modelInfo - Model information object with images array
 * @param {Object} options - Filtering options
 * @returns {string|null} - First appropriate image URL or null
 */
export function getFirstImageFromCache(modelInfo, options = {}) {
    const { maxNsfwLevel = CIVITAI_CONFIG.MAX_NSFW_LEVEL } = options;
    
    if (!modelInfo || !modelInfo.images || !Array.isArray(modelInfo.images)) {
        return null;
    }
    
    const appropriateImage = modelInfo.images.find(img => (img.nsfwLevel || 0) <= maxNsfwLevel);
    return appropriateImage ? appropriateImage.url : null;
}

/**
 * Generate Civitai model URL from model ID
 * @param {string|number} modelId - Civitai model ID
 * @param {string|number} [versionId] - Optional version ID
 * @returns {string} - Complete Civitai model URL
 */
export function getModelUrl(modelId, versionId = null) {
    if (!modelId || modelId === 'Unknown') {
        return '#';
    }
    
    let url = `${CIVITAI_CONFIG.BASE_URL}/models/${modelId}`;
    if (versionId) {
        url += `?modelVersionId=${versionId}`;
    }
    
    return url;
}

/**
 * Generate Civitai download URL from version ID
 * @param {string|number} versionId - Civitai model version ID
 * @param {string} [apiToken] - Optional API token for authenticated downloads
 * @returns {string} - Complete download URL
 */
export function getDownloadUrl(versionId, apiToken = null) {
    if (!versionId) {
        return '#';
    }
    
    let url = `${CIVITAI_CONFIG.BASE_URL}/api/download/models/${versionId}`;
    if (apiToken) {
        url += `?token=${encodeURIComponent(apiToken)}`;
    }
    
    return url;
}

/**
 * Check if a model has updates available based on metadata
 * @param {Object} modelInfo - Model information object
 * @returns {boolean} - True if update is available
 */
export function hasUpdateAvailable(modelInfo) {
    return !!(modelInfo && modelInfo.update_available);
}

/**
 * Get styled CSS for model based on update availability
 * @param {Object} modelInfo - Model information object
 * @returns {string} - CSS style string
 */
export function getUpdateStyle(modelInfo) {
    return hasUpdateAvailable(modelInfo) ? 'background-color:orange;' : '';
}

/**
 * Extract Civitai information from model metadata for display
 * @param {Object} modelInfo - Model information object
 * @returns {Object} - Formatted Civitai information
 */
export function extractCivitaiInfo(modelInfo) {
    if (!modelInfo) {
        return {
            hasInfo: false,
            versionId: null,
            modelId: null,
            modelUrl: '#',
            downloadUrl: '#',
            hasUpdate: false,
            updateUrl: '#'
        };
    }

    const versionId = modelInfo.id;
    const modelId = modelInfo.modelId;
    const hasUpdate = hasUpdateAvailable(modelInfo);
    const updateVersionId = modelInfo.update_version_id;

    return {
        hasInfo: !!(versionId || modelId),
        versionId,
        modelId,
        modelUrl: getModelUrl(modelId, versionId),
        downloadUrl: modelInfo.downloadUrl || getDownloadUrl(versionId),
        hasUpdate,
        updateUrl: hasUpdate ? getModelUrl(modelId, updateVersionId) : '#'
    };
}

/**
 * Format trigger words for display with copy functionality
 * @param {Array|string} triggerWords - Array of trigger words or comma-separated string
 * @param {Object} options - Formatting options
 * @param {boolean} [options.includeButton] - Whether to include copy button
 * @param {string} [options.emptyText] - Text to show when no triggers
 * @returns {string} - HTML formatted trigger words
 */
export function formatTriggerWords(triggerWords, options = {}) {
    const {
        includeButton = true,
        emptyText = '<i>No triggers</i>'
    } = options;

    // Handle different input formats
    let words = '';
    if (Array.isArray(triggerWords)) {
        words = triggerWords.join(', ');
    } else if (typeof triggerWords === 'string') {
        words = triggerWords;
    }

    // Check if we have actual trigger words
    const hasTriggers = words && words.trim() !== '' && words !== 'No triggers';
    
    if (!hasTriggers) {
        return emptyText;
    }

    // Escape HTML
    const escapedWords = escapeHtml(words);
    
    if (!includeButton) {
        return escapedWords;
    }

    return `${escapedWords}<br><br><button style="background-color: #01006D; color: yellow; font-size: 12px;" onclick="copyToClipboard('${escapedWords}')">Copy Triggers</button>`;
}

/**
 * Escape HTML special characters
 * @private
 * @param {string} text - Text to escape
 * @returns {string} - Escaped HTML
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Configuration getter for external access
 * @returns {Object} - Civitai configuration object
 */
export function getConfig() {
    return { ...CIVITAI_CONFIG };
}

/**
 * Update configuration (for advanced usage)
 * @param {Object} newConfig - Configuration updates
 */
export function updateConfig(newConfig) {
    Object.assign(CIVITAI_CONFIG, newConfig);
}

// Export constants for external use
export const NSFW_LEVELS = {
    NONE: 0,
    SOFT: 1,
    MATURE: 2,
    X: 3
};

export const DEFAULT_CONFIG = { ...CIVITAI_CONFIG };

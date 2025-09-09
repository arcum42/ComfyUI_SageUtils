/**
 * HTML Report Generator for SageUtils Cache Browser
 * Handles generation of styled HTML reports with model information
 */

import {
    getModelUrl,
    hasUpdateAvailable,
    getUpdateStyle,
    formatTriggerWords
} from './civitai.js';

import {
    MODEL_FILE_EXTENSIONS,
    COMMON_MODEL_EXTENSIONS,
    MODEL_TYPES,
    DEFAULT_THUMBNAIL_WIDTH,
    DEFAULT_THUMBNAIL_HEIGHT,
    DEFAULT_BATCH_SIZE,
    hasModelExtension,
    hasCommonModelExtension,
    isLikelyCheckpoint,
    isLikelyLora,
    getThumbnailStyle
} from './constants.js';

/**
 * Get file size from backend
 * @param {string} filePath - Path to the file
 * @returns {Promise<number|null>} File size in bytes or null if failed
    <h2>Generated: ${currentDateTime}</h2>
    <div class="info">
        Filters Applied: ${filterDescription}${searchDescription}${lastUsedDescription}${sortDescription}<br>
        Total Models: ${allModels.length} (${checkpointModels.length} Checkpoints, ${loraModels.length} LoRAs)<br>
        <span style="color: #28a745; font-weight: bold;">📷 Auto Images</span> - Cached images shown immediately, others load automatically<br>
        <small style="color: #999; font-style: italic;">Click column headers to sort • Images load automatically from Civitai • Report format based on original design by tecknight</small>
    </div>`;

/**
 * Get file size from backend
 * @param {string} filePath - Path to the file
 * @returns {Promise<number|null>} File size in bytes or null if failed
 */
async function getFileSize(filePath) {
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

/**
 * Generate HTML table rows for models
 * @param {Array} models - Array of model objects with filePath, hash, and info
 * @param {Object} options - Generation options
 * @param {Array} [options.groupInfo] - Array of grouping information for each model
 * @param {Array} [options.visibleColumns] - Array of visible column configurations
 * @returns {Promise<string>} - HTML table rows
 */
export async function generateTableRows(models, options = {}) {
    // First, create a cache for file sizes to avoid duplicate API calls
    const fileSizeCache = new Map();
    const { groupInfo = [], visibleColumns = null } = options;
    
    const rows = await Promise.all(models.map(async ({ filePath, hash, info }, index) => {
        const modelName = (info && info.model && info.model.name) || (info && info.name) || filePath.split('/').pop() || 'Unknown';
        const baseModel = (info && info.baseModel) || (info && info.base_model) || 'Unknown';
        const modelType = (info && info.model && info.model.type) || 'Unknown';
        const triggerWords = (info && info.trainedWords && Array.isArray(info.trainedWords)) ? info.trainedWords : [];
        const modelId = (info && info.modelId) || 'Unknown';
        const civitaiUrl = getModelUrl(modelId);
        const updateAvailable = hasUpdateAvailable(info);
        const lastUsed = (info && (info.lastUsed || info.last_accessed)) || 'Never';
        
        // Improved file size handling with caching and better fallback logic
        let fileSizeRaw = null;
        
        // Try to get file size from model info first (check multiple possible fields)
        if (info) {
            fileSizeRaw = info.file_size || info.fileSize || info.size;
            
            // Ensure we have a valid number
            if (fileSizeRaw != null) {
                fileSizeRaw = parseInt(fileSizeRaw);
                if (isNaN(fileSizeRaw) || fileSizeRaw <= 0) {
                    fileSizeRaw = null;
                }
            }
        }
        
        // If no valid size from info, try filesystem (with caching)
        if (!fileSizeRaw && filePath) {
            if (fileSizeCache.has(filePath)) {
                fileSizeRaw = fileSizeCache.get(filePath);
            } else {
                try {
                    fileSizeRaw = await getFileSize(filePath);
                    fileSizeCache.set(filePath, fileSizeRaw);
                    
                    // Small delay to prevent overwhelming the filesystem
                    await new Promise(resolve => setTimeout(resolve, 10));
                } catch (error) {
                    console.debug(`Failed to get file size for ${filePath}:`, error);
                    fileSizeCache.set(filePath, null);
                }
            }
        }
        
        const fileSize = formatFileSize(fileSizeRaw);
        const modelHash = hash || 'Unknown';
        
        // Format last used date
        let formattedLastUsed = lastUsed;
        if (lastUsed !== 'Never') {
            try {
                const date = new Date(lastUsed);
                formattedLastUsed = date.toLocaleString();
            } catch (e) {
                formattedLastUsed = lastUsed;
            }
        }

        const nameStyle = getBaseModelStyle(baseModel);
        
        // Determine grouping CSS classes first
        const groupData = groupInfo[index] || {};
        
        // Determine whether to show "Update available" message
        // If this model is part of a group that already has the latest version, don't show the message
        const shouldShowUpdateMessage = updateAvailable && !(groupData.isGroupMember && groupData.groupHasLatestVersion);
        
        // Apply update styling only if we're showing the update message
        const civitaiStyle = shouldShowUpdateMessage ? getUpdateStyle(info) : '';
        
        // Format trigger words with copy functionality
        const triggerCellContent = formatTriggerWords(triggerWords);

        // Generate sortable attributes for special columns
        const fileSizeBytes = fileSizeRaw || 0;
        const lastUsedTimestamp = (lastUsed !== 'Never' && lastUsed !== 'Unknown') ? 
            new Date(lastUsed).getTime() : 0;

        // Get example image - use cached data or generate direct Civitai URL
        let exampleImageContent = '<i>No image</i>';
        
        // First check if we have cached images in the model info
        if (info && info.images && Array.isArray(info.images) && info.images.length > 0) {
            const firstImage = info.images[0];
            if (firstImage && firstImage.url) {
                exampleImageContent = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;">
                                           <img src="${escapeHtml(firstImage.url)}" 
                                                style="${getThumbnailStyle()}" 
                                                alt="Example image" 
                                                loading="lazy" 
                                                title="Click to expand/collapse"
                                                onclick="toggleImageExpand(this)"
                                                onerror="this.style.display='none'">
                                       </div>`;
            }
        } else if (hash) {
            // Check if we should attempt to load from Civitai based on previous attempts
            let shouldAttemptCivitai = true;
            
            if (info) {
                // Check civitai status - could be string or boolean, any case
                const civitaiStatus = info.civitai;
                if (civitaiStatus !== undefined && civitaiStatus !== null) {
                    if (typeof civitaiStatus === 'string') {
                        shouldAttemptCivitai = civitaiStatus.toLowerCase() === 'true';
                    } else if (typeof civitaiStatus === 'boolean') {
                        shouldAttemptCivitai = civitaiStatus;
                    }
                }
                
                // Also check failed count - if there have been multiple failures, don't try
                const failedCount = info.civitai_failed_count || info.civitaiFailedCount || 0;
                if (failedCount > 0) {
                    shouldAttemptCivitai = false;
                }
            }
            
            // Determine the reason for not attempting Civitai for better messaging
            let noImageReason = "No image available";
            if (info) {
                const failedCount = info.civitai_failed_count || info.civitaiFailedCount || 0;
                const civitaiStatus = info.civitai;
                
                if (failedCount > 0) {
                    noImageReason = "Not available on Civitai";
                } else if (civitaiStatus === false || (typeof civitaiStatus === 'string' && civitaiStatus.toLowerCase() === 'false')) {
                    noImageReason = "Not available on Civitai";
                }
            }
            
            if (shouldAttemptCivitai) {
                // Auto-load Civitai images with proper sizing
                const civitaiImageUrl = `https://civitai.com/api/v1/model-versions/by-hash/${encodeURIComponent(hash)}`;
                exampleImageContent = `<div style="width:100%;height:${DEFAULT_THUMBNAIL_HEIGHT}px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;border-radius:4px;font-size:11px;color:#999;transition:all 0.3s ease;" 
                                            data-civitai-hash="${escapeHtml(hash)}" 
                                            data-civitai-url="${escapeHtml(civitaiImageUrl)}"
                                            class="auto-load-image">
                                            <span style="text-align:center;">Loading...</span>
                                        </div>`;
            } else {
                // Don't attempt Civitai load, create compact container immediately
                exampleImageContent = `<div style="width:auto;height:auto;min-width:60px;min-height:20px;padding:8px;display:flex;align-items:center;justify-content:center;border-radius:4px;font-size:11px;color:#999;background:#f9f9f9;">
                                           <span style="text-align:center;">${noImageReason}</span>
                                       </div>`;
            }
        }

        // Determine grouping CSS classes
        const groupClasses = [];
        
        if (groupData.isGroupFirst) {
            groupClasses.push('model-group-first');
        }
        if (groupData.isGroupMember) {
            groupClasses.push('model-group');
        }
        if (groupData.isGroupLast) {
            groupClasses.push('model-group-last');
        }
        
        const groupClassAttribute = groupClasses.length > 0 ? ` class="${groupClasses.join(' ')}"` : '';

        // Determine if image cell should be compact
        let imageCellClass = "image-cell";
        let shouldAttemptCivitai = true;
        
        if (info && hash) {
            // Check civitai status - could be string or boolean, any case
            const civitaiStatus = info.civitai;
            if (civitaiStatus !== undefined && civitaiStatus !== null) {
                if (typeof civitaiStatus === 'string') {
                    shouldAttemptCivitai = civitaiStatus.toLowerCase() === 'true';
                } else if (typeof civitaiStatus === 'boolean') {
                    shouldAttemptCivitai = civitaiStatus;
                }
            }
            
            // Also check failed count - if there have been multiple failures, don't try
            const failedCount = info.civitai_failed_count || info.civitaiFailedCount || 0;
            if (failedCount > 0) {
                shouldAttemptCivitai = false;
            }
        }
        
        // If no cached image and not attempting Civitai, make cell compact
        const hasExistingImage = info && info.images && Array.isArray(info.images) && info.images.length > 0;
        if (!hasExistingImage && !shouldAttemptCivitai) {
            imageCellClass += " compact";
        }

        // Generate table cells based on visible columns
        const tableCells = [];
        
        // If no column configuration is provided, use default order (all columns visible)
        const columnsToRender = visibleColumns || [
            { key: 'name' }, { key: 'basemodel' }, { key: 'type' }, { key: 'triggers' }, 
            { key: 'image' }, { key: 'civitai' }, { key: 'versionid' }, { key: 'hash' }, 
            { key: 'size' }, { key: 'lastused' }, { key: 'path' }
        ];
        
        columnsToRender.forEach(column => {
            switch (column.key) {
                case 'name':
                    tableCells.push(`<td style="text-align:center;${nameStyle}">${escapeHtml(modelName)}</td>`);
                    break;
                case 'basemodel':
                    tableCells.push(`<td style="text-align:center;">${escapeHtml(baseModel)}</td>`);
                    break;
                case 'type':
                    tableCells.push(`<td style="text-align:center;">${escapeHtml(modelType)}</td>`);
                    break;
                case 'triggers':
                    tableCells.push(`<td style="text-align:center;">${triggerCellContent}</td>`);
                    break;
                case 'image':
                    tableCells.push(`<td class="${imageCellClass}">${exampleImageContent}</td>`);
                    break;
                case 'civitai':
                    tableCells.push(`<td style="text-align:center;${civitaiStyle}">
                        <a href="${civitaiUrl}" target="_blank">${modelId}</a>
                        ${shouldShowUpdateMessage ? '<br><br><i>Update available</i>' : ''}
                    </td>`);
                    break;
                case 'versionid':
                    const versionId = (info && info.id) || 'Unknown';
                    
                    if (versionId !== 'Unknown' && versionId !== '' && versionId != null && modelId !== 'Unknown' && modelId !== '' && modelId != null) {
                        const versionUrl = getModelUrl(modelId, versionId);
                        tableCells.push(`<td style="text-align:center;${civitaiStyle}"><a href="${versionUrl}" target="_blank">${escapeHtml(String(versionId))}</a></td>`);
                    } else {
                        tableCells.push(`<td style="text-align:center;${civitaiStyle}">${escapeHtml(String(versionId))}</td>`);
                    }
                    break;
                case 'hash':
                    tableCells.push(`<td style="text-align:center;">${escapeHtml(modelHash.substring(0, 12))}...</td>`);
                    break;
                case 'size':
                    tableCells.push(`<td style="text-align:center;" sorttable_customkey="${fileSizeBytes}">${escapeHtml(fileSize)}</td>`);
                    break;
                case 'lastused':
                    tableCells.push(`<td style="text-align:center;" sorttable_customkey="${lastUsedTimestamp}">${formattedLastUsed}</td>`);
                    break;
                case 'path':
                    tableCells.push(`<td style="text-align:left;">${escapeHtml(filePath)}</td>`);
                    break;
            }
        });

        return `
            <tr${groupClassAttribute}>
                ${tableCells.join('\n                ')}
            </tr>
        `;
    }));
    
    return rows.join('');
}

/**
 * Generate HTML table rows for models with progress tracking and optimizations
 * @param {Array} models - Array of model objects with filePath, hash, and info
 * @param {Object} options - Generation options
 * @param {Function} [options.progressCallback] - Progress callback function
 * @param {Array} [options.groupInfo] - Array of grouping information for each model
 * @param {Array} [options.visibleColumns] - Array of visible column configurations
 * @returns {Promise<string>} - HTML table rows
 */
export async function generateTableRowsWithProgress(models, options = {}) {
    const { progressCallback, groupInfo = [], visibleColumns = null } = options;
    
    // First, create a cache for file sizes to avoid duplicate API calls
    const fileSizeCache = new Map();
    const batchSize = DEFAULT_BATCH_SIZE; // Process models in batches to prevent blocking
    const rows = [];
    
    for (let i = 0; i < models.length; i += batchSize) {
        const batch = models.slice(i, i + batchSize);
        const batchProgress = ((i / models.length) * 100);
        
        if (progressCallback) {
            progressCallback(batchProgress, `Processing models ${i + 1}-${Math.min(i + batchSize, models.length)} of ${models.length}...`);
        }
        
        // Process batch in parallel for better performance
        const batchRows = await Promise.all(batch.map(async ({ filePath, hash, info }, batchIndex) => {
            const actualIndex = i + batchIndex; // Calculate the actual index in the full array
            const modelName = (info && info.model && info.model.name) || (info && info.name) || filePath.split('/').pop() || 'Unknown';
            const baseModel = (info && info.baseModel) || (info && info.base_model) || 'Unknown';
            const modelType = (info && info.model && info.model.type) || 'Unknown';
            const triggerWords = (info && info.trainedWords && Array.isArray(info.trainedWords)) ? info.trainedWords : [];
            const modelId = (info && info.modelId) || 'Unknown';
            const civitaiUrl = getModelUrl(modelId);
            const updateAvailable = hasUpdateAvailable(info);
            const lastUsed = (info && (info.lastUsed || info.last_accessed)) || 'Never';
            
            // Improved file size handling with caching and better fallback logic
            let fileSizeRaw = null;
            
            // Try to get file size from model info first (check multiple possible fields)
            if (info) {
                fileSizeRaw = info.file_size || info.fileSize || info.size;
                
                // Ensure we have a valid number
                if (fileSizeRaw != null) {
                    fileSizeRaw = parseInt(fileSizeRaw);
                    if (isNaN(fileSizeRaw) || fileSizeRaw <= 0) {
                        fileSizeRaw = null;
                    }
                }
            }
            
            // If no valid size from info, try filesystem (with caching) - but batch these requests
            if (!fileSizeRaw && filePath && !fileSizeCache.has(filePath)) {
                try {
                    fileSizeRaw = await getFileSize(filePath);
                    fileSizeCache.set(filePath, fileSizeRaw);
                } catch (error) {
                    console.debug(`Failed to get file size for ${filePath}:`, error);
                    fileSizeCache.set(filePath, null);
                }
            } else if (fileSizeCache.has(filePath)) {
                fileSizeRaw = fileSizeCache.get(filePath);
            }
            
            const fileSize = formatFileSize(fileSizeRaw);
            const modelHash = hash || 'Unknown';
            
            // Format last used date
            let formattedLastUsed = lastUsed;
            if (lastUsed !== 'Never') {
                try {
                    const date = new Date(lastUsed);
                    formattedLastUsed = date.toLocaleString();
                } catch (e) {
                    formattedLastUsed = lastUsed;
                }
            }

            const nameStyle = getBaseModelStyle(baseModel);
            
            // Determine grouping CSS classes first
            const groupData = groupInfo[actualIndex] || {};
            
            // Determine whether to show "Update available" message
            // If this model is part of a group that already has the latest version, don't show the message
            const shouldShowUpdateMessage = updateAvailable && !(groupData.isGroupMember && groupData.groupHasLatestVersion);
            
            // Apply update styling only if we're showing the update message
            const civitaiStyle = shouldShowUpdateMessage ? getUpdateStyle(info) : '';
            
            // Format trigger words with copy functionality
            const triggerCellContent = formatTriggerWords(triggerWords);

            // Generate sortable attributes for special columns
            const fileSizeBytes = fileSizeRaw || 0;
            const lastUsedTimestamp = (lastUsed !== 'Never' && lastUsed !== 'Unknown') ? 
                new Date(lastUsed).getTime() : 0;

            // Get example image - use cached data or generate direct Civitai URL
            let exampleImageContent = '<i>No image</i>';
            
            // First check if we have cached images in the model info
            if (info && info.images && Array.isArray(info.images) && info.images.length > 0) {
                const firstImage = info.images[0];
                if (firstImage && firstImage.url) {
                    exampleImageContent = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;">
                                               <img src="${escapeHtml(firstImage.url)}" 
                                                    style="width:150px;height:100px;object-fit:cover;border-radius:4px;cursor:pointer;transition:all 0.3s ease;" 
                                                    alt="Example image" 
                                                    loading="lazy" 
                                                    title="Click to expand/collapse"
                                                    onclick="toggleImageExpand(this)"
                                                    onerror="this.style.display='none'">
                                           </div>`;
                }
            } else if (hash) {
                // Check if we should attempt to load from Civitai based on previous attempts
                let shouldAttemptCivitai = true;
                
                if (info) {
                    // Check civitai status - could be string or boolean, any case
                    const civitaiStatus = info.civitai;
                    if (civitaiStatus !== undefined && civitaiStatus !== null) {
                        if (typeof civitaiStatus === 'string') {
                            shouldAttemptCivitai = civitaiStatus.toLowerCase() === 'true';
                        } else if (typeof civitaiStatus === 'boolean') {
                            shouldAttemptCivitai = civitaiStatus;
                        }
                    }
                    
                    // Also check failed count - if there have been multiple failures, don't try
                    const failedCount = info.civitai_failed_count || info.civitaiFailedCount || 0;
                    if (failedCount > 0) {
                        shouldAttemptCivitai = false;
                    }
                }
                
                // Determine the reason for not attempting Civitai for better messaging
                let noImageReason = "No image available";
                if (info) {
                    const failedCount = info.civitai_failed_count || info.civitaiFailedCount || 0;
                    const civitaiStatus = info.civitai;
                    
                    if (failedCount > 0) {
                        noImageReason = "Not available on Civitai";
                    } else if (civitaiStatus === false || (typeof civitaiStatus === 'string' && civitaiStatus.toLowerCase() === 'false')) {
                        noImageReason = "Not available on Civitai";
                    }
                }
                
                if (shouldAttemptCivitai) {
                    // Auto-load Civitai images with proper sizing
                    const civitaiImageUrl = `https://civitai.com/api/v1/model-versions/by-hash/${encodeURIComponent(hash)}`;
                    exampleImageContent = `<div style="width:100%;height:100px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;border-radius:4px;font-size:11px;color:#999;transition:all 0.3s ease;" 
                                                data-civitai-hash="${escapeHtml(hash)}" 
                                                data-civitai-url="${escapeHtml(civitaiImageUrl)}"
                                                class="auto-load-image">
                                                <span style="text-align:center;">Loading...</span>
                                            </div>`;
                } else {
                    // Don't attempt Civitai load, create compact container immediately
                    exampleImageContent = `<div style="width:auto;height:auto;min-width:60px;min-height:20px;padding:8px;display:flex;align-items:center;justify-content:center;border-radius:4px;font-size:11px;color:#999;background:#f9f9f9;">
                                               <span style="text-align:center;">${noImageReason}</span>
                                           </div>`;
                }
            }

            // Determine grouping CSS classes
            const groupClasses = [];
            
            if (groupData.isGroupFirst) {
                groupClasses.push('model-group-first');
            }
            if (groupData.isGroupMember) {
                groupClasses.push('model-group');
            }
            if (groupData.isGroupLast) {
                groupClasses.push('model-group-last');
            }
            
            const groupClassAttribute = groupClasses.length > 0 ? ` class="${groupClasses.join(' ')}"` : '';

            // Determine if image cell should be compact
            let imageCellClass = "image-cell";
            let shouldAttemptCivitai = true;
            
            if (info && hash) {
                // Check civitai status - could be string or boolean, any case
                const civitaiStatus = info.civitai;
                if (civitaiStatus !== undefined && civitaiStatus !== null) {
                    if (typeof civitaiStatus === 'string') {
                        shouldAttemptCivitai = civitaiStatus.toLowerCase() === 'true';
                    } else if (typeof civitaiStatus === 'boolean') {
                        shouldAttemptCivitai = civitaiStatus;
                    }
                }
                
                // Also check failed count - if there have been multiple failures, don't try
                const failedCount = info.civitai_failed_count || info.civitaiFailedCount || 0;
                if (failedCount > 0) {
                    shouldAttemptCivitai = false;
                }
            }
            
            // If no cached image and not attempting Civitai, make cell compact
            const hasExistingImage = info && info.images && Array.isArray(info.images) && info.images.length > 0;
            if (!hasExistingImage && !shouldAttemptCivitai) {
                imageCellClass += " compact";
            }

            // Generate table cells based on visible columns
            const tableCells = [];
            
            // If no column configuration is provided, use default order (all columns visible)
            const columnsToRender = visibleColumns || [
                { key: 'name' }, { key: 'basemodel' }, { key: 'type' }, { key: 'triggers' }, 
                { key: 'image' }, { key: 'civitai' }, { key: 'versionid' }, { key: 'hash' }, 
                { key: 'size' }, { key: 'lastused' }, { key: 'path' }
            ];
            
            columnsToRender.forEach(column => {
                switch (column.key) {
                    case 'name':
                        tableCells.push(`<td style="text-align:center;${nameStyle}">${escapeHtml(modelName)}</td>`);
                        break;
                    case 'basemodel':
                        tableCells.push(`<td style="text-align:center;">${escapeHtml(baseModel)}</td>`);
                        break;
                    case 'type':
                        tableCells.push(`<td style="text-align:center;">${escapeHtml(modelType)}</td>`);
                        break;
                    case 'triggers':
                        tableCells.push(`<td style="text-align:center;">${triggerCellContent}</td>`);
                        break;
                    case 'image':
                        tableCells.push(`<td class="${imageCellClass}">${exampleImageContent}</td>`);
                        break;
                    case 'civitai':
                        tableCells.push(`<td style="text-align:center;${civitaiStyle}">
                            <a href="${civitaiUrl}" target="_blank">${modelId}</a>
                            ${shouldShowUpdateMessage ? '<br><br><i>Update available</i>' : ''}
                        </td>`);
                        break;
                    case 'versionid':
                        const versionId = (info && info.id) || 'Unknown';
                        
                        if (versionId !== 'Unknown' && versionId !== '' && versionId != null && modelId !== 'Unknown' && modelId !== '' && modelId != null) {
                            const versionUrl = getModelUrl(modelId, versionId);
                            tableCells.push(`<td style="text-align:center;${civitaiStyle}"><a href="${versionUrl}" target="_blank">${escapeHtml(String(versionId))}</a></td>`);
                        } else {
                            tableCells.push(`<td style="text-align:center;${civitaiStyle}">${escapeHtml(String(versionId))}</td>`);
                        }
                        break;
                    case 'hash':
                        tableCells.push(`<td style="text-align:center;">${escapeHtml(modelHash.substring(0, 12))}...</td>`);
                        break;
                    case 'size':
                        tableCells.push(`<td style="text-align:center;" sorttable_customkey="${fileSizeBytes}">${escapeHtml(fileSize)}</td>`);
                        break;
                    case 'lastused':
                        tableCells.push(`<td style="text-align:center;" sorttable_customkey="${lastUsedTimestamp}">${formattedLastUsed}</td>`);
                        break;
                    case 'path':
                        tableCells.push(`<td style="text-align:left;">${escapeHtml(filePath)}</td>`);
                        break;
                }
            });

            return `
                <tr${groupClassAttribute}>
                    ${tableCells.join('\n                    ')}
                </tr>
            `;
        }));
        
        rows.push(...batchRows);
        
        // Small delay to prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 1));
    }
    
    return rows.join('');
}

/**
 * Sort models array based on the specified criteria
 * @param {Array} models - Array of model objects
 * @param {string} sortBy - Sort criteria
 * @returns {Array} - Sorted array of models
 */
function sortModels(models, sortBy) {
    return models.sort((a, b) => {
        const infoA = a.info || {};
        const infoB = b.info || {};
        
        switch (sortBy) {
            case 'name': {
                const nameA = (infoA.model && infoA.model.name) || infoA.name || a.filePath.split('/').pop() || '';
                const nameB = (infoB.model && infoB.model.name) || infoB.name || b.filePath.split('/').pop() || '';
                return nameA.localeCompare(nameB);
            }
            case 'name-desc': {
                const nameA = (infoA.model && infoA.model.name) || infoA.name || a.filePath.split('/').pop() || '';
                const nameB = (infoB.model && infoB.model.name) || infoB.name || b.filePath.split('/').pop() || '';
                return nameB.localeCompare(nameA);
            }
            case 'lastused': {
                const lastUsedA = (infoA.lastUsed || infoA.last_accessed) ? new Date(infoA.lastUsed || infoA.last_accessed) : new Date(0);
                const lastUsedB = (infoB.lastUsed || infoB.last_accessed) ? new Date(infoB.lastUsed || infoB.last_accessed) : new Date(0);
                return lastUsedB - lastUsedA; // Recent first
            }
            case 'lastused-desc': {
                const lastUsedA = (infoA.lastUsed || infoA.last_accessed) ? new Date(infoA.lastUsed || infoA.last_accessed) : new Date(0);
                const lastUsedB = (infoB.lastUsed || infoB.last_accessed) ? new Date(infoB.lastUsed || infoB.last_accessed) : new Date(0);
                return lastUsedA - lastUsedB; // Oldest first
            }
            case 'size': {
                const sizeA = infoA.file_size || 0;
                const sizeB = infoB.file_size || 0;
                return sizeA - sizeB; // Small to large
            }
            case 'size-desc': {
                const sizeA = infoA.file_size || 0;
                const sizeB = infoB.file_size || 0;
                return sizeB - sizeA; // Large to small
            }
            case 'type': {
                const typeA = (infoA.model && infoA.model.type) || infoA.model_type || 'ZZZ';
                const typeB = (infoB.model && infoB.model.type) || infoB.model_type || 'ZZZ';
                if (typeA !== typeB) {
                    return typeA.localeCompare(typeB);
                }
                // Secondary sort by name
                const nameA = (infoA.model && infoA.model.name) || infoA.name || a.filePath.split('/').pop() || '';
                const nameB = (infoB.model && infoB.model.name) || infoB.name || b.filePath.split('/').pop() || '';
                return nameA.localeCompare(nameB);
            }
            default: {
                // Default to name sorting
                const nameA = (infoA.model && infoA.model.name) || infoA.name || a.filePath.split('/').pop() || '';
                const nameB = (infoB.model && infoB.model.name) || infoB.name || b.filePath.split('/').pop() || '';
                return nameA.localeCompare(nameB);
            }
        }
    });
}

/**
 * Group models by Civitai ID, keeping different versions of the same model together
 * @param {Array} models - Array of model objects
 * @param {string} sortBy - Sort criteria to apply within groups
 * @returns {Array} - Array of models grouped and sorted
 */
function groupModelsByCivitaiId(models, sortBy) {
    // First, group models by Civitai ID
    const groupedModels = new Map();
    const ungroupedModels = [];
    
    models.forEach(model => {
        const modelId = model.info && (model.info.modelId || model.info.model_id);
        
        if (modelId && modelId !== 'Unknown' && modelId !== null) {
            if (!groupedModels.has(modelId)) {
                groupedModels.set(modelId, []);
            }
            groupedModels.get(modelId).push(model);
        } else {
            ungroupedModels.push(model);
        }
    });
    
    // Sort models within each group
    for (const [modelId, group] of groupedModels) {
        groupedModels.set(modelId, sortModels(group, sortBy));
    }
    
    // Sort ungrouped models
    const sortedUngrouped = sortModels(ungroupedModels, sortBy);
    
    // Combine grouped and ungrouped models
    // First, get all groups and sort them by the first model in each group
    const sortedGroups = Array.from(groupedModels.entries()).sort((a, b) => {
        const firstModelA = a[1][0];
        const firstModelB = b[1][0];
        
        // Use the same sorting logic as the main sort
        const tempModels = [firstModelA, firstModelB];
        const sorted = sortModels(tempModels, sortBy);
        return sorted[0] === firstModelA ? -1 : 1;
    });
    
    // Flatten the result: grouped models first, then ungrouped models
    const result = [];
    
    sortedGroups.forEach(([modelId, group]) => {
        result.push(...group);
    });
    
    result.push(...sortedUngrouped);
    
    return result;
}

/**
 * Generate grouping information for models based on Civitai ID
 * @param {Array} models - Array of models (already grouped and sorted)
 * @returns {Array} - Array of group info objects for each model
 */
function generateGroupInfo(models) {
    const groupInfo = [];
    let currentModelId = null;
    let groupStartIndex = -1;
    let groupSize = 0;

    models.forEach((model, index) => {
        const modelId = model.info && (model.info.modelId || model.info.model_id);
        const effectiveModelId = (modelId && modelId !== 'Unknown' && modelId !== null) ? modelId : null;
        
        if (effectiveModelId && effectiveModelId === currentModelId) {
            // Continue current group
            groupSize++;
            groupInfo[index] = {
                isGroupMember: true,
                isGroupFirst: false,
                isGroupLast: false,
                groupSize: groupSize,
                modelId: effectiveModelId
            };
        } else {
            // End previous group if it had more than one model
            if (groupSize > 1 && groupStartIndex !== -1) {
                groupInfo[groupStartIndex].isGroupFirst = true;
                groupInfo[index - 1].isGroupLast = true;
                
                // Check if any model in the group doesn't have an update available
                // If so, we likely already have the latest version
                let groupHasLatestVersion = false;
                for (let i = groupStartIndex; i < index; i++) {
                    const modelInGroup = models[i];
                    if (modelInGroup && modelInGroup.info && !hasUpdateAvailable(modelInGroup.info)) {
                        groupHasLatestVersion = true;
                        break;
                    }
                }
                
                // Mark all models in the group
                for (let i = groupStartIndex; i < index; i++) {
                    groupInfo[i].isGroupMember = true;
                    groupInfo[i].groupHasLatestVersion = groupHasLatestVersion;
                }
            }
            
            // Start new group or single model
            currentModelId = effectiveModelId;
            groupStartIndex = effectiveModelId ? index : -1;
            groupSize = effectiveModelId ? 1 : 0;
            
            groupInfo[index] = {
                isGroupMember: effectiveModelId ? true : false,
                isGroupFirst: false,
                isGroupLast: false,
                groupSize: groupSize,
                modelId: effectiveModelId
            };
        }
    });
    
    // Handle the last group if needed
    if (groupSize > 1 && groupStartIndex !== -1) {
        groupInfo[groupStartIndex].isGroupFirst = true;
        groupInfo[models.length - 1].isGroupLast = true;
        
        // Check if any model in the final group doesn't have an update available
        let groupHasLatestVersion = false;
        for (let i = groupStartIndex; i < models.length; i++) {
            const modelInGroup = models[i];
            if (modelInGroup && modelInGroup.info && !hasUpdateAvailable(modelInGroup.info)) {
                groupHasLatestVersion = true;
                break;
            }
        }
        
        // Mark all models in the final group
        for (let i = groupStartIndex; i < models.length; i++) {
            groupInfo[i].isGroupMember = true;
            groupInfo[i].groupHasLatestVersion = groupHasLatestVersion;
        }
    }
    
    return groupInfo;
}

/**
 * Generate complete HTML report with progress tracking and optimizations
 * @param {Object} options - Report generation options
 * @param {Array} options.models - Array of model objects with filePath, hash, and info
 * @param {Function} [options.progressCallback] - Progress callback function
 * @param {Array} [options.sortedFiles] - Sorted array of file paths (legacy)
 * @param {Array} [options.checkpoints] - Array of checkpoint models (legacy)
 * @param {Array} [options.loras] - Array of LoRA models (legacy)
 * @param {string} [options.filterDescription] - Description of applied filters
 * @param {string} [options.searchDescription] - Description of search filter
 * @param {string} [options.lastUsedDescription] - Description of last used filter
 * @param {string} [options.sortDescription] - Description of sort criteria
 * @param {string} [options.sortBy] - Current sort selection from model tab
 * @param {string} [options.modelTypeFilter] - Current model type filter from model tab
 * @returns {Promise<string>} - Complete HTML document
 */
export async function generateHtmlContentWithProgress(options) {
    const {
        models,
        progressCallback,
        sortedFiles,
        checkpoints,
        loras,
        filterDescription = '',
        searchDescription = '',
        lastUsedDescription = '',
        sortDescription = '',
        sortBy = 'name',
        modelTypeFilter = 'all'
    } = options;

    // Column visibility configuration (hardcoded for now)
    // This controls which columns appear in the generated reports
    // To hide additional columns, set visible: false
    // To show the Hash column, set visible: true for the Hash entry
    const COLUMN_CONFIG = [
        { name: 'Model Name', width: '200px', visible: true, sortable: true, key: 'name' },
        { name: 'Base Model', width: '100px', visible: true, sortable: true, key: 'basemodel' },
        { name: 'Type', width: '80px', visible: true, sortable: true, key: 'type' },
        { name: 'Trigger Words', width: '175px', visible: true, sortable: false, key: 'triggers' },
        { name: 'Example Image', width: '200px', visible: true, sortable: false, key: 'image' },
        { name: 'Civitai ID', width: '100px', visible: true, sortable: true, key: 'civitai' },
        { name: 'Version ID', width: '100px', visible: true, sortable: true, key: 'versionid' },
        { name: 'Hash', width: '100px', visible: false, sortable: true, key: 'hash' }, // Hidden by default
        { name: 'File Size', width: '80px', visible: true, sortable: true, key: 'size' },
        { name: 'Last Used', width: '120px', visible: true, sortable: true, key: 'lastused' },
        { name: 'Full Path', width: '250px', visible: false, sortable: true, key: 'path' } // Hidden by default
    ];

    // Get visible columns and their original indices for mapping
    const visibleColumns = COLUMN_CONFIG.map((col, index) => ({ ...col, originalIndex: index }))
                                        .filter(col => col.visible);
    
    // Create mapping from original column indices to visible column indices
    const originalToVisibleIndex = {};
    visibleColumns.forEach((col, visibleIndex) => {
        originalToVisibleIndex[col.originalIndex] = visibleIndex;
    });

    // Process models array if provided (new format)
    let allModels, checkpointModels, loraModels;
    
    if (progressCallback) {
        progressCallback(5, 'Preparing model data...');
    }
    
    if (models && Array.isArray(models)) {
        // New format: process models array with deduplication
        const deduplicatedModels = deduplicateModels(models);
        console.debug(`Deduplicated ${models.length} models to ${deduplicatedModels.length} unique entries`);
        
        if (progressCallback) {
            progressCallback(10, 'Categorizing models...');
        }
        
        allModels = deduplicatedModels;
        checkpointModels = deduplicatedModels.filter(model => {
            const info = model.info || {};
            const filePath = model.filePath || '';
            return isLikelyCheckpoint(filePath, info);
        });
        loraModels = deduplicatedModels.filter(model => {
            const info = model.info || {};
            const filePath = model.filePath || '';
            return isLikelyLora(filePath, info);
        });
    } else {
        // Legacy format: use provided arrays (also deduplicate if they're model objects)
        if (sortedFiles && sortedFiles.length > 0 && sortedFiles[0].filePath) {
            allModels = deduplicateModels(sortedFiles);
        } else {
            allModels = sortedFiles || [];
        }
        
        if (checkpoints && checkpoints.length > 0 && checkpoints[0].filePath) {
            checkpointModels = deduplicateModels(checkpoints);
        } else {
            checkpointModels = checkpoints || [];
        }
        
        if (loras && loras.length > 0 && loras[0].filePath) {
            loraModels = deduplicateModels(loras);
        } else {
            loraModels = loras || [];
        }
    }

    // Apply model type filtering based on the selected filter from the models tab
    if (modelTypeFilter !== 'all') {
        if (progressCallback) {
            progressCallback(11, `Filtering models by type: ${modelTypeFilter}...`);
        }
        
        if (modelTypeFilter === 'Checkpoint') {
            // Only keep checkpoint models
            allModels = checkpointModels;
            loraModels = []; // Clear LoRA models since we're only showing checkpoints
        } else if (modelTypeFilter === 'LORA') {
            // Only keep LoRA models
            allModels = loraModels;
            checkpointModels = []; // Clear checkpoint models since we're only showing LoRAs
        }
    }

    // Apply sorting and grouping based on the sort criteria from the models tab
    if (progressCallback) {
        progressCallback(12, 'Sorting and grouping models...');
    }
    
    // Group models by Civitai ID and apply sorting within groups
    allModels = groupModelsByCivitaiId(allModels, sortBy);
    checkpointModels = groupModelsByCivitaiId(checkpointModels, sortBy);
    loraModels = groupModelsByCivitaiId(loraModels, sortBy);

    const currentDateTime = new Date().toLocaleString();

    // Helper function to generate table headers based on visible columns
    function generateTableHeaders() {
        return visibleColumns.map(col => {
            const sortClass = col.sortable ? '' : ' class="sorttable_nosort"';
            return `            <th style="width:${col.width};"${sortClass}><b>${col.name}</b></th>`;
        }).join('\n');
    }

    if (progressCallback) {
        progressCallback(15, 'Building HTML structure...');
    }

    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>SageUtils Model Report - ${currentDateTime}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            background-color: #f5f5f5; 
        }
        h1 { 
            text-align: center; 
            color: white; 
            background-color: green; 
            padding: 15px; 
            border-radius: 8px; 
            margin-bottom: 10px;
        }
        h2 { 
            text-align: center; 
            color: darkblue; 
            background-color: yellow; 
            padding: 10px; 
            border-radius: 8px; 
            margin-bottom: 20px;
        }
        .info {
            text-align: center;
            color: #666;
            margin-bottom: 20px;
            font-style: italic;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 30px;
            background-color: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        th { 
            border: 2px solid blue; 
            color: yellow; 
            background-color: blue; 
            font-size: 14px; 
            padding: 10px;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        td { 
            border: 2px solid maroon; 
            font-size: 12px; 
            padding: 8px;
            vertical-align: top;
        }
        td.image-cell {
            width: ${DEFAULT_THUMBNAIL_WIDTH + 6}px;
            height: ${DEFAULT_THUMBNAIL_HEIGHT + 6}px;
            padding: 3px;
            text-align: center;
            vertical-align: middle;
        }
        td.image-cell.compact {
            width: auto;
            height: auto;
            min-height: 30px;
            padding: 3px;
            text-align: center;
            vertical-align: middle;
        }
        .section-header {
            background-color: #333;
            color: white;
            padding: 15px;
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin-top: 30px;
            border-radius: 8px;
        }
        button {
            cursor: pointer;
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
        }
        a {
            color: blue;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        /* Sortable table styles */
        table.sortable th:not(.sorttable_nosort) {
            cursor: pointer;
            user-select: none;
            position: sticky;
        }
        table.sortable th:not(.sorttable_nosort):hover {
            background-color: #5555ff;
        }
        table.sortable th.sorttable_sorted {
            background-color: #00aa00;
        }
        table.sortable th.sorttable_sorted_reverse {
            background-color: #aa0000;
        }
        table.sortable th.sorttable_nosort {
            background-color: #666;
            cursor: default;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        .sort-indicator {
            font-size: 14px;
            margin-left: 5px;
        }
        /* Model grouping styles */
        .model-group-first {
            border-top: 3px solid #4CAF50 !important;
        }
        .model-group {
            background-color: rgba(76, 175, 80, 0.05);
        }
        .model-group-last {
            border-bottom: 3px solid #4CAF50 !important;
        }
        .civitai-group-header {
            background-color: #e8f5e8;
            font-weight: bold;
            color: #2e7d2e;
            border: 2px solid #4CAF50 !important;
        }
    </style>
    <script>
        // Configuration from report generation
        const INITIAL_SORT_BY = '${sortBy}';
        
        // Map sortBy values from Models tab to table column indices (accounting for hidden columns)
        function getSortColumnIndex(sortBy) {
            const sortMap = {
                'name': 0,              // Model Name
                'name-desc': 0,         // Model Name (reverse)
                'type': 2,              // Type  
                'size': 7,              // File Size (shifted due to added Version ID column)
                'size-desc': 7,         // File Size (reverse)
                'lastused': 8,          // Last Used (shifted due to added Version ID column)
                'lastused-desc': 8      // Last Used (reverse)
            };
            
            return sortMap[sortBy] !== undefined ? sortMap[sortBy] : -1;
        }
        
        // Determine if initial sort should be descending
        function isDescendingSort(sortBy) {
            return sortBy.endsWith('-desc');
        }
        
        // Custom sortable table implementation
        let sortDirection = {};
        
        function makeSortable() {
            const tables = document.querySelectorAll('table.sortable');
            tables.forEach(table => {
                const headers = table.querySelectorAll('th');
                headers.forEach((header, index) => {
                    if (!header.classList.contains('sorttable_nosort')) {
                        header.style.cursor = 'pointer';
                        header.addEventListener('click', () => sortTable(table, index));
                        
                        // Add sort indicator
                        const indicator = document.createElement('span');
                        indicator.className = 'sort-indicator';
                        indicator.innerHTML = ' ⇅';
                        indicator.style.opacity = '0.5';
                        header.appendChild(indicator);
                    }
                });
            });
        }
        
        function sortTable(table, columnIndex) {
            const tableId = table.id || 'table_' + Math.random().toString(36).substr(2, 9);
            if (!table.id) table.id = tableId;
            
            const sortKey = tableId + '_' + columnIndex;
            const currentDirection = sortDirection[sortKey] || 'asc';
            const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
            sortDirection[sortKey] = newDirection;
            
            const tbody = table.querySelector('tbody') || table;
            const rows = Array.from(tbody.querySelectorAll('tr')).slice(1); // Skip header row
            
            // Clear all header styles and indicators
            const headers = table.querySelectorAll('th');
            headers.forEach(header => {
                header.classList.remove('sorttable_sorted', 'sorttable_sorted_reverse');
                const indicator = header.querySelector('.sort-indicator');
                if (indicator) {
                    indicator.innerHTML = ' ⇅';
                    indicator.style.opacity = '0.5';
                }
            });
            
            // Update current header style and indicator
            const currentHeader = headers[columnIndex];
            if (currentHeader) {
                currentHeader.classList.add(newDirection === 'asc' ? 'sorttable_sorted' : 'sorttable_sorted_reverse');
                const indicator = currentHeader.querySelector('.sort-indicator');
                if (indicator) {
                    indicator.innerHTML = newDirection === 'asc' ? ' ↑' : ' ↓';
                    indicator.style.opacity = '1';
                }
            }
            
            rows.sort((a, b) => {
                const cellA = a.cells[columnIndex];
                const cellB = b.cells[columnIndex];
                
                if (!cellA || !cellB) return 0;
                
                // Check for custom sort key
                let valueA = cellA.getAttribute('sorttable_customkey');
                let valueB = cellB.getAttribute('sorttable_customkey');
                
                if (valueA && valueB) {
                    // Numeric comparison for custom keys
                    valueA = parseFloat(valueA);
                    valueB = parseFloat(valueB);
                } else {
                    // Text comparison
                    valueA = cellA.textContent.trim();
                    valueB = cellB.textContent.trim();
                    
                    // Try to parse as numbers for better sorting
                    const numA = parseFloat(valueA.replace(/[^\\d.-]/g, ''));
                    const numB = parseFloat(valueB.replace(/[^\\d.-]/g, ''));
                    
                    if (!isNaN(numA) && !isNaN(numB)) {
                        valueA = numA;
                        valueB = numB;
                    }
                }
                
                let comparison = 0;
                if (valueA < valueB) {
                    comparison = -1;
                } else if (valueA > valueB) {
                    comparison = 1;
                }
                
                return newDirection === 'desc' ? -comparison : comparison;
            });
            
            // Re-append sorted rows
            rows.forEach(row => tbody.appendChild(row));
        }
        
        async function copyToClipboard(text) {
            try {
                await navigator.clipboard.writeText(text);
                console.log('Text copied to clipboard');
            } catch (err) {
                console.error('Failed to copy: ', err);
            }
        }
        
        function toggleImageExpand(img) {
            if (!img.isExpanded) {
                // Expand
                img.originalStyle = img.style.cssText;
                img.style.cssText = 'width:auto;height:auto;max-width:90vw;max-height:80vh;object-fit:contain;border-radius:4px;cursor:pointer;transition:all 0.3s ease;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.5);background:white;';
                img.isExpanded = true;
                img.setAttribute('data-expanded', 'true');
                
                // Add backdrop
                const backdrop = document.createElement('div');
                backdrop.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9998;';
                backdrop.addEventListener('click', () => {
                    toggleImageExpand(img);
                });
                document.body.appendChild(backdrop);
                img.backdrop = backdrop;
            } else {
                // Collapse
                img.style.cssText = img.originalStyle || 'width:150px;height:100px;object-fit:cover;border-radius:4px;cursor:pointer;transition:all 0.3s ease;';
                img.isExpanded = false;
                img.removeAttribute('data-expanded');
                
                // Remove backdrop
                if (img.backdrop) {
                    document.body.removeChild(img.backdrop);
                    delete img.backdrop;
                }
            }
        }
        
        function getThumbnailStyle(additionalStyle) {
            if (typeof additionalStyle !== 'string') additionalStyle = '';
            var DEFAULT_THUMBNAIL_WIDTH = 150;
            var DEFAULT_THUMBNAIL_HEIGHT = 100;
            var baseStyle = 'max-width:' + DEFAULT_THUMBNAIL_WIDTH + 'px;max-height:' + DEFAULT_THUMBNAIL_HEIGHT + 'px;width:auto;height:auto;object-fit:cover;border-radius:4px;cursor:pointer;transition:all 0.3s ease;';
            return additionalStyle ? baseStyle + additionalStyle : baseStyle;
        }
        
        function makeContainerCompact(container) {
            // Resize container to be compact for text-only content
            container.style.width = 'auto';
            container.style.height = 'auto';
            container.style.minWidth = '60px';
            container.style.minHeight = '20px';
            container.style.padding = '8px';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            
            // Also resize the parent table cell to be compact
            var parentCell = container.parentElement;
            while (parentCell && parentCell.tagName !== 'TD') {
                parentCell = parentCell.parentElement;
            }
            if (parentCell && parentCell.classList.contains('image-cell')) {
                parentCell.style.height = 'auto';
                parentCell.style.minHeight = '30px';
                parentCell.style.verticalAlign = 'middle';
            }
        }
        
        async function loadCivitaiImage(element) {
            // Check if the current element has the attributes, if not check parent
            let hash = element.getAttribute('data-civitai-hash');
            let apiUrl = element.getAttribute('data-civitai-url');
            let targetElement = element;
            
            if (!hash || !apiUrl) {
                // Try parent element
                targetElement = element.parentElement;
                hash = targetElement.getAttribute('data-civitai-hash');
                apiUrl = targetElement.getAttribute('data-civitai-url');
            }
            
            if (!hash || !apiUrl) return;

            try {
                const response = await fetch(apiUrl);
                if (response.ok) {
                    const data = await response.json();
                    const images = data.images || [];
                    
                    // Find first appropriate image (NSFW level <= 1)
                    const appropriateImage = images.find(img => (img.nsfwLevel || 0) <= 1);
                    
                    if (appropriateImage && appropriateImage.url) {
                        const imgElement = document.createElement('img');
                        imgElement.src = appropriateImage.url;
                        imgElement.style.cssText = getThumbnailStyle();
                        imgElement.alt = 'Model example image';
                        imgElement.loading = 'lazy';
                        imgElement.title = 'Click to expand/collapse';
                        imgElement.onerror = function() { 
                            makeContainerCompact(this.parentElement);
                            this.parentElement.innerHTML = '<span style="color:#999;font-size:11px;">No image</span>';
                        };
                        
                        // Add click handler for expand/collapse
                        imgElement.addEventListener('click', function(e) {
                            e.stopPropagation();
                            toggleImageExpand(this);
                        });
                        
                        targetElement.innerHTML = '';
                        targetElement.appendChild(imgElement);
                    } else {
                        makeContainerCompact(targetElement);
                        targetElement.innerHTML = '<span style="color:#999;font-size:11px;">No image</span>';
                    }
                } else {
                    makeContainerCompact(targetElement);
                    targetElement.innerHTML = '<span style="color:#999;font-size:11px;">Not available</span>';
                }
            } catch (error) {
                console.debug('Failed to load Civitai image:', error);
                makeContainerCompact(targetElement);
                targetElement.innerHTML = '<span style="color:#999;font-size:11px;">Load failed</span>';
            }
        }

        // Auto-load all images when page loads
        function autoLoadImages() {
            const imageContainers = document.querySelectorAll('.auto-load-image');
            const compactContainers = document.querySelectorAll('.image-cell.compact').length;
            
            console.log('Loading ' + imageContainers.length + ' images from Civitai. ' + compactContainers + ' entries skipped due to previous failures.');
            
            imageContainers.forEach((container, index) => {
                // Stagger the loading to avoid overwhelming the API
                setTimeout(() => {
                    loadCivitaiImage(container);
                }, index * 200); // 200ms delay between each image
            });
        }

        // Initialize everything when page loads
        function initializePage() {
            makeSortable();
            autoLoadImages();
            applyInitialSort();
        }
        
        // Apply initial sort based on Models tab selection
        function applyInitialSort() {
            const columnIndex = getSortColumnIndex(INITIAL_SORT_BY);
            
            if (columnIndex >= 0) {
                const isDescending = isDescendingSort(INITIAL_SORT_BY);
                const tables = document.querySelectorAll('table.sortable');
                
                tables.forEach(table => {
                    const headers = table.querySelectorAll('th');
                    if (headers[columnIndex] && !headers[columnIndex].classList.contains('sorttable_nosort')) {
                        // Set up the sort direction before calling sortTable
                        const tableId = table.id || 'table_' + Math.random().toString(36).substr(2, 9);
                        if (!table.id) table.id = tableId;
                        
                        const sortKey = tableId + '_' + columnIndex;
                        // Set opposite direction so sortTable will switch to desired direction
                        sortDirection[sortKey] = isDescending ? 'asc' : 'desc';
                        
                        // Trigger the sort
                        sortTable(table, columnIndex);
                    }
                });
            }
        }

        // Load functionality after page content is ready
        document.addEventListener('DOMContentLoaded', initializePage);
        // Also run immediately in case DOMContentLoaded already fired
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializePage);
        } else {
            initializePage();
        }

        // Add ESC key support to close expanded images
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const expandedImages = document.querySelectorAll('img[data-expanded="true"]');
                expandedImages.forEach(img => {
                    if (img.isExpanded) {
                        toggleImageExpand(img);
                    }
                });
            }
        });
    </script>
</head>
<body>
    <h1>SageUtils Model Report</h1>
    <h2>Generated: ${currentDateTime}</h2>
        <div class="info">
        Filters Applied: ${filterDescription}${searchDescription}${lastUsedDescription}${sortDescription}<br>
        Total Models: ${allModels.length}${modelTypeFilter === 'all' ? ` (${checkpointModels.length} Checkpoints, ${loraModels.length} LoRAs)` : ''}<br>
        <small style="color: #999; font-style: italic;">Click column headers to sort • Images load automatically from Civitai</small>
    </div>
`;

    // Add LoRAs section if any exist and filter allows
    if (loraModels.length > 0 && (modelTypeFilter === 'all' || modelTypeFilter === 'LORA')) {
        if (progressCallback) {
            progressCallback(25, `Processing ${loraModels.length} LoRA models...`);
        }
        
        // Generate grouping information for LoRA models
        const loraGroupInfo = generateGroupInfo(loraModels);
        
        const loraRows = await generateTableRowsWithProgress(loraModels, {
            groupInfo: loraGroupInfo,
            visibleColumns: visibleColumns,
            progressCallback: progressCallback ? (progress, message) => {
                // Map LoRA progress to 25-50% range
                const adjustedProgress = 25 + (progress * 0.25);
                progressCallback(adjustedProgress, `LoRAs: ${message}`);
            } : null
        });
        
        htmlContent += `
    <div class="section-header">LoRA Models (${loraModels.length})</div>
    <table class="sortable">
        <tr>
${generateTableHeaders()}
        </tr>
        ${loraRows}
    </table>
`;
    }

    // Add Checkpoints section if any exist and filter allows
    if (checkpointModels.length > 0 && (modelTypeFilter === 'all' || modelTypeFilter === 'Checkpoint')) {
        if (progressCallback) {
            progressCallback(50, `Processing ${checkpointModels.length} checkpoint models...`);
        }
        
        // Generate grouping information for Checkpoint models
        const checkpointGroupInfo = generateGroupInfo(checkpointModels);
        
        const checkpointRows = await generateTableRowsWithProgress(checkpointModels, {
            groupInfo: checkpointGroupInfo,
            visibleColumns: visibleColumns,
            progressCallback: progressCallback ? (progress, message) => {
                // Map Checkpoint progress to 50-80% range
                const adjustedProgress = 50 + (progress * 0.30);
                progressCallback(adjustedProgress, `Checkpoints: ${message}`);
            } : null
        });
        
        htmlContent += `
    <div class="section-header">Checkpoint Models (${checkpointModels.length})</div>
    <table class="sortable">
        <tr>
${generateTableHeaders()}
        </tr>
        ${checkpointRows}
    </table>
`;
    }

    htmlContent += `
</body>
</html>
`;

    if (progressCallback) {
        progressCallback(85, 'Finalizing HTML report...');
    }

    return htmlContent;
}

/**
 * Deduplicate models array by multiple criteria to prevent showing the same physical file multiple times
 * @param {Array} models - Array of model objects
 * @returns {Array} - Deduplicated array of models
 */
function deduplicateModels(models) {
    const seenModels = [];
    const hashMap = new Map(); // Track by file hash
    const pathMap = new Map(); // Track by normalized path  
    const sizeNameMap = new Map(); // Track by size + filename combination
    
    models.forEach(model => {
        const filePath = model.filePath;
        const hash = model.hash;
        const info = model.info || {};
        
        if (!filePath) return; // Skip models without file path
        
        // Normalize the file path to handle relative paths and resolve ../ 
        const normalizedPath = normalizePath(filePath);
        const fileName = normalizedPath.split('/').pop() || '';
        const fileSize = info.file_size || info.fileSize || info.size || 0;
        
        // Create unique identifiers for different deduplication strategies
        const pathKey = normalizedPath;
        const hashKey = hash && hash !== 'Unknown' ? hash : null;
        const sizeNameKey = fileSize && fileName ? `${fileSize}_${fileName}` : null;
        
        let isDuplicate = false;
        let existingIndex = -1;
        let duplicateType = '';
        
        // Check for duplicates in order of reliability:
        // 1. First check by file hash (most reliable)
        if (hashKey && hashMap.has(hashKey)) {
            isDuplicate = true;
            existingIndex = hashMap.get(hashKey);
            duplicateType = 'hash';
        }
        // 2. Then check by exact file path
        else if (pathMap.has(pathKey)) {
            isDuplicate = true;
            existingIndex = pathMap.get(pathKey);
            duplicateType = 'path';
        }
        // 3. Finally check by size + filename (catches different paths to same file)
        else if (sizeNameKey && sizeNameMap.has(sizeNameKey) && fileSize > 0) {
            // Additional verification: only treat as duplicate if it's a substantial file (>1MB)
            // This helps avoid false positives with small config files that might have same size+name
            if (fileSize > 1024 * 1024) {
                isDuplicate = true;
                existingIndex = sizeNameMap.get(sizeNameKey);
                duplicateType = 'size-name';
            }
        }
        
        if (isDuplicate && existingIndex !== -1 && seenModels[existingIndex]) {
            // Merge with existing entry, preferring non-null/non-undefined values
            const existing = seenModels[existingIndex];
            
            // Merge info objects, preferring values that exist
            const mergedInfo = { ...existing.info };
            if (info) {
                Object.keys(info).forEach(key => {
                    if (info[key] != null && 
                        (mergedInfo[key] == null || 
                         (key.includes('size') && mergedInfo[key] === 0) ||
                         (key.includes('Size') && mergedInfo[key] === 0))) {
                        mergedInfo[key] = info[key];
                    }
                });
            }
            
            // Prefer the shorter, cleaner path for display
            let preferredPath = existing.filePath;
            if (filePath.length < existing.filePath.length || 
                (!existing.filePath.includes('/') && filePath.includes('/'))) {
                preferredPath = filePath;
            }
            
            // Update the existing entry with merged data
            seenModels[existingIndex] = {
                filePath: preferredPath,
                hash: hash || existing.hash,
                info: mergedInfo
            };
            
            console.debug(`Merged duplicate model (${duplicateType}): ${filePath} -> ${preferredPath}`);
        } else {
            // First occurrence, add to array and maps
            const newEntry = { ...model, filePath: normalizedPath };
            const newIndex = seenModels.length;
            seenModels.push(newEntry);
            
            pathMap.set(pathKey, newIndex);
            if (hashKey) hashMap.set(hashKey, newIndex);
            if (sizeNameKey) sizeNameMap.set(sizeNameKey, newIndex);
        }
    });
    
    return seenModels;
}

/**
 * Normalize a file path by resolving relative components and cleaning up the path
 * @param {string} filePath - The file path to normalize
 * @returns {string} - Normalized file path
 */
function normalizePath(filePath) {
    if (!filePath || typeof filePath !== 'string') return '';
    
    // Convert backslashes to forward slashes for consistency
    let normalized = filePath.replace(/\\/g, '/');
    
    // Remove duplicate slashes
    normalized = normalized.replace(/\/+/g, '/');
    
    // Split into components and resolve .. and . references
    const parts = normalized.split('/');
    const resolved = [];
    
    for (const part of parts) {
        if (part === '..') {
            // Go up one directory (remove last component)
            if (resolved.length > 0 && resolved[resolved.length - 1] !== '..') {
                resolved.pop();
            } else if (!normalized.startsWith('/')) {
                // Only keep .. if we're dealing with relative paths
                resolved.push(part);
            }
        } else if (part !== '.' && part !== '') {
            // Add normal directory/file names (skip . and empty parts)
            resolved.push(part);
        }
    }
    
    // Reconstruct the path
    const result = (normalized.startsWith('/') ? '/' : '') + resolved.join('/');
    return result || '/';
}

/**
 * Generate complete HTML report
 * @param {Object} options - Report generation options
 * @param {Array} options.models - Array of model objects with filePath, hash, and info
 * @param {Function} [options.progressCallback] - Progress callback function
 * @param {Array} [options.sortedFiles] - Sorted array of file paths (legacy)
 * @param {Array} [options.checkpoints] - Array of checkpoint models (legacy)
 * @param {Array} [options.loras] - Array of LoRA models (legacy)
 * @param {string} [options.filterDescription] - Description of applied filters
 * @param {string} [options.searchDescription] - Description of search filter
 * @param {string} [options.lastUsedDescription] - Description of last used filter
 * @param {string} [options.sortDescription] - Description of sort criteria
 * @param {string} [options.sortBy] - Current sort selection from model tab
 * @param {string} [options.modelTypeFilter] - Current model type filter from model tab
 * @returns {Promise<string>} - Complete HTML document
 */
export async function generateHtmlContent(options) {
    const {
        models,
        progressCallback,
        sortedFiles,
        checkpoints,
        loras,
        filterDescription = '',
        searchDescription = '',
        lastUsedDescription = '',
        sortDescription = '',
        sortBy = 'name',
        modelTypeFilter = 'all'
    } = options;

    // Use the optimized version with progress tracking
    return await generateHtmlContentWithProgress(options);
}

/**
 * Open HTML content in a new browser tab
 * @param {string} htmlContent - Complete HTML content
 * @param {string} title - Window title
 * @returns {boolean} - Success status
 */
export function openHtmlReport(htmlContent, title) {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
        // Use modern DOM manipulation instead of deprecated document.write()
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        newWindow.location.href = url;
        
        // Clean up the blob URL after a delay to ensure the page loads
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);
        
        return true;
    } else {
        alert('Unable to open new window. Please check your popup blocker settings.');
        return false;
    }
}

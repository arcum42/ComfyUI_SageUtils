/**
 * HTML Report Generator for SageUtils Cache Browser
 * Handles generation of styled HTML reports with model information
 */

import {
    getModelUrl,
    hasUpdateAvailable,
    getUpdateStyle,
    formatTriggerWords
} from '../shared/civitai.js';

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
} from '../shared/constants.js';

import {
    getFileSize,
    escapeHtml,
    formatFileSize,
    getBaseModelStyle
} from './modelFormatters.js';

import {
    deduplicateModels,
    normalizePath
} from './modelDeduplication.js';

import {
    sortModels,
    groupModelsByCivitaiId,
    generateGroupInfo
} from './modelSorting.js';

import {
    generateHtmlDocumentStart,
    generateHtmlDocumentEnd,
    generateSectionHeader,
    generateTableWrapper,
    generateCssStyles,
    generateClientSideJs,
    generateModelStatsSection,
    generateTableSection,
    generateTableHeaders
} from './htmlTemplates.js';

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
    if (progressCallback) {
        progressCallback(15, 'Building HTML structure...');
    }

    const cssStyles = generateCssStyles();
    const clientJs = generateClientSideJs(sortBy);
    const htmlStart = generateHtmlDocumentStart(currentDateTime, cssStyles, clientJs);
    
    let htmlContent = htmlStart + generateModelStatsSection(currentDateTime, filterDescription, searchDescription, lastUsedDescription, sortDescription, allModels, checkpointModels, loraModels, modelTypeFilter);

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
        
        htmlContent += generateTableSection('LoRA Models', loraModels.length, loraRows, visibleColumns);
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
        
        htmlContent += generateTableSection('Checkpoint Models', checkpointModels.length, checkpointRows, visibleColumns);
    }

    htmlContent += generateHtmlDocumentEnd();

    if (progressCallback) {
        progressCallback(85, 'Finalizing HTML report...');
    }

    return htmlContent;
}

/**
 * Generate complete HTML report (legacy wrapper)
 * @param {Object} options - Report generation options  
 * @returns {Promise<string>} - Complete HTML document
 */
export async function generateHtmlContent(options) {
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

// Re-export utility functions to maintain API compatibility
export { escapeHtml, formatFileSize } from './modelFormatters.js';

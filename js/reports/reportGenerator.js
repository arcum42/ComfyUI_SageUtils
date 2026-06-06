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

import { notifications } from '../shared/notifications.js';

import {
    DEFAULT_THUMBNAIL_WIDTH,
    DEFAULT_THUMBNAIL_HEIGHT,
    DEFAULT_BATCH_SIZE,
    REPORT_COLUMN_CONFIG
} from '../shared/constants.js';

import {
    getFileSize,
    escapeHtml,
    formatFileSize,
    getBaseModelStyle
} from './modelFormatters.js';

import {
    deduplicateModels
} from './modelDeduplication.js';

import {
    groupModelsByCivitaiId,
    generateGroupInfo
} from './modelSorting.js';

import {
    generateHtmlDocumentStart,
    generateHtmlDocumentEnd,
    generateClientSideJs,
    generateModelStatsSection,
    generateTableSection
} from './htmlTemplates.js';

import {
    loadHtmlTemplate,
    renderHtmlTemplate
} from '../utils/htmlTemplateLoader.js';

let reportTableCellTemplate = null;
let reportTableRowTemplate = null;

async function getReportTableCellTemplate() {
    if (!reportTableCellTemplate) {
        reportTableCellTemplate = await loadHtmlTemplate('extensions/comfyui_sageutils/reports/partials/reportTableCell.html');
    }
    return reportTableCellTemplate;
}

async function getReportTableRowTemplate() {
    if (!reportTableRowTemplate) {
        reportTableRowTemplate = await loadHtmlTemplate('extensions/comfyui_sageutils/reports/partials/reportTableRow.html');
    }
    return reportTableRowTemplate;
}

async function renderReportTableCell(cellClass, content, sortKey = '') {
    const template = await getReportTableCellTemplate();
    return renderHtmlTemplate(template, { cellClass, content, sortKey });
}

async function renderReportTableRow(cells, rowClass = '') {
    const template = await getReportTableRowTemplate();
    return renderHtmlTemplate(template, { rowClass, cells: cells.join('\n') });
}

let reportThumbnailImageTemplate = null;
let reportThumbnailPlaceholderTemplate = null;
let reportThumbnailAutoLoadTemplate = null;
let reportCivitaiContentTemplate = null;
let reportVersionLinkContentTemplate = null;
let reportVersionTextContentTemplate = null;

async function getReportThumbnailImageTemplate() {
    if (!reportThumbnailImageTemplate) {
        reportThumbnailImageTemplate = await loadHtmlTemplate('extensions/comfyui_sageutils/reports/partials/reportThumbnailImage.html');
    }
    return reportThumbnailImageTemplate;
}

async function getReportThumbnailPlaceholderTemplate() {
    if (!reportThumbnailPlaceholderTemplate) {
        reportThumbnailPlaceholderTemplate = await loadHtmlTemplate('extensions/comfyui_sageutils/reports/partials/reportThumbnailPlaceholder.html');
    }
    return reportThumbnailPlaceholderTemplate;
}

async function getReportThumbnailAutoLoadTemplate() {
    if (!reportThumbnailAutoLoadTemplate) {
        reportThumbnailAutoLoadTemplate = await loadHtmlTemplate('extensions/comfyui_sageutils/reports/partials/reportThumbnailAutoLoad.html');
    }
    return reportThumbnailAutoLoadTemplate;
}

async function getReportCivitaiContentTemplate() {
    if (!reportCivitaiContentTemplate) {
        reportCivitaiContentTemplate = await loadHtmlTemplate('extensions/comfyui_sageutils/reports/partials/reportCivitaiContent.html');
    }
    return reportCivitaiContentTemplate;
}

async function getReportVersionLinkContentTemplate() {
    if (!reportVersionLinkContentTemplate) {
        reportVersionLinkContentTemplate = await loadHtmlTemplate('extensions/comfyui_sageutils/reports/partials/reportVersionLinkContent.html');
    }
    return reportVersionLinkContentTemplate;
}

async function getReportVersionTextContentTemplate() {
    if (!reportVersionTextContentTemplate) {
        reportVersionTextContentTemplate = await loadHtmlTemplate('extensions/comfyui_sageutils/reports/partials/reportVersionTextContent.html');
    }
    return reportVersionTextContentTemplate;
}

async function renderReportThumbnailImage(imageUrl) {
    const template = await getReportThumbnailImageTemplate();
    return renderHtmlTemplate(template, { imageUrl });
}

async function renderReportThumbnailPlaceholder(placeholderText) {
    const template = await getReportThumbnailPlaceholderTemplate();
    return renderHtmlTemplate(template, { placeholderText });
}

async function renderReportThumbnailAutoLoad(hash, civitaiUrl) {
    const template = await getReportThumbnailAutoLoadTemplate();
    return renderHtmlTemplate(template, { hash, civitaiUrl });
}

async function renderReportCivitaiContent(civitaiUrl, modelId, updateMessage) {
    const template = await getReportCivitaiContentTemplate();
    return renderHtmlTemplate(template, { civitaiUrl, modelId, updateMessage });
}

async function renderReportVersionLinkContent(versionUrl, versionId) {
    const template = await getReportVersionLinkContentTemplate();
    return renderHtmlTemplate(template, { versionUrl, versionId });
}

async function renderReportVersionTextContent(versionId) {
    const template = await getReportVersionTextContentTemplate();
    return renderHtmlTemplate(template, { versionId });
}

/**
 * Extract folder type from file path
 * @param {string} filePath - The file path to analyze
 * @returns {string} The folder type (checkpoints, loras, etc.)
 */
function getFolderTypeFromPath(filePath) {
    if (!filePath) return 'unknown';
    
    if (filePath.includes('/checkpoints/')) return 'checkpoints';
    if (filePath.includes('/loras/')) return 'loras';
    if (filePath.includes('/vae/')) return 'vae';
    if (filePath.includes('/text_encoders/') || filePath.includes('/clip/')) return 'text_encoders';
    if (filePath.includes('/diffusion_models/') || filePath.includes('/unet/')) return 'diffusion_models';
    if (filePath.includes('/embeddings/')) return 'embeddings';
    if (filePath.includes('/clip_vision/')) return 'clip_vision';
    if (filePath.includes('/style_models/')) return 'style_models';
    if (filePath.includes('/controlnet/') || filePath.includes('/t2i_adapter/')) return 'controlnet';
    if (filePath.includes('/upscale_models/')) return 'upscale_models';
    if (filePath.includes('/hypernetworks/')) return 'hypernetworks';
    
    return 'unknown';
}

/**
 * Get display name for folder type
 * @param {string} folderType - The folder type key
 * @returns {string} Human-readable folder name
 */
function getFolderDisplayName(folderType) {
    const folderNames = {
        'checkpoints': 'Checkpoints',
        'loras': 'LoRA',
        'vae': 'VAE',
        'text_encoders': 'Text Encoders',
        'diffusion_models': 'Diffusion Models',
        'embeddings': 'Embeddings',
        'clip_vision': 'CLIP Vision',
        'style_models': 'Style Models',
        'controlnet': 'ControlNet',
        'upscale_models': 'Upscale Models',
        'hypernetworks': 'Hypernetworks',
        'unknown': 'Unknown'
    };
    
    return folderNames[folderType] || 'Unknown';
}

function shouldAttemptCivitaiLoad(info) {
    if (!info) return true;
    const civitaiStatus = info.civitai;
    let shouldAttempt = true;

    if (civitaiStatus !== undefined && civitaiStatus !== null) {
        if (typeof civitaiStatus === 'string') {
            shouldAttempt = civitaiStatus.toLowerCase() === 'true';
        } else if (typeof civitaiStatus === 'boolean') {
            shouldAttempt = civitaiStatus;
        }
    }

    const failedCount = info.civitai_failed_count || info.civitaiFailedCount || 0;
    if (failedCount > 0) {
        shouldAttempt = false;
    }

    return shouldAttempt;
}

function getCivitaiStatusReason(info) {
    let noImageReason = 'No image available';
    if (!info) return noImageReason;

    const failedCount = info.civitai_failed_count || info.civitaiFailedCount || 0;
    const civitaiStatus = info.civitai;

    if (failedCount > 0) {
        noImageReason = 'Not available on Civitai';
    } else if (civitaiStatus === false || (typeof civitaiStatus === 'string' && civitaiStatus.toLowerCase() === 'false')) {
        noImageReason = 'Not available on Civitai';
    }

    return noImageReason;
}

async function buildExampleImageContent(info, hash) {
    if (info && info.images && Array.isArray(info.images) && info.images.length > 0) {
        const firstImage = info.images[0];
        if (firstImage && firstImage.url) {
            return renderReportThumbnailImage(escapeHtml(firstImage.url));
        }
    }

    if (!hash) {
        return renderReportThumbnailPlaceholder('No image');
    }

    if (shouldAttemptCivitaiLoad(info)) {
        const civitaiImageUrl = `https://civitai.com/api/v1/model-versions/by-hash/${encodeURIComponent(hash)}`;
        return renderReportThumbnailAutoLoad(escapeHtml(hash), escapeHtml(civitaiImageUrl));
    }

    const noImageReason = getCivitaiStatusReason(info);
    return renderReportThumbnailPlaceholder(escapeHtml(noImageReason));
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
        const civitaiClass = shouldShowUpdateMessage ? getUpdateStyle(info) : '';
        
        // Format trigger words with copy functionality
        const triggerCellContent = formatTriggerWords(triggerWords);

        // Generate sortable attributes for special columns
        const fileSizeBytes = fileSizeRaw || 0;
        const lastUsedTimestamp = (lastUsed !== 'Never' && lastUsed !== 'Unknown') ? 
            new Date(lastUsed).getTime() : 0;

        const exampleImageContent = await buildExampleImageContent(info, hash);

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

        const hasExistingImage = info && info.images && Array.isArray(info.images) && info.images.length > 0;
        const imageCellClass = hasExistingImage || shouldAttemptCivitaiLoad(info) ? 'image-cell' : 'image-cell compact';

        // Generate table cells based on visible columns
        const tableCells = [];
        
        // If no column configuration is provided, use default order (all columns visible)
        const columnsToRender = visibleColumns || [
            { key: 'name' }, { key: 'basemodel' }, { key: 'type' }, { key: 'folder' }, { key: 'triggers' }, 
            { key: 'image' }, { key: 'civitai' }, { key: 'versionid' }, { key: 'hash' }, 
            { key: 'size' }, { key: 'lastused' }, { key: 'path' }
        ];
        
        for (const column of columnsToRender) {
            switch (column.key) {
                case 'name':
                    tableCells.push(await renderReportTableCell(`cell-center ${nameStyle}`, escapeHtml(modelName)));
                    break;
                case 'basemodel':
                    tableCells.push(await renderReportTableCell('cell-center', escapeHtml(baseModel)));
                    break;
                case 'type':
                    tableCells.push(await renderReportTableCell('cell-center', escapeHtml(modelType)));
                    break;
                case 'folder': {
                    const folderType = getFolderTypeFromPath(filePath);
                    const folderDisplayName = getFolderDisplayName(folderType);
                    tableCells.push(await renderReportTableCell('cell-center', escapeHtml(folderDisplayName)));
                    break;
                }
                case 'triggers':
                    tableCells.push(await renderReportTableCell('cell-center', triggerCellContent));
                    break;
                case 'image':
                    tableCells.push(await renderReportTableCell(imageCellClass, exampleImageContent));
                    break;
                case 'civitai': {
                    const updateMessage = shouldShowUpdateMessage ? '<br><br><i>Update available</i>' : '';
                    const civitaiContent = await renderReportCivitaiContent(escapeHtml(civitaiUrl), escapeHtml(modelId), updateMessage);
                    tableCells.push(await renderReportTableCell(`cell-center ${civitaiClass}`, civitaiContent));
                    break;
                }
                case 'versionid': {
                    const versionId = (info && info.id) || 'Unknown';
                    const versionContent = (versionId !== 'Unknown' && versionId !== '' && versionId != null && modelId !== 'Unknown' && modelId !== '' && modelId != null)
                        ? await renderReportVersionLinkContent(escapeHtml(getModelUrl(modelId, versionId)), escapeHtml(String(versionId)))
                        : await renderReportVersionTextContent(escapeHtml(String(versionId)));
                    tableCells.push(await renderReportTableCell(`cell-center ${civitaiClass}`, versionContent));
                    break;
                }
                case 'hash':
                    tableCells.push(await renderReportTableCell('cell-center', `${escapeHtml(modelHash.substring(0, 12))}...`));
                    break;
                case 'size':
                    tableCells.push(await renderReportTableCell('cell-center', escapeHtml(fileSize), ` sorttable_customkey="${fileSizeBytes}"`));
                    break;
                case 'lastused':
                    tableCells.push(await renderReportTableCell('cell-center', escapeHtml(formattedLastUsed), ` sorttable_customkey="${lastUsedTimestamp}"`));
                    break;
                case 'path':
                    tableCells.push(await renderReportTableCell('cell-left', escapeHtml(filePath)));
                    break;
            }
        }

        return renderReportTableRow(tableCells, groupClassAttribute);
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
            const civitaiClass = shouldShowUpdateMessage ? getUpdateStyle(info) : '';
            
            // Format trigger words with copy functionality
            const triggerCellContent = formatTriggerWords(triggerWords);

            // Generate sortable attributes for special columns
            const fileSizeBytes = fileSizeRaw || 0;
            const lastUsedTimestamp = (lastUsed !== 'Never' && lastUsed !== 'Unknown') ? 
                new Date(lastUsed).getTime() : 0;

            const exampleImageContent = await buildExampleImageContent(info, hash);

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

            const hasExistingImage = info && info.images && Array.isArray(info.images) && info.images.length > 0;
            const imageCellClass = hasExistingImage || shouldAttemptCivitaiLoad(info) ? 'image-cell' : 'image-cell compact';

            // Generate table cells based on visible columns
            const tableCells = [];
            
            // If no column configuration is provided, use default order (all columns visible)
            const columnsToRender = visibleColumns || [
                { key: 'name' }, { key: 'basemodel' }, { key: 'type' }, { key: 'folder' }, { key: 'triggers' }, 
                { key: 'image' }, { key: 'civitai' }, { key: 'versionid' }, { key: 'hash' }, 
                { key: 'size' }, { key: 'lastused' }, { key: 'path' }
            ];
            
            for (const column of columnsToRender) {
                switch (column.key) {
                    case 'name':
                        tableCells.push(await renderReportTableCell(`cell-center ${nameStyle}`, escapeHtml(modelName)));
                        break;
                    case 'basemodel':
                        tableCells.push(await renderReportTableCell('cell-center', escapeHtml(baseModel)));
                        break;
                    case 'type':
                        tableCells.push(await renderReportTableCell('cell-center', escapeHtml(modelType)));
                        break;
                    case 'folder': {
                        const folderType = getFolderTypeFromPath(filePath);
                        const folderDisplayName = getFolderDisplayName(folderType);
                        tableCells.push(await renderReportTableCell('cell-center', escapeHtml(folderDisplayName)));
                        break;
                    }
                    case 'triggers':
                        tableCells.push(await renderReportTableCell('cell-center', triggerCellContent));
                        break;
                    case 'image':
                        tableCells.push(await renderReportTableCell(imageCellClass, exampleImageContent));
                        break;
                    case 'civitai': {
                        const updateMessage = shouldShowUpdateMessage ? '<br><br><i>Update available</i>' : '';
                        const civitaiContent = await renderReportCivitaiContent(escapeHtml(civitaiUrl), escapeHtml(modelId), updateMessage);
                        tableCells.push(await renderReportTableCell(`cell-center ${civitaiClass}`, civitaiContent));
                        break;
                    }
                    case 'versionid': {
                        const versionId = (info && info.id) || 'Unknown';
                        const versionContent = (versionId !== 'Unknown' && versionId !== '' && versionId != null && modelId !== 'Unknown' && modelId !== '' && modelId != null)
                            ? await renderReportVersionLinkContent(escapeHtml(getModelUrl(modelId, versionId)), escapeHtml(String(versionId)))
                            : await renderReportVersionTextContent(escapeHtml(String(versionId)));
                        tableCells.push(await renderReportTableCell(`cell-center ${civitaiClass}`, versionContent));
                        break;
                    }
                    case 'hash':
                        tableCells.push(await renderReportTableCell('cell-center', `${escapeHtml(modelHash.substring(0, 12))}...`));
                        break;
                    case 'size':
                        tableCells.push(await renderReportTableCell('cell-center', escapeHtml(fileSize), ` sorttable_customkey="${fileSizeBytes}"`));
                        break;
                    case 'lastused':
                        tableCells.push(await renderReportTableCell('cell-center', escapeHtml(formattedLastUsed), ` sorttable_customkey="${lastUsedTimestamp}"`));
                        break;
                    case 'path':
                        tableCells.push(await renderReportTableCell('cell-left', escapeHtml(filePath)));
                        break;
                }
            }

            return renderReportTableRow(tableCells, groupClassAttribute);
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
 * @param {string} [options.folderFilter] - Current folder filter from model tab (all, checkpoints, loras, vae, etc.)
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
        folderFilter = 'all'
    } = options;

    // Column visibility configuration (now centralized in constants.js)
    // This controls which columns appear in the generated reports
    // To hide additional columns, set visible: false in the REPORT_COLUMN_CONFIG
    // To show the Hash column, set visible: true for the Hash entry in constants.js
    const COLUMN_CONFIG = REPORT_COLUMN_CONFIG;

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
        
        // Categorize models by folder type instead of using unreliable Civitai model type
        checkpointModels = deduplicatedModels.filter(model => {
            const filePath = model.filePath || '';
            return getFolderTypeFromPath(filePath) === 'checkpoints';
        });
        loraModels = deduplicatedModels.filter(model => {
            const filePath = model.filePath || '';
            return getFolderTypeFromPath(filePath) === 'loras';
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

    // Apply folder-based filtering based on the selected filter from the models tab
    if (folderFilter !== 'all') {
        if (progressCallback) {
            progressCallback(11, `Filtering models by folder: ${folderFilter}...`);
        }
        
        // Filter all models by the selected folder type
        allModels = allModels.filter(model => {
            const filePath = model.filePath || '';
            return getFolderTypeFromPath(filePath) === folderFilter;
        });
        
        // Update categorized lists based on the filtered results
        checkpointModels = allModels.filter(model => {
            const filePath = model.filePath || '';
            return getFolderTypeFromPath(filePath) === 'checkpoints';
        });
        loraModels = allModels.filter(model => {
            const filePath = model.filePath || '';
            return getFolderTypeFromPath(filePath) === 'loras';
        });
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

    const cssHref = `${window.location.origin}/extensions/comfyui_sageutils/reports/reportStyles.css`;
    const clientJs = generateClientSideJs(sortBy);
    const htmlStart = await generateHtmlDocumentStart(currentDateTime, clientJs, cssHref);
    
    let htmlContent = htmlStart + await generateModelStatsSection(currentDateTime, filterDescription, searchDescription, lastUsedDescription, sortDescription, allModels, checkpointModels, loraModels, folderFilter);

    // Determine which sections to show based on folder filter
    const shouldShowSection = (sectionFolderType, modelArray) => {
        if (folderFilter !== 'all') {
            // If a specific folder is selected, only show that section
            return folderFilter === sectionFolderType && modelArray.length > 0;
        } else {
            // Show all sections that have models
            return modelArray.length > 0;
        }
    };

    // Add LoRAs section if it should be shown
    if (shouldShowSection('loras', loraModels)) {
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
        
        htmlContent += await generateTableSection('LoRA Models', loraModels.length, loraRows, visibleColumns);
    }

    // Add Checkpoints section if it should be shown
    if (shouldShowSection('checkpoints', checkpointModels)) {
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
        
        htmlContent += await generateTableSection('Checkpoint Models', checkpointModels.length, checkpointRows, visibleColumns);
    }

    // Add sections for other folder types if they should be shown
    const otherFolderTypes = [
        { key: 'vae', displayName: 'VAE Models' },
        { key: 'text_encoders', displayName: 'Text Encoders' },
        { key: 'diffusion_models', displayName: 'Diffusion Models' },
        { key: 'embeddings', displayName: 'Embeddings' },
        { key: 'clip_vision', displayName: 'CLIP Vision' },
        { key: 'style_models', displayName: 'Style Models' },
        { key: 'controlnet', displayName: 'ControlNet' },
        { key: 'upscale_models', displayName: 'Upscale Models' },
        { key: 'hypernetworks', displayName: 'Hypernetworks' }
    ];

    for (const folderType of otherFolderTypes) {
        // Filter models for this folder type
        const folderModels = allModels.filter(model => {
            const filePath = model.filePath || '';
            return getFolderTypeFromPath(filePath) === folderType.key;
        });

        if (shouldShowSection(folderType.key, folderModels)) {
            if (progressCallback) {
                progressCallback(70, `Processing ${folderModels.length} ${folderType.displayName.toLowerCase()}...`);
            }
            
            // Generate grouping information for this folder type
            const folderGroupInfo = generateGroupInfo(folderModels);
            
            const folderRows = await generateTableRowsWithProgress(folderModels, {
                groupInfo: folderGroupInfo,
                visibleColumns: visibleColumns,
                progressCallback: progressCallback ? (progress, message) => {
                    // Map progress to remaining range
                    const adjustedProgress = 70 + (progress * 0.15);
                    progressCallback(adjustedProgress, `${folderType.displayName}: ${message}`);
                } : null
            });
            
            htmlContent += await generateTableSection(folderType.displayName, folderModels.length, folderRows, visibleColumns);
        }
    }

    htmlContent += await generateHtmlDocumentEnd();

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
        notifications.warning('Unable to open new window. Please check your popup blocker settings.');
        return false;
    }
}

// Re-export utility functions for backward compatibility with existing imports
export { escapeHtml, formatFileSize } from './modelFormatters.js';

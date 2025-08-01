/**
 * HTML Report Generator for SageUtils Cache Browser
 * Handles generation of styled HTML reports with model information
 */

import {
    getCivitaiImageApiUrl,
    extractImageUrls,
    getModelUrl,
    hasUpdateAvailable,
    getUpdateStyle,
    formatTriggerWords,
    NSFW_LEVELS
} from './civitai.js';

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
 * @returns {Promise<string>} - HTML table rows
 */
export async function generateTableRows(models, options = {}) {
    const rows = await Promise.all(models.map(async ({ filePath, hash, info }) => {
        const modelName = (info && info.model && info.model.name) || (info && info.name) || filePath.split('/').pop() || 'Unknown';
        const baseModel = (info && info.baseModel) || (info && info.base_model) || 'Unknown';
        const modelType = (info && info.model && info.model.type) || 'Unknown';
        const triggerWords = (info && info.trainedWords && Array.isArray(info.trainedWords)) ? info.trainedWords : [];
        const modelId = (info && info.modelId) || 'Unknown';
        const civitaiUrl = getModelUrl(modelId);
        const updateAvailable = hasUpdateAvailable(info);
        const lastUsed = (info && (info.lastUsed || info.last_accessed)) || 'Never';
        
        // Try multiple possible file size fields, fallback to filesystem
        let fileSizeRaw = info && (info.file_size || info.fileSize || info.size);
        if (!fileSizeRaw && filePath) {
            fileSizeRaw = await getFileSize(filePath);
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
        const civitaiStyle = getUpdateStyle(info);
        
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
                exampleImageContent = `<img src="${escapeHtml(firstImage.url)}" 
                                           style="width:150px;height:100px;object-fit:cover;border-radius:4px;cursor:pointer;transition:all 0.3s ease;" 
                                           alt="Example image" 
                                           loading="lazy" 
                                           title="Click to expand/collapse"
                                           onclick="toggleImageExpand(this)"
                                           onerror="this.style.display='none'">`;
            }
        } else if (hash) {
            // Auto-load Civitai images with proper sizing
            const civitaiImageUrl = `https://civitai.com/api/v1/model-versions/by-hash/${encodeURIComponent(hash)}`;
            exampleImageContent = `<div style="width:150px;height:100px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;border-radius:4px;font-size:11px;color:#999;" 
                                        data-civitai-hash="${escapeHtml(hash)}" 
                                        data-civitai-url="${escapeHtml(civitaiImageUrl)}"
                                        class="auto-load-image">
                                        <span style="text-align:center;">Loading...</span>
                                    </div>`;
        }

        return `
            <tr>
                <td style="text-align:center;${nameStyle}">${escapeHtml(modelName)}</td>
                <td style="text-align:center;">${escapeHtml(baseModel)}</td>
                <td style="text-align:center;">${escapeHtml(modelType)}</td>
                <td style="text-align:center;">${triggerCellContent}</td>
                <td class="image-cell">${exampleImageContent}</td>
                <td style="text-align:center;${civitaiStyle}">
                    <a href="${civitaiUrl}" target="_blank">${modelId}</a>
                    ${updateAvailable ? '<br><br><i>Update available</i>' : ''}
                </td>
                <td style="text-align:center;">${escapeHtml(modelHash.substring(0, 12))}...</td>
                <td style="text-align:center;" sorttable_customkey="${fileSizeBytes}">${escapeHtml(fileSize)}</td>
                <td style="text-align:center;" sorttable_customkey="${lastUsedTimestamp}">${formattedLastUsed}</td>
                <td style="text-align:left;">${escapeHtml(filePath)}</td>
            </tr>
        `;
    }));
    
    return rows.join('');
}

/**
 * Generate complete HTML report
 * @param {Object} options - Report generation options
 * @param {Array} options.models - Array of model objects with filePath, hash, and info
 * @param {Array} [options.sortedFiles] - Sorted array of file paths (legacy)
 * @param {Array} [options.checkpoints] - Array of checkpoint models (legacy)
 * @param {Array} [options.loras] - Array of LoRA models (legacy)
 * @param {string} [options.filterDescription] - Description of applied filters
 * @param {string} [options.searchDescription] - Description of search filter
 * @param {string} [options.lastUsedDescription] - Description of last used filter
 * @param {string} [options.sortDescription] - Description of sort criteria
 * @returns {Promise<string>} - Complete HTML document
 */
export async function generateHtmlContent(options) {
    const {
        models,
        sortedFiles,
        checkpoints,
        loras,
        filterDescription = '',
        searchDescription = '',
        lastUsedDescription = '',
        sortDescription = ''
    } = options;

    // Process models array if provided (new format)
    let allModels, checkpointModels, loraModels;
    
    if (models && Array.isArray(models)) {
        // New format: process models array
        allModels = models;
        checkpointModels = models.filter(model => {
            const info = model.info || {};
            const filePath = model.filePath || '';
            const isCheckpoint = info.model_type === 'Checkpoint' || 
                               filePath.toLowerCase().includes('.safetensors') ||
                               filePath.toLowerCase().includes('.ckpt');
            return isCheckpoint;
        });
        loraModels = models.filter(model => {
            const info = model.info || {};
            const filePath = model.filePath || '';
            const isLora = info.model_type === 'LORA' || 
                          filePath.toLowerCase().includes('lora');
            return isLora;
        });
    } else {
        // Legacy format: use provided arrays
        allModels = sortedFiles || [];
        checkpointModels = checkpoints || [];
        loraModels = loras || [];
    }

    const currentDateTime = new Date().toLocaleString();

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
            width: 160px;
            height: 110px;
            padding: 5px;
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
            position: relative;
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
        }
        .sort-indicator {
            font-size: 14px;
            margin-left: 5px;
        }
    </style>
    <script>
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
                        imgElement.style.cssText = 'width:150px;height:100px;object-fit:cover;border-radius:4px;cursor:pointer;transition:all 0.3s ease;';
                        imgElement.alt = 'Model example image';
                        imgElement.loading = 'lazy';
                        imgElement.title = 'Click to expand/collapse';
                        imgElement.onerror = function() { 
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
                        targetElement.innerHTML = '<span style="color:#999;font-size:11px;">No image</span>';
                    }
                } else {
                    targetElement.innerHTML = '<span style="color:#999;font-size:11px;">Not available</span>';
                }
            } catch (error) {
                console.debug('Failed to load Civitai image:', error);
                targetElement.innerHTML = '<span style="color:#999;font-size:11px;">Load failed</span>';
            }
        }

        // Auto-load all images when page loads
        function autoLoadImages() {
            const imageContainers = document.querySelectorAll('.auto-load-image');
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
        Total Models: ${allModels.length} (${checkpointModels.length} Checkpoints, ${loraModels.length} LoRAs)<br>
        <small style="color: #999; font-style: italic;">Click column headers to sort • Images load automatically from Civitai</small>
    </div>
`;

    // Add LoRAs section if any exist
    if (loraModels.length > 0) {
        const loraRows = await generateTableRows(loraModels);
        htmlContent += `
    <div class="section-header">LoRA Models (${loraModels.length})</div>
    <table class="sortable">
        <tr>
            <th style="width:200px;"><b>Model Name</b></th>
            <th style="width:100px;"><b>Base Model</b></th>
            <th style="width:80px;"><b>Type</b></th>
            <th style="width:175px;" class="sorttable_nosort"><b>Trigger Words</b></th>
            <th style="width:200px;" class="sorttable_nosort"><b>Example Image</b></th>
            <th style="width:100px;"><b>Civitai ID</b></th>
            <th style="width:100px;"><b>Hash</b></th>
            <th style="width:80px;"><b>File Size</b></th>
            <th style="width:120px;"><b>Last Used</b></th>
            <th style="width:250px;"><b>Full Path</b></th>
        </tr>
        ${loraRows}
    </table>
`;
    }

    // Add Checkpoints section if any exist
    if (checkpointModels.length > 0) {
        const checkpointRows = await generateTableRows(checkpointModels);
        htmlContent += `
    <div class="section-header">Checkpoint Models (${checkpointModels.length})</div>
    <table class="sortable">
        <tr>
            <th style="width:200px;"><b>Model Name</b></th>
            <th style="width:100px;"><b>Base Model</b></th>
            <th style="width:80px;"><b>Type</b></th>
            <th style="width:175px;" class="sorttable_nosort"><b>Trigger Words</b></th>
            <th style="width:200px;" class="sorttable_nosort"><b>Example Image</b></th>
            <th style="width:100px;"><b>Civitai ID</b></th>
            <th style="width:100px;"><b>Hash</b></th>
            <th style="width:80px;"><b>File Size</b></th>
            <th style="width:120px;"><b>Last Used</b></th>
            <th style="width:250px;"><b>Full Path</b></th>
        </tr>
        ${checkpointRows}
    </table>
`;
    }

    htmlContent += `
</body>
</html>
`;

    return htmlContent;
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
        newWindow.document.write(htmlContent);
        newWindow.document.close();
        newWindow.document.title = title;
        return true;
    } else {
        alert('Unable to open new window. Please check your popup blocker settings.');
        return false;
    }
}

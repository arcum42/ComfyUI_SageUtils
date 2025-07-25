/**
 * HTML Report Generator for SageUtils Cache Browser
 * Handles generation of styled HTML reports with model information
 */

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
 * Get file size from filesystem if not available in cache
 * @param {string} filePath - Full path to the file
 * @returns {Promise<number>} - File size in bytes
 */
async function getFileSize(filePath) {
    try {
        const response = await fetch('/sage_utils/get_file_size', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ file_path: filePath })
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.size || 0;
        }
    } catch (error) {
        console.warn('Could not get file size for:', filePath, error);
    }
    return 0;
}

/**
 * Fetch images for a model version from Civitai API
 * @param {string} hash - Model hash
 * @returns {Promise<Array>} - Array of image objects
 */
async function fetchCivitaiImages(hash) {
    try {
        const response = await fetch(`https://civitai.com/api/v1/model-versions/by-hash/${hash}`);
        if (!response.ok) {
            console.warn('Failed to fetch Civitai images:', response.status);
            return [];
        }
        const data = await response.json();
        return data.images || [];
    } catch (error) {
        console.warn('Error fetching Civitai images:', error);
        return [];
    }
}

/**
 * Generate HTML table rows for models
 * @param {Array} models - Array of model objects with filePath, hash, and info
 * @returns {Promise<string>} - HTML table rows
 */
export async function generateTableRows(models) {
    const rows = await Promise.all(models.map(async ({ filePath, hash, info }) => {
        const modelName = (info && info.model && info.model.name) || (info && info.name) || filePath.split('/').pop() || 'Unknown';
        const baseModel = (info && info.baseModel) || (info && info.base_model) || 'Unknown';
        const modelType = (info && info.model && info.model.type) || 'Unknown';
        const triggerWords = (info && info.trainedWords && Array.isArray(info.trainedWords)) ? info.trainedWords.join(', ') : 'No triggers';
        const modelId = (info && info.modelId) || 'Unknown';
        const civitaiUrl = modelId !== 'Unknown' ? `https://civitai.com/models/${modelId}` : '#';
        const updateAvailable = info && info.update_available;
        const lastUsed = (info && (info.lastUsed || info.last_accessed)) || 'Never';
        
        // Try multiple possible file size fields, fallback to filesystem (disabled for now)
        let fileSizeRaw = info && (info.file_size || info.fileSize || info.size);
        // TODO: Re-enable when backend endpoint is implemented
        // if (!fileSizeRaw && filePath) {
        //     fileSizeRaw = await getFileSize(filePath);
        // }
        
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
        const civitaiStyle = updateAvailable ? 'background-color:orange;' : '';
        
        // Only show copy button if there are actual trigger words
        const hasTriggers = triggerWords && triggerWords !== 'No triggers' && triggerWords.trim() !== '';
        const triggerCellContent = hasTriggers ? 
            `${escapeHtml(triggerWords)}<br><br><button style="background-color: #01006D; color: yellow; font-size: 12px;" onclick="copyToClipboard('${escapeHtml(triggerWords)}')">Copy Triggers</button>` :
            '<i>No triggers</i>';

        // Generate sortable attributes for special columns
        const fileSizeBytes = fileSizeRaw || 0;
        const lastUsedTimestamp = (lastUsed !== 'Never' && lastUsed !== 'Unknown') ? 
            new Date(lastUsed).getTime() : 0;

        // Get first example image if available
        let exampleImageContent = '<i>No image</i>';
        
        // First try to get images from cached info
        if (info && info.images && Array.isArray(info.images) && info.images.length > 0) {
            const firstImage = info.images[0];
            if (firstImage && firstImage.url) {
                exampleImageContent = `<img src="${escapeHtml(firstImage.url)}" style="width:200px;height:auto;border-radius:4px;" alt="Example image" loading="lazy">`;
            }
        } else if (hash) {
            // If no cached images, try to fetch from Civitai using hash
            try {
                const civitaiImages = await fetchCivitaiImages(hash);
                if (civitaiImages && civitaiImages.length > 0) {
                    // Filter for SFW images (nsfwLevel <= 1) and get the first one
                    const siteAppropriateImages = civitaiImages.filter(img => (img.nsfwLevel || 0) <= 1);
                    if (siteAppropriateImages.length > 0) {
                        const firstImage = siteAppropriateImages[0];
                        exampleImageContent = `<img src="${escapeHtml(firstImage.url)}" style="width:200px;height:auto;border-radius:4px;" alt="Example image" loading="lazy">`;
                    }
                }
            } catch (error) {
                console.warn('Error fetching example image for hash:', hash, error);
            }
        }

        return `
            <tr>
                <td style="text-align:center;${nameStyle}">${escapeHtml(modelName)}</td>
                <td style="text-align:center;">${escapeHtml(baseModel)}</td>
                <td style="text-align:center;">${escapeHtml(modelType)}</td>
                <td style="text-align:center;">${triggerCellContent}</td>
                <td style="text-align:center;">${exampleImageContent}</td>
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
 * @param {Array} options.sortedFiles - Sorted array of file paths
 * @param {Array} options.checkpoints - Array of checkpoint models
 * @param {Array} options.loras - Array of LoRA models
 * @param {string} options.filterDescription - Description of applied filters
 * @param {string} options.searchDescription - Description of search filter
 * @param {string} options.lastUsedDescription - Description of last used filter
 * @param {string} options.sortDescription - Description of sort criteria
 * @returns {Promise<string>} - Complete HTML document
 */
export async function generateHtmlContent(options) {
    const {
        sortedFiles,
        checkpoints,
        loras,
        filterDescription,
        searchDescription,
        lastUsedDescription,
        sortDescription
    } = options;

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
        table.sortable th:not(.sorttable_nosort):not(.sorttable_sorted):not(.sorttable_sorted_reverse):not(.sorttable_alpha):not(.sorttable_numeric):not(.sorttable_alphaNum):hover {
            background-color: #5555ff;
            cursor: pointer;
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
    </style>
    <script src="https://tecknight.aiartalley.com/sorttable.js"></script>
    <script>
        async function copyToClipboard(text) {
            try {
                await navigator.clipboard.writeText(text);
                console.log('Text copied to clipboard');
            } catch (err) {
                console.error('Failed to copy: ', err);
            }
        }
    </script>
</head>
<body>
    <h1>SageUtils Model Report</h1>
    <h2>Generated: ${currentDateTime}</h2>
    <div class="info">
        Filters Applied: ${filterDescription}${searchDescription}${lastUsedDescription}${sortDescription}<br>
        Total Models: ${sortedFiles.length} (${checkpoints.length} Checkpoints, ${loras.length} LoRAs)<br>
        <small style="color: #999; font-style: italic;">Click column headers to sort • Report format based on original design by tecknight</small>
    </div>
`;

    // Add LoRAs section if any exist
    if (loras.length > 0) {
        const loraRows = await generateTableRows(loras);
        htmlContent += `
    <div class="section-header">LoRA Models (${loras.length})</div>
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
    if (checkpoints.length > 0) {
        const checkpointRows = await generateTableRows(checkpoints);
        htmlContent += `
    <div class="section-header">Checkpoint Models (${checkpoints.length})</div>
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

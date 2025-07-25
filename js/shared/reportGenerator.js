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
    if (!bytes || bytes === 0) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
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
 * @returns {string} - HTML table rows
 */
export function generateTableRows(models) {
    return models.map(({ filePath, hash, info }) => {
        const modelName = (info && info.model && info.model.name) || (info && info.name) || filePath.split('/').pop() || 'Unknown';
        const baseModel = (info && info.baseModel) || (info && info.base_model) || 'Unknown';
        const modelType = (info && info.model && info.model.type) || 'Unknown';
        const triggerWords = (info && info.trainedWords && Array.isArray(info.trainedWords)) ? info.trainedWords.join(', ') : 'No triggers';
        const modelId = (info && info.modelId) || 'Unknown';
        const civitaiUrl = modelId !== 'Unknown' ? `https://civitai.com/models/${modelId}` : '#';
        const updateAvailable = info && info.update_available;
        const lastUsed = (info && (info.lastUsed || info.last_accessed)) || 'Never';
        const fileSize = formatFileSize(info && info.file_size);
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
        const triggerCellContent = triggerWords === 'No triggers' ? 
            '<i>No triggers</i>' : 
            `${escapeHtml(triggerWords)}<br><br><button style="background-color: #01006D; color: yellow; font-size: 12px;" onclick="copyToClipboard('${escapeHtml(triggerWords)}')">Copy Triggers</button>`;

        return `
            <tr>
                <td style="text-align:center;${nameStyle}">${escapeHtml(modelName)}</td>
                <td style="text-align:center;">${escapeHtml(baseModel)}</td>
                <td style="text-align:center;">${escapeHtml(modelType)}</td>
                <td style="text-align:center;">${triggerCellContent}</td>
                <td style="text-align:center;${civitaiStyle}">
                    <a href="${civitaiUrl}" target="_blank">${modelId}</a>
                    ${updateAvailable ? '<br><br><i>Update available</i>' : ''}
                </td>
                <td style="text-align:center;">${escapeHtml(modelHash.substring(0, 12))}...</td>
                <td style="text-align:center;">${escapeHtml(fileSize)}</td>
                <td style="text-align:center;">${formattedLastUsed}</td>
                <td style="text-align:left;">${escapeHtml(filePath)}</td>
            </tr>
        `;
    }).join('');
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
 * @returns {string} - Complete HTML document
 */
export function generateHtmlContent(options) {
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
    </style>
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
        <small style="color: #999; font-style: italic;">Report format based on original design by tecknight</small>
    </div>
`;

    // Add LoRAs section if any exist
    if (loras.length > 0) {
        htmlContent += `
    <div class="section-header">LoRA Models (${loras.length})</div>
    <table>
        <tr>
            <th style="width:200px;"><b>Model Name</b></th>
            <th style="width:100px;"><b>Base Model</b></th>
            <th style="width:80px;"><b>Type</b></th>
            <th style="width:175px;"><b>Trigger Words</b></th>
            <th style="width:100px;"><b>Civitai ID</b></th>
            <th style="width:100px;"><b>Hash</b></th>
            <th style="width:80px;"><b>File Size</b></th>
            <th style="width:120px;"><b>Last Used</b></th>
            <th style="width:250px;"><b>Full Path</b></th>
        </tr>
        ${generateTableRows(loras)}
    </table>
`;
    }

    // Add Checkpoints section if any exist
    if (checkpoints.length > 0) {
        htmlContent += `
    <div class="section-header">Checkpoint Models (${checkpoints.length})</div>
    <table>
        <tr>
            <th style="width:200px;"><b>Model Name</b></th>
            <th style="width:100px;"><b>Base Model</b></th>
            <th style="width:80px;"><b>Type</b></th>
            <th style="width:175px;"><b>Trigger Words</b></th>
            <th style="width:100px;"><b>Civitai ID</b></th>
            <th style="width:100px;"><b>Hash</b></th>
            <th style="width:80px;"><b>File Size</b></th>
            <th style="width:120px;"><b>Last Used</b></th>
            <th style="width:250px;"><b>Full Path</b></th>
        </tr>
        ${generateTableRows(checkpoints)}
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

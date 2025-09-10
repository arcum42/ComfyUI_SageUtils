/**
 * HTML Templates and Client-Side Code for SageUtils Reports
 * Contains HTML document templates, CSS styles, and client-side JavaScript
 */

import {
    DEFAULT_THUMBNAIL_WIDTH,
    DEFAULT_THUMBNAIL_HEIGHT
} from '../shared/constants.js';

/**
 * Generate CSS styles for the HTML report
 * @returns {string} - CSS style definitions
 */
export function generateCssStyles() {
    return `
        body { 
            font-family: Arial, sans-serif; 
            margin: 20/**
 * Generate HTML document start with CSS and JavaScript
 * @param {string} currentDateTime - Current date/time string
 * @param {string} cssStyles - CSS styles content
 * @param {string} clientJs - Client-side JavaScript content
 * @returns {string} - HTML document start
 */
export function generateHtmlDocumentStart(currentDateTime, cssStyles, clientJs) { background-color: #f5f5f5; 
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
        }`;
}

/**
 * Generate client-side JavaScript for the HTML report
 * @param {string} sortBy - Current sort selection from model tab
 * @returns {string} - JavaScript code for client-side functionality
 */
export function generateClientSideJs(sortBy = 'name') {
    return `
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
                    const numA = parseFloat(valueA.replace(/[^\\\\d.-]/g, ''));
                    const numB = parseFloat(valueB.replace(/[^\\\\d.-]/g, ''));
                    
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
            var DEFAULT_THUMBNAIL_WIDTH = ${DEFAULT_THUMBNAIL_WIDTH};
            var DEFAULT_THUMBNAIL_HEIGHT = ${DEFAULT_THUMBNAIL_HEIGHT};
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
        });`;
}

/**
 * Generate the complete HTML document template
 * @param {Object} options - Template options
 * @param {string} options.currentDateTime - Current date and time
 * @param {string} options.sortBy - Current sort selection
 * @param {string} options.filterDescription - Description of applied filters
 * @param {string} options.searchDescription - Description of search filter
 * @param {string} options.lastUsedDescription - Description of last used filter
 * @param {string} options.sortDescription - Description of sort criteria
 * @param {Array} options.allModels - All models array
 * @param {Array} options.checkpointModels - Checkpoint models array
 * @param {Array} options.loraModels - LoRA models array
 * @param {string} options.folderFilter - Current folder filter
 * @returns {string} - Complete HTML document template
 */
export function generateHtmlDocumentStart(currentDateTime, cssStyles, clientJs) {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>SageUtils Model Report - ${currentDateTime}</title>
    <style>
${cssStyles}
    </style>
    <script>
${clientJs}
    </script>
</head>
<body>
`;
}

/**
 * Generate the HTML document end
 * @returns {string} - HTML document closing tags
 */
export function generateHtmlDocumentEnd() {
    return `
</body>
</html>
`;
}

/**
 * Generate table headers based on visible columns
 * @param {Array} visibleColumns - Array of visible column configurations
 * @returns {string} - HTML table headers
 */
export function generateTableHeaders(visibleColumns) {
    return visibleColumns.map(col => {
        const sortClass = col.sortable ? '' : ' class="sorttable_nosort"';
        return `            <th style="width:${col.width};"${sortClass}><b>${col.name}</b></th>`;
    }).join('\n');
}

/**
 * Generate section header for model types
 * @param {string} sectionTitle - Title of the section
 * @param {number} modelCount - Number of models in section
 * @returns {string} - HTML section header
 */
export function generateSectionHeader(sectionTitle, modelCount) {
    return `
    <div class="section-header">${sectionTitle} (${modelCount})</div>`;
}

/**
 * Generate table wrapper with headers
 * @param {Array} visibleColumns - Array of visible column configurations
 * @param {string} tableRows - HTML table rows content
 * @returns {string} - Complete HTML table
 */
export function generateTableWrapper(visibleColumns, tableRows) {
    return `
    <table class="sortable">
        <tr>
${generateTableHeaders(visibleColumns)}
        </tr>
        ${tableRows}
    </table>
`;
}

/**
 * Generate model statistics section
 */
export function generateModelStatsSection(currentDateTime, filterDescription, searchDescription, lastUsedDescription, sortDescription, allModels, checkpointModels, loraModels, folderFilter) {
    return `
    <h1>SageUtils Model Report</h1>
    <h2>Generated: ${currentDateTime}</h2>
        <div class="info">
        Filters Applied: ${filterDescription}${searchDescription}${lastUsedDescription}${sortDescription}<br>
        Total Models: ${allModels.length}${folderFilter === 'all' ? ` (${checkpointModels.length} Checkpoints, ${loraModels.length} LoRAs)` : ''}<br>
        <small style="color: #999; font-style: italic;">Click column headers to sort • Images load automatically from Civitai</small>
    </div>
`;
}

/**
 * Generate complete table section with headers and rows
 */
export function generateTableSection(sectionTitle, modelCount, tableRows, visibleColumns) {
    return `
    <div class="section-header">${sectionTitle} (${modelCount})</div>
    <table class="sortable">
        <tr>
${generateTableHeaders(visibleColumns)}
        </tr>
        ${tableRows}
    </table>
`;
}

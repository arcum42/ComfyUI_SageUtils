/**
 * HTML Templates and Client-Side Code for SageUtils Reports
 * Contains HTML document templates and client-side JavaScript
 */

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
                        header.classList.add('sortable-header');
                        header.addEventListener('click', () => sortTable(table, index));

                        const indicator = document.createElement('span');
                        indicator.className = 'sort-indicator';
                        indicator.innerHTML = ' ⇅';
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

            const headers = table.querySelectorAll('th');
            headers.forEach(header => {
                header.classList.remove('sorttable_sorted', 'sorttable_sorted_reverse');
                const indicator = header.querySelector('.sort-indicator');
                if (indicator) {
                    indicator.innerHTML = ' ⇅';
                    indicator.classList.remove('active');
                }
            });

            const currentHeader = headers[columnIndex];
            if (currentHeader) {
                currentHeader.classList.add(newDirection === 'asc' ? 'sorttable_sorted' : 'sorttable_sorted_reverse');
                const indicator = currentHeader.querySelector('.sort-indicator');
                if (indicator) {
                    indicator.innerHTML = newDirection === 'asc' ? ' ↑' : ' ↓';
                    indicator.classList.add('active');
                }
            }

            rows.sort((a, b) => {
                const cellA = a.cells[columnIndex];
                const cellB = b.cells[columnIndex];
                if (!cellA || !cellB) return 0;

                let valueA = cellA.getAttribute('sorttable_customkey');
                let valueB = cellB.getAttribute('sorttable_customkey');

                if (valueA && valueB) {
                    valueA = parseFloat(valueA);
                    valueB = parseFloat(valueB);
                } else {
                    valueA = cellA.textContent.trim();
                    valueB = cellB.textContent.trim();
                    const numA = parseFloat(valueA.replace(/[^\d.-]/g, ''));
                    const numB = parseFloat(valueB.replace(/[^\d.-]/g, ''));
                    if (!isNaN(numA) && !isNaN(numB)) {
                        valueA = numA;
                        valueB = numB;
                    }
                }

                let comparison = 0;
                if (valueA < valueB) comparison = -1;
                else if (valueA > valueB) comparison = 1;

                return newDirection === 'desc' ? -comparison : comparison;
            });

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
                img.classList.add('thumbnail-image-expanded');
                img.isExpanded = true;
                img.setAttribute('data-expanded', 'true');

                const backdrop = document.createElement('div');
                backdrop.className = 'report-image-backdrop';
                backdrop.addEventListener('click', () => toggleImageExpand(img));
                document.body.appendChild(backdrop);
                img.backdrop = backdrop;
            } else {
                img.classList.remove('thumbnail-image-expanded');
                img.isExpanded = false;
                img.removeAttribute('data-expanded');

                if (img.backdrop) {
                    document.body.removeChild(img.backdrop);
                    delete img.backdrop;
                }
            }
        }

        function makeContainerCompact(container) {
            container.classList.add('compact-thumbnail-container');
            let parentCell = container.parentElement;
            while (parentCell && parentCell.tagName !== 'TD') {
                parentCell = parentCell.parentElement;
            }
            if (parentCell && parentCell.classList.contains('image-cell')) {
                parentCell.classList.add('compact-image-cell');
            }
        }

        async function loadCivitaiImage(element) {
            let hash = element.getAttribute('data-civitai-hash');
            let apiUrl = element.getAttribute('data-civitai-url');
            let targetElement = element;
            if (!hash || !apiUrl) {
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
                    const appropriateImage = images.find(img => (img.nsfwLevel || 0) <= 1);
                    if (appropriateImage && appropriateImage.url) {
                        const imgElement = document.createElement('img');
                        imgElement.src = appropriateImage.url;
                        imgElement.className = 'thumbnail-image';
                        imgElement.alt = 'Model example image';
                        imgElement.loading = 'lazy';
                        imgElement.title = 'Click to expand/collapse';
                        imgElement.onerror = function() {
                            makeContainerCompact(this.parentElement);
                            this.parentElement.innerHTML = '<span class="thumbnail-placeholder-text">No image</span>';
                        };
                        imgElement.addEventListener('click', function(e) {
                            e.stopPropagation();
                            toggleImageExpand(this);
                        });
                        targetElement.innerHTML = '';
                        targetElement.appendChild(imgElement);
                    } else {
                        makeContainerCompact(targetElement);
                        targetElement.innerHTML = '<span class="thumbnail-placeholder-text">No image</span>';
                    }
                } else {
                    makeContainerCompact(targetElement);
                    targetElement.innerHTML = '<span class="thumbnail-placeholder-text">Not available</span>';
                }
            } catch (error) {
                console.debug('Failed to load Civitai image:', error);
                makeContainerCompact(targetElement);
                targetElement.innerHTML = '<span class="thumbnail-placeholder-text">Load failed</span>';
            }
        }

        function autoLoadImages() {
            const imageContainers = document.querySelectorAll('.auto-load-image');
            const compactContainers = document.querySelectorAll('.image-cell.compact').length;
            console.log('Loading ' + imageContainers.length + ' images from Civitai. ' + compactContainers + ' entries skipped due to previous failures.');
            imageContainers.forEach((container, index) => {
                setTimeout(() => {
                    loadCivitaiImage(container);
                }, index * 200);
            });
        }

        function initializePage() {
            makeSortable();
            autoLoadImages();
            applyInitialSort();
        }

        function applyInitialSort() {
            const columnIndex = getSortColumnIndex(INITIAL_SORT_BY);
            if (columnIndex >= 0) {
                const isDescending = isDescendingSort(INITIAL_SORT_BY);
                const tables = document.querySelectorAll('table.sortable');
                tables.forEach(table => {
                    const headers = table.querySelectorAll('th');
                    if (headers[columnIndex] && !headers[columnIndex].classList.contains('sorttable_nosort')) {
                        const tableId = table.id || 'table_' + Math.random().toString(36).substr(2, 9);
                        if (!table.id) table.id = tableId;
                        const sortKey = tableId + '_' + columnIndex;
                        sortDirection[sortKey] = isDescending ? 'asc' : 'desc';
                        sortTable(table, columnIndex);
                    }
                });
            }
        }

        document.addEventListener('DOMContentLoaded', initializePage);
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializePage);
        } else {
            initializePage();
        }

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
    `;
}

/**
 * Generate HTML document start with external CSS and JavaScript
 * @param {string} currentDateTime - Current date/time string
 * @param {string} clientJs - Client-side JavaScript content
 * @param {string} cssHref - CSS href for the report stylesheet
 * @returns {string} - HTML document start
 */
export function generateHtmlDocumentStart(currentDateTime, clientJs, cssHref) {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>SageUtils Model Report - ${currentDateTime}</title>
    <link rel="stylesheet" href="${cssHref}">
    <script>
${clientJs}
    </script>
</head>
<body>
`;
}

export function generateHtmlDocumentEnd() {
    return `
</body>
</html>
`;
}

export function generateTableHeaders(visibleColumns) {
    return visibleColumns.map(col => {
        const sortClass = col.sortable ? '' : ' sorttable_nosort';
        return `            <th class="report-col-${col.key}${sortClass}"><b>${col.name}</b></th>`;
    }).join('\n');
}

export function generateSectionHeader(sectionTitle, modelCount) {
    return `
    <div class="section-header">${sectionTitle} (${modelCount})</div>`;
}

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

export function generateModelStatsSection(currentDateTime, filterDescription, searchDescription, lastUsedDescription, sortDescription, allModels, checkpointModels, loraModels, folderFilter) {
    return `
    <h1>SageUtils Model Report</h1>
    <h2>Generated: ${currentDateTime}</h2>
    <div class="info report-summary">
        Filters Applied: ${filterDescription}${searchDescription}${lastUsedDescription}${sortDescription}<br>
        Total Models: ${allModels.length}${folderFilter === 'all' ? ` (${checkpointModels.length} Checkpoints, ${loraModels.length} LoRAs)` : ''}<br>
        <span class="report-summary-notice">📷 Auto Images</span> - Cached images shown immediately, others load automatically<br>
        <small class="report-summary-muted">Click column headers to sort • Images load automatically from Civitai</small>
    </div>`;
}

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

/**
 * Civitai Search Tab
 * Provides search functionality for discovering and downloading models from Civitai
 */

import {
    getModelUrl,
    getDownloadUrl
} from '../shared/civitai.js';

import { 
    alertDialog,
    confirmDialog,
    createDialog
} from '../components/dialogManager.js';

import { createButton, BUTTON_VARIANTS } from '../components/buttons.js';
import { loadSidebarStyle } from './sidebarStyles.js';

import { escapeHtml, formatFileSize } from '../reports/reportGenerator.js';

/**
 * Configuration for Civitai search
 */
const SEARCH_CONFIG = {
    API_BASE: 'https://civitai.com/api/v1',
    DEFAULT_LIMIT: 20,
    MAX_NSFW_LEVEL: 1,
    SUPPORTED_TYPES: ['Checkpoint', 'LORA', 'LyCORIS', 'TextualInversion', 'VAE', 'Controlnet'],
    SORT_OPTIONS: ['Highest Rated', 'Most Downloaded', 'Newest', 'Most Liked'],
    PERIOD_OPTIONS: ['AllTime', 'Year', 'Month', 'Week', 'Day']
};

/**
 * Creates the Civitai search tab content
 * @param {HTMLElement} container - Container element for the tab content
 */
export function createCivitaiSearchTab(container) {
    container.innerHTML = '';
    
    loadSidebarStyle('civitai-search-styles', 'extensions/comfyui_sageutils/sidebar/civitaiSearchTab.css');
    
    // Create main layout
    const searchContainer = document.createElement('div');
    searchContainer.className = 'civitai-search-tab';
    
    // Create search form
    const searchForm = createSearchForm();
    
    // Create results container
    const resultsContainer = document.createElement('div');
    resultsContainer.id = 'civitai-results';
    resultsContainer.className = 'civitai-results-container';
    
    // Initial message
    resultsContainer.innerHTML = `
        <div class="civitai-search-status-panel">
            <h3 class="civitai-search-status-title">🔍 Civitai Model Search</h3>
            <p>Search for models on Civitai to discover and download new content.</p>
            <p>Use the search form above to find models by name, type, or creator.</p>
        </div>
    `;
    
    searchContainer.appendChild(searchForm);
    searchContainer.appendChild(resultsContainer);
    
    container.appendChild(searchContainer);
    
    // Set up search functionality
    setupSearchHandlers(searchForm, resultsContainer);
}

/**
 * Creates the search form with filters
 * @returns {HTMLElement} Search form element
 */
function createSearchForm() {
    const form = document.createElement('div');
    form.className = 'civitai-search-form';
    
    // Search input
    const searchGroup = document.createElement('div');
    searchGroup.className = 'civitai-search-group';
    searchGroup.innerHTML = `
        <label class="civitai-search-label" for="civitai-search-input">Search Query:</label>
        <input type="text" id="civitai-search-input" class="civitai-search-input" placeholder="Enter model name, creator, or keywords...">
    `;
    
    // Type filter
    const typeGroup = document.createElement('div');
    typeGroup.className = 'civitai-search-group';
    typeGroup.innerHTML = `
        <label class="civitai-search-label" for="civitai-type-filter">Type:</label>
        <select id="civitai-type-filter" class="civitai-search-select">
            <option value="">All Types</option>
            ${SEARCH_CONFIG.SUPPORTED_TYPES.map(type => `<option value="${type}">${type}</option>`).join('')}
        </select>
    `;
    
    // Sort filter
    const sortGroup = document.createElement('div');
    sortGroup.className = 'civitai-search-group';
    sortGroup.innerHTML = `
        <label class="civitai-search-label" for="civitai-sort-filter">Sort:</label>
        <select id="civitai-sort-filter" class="civitai-search-select">
            ${SEARCH_CONFIG.SORT_OPTIONS.map(sort => `<option value="${sort}">${sort}</option>`).join('')}
        </select>
    `;
    
    // Search button row
    const buttonRow = document.createElement('div');
    buttonRow.className = 'civitai-search-button-row';
    
    // Search button
    const searchButton = createButton('Search', {
        id: 'civitai-search-button',
        variant: BUTTON_VARIANTS.SUCCESS,
        className: 'civitai-search-button'
    });
    
    // NSFW toggle
    const nsfwToggle = document.createElement('label');
    nsfwToggle.className = 'civitai-nsfw-toggle';
    nsfwToggle.innerHTML = `
        <input type="checkbox" id="civitai-nsfw-toggle">
        Include NSFW Results
    `;
    
    // Results per page
    const limitGroup = document.createElement('div');
    limitGroup.className = 'civitai-limit-group';
    limitGroup.innerHTML = `
        <label class="civitai-search-label" for="civitai-limit-select">Results:</label>
        <select id="civitai-limit-select" class="civitai-search-select">
            <option value="10">10</option>
            <option value="20" selected>20</option>
            <option value="50">50</option>
            <option value="100">100</option>
        </select>
    `;
    
    buttonRow.appendChild(searchButton);
    buttonRow.appendChild(nsfwToggle);
    buttonRow.appendChild(limitGroup);
    
    form.appendChild(searchGroup);
    form.appendChild(typeGroup);
    form.appendChild(sortGroup);
    form.appendChild(buttonRow);
    
    return form;
}

/**
 * Sets up event handlers for search functionality
 * @param {HTMLElement} searchForm - Search form element
 * @param {HTMLElement} resultsContainer - Results container element
 */
function setupSearchHandlers(searchForm, resultsContainer) {
    const searchInput = searchForm.querySelector('#civitai-search-input');
    const searchButton = searchForm.querySelector('#civitai-search-button');
    const typeFilter = searchForm.querySelector('#civitai-type-filter');
    const sortFilter = searchForm.querySelector('#civitai-sort-filter');
    const nsfwToggle = searchForm.querySelector('#civitai-nsfw-toggle');
    const limitSelect = searchForm.querySelector('#civitai-limit-select');
    
    // Pagination state
    let currentSearchParams = null;
    let currentMetadata = null;
    let currentResults = [];
    
    // Pagination function
    async function performSearchWithPagination(cursor = null, isNewSearch = true) {
        const query = searchInput.value.trim();
        const modelType = typeFilter.value;
        const sort = sortFilter.value;
        const includeNsfw = nsfwToggle.checked;
        const limit = parseInt(limitSelect.value);
        
        if (isNewSearch && !query && !modelType) {
            alertDialog('Please enter a search query or select a model type.', 'Search Required');
            return;
        }
        
        // Use current search params for pagination, new params for new searches
        const searchParams = isNewSearch ? {
            query,
            types: modelType ? [modelType] : undefined,
            sort,
            nsfw: includeNsfw,
            limit
        } : currentSearchParams;
        
        if (cursor) {
            searchParams.cursor = cursor;
        }
        
        // Show loading state
        const loadingButton = cursor ? 
            resultsContainer.querySelector('#next-page-btn') || searchButton : 
            searchButton;
        
        loadingButton.disabled = true;
        const originalText = loadingButton.textContent;
        loadingButton.textContent = cursor ? 'Loading...' : 'Searching...';
        
        if (isNewSearch) {
            resultsContainer.innerHTML = `
                <div class="civitai-search-status-panel">
                    <div class="civitai-search-status-icon">🔍</div>
                    <h3 class="civitai-search-status-title">Civitai Model Search</h3>
                    <p>Search for models on Civitai to discover and download new content.</p>
                    <p>Use the search form above to find models by name, type, or creator.</p>
                </div>
            `;
        }
        
        try {
            const response = await searchCivitaiModels(searchParams);
            
            if (isNewSearch) {
                currentSearchParams = searchParams;
                currentResults = response.items;
                currentMetadata = response.metadata;
            } else {
                // Append results for pagination
                currentResults = [...currentResults, ...response.items];
                currentMetadata = response.metadata;
            }
            
            displaySearchResults(resultsContainer, currentResults, { 
                includeNsfw,
                metadata: currentMetadata,
                onNextPage: currentMetadata && currentMetadata.nextCursor ? 
                    () => performSearchWithPagination(currentMetadata.nextCursor, false) : null
            });
            
        } catch (error) {
            console.error('Civitai search error:', error);
            resultsContainer.innerHTML = `
                <div class="civitai-search-status-panel civitai-search-status-error">
                    <h3 class="civitai-search-status-title">❌ Search Failed</h3>
                    <p>Failed to search Civitai: ${escapeHtml(error.message)}</p>
                    <p class="civitai-search-status-note">Please check your internet connection and try again.</p>
                </div>
            `;
        } finally {
            loadingButton.disabled = false;
            loadingButton.textContent = originalText;
        }
    }
    
    // Search function (wrapper for new searches)
    async function performSearch() {
        await performSearchWithPagination(null, true);
    }
    
    // Event listeners
    searchButton.addEventListener('click', performSearch);
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
}

/**
 * Searches Civitai for models using the API
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Response object with items and metadata
 */
async function searchCivitaiModels(options) {
    const {
        query = '',
        types = [],
        sort = 'Most Downloaded',
        nsfw = false,
        limit = 20,
        page = 1,
        cursor = null
    } = options;
    
    // Build API URL
    const apiUrl = new URL(`${SEARCH_CONFIG.API_BASE}/models`);
    
    if (query) apiUrl.searchParams.set('query', query);
    if (types.length > 0) apiUrl.searchParams.set('types', types.join(','));
    if (sort) apiUrl.searchParams.set('sort', sort);
    if (!nsfw) apiUrl.searchParams.set('nsfw', 'false');
    if (limit) apiUrl.searchParams.set('limit', limit.toString());
    
    // Handle pagination: cursor for search queries, page for browsing
    if (query && cursor) {
        apiUrl.searchParams.set('cursor', cursor);
    } else if (!query && page) {
        apiUrl.searchParams.set('page', page.toString());
    }
    
    console.log('Searching Civitai:', apiUrl.toString());
    
    const response = await fetch(apiUrl.toString());
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
        items: data.items || [],
        metadata: data.metadata || null
    };
}

/**
 * Displays search results in the container
 * @param {HTMLElement} container - Results container
 * @param {Array} results - Search results from Civitai API
 * @param {Object} options - Display options
 */
function displaySearchResults(container, results, options = {}) {
    const { includeNsfw = false, metadata = null, onNextPage = null } = options;

    if (!results || results.length === 0) {
        container.innerHTML = `
            <div class="civitai-search-status-panel">
                <h3 class="civitai-search-status-title">No Results Found</h3>
                <p>No models found matching your search criteria.</p>
                <p>Try adjusting your search terms or filters.</p>
            </div>
        `;
        return;
    }

    const header = document.createElement('div');
    header.className = 'civitai-results-header';

    const headerText = document.createElement('div');
    headerText.innerHTML = `
        <h3 class="civitai-results-header-title">Found ${results.length} models${metadata && metadata.totalItems ? ` (${metadata.totalItems} total)` : ''}</h3>
        <p class="civitai-results-subtitle">Click on any model to view details and download options</p>
    `;
    header.appendChild(headerText);

    if (metadata) {
        const paginationInfo = document.createElement('div');
        paginationInfo.className = 'civitai-results-pagination-info';

        if (metadata.currentPage) {
            paginationInfo.innerHTML = `
                <div>Page ${metadata.currentPage}${metadata.totalPages ? ` of ${metadata.totalPages}` : ''}</div>
                <div class="civitai-results-pagination-detail">${metadata.pageSize || results.length} per page</div>
            `;
        } else if (metadata.nextCursor) {
            paginationInfo.innerHTML = `
                <div>Cursor-based pagination</div>
                <div class="civitai-results-pagination-detail">More results available</div>
            `;
        }

        header.appendChild(paginationInfo);
    }

    const resultsGrid = document.createElement('div');
    resultsGrid.className = 'civitai-results-grid';

    results.forEach(model => {
        const modelCard = createModelCard(model, { includeNsfw });
        resultsGrid.appendChild(modelCard);
    });

    const paginationControls = document.createElement('div');
    paginationControls.className = 'civitai-pagination-controls';

    if (onNextPage) {
        const nextButton = createButton('📄 Load More Results', {
            id: 'next-page-btn',
            variant: BUTTON_VARIANTS.SUCCESS,
            onClick: onNextPage,
            className: 'civitai-pagination-button'
        });

        paginationControls.appendChild(nextButton);

        const paginationHint = document.createElement('span');
        paginationHint.className = 'civitai-pagination-hint';
        paginationHint.textContent = 'Results will be appended below current results';
        paginationControls.appendChild(paginationHint);
    } else {
        const endMessage = document.createElement('span');
        endMessage.className = 'civitai-pagination-end-message';
        endMessage.textContent = '🏁 End of results reached';
        paginationControls.appendChild(endMessage);
    }

    container.innerHTML = '';
    container.appendChild(header);
    container.appendChild(resultsGrid);
    container.appendChild(paginationControls);
}

function createModelCard(model, options = {}) {
    const { includeNsfw = false } = options;

    const card = document.createElement('div');
    card.className = 'civitai-model-card';

    const modelName = model.name || 'Unknown Model';
    const creator = model.creator ? model.creator.username : 'Unknown';
    const type = model.type || 'Unknown';
    const description = model.description ? stripHtml(model.description).substring(0, 100) + '...' : 'No description available';
    const stats = model.stats || {};
    const latestVersion = model.modelVersions && model.modelVersions[0];
    const trainedWords = latestVersion ? latestVersion.trainedWords || [] : [];

    let imageUrl = null;
    if (latestVersion && latestVersion.images) {
        const appropriateImage = latestVersion.images.find(img =>
            includeNsfw || (img.nsfwLevel || 0) <= SEARCH_CONFIG.MAX_NSFW_LEVEL
        );
        if (appropriateImage) {
            imageUrl = appropriateImage.url;
        }
    }

    card.innerHTML = `
        <div class="civitai-model-card-inner">
            <div class="civitai-model-card-image">
                ${imageUrl ? 
                    `<img src="${escapeHtml(imageUrl)}" class="civitai-model-card-image-img" alt="Model preview" loading="lazy">` :
                    `<div class="civitai-model-card-no-image">No Image</div>`
                }
            </div>
            <div class="civitai-model-card-content">
                <h4 class="civitai-model-card-title">${escapeHtml(modelName)}</h4>
                <p class="civitai-model-card-meta">by ${escapeHtml(creator)} • ${escapeHtml(type)}</p>
                <p class="civitai-model-card-description">${escapeHtml(description)}</p>

                <div class="civitai-model-card-stats-row">
                    <div class="civitai-model-card-stats">
                        ${stats.downloadCount ? `<span>📥 ${stats.downloadCount.toLocaleString()}</span>` : ''}
                        ${stats.favoriteCount ? `<span>❤️ ${stats.favoriteCount.toLocaleString()}</span>` : ''}
                        ${stats.rating ? `<span>⭐ ${stats.rating.toFixed(1)}</span>` : ''}
                    </div>
                    ${trainedWords.length > 0 ? `<div class="civitai-model-card-triggers">🏷️ ${trainedWords.length} triggers</div>` : ''}
                </div>

                <div class="civitai-model-card-actions">
                    <div class="civitai-card-btn-group">
                        <button class="civitai-card-btn civitai-details-btn">📖 Details</button>
                        ${latestVersion ? `<button class="civitai-card-btn civitai-download-btn" data-version-id="${latestVersion.id}" data-version-name="${escapeHtml(latestVersion.name || 'Latest Version')}" data-model-id="${model.id}">📥 Download Latest</button>` : ''}
                    </div>
                    ${latestVersion && latestVersion.files && latestVersion.files[0] ? `<div class="civitai-card-stats-small">${formatFileSize((latestVersion.files[0].sizeKB || 0) * 1024)}</div>` : ''}
                </div>
            </div>
        </div>
    `;

    const detailsBtn = card.querySelector('.civitai-details-btn');
    const downloadBtn = card.querySelector('.civitai-download-btn');
    const contentArea = card.querySelector('.civitai-model-card-content');

    if (detailsBtn) {
        detailsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showModelDetails(model, { includeNsfw });
        });
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const versionId = downloadBtn.dataset.versionId;
            const versionName = downloadBtn.dataset.versionName;
            const modelId = downloadBtn.dataset.modelId;
            downloadModel(versionId, versionName, modelId);
        });
    }

    if (contentArea) {
        const textElements = contentArea.querySelectorAll('h4, p');
        textElements.forEach(element => {
            element.addEventListener('click', () => showModelDetails(model, { includeNsfw }));
        });
    }

    return card;
}

function showModelDetails(model, options = {}) {
    const { includeNsfw = false } = options;

    const modelName = model.name || 'Unknown Model';
    const creator = model.creator ? model.creator.username : 'Unknown';
    const type = model.type || 'Unknown';
    const description = model.description || 'No description available';
    const stats = model.stats || {};
    const versions = model.modelVersions || [];

    const content = document.createElement('div');
    content.className = 'civitai-dialog-content';

    const header = document.createElement('div');
    header.className = 'civitai-dialog-header';
    header.innerHTML = `
        <h2 class="civitai-dialog-title">${escapeHtml(modelName)}</h2>
        <div class="civitai-dialog-meta">
            <div>
                <span class="civitai-dialog-meta-label">by</span> <strong class="civitai-dialog-meta-creator">${escapeHtml(creator)}</strong>
                <span class="civitai-dialog-meta-label">Type:</span> <strong class="civitai-dialog-meta-type">${escapeHtml(type)}</strong>
            </div>
            <a href="${getModelUrl(model.id)}" target="_blank" class="civitai-dialog-link">View on Civitai →</a>
        </div>
        <div class="civitai-dialog-stats">
            ${stats.downloadCount ? `<span>📥 ${stats.downloadCount.toLocaleString()} downloads</span>` : ''}
            ${stats.favoriteCount ? `<span>❤️ ${stats.favoriteCount.toLocaleString()} favorites</span>` : ''}
            ${stats.rating ? `<span>⭐ ${stats.rating.toFixed(1)} rating</span>` : ''}
            ${stats.commentCount ? `<span>💬 ${stats.commentCount.toLocaleString()} comments</span>` : ''}
        </div>
    `;

    const descriptionSection = document.createElement('div');
    descriptionSection.className = 'civitai-dialog-description';
    descriptionSection.innerHTML = `
        <h3 class="civitai-dialog-description-title">Description</h3>
        <div class="civitai-dialog-description-text">${escapeHtml(stripHtml(description))}</div>
    `;

    const versionsSection = document.createElement('div');
    versionsSection.className = 'civitai-versions-section';

    if (versions.length > 0) {
        versionsSection.innerHTML = `
            <h3 class="civitai-versions-title">Available Versions (${versions.length})</h3>
        `;

        versions.forEach((version, index) => {
            const versionCard = createVersionCard(version, model.id, { includeNsfw, isLatest: index === 0 });
            versionsSection.appendChild(versionCard);
        });
    }

    content.appendChild(header);
    content.appendChild(descriptionSection);
    content.appendChild(versionsSection);

    const dialog = createDialog({
        title: `${modelName} - Civitai Model Details`,
        content: content,
        width: '900px'
    });

    dialog.addFooterButton('Close', () => dialog.close(), { backgroundColor: '#666' });
    dialog.show();
}

function createVersionCard(version, modelId, options = {}) {
    const { includeNsfw = false, isLatest = false } = options;

    const card = document.createElement('div');
    card.className = `civitai-version-card${isLatest ? ' latest' : ''}`;

    const versionName = version.name || 'Unnamed Version';
    const createdAt = version.createdAt ? new Date(version.createdAt).toLocaleDateString() : 'Unknown date';
    const trainedWords = version.trainedWords || [];
    const files = version.files || [];
    const primaryFile = files.find(f => f.primary) || files[0];

    const images = version.images || [];
    const appropriateImages = images.filter(img => includeNsfw || (img.nsfwLevel || 0) <= SEARCH_CONFIG.MAX_NSFW_LEVEL).slice(0, 3);

    card.innerHTML = `
        <div class="civitai-version-header">
            <div class="civitai-version-info">
                <h4 class="civitai-version-title">${escapeHtml(versionName)}${isLatest ? ' <span class="civitai-version-badge">LATEST</span>' : ''}</h4>
                <p class="civitai-version-subtitle">Released: ${createdAt}</p>
                ${version.description ? `<p class="civitai-version-description">${escapeHtml(version.description)}</p>` : ''}
                ${trainedWords.length > 0 ? `
                    <div class="civitai-trigger-words-group">
                        <strong class="civitai-trigger-words-title">Trigger Words:</strong>
                        <div class="civitai-trigger-words">${trainedWords.map(word => `<span class="civitai-trigger-word">${escapeHtml(word)}</span>`).join('')}</div>
                    </div>
                ` : ''}
                ${primaryFile ? `
                    <div class="civitai-version-file-info">
                        <span>File Size:</span> ${formatFileSize(primaryFile.sizeKB * 1024)}
                        ${primaryFile.metadata ? `
                            ${primaryFile.metadata.format ? `<span>Format:</span> ${primaryFile.metadata.format}` : ''}
                            ${primaryFile.metadata.fp ? `<span>Precision:</span> ${primaryFile.metadata.fp}` : ''}
                        ` : ''}
                    </div>
                ` : ''}
            </div>
            <div class="civitai-version-download-container">
                <button class="civitai-version-download-button" data-version-id="${version.id}" data-version-name="${escapeHtml(versionName)}" data-model-id="${modelId}">📥 Download</button>
            </div>
        </div>
        ${appropriateImages.length > 0 ? `
            <div class="civitai-version-images">
                ${appropriateImages.map(img => `<img src="${escapeHtml(img.url)}" class="civitai-version-image" data-image-url="${escapeHtml(img.url)}" alt="Example image" loading="lazy">`).join('')}
            </div>
        ` : ''}
    `;

    const downloadBtn = card.querySelector('.civitai-version-download-button');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const versionId = downloadBtn.dataset.versionId;
            const versionName = downloadBtn.dataset.versionName;
            const modelId = downloadBtn.dataset.modelId;
            downloadModel(versionId, versionName, modelId);
        });
    }

    const imageElements = card.querySelectorAll('.civitai-version-image');
    imageElements.forEach(img => {
        img.addEventListener('click', () => showImageExpanded(img.dataset.imageUrl));
    });

    return card;
}

window.downloadModel = async function(versionId, versionName, modelId) {
    try {
        const confirmed = await confirmDialog(
            `Download "${versionName}"?

This will open the download link in a new tab. The file will be downloaded through your browser.`,
            'Download Model'
        );

        if (confirmed) {
            const downloadUrl = getDownloadUrl(versionId);
            window.open(downloadUrl, '_blank');

            setTimeout(() => {
                alertDialog(
                    `Download started! The file should begin downloading shortly.

Save it to your ComfyUI models directory and refresh the cache to see it in the sidebar.`,
                    'Download Started'
                );
            }, 1000);
        }
    } catch (error) {
        console.error('Download error:', error);
        alertDialog(`Failed to start download: ${error.message}`, 'Download Error');
    }
};

window.showImageExpanded = function(imageUrl) {
    const overlay = document.createElement('div');
    overlay.className = 'civitai-image-overlay';

    const img = document.createElement('img');
    img.src = imageUrl;
    img.className = 'civitai-image-expanded';

    overlay.appendChild(img);
    overlay.addEventListener('click', () => document.body.removeChild(overlay));

    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);

    document.body.appendChild(overlay);
};
function stripHtml(html) {
    if (typeof html !== 'string') return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

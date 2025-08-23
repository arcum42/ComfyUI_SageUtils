/**
 * Civitai Search Tab
 * Provides search functionality for discovering and downloading models from Civitai
 */

import { 
    getCivitaiImageApiUrl,
    getModelUrl,
    getDownloadUrl,
    formatTriggerWords,
    extractImageUrls,
    NSFW_LEVELS
} from '../shared/civitai.js';

import { 
    alertDialog,
    confirmDialog,
    createDialog
} from '../shared/dialogManager.js';

import { escapeHtml, formatFileSize } from '../shared/reportGenerator.js';

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
    
    // Add CSS animations if not already added
    if (!document.getElementById('civitai-search-styles')) {
        const style = document.createElement('style');
        style.id = 'civitai-search-styles';
        style.textContent = `
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
            
            .civitai-search-result {
                animation: fadeInUp 0.3s ease-out;
            }
            
            .civitai-search-loading {
                animation: pulse 1.5s ease-in-out infinite;
            }
            
            .civitai-hover-scale {
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            
            .civitai-hover-scale:hover {
                transform: scale(1.02);
                box-shadow: 0 4px 15px rgba(76, 175, 80, 0.2);
            }
            
            .civitai-card-btn {
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            
            .civitai-card-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            }
            
            .civitai-card-btn:active {
                transform: translateY(0);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
        `;
        document.head.appendChild(style);
    }
    
    // Create main layout
    const searchContainer = document.createElement('div');
    searchContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #1a1a1a;
        color: white;
    `;
    
    // Create search form
    const searchForm = createSearchForm();
    
    // Create results container
    const resultsContainer = document.createElement('div');
    resultsContainer.id = 'civitai-results';
    resultsContainer.style.cssText = `
        flex: 1;
        overflow-y: auto;
        padding: 15px;
        background: #1a1a1a;
    `;
    
    // Initial message
    resultsContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #888; font-style: italic;">
            <h3 style="color: #569cd6; margin-bottom: 15px;">🔍 Civitai Model Search</h3>
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
    form.style.cssText = `
        padding: 15px;
        background: #2a2a2a;
        border-bottom: 2px solid #4CAF50;
        display: grid;
        grid-template-columns: 1fr 150px 150px;
        gap: 10px;
        align-items: end;
    `;
    
    // Search input
    const searchGroup = document.createElement('div');
    searchGroup.innerHTML = `
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #ccc;">Search Query:</label>
        <input type="text" id="civitai-search-input" placeholder="Enter model name, creator, or keywords..." 
               style="width: 100%; padding: 8px; background: #1a1a1a; border: 1px solid #444; border-radius: 4px; color: white;">
    `;
    
    // Type filter
    const typeGroup = document.createElement('div');
    typeGroup.innerHTML = `
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #ccc;">Type:</label>
        <select id="civitai-type-filter" style="width: 100%; padding: 8px; background: #1a1a1a; border: 1px solid #444; border-radius: 4px; color: white;">
            <option value="">All Types</option>
            ${SEARCH_CONFIG.SUPPORTED_TYPES.map(type => `<option value="${type}">${type}</option>`).join('')}
        </select>
    `;
    
    // Sort filter
    const sortGroup = document.createElement('div');
    sortGroup.innerHTML = `
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #ccc;">Sort:</label>
        <select id="civitai-sort-filter" style="width: 100%; padding: 8px; background: #1a1a1a; border: 1px solid #444; border-radius: 4px; color: white;">
            ${SEARCH_CONFIG.SORT_OPTIONS.map(sort => `<option value="${sort}">${sort}</option>`).join('')}
        </select>
    `;
    
    // Search button row
    const buttonRow = document.createElement('div');
    buttonRow.style.cssText = `
        grid-column: 1 / -1;
        display: flex;
        gap: 10px;
        align-items: center;
        margin-top: 10px;
    `;
    
    // Search button
    const searchButton = document.createElement('button');
    searchButton.id = 'civitai-search-button';
    searchButton.textContent = 'Search';
    searchButton.style.cssText = `
        padding: 8px 20px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
    `;
    
    // NSFW toggle
    const nsfwToggle = document.createElement('label');
    nsfwToggle.style.cssText = `
        display: flex;
        align-items: center;
        color: #ccc;
        cursor: pointer;
        margin-left: 20px;
    `;
    nsfwToggle.innerHTML = `
        <input type="checkbox" id="civitai-nsfw-toggle" style="margin-right: 8px;">
        Include NSFW Results
    `;
    
    // Results per page
    const limitGroup = document.createElement('div');
    limitGroup.style.cssText = `
        display: flex;
        align-items: center;
        margin-left: auto;
        color: #ccc;
    `;
    limitGroup.innerHTML = `
        <label style="margin-right: 8px;">Results:</label>
        <select id="civitai-limit-select" style="padding: 4px; background: #1a1a1a; border: 1px solid #444; border-radius: 4px; color: white;">
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
                <div class="civitai-search-loading" style="text-align: center; padding: 40px; color: #888; font-style: italic;">
                    <div style="margin-bottom: 15px; font-size: 20px;">🔍</div>
                    <div style="margin-bottom: 10px;">Searching Civitai...</div>
                    <div style="font-size: 14px;">This may take a moment...</div>
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
                <div style="text-align: center; padding: 40px; color: #f44336;">
                    <h3 style="color: #f44336; margin-bottom: 15px;">❌ Search Failed</h3>
                    <p>Failed to search Civitai: ${escapeHtml(error.message)}</p>
                    <p style="font-size: 12px; color: #888; margin-top: 10px;">Please check your internet connection and try again.</p>
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
    
    // Button hover effects
    searchButton.addEventListener('mouseenter', () => {
        if (!searchButton.disabled) {
            searchButton.style.background = '#45a049';
        }
    });
    
    searchButton.addEventListener('mouseleave', () => {
        if (!searchButton.disabled) {
            searchButton.style.background = '#4CAF50';
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
            <div style="text-align: center; padding: 40px; color: #888; font-style: italic;">
                <h3 style="color: #569cd6; margin-bottom: 15px;">No Results Found</h3>
                <p>No models found matching your search criteria.</p>
                <p>Try adjusting your search terms or filters.</p>
            </div>
        `;
        return;
    }
    
    // Create results header
    const header = document.createElement('div');
    header.style.cssText = `
        margin-bottom: 20px;
        padding: 10px;
        background: #2a2a2a;
        border-radius: 4px;
        border-left: 4px solid #4CAF50;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    
    const headerText = document.createElement('div');
    headerText.innerHTML = `
        <h3 style="margin: 0; color: #4CAF50;">Found ${results.length} models${metadata && metadata.totalItems ? ` (${metadata.totalItems} total)` : ''}</h3>
        <p style="margin: 5px 0 0 0; color: #888; font-size: 14px;">Click on any model to view details and download options</p>
    `;
    
    header.appendChild(headerText);
    
    // Add pagination info if available
    if (metadata) {
        const paginationInfo = document.createElement('div');
        paginationInfo.style.cssText = `
            text-align: right;
            color: #888;
            font-size: 12px;
        `;
        
        if (metadata.currentPage) {
            paginationInfo.innerHTML = `
                <div>Page ${metadata.currentPage}${metadata.totalPages ? ` of ${metadata.totalPages}` : ''}</div>
                <div style="margin-top: 2px;">${metadata.pageSize || results.length} per page</div>
            `;
        } else if (metadata.nextCursor) {
            paginationInfo.innerHTML = `
                <div>Cursor-based pagination</div>
                <div style="margin-top: 2px;">More results available</div>
            `;
        }
        
        header.appendChild(paginationInfo);
    }
    
    // Create results grid
    const resultsGrid = document.createElement('div');
    resultsGrid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
    `;
    
    results.forEach(model => {
        const modelCard = createModelCard(model, { includeNsfw });
        resultsGrid.appendChild(modelCard);
    });
    
    // Create pagination controls
    const paginationControls = document.createElement('div');
    paginationControls.style.cssText = `
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 15px;
        padding: 20px;
        background: #2a2a2a;
        border-radius: 4px;
        border-top: 2px solid #4CAF50;
    `;
    
    // Add Next button if more pages available
    if (onNextPage) {
        const nextButton = document.createElement('button');
        nextButton.id = 'next-page-btn';
        nextButton.textContent = '📄 Load More Results';
        nextButton.style.cssText = `
            padding: 10px 20px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
            transition: background 0.3s ease;
        `;
        
        nextButton.addEventListener('click', onNextPage);
        
        nextButton.addEventListener('mouseenter', () => {
            if (!nextButton.disabled) {
                nextButton.style.background = '#45a049';
            }
        });
        
        nextButton.addEventListener('mouseleave', () => {
            if (!nextButton.disabled) {
                nextButton.style.background = '#4CAF50';
            }
        });
        
        paginationControls.appendChild(nextButton);
        
        // Add pagination hint
        const paginationHint = document.createElement('span');
        paginationHint.style.cssText = `
            color: #888;
            font-size: 12px;
            font-style: italic;
        `;
        paginationHint.textContent = 'Results will be appended below current results';
        paginationControls.appendChild(paginationHint);
    } else {
        // No more pages available
        const endMessage = document.createElement('span');
        endMessage.style.cssText = `
            color: #888;
            font-size: 14px;
            font-style: italic;
        `;
        endMessage.textContent = '🏁 End of results reached';
        paginationControls.appendChild(endMessage);
    }
    
    container.innerHTML = '';
    container.appendChild(header);
    container.appendChild(resultsGrid);
    container.appendChild(paginationControls);
}

/**
 * Creates a model card for display in search results
 * @param {Object} model - Model data from Civitai API
 * @param {Object} options - Display options
 * @returns {HTMLElement} Model card element
 */
function createModelCard(model, options = {}) {
    const { includeNsfw = false } = options;
    
    const card = document.createElement('div');
    card.className = 'civitai-search-result civitai-hover-scale';
    card.style.cssText = `
        background: #2a2a2a;
        border-radius: 8px;
        padding: 15px;
        cursor: pointer;
        transition: all 0.3s ease;
        border: 1px solid #444;
    `;
    
    // Hover effects
    card.addEventListener('mouseenter', () => {
        card.style.background = '#333';
        card.style.borderColor = '#4CAF50';
        card.style.transform = 'translateY(-2px)';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.background = '#2a2a2a';
        card.style.borderColor = '#444';
        card.style.transform = 'translateY(0)';
    });
    
    // Get model information
    const modelName = model.name || 'Unknown Model';
    const creator = model.creator ? model.creator.username : 'Unknown';
    const type = model.type || 'Unknown';
    const description = model.description ? stripHtml(model.description).substring(0, 100) + '...' : 'No description available';
    const stats = model.stats || {};
    const latestVersion = model.modelVersions && model.modelVersions[0];
    const trainedWords = latestVersion ? latestVersion.trainedWords || [] : [];
    
    // Get first appropriate image
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
        <div style="display: flex; gap: 15px;">
            <div style="flex-shrink: 0;">
                ${imageUrl ? 
                    `<img src="${escapeHtml(imageUrl)}" 
                         style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; background: #1a1a1a;" 
                         alt="Model preview" loading="lazy">` :
                    `<div style="width: 80px; height: 80px; background: #1a1a1a; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #666; font-size: 12px;">No Image</div>`
                }
            </div>
            <div style="flex: 1; min-width: 0;">
                <h4 style="margin: 0 0 5px 0; color: #4CAF50; font-size: 16px; font-weight: bold;">${escapeHtml(modelName)}</h4>
                <p style="margin: 0 0 5px 0; color: #888; font-size: 12px;">by ${escapeHtml(creator)} • ${escapeHtml(type)}</p>
                <p style="margin: 0 0 10px 0; color: #ccc; font-size: 13px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${escapeHtml(description)}</p>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                    <div style="display: flex; gap: 15px; font-size: 11px; color: #888;">
                        ${stats.downloadCount ? `<span>📥 ${stats.downloadCount.toLocaleString()}</span>` : ''}
                        ${stats.favoriteCount ? `<span>❤️ ${stats.favoriteCount.toLocaleString()}</span>` : ''}
                        ${stats.rating ? `<span>⭐ ${stats.rating.toFixed(1)}</span>` : ''}
                    </div>
                    ${trainedWords.length > 0 ? 
                        `<div style="color: #569cd6; font-size: 11px; font-weight: bold;">🏷️ ${trainedWords.length} triggers</div>` : 
                        ''
                    }
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 8px; border-top: 1px solid #444;">
                    <div style="display: flex; gap: 8px;">
                        <button class="civitai-card-btn civitai-details-btn" 
                                style="background: #569cd6; color: white; border: none; padding: 4px 10px; border-radius: 3px; cursor: pointer; font-size: 11px; font-weight: bold;">
                            📖 Details
                        </button>
                        ${latestVersion ? `
                            <button class="civitai-card-btn civitai-download-btn" 
                                    data-version-id="${latestVersion.id}" 
                                    data-version-name="${escapeHtml(latestVersion.name || 'Latest Version')}" 
                                    data-model-id="${model.id}"
                                    style="background: #4CAF50; color: white; border: none; padding: 4px 10px; border-radius: 3px; cursor: pointer; font-size: 11px; font-weight: bold;">
                                📥 Download Latest
                            </button>
                        ` : ''}
                    </div>
                    ${latestVersion && latestVersion.files && latestVersion.files[0] ? 
                        `<div style="color: #888; font-size: 10px;">${formatFileSize((latestVersion.files[0].sizeKB || 0) * 1024)}</div>` : 
                        ''
                    }
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners to the buttons
    const detailsBtn = card.querySelector('.civitai-details-btn');
    const downloadBtn = card.querySelector('.civitai-download-btn');
    
    if (detailsBtn) {
        detailsBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click
            showModelDetails(model, { includeNsfw });
        });
        
        // Button hover effects
        detailsBtn.addEventListener('mouseenter', () => {
            detailsBtn.style.background = '#4A90C2';
        });
        detailsBtn.addEventListener('mouseleave', () => {
            detailsBtn.style.background = '#569cd6';
        });
    }
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click
            const versionId = downloadBtn.dataset.versionId;
            const versionName = downloadBtn.dataset.versionName;
            const modelId = downloadBtn.dataset.modelId;
            downloadModel(versionId, versionName, modelId);
        });
        
        // Button hover effects
        downloadBtn.addEventListener('mouseenter', () => {
            downloadBtn.style.background = '#45a049';
        });
        downloadBtn.addEventListener('mouseleave', () => {
            downloadBtn.style.background = '#4CAF50';
        });
    }
    
    // Remove the old click handler for the entire card since we now have specific buttons
    // Only make the image and text areas clickable for details
    const contentArea = card.querySelector('div > div:nth-child(2)');
    if (contentArea) {
        // Add click handler only to the text content area (not buttons)
        const textElements = contentArea.querySelectorAll('h4, p');
        textElements.forEach(element => {
            element.style.cursor = 'pointer';
            element.addEventListener('click', () => showModelDetails(model, { includeNsfw }));
        });
    }
    
    return card;
}

/**
 * Shows detailed model information in a dialog
 * @param {Object} model - Model data from Civitai API
 * @param {Object} options - Display options
 */
function showModelDetails(model, options = {}) {
    const { includeNsfw = false } = options;
    
    const modelName = model.name || 'Unknown Model';
    const creator = model.creator ? model.creator.username : 'Unknown';
    const type = model.type || 'Unknown';
    const description = model.description || 'No description available';
    const stats = model.stats || {};
    const versions = model.modelVersions || [];
    
    // Create dialog content
    const content = document.createElement('div');
    content.style.cssText = `
        max-width: 800px;
        max-height: 80vh;
        overflow-y: auto;
        padding: 20px;
    `;
    
    // Model header
    const header = document.createElement('div');
    header.style.cssText = `
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid #4CAF50;
    `;
    
    header.innerHTML = `
        <h2 style="margin: 0 0 10px 0; color: #4CAF50;">${escapeHtml(modelName)}</h2>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div>
                <span style="color: #888;">by</span> <strong style="color: #569cd6;">${escapeHtml(creator)}</strong>
                <span style="color: #888; margin-left: 15px;">Type:</span> <strong style="color: #FFB74D;">${escapeHtml(type)}</strong>
            </div>
            <a href="${getModelUrl(model.id)}" target="_blank" style="color: #4CAF50; text-decoration: none; font-size: 14px;">View on Civitai →</a>
        </div>
        <div style="display: flex; gap: 20px; font-size: 14px; color: #888;">
            ${stats.downloadCount ? `<span>📥 ${stats.downloadCount.toLocaleString()} downloads</span>` : ''}
            ${stats.favoriteCount ? `<span>❤️ ${stats.favoriteCount.toLocaleString()} favorites</span>` : ''}
            ${stats.rating ? `<span>⭐ ${stats.rating.toFixed(1)} rating</span>` : ''}
            ${stats.commentCount ? `<span>💬 ${stats.commentCount.toLocaleString()} comments</span>` : ''}
        </div>
    `;
    
    // Description
    const descriptionSection = document.createElement('div');
    descriptionSection.style.cssText = `
        margin-bottom: 20px;
        padding: 15px;
        background: #1a1a1a;
        border-radius: 4px;
        border-left: 4px solid #569cd6;
    `;
    descriptionSection.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: #569cd6;">Description</h3>
        <div style="color: #ccc; line-height: 1.5;">${escapeHtml(stripHtml(description))}</div>
    `;
    
    // Versions section
    const versionsSection = document.createElement('div');
    versionsSection.style.cssText = `
        margin-bottom: 20px;
    `;
    
    if (versions.length > 0) {
        versionsSection.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #FF9800;">Available Versions (${versions.length})</h3>
        `;
        
        versions.forEach((version, index) => {
            const versionCard = createVersionCard(version, model.id, { includeNsfw, isLatest: index === 0 });
            versionsSection.appendChild(versionCard);
        });
    }
    
    content.appendChild(header);
    content.appendChild(descriptionSection);
    content.appendChild(versionsSection);
    
    // Create dialog
    const dialog = createDialog({
        title: `${modelName} - Civitai Model Details`,
        content: content,
        width: '900px'
    });
    
    dialog.addFooterButton('Close', () => dialog.close(), { backgroundColor: '#666' });
    dialog.show();
}

/**
 * Creates a version card for the model details dialog
 * @param {Object} version - Version data from Civitai API
 * @param {number} modelId - Model ID
 * @param {Object} options - Display options
 * @returns {HTMLElement} Version card element
 */
function createVersionCard(version, modelId, options = {}) {
    const { includeNsfw = false, isLatest = false } = options;
    
    const card = document.createElement('div');
    card.style.cssText = `
        background: #2a2a2a;
        border-radius: 4px;
        padding: 15px;
        margin-bottom: 10px;
        border: 1px solid #444;
        ${isLatest ? 'border-left: 4px solid #4CAF50;' : ''}
    `;
    
    const versionName = version.name || 'Unnamed Version';
    const createdAt = version.createdAt ? new Date(version.createdAt).toLocaleDateString() : 'Unknown date';
    const trainedWords = version.trainedWords || [];
    const files = version.files || [];
    const primaryFile = files.find(f => f.primary) || files[0];
    
    // Get images for this version
    const images = version.images || [];
    const appropriateImages = images.filter(img => 
        includeNsfw || (img.nsfwLevel || 0) <= SEARCH_CONFIG.MAX_NSFW_LEVEL
    ).slice(0, 3); // Show up to 3 images
    
    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <div style="flex: 1;">
                <h4 style="margin: 0 0 5px 0; color: #4CAF50; display: flex; align-items: center; gap: 10px;">
                    ${escapeHtml(versionName)}
                    ${isLatest ? '<span style="background: #4CAF50; color: white; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold;">LATEST</span>' : ''}
                </h4>
                <p style="margin: 0 0 10px 0; color: #888; font-size: 12px;">Released: ${createdAt}</p>
                
                ${version.description ? `<p style="margin: 0 0 10px 0; color: #ccc; font-size: 13px; line-height: 1.3;">${escapeHtml(version.description)}</p>` : ''}
                
                ${trainedWords.length > 0 ? `
                    <div style="margin-bottom: 10px;">
                        <strong style="color: #569cd6; font-size: 12px;">Trigger Words:</strong>
                        <div style="margin-top: 5px;">
                            ${trainedWords.map(word => `<span style="background: #1a1a1a; color: #569cd6; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-right: 5px; display: inline-block; margin-bottom: 2px;">${escapeHtml(word)}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${primaryFile ? `
                    <div style="color: #888; font-size: 12px; margin-bottom: 10px;">
                        <span style="color: #FFB74D;">File Size:</span> ${formatFileSize(primaryFile.sizeKB * 1024)}
                        ${primaryFile.metadata ? `
                            ${primaryFile.metadata.format ? `<span style="margin-left: 15px; color: #FFB74D;">Format:</span> ${primaryFile.metadata.format}` : ''}
                            ${primaryFile.metadata.fp ? `<span style="margin-left: 15px; color: #FFB74D;">Precision:</span> ${primaryFile.metadata.fp}` : ''}
                        ` : ''}
                    </div>
                ` : ''}
            </div>
            
            <div style="margin-left: 15px;">
                <button onclick="downloadModel('${version.id}', '${escapeHtml(versionName)}', '${modelId}')" 
                        style="background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;">
                    📥 Download
                </button>
            </div>
        </div>
        
        ${appropriateImages.length > 0 ? `
            <div style="display: flex; gap: 5px; margin-top: 10px;">
                ${appropriateImages.map(img => `
                    <img src="${escapeHtml(img.url)}" 
                         style="width: 60px; height: 60px; object-fit: cover; border-radius: 3px; cursor: pointer;" 
                         alt="Example image" 
                         loading="lazy"
                         onclick="showImageExpanded('${escapeHtml(img.url)}')">
                `).join('')}
            </div>
        ` : ''}
    `;
    
    return card;
}

/**
 * Downloads a model from Civitai
 * @param {string} versionId - Model version ID
 * @param {string} versionName - Model version name
 * @param {string} modelId - Model ID
 */
window.downloadModel = async function(versionId, versionName, modelId) {
    try {
        const confirmed = await confirmDialog(
            `Download "${versionName}"?\n\nThis will open the download link in a new tab. The file will be downloaded through your browser.`,
            'Download Model'
        );
        
        if (confirmed) {
            const downloadUrl = getDownloadUrl(versionId);
            window.open(downloadUrl, '_blank');
            
            // Optional: Show download instructions
            setTimeout(() => {
                alertDialog(
                    'Download started! The file should begin downloading shortly.\n\nSave it to your ComfyUI models directory and refresh the cache to see it in the sidebar.',
                    'Download Started'
                );
            }, 1000);
        }
    } catch (error) {
        console.error('Download error:', error);
        alertDialog(`Failed to start download: ${error.message}`, 'Download Error');
    }
};

/**
 * Shows an expanded view of an image
 * @param {string} imageUrl - Image URL
 */
window.showImageExpanded = function(imageUrl) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        cursor: pointer;
    `;
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
        border-radius: 8px;
    `;
    
    overlay.appendChild(img);
    overlay.addEventListener('click', () => document.body.removeChild(overlay));
    
    // ESC key support
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
    
    document.body.appendChild(overlay);
};

/**
 * Strip HTML tags from text
 * @param {string} html - HTML string
 * @returns {string} - Plain text
 */
function stripHtml(html) {
    if (typeof html !== 'string') return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

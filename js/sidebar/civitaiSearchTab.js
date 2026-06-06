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
import { loadAndCreateHtmlTemplate } from '../utils/htmlTemplateLoader.js';

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
export async function createCivitaiSearchTab(container) {
    container.innerHTML = '';
    
    loadSidebarStyle('civitai-search-styles', 'extensions/comfyui_sageutils/sidebar/civitaiSearchTab.css');
    
    // Create main layout
    const searchContainer = document.createElement('div');
    searchContainer.className = 'civitai-search-tab';
    
    // Create search form
    const searchForm = await createSearchForm();
    
    // Create results container
    const resultsContainer = document.createElement('div');
    resultsContainer.id = 'civitai-results';
    resultsContainer.className = 'civitai-results-container';

    // Initial message
    const initialStatus = await createSearchStatusPanel({
        icon: '🔍',
        title: 'Civitai Model Search',
        messageLine1: 'Search for models on Civitai to discover and download new content.',
        messageLine2: 'Use the search form above to find models by name, type, or creator.',
        note: ''
    });
    resultsContainer.appendChild(initialStatus);

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
async function createSearchForm() {
    const form = await loadAndCreateHtmlTemplate(
        'extensions/comfyui_sageutils/sidebar/partials/civitaiSearchForm.html'
    );

    const typeFilter = form.querySelector('#civitai-type-filter');
    if (typeFilter) {
        SEARCH_CONFIG.SUPPORTED_TYPES.forEach((type) => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            typeFilter.appendChild(option);
        });
    }

    const sortFilter = form.querySelector('#civitai-sort-filter');
    if (sortFilter) {
        SEARCH_CONFIG.SORT_OPTIONS.forEach((sort) => {
            const option = document.createElement('option');
            option.value = sort;
            option.textContent = sort;
            sortFilter.appendChild(option);
        });
    }

    const searchButton = createButton('Search', {
        id: 'civitai-search-button',
        variant: BUTTON_VARIANTS.SUCCESS,
        className: 'civitai-search-button'
    });

    const buttonSpot = form.querySelector('#civitai-search-button-spot');
    if (buttonSpot) {
        buttonSpot.appendChild(searchButton);
    }

    return form;
}

async function createSearchStatusPanel(options = {}) {
    const {
        icon = '',
        title = '',
        messageLine1 = '',
        messageLine2 = '',
        note = '',
        extraClass = ''
    } = options;

    return await loadAndCreateHtmlTemplate(
        'extensions/comfyui_sageutils/sidebar/partials/civitaiSearchStatus.html',
        {
            icon,
            title,
            messageLine1,
            messageLine2,
            note,
            extraClass
        }
    );
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
            resultsContainer.innerHTML = '';
            const searchStatus = await createSearchStatusPanel({
                icon: '🔍',
                title: 'Civitai Model Search',
                messageLine1: 'Search for models on Civitai to discover and download new content.',
                messageLine2: 'Use the search form above to find models by name, type, or creator.',
                note: ''
            });
            resultsContainer.appendChild(searchStatus);
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
            
            await displaySearchResults(resultsContainer, currentResults, { 
                includeNsfw,
                metadata: currentMetadata,
                onNextPage: currentMetadata && currentMetadata.nextCursor ? 
                    () => performSearchWithPagination(currentMetadata.nextCursor, false) : null
            });
            
        } catch (error) {
            console.error('Civitai search error:', error);
            resultsContainer.innerHTML = '';
            const errorStatus = await createSearchStatusPanel({
                icon: '❌',
                title: 'Search Failed',
                messageLine1: `Failed to search Civitai: ${escapeHtml(error.message)}`,
                messageLine2: '',
                note: 'Please check your internet connection and try again.',
                extraClass: ' civitai-search-status-error'
            });
            resultsContainer.appendChild(errorStatus);
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
async function displaySearchResults(container, results, options = {}) {
    const { includeNsfw = false, metadata = null, onNextPage = null } = options;

    if (!results || results.length === 0) {
        container.innerHTML = '';
        const noResultsStatus = await createSearchStatusPanel({
            icon: '',
            title: 'No Results Found',
            messageLine1: 'No models found matching your search criteria.',
            messageLine2: 'Try adjusting your search terms or filters.',
            note: ''
        });
        container.appendChild(noResultsStatus);
        return;
    }

    const header = await loadAndCreateHtmlTemplate(
        'extensions/comfyui_sageutils/sidebar/partials/civitaiResultsHeader.html',
        {
            resultCount: results.length,
            totalItemsText: metadata && metadata.totalItems ? ` (${metadata.totalItems} total)` : ''
        }
    );

    if (metadata) {
        const paginationInfo = await loadAndCreateHtmlTemplate(
            'extensions/comfyui_sageutils/sidebar/partials/civitaiPaginationInfo.html',
            {
                pageLine: metadata.currentPage ? `Page ${metadata.currentPage}${metadata.totalPages ? ` of ${metadata.totalPages}` : ''}` : 'Cursor-based pagination',
                detailText: metadata.currentPage ? `${metadata.pageSize || results.length} per page` : 'More results available'
            }
        );

        header.appendChild(paginationInfo);
    }

    const resultsGrid = document.createElement('div');
    resultsGrid.className = 'civitai-results-grid';

    for (const model of results) {
        const modelCard = await createModelCard(model, { includeNsfw });
        resultsGrid.appendChild(modelCard);
    }

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

function createTextSpan(text) {
    const span = document.createElement('span');
    span.textContent = text;
    return span;
}

function createTriggerGroup(trainedWords) {
    const group = document.createElement('div');
    group.className = 'civitai-model-card-triggers';
    group.textContent = `🏷️ ${trainedWords.length} triggers`;
    return group;
}

function createVersionTriggerGroup(trainedWords) {
    const group = document.createElement('div');
    group.className = 'civitai-trigger-words-group';

    const title = document.createElement('strong');
    title.className = 'civitai-trigger-words-title';
    title.textContent = 'Trigger Words:';

    const list = document.createElement('div');
    list.className = 'civitai-trigger-words';
    trainedWords.forEach((word) => {
        const tag = document.createElement('span');
        tag.className = 'civitai-trigger-word';
        tag.textContent = word;
        list.appendChild(tag);
    });

    group.appendChild(title);
    group.appendChild(list);
    return group;
}

function createFileInfo(primaryFile) {
    const fileInfo = document.createElement('div');
    fileInfo.className = 'civitai-version-file-info';

    const sizeSpan = document.createElement('span');
    sizeSpan.textContent = `File Size: ${formatFileSize((primaryFile.sizeKB || 0) * 1024)}`;
    fileInfo.appendChild(sizeSpan);

    if (primaryFile.metadata) {
        if (primaryFile.metadata.format) {
            const formatSpan = document.createElement('span');
            formatSpan.textContent = `Format: ${primaryFile.metadata.format}`;
            fileInfo.appendChild(formatSpan);
        }

        if (primaryFile.metadata.fp) {
            const precisionSpan = document.createElement('span');
            precisionSpan.textContent = `Precision: ${primaryFile.metadata.fp}`;
            fileInfo.appendChild(precisionSpan);
        }
    }

    return fileInfo;
}

function createStatsContainer(stats) {
    const fragment = document.createDocumentFragment();
    if (stats.downloadCount) {
        fragment.appendChild(createTextSpan(`📥 ${stats.downloadCount.toLocaleString()}`));
    }
    if (stats.favoriteCount) {
        fragment.appendChild(createTextSpan(`❤️ ${stats.favoriteCount.toLocaleString()}`));
    }
    if (stats.rating) {
        fragment.appendChild(createTextSpan(`⭐ ${stats.rating.toFixed(1)}`));
    }
    return fragment;
}

async function createModelCard(model, options = {}) {
    const { includeNsfw = false } = options;

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

    const card = await loadAndCreateHtmlTemplate(
        'extensions/comfyui_sageutils/sidebar/partials/civitaiModelCard.html',
        {
            modelName,
            creator,
            type,
            description
        }
    );

    const imageContainer = card.querySelector('.civitai-model-card-image');
    if (imageContainer) {
        if (imageUrl) {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.className = 'civitai-model-card-image-img';
            img.alt = 'Model preview';
            img.loading = 'lazy';
            imageContainer.appendChild(img);
        } else {
            const noImage = document.createElement('div');
            noImage.className = 'civitai-model-card-no-image';
            noImage.textContent = 'No Image';
            imageContainer.appendChild(noImage);
        }
    }

    const statsContainer = card.querySelector('.civitai-model-card-stats');
    if (statsContainer) {
        statsContainer.appendChild(createStatsContainer(stats));
    }

    if (trainedWords.length > 0) {
        const triggerContainer = card.querySelector('.civitai-model-card-triggers');
        if (triggerContainer) {
            triggerContainer.appendChild(createTriggerGroup(trainedWords));
        }
    }

    const buttonGroup = card.querySelector('.civitai-card-btn-group');
    if (buttonGroup && latestVersion) {
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'civitai-card-btn civitai-download-btn';
        downloadBtn.dataset.versionId = latestVersion.id;
        downloadBtn.dataset.versionName = latestVersion.name || 'Latest Version';
        downloadBtn.dataset.modelId = model.id;
        downloadBtn.textContent = '📥 Download Latest';
        buttonGroup.appendChild(downloadBtn);
    }

    if (latestVersion && latestVersion.files && latestVersion.files[0]) {
        const fileSizeElement = document.createElement('div');
        fileSizeElement.className = 'civitai-card-stats-small';
        fileSizeElement.textContent = formatFileSize((latestVersion.files[0].sizeKB || 0) * 1024);
        const fileSizeContainer = card.querySelector('.civitai-card-stats-small');
        if (fileSizeContainer) {
            fileSizeContainer.appendChild(fileSizeElement);
        }
    }

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

async function showModelDetails(model, options = {}) {
    const { includeNsfw = false } = options;

    const modelName = model.name || 'Unknown Model';
    const creator = model.creator ? model.creator.username : 'Unknown';
    const type = model.type || 'Unknown';
    const description = model.description || 'No description available';
    const stats = model.stats || {};
    const versions = model.modelVersions || [];

    const content = await loadAndCreateHtmlTemplate(
        'extensions/comfyui_sageutils/sidebar/partials/civitaiDetailsDialog.html',
        {
            modelName,
            creator,
            type,
            modelUrl: getModelUrl(model.id),
            descriptionText: stripHtml(description)
        }
    );

    const statsContainer = content.querySelector('.civitai-dialog-stats');
    if (statsContainer) {
        statsContainer.appendChild(createStatsContainer(stats));
    }

    let versionsSection = null;

    if (versions.length > 0) {
        versionsSection = await loadAndCreateHtmlTemplate(
            'extensions/comfyui_sageutils/sidebar/partials/civitaiVersionSection.html',
            {
                versionCount: versions.length
            }
        );

        const versionList = versionsSection.querySelector('.civitai-version-list');
        for (const [index, version] of versions.entries()) {
            const versionCard = await createVersionCard(version, model.id, { includeNsfw, isLatest: index === 0 });
            versionList.appendChild(versionCard);
        }
    }

    if (versionsSection) {
        content.appendChild(versionsSection);
    }

    const dialog = createDialog({
        title: `${modelName} - Civitai Model Details`,
        content: content,
        width: '900px'
    });

    dialog.addFooterButton('Close', () => dialog.close(), { backgroundColor: '#666' });
    dialog.show();
}

async function createVersionCard(version, modelId, options = {}) {
    const { includeNsfw = false, isLatest = false } = options;

    const versionName = version.name || 'Unnamed Version';
    const createdAt = version.createdAt ? new Date(version.createdAt).toLocaleDateString() : 'Unknown date';
    const trainedWords = version.trainedWords || [];
    const files = version.files || [];
    const primaryFile = files.find(f => f.primary) || files[0];

    const images = version.images || [];
    const appropriateImages = images.filter(img => includeNsfw || (img.nsfwLevel || 0) <= SEARCH_CONFIG.MAX_NSFW_LEVEL).slice(0, 3);

    const latestClass = isLatest ? ' latest' : '';

    const card = await loadAndCreateHtmlTemplate(
        'extensions/comfyui_sageutils/sidebar/partials/civitaiVersionCard.html',
        {
            latestClass,
            versionName,
            createdAt
        }
    );

    if (isLatest) {
        const titleEl = card.querySelector('.civitai-version-title');
        if (titleEl) {
            const badge = document.createElement('span');
            badge.className = 'civitai-version-badge';
            badge.textContent = 'LATEST';
            titleEl.appendChild(badge);
        }
    }

    const descriptionContainer = card.querySelector('.civitai-version-description');
    if (descriptionContainer && version.description) {
        const descriptionParagraph = document.createElement('p');
        descriptionParagraph.className = 'civitai-version-description';
        descriptionParagraph.textContent = escapeHtml(version.description);
        descriptionContainer.appendChild(descriptionParagraph);
    }

    const triggerContainer = card.querySelector('.civitai-trigger-words-group');
    if (triggerContainer && trainedWords.length > 0) {
        triggerContainer.appendChild(createVersionTriggerGroup(trainedWords));
    }

    const fileInfoContainer = card.querySelector('.civitai-version-file-info');
    if (fileInfoContainer && primaryFile) {
        fileInfoContainer.appendChild(createFileInfo(primaryFile));
    }

    const downloadContainer = card.querySelector('.civitai-version-download-container');
    if (downloadContainer) {
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'civitai-version-download-button';
        downloadBtn.dataset.versionId = version.id;
        downloadBtn.dataset.versionName = escapeHtml(versionName);
        downloadBtn.dataset.modelId = modelId;
        downloadBtn.textContent = '📥 Download';
        downloadContainer.appendChild(downloadBtn);

        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const versionId = downloadBtn.dataset.versionId;
            const versionName = downloadBtn.dataset.versionName;
            const modelId = downloadBtn.dataset.modelId;
            downloadModel(versionId, versionName, modelId);
        });
    }

    const imagesContainer = card.querySelector('.civitai-version-images');
    if (imagesContainer && appropriateImages.length > 0) {
        appropriateImages.forEach(img => {
            const imageElement = document.createElement('img');
            imageElement.src = img.url;
            imageElement.className = 'civitai-version-image';
            imageElement.dataset.imageUrl = img.url;
            imageElement.alt = 'Example image';
            imageElement.loading = 'lazy';
            imageElement.addEventListener('click', () => showImageExpanded(img.url));
            imagesContainer.appendChild(imageElement);
        });
    }

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

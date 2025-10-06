/**
 * Gallery Layout Components
 * Pure UI layout creation functions for the image gallery tab
 * Extracted from imageGalleryTab.js for better organization and maintainability
 */

// Import required dependencies
import { createHeader } from "../components/cacheUI.js";
import { createThumbnailGrid } from "./gallery.js";
import { selectors } from "../shared/stateManager.js";

/**
 * Creates the Gallery tab header section with status display
 * @returns {HTMLElement} Header element with status display
 */
export function createGalleryHeader() {
    const header = createHeader('Gallery', null); // No description for compactness
    
    // Add status display area
    const statusDiv = document.createElement('div');
    statusDiv.style.cssText = `
        font-size: 11px;
        margin-top: 5px;
        min-height: 16px;
        color: #4CAF50;
        font-style: italic;
    `;
    statusDiv.textContent = '';
    
    header.appendChild(statusDiv);
    header.statusDiv = statusDiv; // Store reference for easy access
    
    return header;
}

/**
 * Creates the combined folder selector and controls section for the Gallery tab
 * @returns {Object} Folder selector and controls components
 */
export function createFolderSelectorAndControls() {
    const folderSection = document.createElement('div');
    folderSection.style.cssText = `
        margin-bottom: 15px;
        padding: 15px;
        background: #2a2a2a;
        border-radius: 6px;
        border: 1px solid #444;
    `;
    
    const folderHeader = document.createElement('h4');
    folderHeader.style.cssText = `
        margin: 0 0 10px 0;
        color: #4CAF50;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    folderHeader.textContent = 'Folder & Controls';
    
    const folderDropdown = document.createElement('select');
    folderDropdown.id = 'gallery-folder-selector';
    folderDropdown.style.cssText = `
        width: 100%;
        padding: 8px;
        background: #333;
        color: #fff;
        border: 1px solid #555;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
    `;
    
    // Default folder options
    const defaultOptions = [
        { value: 'notes', text: '📝 Notes Folder', icon: '📝' },
        { value: 'input', text: '📥 Input Folder', icon: '📥' },
        { value: 'output', text: '📤 Output Folder', icon: '📤' },
        { value: 'custom', text: '📁 Browse Custom Folder...', icon: '📁' }
    ];
    
    defaultOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text;
        folderDropdown.appendChild(optionElement);
    });
    
    // Set default selection to notes
    folderDropdown.value = 'notes';
    
    const browseButton = document.createElement('button');
    browseButton.textContent = 'Browse...';
    browseButton.style.cssText = `
        background: #2196F3;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        margin-top: 8px;
        display: none;
    `;

    folderSection.appendChild(folderHeader);
    folderSection.appendChild(folderDropdown);
    folderSection.appendChild(browseButton);

    // Add controls to the same section
    // Sort controls
    const sortContainer = document.createElement('div');
    sortContainer.style.cssText = `
        margin-top: 15px;
        margin-bottom: 10px;
        display: flex;
        gap: 8px;
        align-items: center;
    `;
    
    const sortLabel = document.createElement('label');
    sortLabel.textContent = 'Sort:';
    sortLabel.style.cssText = `
        color: #ccc;
        font-size: 12px;
        min-width: 35px;
    `;
    
    const sortSelect = document.createElement('select');
    sortSelect.id = 'gallery-sort';
    sortSelect.style.cssText = `
        flex: 1;
        padding: 4px 8px;
        background: #333;
        color: #fff;
        border: 1px solid #555;
        border-radius: 4px;
        font-size: 11px;
        cursor: pointer;
    `;
    
    const sortOptions = [
        { value: 'name', text: 'Name' },
        { value: 'date', text: 'Date Modified' },
        { value: 'size', text: 'File Size' },
        { value: 'type', text: 'File Type' }
    ];
    
    sortOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text;
        sortSelect.appendChild(optionElement);
    });
    
    const orderButton = document.createElement('button');
    orderButton.textContent = '↑';
    orderButton.title = 'Toggle sort order';
    orderButton.style.cssText = `
        background: #444;
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        min-width: 30px;
    `;
    
    sortContainer.appendChild(sortLabel);
    sortContainer.appendChild(sortSelect);
    sortContainer.appendChild(orderButton);

    // Thumbnail size and control buttons
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
        margin-bottom: 10px;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    `;
    
    const thumbnailSizeSelect = document.createElement('select');
    thumbnailSizeSelect.id = 'gallery-thumbnail-size';
    thumbnailSizeSelect.style.cssText = `
        flex: 1;
        min-width: 80px;
        padding: 4px 8px;
        background: #333;
        color: #fff;
        border: 1px solid #555;
        border-radius: 4px;
        font-size: 11px;
        cursor: pointer;
    `;
    
    const sizeOptions = [
        { value: 'small', text: 'Small' },
        { value: 'medium', text: 'Medium' },
        { value: 'large', text: 'Large' }
    ];
    
    sizeOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text;
        thumbnailSizeSelect.appendChild(optionElement);
    });
    
    const viewModeButton = document.createElement('button');
    viewModeButton.textContent = '⊞ Grid View';
    viewModeButton.title = 'Toggle view mode';
    viewModeButton.style.cssText = `
        background: #2196F3;
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    `;
    
    const datasetTextButton = document.createElement('button');
    datasetTextButton.textContent = '📝 Dataset';
    datasetTextButton.title = 'Manage dataset text files';
    datasetTextButton.style.cssText = `
        background: #FF9800;
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    `;
    
    buttonsContainer.appendChild(thumbnailSizeSelect);
    buttonsContainer.appendChild(viewModeButton);
    buttonsContainer.appendChild(datasetTextButton);

    // Search bar - moved to bottom to match Models tab
    const searchContainer = document.createElement('div');
    searchContainer.style.cssText = `
        margin-top: 15px;
        display: flex;
        gap: 8px;
        align-items: center;
    `;
    
    // Add search label for better UX (matching Models tab)
    const searchLabel = document.createElement('label');
    searchLabel.textContent = 'Search:';
    searchLabel.style.cssText = `
        color: #ccc;
        font-size: 12px;
        min-width: 50px;
        white-space: nowrap;
    `;
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'gallery-search';
    searchInput.placeholder = 'Search images...';
    searchInput.style.cssText = `
        flex: 1;
        padding: 6px 10px;
        background: #333;
        color: #fff;
        border: 1px solid #555;
        border-radius: 4px;
        font-size: 12px;
    `;
    
    const clearButton = document.createElement('button');
    clearButton.textContent = '✕';
    clearButton.title = 'Clear search';
    clearButton.style.cssText = `
        background: #666;
        color: white;
        border: none;
        padding: 6px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    `;
    
    searchContainer.appendChild(searchLabel);
    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(clearButton);

    // Metadata filter checkbox
    const metadataFilterContainer = document.createElement('div');
    metadataFilterContainer.style.cssText = `
        margin-top: 10px;
        display: flex;
        gap: 8px;
        align-items: center;
    `;
    
    const metadataFilterCheckbox = document.createElement('input');
    metadataFilterCheckbox.type = 'checkbox';
    metadataFilterCheckbox.id = 'gallery-metadata-filter';
    metadataFilterCheckbox.style.cssText = `
        cursor: pointer;
    `;
    
    const metadataFilterLabel = document.createElement('label');
    metadataFilterLabel.htmlFor = 'gallery-metadata-filter';
    metadataFilterLabel.textContent = 'Show only images with generation parameters';
    metadataFilterLabel.title = 'Filter for images containing AI generation metadata (parameters, prompt, extra_pnginfo, etc.)';
    metadataFilterLabel.style.cssText = `
        color: #ccc;
        font-size: 12px;
        cursor: pointer;
        user-select: none;
    `;
    
    metadataFilterContainer.appendChild(metadataFilterCheckbox);
    metadataFilterContainer.appendChild(metadataFilterLabel);

    folderSection.appendChild(sortContainer);
    folderSection.appendChild(buttonsContainer);
    folderSection.appendChild(searchContainer);
    folderSection.appendChild(metadataFilterContainer);

    // Restore persisted gallery values from state
    const savedFolder = selectors.selectedFolder();
    const savedSort = selectors.gallerySortBy();
    const savedSearch = selectors.gallerySearchQuery();
    const savedViewMode = selectors.galleryViewMode();
    const savedThumbnailSize = selectors.thumbnailSize();
    
    if (savedFolder) {
        folderDropdown.value = savedFolder;
    }
    
    if (savedSort) {
        const sortValue = savedSort.replace(/-desc$/, '');
        const isDescending = savedSort.endsWith('-desc');
        
        sortSelect.value = sortValue;
        orderButton.textContent = isDescending ? '↓' : '↑';
        orderButton.dataset.descending = isDescending ? 'true' : 'false';
    }
    
    if (savedSearch) {
        searchInput.value = savedSearch;
    }
    
    if (savedViewMode) {
        viewModeButton.textContent = savedViewMode === 'grid' ? '⊞ Grid View' : '≡ List View';
        viewModeButton.dataset.mode = savedViewMode;
    }
    
    if (savedThumbnailSize) {
        thumbnailSizeSelect.value = savedThumbnailSize;
    }
    
    const savedMetadataOnly = selectors.showMetadataOnly();
    if (savedMetadataOnly) {
        metadataFilterCheckbox.checked = savedMetadataOnly;
    }
    
    console.debug('[GalleryTab] Restored gallery values from state:', {
        folder: savedFolder,
        sort: savedSort,
        search: savedSearch,
        viewMode: savedViewMode,
        thumbnailSize: savedThumbnailSize,
        metadataOnly: savedMetadataOnly
    });

    return {
        folderSection,
        folderHeader,
        folderDropdown,
        browseButton,
        // Controls components
        searchContainer,
        searchInput,
        clearButton,
        sortContainer,
        sortSelect,
        orderButton,
        buttonsContainer,
        thumbnailSizeSelect,
        viewModeButton,
        datasetTextButton,
        metadataFilterCheckbox
    };
}

/**
 * Creates a wrapped thumbnail grid with header for the Gallery tab
 * @returns {Object} Thumbnail grid components
 */
export function createWrappedThumbnailGrid() {
    const gridSection = document.createElement('div');
    gridSection.style.cssText = `
        margin-bottom: 15px;
        padding: 15px;
        background: #2a2a2a;
        border-radius: 6px;
        border: 1px solid #444;
        flex: 1;
        display: flex;
        flex-direction: column;
    `;
    
    const gridHeader = document.createElement('h4');
    gridHeader.style.cssText = `
        margin: 0 0 10px 0;
        color: #4CAF50;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    
    // Create header content with count
    const headerContent = document.createElement('span');
    headerContent.innerHTML = 'Images <span id="image-count" style="color: #999; font-weight: normal;"></span>';
    
    // Create reload button (small icon)
    const refreshButton = document.createElement('button');
    refreshButton.textContent = '🔄';
    refreshButton.title = 'Reload folder';
    refreshButton.style.cssText = `
        background: #4CAF50;
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        margin-left: 10px;
    `;
    
    refreshButton.addEventListener('mouseenter', () => {
        refreshButton.style.background = '#45a049';
    });
    
    refreshButton.addEventListener('mouseleave', () => {
        refreshButton.style.background = '#4CAF50';
    });
    
    gridHeader.appendChild(headerContent);
    gridHeader.appendChild(refreshButton);
    
    // Use imported thumbnail grid component
    const grid = createThumbnailGrid();
    grid.gridContainer.style.cssText += `
        border: 1px solid #555;
        border-radius: 4px;
        background: #333;
        flex: 1;
    `;
    
    // Add placeholder content initially
    grid.gridContainer.innerHTML = `
        <div style="
            grid-column: 1 / -1;
            text-align: center;
            color: #888;
            padding: 40px;
            font-style: italic;
        ">
            🖼️ Select a folder to view images
        </div>
    `;

    gridSection.appendChild(gridHeader);
    gridSection.appendChild(grid.gridContainer);

    // Get references from the header
    const imageCountSpan = gridHeader.querySelector('#image-count');

    return {
        gridSection,
        gridHeader,
        gridContainer: grid.gridContainer,
        imageCountSpan,
        refreshButton,
        updateGridLayout: grid.updateGridLayout,
        clear: grid.clear
    };
}

/**
 * Creates the metadata panel section for the Gallery tab
 * @returns {Object} Metadata panel components
 */
export function createMetadataPanel() {
    const metadataSection = document.createElement('div');
    metadataSection.style.cssText = `
        padding: 15px;
        background: #2a2a2a;
        border-radius: 6px;
        border: 1px solid #444;
        display: block;
    `;
    
    const metadataHeader = document.createElement('h4');
    metadataHeader.style.cssText = `
        margin: 0 0 10px 0;
        color: #4CAF50;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    metadataHeader.innerHTML = `
        <span>Image Details</span>
        <button id="close-metadata" style="
            background: #f44336;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
        ">Clear</button>
    `;
    
    const metadataContent = document.createElement('div');
    metadataContent.id = 'metadata-content';
    metadataContent.style.cssText = `
        max-height: 300px;
        overflow-y: auto;
        background: #333;
        border: 1px solid #555;
        border-radius: 4px;
        padding: 15px;
        color: #e0e0e0;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        line-height: 1.4;
    `;
    metadataContent.innerHTML = '<em style="color: #999;">Select an image to view details...</em>';

    metadataSection.appendChild(metadataHeader);
    metadataSection.appendChild(metadataContent);

    return {
        metadataSection,
        metadataHeader,
        metadataContent,
        closeButton: metadataHeader.querySelector('#close-metadata')
    };
}

/**
 * Assembles the complete gallery tab layout from individual components
 * @param {HTMLElement} container - Container element to populate
 * @param {Object} components - Layout components to assemble
 */
export function assembleGalleryTabLayout(container, components) {
    const {
        header,
        folderAndControls, // Combined section
        grid,
        metadata
    } = components;

    // Clear container
    container.innerHTML = '';

    // Create main gallery container
    const galleryContainer = document.createElement('div');
    galleryContainer.style.cssText = `
        padding: 15px;
    `;

    // Add header with reduced padding
    header.style.padding = '10px 15px'; // Make header more compact
    container.appendChild(header);

    // Add all sections to gallery container
    galleryContainer.appendChild(folderAndControls.folderSection); // Combined folder and controls
    galleryContainer.appendChild(grid.gridSection);
    galleryContainer.appendChild(metadata.metadataSection);

    // Add gallery container to main container
    container.appendChild(galleryContainer);
}

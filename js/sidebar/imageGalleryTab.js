/**
 * Image Gallery Tab - Handles image browsing, viewing, and management for multiple folders
 */

import { api } from "../../../scripts/api.js";

import { 
    API_ENDPOINTS,
    FILE_TYPES,
    GALLERY_CONFIG,
    getFileType,
    getFileTypeIcon,
    getThumbnailSize
} from "../shared/config.js";

import { 
    handleError
} from "../shared/errorHandler.js";

import { 
    actions, 
    selectors 
} from "../shared/stateManager.js";

// Import shared UI components
import {
    createHeader,
    createStyledButton,
    createInfoDisplay
} from "../shared/cacheUIComponents.js";

/**
 * Creates the Image Gallery tab header section
 * @returns {HTMLElement} Header element with status display
 */
function createGalleryHeader() {
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
function createFolderSelectorAndControls() {
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
    // Search bar
    const searchContainer = document.createElement('div');
    searchContainer.style.cssText = `
        margin-top: 15px;
        margin-bottom: 10px;
        display: flex;
        gap: 8px;
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
    
    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(clearButton);

    // Sort controls
    const sortContainer = document.createElement('div');
    sortContainer.style.cssText = `
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
    
    const refreshButton = document.createElement('button');
    refreshButton.textContent = '🔄';
    refreshButton.title = 'Refresh images';
    refreshButton.style.cssText = `
        background: #4CAF50;
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    `;
    
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
    
    buttonsContainer.appendChild(thumbnailSizeSelect);
    buttonsContainer.appendChild(refreshButton);
    buttonsContainer.appendChild(viewModeButton);

    folderSection.appendChild(searchContainer);
    folderSection.appendChild(sortContainer);
    folderSection.appendChild(buttonsContainer);

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
        refreshButton,
        viewModeButton
    };
}

/**
 * Creates the thumbnail grid section for the Gallery tab
 * @returns {Object} Thumbnail grid components
 */
function createThumbnailGrid() {
    const gridSection = document.createElement('div');
    gridSection.style.cssText = `
        margin-bottom: 15px;
        padding: 15px;
        background: #2a2a2a;
        border-radius: 6px;
        border: 1px solid #444;
    `;
    
    const gridHeader = document.createElement('h4');
    gridHeader.style.cssText = `
        margin: 0 0 10px 0;
        color: #4CAF50;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    gridHeader.innerHTML = `
        <span>Images <span id="image-count" style="color: #999; font-weight: normal;"></span></span>
    `;
    
    const gridContainer = document.createElement('div');
    gridContainer.id = 'thumbnail-grid';
    gridContainer.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 15px;
        min-height: 200px;
        max-height: 500px;
        overflow-y: auto;
        border: 1px solid #555;
        border-radius: 4px;
        background: #333;
        padding: 15px;
    `;
    
    // Placeholder content
    gridContainer.innerHTML = `
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
    gridSection.appendChild(gridContainer);

    return {
        gridSection,
        gridHeader,
        gridContainer,
        imageCountSpan: gridHeader.querySelector('#image-count')
    };
}

/**
 * Creates the metadata panel section for the Gallery tab
 * @returns {Object} Metadata panel components
 */
function createMetadataPanel() {
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
 * Sets up event handlers for Gallery tab interactions
 * @param {Object} folderSelector - Folder selector components
 * @param {Object} controls - Controls panel components  
 * @param {Object} grid - Thumbnail grid components
 * @param {Object} metadata - Metadata panel components
 */
function setupGalleryEventHandlers(folderAndControls, unused, grid, metadata, header) {
    // Extract components from the combined folderAndControls object
    const folderSelector = folderAndControls;
    const controls = folderAndControls; // Same object contains both folder and control elements
    // Helper function to update status
    function setStatus(message, isError = false) {
        console.log(isError ? `Gallery Error: ${message}` : `Gallery: ${message}`);
        
        // Update status in header if available
        if (header && header.statusDiv) {
            header.statusDiv.textContent = message;
            header.statusDiv.style.color = isError ? '#f44336' : '#4CAF50';
            
            // Clear status after 3 seconds unless it's an error
            if (!isError) {
                setTimeout(() => {
                    if (header.statusDiv.textContent === message) {
                        header.statusDiv.textContent = '';
                    }
                }, 3000);
            }
        }
    }

    // Load images from selected folder
    async function loadImagesFromFolder(folderType, customPath = null) {
        try {
            setStatus(`Loading images from ${folderType} folder...`);
            actions.setGalleryLoading(true);
            
            // Show loading indicator in grid with immediate count update
            grid.imageCountSpan.textContent = '(Loading...)';
            grid.gridContainer.innerHTML = `
                <div style="
                    grid-column: 1 / -1;
                    text-align: center;
                    color: #4CAF50;
                    padding: 60px 20px;
                    font-size: 14px;
                ">
                    <div style="
                        display: inline-block;
                        width: 40px;
                        height: 40px;
                        border: 4px solid #333;
                        border-top: 4px solid #4CAF50;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-bottom: 15px;
                    "></div>
                    <div>🔍 Loading from ${folderType} folder...</div>
                    <div style="color: #888; font-size: 12px; margin-top: 10px;">
                        Scanning for images and subfolders...
                    </div>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
            
            // Prepare request body
            const requestBody = { folder: folderType };
            if (customPath) {
                requestBody.path = customPath;
            }
            
            const response = await api.fetchApi('/sage_utils/list_images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Unknown error occurred');
            }
            
            const images = result.images || [];
            const folders = result.folders || [];
            const totalItems = images.length + folders.length;
            
            // Update state with loaded images and folders
            actions.setImages(images);
            actions.setFolders(folders);
            
            // Manage current path based on folder type and custom path
            if (folderType === 'custom' && customPath) {
                // We're in a custom subfolder, set the path
                actions.setCurrentPath(customPath);
            } else {
                // We're in a standard folder (input, output, etc.) or no custom path
                actions.setCurrentPath('');
            }
            
            // Update UI immediately with actual counts
            grid.imageCountSpan.textContent = `(${images.length} images, ${folders.length} folders)`;
            setStatus(`Loaded ${images.length} images and ${folders.length} folders from ${folderType} folder`);
            
            // Render image grid with both images and folders
            await renderImageGrid(images, folders);
            
            // Auto-show metadata for the first image if available
            if (images && images.length > 0) {
                showImageMetadata(images[0]);
            } else {
                // No images available, show placeholder message
                metadata.metadataContent.innerHTML = `
                    <div style="color: #888; text-align: center; padding: 20px;">
                        <div style="font-size: 24px; margin-bottom: 10px;">📁</div>
                        <div>No images in this folder</div>
                        <div style="font-size: 12px; margin-top: 5px;">
                            Select a folder with images to view details
                        </div>
                    </div>
                `;
            }
            
            // Special case: if we're in a custom path with no images/folders, ensure back navigation is available
            if (folderType === 'custom' && customPath && images.length === 0 && folders.length === 0) {
                const currentPath = selectors.currentPath();
                if (currentPath && currentPath !== '') {
                    const backItem = createBackNavigationItem();
                    grid.gridContainer.insertBefore(backItem, grid.gridContainer.firstChild);
                }
            }
            
        } catch (error) {
            console.error('Error loading images:', error);
            setStatus(`Error loading images: ${error.message}`, true);
            
            grid.gridContainer.innerHTML = `
                <div style="
                    grid-column: 1 / -1;
                    text-align: center;
                    color: #f44336;
                    padding: 40px;
                    font-style: italic;
                ">
                    ❌ Error loading images
                    <br><small style="color: #888; margin-top: 10px; display: block;">
                        ${error.message}
                    </small>
                </div>
            `;
            
            grid.imageCountSpan.textContent = '(Error)';
            
        } finally {
            actions.setGalleryLoading(false);
        }
    }

    // Render image grid with actual images and folders
    async function renderImageGrid(images, folders = []) {
        
        grid.gridContainer.innerHTML = '';
        
        if (!images || (images.length === 0 && folders.length === 0)) {
            grid.gridContainer.innerHTML = `
                <div style="
                    grid-column: 1 / -1;
                    text-align: center;
                    color: #888;
                    padding: 40px;
                    font-style: italic;
                ">
                    No images or folders found in this location
                </div>
            `;
            return;
        }
        
        // Apply current filters and sorting to images only
        const searchQuery = selectors.gallerySearchQuery().toLowerCase();
        const sortBy = selectors.gallerySortBy();
        
        let filteredImages = images || [];
        let sortedFolders = [...folders];
        
        // Apply search filter to images
        if (searchQuery) {
            filteredImages = images.filter(img => 
                img.filename.toLowerCase().includes(searchQuery) ||
                img.relative_path.toLowerCase().includes(searchQuery)
            );
            // Also filter folders
            sortedFolders = folders.filter(folder =>
                folder.name.toLowerCase().includes(searchQuery)
            );
        }
        
        // Apply sorting to images
        filteredImages.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.filename.localeCompare(b.filename);
                case 'name-desc':
                    return b.filename.localeCompare(a.filename);
                case 'size':
                    return b.size - a.size; // Largest first
                case 'size-desc':
                    return a.size - b.size; // Smallest first
                case 'date':
                    return new Date(b.modified) - new Date(a.modified); // Newest first
                case 'date-desc':
                    return new Date(a.modified) - new Date(b.modified); // Oldest first
                case 'type':
                    return (a.filename.split('.').pop() || '').localeCompare(b.filename.split('.').pop() || '');
                case 'type-desc':
                    return (b.filename.split('.').pop() || '').localeCompare(a.filename.split('.').pop() || '');
                default:
                    return 0;
            }
        });
        
        // Sort folders alphabetically
        sortedFolders.sort((a, b) => a.name.localeCompare(b.name));
        
        // Update count display
        grid.imageCountSpan.textContent = `(${filteredImages.length} images, ${sortedFolders.length} folders)`;
        
        // Render folders first
        sortedFolders.forEach(folder => {
            const folderItem = createFolderItem(folder);
            grid.gridContainer.appendChild(folderItem);
        });
        
        // Add "back" navigation if we're in a custom path
        const currentPath = selectors.currentPath();
        if (currentPath && currentPath !== '') {
            const backItem = createBackNavigationItem();
            grid.gridContainer.insertBefore(backItem, grid.gridContainer.firstChild);
        }
        
        // Then render images
        if (filteredImages.length > 50) {
            await renderImagesWithProgress(filteredImages);
        } else {
            // Render all at once for small folders
            filteredImages.forEach(image => {
                const imageItem = createImageItem(image);
                grid.gridContainer.appendChild(imageItem);
            });
        }
    }
    
    // Render images with progress indicator for large folders
    async function renderImagesWithProgress(images) {
        const batchSize = 20; // Process 20 images at a time
        const totalImages = images.length;
        let processedCount = 0;
        
        // Show initial progress
        const progressContainer = document.createElement('div');
        progressContainer.style.cssText = `
            grid-column: 1 / -1;
            text-align: center;
            padding: 20px;
            background: #2a2a2a;
            border-radius: 6px;
            margin-bottom: 15px;
        `;
        grid.gridContainer.appendChild(progressContainer);
        
        const updateProgress = () => {
            const percentage = Math.round((processedCount / totalImages) * 100);
            progressContainer.innerHTML = `
                <div style="color: #4CAF50; margin-bottom: 10px;">
                    Loading thumbnails... ${processedCount}/${totalImages} (${percentage}%)
                </div>
                <div style="
                    width: 100%;
                    height: 8px;
                    background: #333;
                    border-radius: 4px;
                    overflow: hidden;
                ">
                    <div style="
                        width: ${percentage}%;
                        height: 100%;
                        background: linear-gradient(90deg, #4CAF50, #66BB6A);
                        transition: width 0.3s ease;
                    "></div>
                </div>
            `;
        };
        
        updateProgress();
        
        // Process images in batches
        for (let i = 0; i < images.length; i += batchSize) {
            const batch = images.slice(i, i + batchSize);
            
            // Create placeholders for this batch
            const batchItems = [];
            batch.forEach(image => {
                const imageItem = createImageItem(image);
                batchItems.push(imageItem);
                grid.gridContainer.appendChild(imageItem);
            });
            
            // Update progress
            processedCount += batch.length;
            updateProgress();
            
            // Small delay between batches to keep UI responsive
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Remove progress indicator when done
        setTimeout(() => {
            if (progressContainer.parentNode) {
                progressContainer.remove();
            }
        }, 1000);
    }

    // Create individual image item
    function createImageItem(image) {
        const item = document.createElement('div');
        item.className = 'gallery-image-item';
        item.style.cssText = `
            position: relative;
            background: #444;
            border-radius: 6px;
            overflow: hidden;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            border: 2px solid transparent;
        `;
        
        // Add hover effects
        item.addEventListener('mouseenter', () => {
            item.style.transform = 'scale(1.05)';
            item.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
            item.style.borderColor = '#4CAF50';
        });
        
        item.addEventListener('mouseleave', () => {
            item.style.transform = 'scale(1)';
            item.style.boxShadow = 'none';
            item.style.borderColor = 'transparent';
        });
        
        // Create thumbnail image
        const thumbnail = document.createElement('img');
        thumbnail.style.cssText = `
            width: 100%;
            height: 150px;
            object-fit: cover;
            background: #333;
        `;
        
        // Set thumbnail source with error handling
        const thumbnailSizeConfig = getThumbnailSize(selectors.thumbnailSize());
        
        // Generate thumbnail via POST request and create blob URL
        const generateThumbnail = async () => {
            try {
                const response = await fetch('/sage_utils/thumbnail', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        image_path: image.path,
                        size: thumbnailSizeConfig.width.toString()
                    })
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    const thumbnailUrl = URL.createObjectURL(blob);
                    return thumbnailUrl;
                } else {
                    console.error('Thumbnail generation failed:', response.statusText);
                    return null;
                }
            } catch (error) {
                console.error('Error generating thumbnail:', error);
                return null;
            }
        };
        
        // Generate thumbnail and set source
        generateThumbnail().then(thumbnailUrl => {
            if (thumbnailUrl) {
                thumbnail.src = thumbnailUrl;
            } else {
                // Show error state
                thumbnail.style.display = 'none';
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = `
                    width: 100%;
                    height: 150px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #333;
                    color: #999;
                    font-size: 12px;
                `;
                errorDiv.textContent = 'Thumbnail failed';
                thumbnail.parentNode.insertBefore(errorDiv, thumbnail.nextSibling);
            }
        });
        
        thumbnail.addEventListener('error', () => {
            thumbnail.style.display = 'none';
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                width: 100%;
                height: 150px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #333;
                color: #888;
                font-size: 12px;
            `;
            errorDiv.textContent = '❌ Thumbnail failed';
            item.insertBefore(errorDiv, thumbnail.nextSibling);
        });
        
        // Create overlay with filename and info
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(transparent, rgba(0,0,0,0.8));
            color: white;
            padding: 8px;
            font-size: 11px;
            opacity: 0;
            transition: opacity 0.2s ease;
        `;
        
        const filename = document.createElement('div');
        filename.style.cssText = `
            font-weight: bold;
            margin-bottom: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        `;
        filename.textContent = image.filename;
        
        const info = document.createElement('div');
        info.style.cssText = `
            font-size: 10px;
            color: #ccc;
        `;
        
        let infoText = '';
        if (image.dimensions) {
            infoText += `${image.dimensions.width}×${image.dimensions.height} • `;
        }
        infoText += formatFileSize(image.size);
        info.textContent = infoText;
        
        overlay.appendChild(filename);
        overlay.appendChild(info);
        
        // Show overlay on hover
        item.addEventListener('mouseenter', () => {
            overlay.style.opacity = '1';
        });
        
        item.addEventListener('mouseleave', () => {
            overlay.style.opacity = '0';
        });
        
        // Click handlers
        item.addEventListener('click', (e) => {
            if (e.shiftKey) {
                // Copy to clipboard on Shift+click
                copyImageToClipboard(image.path);
            } else {
                // Show full image on regular click
                showFullImage(image);
            }
        });
        
        // Right-click context menu
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showImageContextMenu(e, image);
        });
        
        item.appendChild(thumbnail);
        item.appendChild(overlay);
        
        return item;
    }
    
    // Create folder navigation item
    function createFolderItem(folder) {
        const item = document.createElement('div');
        item.className = 'gallery-folder-item';
        item.style.cssText = `
            position: relative;
            background: #333;
            border-radius: 6px;
            overflow: hidden;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            border: 2px solid transparent;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 150px;
        `;
        
        // Add hover effects
        item.addEventListener('mouseenter', () => {
            item.style.transform = 'scale(1.05)';
            item.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
            item.style.borderColor = '#4CAF50';
        });
        
        item.addEventListener('mouseleave', () => {
            item.style.transform = 'scale(1)';
            item.style.boxShadow = 'none';
            item.style.borderColor = 'transparent';
        });
        
        // Folder icon
        const folderIcon = document.createElement('div');
        folderIcon.style.cssText = `
            font-size: 48px;
            color: #4CAF50;
            margin-bottom: 10px;
        `;
        folderIcon.textContent = '📁';
        
        // Folder name
        const folderName = document.createElement('div');
        folderName.style.cssText = `
            color: #fff;
            font-size: 12px;
            text-align: center;
            padding: 0 8px;
            word-break: break-word;
            line-height: 1.2;
        `;
        folderName.textContent = folder.name;
        
        // Click handler for folder navigation
        item.addEventListener('click', () => {
            // Load images from the clicked folder
            actions.setCurrentPath(folder.path);
            if (window.galleryEventHandlers && window.galleryEventHandlers.loadImagesFromFolder) {
                window.galleryEventHandlers.loadImagesFromFolder('custom', folder.path);
            } else {
                console.error('Gallery event handlers not available for folder navigation');
            }
        });
        
        item.appendChild(folderIcon);
        item.appendChild(folderName);
        
        return item;
    }
    
    // Create back navigation item
    function createBackNavigationItem() {
        const item = document.createElement('div');
        item.className = 'gallery-back-item';
        item.style.cssText = `
            position: relative;
            background: #2a2a2a;
            border-radius: 6px;
            overflow: hidden;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            border: 2px solid #555;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 150px;
        `;
        
        // Add hover effects
        item.addEventListener('mouseenter', () => {
            item.style.transform = 'scale(1.05)';
            item.style.boxShadow = '0 4px 12px rgba(255, 193, 7, 0.3)';
            item.style.borderColor = '#FFC107';
        });
        
        item.addEventListener('mouseleave', () => {
            item.style.transform = 'scale(1)';
            item.style.boxShadow = 'none';
            item.style.borderColor = '#555';
        });
        
        // Back icon
        const backIcon = document.createElement('div');
        backIcon.style.cssText = `
            font-size: 48px;
            color: #FFC107;
            margin-bottom: 10px;
        `;
        backIcon.textContent = '⬆️';
        
        // Back label
        const backLabel = document.createElement('div');
        backLabel.style.cssText = `
            color: #FFC107;
            font-size: 12px;
            text-align: center;
            font-weight: bold;
        `;
        backLabel.textContent = '.. (Back)';
        
        // Click handler for back navigation
        item.addEventListener('click', () => {
            const currentPath = selectors.currentPath();
            if (currentPath && window.galleryEventHandlers && window.galleryEventHandlers.loadImagesFromFolder) {
                // Navigate to parent directory
                const pathParts = currentPath.split('/').filter(part => part.length > 0);
                
                // Get the selected folder type to determine the base path structure
                const selectedFolderType = selectors.selectedFolder();
                
                // Check if we're going back to the root folder
                // For standard folders like 'input', 'output', the structure is typically:
                // /path/to/comfyui/input/subfolder, so if we remove one level and we're at the base input path,
                // we should return to the root folder type
                const parentPathParts = pathParts.slice(0, -1);
                const parentPath = '/' + parentPathParts.join('/');
                
                // If the parent path ends with the selected folder type (like '/input'), 
                // then we're going back to the root of that folder type
                const isBackToRoot = parentPathParts.length > 0 && 
                                   parentPathParts[parentPathParts.length - 1] === selectedFolderType;
                
                if (isBackToRoot) {
                    // Back to root folder - load the selected folder type (input, output, etc.)
                    window.galleryEventHandlers.loadImagesFromFolder(selectedFolderType);
                } else {
                    // Navigate to parent subfolder
                    window.galleryEventHandlers.loadImagesFromFolder('custom', parentPath);
                }
            } else {
                console.error('Gallery event handlers not available for back navigation');
            }
        });
        
        item.appendChild(backIcon);
        item.appendChild(backLabel);
        
        return item;
    }
    
    // Helper function to format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // Show full image viewer
    function showFullImage(image) {
        // Get current images list and find the index of the current image
        const allImages = selectors.galleryImages();
        let currentImageIndex = allImages.findIndex(img => img.path === image.path);
        if (currentImageIndex === -1) {
            currentImageIndex = 0; // Fallback if not found
        }
        
        let currentImage = image;
        
        actions.selectImage(currentImage.path);
        
        // Update metadata panel to show this image's details
        showImageMetadata(currentImage);
        
        // Create modal overlay
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            overflow: hidden;
        `;
        
        // Create image container
        const imageContainer = document.createElement('div');
        imageContainer.style.cssText = `
            position: relative;
            width: 90vw;
            height: 90vh;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        `;
        
        // Create full image with zoom functionality
        const fullImage = document.createElement('img');
        let isZoomed = false;
        let scale = 1;
        let zoomIndicator; // Declare early, create later
        
        const updateZoomIndicator = () => {
            if (zoomIndicator) {
                if (isZoomed) {
                    zoomIndicator.textContent = `🔍 ${Math.round(scale * 100)}% (Click to fit)`;
                } else {
                    zoomIndicator.textContent = '🔍 Click image to zoom';
                }
            }
        };
        
        const updateImageStyle = () => {
            if (isZoomed) {
                // Enable scrolling when zoomed
                imageContainer.style.overflow = 'auto';
                fullImage.style.cssText = `
                    max-width: none;
                    max-height: none;
                    width: auto;
                    height: auto;
                    transform: scale(${scale});
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                    cursor: zoom-out;
                    transition: transform 0.3s ease;
                    display: block;
                    margin: auto;
                `;
            } else {
                // Disable scrolling when fit to window
                imageContainer.style.overflow = 'hidden';
                fullImage.style.cssText = `
                    max-width: 100%;
                    max-height: 100%;
                    width: auto;
                    height: auto;
                    object-fit: contain;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                    cursor: zoom-in;
                    transition: transform 0.3s ease;
                `;
            }
            updateZoomIndicator();
        };
        
        updateImageStyle();
        
        // Click to zoom functionality
        fullImage.addEventListener('click', (e) => {
            e.stopPropagation();
            isZoomed = !isZoomed;
            if (isZoomed) {
                // Calculate scale to show image at 100% size
                const containerRect = imageContainer.getBoundingClientRect();
                const imageRect = fullImage.getBoundingClientRect();
                
                // Get natural dimensions
                const naturalWidth = fullImage.naturalWidth;
                const naturalHeight = fullImage.naturalHeight;
                
                // Calculate the scale needed to fit the image at its natural size
                const scaleX = naturalWidth / imageRect.width;
                const scaleY = naturalHeight / imageRect.height;
                scale = Math.max(scaleX, scaleY, 1); // Ensure at least 1x zoom
            } else {
                scale = 1;
            }
            updateImageStyle();
        });
        // Generate full image via POST request and create blob URL
        const generateFullImage = async () => {
            try {
                const response = await fetch('/sage_utils/image', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        image_path: currentImage.path
                    })
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    const imageUrl = URL.createObjectURL(blob);
                    fullImage.src = imageUrl;
                } else {
                    console.error('Full image loading failed:', response.statusText);
                    fullImage.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="%23333"/><text x="200" y="150" text-anchor="middle" font-size="16" fill="%23999">Failed to load image</text></svg>';
                }
            } catch (error) {
                console.error('Error loading full image:', error);
                fullImage.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="%23333"/><text x="200" y="150" text-anchor="middle" font-size="16" fill="%23999">Error loading image</text></svg>';
            }
        };
        
        generateFullImage();
        
        // Create close button
        const closeButton = document.createElement('button');
        closeButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: #f44336;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            z-index: 10001;
        `;
        closeButton.textContent = '✕ Close';
        
        // Create zoom indicator
        zoomIndicator = document.createElement('div');
        zoomIndicator.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 10001;
            pointer-events: none;
        `;
        zoomIndicator.textContent = '🔍 Click image to zoom';
        
        // Create navigation controls
        const navControls = document.createElement('div');
        navControls.style.cssText = `
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            gap: 5px;
            background: rgba(0, 0, 0, 0.7);
            padding: 8px 12px;
            border-radius: 4px;
            z-index: 10001;
        `;
        
        const firstButton = document.createElement('button');
        firstButton.innerHTML = '⏮️';
        firstButton.title = 'First Image';
        firstButton.style.cssText = `
            background: #555;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            min-width: 30px;
        `;
        
        const prevButton = document.createElement('button');
        prevButton.innerHTML = '◀️';
        prevButton.title = 'Previous Image';
        prevButton.style.cssText = `
            background: #555;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            min-width: 30px;
        `;
        
        const imageCounter = document.createElement('span');
        const updateCounter = () => {
            imageCounter.textContent = `${currentImageIndex + 1} / ${allImages.length}`;
        };
        updateCounter();
        imageCounter.style.cssText = `
            color: #fff;
            font-size: 11px;
            padding: 0 8px;
            min-width: 50px;
            text-align: center;
        `;
        
        const nextButton = document.createElement('button');
        nextButton.innerHTML = '▶️';
        nextButton.title = 'Next Image';
        nextButton.style.cssText = `
            background: #555;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            min-width: 30px;
        `;
        
        const lastButton = document.createElement('button');
        lastButton.innerHTML = '⏭️';
        lastButton.title = 'Last Image';
        lastButton.style.cssText = `
            background: #555;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            min-width: 30px;
        `;
        
        navControls.appendChild(firstButton);
        navControls.appendChild(prevButton);
        navControls.appendChild(imageCounter);
        navControls.appendChild(nextButton);
        navControls.appendChild(lastButton);
        
        // Navigation functionality
        const updateImageAndMetadata = async (newIndex) => {
            if (newIndex < 0 || newIndex >= allImages.length) return;
            
            currentImageIndex = newIndex;
            currentImage = allImages[currentImageIndex];
            
            // Update counter
            updateCounter();
            
            // Update image
            generateFullImage();
            
            // Update metadata
            showImageMetadata(currentImage);
            
            // Update state
            actions.selectImage(currentImage.path);
            
            // Update button states
            firstButton.disabled = currentImageIndex === 0;
            prevButton.disabled = currentImageIndex === 0;
            nextButton.disabled = currentImageIndex === allImages.length - 1;
            lastButton.disabled = currentImageIndex === allImages.length - 1;
            
            // Update button styles for disabled state
            [firstButton, prevButton, nextButton, lastButton].forEach(btn => {
                if (btn.disabled) {
                    btn.style.background = '#333';
                    btn.style.cursor = 'not-allowed';
                } else {
                    btn.style.background = '#555';
                    btn.style.cursor = 'pointer';
                }
            });
        };
        
        // Navigation event listeners
        firstButton.addEventListener('click', (e) => {
            e.stopPropagation();
            updateImageAndMetadata(0);
        });
        prevButton.addEventListener('click', (e) => {
            e.stopPropagation();
            updateImageAndMetadata(currentImageIndex - 1);
        });
        nextButton.addEventListener('click', (e) => {
            e.stopPropagation();
            updateImageAndMetadata(currentImageIndex + 1);
        });
        lastButton.addEventListener('click', (e) => {
            e.stopPropagation();
            updateImageAndMetadata(allImages.length - 1);
        });
        
        // Initial button state update
        updateImageAndMetadata(currentImageIndex);
        
        // Create actions bar
        const actionsBar = document.createElement('div');
        actionsBar.style.cssText = `
            position: absolute;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 10px;
            justify-content: center;
            z-index: 10001;
        `;
        
        const copyButton = document.createElement('button');
        copyButton.style.cssText = `
            background: #4CAF50;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        copyButton.textContent = '📋 Copy';
        copyButton.addEventListener('click', (e) => {
            e.stopPropagation();
            copyImageToClipboard(currentImage.path);
        });
        
        const metadataButton = document.createElement('button');
        metadataButton.style.cssText = `
            background: #2196F3;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        metadataButton.textContent = '🔍 Details';
        metadataButton.addEventListener('click', (e) => {
            e.stopPropagation();
            showImageMetadata(currentImage);
            modal.remove();
        });

        const datasetTextButton = document.createElement('button');
        datasetTextButton.style.cssText = `
            background: #FF9800;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        datasetTextButton.textContent = '📝 Dataset Text';
        datasetTextButton.addEventListener('click', (e) => {
            e.stopPropagation();
            modal.remove();
            showCombinedImageTextEditor(currentImage);
        });
        
        actionsBar.appendChild(copyButton);
        actionsBar.appendChild(metadataButton);
        actionsBar.appendChild(datasetTextButton);
        
        // Close handlers
        const closeModal = () => {
            document.removeEventListener('keydown', handleKeydown);
            modal.remove();
        };
        closeButton.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        // Keyboard handler with navigation
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleKeydown);
            } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                e.preventDefault();
                updateImageAndMetadata(currentImageIndex - 1);
            } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                e.preventDefault();
                updateImageAndMetadata(currentImageIndex + 1);
            } else if (e.key === 'Home') {
                e.preventDefault();
                updateImageAndMetadata(0);
            } else if (e.key === 'End') {
                e.preventDefault();
                updateImageAndMetadata(allImages.length - 1);
            }
        };
        document.addEventListener('keydown', handleKeydown);
        
        // Assemble modal
        imageContainer.appendChild(fullImage);
        imageContainer.appendChild(closeButton);
        imageContainer.appendChild(navControls);
        imageContainer.appendChild(zoomIndicator);
        imageContainer.appendChild(actionsBar);
        modal.appendChild(imageContainer);
        document.body.appendChild(modal);
        
        // Prevent clicking on image from closing modal
        imageContainer.addEventListener('click', (e) => e.stopPropagation());
    }

    // Copy image to clipboard
    async function copyImageToClipboard(imagePath) {
        try {
            setStatus('Copying image to clipboard...');
            
            const response = await api.fetchApi('/sage_utils/copy_image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_path: imagePath })
            });
            
            const result = await response.json();
            
            if (result.success) {
                setStatus('Image copied to clipboard!');
            } else {
                throw new Error(result.error || 'Failed to copy image');
            }
            
        } catch (error) {
            console.error('Error copying image:', error);
            setStatus(`Error copying image: ${error.message}`, true);
        }
    }

    // Show image metadata
    async function showImageMetadata(image) {
        try {
            setStatus('Loading image metadata...');
            actions.toggleMetadata(true);
            metadata.metadataSection.style.display = 'block';
            
            const response = await api.fetchApi('/sage_utils/image_metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_path: image.path })
            });
            
            const result = await response.json();
            
            if (result.success) {
                const metadataObj = result.metadata;
                let html = '';
                let hasErrors = false;
                
                // File Information - always try to show this first
                try {
                    if (metadataObj.file_info) {
                        html += '<div style="color: #4CAF50; margin-bottom: 10px; font-weight: bold;">📄 File Information</div>';
                        const fileInfo = metadataObj.file_info;
                        
                        if (fileInfo.filename) html += `<div>Name: ${fileInfo.filename}</div>`;
                        if (fileInfo.dimensions) {
                            html += `<div>Dimensions: ${fileInfo.dimensions.width} × ${fileInfo.dimensions.height}</div>`;
                        }
                        if (fileInfo.size_human || fileInfo.size) {
                            html += `<div>Size: ${fileInfo.size_human || formatFileSize(fileInfo.size)}</div>`;
                        }
                        if (fileInfo.format) html += `<div>Format: ${fileInfo.format}</div>`;
                        if (fileInfo.modified) {
                            html += `<div>Modified: ${new Date(fileInfo.modified).toLocaleString()}</div>`;
                        }
                        if (fileInfo.error) {
                            html += `<div style="color: #ff9800;">⚠️ ${fileInfo.error}</div>`;
                            hasErrors = true;
                        }
                        html += '<br>';
                    }
                } catch (fileInfoError) {
                    html += '<div style="color: #ff9800;">⚠️ Could not load file information</div><br>';
                    hasErrors = true;
                }
                
                // EXIF Data - handle gracefully if it fails
                try {
                    if (metadataObj.exif && Object.keys(metadataObj.exif).length > 0) {
                        html += '<div style="color: #2196F3; margin-bottom: 10px; font-weight: bold;">📷 EXIF Data</div>';
                        Object.entries(metadataObj.exif).forEach(([key, value]) => {
                            try {
                                // Handle values that might have conversion issues
                                let displayValue = value;
                                if (typeof value === 'number' && !Number.isFinite(value)) {
                                    displayValue = 'N/A';
                                } else if (typeof value === 'object' && value !== null) {
                                    displayValue = JSON.stringify(value);
                                }
                                html += `<div>${key}: ${displayValue}</div>`;
                            } catch (exifItemError) {
                                html += `<div>${key}: <em style="color: #ff9800;">Error reading value</em></div>`;
                            }
                        });
                        html += '<br>';
                    }
                } catch (exifError) {
                    html += '<div style="color: #ff9800;">⚠️ EXIF data could not be fully loaded</div><br>';
                    hasErrors = true;
                }
                
                // Generation Parameters - handle gracefully if it fails
                try {
                    if (metadataObj.generation_params && Object.keys(metadataObj.generation_params).length > 0) {
                        html += '<div style="color: #FF9800; margin-bottom: 10px; font-weight: bold;">🎨 Generation Parameters</div>';
                        Object.entries(metadataObj.generation_params).forEach(([key, value]) => {
                            try {
                                if (typeof value === 'object') {
                                    html += `<div>${key}: <pre style="margin: 5px 0; background: #444; padding: 5px; border-radius: 3px; font-size: 10px;">${JSON.stringify(value, null, 2)}</pre></div>`;
                                } else {
                                    html += `<div>${key}: ${value}</div>`;
                                }
                            } catch (paramError) {
                                html += `<div>${key}: <em style="color: #ff9800;">Error reading parameter</em></div>`;
                            }
                        });
                        html += '<br>';
                    }
                } catch (paramsError) {
                    html += '<div style="color: #ff9800;">⚠️ Generation parameters could not be fully loaded</div><br>';
                    hasErrors = true;
                }
                
                if (!html) {
                    html = '<em style="color: #999;">No metadata available for this image</em>';
                }
                
                if (hasErrors) {
                    html = '<div style="color: #ff9800; margin-bottom: 10px;">⚠️ Some metadata could not be loaded completely</div>' + html;
                }
                
                metadata.metadataContent.innerHTML = html;
                setStatus(hasErrors ? 'Metadata loaded with some warnings' : 'Metadata loaded');
                
            } else {
                throw new Error(result.error || 'Failed to load metadata');
            }
            
        } catch (error) {
            console.error('Error loading metadata:', error);
            
            // Try to show basic file information even if metadata extraction failed
            let fallbackHtml = '';
            try {
                fallbackHtml += '<div style="color: #4CAF50; margin-bottom: 10px; font-weight: bold;">📄 Basic File Information</div>';
                fallbackHtml += `<div>Path: ${image.path}</div>`;
                fallbackHtml += `<div>Filename: ${image.filename || 'Unknown'}</div>`;
                if (image.modified) {
                    fallbackHtml += `<div>Modified: ${new Date(image.modified).toLocaleString()}</div>`;
                }
                fallbackHtml += '<br>';
            } catch (fallbackError) {
                // If even basic info fails, show minimal info
                fallbackHtml = `<div>Path: ${image.path}</div><br>`;
            }
            
            fallbackHtml += `
                <div style="color: #f44336;">❌ Full metadata extraction failed</div>
                <div style="color: #888; font-size: 10px; margin-top: 5px;">${error.message}</div>
                <div style="color: #ff9800; font-size: 10px; margin-top: 5px;">
                    This may be due to complex EXIF data that cannot be processed.
                </div>
            `;
            
            metadata.metadataContent.innerHTML = fallbackHtml;
            setStatus(`Metadata extraction failed, showing basic info`, true);
        }
    }

    // Show image context menu
    function showImageContextMenu(event, image) {
        // Create context menu
        const menu = document.createElement('div');
        menu.style.cssText = `
            position: fixed;
            top: ${event.clientY}px;
            left: ${event.clientX}px;
            background: #333;
            border: 1px solid #555;
            border-radius: 4px;
            padding: 5px 0;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        `;
        
        const menuItems = [
            { text: '👁️ View Full Size', action: () => showFullImage(image) },
            { text: '📋 Copy to Clipboard', action: () => copyImageToClipboard(image.path) },
            { text: '🔍 Show Details', action: () => showImageMetadata(image) },
            { text: '📝 Dataset Text...', action: () => handleDatasetText(image), dynamic: true }
        ];
        
        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.style.cssText = `
                padding: 8px 16px;
                cursor: pointer;
                font-size: 12px;
                color: #fff;
                transition: background-color 0.2s ease;
            `;
            
            // Handle dynamic menu item
            if (item.dynamic) {
                menuItem.textContent = item.text; // Initially show generic text
                // We'll update this dynamically in handleDatasetText
            } else {
                menuItem.textContent = item.text;
            }
            
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.backgroundColor = '#4CAF50';
            });
            
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.backgroundColor = 'transparent';
            });
            
            menuItem.addEventListener('click', () => {
                item.action();
                menu.remove();
            });
            
            menu.appendChild(menuItem);
        });
        
        document.body.appendChild(menu);
        
        // Remove menu when clicking elsewhere
        const removeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', removeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', removeMenu);
        }, 10);
    }

    // Toggle view mode
    function toggleViewMode() {
        const currentMode = selectors.galleryViewMode();
        const newMode = currentMode === 'grid' ? 'list' : 'grid';
        actions.setViewMode(newMode);
        
        folderAndControls.viewModeButton.textContent = newMode === 'grid' ? '⊞ Grid View' : '☰ List View';
        
        // Update grid layout based on view mode
        updateGridLayout();
        
        // Re-render images with new layout
        const images = selectors.galleryImages();
        const folders = selectors.galleryFolders();
        if (images && images.length > 0) {
            renderImageGrid(images, folders).catch(console.error);
        }
        setStatus(`Switched to ${newMode} view`);
    }

    // Show metadata panel
    function showMetadata(imagePath) {
        actions.toggleMetadata(true);
        metadata.metadataSection.style.display = 'block';
        
        // Load actual metadata using the real function
        const images = selectors.galleryImages();
        if (images) {
            const image = images.find(img => img.path === imagePath || img.relative_path === imagePath);
            if (image) {
                showImageMetadata(image);
                return; // Exit early, showImageMetadata will handle the display
            }
        }
        
        // Fallback display if image not found
        metadata.metadataContent.innerHTML = `
            <div style="color: #4CAF50; margin-bottom: 10px;">📄 File Information</div>
            <div>Path: ${imagePath}</div>
            <div>Status: Metadata loading not yet implemented</div>
            <br>
            <div style="color: #2196F3;">🔄 Implementation Status</div>
            <div>• Basic UI structure: ✅ Complete</div>
            <div>• Image loading: ⏳ Phase 2</div>
            <div>• Metadata extraction: ⏳ Phase 2</div>
            <div>• Thumbnail generation: ⏳ Phase 2</div>
        `;
    }

    // Hide metadata panel
    function hideMetadata() {
        // Instead of hiding the panel, show a "no image selected" message
        actions.toggleMetadata(false);
        metadata.metadataContent.innerHTML = `
            <div style="color: #888; text-align: center; padding: 20px;">
                <div style="font-size: 24px; margin-bottom: 10px;">👁️</div>
                <div>No image selected</div>
                <div style="font-size: 12px; margin-top: 5px;">
                    Click on an image to view its details
                </div>
            </div>
        `;
        // Keep the panel visible
        // metadata.metadataSection.style.display = 'none';
    }

    // Set up event listeners
    folderAndControls.folderDropdown.addEventListener('change', (e) => {
        const selectedFolder = e.target.value;
        actions.selectFolder(selectedFolder);
        
        if (selectedFolder === 'custom') {
            folderAndControls.browseButton.style.display = 'block';
            setStatus('Please click Browse to select a custom folder');
        } else {
            folderAndControls.browseButton.style.display = 'none';
            loadImagesFromFolder(selectedFolder);
        }
    });

    folderAndControls.browseButton.addEventListener('click', () => {
        // Implement custom folder browser
        browseCustomFolder();
    });

    folderAndControls.searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        actions.setSearchQuery(query);
        // Implement search filtering
        filterAndSortImages();
        setStatus(query ? `Searching for: "${query}"` : 'Search cleared');
    });

    folderAndControls.sortSelect.addEventListener('change', (e) => {
        const baseSortBy = e.target.value; // Base sort criteria (name, date, size, type)
        const currentSort = selectors.gallerySortBy();
        const isDescending = currentSort.endsWith('-desc');
        
        // Apply current sort direction to new criteria
        const newSort = isDescending ? baseSortBy + '-desc' : baseSortBy;
        actions.updateSort(newSort);
        updateSortUI(); // Update the order button
        filterAndSortImages();
        setStatus(`Sorted by: ${e.target.options[e.target.selectedIndex].text} (${isDescending ? 'Descending' : 'Ascending'})`);
    });

    folderAndControls.refreshButton.addEventListener('click', refreshCurrentFolder);
    folderAndControls.viewModeButton.addEventListener('click', toggleViewMode);

    // Add event handlers for the new combined controls
    folderAndControls.clearButton.addEventListener('click', () => {
        folderAndControls.searchInput.value = '';
        actions.setSearchQuery('');
        filterAndSortImages();
        setStatus('Search cleared');
    });

    folderAndControls.orderButton.addEventListener('click', () => {
        const currentSort = selectors.gallerySortBy();
        let newSort;
        
        // Toggle between ascending and descending versions
        if (currentSort.endsWith('-desc')) {
            // Remove -desc suffix for ascending
            newSort = currentSort.replace('-desc', '');
        } else {
            // Add -desc suffix for descending  
            newSort = currentSort + '-desc';
        }
        
        actions.updateSort(newSort);
        updateSortUI(); // This will set both dropdown and button correctly
        filterAndSortImages();
        setStatus(`Sort order: ${newSort.endsWith('-desc') ? 'Descending' : 'Ascending'}`);
    });

    // Function to update grid layout based on current settings
    function updateGridLayout() {
        const currentMode = selectors.galleryViewMode();
        if (currentMode === 'list') {
            grid.gridContainer.style.gridTemplateColumns = '1fr';
            grid.gridContainer.style.gap = '5px';
        } else {
            const thumbnailSizeConfig = getThumbnailSize(selectors.thumbnailSize());
            grid.gridContainer.style.gridTemplateColumns = `repeat(auto-fill, minmax(${thumbnailSizeConfig.width}px, 1fr))`;
            grid.gridContainer.style.gap = '10px';
        }
    }

    // Function to update UI based on current sort state
    function updateSortUI() {
        const currentSort = selectors.gallerySortBy();
        // Extract base sort criteria (remove -desc suffix if present)
        const baseSortCriteria = currentSort.endsWith('-desc') ? currentSort.replace('-desc', '') : currentSort;
        folderAndControls.sortSelect.value = baseSortCriteria;
        folderAndControls.orderButton.textContent = currentSort.endsWith('-desc') ? '↓' : '↑';
    }

    // Function to update thumbnail size UI based on current state
    function updateThumbnailSizeUI() {
        const currentSize = selectors.thumbnailSize();
        folderAndControls.thumbnailSizeSelect.value = currentSize;
    }

    folderAndControls.thumbnailSizeSelect.addEventListener('change', (e) => {
        const size = e.target.value;
        actions.setThumbnailSize(size);
        // Update grid layout with new thumbnail size
        updateGridLayout();
        // Refresh current folder to re-render with new size
        refreshCurrentFolder();
        setStatus(`Thumbnail size: ${size}`);
    });

    metadata.closeButton.addEventListener('click', hideMetadata);

    // Demo: Show metadata panel when grid header is clicked
    grid.gridHeader.addEventListener('click', () => {
        if (metadata.metadataSection.style.display === 'none') {
            showMetadata('demo/image/path.jpg');
        } else {
            hideMetadata();
        }
    });

    // Browse custom folder
    async function browseCustomFolder() {
        try {
            setStatus('Opening folder browser...');
            
            // For now, show an input dialog - in future could integrate with system file browser
            const folderPath = prompt('Enter folder path:', '/home/');
            if (!folderPath) return;
            
            setStatus('Checking folder...');
            
            const response = await api.fetchApi('/sage_utils/browse_folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder_path: folderPath })
            });
            
            const result = await response.json();
            
            if (result.success) {
                const { path, folders, images } = result;
                
                if (images.length === 0) {
                    setStatus(`Folder "${path}" contains no images`, true);
                    return;
                }
                
                // Add to folder selector if it's a valid custom folder
                const customOption = document.createElement('option');
                customOption.value = path;
                customOption.textContent = `Custom: ${path}`;
                folderAndControls.folderDropdown.appendChild(customOption);
                
                // Select the new folder
                actions.selectFolder(path);
                folderAndControls.folderDropdown.value = path;
                
                // Load images
                actions.setImages(images);
                renderImageGrid(images, folders).catch(console.error);
                
                setStatus(`Loaded ${images.length} images from custom folder`);
                
            } else {
                throw new Error(result.error || 'Failed to browse folder');
            }
            
        } catch (error) {
            console.error('Error browsing folder:', error);
            setStatus(`Error browsing folder: ${error.message}`, true);
        }
    }

    // Refresh current folder
    function refreshCurrentFolder() {
        const currentFolder = selectors.selectedFolder();
        if (currentFolder) {
            setStatus('Refreshing folder...');
            loadImagesFromFolder(currentFolder);
        } else {
            setStatus('No folder selected to refresh', true);
        }
    }

    // Filter and sort images
    function filterAndSortImages() {
        const images = selectors.galleryImages();
        const folders = selectors.galleryFolders();
        if (images && images.length > 0) {
            renderImageGrid(images, folders).catch(console.error);
        }
    }

    // Initialize UI state
    updateSortUI();
    updateThumbnailSizeUI();
    updateGridLayout();

    // Store functions for external access
    return {
        loadImagesFromFolder,
        refreshCurrentFolder,
        toggleViewMode,
        showMetadata,
        hideMetadata,
        browseCustomFolder,
        filterAndSortImages,
        updateGridLayout,
        updateThumbnailSizeUI
    };
}

/**
 * Assembles the complete Image Gallery tab layout
 * @param {HTMLElement} container - Container element to populate
 * @param {Object} components - All tab components
 */
function assembleGalleryTabLayout(container, components) {
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

// Dataset text editing functions (globally accessible)
async function handleDatasetText(image) {
    showCombinedImageTextEditor(image);
}

async function showCombinedImageTextEditor(image) {
    // Get current images list and find the index of the current image
    const allImages = selectors.galleryImages();
    let currentImageIndex = allImages.findIndex(img => img.path === image.path);
    if (currentImageIndex === -1) {
        currentImageIndex = 0; // Fallback if not found
    }
    
    let currentImage = image;
    const imageName = currentImage.name || currentImage.path.split('/').pop() || 'Unknown Image';
    
    // Function to load dataset text for current image
    const loadDatasetText = async () => {
        let textContent = '';
        let isNew = true;
        
        try {
            const checkResponse = await fetch('/sage_utils/check_dataset_text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_path: currentImage.path })
            });
            
            const checkResult = await checkResponse.json();
            if (checkResult.success && checkResult.exists) {
                const readResponse = await fetch('/sage_utils/read_dataset_text', {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image_path: currentImage.path })
                });
                
                const readResult = await readResponse.json();
                if (readResult.success) {
                    textContent = readResult.content;
                    isNew = false;
                }
            }
        } catch (error) {
            console.error('Error loading dataset text:', error);
        }
        
        return { textContent, isNew };
    };
    
    // Initial load
    let { textContent, isNew } = await loadDatasetText();
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    // Create main container
    const container = document.createElement('div');
    container.style.cssText = `
        background: #2d2d2d;
        border-radius: 8px;
        width: 95vw;
        max-width: 1400px;
        height: 90vh;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        border: 1px solid #555;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    `;
    
    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 15px 20px;
        border-bottom: 1px solid #555;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #333;
        min-height: 60px;
        flex-wrap: nowrap;
        gap: 10px;
    `;
    
    const title = document.createElement('h3');
    const updateTitle = () => {
        const currentImageName = currentImage.name || currentImage.path.split('/').pop() || 'Unknown Image';
        title.textContent = `${isNew ? 'Create' : 'Edit'} Dataset Text for ${currentImageName}`;
        title.title = `${isNew ? 'Create' : 'Edit'} Dataset Text for ${currentImageName}`;
    };
    updateTitle();
    title.style.cssText = `
        color: #fff;
        margin: 0;
        font-size: 16px;
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 300px;
    `;
    
    // Navigation controls
    const navControls = document.createElement('div');
    navControls.style.cssText = `
        display: flex;
        align-items: center;
        gap: 5px;
        margin: 0 10px;
        flex-shrink: 0;
    `;
    
    const firstButton = document.createElement('button');
    firstButton.innerHTML = '⏮️';
    firstButton.title = 'First Image';
    firstButton.style.cssText = `
        background: #555;
        color: white;
        border: none;
        padding: 6px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        min-width: 40px;
    `;
    
    const prevButton = document.createElement('button');
    prevButton.innerHTML = '◀️';
    prevButton.title = 'Previous Image';
    prevButton.style.cssText = `
        background: #555;
        color: white;
        border: none;
        padding: 6px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        min-width: 40px;
    `;
    
    const imageCounter = document.createElement('span');
    const updateCounter = () => {
        imageCounter.textContent = `${currentImageIndex + 1} / ${allImages.length}`;
    };
    updateCounter();
    imageCounter.style.cssText = `
        color: #fff;
        font-size: 12px;
        padding: 0 10px;
        min-width: 60px;
        text-align: center;
    `;
    
    const nextButton = document.createElement('button');
    nextButton.innerHTML = '▶️';
    nextButton.title = 'Next Image';
    nextButton.style.cssText = `
        background: #555;
        color: white;
        border: none;
        padding: 6px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        min-width: 40px;
    `;
    
    const lastButton = document.createElement('button');
    lastButton.innerHTML = '⏭️';
    lastButton.title = 'Last Image';
    lastButton.style.cssText = `
        background: #555;
        color: white;
        border: none;
        padding: 6px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        min-width: 40px;
    `;
    
    navControls.appendChild(firstButton);
    navControls.appendChild(prevButton);
    navControls.appendChild(imageCounter);
    navControls.appendChild(nextButton);
    navControls.appendChild(lastButton);
    
    const toggleButton = document.createElement('button');
    toggleButton.style.cssText = `
        background: #4CAF50;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    `;
    toggleButton.textContent = '�️ Hide Text Editor';
    
    const closeButton = document.createElement('button');
    closeButton.style.cssText = `
        background: #f44336;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    `;
    closeButton.textContent = '✕ Close';
    
    const headerButtons = document.createElement('div');
    headerButtons.style.cssText = 'display: flex; gap: 10px; flex-shrink: 0;';
    headerButtons.appendChild(toggleButton);
    headerButtons.appendChild(closeButton);
    
    header.appendChild(title);
    header.appendChild(navControls);
    header.appendChild(headerButtons);
    
    // Create batch operations row
    const batchOpsRow = document.createElement('div');
    batchOpsRow.style.cssText = `
        padding: 10px 20px;
        border-bottom: 1px solid #555;
        background: #2a2a2a;
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
    `;
    
    const batchLabel = document.createElement('span');
    batchLabel.textContent = 'Batch Operations:';
    batchLabel.style.cssText = `
        color: #ccc;
        font-size: 12px;
        font-weight: bold;
        margin-right: 10px;
    `;
    
    const createAllButton = document.createElement('button');
    createAllButton.style.cssText = `
        background: #4CAF50;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
    `;
    createAllButton.textContent = '📝 Create Missing Text Files';
    createAllButton.title = 'Create text files for all images in folder that don\'t have one';
    
    const appendAllButton = document.createElement('button');
    appendAllButton.style.cssText = `
        background: #FF9800;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
    `;
    appendAllButton.textContent = '➕ Add to All';
    appendAllButton.title = 'Add text to beginning or end of all existing text files in folder';
    
    const findReplaceAllButton = document.createElement('button');
    findReplaceAllButton.style.cssText = `
        background: #2196F3;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
    `;
    findReplaceAllButton.textContent = '🔄 Find & Replace All';
    findReplaceAllButton.title = 'Find and replace text in all text files in folder';
    
    batchOpsRow.appendChild(batchLabel);
    batchOpsRow.appendChild(createAllButton);
    batchOpsRow.appendChild(appendAllButton);
    batchOpsRow.appendChild(findReplaceAllButton);
    
    // Batch operation event handlers
    createAllButton.addEventListener('click', async () => {
        const confirmed = confirm('This will create text files for all images in the current folder that don\'t have one. Continue?');
        if (!confirmed) return;
        
        await batchCreateMissingTextFiles();
    });
    
    appendAllButton.addEventListener('click', async () => {
        const textToAppend = prompt('Enter text to add to all existing text files in this folder:');
        if (textToAppend === null || textToAppend.trim() === '') return;
        
        const position = confirm('Click OK to add at BEGINNING of files, or Cancel to add at END of files.');
        const positionText = position ? 'beginning' : 'end';
        
        const confirmed = confirm(`This will add "${textToAppend}" to the ${positionText} of all existing text files in the current folder. Continue?`);
        if (!confirmed) return;
        
        await batchAppendToAllTextFiles(textToAppend.trim(), position);
    });
    
    findReplaceAllButton.addEventListener('click', async () => {
        const findText = prompt('Enter text to find:');
        if (findText === null || findText === '') return;
        
        const replaceText = prompt('Enter replacement text:');
        if (replaceText === null) return;
        
        const confirmed = confirm(`This will replace all instances of "${findText}" with "${replaceText}" in all text files in the current folder. Continue?`);
        if (!confirmed) return;
        
        await batchFindReplaceAllTextFiles(findText, replaceText);
    });
    
    // Create content area
    const contentArea = document.createElement('div');
    contentArea.style.cssText = `
        flex: 1;
        display: flex;
        overflow: hidden;
    `;
    
    // Create image panel
    const imagePanel = document.createElement('div');
    imagePanel.style.cssText = `
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #1a1a1a;
        overflow: hidden;
        position: relative;
    `;
    
    // Create full image with zoom functionality
    const fullImage = document.createElement('img');
    let isZoomed = false;
    let scale = 1;
    
    const updateImageStyle = () => {
        if (isZoomed) {
            imagePanel.style.overflow = 'auto';
            fullImage.style.cssText = `
                max-width: none;
                max-height: none;
                width: auto;
                height: auto;
                transform: scale(${scale});
                cursor: zoom-out;
                transition: transform 0.3s ease;
                display: block;
                margin: auto;
            `;
        } else {
            imagePanel.style.overflow = 'hidden';
            fullImage.style.cssText = `
                max-width: 100%;
                max-height: 100%;
                width: auto;
                height: auto;
                object-fit: contain;
                cursor: zoom-in;
                transition: transform 0.3s ease;
            `;
        }
    };
    
    updateImageStyle();
    
    // Click to zoom functionality
    fullImage.addEventListener('click', (e) => {
        e.stopPropagation();
        isZoomed = !isZoomed;
        if (isZoomed) {
            const containerRect = imagePanel.getBoundingClientRect();
            const imageRect = fullImage.getBoundingClientRect();
            const naturalWidth = fullImage.naturalWidth;
            const naturalHeight = fullImage.naturalHeight;
            const scaleX = naturalWidth / imageRect.width;
            const scaleY = naturalHeight / imageRect.height;
            scale = Math.max(scaleX, scaleY, 1);
        } else {
            scale = 1;
        }
        updateImageStyle();
    });
    
    // Load image
    const generateFullImage = async () => {
        try {
            const response = await fetch('/sage_utils/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_path: currentImage.path })
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const imageUrl = URL.createObjectURL(blob);
                fullImage.src = imageUrl;
            } else {
                fullImage.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="%23333"/><text x="200" y="150" text-anchor="middle" font-size="16" fill="%23999">Failed to load image</text></svg>';
            }
        } catch (error) {
            console.error('Error loading image:', error);
            fullImage.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="%23333"/><text x="200" y="150" text-anchor="middle" font-size="16" fill="%23999">Error loading image</text></svg>';
        }
    };
    
    generateFullImage();
    imagePanel.appendChild(fullImage);
    
    // Create text editor panel (initially visible)
    const textPanel = document.createElement('div');
    textPanel.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        background: #2d2d2d;
        border-left: 1px solid #555;
    `;
    
    const textArea = document.createElement('textarea');
    textArea.value = textContent;
    textArea.setAttribute('data-image-path', currentImage.path);
    textArea.style.cssText = `
        flex: 1;
        background: #333;
        color: #fff;
        border: none;
        padding: 15px;
        font-family: monospace;
        font-size: 13px;
        resize: none;
        outline: none;
    `;
    
    const textActions = document.createElement('div');
    textActions.style.cssText = `
        padding: 15px;
        border-top: 1px solid #555;
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        background: #333;
    `;
    
    const saveButton = document.createElement('button');
    saveButton.textContent = isNew ? 'Create' : 'Save';
    saveButton.style.cssText = `
        background: #4CAF50;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    `;
    
    textActions.appendChild(saveButton);
    textPanel.appendChild(textArea);
    textPanel.appendChild(textActions);
    
    contentArea.appendChild(imagePanel);
    contentArea.appendChild(textPanel);
    
    // Toggle functionality (start with text editor visible)
    let textEditorVisible = true;
    toggleButton.addEventListener('click', () => {
        textEditorVisible = !textEditorVisible;
        if (textEditorVisible) {
            textPanel.style.display = 'flex';
            toggleButton.textContent = '🖼️ Hide Text Editor';
            imagePanel.style.flex = '1';
        } else {
            textPanel.style.display = 'none';
            toggleButton.textContent = '📝 Show Text Editor';
            imagePanel.style.flex = '1';
        }
    });
    
    // Navigation functionality
    const updateImageAndText = async (newIndex) => {
        if (newIndex < 0 || newIndex >= allImages.length) return;
        
        currentImageIndex = newIndex;
        currentImage = allImages[currentImageIndex];
        
        // Update UI elements
        updateTitle();
        updateCounter();
        
        // Update image
        generateFullImage();
        
        // Load new text content
        const result = await loadDatasetText();
        textContent = result.textContent;
        isNew = result.isNew;
        textArea.value = textContent;
        textArea.setAttribute('data-image-path', currentImage.path);
        saveButton.textContent = isNew ? 'Create' : 'Save';
        
        // Update button states
        firstButton.disabled = currentImageIndex === 0;
        prevButton.disabled = currentImageIndex === 0;
        nextButton.disabled = currentImageIndex === allImages.length - 1;
        lastButton.disabled = currentImageIndex === allImages.length - 1;
        
        // Update button styles for disabled state
        [firstButton, prevButton, nextButton, lastButton].forEach(btn => {
            if (btn.disabled) {
                btn.style.background = '#333';
                btn.style.cursor = 'not-allowed';
            } else {
                btn.style.background = '#555';
                btn.style.cursor = 'pointer';
            }
        });
    };
    
    // Navigation event listeners
    firstButton.addEventListener('click', () => updateImageAndText(0));
    prevButton.addEventListener('click', () => updateImageAndText(currentImageIndex - 1));
    nextButton.addEventListener('click', () => updateImageAndText(currentImageIndex + 1));
    lastButton.addEventListener('click', () => updateImageAndText(allImages.length - 1));
    
    // Keyboard navigation
    const keyboardHandler = (e) => {
        if (e.target.tagName === 'TEXTAREA') return; // Don't interfere with text editing
        
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                updateImageAndText(currentImageIndex - 1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                updateImageAndText(currentImageIndex + 1);
                break;
            case 'Home':
                e.preventDefault();
                updateImageAndText(0);
                break;
            case 'End':
                e.preventDefault();
                updateImageAndText(allImages.length - 1);
                break;
        }
    };
    document.addEventListener('keydown', keyboardHandler);
    
    // Initial button state update
    updateImageAndText(currentImageIndex);
    
    // Save functionality
    saveButton.addEventListener('click', async () => {
        try {
            const response = await fetch('/sage_utils/save_dataset_text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_path: image.path,
                    content: textArea.value
                })
            });
            
            const result = await response.json();
            if (result.success) {
                alert(`Dataset text ${isNew ? 'created' : 'saved'} successfully!`);
                // Update button text and state
                if (isNew) {
                    isNew = false;
                    saveButton.textContent = 'Save';
                    title.textContent = `Edit Dataset Text for ${imageName}`;
                }
            } else {
                alert(`Failed to ${isNew ? 'create' : 'save'} dataset text: ${result.error}`);
            }
        } catch (error) {
            console.error('Error saving dataset text:', error);
            alert(`Error saving dataset text: ${error.message}`);
        }
    });
    
    // Close functionality
    const closeModal = () => {
        document.removeEventListener('keydown', keyboardHandler);
        document.removeEventListener('keydown', escapeHandler);
        overlay.remove();
    };
    
    closeButton.addEventListener('click', closeModal);
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal();
        }
    });
    
    // Escape key handler
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    };
    document.addEventListener('keydown', escapeHandler);
    
    // Assemble modal
    container.appendChild(header);
    container.appendChild(batchOpsRow);
    container.appendChild(contentArea);
    overlay.appendChild(container);
    document.body.appendChild(overlay);
    
    // Prevent clicks from closing modal
    container.addEventListener('click', (e) => e.stopPropagation());
}

async function editDatasetText(image) {
    try {
        // Read the existing text
        const readResponse = await fetch('/sage_utils/read_dataset_text', {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_path: image.path })
        });
        
        const readResult = await readResponse.json();
        if (!readResult.success) {
            console.error('Failed to read dataset text:', readResult.error);
            alert(`Failed to read text file: ${readResult.error}`);
            return;
        }
        
        // Show edit dialog
        showDatasetTextEditor(image, readResult.content, false);
        
    } catch (error) {
        console.error('Error editing dataset text:', error);
        alert(`Error editing dataset text: ${error.message}`);
    }
}

async function createDatasetText(image) {
    try {
        // Show create dialog with empty content
        showDatasetTextEditor(image, '', true);
        
    } catch (error) {
        console.error('Error creating dataset text:', error);
        alert(`Error creating dataset text: ${error.message}`);
    }
}

function showDatasetTextEditor(image, content, isNew) {
    // Get the image name from the path
    const imageName = image.name || image.path.split('/').pop() || 'Unknown Image';
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: #2d2d2d;
        border-radius: 8px;
        padding: 20px;
        width: 80%;
        max-width: 600px;
        max-height: 80%;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        border: 1px solid #555;
    `;
    
    // Title
    const title = document.createElement('h3');
    title.textContent = `${isNew ? 'Create' : 'Edit'} Dataset Text for ${imageName}`;
    title.style.cssText = `
        color: #fff;
        margin: 0 0 15px 0;
        font-size: 16px;
        border-bottom: 1px solid #555;
        padding-bottom: 10px;
    `;
    
    // Text area
    const textarea = document.createElement('textarea');
    textarea.value = content;
    textarea.style.cssText = `
        width: 100%;
        height: 300px;
        background: #333;
        color: #fff;
        border: 1px solid #555;
        border-radius: 4px;
        padding: 10px;
        font-family: monospace;
        font-size: 12px;
        resize: vertical;
        box-sizing: border-box;
    `;
    
    // Buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 15px;
    `;
    
    // Save button
    const saveButton = document.createElement('button');
    saveButton.textContent = isNew ? 'Create' : 'Save';
    saveButton.style.cssText = `
        background: #4CAF50;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    `;
    
    // Cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.cssText = `
        background: #f44336;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    `;
    
    // Event handlers
    saveButton.addEventListener('click', async () => {
        try {
            const response = await fetch('/sage_utils/save_dataset_text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_path: image.path,
                    content: textarea.value
                })
            });
            
            const result = await response.json();
            if (result.success) {
                alert(`Dataset text ${isNew ? 'created' : 'saved'} successfully!`);
                overlay.remove();
            } else {
                alert(`Failed to ${isNew ? 'create' : 'save'} dataset text: ${result.error}`);
            }
        } catch (error) {
            console.error('Error saving dataset text:', error);
            alert(`Error saving dataset text: ${error.message}`);
        }
    });
    
    cancelButton.addEventListener('click', () => {
        overlay.remove();
    });
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
    
    // Escape key handler
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
    
    // Assemble modal
    buttonsContainer.appendChild(saveButton);
    buttonsContainer.appendChild(cancelButton);
    
    modal.appendChild(title);
    modal.appendChild(textarea);
    modal.appendChild(buttonsContainer);
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Focus textarea
    textarea.focus();
}

// Batch operations for dataset management
async function refreshCurrentTextDisplay() {
    // Find the textarea in the current combined editor
    const textArea = document.querySelector('textarea[data-image-path]');
    if (!textArea) return;
    
    // Get the current image path from the data attribute
    const imagePath = textArea.getAttribute('data-image-path');
    if (!imagePath) return;
    
    try {
        // Re-read the current image's text file
        const readResponse = await fetch('/sage_utils/read_dataset_text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_path: imagePath })
        });
        
        const readResult = await readResponse.json();
        if (readResult.success) {
            textArea.value = readResult.content;
        }
    } catch (error) {
        console.error('Error refreshing current text display:', error);
    }
}

async function batchCreateMissingTextFiles() {
    try {
        const allImages = selectors.galleryImages();
        if (!allImages || allImages.length === 0) {
            alert('No images found in current folder.');
            return;
        }
        
        let created = 0;
        let errors = [];
        
        for (const image of allImages) {
            try {
                // Check if text file exists
                const checkResponse = await fetch('/sage_utils/check_dataset_text', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image_path: image.path })
                });
                
                const checkResult = await checkResponse.json();
                
                if (!checkResult.exists) {
                    // Create empty text file
                    const saveResponse = await fetch('/sage_utils/save_dataset_text', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            image_path: image.path, 
                            content: '' 
                        })
                    });
                    
                    const saveResult = await saveResponse.json();
                    if (saveResult.success) {
                        created++;
                    } else {
                        errors.push(`${image.filename}: ${saveResult.error}`);
                    }
                }
            } catch (error) {
                errors.push(`${image.filename}: ${error.message}`);
            }
        }
        
        let message = `Created ${created} text files.`;
        if (errors.length > 0) {
            message += `\n\nErrors (${errors.length}):\n${errors.slice(0, 5).join('\n')}`;
            if (errors.length > 5) {
                message += `\n... and ${errors.length - 5} more`;
            }
        }
        
        alert(message);
        
        // Refresh current text display if we have a combined editor open
        if (created > 0) {
            await refreshCurrentTextDisplay();
        }
        
    } catch (error) {
        console.error('Error in batch create missing text files:', error);
        alert(`Error: ${error.message}`);
    }
}

async function batchAppendToAllTextFiles(textToAdd, addToBeginning = false) {
    try {
        const allImages = selectors.galleryImages();
        if (!allImages || allImages.length === 0) {
            alert('No images found in current folder.');
            return;
        }
        
        let updated = 0;
        let skipped = 0;
        let errors = [];
        
        for (const image of allImages) {
            try {
                // Check if text file exists
                const checkResponse = await fetch('/sage_utils/check_dataset_text', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image_path: image.path })
                });
                
                const checkResult = await checkResponse.json();
                
                if (checkResult.exists) {
                    // Read current content
                    const readResponse = await fetch('/sage_utils/read_dataset_text', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ image_path: image.path })
                    });
                    
                    const readResult = await readResponse.json();
                    if (readResult.success) {
                        // Add text to beginning or end
                        let newContent;
                        if (addToBeginning) {
                            newContent = readResult.content ? 
                                textToAdd + ', ' + readResult.content : 
                                textToAdd;
                        } else {
                            newContent = readResult.content ? 
                                readResult.content + ', ' + textToAdd : 
                                textToAdd;
                        }
                        
                        const saveResponse = await fetch('/sage_utils/save_dataset_text', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                image_path: image.path, 
                                content: newContent 
                            })
                        });
                        
                        const saveResult = await saveResponse.json();
                        if (saveResult.success) {
                            updated++;
                        } else {
                            errors.push(`${image.filename}: ${saveResult.error}`);
                        }
                    } else {
                        errors.push(`${image.filename}: Failed to read existing content`);
                    }
                } else {
                    skipped++;
                }
            } catch (error) {
                errors.push(`${image.filename}: ${error.message}`);
            }
        }
        
        const positionText = addToBeginning ? 'beginning' : 'end';
        let message = `Updated ${updated} text files (added to ${positionText}).`;
        if (skipped > 0) {
            message += ` Skipped ${skipped} files (no text file found).`;
        }
        if (errors.length > 0) {
            message += `\n\nErrors (${errors.length}):\n${errors.slice(0, 5).join('\n')}`;
            if (errors.length > 5) {
                message += `\n... and ${errors.length - 5} more`;
            }
        }
        
        alert(message);
        
        // Refresh current text display if we have a combined editor open
        if (updated > 0) {
            await refreshCurrentTextDisplay();
        }
        
    } catch (error) {
        console.error('Error in batch append to all text files:', error);
        alert(`Error: ${error.message}`);
    }
}

async function batchFindReplaceAllTextFiles(findText, replaceText) {
    try {
        const allImages = selectors.galleryImages();
        if (!allImages || allImages.length === 0) {
            alert('No images found in current folder.');
            return;
        }
        
        let updated = 0;
        let skipped = 0;
        let totalReplacements = 0;
        let errors = [];
        
        for (const image of allImages) {
            try {
                // Check if text file exists
                const checkResponse = await fetch('/sage_utils/check_dataset_text', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image_path: image.path })
                });
                
                const checkResult = await checkResponse.json();
                
                if (checkResult.exists) {
                    // Read current content
                    const readResponse = await fetch('/sage_utils/read_dataset_text', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ image_path: image.path })
                    });
                    
                    const readResult = await readResponse.json();
                    if (readResult.success) {
                        const originalContent = readResult.content;
                        const newContent = originalContent.replaceAll(findText, replaceText);
                        
                        if (newContent !== originalContent) {
                            const replacements = (originalContent.match(new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
                            totalReplacements += replacements;
                            
                            const saveResponse = await fetch('/sage_utils/save_dataset_text', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    image_path: image.path, 
                                    content: newContent 
                                })
                            });
                            
                            const saveResult = await saveResponse.json();
                            if (saveResult.success) {
                                updated++;
                            } else {
                                errors.push(`${image.filename}: ${saveResult.error}`);
                            }
                        }
                    } else {
                        errors.push(`${image.filename}: Failed to read existing content`);
                    }
                } else {
                    skipped++;
                }
            } catch (error) {
                errors.push(`${image.filename}: ${error.message}`);
            }
        }
        
        let message = `Updated ${updated} text files with ${totalReplacements} total replacements.`;
        if (skipped > 0) {
            message += ` Skipped ${skipped} files (no text file found).`;
        }
        if (errors.length > 0) {
            message += `\n\nErrors (${errors.length}):\n${errors.slice(0, 5).join('\n')}`;
            if (errors.length > 5) {
                message += `\n... and ${errors.length - 5} more`;
            }
        }
        
        alert(message);
        
        // Refresh current text display if we have a combined editor open
        if (updated > 0) {
            await refreshCurrentTextDisplay();
        }
        
    } catch (error) {
        console.error('Error in batch find replace all text files:', error);
        alert(`Error: ${error.message}`);
    }
}

// Make functions globally accessible
window.handleDatasetText = handleDatasetText;
window.showCombinedImageTextEditor = showCombinedImageTextEditor;

/**
 * Main function to create the Image Gallery tab
 * @param {HTMLElement} container - Container element to populate
 */
export function createImageGalleryTab(container) {
    // Create all components
    const header = createGalleryHeader();
    const folderAndControls = createFolderSelectorAndControls(); // Combined section
    const grid = createThumbnailGrid();
    const metadata = createMetadataPanel();

    // Set up event handlers and store them globally for access  
    const eventHandlers = setupGalleryEventHandlers(folderAndControls, null, grid, metadata, header);
    window.galleryEventHandlers = eventHandlers;

    // Assemble the layout
    assembleGalleryTabLayout(container, {
        header,
        folderAndControls, // Combined section
        grid,
        metadata
    });

    // Initialize grid layout with current thumbnail size
    if (eventHandlers.updateGridLayout) {
        eventHandlers.updateGridLayout();
    }

    // Restore previously selected folder
    const savedFolder = selectors.selectedFolder();
    if (savedFolder && savedFolder !== 'notes') {
        folderAndControls.folderDropdown.value = savedFolder;
    }

    // Initialize with default state
    
    // Auto-load from saved folder selection
    setTimeout(() => {
        try {
            const savedFolder = selectors.selectedFolder() || 'notes';
            if (window.galleryEventHandlers && window.galleryEventHandlers.loadImagesFromFolder) {
                window.galleryEventHandlers.loadImagesFromFolder(savedFolder);
            } else {
                console.warn('Gallery event handlers not available for auto-initialization');
            }
        } catch (error) {
            console.error('Error during gallery auto-initialization:', error);
        }
    }, 200);
}

/**
 * Gallery Components Module
 * Reusable UI components specifically for the image gallery
 */

import { selectors } from "../shared/stateManager.js";
import { getThumbnailSize } from "../shared/config.js";
import { generateThumbnail } from "../shared/imageUtils.js";
import { createResponsiveGrid } from "../components/layout.js";
import { showImageContextMenu } from "./galleryEvents.js";

/**
 * Create a thumbnail grid component
 * @returns {Object} Grid widget with container and utility functions
 */
export function createThumbnailGrid() {
    // Create responsive grid using layout component
    const gridContainer = createResponsiveGrid({
        minItemWidth: 120,
        gap: '8px',
        style: {
            padding: '10px',
            overflowY: 'auto',
            flex: '1'
        }
    });
    
    const imageCountSpan = document.createElement('span');
    imageCountSpan.className = 'gallery-image-count';
    
    /**
     * Update the grid layout based on thumbnail size
     * @param {string} size - Thumbnail size ('small', 'medium', 'large')
     */
    function updateGridLayout(size = 'medium') {
        const sizeConfig = getThumbnailSize(size);
        const minSize = sizeConfig.width;
        
        // Update responsive grid's min width
        gridContainer.style.gridTemplateColumns = `repeat(auto-fill, minmax(${minSize}px, 1fr))`;
        
        // Update existing thumbnails
        const thumbnails = gridContainer.querySelectorAll('.thumbnail-item');
        thumbnails.forEach(thumb => {
            const img = thumb.querySelector('img');
            if (img) {
                img.style.width = `${sizeConfig.width}px`;
                img.style.height = `${sizeConfig.height}px`;
            }
        });
    }
    
    /**
     * Clear the grid
     */
    function clear() {
        gridContainer.innerHTML = '';
        imageCountSpan.textContent = '';
    }
    
    return {
        gridContainer,
        imageCountSpan,
        updateGridLayout,
        clear
    };
}

/**
 * Create a thumbnail item for the grid
 * @param {Object} image - Image object with path and metadata
 * @param {Function} onSelect - Callback when thumbnail is selected
 * @returns {HTMLElement} Thumbnail item element
 */
export function createThumbnailItem(image, onSelect) {
    const currentThumbnailSize = selectors.thumbnailSize();
    const sizeConfig = getThumbnailSize(currentThumbnailSize);
    
    const thumbnailItem = document.createElement('div');
    thumbnailItem.className = 'thumbnail-item';
    
    // Hover effects handled by CSS classes
    
    // Thumbnail container
    const thumbnailContainer = document.createElement('div');
    thumbnailContainer.className = 'thumbnail-container';
    thumbnailContainer.style.width = `${sizeConfig.width}px`;
    thumbnailContainer.style.height = `${sizeConfig.height}px`;
    
    // Create placeholder
    const placeholder = document.createElement('div');
    placeholder.className = 'thumbnail-placeholder';
    placeholder.textContent = 'Loading...';
    thumbnailContainer.appendChild(placeholder);
    
    // Generate thumbnail
    generateThumbnail(image, sizeConfig.width).then(thumbnailUrl => {
        if (thumbnailUrl) {
            const img = document.createElement('img');
            img.src = thumbnailUrl;
            img.className = 'thumbnail-img';
            
            img.onload = () => {
                thumbnailContainer.removeChild(placeholder);
                thumbnailContainer.appendChild(img);
            };
            
            img.onerror = () => {
                placeholder.textContent = 'Error';
                placeholder.classList.add('thumbnail-placeholder-error');
            };
        } else {
            placeholder.textContent = 'Failed';
            placeholder.classList.add('thumbnail-placeholder-error');
        }
    });
    
    // Image info
    const infoDiv = document.createElement('div');
    infoDiv.className = 'thumbnail-info';
    
    const filename = document.createElement('div');
    filename.textContent = image.filename || 'Unknown';
    filename.title = image.filename || 'Unknown';
    filename.className = 'thumbnail-filename';
    
    const filesize = document.createElement('div');
    filesize.textContent = image.size_display || '';
    filesize.className = 'thumbnail-filesize';
    
    infoDiv.appendChild(filename);
    infoDiv.appendChild(filesize);
    
    // Assembly
    thumbnailItem.appendChild(thumbnailContainer);
    thumbnailItem.appendChild(infoDiv);
    
    // Click handler
    thumbnailItem.addEventListener('click', () => {
        if (onSelect) {
            onSelect(image);
        }
    });
    
    // Context menu
    thumbnailItem.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showImageContextMenu(e, image);
    });
    
    return thumbnailItem;
}

/**
 * Create a folder item for navigation
 * @param {Object} folder - Folder object with name and path
 * @param {Function} onNavigate - Callback when folder is clicked
 * @returns {HTMLElement} Folder item element
 */
export function createFolderItem(folder, onNavigate) {
    const folderItem = document.createElement('div');
    folderItem.className = 'gallery-folder-item';
    
    // Folder icon
    const icon = document.createElement('div');
    icon.textContent = folder.isBackNav ? '⬅️' : '📁';
    icon.className = 'gallery-folder-icon';
    
    // Folder name
    const name = document.createElement('div');
    name.textContent = folder.name;
    name.title = folder.name;
    name.className = 'gallery-folder-name';
    
    folderItem.appendChild(icon);
    folderItem.appendChild(name);
    
    // Click handler
    folderItem.addEventListener('click', () => {
        if (onNavigate) {
            onNavigate(folder);
        }
    });
    
    return folderItem;
}

/**
 * Create a sort control widget
 * @param {Function} onSortChange - Callback when sort option changes
 * @returns {Object} Sort control widget
 */
export function createSortControl(onSortChange) {
    const container = document.createElement('div');
    container.className = 'gallery-control-row';
    
    const label = document.createElement('span');
    label.textContent = 'Sort:';
    label.className = 'gallery-control-label';
    
    const sortSelect = document.createElement('select');
    sortSelect.className = 'gallery-control-select';
    
    // Sort options
    const sortOptions = [
        { value: 'name', text: 'Name A-Z' },
        { value: 'name-desc', text: 'Name Z-A' },
        { value: 'date', text: 'Date (New)' },
        { value: 'date-desc', text: 'Date (Old)' },
        { value: 'size', text: 'Size (Large)' },
        { value: 'size-desc', text: 'Size (Small)' }
    ];
    
    sortOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text;
        sortSelect.appendChild(optionElement);
    });
    
    // Set current value
    sortSelect.value = selectors.gallerySortBy() || 'name';
    
    // Change handler
    sortSelect.addEventListener('change', () => {
        actions.updateSort(sortSelect.value);
        if (onSortChange) {
            onSortChange(sortSelect.value);
        }
    });
    
    container.appendChild(label);
    container.appendChild(sortSelect);
    
    return {
        container,
        sortSelect,
        updateValue: (value) => {
            sortSelect.value = value;
        }
    };
}

/**
 * Create a thumbnail size control widget
 * @param {Function} onSizeChange - Callback when size changes
 * @returns {Object} Size control widget
 */
export function createThumbnailSizeControl(onSizeChange) {
    const container = document.createElement('div');
    container.className = 'gallery-control-row';
    
    const label = document.createElement('span');
    label.textContent = 'Size:';
    label.className = 'gallery-control-label';
    
    const sizeSelect = document.createElement('select');
    sizeSelect.className = 'gallery-control-select';
    
    // Size options
    const sizeOptions = [
        { value: 'small', text: 'Small' },
        { value: 'medium', text: 'Medium' },
        { value: 'large', text: 'Large' }
    ];
    
    sizeOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text;
        sizeSelect.appendChild(optionElement);
    });
    
    // Set current value
    sizeSelect.value = selectors.thumbnailSize() || 'medium';
    
    // Change handler
    sizeSelect.addEventListener('change', () => {
        actions.setThumbnailSize(sizeSelect.value);
        if (onSizeChange) {
            onSizeChange(sizeSelect.value);
        }
    });
    
    container.appendChild(label);
    container.appendChild(sizeSelect);
    
    return {
        container,
        sizeSelect,
        updateValue: (value) => {
            sizeSelect.value = value;
        }
    };
}


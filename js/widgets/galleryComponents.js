/**
 * Gallery Widgets Module
 * Reusable UI components specifically for the image gallery
 */

import { selectors, actions } from "../shared/stateManager.js";
import { GALLERY_CONFIG, getThumbnailSize } from "../shared/config.js";
import { generateThumbnail, loadFullImage, copyImageToClipboard } from "../shared/imageUtils.js";
import { handleDatasetText } from "../shared/datasetTextManager.js";

/**
 * Create a thumbnail grid widget
 * @returns {Object} Grid widget with container and utility functions
 */
export function createThumbnailGrid() {
    const gridContainer = document.createElement('div');
    gridContainer.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 8px;
        padding: 10px;
        overflow-y: auto;
        flex: 1;
    `;
    
    const imageCountSpan = document.createElement('span');
    imageCountSpan.style.cssText = `
        color: #888;
        font-size: 11px;
        font-style: italic;
    `;
    
    /**
     * Update the grid layout based on thumbnail size
     * @param {string} size - Thumbnail size ('small', 'medium', 'large')
     */
    function updateGridLayout(size = 'medium') {
        const sizeConfig = getThumbnailSize(size);
        const minSize = sizeConfig.width;
        
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
    thumbnailItem.style.cssText = `
        background: #333;
        border-radius: 6px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 2px solid transparent;
        position: relative;
    `;
    
    // Hover effects
    thumbnailItem.addEventListener('mouseenter', () => {
        thumbnailItem.style.transform = 'scale(1.02)';
        thumbnailItem.style.borderColor = '#4CAF50';
        thumbnailItem.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
    });
    
    thumbnailItem.addEventListener('mouseleave', () => {
        thumbnailItem.style.transform = 'scale(1)';
        thumbnailItem.style.borderColor = 'transparent';
        thumbnailItem.style.boxShadow = 'none';
    });
    
    // Thumbnail container
    const thumbnailContainer = document.createElement('div');
    thumbnailContainer.style.cssText = `
        width: ${sizeConfig.width}px;
        height: ${sizeConfig.height}px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #444;
        position: relative;
        overflow: hidden;
    `;
    
    // Create placeholder
    const placeholder = document.createElement('div');
    placeholder.style.cssText = `
        color: #888;
        font-size: 12px;
        text-align: center;
    `;
    placeholder.textContent = 'Loading...';
    thumbnailContainer.appendChild(placeholder);
    
    // Generate thumbnail
    generateThumbnail(image, sizeConfig.width).then(thumbnailUrl => {
        if (thumbnailUrl) {
            const img = document.createElement('img');
            img.src = thumbnailUrl;
            img.style.cssText = `
                width: 100%;
                height: 100%;
                object-fit: cover;
                display: block;
            `;
            
            img.onload = () => {
                thumbnailContainer.removeChild(placeholder);
                thumbnailContainer.appendChild(img);
            };
            
            img.onerror = () => {
                placeholder.textContent = 'Error';
                placeholder.style.color = '#f44336';
            };
        } else {
            placeholder.textContent = 'Failed';
            placeholder.style.color = '#f44336';
        }
    });
    
    // Image info
    const infoDiv = document.createElement('div');
    infoDiv.style.cssText = `
        padding: 6px;
        background: #2a2a2a;
        border-top: 1px solid #444;
    `;
    
    const filename = document.createElement('div');
    filename.textContent = image.filename || 'Unknown';
    filename.title = image.filename || 'Unknown';
    filename.style.cssText = `
        color: #fff;
        font-size: 11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 2px;
    `;
    
    const filesize = document.createElement('div');
    filesize.textContent = image.size_display || '';
    filesize.style.cssText = `
        color: #888;
        font-size: 10px;
    `;
    
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
    folderItem.style.cssText = `
        background: #444;
        border-radius: 6px;
        padding: 15px;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 2px solid transparent;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 80px;
    `;
    
    // Hover effects
    folderItem.addEventListener('mouseenter', () => {
        folderItem.style.transform = 'scale(1.02)';
        folderItem.style.borderColor = '#2196F3';
        folderItem.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.3)';
    });
    
    folderItem.addEventListener('mouseleave', () => {
        folderItem.style.transform = 'scale(1)';
        folderItem.style.borderColor = 'transparent';
        folderItem.style.boxShadow = 'none';
    });
    
    // Folder icon
    const icon = document.createElement('div');
    icon.textContent = folder.isBackNav ? '⬅️' : '📁';
    icon.style.cssText = `
        font-size: 24px;
        margin-bottom: 8px;
    `;
    
    // Folder name
    const name = document.createElement('div');
    name.textContent = folder.name;
    name.title = folder.name;
    name.style.cssText = `
        color: #fff;
        font-size: 12px;
        text-align: center;
        word-break: break-word;
        max-width: 100%;
    `;
    
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
    container.style.cssText = `
        display: flex;
        gap: 5px;
        align-items: center;
    `;
    
    const label = document.createElement('span');
    label.textContent = 'Sort:';
    label.style.cssText = `
        color: #ccc;
        font-size: 11px;
        white-space: nowrap;
    `;
    
    const sortSelect = document.createElement('select');
    sortSelect.style.cssText = `
        background: #333;
        color: #fff;
        border: 1px solid #555;
        border-radius: 4px;
        padding: 3px 6px;
        font-size: 11px;
        cursor: pointer;
        outline: none;
    `;
    
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
    container.style.cssText = `
        display: flex;
        gap: 5px;
        align-items: center;
    `;
    
    const label = document.createElement('span');
    label.textContent = 'Size:';
    label.style.cssText = `
        color: #ccc;
        font-size: 11px;
        white-space: nowrap;
    `;
    
    const sizeSelect = document.createElement('select');
    sizeSelect.style.cssText = `
        background: #333;
        color: #fff;
        border: 1px solid #555;
        border-radius: 4px;
        padding: 3px 6px;
        font-size: 11px;
        cursor: pointer;
        outline: none;
    `;
    
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

/**
 * Show context menu for an image
 * @param {MouseEvent} event - Mouse event for positioning
 * @param {Object} image - Image object
 */
export function showImageContextMenu(event, image) {
    // Remove any existing context menu (by class)
    const existingMenus = document.querySelectorAll('.image-context-menu');
    existingMenus.forEach(menu => menu.remove());
    
    // Remove any context menus without class (legacy cleanup)
    const allMenus = document.querySelectorAll('div[style*="position: fixed"][style*="z-index"]');
    allMenus.forEach(menu => {
        if ((menu.style.background === 'rgb(42, 42, 42)' || menu.style.background === '#2a2a2a' ||
             menu.style.background === 'rgb(51, 51, 51)' || menu.style.background === '#333') &&
            menu.style.border && menu.style.borderRadius) {
            menu.remove();
        }
    });
    
    const menu = document.createElement('div');
    menu.className = 'image-context-menu';
    menu.style.cssText = `
        position: fixed;
        background: #2a2a2a;
        border: 1px solid #555;
        border-radius: 4px;
        padding: 5px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        min-width: 150px;
    `;
    
    const menuItems = [
        { text: '👁️ View Full Size', action: () => showFullImageModal(image) },
        { text: '📋 Copy to Clipboard', action: () => copyImageToClipboard(image.path) },
        { text: '✏️ Edit Dataset Text', action: () => handleDatasetText(image) },
        { text: '📄 Show Metadata', action: () => showImageMetadata(image) }
    ];
    
    menuItems.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.textContent = item.text;
        menuItem.style.cssText = `
            padding: 8px 12px;
            cursor: pointer;
            font-size: 12px;
            color: #fff;
            border-radius: 3px;
            transition: background 0.2s ease;
        `;
        
        menuItem.addEventListener('mouseenter', () => {
            menuItem.style.background = '#4CAF50';
        });
        
        menuItem.addEventListener('mouseleave', () => {
            menuItem.style.background = 'transparent';
        });
        
        menuItem.addEventListener('click', () => {
            item.action();
            menu.remove();
        });
        
        menu.appendChild(menuItem);
    });
    
    // Position menu
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    
    // Add to document
    document.body.appendChild(menu);
    
    // Close menu when clicking elsewhere
    const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
            document.removeEventListener('contextmenu', closeMenu);
        }
    };
    
    // Close on right-click elsewhere too
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
        document.addEventListener('contextmenu', closeMenu);
    }, 0);
}

/**
 * Show full image modal
 * @param {Object} image - Image object
 */
export async function showFullImageModal(image) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    `;
    
    // Loading indicator
    const loading = document.createElement('div');
    loading.textContent = 'Loading...';
    loading.style.cssText = `
        color: #fff;
        font-size: 18px;
    `;
    overlay.appendChild(loading);
    
    // Add to document
    document.body.appendChild(overlay);
    
    // Load full image
    try {
        const imageUrl = await loadFullImage(image.path);
        if (imageUrl) {
            // Remove loading
            overlay.removeChild(loading);
            
            // Create image
            const img = document.createElement('img');
            img.src = imageUrl;
            img.style.cssText = `
                max-width: 95%;
                max-height: 95%;
                object-fit: contain;
                cursor: default;
            `;
            
            img.addEventListener('click', (e) => e.stopPropagation());
            overlay.appendChild(img);
        } else {
            loading.textContent = 'Failed to load image';
            loading.style.color = '#f44336';
        }
    } catch (error) {
        loading.textContent = 'Error loading image';
        loading.style.color = '#f44336';
    }
    
    // Close on overlay click or escape key
    overlay.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
    
    const handleKeydown = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleKeydown);
        }
    };
    document.addEventListener('keydown', handleKeydown);
}

/**
 * Show image metadata modal
 * @param {Object} image - Image object
 */
export async function showImageMetadata(image) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: #2a2a2a;
        border-radius: 8px;
        padding: 20px;
        max-width: 80%;
        max-height: 80%;
        overflow-y: auto;
        border: 1px solid #555;
    `;
    
    const title = document.createElement('h3');
    title.textContent = `Metadata: ${image.filename || 'Unknown'}`;
    title.style.cssText = `
        color: #fff;
        margin: 0 0 15px 0;
        font-size: 16px;
        border-bottom: 1px solid #555;
        padding-bottom: 10px;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        color: #ccc;
        font-family: monospace;
        font-size: 12px;
        white-space: pre-wrap;
    `;
    content.textContent = 'Loading metadata...';
    
    modal.appendChild(title);
    modal.appendChild(content);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Load metadata
    try {
        const response = await fetch('/sage_utils/image_metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_path: image.path })
        });
        
        const result = await response.json();
        if (result.success && result.metadata) {
            content.textContent = JSON.stringify(result.metadata, null, 2);
        } else {
            content.textContent = 'No metadata available';
        }
    } catch (error) {
        content.textContent = `Error loading metadata: ${error.message}`;
    }
    
    // Close handlers
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });
    
    const handleKeydown = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleKeydown);
        }
    };
    document.addEventListener('keydown', handleKeydown);
    
    modal.addEventListener('click', (e) => e.stopPropagation());
}

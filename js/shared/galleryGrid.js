/**
 * Gallery Grid Components
 * UI components for creating thumbnail items, folder items, and grid navigation
 * Extracted from imageGalleryTab.js for better organization and reusability
 */

import { getThumbnailSize } from "./config.js";
import { formatFileSize } from "../reports/reportGenerator.js";
import { copyImageToClipboard } from "./imageUtils.js";
import { actions, selectors } from "./stateManager.js";
import { loadThumbnail } from "./imageLoader.js";

/**
 * Creates a thumbnail item for an image with hover effects and click handlers
 * @param {Object} image - Image object with path, filename, size, dimensions
 * @param {Function} showFullImage - Callback to show full image viewer
 * @param {Function} showImageContextMenu - Callback to show context menu
 * @returns {HTMLElement} Thumbnail item element
 */
export function createImageItem(image, showFullImage, showImageContextMenu) {
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
    
    // Generate thumbnail using centralized loader
    const generateThumbnail = async () => {
        try {
            // Map size to thumbnail size names
            const sizeName = thumbnailSizeConfig.width <= 120 ? 'small' : 
                           thumbnailSizeConfig.width <= 200 ? 'medium' : 'large';
                           
            return await loadThumbnail(image, sizeName);
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

/**
 * Creates a folder navigation item with click handler for folder browsing
 * @param {Object} folder - Folder object with name and path
 * @returns {HTMLElement} Folder item element
 */
export function createFolderItem(folder) {
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

/**
 * Creates a back navigation item for returning to parent directory
 * @returns {HTMLElement} Back navigation item element
 */
export function createBackNavigationItem() {
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

/**
 * Gallery Grid Components
 * UI components for creating thumbnail items, folder items, and grid navigation
 * Extracted from imageGalleryTab.js for better organization and reusability
 */

import { getThumbnailSize } from "./config.js";
import { formatFileSize } from "../reports/reportGenerator.js";
import { actions, selectors } from "./stateManager.js";
import { copyImageToClipboard, generateThumbnail } from "./imageUtils.js";
import { showFullImage } from "./imageViewer.js";

/**
 * Creates a thumbnail item for an image with hover effects and click handlers
 * @param {Object} image - Image object with path, filename, size, dimensions
 * @param {Function} showImageContextMenu - Callback to show context menu
 * @param {Function} showMetadata - Callback to show image metadata in the current UI
 * @returns {HTMLElement} Thumbnail item element
 */
export function createImageItem(image, showImageContextMenu, showMetadata) {
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
    
    // Load thumbnail using centralized loader
    const loadThumbnailUrl = async () => {
        try {
            const sizeName = thumbnailSizeConfig.width <= 120 ? 'small' : 
                           thumbnailSizeConfig.width <= 200 ? 'medium' : 'large';
            return await generateThumbnail(image, sizeName);
        } catch (error) {
            console.error('Error generating thumbnail:', error);
            return null;
        }
    };

    loadThumbnailUrl().then(thumbnailUrl => {
        if (thumbnailUrl) {
            thumbnail.src = thumbnailUrl;
        } else {
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
            item.appendChild(errorDiv);
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
        margin-bottom: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    `;
    filename.textContent = image.filename;
    
    const info = document.createElement('div');
    info.style.cssText = `
        font-size: 10px;
        color: #ccc;
        display: flex;
        justify-content: space-between;
        gap: 8px;
        align-items: center;
    `;
    
    let infoText = '';
    if (image.dimensions) {
        infoText += `${image.dimensions.width}×${image.dimensions.height}`;
    }
    if (image.size) {
        if (infoText) infoText += ' • ';
        infoText += formatFileSize(image.size);
    }
    info.textContent = infoText;
    
    const actionsRow = document.createElement('div');
    actionsRow.className = 'gallery-item-actions';

    const createActionButton = (text, title, onClick, disabled = false) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = text;
        btn.title = title;
        btn.className = 'gallery-item-action-button';
        if (disabled) {
            btn.disabled = true;
            btn.classList.add('gallery-item-action-button-disabled');
        }
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick(e);
        });
        return btn;
    };

    const fullSizeButton = createActionButton('👁️', 'View full size', () => showFullImage(image, { showMetadata }));
    const metadataButton = createActionButton('ℹ️', 'Show metadata', () => {
        if (typeof showMetadata === 'function') {
            showMetadata(image);
        }
    }, typeof showMetadata !== 'function');
    const copyButton = createActionButton('📋', 'Copy image path', () => copyImageToClipboard(image.path || image.relative_path || image.name));

    actionsRow.appendChild(fullSizeButton);
    actionsRow.appendChild(metadataButton);
    actionsRow.appendChild(copyButton);

    const hintRow = document.createElement('div');
    hintRow.className = 'gallery-item-hint';
    hintRow.textContent = 'Shift+click copies path';

    overlay.appendChild(filename);
    overlay.appendChild(info);
    overlay.appendChild(actionsRow);
    overlay.appendChild(hintRow);
    
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
            copyImageToClipboard(image.path || image.relative_path || image.name);
        } else {
            // Show full image on regular click
            showFullImage(image, { showMetadata });
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
 * @param {Function} loadImagesFromFolder - Callback to load images from folder
 * @returns {HTMLElement} Folder item element
 */
export function createFolderItem(folder, loadImagesFromFolder = null) {
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
        if (loadImagesFromFolder) {
            loadImagesFromFolder('custom', folder.path);
        } else {
            console.error('loadImagesFromFolder callback not provided for folder navigation');
        }
    });
    
    item.appendChild(folderIcon);
    item.appendChild(folderName);
    
    return item;
}

/**
 * Creates a back navigation item for returning to parent directory
 * @param {Function} loadImagesFromFolder - Callback to load images from folder
 * @returns {HTMLElement} Back navigation item element
 */
export function createBackNavigationItem(loadImagesFromFolder = null) {
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
        if (currentPath && loadImagesFromFolder) {
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
                loadImagesFromFolder(selectedFolderType);
            } else {
                // Navigate to parent subfolder
                loadImagesFromFolder('custom', parentPath);
            }
        } else {
            console.error('loadImagesFromFolder callback not provided for back navigation');
        }
    });
    
    item.appendChild(backIcon);
    item.appendChild(backLabel);
    
    return item;
}

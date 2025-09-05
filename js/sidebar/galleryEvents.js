/**
 * Gallery Event Handlers Module
 * Contains event handling functions for the image gallery
 * Extracted from imageGalleryTab.js for better organization
 */

import { api } from "../../../scripts/api.js";
import { actions, selectors } from '../shared/stateManager.js';
import { copyImageToClipboard } from '../shared/imageUtils.js';
import { handleDatasetText } from '../shared/datasetTextManager.js';
import { loadImageMetadata, formatMetadataForDisplay } from '../shared/galleryApi.js';
import { loadFullImage, openImageInNewTab as openImageInNewTabUtil, cleanupImageUrl } from '../shared/imageLoader.js';

/**
 * Opens image in new tab using centralized image loader
 * @param {Object} image - Image object with path information
 */
async function openImageInNewTab(image) {
    await openImageInNewTabUtil(image);
}

/**
 * Shows image metadata in the metadata panel
 * @param {Object} image - Image object
 */
async function showImageMetadata(image) {
    try {
        const result = await loadImageMetadata(image);
        
        if (result.success) {
            const { html } = formatMetadataForDisplay(result.metadata);
            // You could display this in a modal or update the metadata panel
            console.log('Image metadata loaded successfully');
        } else {
            console.error('Failed to load metadata:', result.error);
        }
    } catch (error) {
        console.error('Error loading image metadata:', error);
    }
}

/**
 * Shows full image in modal viewer
 * @param {Object|string} imageInput - Image object or image path string
 * @param {Array} images - Optional array of all images for navigation
 */
export async function showFullImage(imageInput, images) {
    // Handle both image object and path string inputs
    let imagePath;
    let image;
    
    if (typeof imageInput === 'string') {
        // Legacy: path string provided
        imagePath = imageInput;
        if (!images) {
            images = selectors.galleryImages() || [];
        }
        image = images.find(img => 
            img.path === imagePath || 
            img.relative_path === imagePath ||
            img.name === imagePath.split('/').pop()
        );
    } else {
        // New: image object provided
        image = imageInput;
        imagePath = image.path || image.relative_path || image.name;
    }
    
    // Get current images if not provided
    if (!images) {
        images = selectors.galleryImages() || [];
    }
    
    const currentIndex = images.findIndex(img => 
        img.path === imagePath || 
        img.relative_path === imagePath ||
        img.name === (imagePath.includes('/') ? imagePath.split('/').pop() : imagePath)
    );
    
    if (currentIndex === -1) {
        console.warn('Image not found in current set:', imagePath);
        return;
    }
    
    let activeIndex = currentIndex;
    let zoomLevel = 1;
    let isDragging = false;
    let startX, startY, translateX = 0, translateY = 0;
    
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'fullimage-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        cursor: grab;
    `;
    
    // Create image container
    const imageContainer = document.createElement('div');
    imageContainer.style.cssText = `
        position: relative;
        max-width: 95%;
        max-height: 95%;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: auto;
    `;
    
    // Create the main image element
    const img = document.createElement('img');
    img.style.cssText = `
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        transition: transform 0.3s ease;
        user-select: none;
        pointer-events: none;
    `;
    
    // Create controls container
    const controls = document.createElement('div');
    controls.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        display: flex;
        gap: 10px;
        z-index: 1;
    `;
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.title = 'Close (Esc)';
    closeBtn.style.cssText = `
        background: rgba(0, 0, 0, 0.7);
        color: white;
        border: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    // Zoom controls
    const zoomInBtn = document.createElement('button');
    zoomInBtn.innerHTML = '+';
    zoomInBtn.title = 'Zoom In (+)';
    zoomInBtn.style.cssText = closeBtn.style.cssText;
    
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.innerHTML = '−';
    zoomOutBtn.title = 'Zoom Out (-)';
    zoomOutBtn.style.cssText = closeBtn.style.cssText;
    
    const resetZoomBtn = document.createElement('button');
    resetZoomBtn.innerHTML = '1:1';
    resetZoomBtn.title = 'Reset Zoom (0)';
    resetZoomBtn.style.cssText = closeBtn.style.cssText;
    resetZoomBtn.style.fontSize = '12px';
    
    // Navigation arrows (only show if multiple images)
    let prevBtn, nextBtn;
    if (images.length > 1) {
        prevBtn = document.createElement('button');
        prevBtn.innerHTML = '◀';
        prevBtn.title = 'Previous Image (←)';
        prevBtn.style.cssText = `
            position: absolute;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(0, 0, 0, 0.7);
            color: white;
            border: none;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        nextBtn = document.createElement('button');
        nextBtn.innerHTML = '▶';
        nextBtn.title = 'Next Image (→)';
        nextBtn.style.cssText = prevBtn.style.cssText;
        nextBtn.style.left = 'auto';
        nextBtn.style.right = '20px';
    }
    
    // Image info overlay
    const infoOverlay = document.createElement('div');
    infoOverlay.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        font-size: 14px;
        pointer-events: none;
        max-width: 80%;
        text-align: center;
    `;
    
    // Function to update image display
    async function updateImage() {
        const currentImage = images[activeIndex];
        if (!currentImage) return;
        
        const imageName = currentImage.name || currentImage.path?.split('/').pop() || 'Unknown';
        
        try {
            // Use centralized image loader
            const imageUrl = await loadFullImage(currentImage);
            img.src = imageUrl;
        } catch (error) {
            console.error('Error loading full image:', error);
            img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="%23333"/><text x="200" y="150" text-anchor="middle" font-size="16" fill="%23999">Error loading image</text></svg>';
        }
        
        // Update info overlay
        const sizeInfo = currentImage.width && currentImage.height 
            ? ` (${currentImage.width}×${currentImage.height})`
            : '';
        const indexInfo = images.length > 1 ? ` [${activeIndex + 1}/${images.length}]` : '';
        infoOverlay.textContent = `${imageName}${sizeInfo}${indexInfo}`;
        
        // Update navigation button states
        if (prevBtn) prevBtn.style.opacity = activeIndex > 0 ? '1' : '0.5';
        if (nextBtn) nextBtn.style.opacity = activeIndex < images.length - 1 ? '1' : '0.5';
    }
    
    // Function to update zoom transform
    function updateTransform() {
        img.style.transform = `scale(${zoomLevel}) translate(${translateX}px, ${translateY}px)`;
        modal.style.cursor = zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default';
    }
    
    // Mouse wheel zoom
    function handleWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(5, zoomLevel * delta));
        
        if (newZoom !== zoomLevel) {
            zoomLevel = newZoom;
            
            // Reset pan when zooming out to 1x or below
            if (zoomLevel <= 1) {
                translateX = 0;
                translateY = 0;
            }
            
            updateTransform();
        }
    }
    
    // Mouse drag panning (only when zoomed in)
    function handleMouseDown(e) {
        if (zoomLevel <= 1) return;
        
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        modal.style.cursor = 'grabbing';
        e.preventDefault();
    }
    
    function handleMouseMove(e) {
        if (!isDragging || zoomLevel <= 1) return;
        
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        updateTransform();
        e.preventDefault();
    }
    
    function handleMouseUp() {
        if (!isDragging) return;
        isDragging = false;
        modal.style.cursor = zoomLevel > 1 ? 'grab' : 'default';
    }
    
    // Keyboard navigation
    async function handleKeyDown(e) {
        switch(e.key) {
            case 'Escape':
                closeModal();
                break;
            case 'ArrowLeft':
                if (images.length > 1 && activeIndex > 0) {
                    activeIndex--;
                    await updateImage();
                    resetZoom();
                }
                e.preventDefault();
                break;
            case 'ArrowRight':
                if (images.length > 1 && activeIndex < images.length - 1) {
                    activeIndex++;
                    await updateImage();
                    resetZoom();
                }
                e.preventDefault();
                break;
            case '+':
            case '=':
                zoom(1.2);
                e.preventDefault();
                break;
            case '-':
                zoom(0.8);
                e.preventDefault();
                break;
            case '0':
                resetZoom();
                e.preventDefault();
                break;
            case ' ':
                // Spacebar to toggle between fit and 100% zoom
                if (zoomLevel === 1) {
                    zoom(2);
                } else {
                    resetZoom();
                }
                e.preventDefault();
                break;
        }
    }
    
    // Zoom functions
    function zoom(factor) {
        const newZoom = Math.max(0.1, Math.min(5, zoomLevel * factor));
        if (newZoom !== zoomLevel) {
            zoomLevel = newZoom;
            
            // Reset pan when zooming out to 1x or below
            if (zoomLevel <= 1) {
                translateX = 0;
                translateY = 0;
            }
            
            updateTransform();
        }
    }
    
    function resetZoom() {
        zoomLevel = 1;
        translateX = 0;
        translateY = 0;
        updateTransform();
    }
    
    // Navigation functions
    async function navigatePrev() {
        if (images.length > 1 && activeIndex > 0) {
            activeIndex--;
            await updateImage();
            resetZoom();
        }
    }
    
    async function navigateNext() {
        if (images.length > 1 && activeIndex < images.length - 1) {
            activeIndex++;
            await updateImage();
            resetZoom();
        }
    }
    
    // Close modal function
    function closeModal() {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', handleKeyDown);
    }
    
    // Event listeners
    closeBtn.addEventListener('click', closeModal);
    zoomInBtn.addEventListener('click', () => zoom(1.2));
    zoomOutBtn.addEventListener('click', () => zoom(0.8));
    resetZoomBtn.addEventListener('click', resetZoom);
    
    if (prevBtn) prevBtn.addEventListener('click', navigatePrev);
    if (nextBtn) nextBtn.addEventListener('click', navigateNext);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    modal.addEventListener('wheel', handleWheel);
    modal.addEventListener('mousedown', handleMouseDown);
    modal.addEventListener('mousemove', handleMouseMove);
    modal.addEventListener('mouseup', handleMouseUp);
    modal.addEventListener('mouseleave', handleMouseUp);
    
    document.addEventListener('keydown', handleKeyDown);
    
    // Assemble modal - Close button moved to far right for convention
    controls.appendChild(zoomInBtn);
    controls.appendChild(zoomOutBtn);
    controls.appendChild(resetZoomBtn);
    controls.appendChild(closeBtn);
    
    imageContainer.appendChild(img);
    imageContainer.appendChild(controls);
    imageContainer.appendChild(infoOverlay);
    
    if (prevBtn) imageContainer.appendChild(prevBtn);
    if (nextBtn) imageContainer.appendChild(nextBtn);
    
    modal.appendChild(imageContainer);
    document.body.appendChild(modal);
    
    // Initialize display
    await updateImage();
    
    // Prevent body scrolling while modal is open
    document.body.style.overflow = 'hidden';
    
    // Restore body scrolling when modal closes
    const originalCloseModal = closeModal;
    closeModal = function() {
        document.body.style.overflow = '';
        originalCloseModal();
    };
}

/**
 * Shows context menu for image operations
 */
export function showImageContextMenu(event, image) {
    event.preventDefault();
    event.stopPropagation();
    
    // Get image path from the image object
    const imagePath = image.path || image.relative_path || image.name;
    
    // Remove any existing context menu
    const existingMenu = document.querySelector('.image-context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    const contextMenu = document.createElement('div');
    contextMenu.className = 'image-context-menu';
    contextMenu.style.cssText = `
        position: fixed;
        background: #2a2a2a;
        border: 1px solid #555;
        border-radius: 4px;
        padding: 5px 0;
        min-width: 150px;
        z-index: 10001;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-size: 13px;
    `;
    
    // Menu items
    const menuItems = [
        { text: '👁️ View Full Size', action: () => showFullImage(image) },
        { text: '📋 Copy to Clipboard', action: () => {
            const imagePath = image.path || image.relative_path || image.name;
            copyImageToClipboard(imagePath);
        }},
        { text: '🔍 Show Details', action: () => showImageMetadata(image) },
        { text: '📝 Dataset Text...', action: () => handleDatasetText(image) },
        { text: '---', action: null }, // Separator
        { text: 'Copy Path', action: () => {
            const imagePath = image.path || image.relative_path || image.name;
            navigator.clipboard.writeText(imagePath);
        }},
        { text: 'Open in New Tab', action: () => openImageInNewTab(image) }
    ];
    
    menuItems.forEach(item => {
        if (item.text === '---') {
            const separator = document.createElement('div');
            separator.style.cssText = `
                height: 1px;
                background: #555;
                margin: 5px 0;
            `;
            contextMenu.appendChild(separator);
        } else {
            const menuItem = document.createElement('div');
            menuItem.textContent = item.text;
            menuItem.style.cssText = `
                padding: 8px 15px;
                color: #e0e0e0;
                cursor: pointer;
                user-select: none;
            `;
            
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.background = '#4CAF50';
            });
            
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.background = 'transparent';
            });
            
            menuItem.addEventListener('click', () => {
                if (item.action) {
                    item.action();
                }
                contextMenu.remove();
            });
            
            contextMenu.appendChild(menuItem);
        }
    });
    
    // Position context menu
    const x = Math.min(event.clientX, window.innerWidth - 180);
    const y = Math.min(event.clientY, window.innerHeight - menuItems.length * 35);
    
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
    
    document.body.appendChild(contextMenu);
    
    // Close context menu when clicking elsewhere
    const closeContextMenu = (e) => {
        if (!contextMenu.contains(e.target)) {
            contextMenu.remove();
            document.removeEventListener('click', closeContextMenu);
            document.removeEventListener('contextmenu', closeContextMenu);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', closeContextMenu);
        document.addEventListener('contextmenu', closeContextMenu);
    }, 0);
}

/**
 * Helper function to show image metadata from path
 */
function showImageInfoFromPath(imagePath) {
    const images = selectors.galleryImages();
    if (images) {
        const image = images.find(img => 
            img.path === imagePath || 
            img.relative_path === imagePath ||
            img.name === imagePath.split('/').pop()
        );
        if (image) {
            // TODO: Access showImageMetadata through callback
            console.log('Would show metadata for image:', image.name);
        }
    }
}

/**
 * Browse and load custom folder
 */
export async function browseCustomFolder(renderImageGrid) {
    try {
        console.log('Gallery: Opening folder browser...');
        
        // For now, show an input dialog - in future could integrate with system file browser
        const defaultPath = selectors.currentPath() || '/home/';
        const folderPath = prompt(
            'Enter the full path to a folder containing images:\n\n' +
            'Examples:\n' +
            '• /home/username/Pictures\n' +
            '• /path/to/your/images\n' +
            '• /mnt/drive/photos\n\n' +
            'Path:', 
            defaultPath
        );
        if (!folderPath || folderPath.trim() === '') return;
        
        console.log('Gallery: Loading images from custom folder...');
        
        // Use the same endpoint as the main gallery loading function
        const response = await api.fetchApi('/sage_utils/list_images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                folder: 'custom', 
                path: folderPath.trim() 
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            const { images = [], folders = [] } = result;
            
            if (images.length === 0 && folders.length === 0) {
                alert(`Folder "${folderPath}" contains no images or subfolders`);
                return;
            }
            
            // Add to folder selector if it's a valid custom folder
            const folderDropdown = document.querySelector('#gallery-folder-dropdown');
            if (folderDropdown) {
                // Remove any existing custom options to avoid duplicates
                const existingCustomOptions = Array.from(folderDropdown.options).filter(opt => 
                    opt.textContent.startsWith('Custom:')
                );
                existingCustomOptions.forEach(opt => opt.remove());
                
                const customOption = document.createElement('option');
                customOption.value = 'custom';
                customOption.textContent = `Custom: ${folderPath}`;
                folderDropdown.appendChild(customOption);
                
                // Select the new folder
                folderDropdown.value = 'custom';
            }
            
            // Update state
            actions.selectFolder('custom');
            actions.setCurrentPath(folderPath);
            actions.setImages(images);
            actions.setFolders(folders);
            
            // Render images
            renderImageGrid(images, folders).catch(console.error);
            
            console.log(`Gallery: Loaded ${images.length} images and ${folders.length} folders from custom folder: ${folderPath}`);
            
        } else {
            // Check the specific error to provide helpful feedback
            const errorMsg = result.error || 'Failed to browse folder';
            if (errorMsg.includes('does not exist')) {
                alert(`Path not found: "${folderPath}"\n\nPlease check that:\n• The path is correct\n• The folder exists\n• You have access permissions`);
            } else if (errorMsg.includes('not a directory')) {
                alert(`Not a folder: "${folderPath}"\n\nPlease provide a path to a folder, not a file.`);
            } else if (errorMsg.includes('Permission denied')) {
                alert(`Access denied: "${folderPath}"\n\nYou don't have permission to access this folder.`);
            } else {
                alert(`Error: ${errorMsg}`);
            }
            throw new Error(errorMsg);
        }
        
    } catch (error) {
        console.error('Error browsing folder:', error);
        
        // Provide specific error messages based on the type of error
        if (error.message.includes('HTTP error! status:')) {
            const status = error.message.match(/status: (\d+)/)?.[1];
            if (status === '400') {
                alert('Invalid folder path provided');
            } else if (status === '403') {
                alert('Access denied - you don\'t have permission to access this folder');
            } else if (status === '404') {
                alert('Folder not found');
            } else {
                alert(`Server error (${status}): Unable to browse folder`);
            }
        } else if (error.message.includes('Failed to fetch')) {
            alert('Network error: Unable to connect to the server');
        } else if (!error.message.startsWith('Path not found:') && 
                   !error.message.startsWith('Not a folder:') && 
                   !error.message.startsWith('Access denied:')) {
            // Only show generic error if we haven't already shown a specific one
            alert(`Error browsing folder: ${error.message}`);
        }
    }
}

/**
 * Toggle between grid and list view modes
 */
export function toggleViewMode(renderImageGrid) {
    const currentMode = selectors.galleryViewMode();
    const newMode = currentMode === 'grid' ? 'list' : 'grid';
    actions.setViewMode(newMode);
    
    // Update button text
    const viewModeButton = document.querySelector('.view-mode-button');
    if (viewModeButton) {
        viewModeButton.textContent = newMode === 'grid' ? '⊞ Grid View' : '☰ List View';
    }
    
    // Re-render images with new layout
    const images = selectors.galleryImages();
    const folders = selectors.galleryFolders();
    if (images && images.length > 0) {
        renderImageGrid(images, folders).catch(console.error);
    }
    
    console.log(`Gallery: Switched to ${newMode} view`);
}

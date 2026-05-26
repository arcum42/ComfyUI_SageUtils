/**
 * Gallery Event Handlers Module
 * Contains event handling functions for the image gallery
 * Extracted from imageGalleryTab.js for better organization
 */

import { api } from "../../../../scripts/api.js";
import { actions, selectors } from '../shared/stateManager.js';
import { copyImageToClipboard } from '../shared/imageUtils.js';
import { handleDatasetText } from '../shared/datasetTextManager.js';
import { loadImageMetadata, formatMetadataForDisplay } from '../shared/api/galleryApi.js';
import { loadFullImage, openImageInNewTab as openImageInNewTabUtil } from '../shared/imageLoader.js';
import { CONTEXT_MENU_WIDTH, CONTEXT_MENU_ITEM_HEIGHT } from '../shared/constants.js';
import { notifications } from '../shared/notifications.js';

/**
 * Shows a native OS folder picker dialog
 * @returns {Promise<string|null>} Selected folder path or null if cancelled
 */
async function showNativeFolderPicker() {
    return new Promise((resolve) => {
        try {
            // Create a modern folder browser dialog
            showFolderBrowserDialog(resolve);
        } catch (error) {
            console.log('Folder browser error:', error);
            resolve(null);
        }
    });
}

/**
 * Creates and shows a modern folder browser dialog
 * @param {Function} callback - Callback function to call with selected path
 */
async function showFolderBrowserDialog(callback) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'gallery-modal-overlay';
    
    // Create dialog container
    const dialog = document.createElement('div');
    dialog.className = 'gallery-folder-dialog';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'gallery-dialog-header';
    
    const title = document.createElement('h3');
    title.textContent = 'Select Folder';
    title.className = 'gallery-dialog-title';
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.className = 'gallery-dialog-close';
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    // Create path navigation with manual input
    const pathNav = document.createElement('div');
    pathNav.className = 'gallery-dialog-path-nav';
    
    const pathLabel = document.createElement('span');
    pathLabel.textContent = '📁';
    pathLabel.className = 'gallery-path-label';
    
    const pathInput = document.createElement('input');
    pathInput.type = 'text';
    pathInput.className = 'gallery-path-input';
    pathInput.placeholder = 'Enter path or click folders below...';
    
    const goButton = document.createElement('button');
    goButton.textContent = 'Go';
    goButton.className = 'gallery-go-button gallery-button-success';
    goButton.addEventListener('click', () => {
        const inputPath = pathInput.value.trim();
        if (inputPath) {
            loadDirectory(inputPath);
        }
    });
    
    pathInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            goButton.click();
        }
    });
    
    pathNav.appendChild(pathLabel);
    pathNav.appendChild(pathInput);
    pathNav.appendChild(goButton);
    
    // Create directory listing
    const directoryList = document.createElement('div');
    directoryList.className = 'gallery-dialog-directory-list';
    
    // Create footer with buttons
    const footer = document.createElement('div');
    footer.className = 'gallery-dialog-footer';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'gallery-button gallery-button-secondary';
    
    const selectBtn = document.createElement('button');
    selectBtn.textContent = 'Select Folder';
    selectBtn.className = 'gallery-button gallery-button-success';
    
    footer.appendChild(cancelBtn);
    footer.appendChild(selectBtn);
    
    // Assemble dialog
    dialog.appendChild(header);
    dialog.appendChild(pathNav);
    dialog.appendChild(directoryList);
    dialog.appendChild(footer);
    modal.appendChild(dialog);
    
    // State management - detect platform and set appropriate default path
    let currentPath = selectors.currentPath();
    if (!currentPath) {
        if (navigator.platform.startsWith('Win')) {
            currentPath = 'C:\\Users';
        } else {
            currentPath = '/home';
        }
    }
    
    // Add quick access buttons for common locations
    const quickAccess = document.createElement('div');
    quickAccess.className = 'gallery-quick-access';
    
    const commonPaths = [
        { label: '🏠 Home', path: '/home' },
        { label: '💾 Root', path: '/' },
        { label: '🗂️ /mnt', path: '/mnt' },
        { label: '💿 /opt', path: '/opt' }
    ];
    
    // Get or create favorites from localStorage
    const getFavorites = () => {
        try {
            const stored = localStorage.getItem('sageutils_folder_favorites');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Failed to load favorites:', e);
        }
        
        // Default favorites based on platform
        if (navigator.platform.startsWith('Win')) {
            return [
                { label: '🏠 Users', path: 'C:\\Users' },
                { label: '💾 C:', path: 'C:\\' },
                { label: '📁 Desktop', path: '%USERPROFILE%\\Desktop' },
                { label: '🖼️ Pictures', path: '%USERPROFILE%\\Pictures' }
            ];
        } else {
            return [
                { label: '🏠 Home', path: '/home' },
                { label: '💾 Root', path: '/' },
                { label: '🗂️ /mnt', path: '/mnt' },
                { label: '💿 /opt', path: '/opt' }
            ];
        }
    };
    
    const saveFavorites = (favorites) => {
        try {
            localStorage.setItem('sageutils_folder_favorites', JSON.stringify(favorites));
        } catch (e) {
            console.warn('Failed to save favorites:', e);
        }
    };
    
    let favorites = getFavorites();
    
    const renderFavorites = () => {
        // Clear existing buttons
        quickAccess.innerHTML = '';
        
        // Add favorites label
        const favoritesLabel = document.createElement('span');
        favoritesLabel.textContent = '⭐ Favorites:';
        favoritesLabel.className = 'gallery-favorites-label';
        quickAccess.appendChild(favoritesLabel);
        
        // Add favorite buttons
        favorites.forEach((fav, index) => {
            const btn = document.createElement('button');
            btn.textContent = fav.label;
            btn.className = 'gallery-button gallery-button-secondary gallery-favorite-btn';
            btn.addEventListener('click', () => loadDirectory(fav.path));
            
            // Right-click to remove favorite
            btn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (confirm(`Remove "${fav.label}" from favorites?`)) {
                    favorites.splice(index, 1);
                    saveFavorites(favorites);
                    renderFavorites();
                }
            });
            
            quickAccess.appendChild(btn);
        });
        
        // Add "Add Favorite" button
        const addBtn = document.createElement('button');
        addBtn.textContent = '+ Add';
        addBtn.className = 'gallery-button gallery-button-success gallery-favorite-add-btn';
        addBtn.addEventListener('click', () => {
            const label = prompt('Enter a label for this favorite:', `📁 ${currentPath.split(/[/\\]/).pop() || 'Folder'}`);
            if (label && label.trim()) {
                favorites.push({ label: label.trim(), path: currentPath });
                saveFavorites(favorites);
                renderFavorites();
            }
        });
        quickAccess.appendChild(addBtn);
        
        // Add "Help" button
        const helpBtn = document.createElement('button');
        helpBtn.textContent = '?';
        helpBtn.title = 'Favorites help';
        helpBtn.className = 'gallery-button gallery-button-secondary gallery-favorite-help-btn';
        helpBtn.addEventListener('click', () => {
            notifications.info('Favorites:\n\n• Click to navigate to folder\n• Right-click to remove\n• "+ Add" to save current folder\n• Saved per system/browser', 8000);
        });
        quickAccess.appendChild(helpBtn);
    };
    
    renderFavorites();
    
    // Insert quick access after path nav
    dialog.insertBefore(quickAccess, directoryList);
    
    // Function to load directory contents
    async function loadDirectory(path) {
        try {
            directoryList.innerHTML = `
                <div style="
                    text-align: center;
                    padding: 40px;
                    color: #4CAF50;
                ">
                    <div style="font-size: 24px; margin-bottom: 10px;">📁</div>
                    <div>Loading directories...</div>
                </div>
            `;
            
            const response = await api.fetchApi('/sage_utils/browse_directory_tree', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            });
            
            const result = await response.json();
            
            if (result.success) {
                currentPath = result.current_path;
                pathInput.value = currentPath;
                
                directoryList.innerHTML = '';
                
                if (result.directories.length === 0) {
                    directoryList.innerHTML = `
                        <div class="gallery-empty-state">
                            <div class="gallery-empty-state-icon">📁</div>
                            <div>No accessible subdirectories</div>
                        </div>
                    `;
                } else {
                    result.directories.forEach(dir => {
                        const dirItem = document.createElement('div');
                        dirItem.className = `gallery-dir-item${dir.accessible ? '' : ' disabled'}`;
                        
                        const icon = document.createElement('span');
                        icon.className = 'gallery-dir-icon';
                        icon.textContent = dir.type === 'parent' ? '⬆️' : '📁';
                        
                        const name = document.createElement('span');
                        name.className = 'gallery-dir-name';
                        name.textContent = dir.name;
                        
                        const info = document.createElement('span');
                        info.className = 'gallery-dir-info';
                        
                        if (dir.type === 'directory' && dir.image_count !== undefined) {
                            if (dir.image_count > 0) {
                                info.textContent = `${dir.image_count}${dir.image_count >= 10 ? '+' : ''} images`;
                                info.classList.add('gallery-dir-info-positive');
                            } else if (dir.image_count === 0) {
                                info.textContent = 'No images';
                            } else {
                                info.textContent = 'Access denied';
                                info.classList.add('gallery-dir-info-negative');
                            }
                        }
                        
                        dirItem.appendChild(icon);
                        dirItem.appendChild(name);
                        dirItem.appendChild(info);
                        
                        // Add click handler
                        if (dir.accessible) {
                            dirItem.addEventListener('click', () => {
                                loadDirectory(dir.path);
                            });
                        }
                        
                        directoryList.appendChild(dirItem);
                    });
                }
            } else {
                throw new Error(result.error || 'Failed to load directory');
            }
            
        } catch (error) {
            console.error('Error loading directory:', error);
            directoryList.innerHTML = `
                <div class="gallery-error-state">
                    <div class="gallery-error-state-icon">❌</div>
                    <div>Error loading directory</div>
                    <div class="gallery-filename-path" style="font-size: 12px; margin-top: 8px;">${error.message}</div>
                </div>
            `;
        }
    }
    
    // Event handlers
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
        callback(null);
    });
    
    cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
        callback(null);
    });
    
    selectBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
        callback(currentPath);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
            callback(null);
        }
    });
    
    // Keyboard handling
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(modal);
            document.removeEventListener('keydown', handleKeyDown);
            callback(null);
        }
    };
    document.addEventListener('keydown', handleKeyDown);
    
    // Show the dialog
    document.body.appendChild(modal);
    
    // Load initial directory
    await loadDirectory(currentPath);
}

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
            const { html, hasErrors } = formatMetadataForDisplay(result.metadata);
            showMetadataModal(image, html, hasErrors, result.metadata);
        } else {
            const fallbackHtml = generateFallbackMetadata(image, result.error);
            showMetadataModal(image, fallbackHtml, true, null);
        }
    } catch (error) {
        console.error('Error loading image metadata:', error);
        const fallbackHtml = generateFallbackMetadata(image, `Error: ${error.message}`);
        showMetadataModal(image, fallbackHtml, true, null);
    }
}

/**
 * Shows image metadata in a modal dialog
 * @param {Object} image - Image object
 * @param {string} metadataHtml - HTML content for metadata
 * @param {boolean} hasErrors - Whether metadata loading had errors
 * @param {Object|null} metadata - Raw metadata object for parameter extraction
 */
function showMetadataModal(image, metadataHtml, hasErrors = false, metadata = null) {
    // Remove any existing metadata modal
    const existingModal = document.querySelector('.metadata-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'metadata-modal';

    // Create modal content container
    const modalContent = document.createElement('div');
    modalContent.className = 'metadata-modal-content';

    // Create header
    const header = document.createElement('div');
    header.className = 'metadata-modal-header';

    const title = document.createElement('div');
    title.className = 'metadata-modal-title';
    
    const statusIcon = hasErrors ? '⚠️' : '📄';
    const statusText = hasErrors ? 'Image Metadata (with warnings)' : 'Image Metadata';
    title.innerHTML = `${statusIcon} ${statusText}`;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.className = 'metadata-close-button';

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Create content area
    const content = document.createElement('div');
    content.className = 'metadata-content-area';

    // Add filename info at the top
    const filenameInfo = document.createElement('div');
    filenameInfo.className = 'metadata-filename-info';
    filenameInfo.innerHTML = `
        <div class="metadata-filename-title">📁 File Information</div>
        <div><strong>Name:</strong> ${image.filename || image.name || 'Unknown'}</div>
        <div class="metadata-filename-path">
            ${image.path || image.relative_path || 'No path available'}
        </div>
    `;

    content.appendChild(filenameInfo);

    // Add the metadata content
    const metadataDiv = document.createElement('div');
    metadataDiv.innerHTML = metadataHtml;
    content.appendChild(metadataDiv);

    // Add copy button for generation parameters if they exist
    if (metadata && metadata.generation_params && Object.keys(metadata.generation_params).length > 0) {
        // Find the generation parameters section and add the button
        const genParamsHeaders = metadataDiv.querySelectorAll('div');
        let genParamsHeader = null;
        
        for (const header of genParamsHeaders) {
            if (header.textContent && header.textContent.includes('🎨 Generation Parameters')) {
                genParamsHeader = header;
                break;
            }
        }
        
        if (genParamsHeader) {
            // Create a container for the header and button
            const headerContainer = document.createElement('div');
            headerContainer.className = 'metadata-header-container';
            
            // Create the copy button
            const copyBtn = document.createElement('button');
            copyBtn.innerHTML = '📋';
            copyBtn.title = 'Copy generation parameters to clipboard';
            copyBtn.className = 'metadata-copy-button';
            
            copyBtn.addEventListener('click', async () => {
                try {
                    const genParams = metadata.generation_params;
                    let textToCopy = '';
                    
                    // Format generation parameters as readable text
                    Object.entries(genParams).forEach(([key, value]) => {
                        if (typeof value === 'object') {
                            textToCopy += `${key}:\n${JSON.stringify(value, null, 2)}\n\n`;
                        } else {
                            textToCopy += `${key}: ${value}\n`;
                        }
                    });
                    
                    // Try modern clipboard API first
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(textToCopy.trim());
                    } else {
                        // Fallback for older browsers
                        const textArea = document.createElement('textarea');
                        textArea.value = textToCopy.trim();
                        textArea.style.position = 'fixed';
                        textArea.style.left = '-999999px';
                        textArea.style.top = '-999999px';
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                    }
                    
                    // Show success feedback
                    const originalText = copyBtn.innerHTML;
                    const originalBg = copyBtn.style.backgroundColor;
                    copyBtn.innerHTML = '✅';
                    copyBtn.style.backgroundColor = '#2196F3';
                    copyBtn.style.cursor = 'default';
                    copyBtn.disabled = true;
                    
                    setTimeout(() => {
                        copyBtn.innerHTML = originalText;
                        copyBtn.style.backgroundColor = originalBg;
                        copyBtn.style.cursor = 'pointer';
                        copyBtn.disabled = false;
                    }, 1500);
                    
                } catch (error) {
                    console.error('Error copying to clipboard:', error);
                    
                    // Show error feedback
                    const originalText = copyBtn.innerHTML;
                    const originalBg = copyBtn.style.backgroundColor;
                    copyBtn.innerHTML = '❌';
                    copyBtn.style.backgroundColor = '#f44336';
                    copyBtn.style.cursor = 'default';
                    copyBtn.disabled = true;
                    
                    setTimeout(() => {
                        copyBtn.innerHTML = originalText;
                        copyBtn.style.backgroundColor = originalBg;
                        copyBtn.style.cursor = 'pointer';
                        copyBtn.disabled = false;
                    }, 1500);
                }
            });
            
            // Move the original header styling to a new div
            const headerText = document.createElement('div');
            headerText.style.cssText = genParamsHeader.style.cssText;
            headerText.innerHTML = genParamsHeader.innerHTML;
            
            // Replace the original header with the container
            headerContainer.appendChild(headerText);
            headerContainer.appendChild(copyBtn);
            genParamsHeader.parentNode.replaceChild(headerContainer, genParamsHeader);
        }
    }

    // Assemble modal
    modalContent.appendChild(header);
    modalContent.appendChild(content);
    modal.appendChild(modalContent);

    // Event handlers
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });

    // Keyboard handling
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(modal);
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Show modal
    document.body.appendChild(modal);
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
    
    // Create image container
    const imageContainer = document.createElement('div');
    imageContainer.className = 'fullimage-image-container';
    
    // Create the main image element
    const img = document.createElement('img');
    img.className = 'fullimage-img';
    
    // Create controls container
    const controls = document.createElement('div');
    controls.className = 'fullimage-controls';
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.title = 'Close (Esc)';
    closeBtn.className = 'fullimage-button';
    
    // Zoom controls
    const zoomInBtn = document.createElement('button');
    zoomInBtn.innerHTML = '+';
    zoomInBtn.title = 'Zoom In (+)';
    zoomInBtn.className = 'fullimage-button';
    
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.innerHTML = '−';
    zoomOutBtn.title = 'Zoom Out (-)';
    zoomOutBtn.className = 'fullimage-button';
    
    const resetZoomBtn = document.createElement('button');
    resetZoomBtn.innerHTML = '1:1';
    resetZoomBtn.title = 'Reset Zoom (0)';
    resetZoomBtn.className = 'fullimage-button';
    resetZoomBtn.style.fontSize = '12px';
    
    // Navigation arrows (only show if multiple images)
    let prevBtn, nextBtn;
    if (images.length > 1) {
        prevBtn = document.createElement('button');
        prevBtn.innerHTML = '◀';
        prevBtn.title = 'Previous Image (←)';
        prevBtn.className = 'fullimage-nav-button';
        prevBtn.style.left = '20px';
        prevBtn.style.top = '50%';
        prevBtn.style.transform = 'translateY(-50%)';
        
        nextBtn = document.createElement('button');
        nextBtn.innerHTML = '▶';
        nextBtn.title = 'Next Image (→)';
        nextBtn.className = 'fullimage-nav-button';
        nextBtn.style.left = 'auto';
        nextBtn.style.right = '20px';
    }
    
    // Image info overlay
    const infoOverlay = document.createElement('div');
    infoOverlay.className = 'fullimage-info-overlay';
    
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
    
    // Import cross-tab messaging dynamically
    import('../shared/crossTabMessaging.js').then(({ sendImagesToLLM, showNotification }) => {
        // Import performance utils for rate limiting
        import('../shared/performanceUtils.js').then(({ RateLimiter }) => {
            // Create rate limiter: max 5 image transfers per 2 seconds
            if (!window._galleryImageTransferLimiter) {
                window._galleryImageTransferLimiter = new RateLimiter(5, 2000);
            }
            
            const rateLimiter = window._galleryImageTransferLimiter;
            
            // Menu items - organized by function
            const menuItems = [
                // Viewing group
                { text: '👁️ View Full Size', action: () => showFullImage(image) },
                { text: '🔍 Show Details', action: () => showImageMetadata(image) },
                { text: '---', action: null }, // Separator
                
                // Actions group
                { text: '🤖 Send to LLM Chat', action: async () => {
                    // Check rate limit
                    if (!rateLimiter.allowCall()) {
                        const waitTime = Math.ceil(rateLimiter.getWaitTime() / 1000);
                        showNotification(`Please wait ${waitTime}s before sending more images`, 'warning');
                        return;
                    }
                    
                    try {
                        // Convert image to base64 (returns data URL like "data:image/jpeg;base64,...")
                        const base64DataUrl = await imageToBase64(imagePath);
                        sendImagesToLLM([{
                            file: null,
                            preview: base64DataUrl,  // Use base64 data URL for preview
                            base64: base64DataUrl,   // Full data URL
                            name: image.name || imagePath.split('/').pop()
                        }], {
                            source: 'gallery',
                            autoSwitch: true
                        });
                        showNotification('Image sent to LLM tab', 'success');
                    } catch (error) {
                        console.error('Failed to send image to LLM:', error);
                        showNotification('Failed to send image to LLM', 'error');
                    }
                }},
                { text: '� Open in New Tab', action: () => openImageInNewTab(image) },
                { text: '---', action: null }, // Separator
                
                // Copy group
                { text: '� Copy to Clipboard', action: () => {
                    const imagePath = image.path || image.relative_path || image.name;
                    copyImageToClipboard(imagePath);
                }},
                { text: '📄 Copy Path', action: () => {
                    const imagePath = image.path || image.relative_path || image.name;
                    navigator.clipboard.writeText(imagePath);
                }}
            ];

            // Render menu items (implementation continues below)
            renderContextMenuItems(contextMenu, menuItems);
        }).catch(err => {
            console.warn('[Gallery] Failed to load performance utils:', err);
            // Fallback without rate limiting
            const menuItems = [
                // Viewing group
                { text: '👁️ View Full Size', action: () => showFullImage(image) },
                { text: '🔍 Show Details', action: () => showImageMetadata(image) },
                { text: '---', action: null },
                
                // Actions group
                { text: '🤖 Send to LLM Chat', action: async () => {
                    try {
                        const base64DataUrl = await imageToBase64(imagePath);
                        sendImagesToLLM([{
                            file: null,
                            preview: base64DataUrl,
                            base64: base64DataUrl,
                            name: image.name || imagePath.split('/').pop()
                        }], {
                            source: 'gallery',
                            autoSwitch: true
                        });
                        showNotification('Image sent to LLM tab', 'success');
                    } catch (error) {
                        console.error('Failed to send image to LLM:', error);
                        showNotification('Failed to send image to LLM', 'error');
                    }
                }},
                { text: '� Open in New Tab', action: () => openImageInNewTab(image) },
                { text: '---', action: null },
                
                // Copy group
                { text: '� Copy to Clipboard', action: () => {
                    const imagePath = image.path || image.relative_path || image.name;
                    copyImageToClipboard(imagePath);
                }},
                { text: '📄 Copy Path', action: () => {
                    const imagePath = image.path || image.relative_path || image.name;
                    navigator.clipboard.writeText(imagePath);
                }}
            ];
            renderContextMenuItems(contextMenu, menuItems);
        });
    });
    
    // Position context menu
    const x = Math.min(event.clientX, window.innerWidth - CONTEXT_MENU_WIDTH);
    const y = Math.min(event.clientY, window.innerHeight - 8 * CONTEXT_MENU_ITEM_HEIGHT); // 8 items (6 actions + 2 separators)
    
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
 * Helper function to render context menu items
 */
function renderContextMenuItems(contextMenu, menuItems) {
    menuItems.forEach(item => {
        if (item.text === '---') {
            const separator = document.createElement('div');
            separator.className = 'image-context-menu-separator';
            contextMenu.appendChild(separator);
        } else {
            const menuItem = document.createElement('div');
            menuItem.textContent = item.text;
            menuItem.className = 'image-context-menu-item';
            
            // Hover handled by CSS
            
            menuItem.addEventListener('click', () => {
                if (item.action) {
                    item.action();
                }
                contextMenu.remove();
            });
            
            contextMenu.appendChild(menuItem);
        }
    });
}

/**
 * Convert image path to base64
 */
/**
 * Convert image path to base64 data URL
 * @param {string} imagePath - Full path to the image file
 * @returns {Promise<string>} - Base64 data URL
 */
async function imageToBase64(imagePath) {
    try {
        // Use the correct API endpoint (POST with JSON body)
        const response = await fetch('/sage_utils/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_path: imagePath })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error converting image to base64:', error);
        throw error;
    }
}

/**
 * Helper function to show image metadata from path
 */
async function showImageInfoFromPath(imagePath) {
    const images = selectors.galleryImages();
    if (images) {
        const image = images.find(img => 
            img.path === imagePath || 
            img.relative_path === imagePath ||
            img.name === imagePath.split('/').pop()
        );
        if (image) {
            // Show metadata for the found image
            await showImageMetadata(image);
        }
    }
}

/**
 * Browse and load custom folder
 * @param {Object} context - Context object containing callbacks and utilities
 * @param {Function} context.renderImageGrid - Callback to render image grid
 * @param {HTMLSelectElement} context.folderDropdown - Folder dropdown element
 * @param {Function} context.populateFolderDropdown - Function to populate dropdown
 */
export async function browseCustomFolder(context) {
    try {
        // Support both old signature (just renderImageGrid) and new signature (context object)
        const renderImageGrid = typeof context === 'function' ? context : context.renderImageGrid;
        const folderDropdown = context.folderDropdown || document.querySelector('#gallery-folder-selector');
        const populateFolderDropdown = context.populateFolderDropdown;
        
        console.log('Gallery: Opening folder browser...');
        
        // Show the modern folder browser dialog
        const folderPath = await showNativeFolderPicker();
        
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
                notifications.warning(`Folder "${folderPath}" contains no images or subfolders`);
                return;
            }
            
            // Update state first
            const customValue = `custom:${folderPath}`;
            actions.selectFolder(customValue);
            actions.setCurrentPath(folderPath);
            actions.setImages(images);
            actions.setFolders(folders);
            
            // Update dropdown to include the new custom folder
            if (folderDropdown) {
                if (populateFolderDropdown) {
                    // Use the provided function to repopulate the dropdown
                    populateFolderDropdown(folderDropdown, folderPath);
                    folderDropdown.value = customValue;
                } else {
                    // Fallback: manually update if function not available
                    // Check if option already exists
                    let optionExists = false;
                    for (let i = 0; i < folderDropdown.options.length; i++) {
                        if (folderDropdown.options[i].value === customValue) {
                            optionExists = true;
                            break;
                        }
                    }
                    
                    if (!optionExists) {
                        // Add new option before the browse option
                        const browseOption = Array.from(folderDropdown.options).find(opt => opt.value === 'browse');
                        const newOption = document.createElement('option');
                        newOption.value = customValue;
                        
                        // Create a display name for the path
                        const parts = folderPath.split('/').filter(p => p.length > 0);
                        const folderName = parts[parts.length - 1] || 'root';
                        newOption.textContent = `📁 ${folderName} (${folderPath})`;
                        newOption.dataset.customPath = folderPath;
                        
                        if (browseOption) {
                            folderDropdown.insertBefore(newOption, browseOption.previousSibling);
                        } else {
                            folderDropdown.appendChild(newOption);
                        }
                    }
                    
                    folderDropdown.value = customValue;
                }
            }
            
            // Render images
            if (renderImageGrid) {
                renderImageGrid(images, folders).catch(console.error);
            }
            
            console.log(`Gallery: Loaded ${images.length} images and ${folders.length} folders from custom folder: ${folderPath}`);
            
        } else {
            // Check the specific error to provide helpful feedback
            const errorMsg = result.error || 'Failed to browse folder';
            if (errorMsg.includes('does not exist')) {
                notifications.error(`Path not found: "${folderPath}"\n\nPlease check that:\n• The path is correct\n• The folder exists\n• You have access permissions`);
            } else if (errorMsg.includes('not a directory')) {
                notifications.error(`Not a folder: "${folderPath}"\n\nPlease provide a path to a folder, not a file.`);
            } else if (errorMsg.includes('Permission denied')) {
                notifications.error(`Access denied: "${folderPath}"\n\nYou don't have permission to access this folder.`);
            } else {
                notifications.error(`Error: ${errorMsg}`);
            }
            throw new Error(errorMsg);
        }
        
    } catch (error) {
        console.error('Error browsing folder:', error);
        
        // Provide specific error messages based on the type of error
        if (error.message.includes('HTTP error! status:')) {
            const status = error.message.match(/status: (\d+)/)?.[1];
            if (status === '400') {
                notifications.error('Invalid folder path provided');
            } else if (status === '403') {
                notifications.error('Access denied - you don\'t have permission to access this folder');
            } else if (status === '404') {
                notifications.error('Folder not found');
            } else {
                notifications.error(`Server error (${status}): Unable to browse folder`);
            }
        } else if (error.message.includes('Failed to fetch')) {
            notifications.error('Network error: Unable to connect to the server');
        } else if (!error.message.startsWith('Path not found:') && 
                   !error.message.startsWith('Not a folder:') && 
                   !error.message.startsWith('Access denied:')) {
            // Only show generic error if we haven't already shown a specific one
            notifications.error(`Error browsing folder: ${error.message}`);
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

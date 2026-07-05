/**
 * Gallery Event Handlers Module
 * Contains event handling functions for the image gallery
 * Extracted from imageGalleryTab.js for better organization
 */

import { api } from "../../../../scripts/api.js";
import { actions, selectors } from '../shared/stateManager.js';
import { copyImageToClipboard, browseFolder, loadImagesFromFolder } from '../shared/imageUtils.js';
import { handleDatasetText } from '../shared/datasetTextManager.js';
import { getImageMetadataHtml } from '../shared/api/galleryApi.js';
import { showFullImage } from '../shared/imageViewer.js';
import { openImageInNewTab as openImageInNewTabUtil, loadImageDataUrl } from '../shared/imageLoader.js';
import { createDialog } from '../components/dialogManager.js';
import { CONTEXT_MENU_WIDTH, CONTEXT_MENU_ITEM_HEIGHT } from '../shared/constants.js';
import { notifications } from '../shared/notifications.js';
import { API_ENDPOINTS } from '../shared/config.js';

export { showFullImage, showImageMetadata };

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
            
            const response = await api.fetchApi(API_ENDPOINTS.browseDirectoryTree, {
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
    const { html, hasErrors, metadata } = await getImageMetadataHtml(image);
    showMetadataModal(image, html, hasErrors, metadata);
}

/**
 * Shows image metadata in a modal dialog
 * @param {Object} image - Image object
 * @param {string} metadataHtml - HTML content for metadata
 * @param {boolean} hasErrors - Whether metadata loading had errors
 * @param {Object|null} metadata - Raw metadata object for parameter extraction
 */
function showMetadataModal(image, metadataHtml, hasErrors = false, metadata = null) {
    const dialog = createDialog({
        title: hasErrors ? '⚠️ Image Metadata' : '📄 Image Metadata',
        width: '900px',
        height: 'auto',
        showCloseButton: true,
        showFooter: false,
        closeOnOverlayClick: true,
        closable: true
    });

    const content = document.createElement('div');
    content.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 16px;
        max-height: 70vh;
        overflow-y: auto;
        padding-right: 4px;
        color: #f5f5f5;
    `;

    const filenameInfo = document.createElement('div');
    filenameInfo.style.cssText = `
        padding: 14px;
        background: rgba(255,255,255,0.05);
        border-radius: 8px;
        font-size: 14px;
    `;
    filenameInfo.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 8px;">📁 File Information</div>
        <div><strong>Name:</strong> ${image.filename || image.name || 'Unknown'}</div>
        <div><strong>Path:</strong> ${image.path || image.relative_path || 'No path available'}</div>
        ${image.modified ? `<div><strong>Modified:</strong> ${new Date(image.modified).toLocaleString()}</div>` : ''}
    `;

    const metadataDiv = document.createElement('div');
    metadataDiv.style.cssText = `
        font-size: 13px;
        line-height: 1.5;
        white-space: pre-wrap;
    `;
    metadataDiv.innerHTML = metadataHtml;

    content.appendChild(filenameInfo);
    content.appendChild(metadataDiv);

    dialog.setContent(content);
    dialog.show();
}

async function getImageMetadataText(image) {
    const result = await getImageMetadataHtml(image);
    const metadata = result.metadata || {};
    const lines = [];
    const imagePath = image.path || image.relative_path || image.name || 'Unknown';

    lines.push(`Image metadata for: ${image.filename || imagePath}`);
    lines.push(`Path: ${imagePath}`);

    if (metadata.file_info) {
        const fileInfo = metadata.file_info;
        if (fileInfo.filename) lines.push(`Filename: ${fileInfo.filename}`);
        if (fileInfo.dimensions) lines.push(`Dimensions: ${fileInfo.dimensions.width}×${fileInfo.dimensions.height}`);
        if (fileInfo.size_human || fileInfo.size) lines.push(`Size: ${fileInfo.size_human || fileInfo.size}`);
        if (fileInfo.format) lines.push(`Format: ${fileInfo.format}`);
        if (fileInfo.modified) lines.push(`Modified: ${new Date(fileInfo.modified).toLocaleString()}`);
    }

    if (metadata.generation_params && Object.keys(metadata.generation_params).length > 0) {
        lines.push('');
        lines.push('Generation parameters:');
        Object.entries(metadata.generation_params).forEach(([key, value]) => {
            const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
            lines.push(`${key}: ${displayValue}`);
        });
    }

    if (metadata.exif && Object.keys(metadata.exif).length > 0) {
        lines.push('');
        lines.push('EXIF data:');
        Object.entries(metadata.exif).forEach(([key, value]) => {
            const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
            lines.push(`${key}: ${displayValue}`);
        });
    }

    if (lines.length === 2) {
        lines.push('No metadata available.');
    }

    return lines.join('\n');
}

async function sendImageMetadataToLLM(image) {
    const metadataText = await getImageMetadataText(image);
    const { sendTextToLLM } = await import('../shared/crossTabMessaging.js');
    const text = `\n\n${metadataText}`;
    sendTextToLLM(text, { source: 'gallery-metadata', autoSwitch: true, append: true });
    notifications.success('Metadata appended to LLM prompt');
}

async function sendImageAndMetadataToLLM(image) {
    const metadataText = await getImageMetadataText(image);
    const imagePath = image.path || image.relative_path || image.name;
    const { sendTextToLLM, sendImagesToLLM } = await import('../shared/crossTabMessaging.js');

    sendTextToLLM(`\n\n${metadataText}`, {
        source: 'gallery-metadata',
        autoSwitch: true,
        append: true
    });

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
        notifications.success('Image and metadata sent to LLM tab');
    } catch (error) {
        console.error('Failed to send image and metadata to LLM:', error);
        notifications.error('Failed to send image and metadata to LLM');
    }
}

async function sendImageMetadataToPromptBuilder(image) {
    const metadataText = await getImageMetadataText(image);
    const { sendTextToPromptBuilder } = await import('../shared/crossTabMessaging.js');
    sendTextToPromptBuilder(metadataText, { source: 'gallery-metadata', autoSwitch: true });
    notifications.success('Metadata sent to Prompt Builder');
}

async function copyImageMetadataToSelectedNode(image) {
    const metadataText = await getImageMetadataText(image);
    const app = typeof window !== 'undefined' ? window.app : globalThis.app;
    if (!app) {
        notifications.error('Selected node feature is unavailable in this environment');
        return;
    }
    const { copyTextToSelectedNode } = await import('../utils/textCopyUtils.js');
    const success = copyTextToSelectedNode(app, metadataText);
    if (success) {
        notifications.success('Metadata copied to selected node');
    } else {
        notifications.error('Please select a valid text node first');
    }
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
                { text: '👁️ View Full Size', action: () => showFullImage(image, { showMetadata: showImageMetadata }) },
                { text: '🔍 Show Details', action: () => showImageMetadata(image) },
                { text: '---', action: null }, // Separator

                // Metadata send group
                {
                    text: '✉️ Send metadata...',
                    submenu: [
                        { text: 'LLM tab', action: () => sendImageMetadataToLLM(image) },
                        { text: 'Prompt Builder', action: () => sendImageMetadataToPromptBuilder(image) },
                        { text: 'Selected node', action: () => copyImageMetadataToSelectedNode(image) }
                    ]
                },
                {
                    text: '🖼️ Send image + metadata...',
                    submenu: [
                        { text: 'LLM tab', action: () => sendImageAndMetadataToLLM(image) }
                    ]
                },
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
                { text: '↗ Open in New Tab', action: () => openImageInNewTab(image) },
                { text: '---', action: null }, // Separator

                // Copy group
                { text: '📋 Copy to Clipboard', action: () => {
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
                { text: '👁️ View Full Size', action: () => showFullImage(image, { showMetadata: showImageMetadata }) },
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
            menuItem.className = 'image-context-menu-item';

            if (item.submenu && Array.isArray(item.submenu)) {
                menuItem.classList.add('image-context-menu-parent');
                const label = document.createElement('span');
                label.textContent = item.text;
                const arrow = document.createElement('span');
                arrow.className = 'image-context-menu-arrow';
                arrow.textContent = '▶';
                menuItem.appendChild(label);
                menuItem.appendChild(arrow);

                const submenu = document.createElement('div');
                submenu.className = 'image-context-submenu';
                renderContextMenuItems(submenu, item.submenu);
                menuItem.appendChild(submenu);

                menuItem.addEventListener('mouseenter', () => {
                    submenu.classList.add('open');
                });
                menuItem.addEventListener('mouseleave', () => {
                    submenu.classList.remove('open');
                });
            } else {
                menuItem.textContent = item.text;
                menuItem.addEventListener('click', () => {
                    if (item.action) {
                        item.action();
                    }
                    contextMenu.remove();
                });
            }

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
        return await loadImageDataUrl(imagePath);
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
        
        console.log('Gallery: Validating custom folder path...');
        const validation = await browseFolder(folderPath.trim());

        if (!validation.valid || !validation.accessible) {
            throw new Error(`Folder cannot be accessed: ${folderPath.trim()}`);
        }

        console.log('Gallery: Loading images from custom folder...');
        const result = await loadImagesFromFolder('custom', folderPath.trim());
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

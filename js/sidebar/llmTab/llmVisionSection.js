/**
 * LLM Vision Section Component
 * Creates the image upload interface with drag/drop, paste, and preview
 */

import { createResponsiveGrid } from '../../components/layout.js';

/**
 * Creates the vision upload section
 * @returns {HTMLElement} - Vision section element
 */
export function createVisionSection() {
    const section = document.createElement('div');
    section.className = 'llm-vision-section';
    section.style.display = 'none'; // Hidden by default
    
    // Section header
    const header = document.createElement('div');
    header.className = 'llm-vision-header';
    
    const title = document.createElement('h3');
    title.textContent = 'Images';
    title.className = 'llm-section-title';
    
    const imageCount = document.createElement('span');
    imageCount.className = 'llm-image-count';
    imageCount.textContent = '0 images';
    
    const clearAllBtn = document.createElement('button');
    clearAllBtn.className = 'llm-btn llm-btn-secondary llm-clear-all-images-btn';
    clearAllBtn.textContent = 'Clear All';
    clearAllBtn.style.display = 'none';
    
    header.appendChild(title);
    header.appendChild(imageCount);
    header.appendChild(clearAllBtn);
    
    // Upload zone
    const uploadZone = document.createElement('div');
    uploadZone.className = 'llm-upload-zone';
    
    const uploadIcon = document.createElement('div');
    uploadIcon.className = 'llm-upload-icon';
    uploadIcon.innerHTML = '📁';
    
    const uploadText = document.createElement('div');
    uploadText.className = 'llm-upload-text';
    uploadText.innerHTML = `
        <strong>Drop images here or click to upload</strong>
        <span>You can also paste images from clipboard (Ctrl+V)</span>
    `;
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.className = 'llm-file-input';
    fileInput.style.display = 'none';
    
    uploadZone.appendChild(uploadIcon);
    uploadZone.appendChild(uploadText);
    uploadZone.appendChild(fileInput);
    
    // Image preview grid using responsive grid component
    const previewGrid = createResponsiveGrid({
        minItemWidth: 100,
        gap: '12px',
        className: 'llm-image-preview-grid',
        style: {
            marginTop: '16px',
            display: 'none'
        }
    });
    
    section.appendChild(header);
    section.appendChild(uploadZone);
    section.appendChild(previewGrid);
    
    return section;
}

/**
 * Convert file to base64
 * @param {File} file - File to convert
 * @returns {Promise<string>} - Base64 string (without data URL prefix)
 */
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Strip the data URL prefix (e.g., "data:image/png;base64,")
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Validate image file
 * @param {File} file - File to validate
 * @returns {Object|null} - Error object if invalid, null if valid
 */
export function validateImageFile(file) {
    // List of supported image formats
    const supportedFormats = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif'
    ];
    
    // Check if it's an image
    if (!file.type.startsWith('image/')) {
        return { file: file.name, error: 'Not an image file' };
    }
    
    // Check if format is supported
    if (!supportedFormats.includes(file.type.toLowerCase())) {
        const format = file.type.split('/')[1]?.toUpperCase() || 'unknown';
        return { file: file.name, error: `Unsupported format (${format}). Supported: JPEG, PNG, WEBP, GIF` };
    }
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(1);
        return { file: file.name, error: `File too large (${sizeMB}MB). Maximum: 10MB` };
    }
    
    return null; // Valid
}

/**
 * Add image to preview grid
 * @param {Object} state - Tab state
 * @param {HTMLElement} visionSection - Vision section element
 * @param {File} file - Image file
 */
export async function addImageToPreview(state, visionSection, file) {
    const previewGrid = visionSection.querySelector('.llm-image-preview-grid');
    const imageCount = visionSection.querySelector('.llm-image-count');
    const clearAllBtn = visionSection.querySelector('.llm-clear-all-images-btn');
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    
    // Convert to base64
    const base64 = await fileToBase64(file);
    
    // Add to state
    const imageData = { file, preview: previewUrl, base64 };
    state.images.push(imageData);
    
    // Create preview item
    const previewItem = document.createElement('div');
    previewItem.className = 'llm-image-preview-item';
    
    const img = document.createElement('img');
    img.src = previewUrl;
    img.className = 'llm-preview-image';
    img.alt = file.name;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'llm-remove-image-btn';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Remove image';
    removeBtn.addEventListener('click', () => {
        removeImageFromPreview(state, visionSection, imageData, previewItem);
    });
    
    previewItem.appendChild(img);
    previewItem.appendChild(removeBtn);
    previewGrid.appendChild(previewItem);
    
    // Update UI
    updateImageUI(state, visionSection);
}

/**
 * Remove image from preview grid
 * @param {Object} state - Tab state
 * @param {HTMLElement} visionSection - Vision section element
 * @param {Object} imageData - Image data to remove
 * @param {HTMLElement} previewItem - Preview item element
 */
export function removeImageFromPreview(state, visionSection, imageData, previewItem) {
    // Remove from state
    const index = state.images.indexOf(imageData);
    if (index > -1) {
        state.images.splice(index, 1);
    }
    
    // Revoke URL
    URL.revokeObjectURL(imageData.preview);
    
    // Remove from DOM
    previewItem.remove();
    
    // Update UI
    updateImageUI(state, visionSection);
}

/**
 * Clear all images
 * @param {Object} state - Tab state
 * @param {HTMLElement} visionSection - Vision section element
 */
export function clearAllImages(state, visionSection) {
    const previewGrid = visionSection.querySelector('.llm-image-preview-grid');
    
    // Revoke all URLs
    state.images.forEach(img => URL.revokeObjectURL(img.preview));
    
    // Clear state
    state.images = [];
    
    // Clear DOM
    if (previewGrid) {
        previewGrid.innerHTML = '';
    }
    
    // Update UI
    updateImageUI(state, visionSection);
}

/**
 * Update image UI elements
 * @param {Object} state - Tab state
 * @param {HTMLElement} visionSection - Vision section element
 */
export function updateImageUI(state, visionSection) {
    const previewGrid = visionSection.querySelector('.llm-image-preview-grid');
    const imageCount = visionSection.querySelector('.llm-image-count');
    const clearAllBtn = visionSection.querySelector('.llm-clear-all-images-btn');
    
    const count = state.images.length;
    
    if (imageCount) {
        imageCount.textContent = `${count} image${count !== 1 ? 's' : ''}`;
    }
    
    if (previewGrid) {
        previewGrid.style.display = count > 0 ? 'grid' : 'none';
    }
    
    if (clearAllBtn) {
        clearAllBtn.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

/**
 * Handle file upload
 * @param {Object} state - Tab state object
 * @param {HTMLElement} visionSection - Vision section element
 * @param {File[]} files - Files to upload
 * @returns {Promise<Object>} - Upload result { added: number, errors: Array }
 */
export async function handleFileUpload(state, visionSection, files) {
    const MAX_IMAGES = 10;
    const validFiles = [];
    const errors = [];
    
    // Validate each file
    for (const file of files) {
        const error = validateImageFile(file);
        if (error) {
            errors.push(error);
        } else {
            validFiles.push(file);
        }
    }
    
    // Check if adding these images would exceed the limit
    const currentCount = state.images.length;
    const totalCount = currentCount + validFiles.length;
    
    if (totalCount > MAX_IMAGES) {
        const remaining = MAX_IMAGES - currentCount;
        if (remaining <= 0) {
            errors.push({
                file: 'Upload limit',
                error: `Maximum ${MAX_IMAGES} images allowed. Please remove some images first.`
            });
            return { added: 0, errors };
        }
        
        // Trim to fit
        validFiles.splice(remaining);
        errors.push({
            file: 'Upload limit',
            error: `Can only add ${remaining} more image${remaining === 1 ? '' : 's'} (${MAX_IMAGES} max)`
        });
    }
    
    // Add each valid image to preview
    for (const file of validFiles) {
        await addImageToPreview(state, visionSection, file);
    }
    
    return { added: validFiles.length, errors };
}

/**
 * Toggle vision section visibility based on selected model
 * @param {Object} state - Tab state object
 * @param {HTMLElement} visionSection - Vision section element
 */
export function updateVisionSectionVisibility(state, visionSection) {
    if (!state.model) {
        visionSection.style.display = 'none';
        return;
    }
    
    const visionModels = state.visionModels[state.provider] || [];
    const isVisionModel = visionModels.includes(state.model);
    
    visionSection.style.display = isVisionModel ? 'block' : 'none';
}

/**
 * Setup vision section event handlers
 * @param {Object} state - Tab state object
 * @param {HTMLElement} visionSection - Vision section element
 */
export function setupVisionEventHandlers(state, visionSection) {
    const uploadZone = visionSection.querySelector('.llm-upload-zone');
    const fileInput = visionSection.querySelector('.llm-file-input');
    const clearAllBtn = visionSection.querySelector('.llm-clear-all-images-btn');
    
    // Click upload zone to trigger file input
    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    // File input change
    fileInput.addEventListener('change', async () => {
        const files = Array.from(fileInput.files);
        const result = await handleFileUpload(state, visionSection, files);
        
        // Show notifications for errors
        if (result.errors.length > 0) {
            const { showNotification } = await import('../../shared/crossTabMessaging.js');
            result.errors.forEach(err => {
                showNotification(`${err.file}: ${err.error}`, 'error');
            });
        }
        
        // Show success notification
        if (result.added > 0) {
            const { showNotification } = await import('../../shared/crossTabMessaging.js');
            const msg = result.added === 1 ? `Added 1 image` : `Added ${result.added} images`;
            showNotification(msg, 'success');
        }
        
        fileInput.value = ''; // Reset input
    });
    
    // Drag and drop handlers
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.add('drag-over');
    });
    
    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.remove('drag-over');
    });
    
    uploadZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        const result = await handleFileUpload(state, visionSection, files);
        
        // Show notifications for errors
        if (result.errors.length > 0) {
            const { showNotification } = await import('../../shared/crossTabMessaging.js');
            result.errors.forEach(err => {
                showNotification(`${err.file}: ${err.error}`, 'error');
            });
        }
        
        // Show success notification
        if (result.added > 0) {
            const { showNotification } = await import('../../shared/crossTabMessaging.js');
            const msg = result.added === 1 ? `Added 1 image` : `Added ${result.added} images`;
            showNotification(msg, 'success');
        }
    });
    
    // Clear all images button
    clearAllBtn.addEventListener('click', () => {
        clearAllImages(state, visionSection);
    });
}

/**
 * Setup clipboard paste handler for images
 * @param {Object} state - Tab state object
 * @param {HTMLElement} visionSection - Vision section element
 */
export function setupClipboardPasteHandler(state, visionSection) {
    document.addEventListener('paste', async (e) => {
        // Only handle paste when LLM tab is active and vision section is visible
        if (visionSection.style.display === 'none') return;
        
        const items = Array.from(e.clipboardData.items);
        const imageItems = items.filter(item => item.type.startsWith('image/'));
        
        if (imageItems.length > 0) {
            e.preventDefault();
            const files = await Promise.all(
                imageItems.map(item => {
                    return new Promise((resolve) => {
                        const blob = item.getAsFile();
                        resolve(blob);
                    });
                })
            );
            
            const validFiles = files.filter(Boolean);
            if (validFiles.length > 0) {
                const result = await handleFileUpload(state, visionSection, validFiles);
                
                // Show notifications
                if (result.errors.length > 0) {
                    const { showNotification } = await import('../../shared/crossTabMessaging.js');
                    result.errors.forEach(err => {
                        showNotification(`${err.file}: ${err.error}`, 'error');
                    });
                }
                
                if (result.added > 0) {
                    const { showNotification } = await import('../../shared/crossTabMessaging.js');
                    const msg = result.added === 1 ? `Pasted 1 image` : `Pasted ${result.added} images`;
                    showNotification(msg, 'success');
                }
            }
        }
    });
}

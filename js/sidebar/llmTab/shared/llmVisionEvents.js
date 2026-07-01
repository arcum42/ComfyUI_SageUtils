/**
 * LLM Vision/Image Event Handlers
 * 
 * Handles image upload zone (click/drag-and-drop), file input change,
 * clipboard paste handler for images, and clear-all-images button.
 * All dependencies are passed in as parameters so this file has NO internal imports.
 */

/**
 * Handle upload zone click - trigger hidden file input dialog
 * @param {HTMLElement} uploadZone - Upload zone element  
 * @param {HTMLInputElement} fileInput - Hidden file input element
 */
export function handleUploadZoneClick(uploadZone, fileInput) {
    if (fileInput) {
        fileInput.click();
    }
}

/**
 * Handle file input change event - read selected files and upload them
 * @param {Object} state - Tab state object  
 * @param {HTMLElement} visionSection - Vision section element
 * @param {HTMLInputElement} fileInput - File input element (for reset)
 * @param {Function} handleFileUpload - Function to process uploaded images
 */
export async function handleFileInputChange(state, visionSection, fileInput, handleFileUpload) {
    const files = Array.from(fileInput.files);
    
    if (files.length > 0 && handleFileUpload) {
        await handleFileUpload(state, visionSection, files);
    }
    
    // Reset input so same file can be selected again  
    fileInput.value = '';
}

/**
 * Handle dragover event on upload zone - highlight for drop target
 * @param {Event} e - Drag over event
 * @param {HTMLElement} uploadZone - Upload zone element (to add CSS class)
 */
export function handleDragOver(e, uploadZone) {
    if (!uploadZone) return;
    
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.add('drag-over');
}

/**
 * Handle dragleave event on upload zone - remove highlight  
 * @param {Event} e - Drag leave event
 * @param {HTMLElement} uploadZone - Upload zone element (to remove CSS class)
 */
export function handleDragLeave(e, uploadZone) {
    if (!uploadZone) return;
    
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.remove('drag-over');
}

/**
 * Handle drop event on upload zone - process dropped files as images
 * @param {Object} state - Tab state object  
 * @param {HTMLElement} visionSection - Vision section element
 * @param {HTMLElement} uploadZone - Upload zone element (to remove CSS class)
 * @param {Event} e - Drop event  
 * @param {Function} handleFileUpload - Function to process uploaded images
 */
export async function handleDrop(state, visionSection, uploadZone, e, handleFileUpload) {
    if (!uploadZone || !handleFileUpload) return;
    
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files);
    
    if (files.length > 0) {
        await handleFileUpload(state, visionSection, files);
    }
}

/**
 * Create and return a paste handler function that processes clipboard images.
 * This allows the main file to attach it via addEventListener without exposing visionSection/state to global scope.
 * @param {Object} state - Tab state object  
 * @param {HTMLElement} visionSection - Vision section element
 * @param {Function} handleFileUpload - Function to process uploaded images
 * @returns {Function|null} The paste event listener function (or null if visionSection is hidden)
 */
export function createPasteHandler(state, visionSection, handleFileUpload) {

    // Return a closure that captures state/visionSection/handleFileUpload
    return async function(pasteEvent) {

        // Only handle paste when LLM tab is active and vision section is visible
        if (!visionSection || visionSection.classList.contains('llm-hidden')) return;
        
        const items = Array.from(pasteEvent.clipboardData.items);
        const imageItems = items.filter(item => item.type.startsWith('image/'));
        
        if (imageItems.length > 0 && handleFileUpload) {
            pasteEvent.preventDefault();
            try {
                // Convert each ImageBitmapSource from clipboard into a Blob/File for upload
                const files = await Promise.all(
                    imageItems.map(async (item) => {
                        let blob;
                        if (typeof item.getAsFileSystemHandle === 'function') {
                            try {
                                const handle = await item.getAsFileSystemHandle();
                                if (handle.kind === 'file') {
                                    blob = await handle.getFile();
                                } else {
                                    return null; // Skip directories/non-files
                                }
                            } catch {
                                return null;
                            }
                        } else {
                            blob = item.getAsFile();
                        }
                        
                        return new Promise((resolve) => {
                            resolve(blob);
                        });
                    })
                );
                
                // Upload valid blobs (filter out nulls)
                await handleFileUpload(state, visionSection, files.filter(Boolean));
            } catch (error) {
                console.error('[LLM Vision Events] Error handling paste:', error);
            }
        }
    };
}

/**
 * Handle clear-all-images button click - remove all image previews from vision section
 * @param {Object} state - Tab state object
 * @param {HTMLElement} visionSection - Vision section element (to find/remove image elements)
 */
export function handleClearAllImagesClick(state, visionSection) {
    if (!visionSection || !state) return;

    const previewGrid = visionSection.querySelector('.llm-image-preview-grid');
    const previewItems = visionSection.querySelectorAll('.llm-image-preview-item');
    let removedCount = 0;

    for (const item of previewItems) {
        const img = item.querySelector('img.llm-preview-image');
        if (img && img.src?.startsWith('blob:')) {
            URL.revokeObjectURL(img.src);
        }
        item.remove();
        removedCount++;
    }

    if (state.images && Array.isArray(state.images)) {
        state.images.forEach((imageData) => {
            try {
                if (imageData.preview?.startsWith('blob:')) {
                    URL.revokeObjectURL(imageData.preview);
                }
            } catch {
                /* ignore */
            }
        });
        state.images = [];
    }

    if (previewGrid) {
        previewGrid.innerHTML = '';
    }

    const imageCount = visionSection.querySelector('.llm-image-count');
    if (imageCount) {
        imageCount.textContent = '0 images';
    }

    if (removedCount > 0) {
        console.debug(`[LLM Vision Events] Cleared ${removedCount} image(s)`);
    }
}

console.log('[SageUtils] llmVisionEvents.js loaded');

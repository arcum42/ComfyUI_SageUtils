/**
 * Dataset Text Management Module
 * Handles creation, editing, and batch operations for dataset text files
 * associated with images in the gallery.
 */

import { createDatasetNavigationControls } from '../components/navigationComponents.js';

import { selectors } from "./stateManager.js";

/**
 * Show the combined image and text editor modal
 * @param {Object} image - The image object with path and metadata
 */
export async function showCombinedImageTextEditor(image) {
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
    const { textContent, isNew } = await loadDatasetText();
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    // Create main container
    const container = document.createElement('div');
    container.style.cssText = `
        background: #2d2d2d;
        border-radius: 8px;
        width: 95%;
        max-width: 1400px;
        height: 90%;
        max-height: 900px;
        display: flex;
        flex-direction: column;
        border: 1px solid #555;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;
    
    // Header with title and navigation
    const header = document.createElement('div');
    header.style.cssText = `
        background: #3a3a3a;
        padding: 15px 20px;
        border-radius: 8px 8px 0 0;
        border-bottom: 1px solid #555;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    
    const title = document.createElement('h3');
    title.textContent = `${isNew ? 'Create' : 'Edit'} Dataset Text for ${imageName}`;
    title.style.cssText = `
        color: #fff;
        margin: 0;
        font-size: 16px;
    `;
    
    const navControls = document.createElement('div');
    navControls.style.cssText = `
        display: flex;
        gap: 10px;
        align-items: center;
    `;
    
    // Create navigation controls using shared component
    const navButtons = createDatasetNavigationControls();
    const { firstButton, prevButton, nextButton, lastButton, counterElement: imageCounter } = navButtons;
    
    // Close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '✕';
    closeButton.style.cssText = `
        background: #f44336;
        color: white;
        border: none;
        padding: 6px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        margin-left: 10px;
    `;
    
    // Add navigation buttons to container
    navControls.appendChild(firstButton);
    navControls.appendChild(prevButton);
    navControls.appendChild(imageCounter);
    navControls.appendChild(nextButton);
    navControls.appendChild(lastButton);
    navControls.appendChild(closeButton);
    
    header.appendChild(title);
    header.appendChild(navControls);
    
    // Content area with split layout
    const contentArea = document.createElement('div');
    contentArea.style.cssText = `
        flex: 1;
        display: flex;
        height: calc(100% - 60px);
    `;
    
    // Image panel (left side)
    const imagePanel = document.createElement('div');
    imagePanel.style.cssText = `
        flex: 1;
        min-width: 400px;
        padding: 20px;
        border-right: 1px solid #555;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #333;
        overflow: hidden;
    `;
    
    // Image display
    const imageDisplay = document.createElement('img');
    imageDisplay.style.cssText = `
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        background: #222;
    `;
    imageDisplay.alt = 'Dataset image';
    
    // Add debug handlers
    imageDisplay.onload = () => {
        console.log('Image element loaded successfully');
        imageDisplay.style.display = 'block';
    };
    
    imageDisplay.onerror = (e) => {
        console.error('Image element failed to load:', e);
        console.error('Failed URL:', imageDisplay.src);
        imageDisplay.style.display = 'none';
    };
    
    // Load image
    const loadCurrentImage = async () => {
        try {
            console.log('Loading image:', currentImage.path);
            
            // Use the correct POST method for thumbnail endpoint
            let imageUrl = null;
            
            console.log('Trying large thumbnail with POST method');
            
            try {
                const response = await fetch('/sage_utils/thumbnail', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        image_path: currentImage.path,
                        size: 'large'
                    })
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    imageUrl = URL.createObjectURL(blob);
                    console.log('Large thumbnail loaded successfully with POST');
                } else {
                    console.error('POST thumbnail failed:', response.status, response.statusText);
                }
            } catch (error) {
                console.error('POST thumbnail approach failed:', error);
            }
            
            if (imageUrl) {
                // Clean up previous blob URL to prevent memory leaks
                if (imageDisplay.dataset.previousUrl && imageDisplay.dataset.previousUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(imageDisplay.dataset.previousUrl);
                }
                
                imageDisplay.src = imageUrl;
                imageDisplay.style.display = 'block'; // Ensure image is visible
                imageDisplay.dataset.previousUrl = imageUrl;
                console.log('Image set successfully with URL:', imageUrl);
            } else {
                console.error('All image loading methods failed');
                imageDisplay.src = ''; // Clear broken image
                imageDisplay.style.display = 'none';
            }
        } catch (error) {
            console.error('Error loading image:', error);
            imageDisplay.src = ''; // Clear broken image
            imageDisplay.style.display = 'none';
        }
    };
    
    imagePanel.appendChild(imageDisplay);
    
    // Text panel (right side)
    const textPanel = document.createElement('div');
    textPanel.style.cssText = `
        flex: 1;
        padding: 20px;
        display: flex;
        flex-direction: column;
        background: #2a2a2a;
    `;
    
    // Text area container with save button positioned at bottom right
    const textAreaContainer = document.createElement('div');
    textAreaContainer.style.cssText = `
        position: relative;
        flex: 1;
        margin-bottom: 15px;
    `;
    
    // Text area
    const textArea = document.createElement('textarea');
    textArea.className = 'dataset-text-area';
    textArea.value = textContent;
    textArea.style.cssText = `
        width: 100%;
        height: 100%;
        background: #333;
        color: #fff;
        border: 1px solid #555;
        border-radius: 4px;
        padding: 15px;
        padding-bottom: 50px;
        font-family: monospace;
        font-size: 13px;
        resize: none;
        outline: none;
        box-sizing: border-box;
    `;
    
    // Save button positioned at bottom right of text area
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.style.cssText = `
        position: absolute;
        bottom: 10px;
        right: 10px;
        background: #4CAF50;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        z-index: 1;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    `;
    
    textAreaContainer.appendChild(textArea);
    textAreaContainer.appendChild(saveButton);
    
    // Batch operations panel (always visible)
    const batchOpsPanel = document.createElement('div');
    batchOpsPanel.style.cssText = `
        display: block;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 10px;
        background: #3a3a3a;
        padding: 10px;
        border-radius: 4px;
        border: 1px solid #555;
    `;
    
    const batchOpsTitle = document.createElement('h4');
    batchOpsTitle.textContent = 'Batch Operations';
    batchOpsTitle.style.cssText = `
        color: #fff;
        margin: 0 0 10px 0;
        font-size: 14px;
    `;
    
    const batchButtonsRow = document.createElement('div');
    batchButtonsRow.style.cssText = `
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    `;
    
    // Batch create missing files button
    const batchCreateBtn = document.createElement('button');
    batchCreateBtn.textContent = 'Create Missing Text';
    batchCreateBtn.style.cssText = `
        background: #4CAF50;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        width: 100%;
        margin-bottom: 10px;
    `;
    
    batchCreateBtn.addEventListener('click', async () => {
        await batchCreateMissingTextFiles();
        // Reload current image's text content in case it was created
        const { textContent: newTextContent } = await loadDatasetText();
        textArea.value = newTextContent;
    });
    
    // Batch append controls
    const batchAppendGroup = document.createElement('div');
    batchAppendGroup.style.cssText = `
        display: flex;
        gap: 5px;
        align-items: center;
    `;
    
    const appendTextInput = document.createElement('input');
    appendTextInput.type = 'text';
    appendTextInput.placeholder = 'Text to append...';
    appendTextInput.style.cssText = `
        background: #555;
        color: white;
        border: 1px solid #666;
        padding: 4px 8px;
        border-radius: 3px;
        font-size: 11px;
        width: 120px;
    `;
    
    const appendAtStart = document.createElement('button');
    appendAtStart.textContent = 'Prepend All';
    appendAtStart.style.cssText = `
        background: #2196F3;
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 10px;
    `;
    
    const appendAtEnd = document.createElement('button');
    appendAtEnd.textContent = 'Append All';
    appendAtEnd.style.cssText = `
        background: #2196F3;
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 10px;
    `;
    
    appendAtStart.addEventListener('click', async () => {
        const text = appendTextInput.value.trim();
        if (text) {
            await batchAppendToAllTextFiles(text, true); // true = add to beginning
            // Reload current image's text content to show changes
            const { textContent: newTextContent } = await loadDatasetText();
            textArea.value = newTextContent;
        } else {
            alert('Please enter text to prepend.');
        }
    });
    
    appendAtEnd.addEventListener('click', async () => {
        const text = appendTextInput.value.trim();
        if (text) {
            await batchAppendToAllTextFiles(text, false); // false = add to end
            // Reload current image's text content to show changes
            const { textContent: newTextContent } = await loadDatasetText();
            textArea.value = newTextContent;
        } else {
            alert('Please enter text to append.');
        }
    });
    
    batchAppendGroup.appendChild(appendTextInput);
    batchAppendGroup.appendChild(appendAtStart);
    batchAppendGroup.appendChild(appendAtEnd);
    
    // Batch find/replace controls
    const batchReplaceGroup = document.createElement('div');
    batchReplaceGroup.style.cssText = `
        display: flex;
        gap: 5px;
        align-items: center;
        margin-top: 8px;
    `;
    
    const findTextInput = document.createElement('input');
    findTextInput.type = 'text';
    findTextInput.placeholder = 'Find...';
    findTextInput.style.cssText = `
        background: #555;
        color: white;
        border: 1px solid #666;
        padding: 4px 8px;
        border-radius: 3px;
        font-size: 11px;
        width: 100px;
    `;
    
    const replaceTextInput = document.createElement('input');
    replaceTextInput.type = 'text';
    replaceTextInput.placeholder = 'Replace...';
    replaceTextInput.style.cssText = `
        background: #555;
        color: white;
        border: 1px solid #666;
        padding: 4px 8px;
        border-radius: 3px;
        font-size: 11px;
        width: 100px;
    `;
    
    const replaceAllBtn = document.createElement('button');
    replaceAllBtn.textContent = 'Replace All';
    replaceAllBtn.style.cssText = `
        background: #FF9800;
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 10px;
    `;
    
    replaceAllBtn.addEventListener('click', async () => {
        const findText = findTextInput.value;
        const replaceText = replaceTextInput.value;
        if (findText) {
            await batchFindReplaceAllTextFiles(findText, replaceText);
            // Reload current image's text content to show changes
            const { textContent: newTextContent } = await loadDatasetText();
            textArea.value = newTextContent;
        } else {
            alert('Please enter text to find.');
        }
    });
    
    batchReplaceGroup.appendChild(findTextInput);
    batchReplaceGroup.appendChild(replaceTextInput);
    batchReplaceGroup.appendChild(replaceAllBtn);
    
    batchButtonsRow.appendChild(batchAppendGroup);
    
    batchOpsPanel.appendChild(batchOpsTitle);
    batchOpsPanel.appendChild(batchCreateBtn);
    batchOpsPanel.appendChild(batchButtonsRow);
    batchOpsPanel.appendChild(batchReplaceGroup);
    
    // Function to update content for current image
    const updateForCurrentImage = async () => {
        currentImage = allImages[currentImageIndex];
        const imageNameUpdate = currentImage.name || currentImage.path.split('/').pop() || 'Unknown Image';
        title.textContent = `${isNew ? 'Create' : 'Edit'} Dataset Text for ${imageNameUpdate}`;
        
        // Update navigation button states using shared component
        navButtons.updateButtonStates(currentImageIndex, allImages.length);
        
        // Load new image
        await loadCurrentImage();
        
        // Load text content for new image
        const { textContent: newTextContent } = await loadDatasetText();
        textArea.value = newTextContent;
    };
    
    // Navigation event handlers
    firstButton.addEventListener('click', async () => {
        if (currentImageIndex > 0) {
            currentImageIndex = 0;
            await updateForCurrentImage();
        }
    });
    
    prevButton.addEventListener('click', async () => {
        if (currentImageIndex > 0) {
            currentImageIndex--;
            await updateForCurrentImage();
        }
    });
    
    nextButton.addEventListener('click', async () => {
        if (currentImageIndex < allImages.length - 1) {
            currentImageIndex++;
            await updateForCurrentImage();
        }
    });
    
    lastButton.addEventListener('click', async () => {
        if (currentImageIndex < allImages.length - 1) {
            currentImageIndex = allImages.length - 1;
            await updateForCurrentImage();
        }
    });
    
    // Save functionality
    saveButton.addEventListener('click', async () => {
        try {
            const response = await fetch('/sage_utils/save_dataset_text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    image_path: currentImage.path, 
                    content: textArea.value 
                })
            });
            
            const result = await response.json();
            if (result.success) {
                // Show temporary success message next to save button
                const successMsg = document.createElement('div');
                successMsg.textContent = 'Saved!';
                successMsg.style.cssText = `
                    position: absolute;
                    bottom: 10px;
                    right: 90px;
                    background: #4CAF50;
                    color: white;
                    padding: 6px 10px;
                    border-radius: 4px;
                    font-size: 12px;
                    z-index: 2;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                `;
                textAreaContainer.appendChild(successMsg);
                
                setTimeout(() => {
                    if (successMsg.parentNode) {
                        successMsg.parentNode.removeChild(successMsg);
                    }
                }, 2000);
                
            } else {
                alert(`Error saving: ${result.error}`);
            }
        } catch (error) {
            console.error('Error saving dataset text:', error);
            alert(`Error saving: ${error.message}`);
        }
    });
    
    // Close functionality
    const closeModal = () => {
        // Clean up blob URL to prevent memory leaks
        if (imageDisplay.dataset.previousUrl) {
            URL.revokeObjectURL(imageDisplay.dataset.previousUrl);
        }
        document.body.removeChild(overlay);
    };
    
    closeButton.addEventListener('click', closeModal);
    
    textPanel.appendChild(textAreaContainer);
    textPanel.appendChild(batchOpsPanel);
    
    contentArea.appendChild(imagePanel);
    contentArea.appendChild(textPanel);
    
    container.appendChild(header);
    container.appendChild(contentArea);
    overlay.appendChild(container);
    document.body.appendChild(overlay);
    
    // Load initial image
    await loadCurrentImage();
    
    // Initialize button states
    navButtons.updateButtonStates(currentImageIndex, allImages.length);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal();
        }
    });
    
    // Close on Escape key
    const handleKeydown = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleKeydown);
        } else if (e.key === 'Home' && !firstButton.disabled) {
            firstButton.click();
        } else if (e.key === 'ArrowLeft' && !prevButton.disabled) {
            prevButton.click();
        } else if (e.key === 'ArrowRight' && !nextButton.disabled) {
            nextButton.click();
        } else if (e.key === 'End' && !lastButton.disabled) {
            lastButton.click();
        }
    };
    document.addEventListener('keydown', handleKeydown);
    
    // Focus text area
    textArea.focus();
    
    // Prevent clicks from closing modal
    container.addEventListener('click', (e) => e.stopPropagation());
}

/**
 * Edit an existing dataset text file
 * @param {Object} image - The image object with path and metadata
 */
export async function editDatasetText(image) {
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

/**
 * Create a new dataset text file
 * @param {Object} image - The image object with path and metadata
 */
export async function createDatasetText(image) {
    try {
        // Show create dialog with empty content
        showDatasetTextEditor(image, '', true);
        
    } catch (error) {
        console.error('Error creating dataset text:', error);
        alert(`Error creating dataset text: ${error.message}`);
    }
}

/**
 * Show the dataset text editor modal
 * @param {Object} image - The image object
 * @param {string} content - The text content
 * @param {boolean} isNew - Whether this is a new file
 */
export function showDatasetTextEditor(image, content, isNew) {
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
        outline: none;
        box-sizing: border-box;
    `;
    
    // Button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        gap: 10px;
        margin-top: 15px;
        justify-content: flex-end;
    `;
    
    // Save button
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.style.cssText = `
        background: #4CAF50;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
    `;
    
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
                // Close modal
                document.body.removeChild(overlay);
                // Refresh current text display if this is the current image
                if (window.galleryTextManager && window.galleryTextManager.refreshCurrentTextDisplay) {
                    window.galleryTextManager.refreshCurrentTextDisplay();
                }
            } else {
                alert(`Error saving: ${result.error}`);
            }
        } catch (error) {
            console.error('Error saving dataset text:', error);
            alert(`Error saving: ${error.message}`);
        }
    });
    
    // Cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.cssText = `
        background: #666;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
    `;
    
    cancelButton.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
    
    // Assemble modal
    buttonContainer.appendChild(saveButton);
    buttonContainer.appendChild(cancelButton);
    modal.appendChild(title);
    modal.appendChild(textarea);
    modal.appendChild(buttonContainer);
    overlay.appendChild(modal);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });
    
    // Close on Escape key
    const handleKeydown = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleKeydown);
        }
    };
    document.addEventListener('keydown', handleKeydown);
    
    document.body.appendChild(overlay);
    
    // Focus textarea
    textarea.focus();
    
    // Prevent clicks from closing modal
    modal.addEventListener('click', (e) => e.stopPropagation());
}

/**
 * Refresh the current text display for the selected image
 */
export async function refreshCurrentTextDisplay() {
    try {
        const currentImage = selectors.selectedImage();
        if (!currentImage) return;
        
        const readResponse = await fetch('/sage_utils/read_dataset_text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_path: currentImage.path })
        });
        
        const readResult = await readResponse.json();
        if (readResult.success) {
            // Find text area and update it
            const textArea = document.querySelector('.dataset-text-area');
            if (textArea) {
                textArea.value = readResult.content;
            }
        }
    } catch (error) {
        console.error('Error refreshing current text display:', error);
    }
}

/**
 * Batch create missing text files for all images in current folder
 */
export async function batchCreateMissingTextFiles() {
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
        
        let message = `Batch create complete!\nCreated: ${created} text files`;
        if (errors.length > 0) {
            message += `\nErrors: ${errors.length}`;
            if (errors.length <= 10) {
                message += `\n${errors.join('\n')}`;
            } else {
                message += `\nFirst 10 errors:\n${errors.slice(0, 10).join('\n')}\n... and ${errors.length - 10} more`;
            }
        }
        
        alert(message);
        
    } catch (error) {
        console.error('Error in batch create:', error);
        alert(`Error in batch create: ${error.message}`);
    }
}

/**
 * Batch append text to all text files in current folder
 * @param {string} textToAdd - Text to append to each file
 * @param {boolean} addToBeginning - Whether to add to beginning instead of end
 */
export async function batchAppendToAllTextFiles(textToAdd, addToBeginning = false) {
    try {
        const allImages = selectors.galleryImages();
        if (!allImages || allImages.length === 0) {
            alert('No images found in current folder.');
            return;
        }
        
        if (!textToAdd || textToAdd.trim() === '') {
            alert('No text provided to append.');
            return;
        }
        
        let updated = 0;
        let created = 0;
        let errors = [];
        
        for (const image of allImages) {
            try {
                // First check if text file exists
                const checkResponse = await fetch('/sage_utils/check_dataset_text', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image_path: image.path })
                });
                
                const checkResult = await checkResponse.json();
                let currentContent = '';
                let fileExists = checkResult.exists;
                
                if (fileExists) {
                    // Read existing content
                    const readResponse = await fetch('/sage_utils/read_dataset_text', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ image_path: image.path })
                    });
                    
                    const readResult = await readResponse.json();
                    if (readResult.success) {
                        currentContent = readResult.content;
                    }
                }
                
                // Prepare new content (without adding line breaks)
                let newContent;
                if (addToBeginning) {
                    newContent = currentContent.trim() === '' ? textToAdd : `${textToAdd}${currentContent}`;
                } else {
                    newContent = currentContent.trim() === '' ? textToAdd : `${currentContent}${textToAdd}`;
                }
                
                // Save updated content
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
                    if (fileExists) {
                        updated++;
                    } else {
                        created++;
                    }
                } else {
                    errors.push(`${image.filename}: ${saveResult.error}`);
                }
            } catch (error) {
                errors.push(`${image.filename}: ${error.message}`);
            }
        }
        
        let message = `Batch append complete!\nUpdated: ${updated} files\nCreated: ${created} files`;
        if (errors.length > 0) {
            message += `\nErrors: ${errors.length}`;
            if (errors.length <= 10) {
                message += `\n${errors.join('\n')}`;
            } else {
                message += `\nFirst 10 errors:\n${errors.slice(0, 10).join('\n')}\n... and ${errors.length - 10} more`;
            }
        }
        
        alert(message);
        
    } catch (error) {
        console.error('Error in batch append:', error);
        alert(`Error in batch append: ${error.message}`);
    }
}

/**
 * Batch find and replace text in all text files in current folder
 * @param {string} findText - Text to find
 * @param {string} replaceText - Text to replace with
 */
export async function batchFindReplaceAllTextFiles(findText, replaceText) {
    try {
        const allImages = selectors.galleryImages();
        if (!allImages || allImages.length === 0) {
            alert('No images found in current folder.');
            return;
        }
        
        if (!findText || findText.trim() === '') {
            alert('No search text provided.');
            return;
        }
        
        let processed = 0;
        let updated = 0;
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
                    // Read existing content
                    const readResponse = await fetch('/sage_utils/read_dataset_text', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ image_path: image.path })
                    });
                    
                    const readResult = await readResponse.json();
                    if (readResult.success) {
                        const originalContent = readResult.content;
                        const newContent = originalContent.replaceAll(findText, replaceText);
                        
                        // Only save if content actually changed
                        if (newContent !== originalContent) {
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
                        processed++;
                    } else {
                        errors.push(`${image.filename}: Failed to read file - ${readResult.error}`);
                    }
                }
            } catch (error) {
                errors.push(`${image.filename}: ${error.message}`);
            }
        }
        
        let message = `Batch find/replace complete!\nProcessed: ${processed} files\nUpdated: ${updated} files`;
        if (errors.length > 0) {
            message += `\nErrors: ${errors.length}`;
            if (errors.length <= 10) {
                message += `\n${errors.join('\n')}`;
            } else {
                message += `\nFirst 10 errors:\n${errors.slice(0, 10).join('\n')}\n... and ${errors.length - 10} more`;
            }
        }
        
        alert(message);
        
    } catch (error) {
        console.error('Error in batch find/replace:', error);
        alert(`Error in batch find/replace: ${error.message}`);
    }
}

/**
 * Main handler for dataset text operations
 * @param {Object} image - The image object
 */
export async function handleDatasetText(image) {
    showCombinedImageTextEditor(image);
}

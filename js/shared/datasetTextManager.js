/**
 * Dataset Text Management Module
 * Handles creation, editing, and batch operations for dataset text files
 * associated with images in the gallery.
 */

import { createDatasetNavigationControls } from '../components/navigation.js';
import { createDatasetProgressDialog } from '../components/progressBar.js';
import { createDialog } from '../components/dialogManager.js';
import { createButton, BUTTON_VARIANTS } from '../components/buttons.js';
import { createTextarea } from '../components/formElements.js';
import { createSplitPane } from '../components/layout.js';
import { selectors } from "./stateManager.js";
import { loadThumbnail, loadFullImage, cleanupImageUrl } from "./imageLoader.js";
import { notifications } from './notifications.js';
import * as datasetTextApi from './api/datasetTextApi.js';
import { urlToBase64 } from '../llm/llmApi.js';
import { createLLMGenerationPanel } from './datasetTextGeneration.js';
import { processImagesInCurrentFolder } from './datasetTextOps.js';
import { createBatchOpsPanel } from './datasetTextBatchOps.js';

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
            const { exists } = await datasetTextApi.check(currentImage.path);
            if (exists) {
                const { content } = await datasetTextApi.read(currentImage.path);
                textContent = content;
                isNew = false;
            }
        } catch (error) {
            console.error('Error loading dataset text:', error);
        }
        
        return { textContent, isNew };
    };

    // Initial load
    const { textContent, isNew } = await loadDatasetText();
    
    // Root content for dialog
    const contentRoot = document.createElement('div');
    contentRoot.style.cssText = `
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
    `;
    
    // Header with title and navigation
    const header = document.createElement('div');
    header.style.cssText = `
        background: #3a3a3a;
        padding: 15px 20px;
        border-radius: 8px 8px 0 0;
        border-bottom: 1px solid #555;
        display: flex;
        flex-direction: column;
        gap: 8px;
    `;
    
    // Folder path display
    const folderPath = image.path.substring(0, image.path.lastIndexOf('/'));
    const folderDisplay = document.createElement('div');
    folderDisplay.style.cssText = `
        color: #aaa;
        font-size: 12px;
        font-family: monospace;
        display: flex;
        align-items: center;
        gap: 6px;
    `;
    
    const folderIcon = document.createElement('span');
    folderIcon.textContent = '📁';
    folderIcon.style.fontSize = '14px';
    
    const folderPathText = document.createElement('span');
    folderPathText.textContent = folderPath;
    folderPathText.style.cssText = `
        color: #888;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    `;
    
    folderDisplay.appendChild(folderIcon);
    folderDisplay.appendChild(folderPathText);
    
    // Title and navigation row
    const titleNavRow = document.createElement('div');
    titleNavRow.style.cssText = `
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
    
        // Close button (ASCII-only per repo guidelines)
        const closeButton = createButton('Close', {
      variant: BUTTON_VARIANTS.DANGER,
      size: 'medium',
      style: { marginLeft: '10px', marginTop: '0' }
    });
    
    // Add navigation buttons to container
    navControls.appendChild(firstButton);
    navControls.appendChild(prevButton);
    navControls.appendChild(imageCounter);
    navControls.appendChild(nextButton);
    navControls.appendChild(lastButton);
    navControls.appendChild(closeButton);
    
    titleNavRow.appendChild(title);
    titleNavRow.appendChild(navControls);
    
    header.appendChild(folderDisplay);
    header.appendChild(titleNavRow);
    
    // Content area with split layout (using shared layout component)
    // Replaces manual flex container with a standardized split pane
    // Maintain approximately 50/50 split and a minimum 400px left width as before
    
    // Image panel (left side)
    const imagePanel = document.createElement('div');
    imagePanel.style.cssText = `
        flex: 1;
        min-width: 400px;
        height: 100%;
        padding: 20px;
        border-right: 1px solid #555;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #333;
        overflow: hidden;
        box-sizing: border-box;
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
    
    // Load image using centralized loader
    const loadCurrentImage = async () => {
        try {
            console.log('Loading image:', currentImage.path);
            
            try {
                // Load full-size image for better clarity in the editor dialog
                // Falls back to thumbnail loader on error
                let imageUrl;
                try {
                    imageUrl = await loadFullImage(currentImage);
                } catch (e) {
                    console.warn('Full image load failed, falling back to large thumbnail:', e);
                    imageUrl = await loadThumbnail(currentImage, 'large');
                }
                
                // Clean up previous blob URL to prevent memory leaks
                if (imageDisplay.dataset.previousUrl) {
                    cleanupImageUrl(imageDisplay.dataset.previousUrl);
                }
                
                imageDisplay.src = imageUrl;
                imageDisplay.style.display = 'block'; // Ensure image is visible
                imageDisplay.dataset.previousUrl = imageUrl;
                console.log('Image set successfully with URL:', imageUrl);
            } catch (error) {
                console.error('Image loading failed:', error);
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
        min-width: 0; /* allow shrinking to prevent overflow */
        height: 100%;
        padding: 20px;
        display: flex;
        flex-direction: column;
        background: #2a2a2a;
        box-sizing: border-box;
        overflow: auto;
    `;
    
    // Text area container with save button positioned at bottom right
    const textAreaContainer = document.createElement('div');
    textAreaContainer.style.cssText = `
        position: relative;
        flex: 1;
        margin-bottom: 15px;
    `;
    
    // Text area
    const textArea = createTextarea({
      className: 'dataset-text-area',
      value: textContent,
      style: {
        width: '100%',
        height: '100%',
        paddingBottom: '50px',
        fontSize: '13px',
        resize: 'none'
      }
    });
    
    // Save button positioned at bottom right of text area
    const saveButton = createButton('Save', {
      variant: BUTTON_VARIANTS.SUCCESS,
      size: 'medium',
      style: {
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        zIndex: '1',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        marginTop: '0'
      }
    });
    
    textAreaContainer.appendChild(textArea);
    textAreaContainer.appendChild(saveButton);
    
    // LLM Generation Panel (extracted component)
        const llmPanel = createLLMGenerationPanel({
            batchCount: allImages.length,
      onGenerateCurrent: async (presetId, isAppend) => {
        await generateDescriptionForImage(currentImage, presetId, isAppend, textArea);
      },
      onGenerateAll: async (presetId, isAppend) => {
        await batchGenerateDescriptions(allImages, presetId, isAppend, async () => {
          const { textContent: newTextContent } = await loadDatasetText();
          textArea.value = newTextContent;
        });
      }
    });
    
        // Batch operations panel (extracted component)
                const batchOpsPanel = createBatchOpsPanel({
                    onCreateMissing: async ({ scope } = { scope: 'folder' }) => {
                        if (scope === 'current') {
                            // Single image: create if missing
                            const { exists } = await datasetTextApi.check(currentImage.path);
                            if (!exists) {
                                await datasetTextApi.save(currentImage.path, '');
                                notifications.info('Created text file for current image.', 4000);
                            } else {
                                notifications.info('Text file already exists for current image.', 4000);
                            }
                        } else {
                            await batchCreateMissingTextFiles();
                        }
                const { textContent: newTextContent } = await loadDatasetText();
                textArea.value = newTextContent;
            },
                    onAppendStart: async (text, opts) => {
                        const scope = opts && opts.scope ? opts.scope : 'folder';
                        if (scope === 'current') {
                            const { exists } = await datasetTextApi.check(currentImage.path);
                            let currentContent = '';
                            if (exists) {
                                const { content } = await datasetTextApi.read(currentImage.path);
                                currentContent = content;
                            }
                            const newContent = currentContent.trim() === '' ? text : `${text}${currentContent}`;
                            await datasetTextApi.save(currentImage.path, newContent);
                            const { textContent: newTextContent } = await loadDatasetText();
                            textArea.value = newTextContent;
                        } else {
                            await batchAppendToAllTextFiles(text, true);
                            const { textContent: newTextContent } = await loadDatasetText();
                            textArea.value = newTextContent;
                        }
            },
                    onAppendEnd: async (text, opts) => {
                        const scope = opts && opts.scope ? opts.scope : 'folder';
                        if (scope === 'current') {
                            const { exists } = await datasetTextApi.check(currentImage.path);
                            let currentContent = '';
                            if (exists) {
                                const { content } = await datasetTextApi.read(currentImage.path);
                                currentContent = content;
                            }
                            const newContent = currentContent.trim() === '' ? text : `${currentContent}${text}`;
                            await datasetTextApi.save(currentImage.path, newContent);
                            const { textContent: newTextContent } = await loadDatasetText();
                            textArea.value = newTextContent;
                        } else {
                            await batchAppendToAllTextFiles(text, false);
                            const { textContent: newTextContent } = await loadDatasetText();
                            textArea.value = newTextContent;
                        }
            },
                    onReplaceAll: async (findText, replaceText, options) => {
                        if (options && options.scope === 'current') {
                            const { exists } = await datasetTextApi.check(currentImage.path);
                            if (!exists) {
                                notifications.warning('Current image has no text file.');
                            } else {
                                const { content: originalContent } = await datasetTextApi.read(currentImage.path);
                                const { caseSensitive = true, wholeWord = false, useRegex = false } = options || {};
                                let newContent = originalContent;
                                if (useRegex) {
                                    try {
                                        const flags = 'g' + (caseSensitive ? '' : 'i');
                                        const regex = new RegExp(findText, flags);
                                        newContent = originalContent.replace(regex, replaceText);
                                    } catch (e) {
                                        notifications.error('Invalid regular expression');
                                        return;
                                    }
                                } else {
                                    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                    let pattern = escapeRegex(findText);
                                    if (wholeWord) pattern = `\\b${pattern}\\b`;
                                    const flags = 'g' + (caseSensitive ? '' : 'i');
                                    const regex = new RegExp(pattern, flags);
                                    newContent = originalContent.replace(regex, replaceText);
                                }
                                if (newContent !== originalContent) {
                                    await datasetTextApi.save(currentImage.path, newContent);
                                    notifications.info('Replaced text in current image.', 4000);
                                } else {
                                    notifications.info('No changes for current image.', 4000);
                                }
                            }
                        } else {
                            await batchFindReplaceAllTextFiles(findText, replaceText, options);
                        }
                const { textContent: newTextContent } = await loadDatasetText();
                textArea.value = newTextContent;
                },
                    onTrimAll: async (opts) => {
                        const scope = opts && opts.scope ? opts.scope : 'folder';
                        if (scope === 'current') {
                            const { exists } = await datasetTextApi.check(currentImage.path);
                            if (exists) {
                                const { content } = await datasetTextApi.read(currentImage.path);
                                const newContent = content.trim();
                                if (newContent !== content) {
                                    await datasetTextApi.save(currentImage.path, newContent);
                                    notifications.info('Trimmed whitespace for current image.', 4000);
                                } else {
                                    notifications.info('No changes for current image.', 4000);
                                }
                            } else {
                                notifications.warning('Current image has no text file.');
                            }
                        } else {
                            await batchTrimWhitespaceAllTextFiles();
                        }
                    const { textContent: newTextContent } = await loadDatasetText();
                    textArea.value = newTextContent;
                },
                    onDedupLinesAll: async (opts) => {
                        const scope = opts && opts.scope ? opts.scope : 'folder';
                        if (scope === 'current') {
                            const { exists } = await datasetTextApi.check(currentImage.path);
                            if (exists) {
                                const { content } = await datasetTextApi.read(currentImage.path);
                                const lines = content.split(/\r?\n/);
                                const seen = new Set();
                                const deduped = [];
                                for (const line of lines) {
                                    if (!seen.has(line)) { seen.add(line); deduped.push(line); }
                                }
                                const newContent = deduped.join('\n');
                                if (newContent !== content) {
                                    await datasetTextApi.save(currentImage.path, newContent);
                                    notifications.info('Deduplicated lines for current image.', 4000);
                                } else {
                                    notifications.info('No changes for current image.', 4000);
                                }
                            } else {
                                notifications.warning('Current image has no text file.');
                            }
                        } else {
                            await batchDedupLinesAllTextFiles();
                        }
                    const { textContent: newTextContent } = await loadDatasetText();
                    textArea.value = newTextContent;
            }
        });
    
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
            await datasetTextApi.save(currentImage.path, textArea.value);
            
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
            
        } catch (error) {
            console.error('Error saving dataset text:', error);
            notifications.error(`Error saving: ${error.message}`);
        }
    });
    
    // Close functionality
    const closeModal = () => {
        dialog.close();
    };
    closeButton.addEventListener('click', closeModal);
    
    textPanel.appendChild(textAreaContainer);
    textPanel.appendChild(llmPanel);
    textPanel.appendChild(batchOpsPanel);
    
    // Build split pane using shared component
    const splitPane = createSplitPane(imagePanel, textPanel, {
        splitRatio: '50-50',
        gap: '8px',
        minLeftWidth: '400px',
        minRightWidth: '300px',
        resizable: true
    });
    // Ensure the split pane fills available vertical space and doesn't overflow horizontally
    Object.assign(splitPane.style, {
        flex: '1',
        minHeight: '0',
        overflow: 'hidden',
        boxSizing: 'border-box'
    });

    contentRoot.appendChild(header);
    contentRoot.appendChild(splitPane);
    
    // Create and show dialog
    const dialog = createDialog({
        title: '',
        content: contentRoot,
        width: '95%',
        height: '90%',
        showFooter: false,
        closeOnOverlayClick: true,
        onClose: () => {
            if (imageDisplay.dataset.previousUrl) {
                cleanupImageUrl(imageDisplay.dataset.previousUrl);
            }
            document.removeEventListener('keydown', handleKeydown);
        }
    });
    dialog.show();
    
    // Load initial image
    await loadCurrentImage();
    
    // Initialize button states
    navButtons.updateButtonStates(currentImageIndex, allImages.length);
    
    // Keyboard navigation
    const handleKeydown = (e) => {
        if (e.key === 'Home' && !firstButton.disabled) {
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
    
    // Dialog overlay manages outside clicks; no extra handler needed
}

/**
 * Edit an existing dataset text file
 * @param {Object} image - The image object with path and metadata
 * @param {Object} callbacks - Callback functions for refresh operations
 */
export async function editDatasetText(image, callbacks = null) {
    try {
        // Read the existing text
        const { content } = await datasetTextApi.read(image.path);
        
        // Show edit dialog
        showDatasetTextEditor(image, content, false, callbacks);
        
    } catch (error) {
        console.error('Error editing dataset text:', error);
        notifications.error(`Failed to read text file: ${error.message}`);
    }
}

/**
 * Create a new dataset text file
 * @param {Object} image - The image object with path and metadata
 * @param {Object} callbacks - Callback functions for refresh operations
 */
export async function createDatasetText(image, callbacks = null) {
    try {
        // Show create dialog with empty content
        showDatasetTextEditor(image, '', true, callbacks);
        
    } catch (error) {
        console.error('Error creating dataset text:', error);
        notifications.error(`Error creating dataset text: ${error.message}`);
    }
}

/**
 * Show the dataset text editor modal
 * @param {Object} image - The image object
 * @param {string} content - The text content
 * @param {boolean} isNew - Whether this is a new file
 */
export function showDatasetTextEditor(image, content, isNew, callbacks = null) {
    const imageName = image.name || image.path?.split('/')?.pop() || 'Unknown Image';

    // Content container
    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = `
        padding: 0 0 10px 0;
        max-height: 60vh;
        overflow: hidden;
    `;

    // Text area
    const textarea = createTextarea({
      value: content,
      style: {
        width: '100%',
        height: '300px',
        resize: 'vertical'
      }
    });
    contentContainer.appendChild(textarea);

    // Create dialog
    const dialog = createDialog({
        title: `${isNew ? 'Create' : 'Edit'} Dataset Text for ${imageName}`,
        content: contentContainer,
        width: '600px',
        height: 'auto',
        showFooter: true,
        closeOnOverlayClick: true
    });

    // Footer buttons
    dialog.addFooterButton('Cancel', () => dialog.close(), { background: '#666' });
    dialog.addFooterButton('Save', async () => {
        try {
            await datasetTextApi.save(image.path, textarea.value);
            dialog.close();
            if (callbacks && callbacks.refreshCurrentTextDisplay) {
                callbacks.refreshCurrentTextDisplay();
            }
        } catch (error) {
            console.error('Error saving dataset text:', error);
            notifications.error(`Error saving: ${error.message}`);
        }
    }, { background: '#4CAF50' });

    // Show dialog and focus textarea
    dialog.show();
    textarea.focus();
}

/**
 * Refresh the current text display for the selected image
 */
export async function refreshCurrentTextDisplay() {
    try {
        const currentImage = selectors.selectedImage();
        if (!currentImage) return;
        
        const { content } = await datasetTextApi.read(currentImage.path);
        
        // Find text area and update it
        const textArea = document.querySelector('.dataset-text-area');
        if (textArea) {
            textArea.value = content;
        }
    } catch (error) {
        console.error('Error refreshing current text display:', error);
    }
}

// processImagesInCurrentFolder moved to js/shared/datasetTextOps.js

/**
 * Batch create missing text files for all images in current folder
 */
export async function batchCreateMissingTextFiles() {
    try {
        const { errors = [], created = 0 } = await processImagesInCurrentFolder(async (image) => {
            const { exists } = await datasetTextApi.check(image.path);
            if (!exists) {
                await datasetTextApi.save(image.path, '');
                return { created: 1 };
            }
            return {};
        });

        let message = `Batch create complete!\nCreated: ${created} text files`;
        if (errors.length > 0) {
            message += `\nErrors: ${errors.length}`;
            if (errors.length <= 10) {
                message += `\n${errors.join('\n')}`;
            } else {
                message += `\nFirst 10 errors:\n${errors.slice(0, 10).join('\n')}\n... and ${errors.length - 10} more`;
            }
        }

        notifications.info(message, 8000);
    } catch (error) {
        console.error('Error in batch create:', error);
        notifications.error(`Error in batch create: ${error.message}`);
    }
}

/**
 * Batch append text to all text files in current folder
 * @param {string} textToAdd - Text to append to each file
 * @param {boolean} addToBeginning - Whether to add to beginning instead of end
 */
export async function batchAppendToAllTextFiles(textToAdd, addToBeginning = false) {
    try {
        if (!textToAdd || textToAdd.trim() === '') {
            notifications.warning('No text provided to append.');
            return;
        }

        const { errors = [], updated = 0, created = 0 } = await processImagesInCurrentFolder(async (image) => {
            const { exists } = await datasetTextApi.check(image.path);
            let currentContent = '';
            let fileExists = exists;

            if (fileExists) {
                const { content } = await datasetTextApi.read(image.path);
                currentContent = content;
            }

            let newContent;
            if (addToBeginning) {
                newContent = currentContent.trim() === '' ? textToAdd : `${textToAdd}${currentContent}`;
            } else {
                newContent = currentContent.trim() === '' ? textToAdd : `${currentContent}${textToAdd}`;
            }

            await datasetTextApi.save(image.path, newContent);

            return fileExists ? { updated: 1 } : { created: 1 };
        });

        let message = `Batch append complete!\nUpdated: ${updated} files\nCreated: ${created} files`;
        if (errors.length > 0) {
            message += `\nErrors: ${errors.length}`;
            if (errors.length <= 10) {
                message += `\n${errors.join('\n')}`;
            } else {
                message += `\nFirst 10 errors:\n${errors.slice(0, 10).join('\n')}\n... and ${errors.length - 10} more`;
            }
        }

        notifications.info(message, 8000);
    } catch (error) {
        console.error('Error in batch append:', error);
        notifications.error(`Error in batch append: ${error.message}`);
    }
}

/**
 * Batch find and replace text in all text files in current folder
 * @param {string} findText - Text to find
 * @param {string} replaceText - Text to replace with
 */
export async function batchFindReplaceAllTextFiles(findText, replaceText, options = null) {
    try {
        if (!findText || findText.trim() === '') {
            notifications.warning('No search text provided.');
            return;
        }

        const { caseSensitive = true, wholeWord = false, useRegex = false } = options || {};

        const { processed = 0, updated = 0, errors = [] } = await processImagesInCurrentFolder(async (image) => {
            const { exists } = await datasetTextApi.check(image.path);
            if (!exists) {
                throw new Error('Failed to read file - File does not exist');
            }

            const { content: originalContent } = await datasetTextApi.read(image.path);

            let newContent = originalContent;
            if (useRegex) {
                try {
                    const flags = 'g' + (caseSensitive ? '' : 'i');
                    const regex = new RegExp(findText, flags);
                    newContent = originalContent.replace(regex, replaceText);
                } catch (e) {
                    throw new Error('Invalid regular expression');
                }
            } else {
                // Escape the find text if not using regex
                const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                let pattern = escapeRegex(findText);
                if (wholeWord) {
                    pattern = `\\b${pattern}\\b`;
                }
                const flags = 'g' + (caseSensitive ? '' : 'i');
                const regex = new RegExp(pattern, flags);
                newContent = originalContent.replace(regex, replaceText);
            }

            if (newContent !== originalContent) {
                await datasetTextApi.save(image.path, newContent);
                return { updated: 1 };
            }
            return {};
        });

        let message = `Batch find/replace complete!\nProcessed: ${processed} files\nUpdated: ${updated} files`;
        if (errors.length > 0) {
            message += `\nErrors: ${errors.length}`;
            if (errors.length <= 10) {
                message += `\n${errors.join('\n')}`;
            } else {
                message += `\nFirst 10 errors:\n${errors.slice(0, 10).join('\n')}\n... and ${errors.length - 10} more`;
            }
        }

        notifications.info(message, 8000);
    } catch (error) {
        console.error('Error in batch find/replace:', error);
        notifications.error(`Error in batch find/replace: ${error.message}`);
    }
}

/**
 * Batch trim whitespace in all text files (leading/trailing)
 */
export async function batchTrimWhitespaceAllTextFiles() {
    try {
        const { processed = 0, updated = 0, errors = [] } = await processImagesInCurrentFolder(async (image) => {
            const { exists } = await datasetTextApi.check(image.path);
            if (!exists) {
                return {};
            }
            const { content: originalContent } = await datasetTextApi.read(image.path);
            const newContent = originalContent.trim();
            if (newContent !== originalContent) {
                await datasetTextApi.save(image.path, newContent);
                return { updated: 1 };
            }
            return {};
        });

        let message = `Trim whitespace complete!\nProcessed: ${processed} files\nUpdated: ${updated} files`;
        if (errors.length > 0) {
            message += `\nErrors: ${errors.length}`;
        }
        notifications.info(message, 8000);
    } catch (error) {
        console.error('Error in batch trim:', error);
        notifications.error(`Error in batch trim: ${error.message}`);
    }
}

/**
 * Batch deduplicate lines in all text files
 */
export async function batchDedupLinesAllTextFiles() {
    try {
        const { processed = 0, updated = 0, errors = [] } = await processImagesInCurrentFolder(async (image) => {
            const { exists } = await datasetTextApi.check(image.path);
            if (!exists) {
                return {};
            }
            const { content: originalContent } = await datasetTextApi.read(image.path);
            const lines = originalContent.split(/\r?\n/);
            const seen = new Set();
            const deduped = [];
            for (const line of lines) {
                const key = line; // consider exact line match
                if (!seen.has(key)) {
                    seen.add(key);
                    deduped.push(line);
                }
            }
            const newContent = deduped.join('\n');
            if (newContent !== originalContent) {
                await datasetTextApi.save(image.path, newContent);
                return { updated: 1 };
            }
            return {};
        });

        let message = `Deduplicate lines complete!\nProcessed: ${processed} files\nUpdated: ${updated} files`;
        if (errors.length > 0) {
            message += `\nErrors: ${errors.length}`;
        }
        notifications.info(message, 8000);
    } catch (error) {
        console.error('Error in batch deduplicate:', error);
        notifications.error(`Error in batch deduplicate: ${error.message}`);
    }
}

/**
 * Main handler for dataset text operations
 * @param {Object} image - The image object
 */
export async function handleDatasetText(image) {
    showCombinedImageTextEditor(image);
}

/**
 * Generate description for a single image using LLM preset
 * @param {Object} image - The image object
 * @param {string} presetId - ID of the preset to use
 * @param {boolean} isAppend - Whether to append or overwrite
 * @param {HTMLTextAreaElement} textArea - The textarea to update
 */
async function generateDescriptionForImage(image, presetId, isAppend, textArea) {
    // Create progress dialog
    const progressOverlay = createDatasetProgressDialog();
    const { dialog, elements } = progressOverlay;
    
    elements.titleText.textContent = 'Generating Description';
    elements.progressText.textContent = 'Processing image...';
    elements.statusText.textContent = image.filename || image.name || image.path.split('/').pop();
    elements.progressFill.style.width = '50%'; // Show some progress
    elements.cancelBtn.style.display = 'none'; // No cancel for single image
    
    progressOverlay.show();
    
    try {
        // Load image and convert to base64
        const imageUrl = await loadThumbnail(image, 'large');
        
        // Show the image being processed
        if (elements.imagePreview) {
            elements.imagePreview.src = imageUrl;
        }
        
        // Convert to base64
        const base64 = await urlToBase64(imageUrl);
        
        // Clean up blob URL
        cleanupImageUrl(imageUrl);
        
        elements.progressFill.style.width = '75%';
        elements.progressText.textContent = 'Generating with LLM...';
        
        // Generate description using preset
        const genResponse = await fetch('/sage_llm/presets/generate_with_image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                preset_id: presetId,
                images: [base64]
            })
        });
        
        const genResult = await genResponse.json();
        
        if (!genResult.success) {
            throw new Error(genResult.error || 'Failed to generate description');
        }
        
        const generatedText = genResult.data.response;
        
        // Show the generated text in the preview
        if (elements.textPreview) {
            elements.textPreview.textContent = generatedText;
        }
        
        elements.progressFill.style.width = '100%';
        elements.progressText.textContent = 'Complete!';
        
        // Update textarea
        if (isAppend) {
            const currentText = textArea.value.trim();
            textArea.value = currentText ? `${currentText}\n${generatedText}` : generatedText;
        } else {
            textArea.value = generatedText;
        }
        
        // Keep dialog visible for a moment to show result
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        progressOverlay.close();
        
    } catch (error) {
        progressOverlay.close();
        console.error('Error generating description:', error);
        notifications.error(`Error generating description: ${error.message}`);
        throw error;
    }
}

/**
 * Batch generate descriptions for all images
 * @param {Array} images - Array of image objects
 * @param {string} presetId - ID of the preset to use
 * @param {boolean} isAppend - Whether to append or overwrite
 * @param {Function} onComplete - Callback when complete
 */
async function batchGenerateDescriptions(images, presetId, isAppend, onComplete) {
    // Create progress dialog
    const progressOverlay = createDatasetProgressDialog();
    const { dialog, elements } = progressOverlay;
    
    elements.titleText.textContent = 'Batch Generating Descriptions';
    elements.progressText.textContent = 'Processing image 0 of ' + images.length + '...';
    
    progressOverlay.show();
    
    let cancelled = false;
    elements.cancelBtn.addEventListener('click', () => {
        cancelled = true;
        elements.cancelBtn.textContent = 'Cancelling...';
        elements.cancelBtn.disabled = true;
    });
    
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    const errors = [];
    
    try {
        for (let i = 0; i < images.length && !cancelled; i++) {
            const image = images[i];
            elements.progressText.textContent = `Processing image ${i + 1} of ${images.length}...`;
            elements.statusText.textContent = `Current: ${image.filename || image.name || image.path.split('/').pop()}`;
            
            try {
                // Load image and convert to base64
                const imageUrl = await loadThumbnail(image, 'large');
                
                const base64 = await urlToBase64(imageUrl);
                
                // Clean up blob URL
                cleanupImageUrl(imageUrl);
                
                // Generate description
                const genResponse = await fetch('/sage_llm/presets/generate_with_image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        preset_id: presetId,
                        images: [base64]
                    })
                });
                
                const genResult = await genResponse.json();
                
                if (!genResult.success) {
                    throw new Error(genResult.error || 'Failed to generate description');
                }
                
                const generatedText = genResult.data.response;
                
                // Update the preview with the completed image and its generated text
                if (elements.imagePreview && elements.textPreview) {
                    // Re-load the image to show in preview (since we may have cleaned up the URL)
                    const previewImageUrl = await loadThumbnail(image, 'large');
                    elements.imagePreview.src = previewImageUrl;
                    elements.textPreview.textContent = generatedText;
                }
                
                // Load existing text if appending
                let finalText = generatedText;
                if (isAppend) {
                    try {
                        const { content } = await datasetTextApi.read(image.path);
                        if (content.trim()) {
                            finalText = `${content.trim()}\n${generatedText}`;
                        }
                    } catch (error) {
                        console.warn('Could not read existing text, creating new:', error);
                    }
                }
                
                // Save the description
                await datasetTextApi.save(image.path, finalText);
                
                succeeded++;
                
            } catch (error) {
                console.error(`Error processing ${image.filename}:`, error);
                errors.push(`${image.filename || image.name}: ${error.message}`);
                failed++;
            }
            
            processed++;
            const progress = (processed / images.length) * 100;
            elements.progressFill.style.width = progress + '%';
        }
        
        // Show completion summary
        progressOverlay.close();
        
        let message = `Batch generation ${cancelled ? 'cancelled' : 'complete'}!\n`;
        message += `Processed: ${processed} images\n`;
        message += `Succeeded: ${succeeded}\n`;
        message += `Failed: ${failed}`;
        
        if (errors.length > 0 && errors.length <= 10) {
            message += `\n\nErrors:\n${errors.join('\n')}`;
        } else if (errors.length > 10) {
            message += `\n\nFirst 10 errors:\n${errors.slice(0, 10).join('\n')}\n... and ${errors.length - 10} more`;
        }
        
        notifications.info(message, 10000);
        
        if (onComplete) {
            await onComplete();
        }
        
    } catch (error) {
        progressOverlay.close();
        console.error('Error in batch generation:', error);
        notifications.error(`Error in batch generation: ${error.message}`);
    }
}

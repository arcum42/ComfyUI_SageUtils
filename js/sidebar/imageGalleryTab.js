/**
 * Image Gallery Tab - Handles image browsing, viewing, and management for multiple folders
 */

import { api } from "../../../../scripts/api.js";

import { 
    handleError
} from "../shared/errorHandler.js";

import { 
    actions, 
    selectors 
} from "../shared/stateManager.js";

// Import gallery API functions
import {
    loadImagesFromFolder,
    loadImageMetadata,
    formatMetadataForDisplay,
    generateFallbackMetadata
} from "../shared/api/galleryApi.js";

// Import gallery event handlers
import { showFullImage, showImageContextMenu, browseCustomFolder, toggleViewMode } from '../gallery/galleryEvents.js';

// Import configuration utilities
import { getThumbnailSize } from "../shared/config.js";

// Import grid components
import {
    createImageItem,
    createFolderItem,
    createBackNavigationItem
} from "../shared/galleryGrid.js";

// Import gallery layout components
import {
    createGalleryHeader,
    createFolderSelectorAndControls,
    createWrappedThumbnailGrid,
    createMetadataPanel,
    assembleGalleryTabLayout
} from "../gallery/galleryLayout.js";

// Import dataset text management
import {
    handleDatasetText,
    showCombinedImageTextEditor,
    editDatasetText,
    createDatasetText,
    batchCreateMissingTextFiles,
    batchAppendToAllTextFiles,
    batchFindReplaceAllTextFiles,
    refreshCurrentTextDisplay
} from "../shared/datasetTextManager.js";

/**
 * Sets up event handlers for Gallery tab interactions
 * @param {Object} folderSelector - Folder selector components
 * @param {Object} controls - Controls panel components  
 * @param {Object} grid - Thumbnail grid components
 * @param {Object} metadata - Metadata panel components
 * @param {Object} header - Header components
 * @param {Object} galleryFunctions - Gallery function dependencies
 */
function setupGalleryEventHandlers(folderAndControls, unused, grid, metadata, header, galleryFunctions) {
    // Folder cache for back navigation - stores images and folders by path
    const folderCache = new Map();
    
    // Track the current abort controller for folder loading operations
    let currentAbortController = null;
    
    // Extract gallery functions from parameters instead of global window
    const { 
        showFullImage, 
        showImageContextMenu, 
        browseCustomFolder, 
        toggleViewMode,
        handleDatasetText,
        showCombinedImageTextEditor,
        datasetTextManager
    } = galleryFunctions;
    // Helper function to update status
    function setStatus(message, isError = false) {
        console.log(isError ? `Gallery Error: ${message}` : `Gallery: ${message}`);
        
        // Update status in header if available
        if (header && header.statusDiv) {
            header.statusDiv.textContent = message;
            header.statusDiv.style.color = isError ? '#f44336' : '#4CAF50';
            
            // Clear status after 3 seconds unless it's an error
            if (!isError) {
                setTimeout(() => {
                    if (header.statusDiv.textContent === message) {
                        header.statusDiv.textContent = '';
                    }
                }, 3000);
            }
        }
    }

    // Load images from selected folder - wrapper for imported API function
    async function loadImagesWrapper(folderType, customPath = null, forceReload = false) {
        try {
            // Cancel any ongoing folder load operation
            if (currentAbortController) {
                console.log('Gallery: Aborting previous folder load operation');
                currentAbortController.abort();
                currentAbortController = null;
            }
            
            // Create a new abort controller for this operation
            currentAbortController = new AbortController();
            const signal = currentAbortController.signal;
            
            // Create cache key
            const cacheKey = customPath ? `custom:${customPath}` : folderType;
            
            // Check cache first (unless force reload)
            if (!forceReload && folderCache.has(cacheKey)) {
                console.log('Gallery: Loading from cache:', cacheKey);
                const cached = folderCache.get(cacheKey);
                
                // Update UI immediately from cache
                grid.imageCountSpan.textContent = `(${cached.images.length} images, ${cached.folders.length} folders)`;
                await renderImageGrid(cached.images, cached.folders, loadImagesWrapper);
                
                // Auto-show metadata for the first image if available
                if (cached.images && cached.images.length > 0) {
                    showImageMetadata(cached.images[0]);
                } else {
                    metadata.metadataContent.innerHTML = `
                        <div style="color: #888; text-align: center; padding: 20px;">
                            <div style="font-size: 24px; margin-bottom: 10px;">📁</div>
                            <div>No images in this folder</div>
                            <div style="font-size: 12px; margin-top: 5px;">
                                Select a folder with images to view details
                            </div>
                        </div>
                    `;
                }
                
                setStatus('Loaded from cache', false);
                currentAbortController = null; // Clear controller since we're done
                return;
            }
            
            // Check if aborted after cache check
            if (signal.aborted) {
                console.log('Gallery: Load operation aborted before starting');
                return;
            }
            
            // Show loading indicator in grid with immediate count update
            grid.imageCountSpan.textContent = '(Loading...)';
            
            // Create a progress update function
            let progressContainer = null;
            const updateProgress = (current, total, message = '') => {
                if (!progressContainer) {
                    grid.gridContainer.innerHTML = '';
                    progressContainer = document.createElement('div');
                    progressContainer.style.cssText = `
                        grid-column: 1 / -1;
                        text-align: center;
                        color: #4CAF50;
                        padding: 60px 20px;
                        font-size: 14px;
                    `;
                    grid.gridContainer.appendChild(progressContainer);
                }
                
                const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
                
                progressContainer.innerHTML = `
                    <div style="font-size: 24px; margin-bottom: 15px;">🔍</div>
                    <div style="margin-bottom: 10px;">${message || `Loading from ${folderType} folder...`}</div>
                    <div style="color: #ccc; font-size: 13px; margin-bottom: 15px;">
                        ${current} / ${total} images loaded
                    </div>
                    <div style="
                        width: 100%;
                        max-width: 400px;
                        height: 24px;
                        background: #333;
                        border-radius: 12px;
                        overflow: visible;
                        margin: 0 auto;
                        border: 1px solid #555;
                        position: relative;
                    ">
                        <div style="
                            width: ${percentage}%;
                            height: 100%;
                            background: linear-gradient(90deg, #4CAF50, #66BB6A);
                            transition: width 0.3s ease;
                            border-radius: 12px;
                        "></div>
                        <div style="
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: ${percentage > 50 ? 'white' : '#4CAF50'};
                            font-weight: bold;
                            font-size: 12px;
                            text-shadow: ${percentage > 50 ? '0 1px 2px rgba(0,0,0,0.5)' : '0 1px 2px rgba(0,0,0,0.8)'};
                            pointer-events: none;
                        ">${percentage}%</div>
                    </div>
                `;
            };
            
            // Initial progress display
            updateProgress(0, 0, `Loading from ${folderType} folder...`);
            
            // Create a custom setStatus that also updates the progress bar
            const customSetStatus = (message) => {
                // Parse progress messages like "Checking metadata 10/50..."
                const progressMatch = message.match(/(\d+)\/(\d+)/);
                if (progressMatch) {
                    const current = parseInt(progressMatch[1]);
                    const total = parseInt(progressMatch[2]);
                    updateProgress(current, total, message);
                } else {
                    setStatus(message);
                }
            };
            
            // Create a progress callback for metadata loading
            const onMetadataProgress = (progressData) => {
                const { current, total, withParams } = progressData;
                updateProgress(current, total, `Checking metadata ${current}/${total}... (${withParams} with params)`);
                
                // Update the grid count display as metadata is loaded
                const currentImages = selectors.galleryImages();
                const currentFolders = selectors.galleryFolders();
                if (currentImages && currentFolders) {
                    grid.imageCountSpan.textContent = `${currentImages.length} images / ${currentFolders.length} folders`;
                }
                
                // Optionally re-render if metadata-only filter is active
                const showMetadataOnly = selectors.showMetadataOnly();
                if (showMetadataOnly) {
                    filterAndSortImages();
                }
                
                // Update cache with latest metadata
                if (current === total) {
                    // Metadata loading is complete
                    folderCache.set(cacheKey, { images: currentImages, folders: currentFolders });
                    console.log('Gallery: Updated cache with metadata:', cacheKey);
                }
            };
            
            // Call the imported API function with custom status handler, abort signal, and progress callback
            const result = await loadImagesFromFolder(folderType, customPath, customSetStatus, signal, onMetadataProgress);
            
            // Check if operation was aborted after loading
            if (signal.aborted) {
                console.log('Gallery: Load operation aborted after fetch');
                return;
            }
            
            const { images, folders, totalItems } = result;
            
            // Store in cache (will be updated as metadata loads)
            folderCache.set(cacheKey, { images, folders });
            console.log('Gallery: Cached folder data:', cacheKey, `(${images.length} images, ${folders.length} folders)`);
            
            // Update UI immediately with actual counts
            grid.imageCountSpan.textContent = `${images.length} images / ${folders.length} folders`;
            
            // Clear the progress container if it exists
            if (progressContainer && progressContainer.parentNode) {
                progressContainer.remove();
            }
            
            // Render image grid with both images and folders immediately
            await renderImageGrid(images, folders, loadImagesWrapper);
            
            // Auto-show metadata for the first image if available
            if (images && images.length > 0) {
                showImageMetadata(images[0]);
            } else {
                // No images available, show placeholder message
                metadata.metadataContent.innerHTML = `
                    <div style="color: #888; text-align: center; padding: 20px;">
                        <div style="font-size: 24px; margin-bottom: 10px;">📁</div>
                        <div>No images in this folder</div>
                        <div style="font-size: 12px; margin-top: 5px;">
                            Select a folder with images to view details
                        </div>
                    </div>
                `;
            }
            
            // Special case: if we're in a custom path with no images/folders, ensure back navigation is available
            if (folderType === 'custom' && customPath && images.length === 0 && folders.length === 0) {
                const currentPath = selectors.currentPath();
                if (currentPath && currentPath !== '') {
                    const backItem = createBackNavigationItem();
                    grid.gridContainer.insertBefore(backItem, grid.gridContainer.firstChild);
                }
            }
            
            // Clear abort controller after successful completion
            currentAbortController = null;
            
        } catch (error) {
            // Check if this was an abort error (user switched folders)
            if (error.name === 'AbortError') {
                console.log('Gallery: Folder load was cancelled');
                setStatus('Folder load cancelled', false);
                return;
            }
            
            console.error('Error loading images:', error);
            setStatus(`Error loading images: ${error.message}`, true);
            
            // Clear abort controller on error
            currentAbortController = null;
            
            grid.gridContainer.innerHTML = `
                <div style="
                    grid-column: 1 / -1;
                    text-align: center;
                    color: #f44336;
                    padding: 40px;
                    font-style: italic;
                ">
                    ❌ Error loading images
                    <br><small style="color: #888; margin-top: 10px; display: block;">
                        ${error.message}
                    </small>
                </div>
            `;
            
            grid.imageCountSpan.textContent = '(Error)';
        }
    }

    // Render image grid with actual images and folders
    async function renderImageGrid(images, folders = [], loadImagesCallback = null) {
        
        grid.gridContainer.innerHTML = '';
        
        if (!images || (images.length === 0 && folders.length === 0)) {
            grid.gridContainer.innerHTML = `
                <div style="
                    grid-column: 1 / -1;
                    text-align: center;
                    color: #888;
                    padding: 40px;
                    font-style: italic;
                ">
                    No images or folders found in this location
                </div>
            `;
            return;
        }
        
        // Apply current filters and sorting to images only
        const searchQuery = selectors.gallerySearchQuery().toLowerCase();
        const sortBy = selectors.gallerySortBy();
        const showMetadataOnly = selectors.showMetadataOnly();
        
        let filteredImages = images || [];
        let sortedFolders = [...folders];
        
        // Apply search filter to images
        if (searchQuery) {
            filteredImages = filteredImages.filter(img => 
                img.filename.toLowerCase().includes(searchQuery) ||
                img.relative_path.toLowerCase().includes(searchQuery)
            );
            // Also filter folders
            sortedFolders = folders.filter(folder =>
                folder.name.toLowerCase().includes(searchQuery)
            );
        }
        
        // Apply metadata filter if enabled (instant filtering using pre-calculated flag)
        if (showMetadataOnly) {
            filteredImages = filteredImages.filter(img => img.hasGenerationParams === true);
        }
        
        // Apply sorting to images
        filteredImages.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.filename.localeCompare(b.filename);
                case 'name-desc':
                    return b.filename.localeCompare(a.filename);
                case 'size':
                    return b.size - a.size; // Largest first
                case 'size-desc':
                    return a.size - b.size; // Smallest first
                case 'date':
                    return new Date(b.modified) - new Date(a.modified); // Newest first
                case 'date-desc':
                    return new Date(a.modified) - new Date(b.modified); // Oldest first
                case 'type':
                    return (a.filename.split('.').pop() || '').localeCompare(b.filename.split('.').pop() || '');
                case 'type-desc':
                    return (b.filename.split('.').pop() || '').localeCompare(a.filename.split('.').pop() || '');
                default:
                    return 0;
            }
        });
        
        // Sort folders alphabetically
        sortedFolders.sort((a, b) => a.name.localeCompare(b.name));
        
        // Update count display with generation params info
        const withParams = filteredImages.filter(img => img.hasGenerationParams).length;
        const totalImages = images ? images.length : 0;
        
        let countText = '';
        if (showMetadataOnly) {
            // Show filtered/total when filter is active
            countText = `${filteredImages.length}/${totalImages} images / ${sortedFolders.length} folders`;
        } else {
            // Show just totals when filter is off
            countText = `${filteredImages.length} images / ${sortedFolders.length} folders`;
        }
        
        grid.imageCountSpan.textContent = countText;
        
        // Render folders first
        sortedFolders.forEach(folder => {
            const folderItem = createFolderItem(folder, loadImagesCallback);
            grid.gridContainer.appendChild(folderItem);
        });
        
        // Add "back" navigation if we're in a custom path
        const currentPath = selectors.currentPath();
        if (currentPath && currentPath !== '') {
            const backItem = createBackNavigationItem(loadImagesCallback);
            grid.gridContainer.insertBefore(backItem, grid.gridContainer.firstChild);
        }
        
        // Then render images
        if (filteredImages.length > 50) {
            await renderImagesWithProgress(filteredImages);
        } else {
            // Render all at once for small folders
            filteredImages.forEach(image => {
                const imageItem = createImageItem(image, showFullImage, showImageContextMenu);
                grid.gridContainer.appendChild(imageItem);
            });
        }
    }
    
    // Render images with progress indicator for large folders
    async function renderImagesWithProgress(images) {
        const batchSize = 20; // Process 20 images at a time
        const totalImages = images.length;
        let processedCount = 0;
        
        // Show initial progress
        const progressContainer = document.createElement('div');
        progressContainer.style.cssText = `
            grid-column: 1 / -1;
            text-align: center;
            padding: 20px;
            background: #2a2a2a;
            border-radius: 6px;
            margin-bottom: 15px;
        `;
        grid.gridContainer.appendChild(progressContainer);
        
        const updateProgress = () => {
            const percentage = Math.round((processedCount / totalImages) * 100);
            progressContainer.innerHTML = `
                <div style="color: #4CAF50; margin-bottom: 10px;">
                    Loading thumbnails... ${processedCount}/${totalImages} (${percentage}%)
                </div>
                <div style="
                    width: 100%;
                    height: 8px;
                    background: #333;
                    border-radius: 4px;
                    overflow: hidden;
                ">
                    <div style="
                        width: ${percentage}%;
                        height: 100%;
                        background: linear-gradient(90deg, #4CAF50, #66BB6A);
                        transition: width 0.3s ease;
                    "></div>
                </div>
            `;
        };
        
        updateProgress();
        
        // Process images in batches
        for (let i = 0; i < images.length; i += batchSize) {
            const batch = images.slice(i, i + batchSize);
            
            // Create placeholders for this batch
            const batchItems = [];
            batch.forEach(image => {
                const imageItem = createImageItem(image, showFullImage, showImageContextMenu);
                batchItems.push(imageItem);
                grid.gridContainer.appendChild(imageItem);
            });
            
            // Update progress
            processedCount += batch.length;
            updateProgress();
            
            // Small delay between batches to keep UI responsive
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Remove progress indicator when done
        setTimeout(() => {
            if (progressContainer.parentNode) {
                progressContainer.remove();
            }
        }, 1000);
    }
    
    // Show full image viewer
    async function showImageMetadata(image, autoScroll = false) {
        try {
            metadata.metadataSection.style.display = 'block';
            
            // Call the imported API function
            const result = await loadImageMetadata(image, setStatus);
            
            if (result.success) {
                // Format the metadata using the imported function
                const { html, hasErrors } = formatMetadataForDisplay(result.metadata);
                metadata.metadataContent.innerHTML = html;
                
                if (setStatus) {
                    setStatus(hasErrors ? 'Metadata loaded with some warnings' : 'Metadata loaded');
                }
            } else {
                // Show fallback metadata using the imported function
                const fallbackHtml = generateFallbackMetadata(image, result.error);
                metadata.metadataContent.innerHTML = fallbackHtml;
            }
            
            // Only scroll to metadata section if explicitly requested
            if (autoScroll) {
                setTimeout(() => {
                    metadata.metadataSection.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                }, 100);
            }
            
        } catch (error) {
            console.error('Error in showImageMetadata wrapper:', error);
            const fallbackHtml = generateFallbackMetadata(image, error.message);
            metadata.metadataContent.innerHTML = fallbackHtml;
        }
    }

    // Show image context menu

    // Toggle view mode

    // Show metadata panel
    function showMetadata(imagePath) {
        actions.toggleMetadata(true);
        metadata.metadataSection.style.display = 'block';
        
        // Load actual metadata using the real function
        const images = selectors.galleryImages();
        if (images) {
            const image = images.find(img => img.path === imagePath || img.relative_path === imagePath);
            if (image) {
                showImageMetadata(image, true); // Auto-scroll when explicitly requested
                return; // Exit early, showImageMetadata will handle the display
            }
        }
        
        // Fallback display if image not found
        metadata.metadataContent.innerHTML = `
            <div style="color: #4CAF50; margin-bottom: 10px;">📄 File Information</div>
            <div>Path: ${imagePath}</div>
            <div>Status: Metadata loading not yet implemented</div>
            <br>
            <div style="color: #2196F3;">🔄 Implementation Status</div>
            <div>• Basic UI structure: ✅ Complete</div>
            <div>• Image loading: ⏳ Phase 2</div>
            <div>• Metadata extraction: ⏳ Phase 2</div>
            <div>• Thumbnail generation: ⏳ Phase 2</div>
        `;
    }

    // Hide metadata panel
    function hideMetadata() {
        // Instead of hiding the panel, show a "no image selected" message
        actions.toggleMetadata(false);
        metadata.metadataContent.innerHTML = `
            <div style="color: #888; text-align: center; padding: 20px;">
                <div style="font-size: 24px; margin-bottom: 10px;">👁️</div>
                <div>No image selected</div>
                <div style="font-size: 12px; margin-top: 5px;">
                    Click on an image to view its details
                </div>
            </div>
        `;
        // Keep the panel visible
        // metadata.metadataSection.style.display = 'none';
    }

    // Set up event listeners
    folderAndControls.folderDropdown.addEventListener('change', (e) => {
        const selectedFolder = e.target.value;
        actions.selectFolder(selectedFolder);
        
        if (selectedFolder === 'custom') {
            const currentPath = selectors.currentPath();
            if (currentPath && currentPath !== '') {
                // We have a previously browsed custom folder, load it
                folderAndControls.browseButton.style.display = 'block';
                loadImagesWrapper('custom', currentPath);
                setStatus(`Loading custom folder: ${currentPath}`);
            } else {
                // No custom path set, user needs to browse
                folderAndControls.browseButton.style.display = 'block';
                setStatus('Please click Browse to select a custom folder');
            }
        } else {
            folderAndControls.browseButton.style.display = 'none';
            loadImagesWrapper(selectedFolder);
        }
    });

    folderAndControls.browseButton.addEventListener('click', () => {
        // Create wrapper that provides the callback to renderImageGrid
        const renderGridWithCallback = (images, folders) => renderImageGrid(images, folders, loadImagesWrapper);
        browseCustomFolder(renderGridWithCallback);
    });

    folderAndControls.searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        actions.setSearchQuery(query);
        // Implement search filtering
        filterAndSortImages();
        setStatus(query ? `Searching for: "${query}"` : 'Search cleared');
    });

    folderAndControls.sortSelect.addEventListener('change', (e) => {
        const baseSortBy = e.target.value; // Base sort criteria (name, date, size, type)
        const currentSort = selectors.gallerySortBy();
        const isDescending = currentSort.endsWith('-desc');
        
        // Apply current sort direction to new criteria
        const newSort = isDescending ? baseSortBy + '-desc' : baseSortBy;
        actions.updateSort(newSort);
        updateSortUI(); // Update the order button
        filterAndSortImages();
        setStatus(`Sorted by: ${e.target.options[e.target.selectedIndex].text} (${isDescending ? 'Descending' : 'Ascending'})`);
    });

    grid.refreshButton.addEventListener('click', refreshCurrentFolder);
    folderAndControls.viewModeButton.addEventListener('click', () => {
        const renderGridWithCallback = (images, folders) => renderImageGrid(images, folders, loadImagesWrapper);
        toggleViewMode(renderGridWithCallback);
    });

    // Add event handlers for the new combined controls
    folderAndControls.clearButton.addEventListener('click', () => {
        folderAndControls.searchInput.value = '';
        actions.setSearchQuery('');
        filterAndSortImages();
        setStatus('Search cleared');
    });

    folderAndControls.orderButton.addEventListener('click', () => {
        const currentSort = selectors.gallerySortBy();
        let newSort;
        
        // Toggle between ascending and descending versions
        if (currentSort.endsWith('-desc')) {
            // Remove -desc suffix for ascending
            newSort = currentSort.replace('-desc', '');
        } else {
            // Add -desc suffix for descending  
            newSort = currentSort + '-desc';
        }
        
        actions.updateSort(newSort);
        updateSortUI(); // This will set both dropdown and button correctly
        filterAndSortImages();
        setStatus(`Sort order: ${newSort.endsWith('-desc') ? 'Descending' : 'Ascending'}`);
    });

    folderAndControls.metadataFilterCheckbox.addEventListener('change', (e) => {
        const showMetadataOnly = e.target.checked;
        actions.toggleMetadataOnly(showMetadataOnly);
        filterAndSortImages();
        setStatus(showMetadataOnly ? 'Showing only images with generation parameters' : 'Showing all images');
    });

    folderAndControls.datasetTextButton.addEventListener('click', () => {
        // Open dataset text manager without a specific image
        // This allows batch operations on the current folder
        const currentFolder = selectors.selectedFolder();
        const images = selectors.galleryImages();
        
        if (!images || images.length === 0) {
            setStatus('No images in current folder', true);
            return;
        }
        
        // Show the combined text editor with the first image as context
        showCombinedImageTextEditor(images[0], null, () => {
            // Refresh callback if needed
            refreshCurrentTextDisplay && refreshCurrentTextDisplay();
        });
        
        setStatus('Opening dataset text manager...');
    });

    // Function to update grid layout based on current settings
    function updateGridLayout() {
        const currentMode = selectors.galleryViewMode();
        if (currentMode === 'list') {
            grid.gridContainer.style.gridTemplateColumns = '1fr';
            grid.gridContainer.style.gap = '5px';
        } else {
            const thumbnailSizeConfig = getThumbnailSize(selectors.thumbnailSize());
            grid.gridContainer.style.gridTemplateColumns = `repeat(auto-fill, minmax(${thumbnailSizeConfig.width}px, 1fr))`;
            grid.gridContainer.style.gap = '10px';
        }
    }

    // Function to update UI based on current sort state
    function updateSortUI() {
        const currentSort = selectors.gallerySortBy();
        // Extract base sort criteria (remove -desc suffix if present)
        const baseSortCriteria = currentSort.endsWith('-desc') ? currentSort.replace('-desc', '') : currentSort;
        folderAndControls.sortSelect.value = baseSortCriteria;
        folderAndControls.orderButton.textContent = currentSort.endsWith('-desc') ? '↓' : '↑';
    }

    // Function to update thumbnail size UI based on current state
    function updateThumbnailSizeUI() {
        const currentSize = selectors.thumbnailSize();
        folderAndControls.thumbnailSizeSelect.value = currentSize;
    }

    folderAndControls.thumbnailSizeSelect.addEventListener('change', (e) => {
        const size = e.target.value;
        actions.setThumbnailSize(size);
        // Update grid layout with new thumbnail size
        updateGridLayout();
        // Refresh current folder to re-render with new size
        refreshCurrentFolder();
        setStatus(`Thumbnail size: ${size}`);
    });

    metadata.closeButton.addEventListener('click', hideMetadata);

    // Demo: Show metadata panel when grid header is clicked
    grid.gridHeader.addEventListener('click', () => {
        if (metadata.metadataSection.style.display === 'none') {
            showMetadata('demo/image/path.jpg');
        } else {
            hideMetadata();
        }
    });

    // Browse custom folder

    // Refresh current folder
    function refreshCurrentFolder() {
        const currentFolder = selectors.selectedFolder();
        const currentPath = selectors.currentPath();
        
        if (currentFolder) {
            // Clear cache for this folder
            const cacheKey = currentFolder === 'custom' && currentPath ? `custom:${currentPath}` : currentFolder;
            folderCache.delete(cacheKey);
            console.log('Gallery: Cleared cache for:', cacheKey);
            
            setStatus('Refreshing folder...');
            
            // Force reload with the third parameter
            if (currentFolder === 'custom' && currentPath) {
                loadImagesWrapper('custom', currentPath, true);
            } else {
                loadImagesWrapper(currentFolder, null, true);
            }
        } else {
            setStatus('No folder selected to refresh', true);
        }
    }

    // Filter and sort images
    function filterAndSortImages() {
        const images = selectors.galleryImages();
        const folders = selectors.galleryFolders();
        if (images && images.length > 0) {
            renderImageGrid(images, folders, loadImagesWrapper).catch(console.error);
        }
    }

    // Initialize UI state
    updateSortUI();
    updateThumbnailSizeUI();
    updateGridLayout();

    // Store functions for external access
    return {
        loadImagesFromFolder: loadImagesWrapper,  // Export the wrapper, not the raw API function
        refreshCurrentFolder,
        toggleViewMode: () => {
            const renderGridWithCallback = (images, folders) => renderImageGrid(images, folders, loadImagesWrapper);
            toggleViewMode(renderGridWithCallback);
        },
        showMetadata,
        hideMetadata,
        browseCustomFolder: () => {
            const renderGridWithCallback = (images, folders) => renderImageGrid(images, folders, loadImagesWrapper);
            browseCustomFolder(renderGridWithCallback);
        },
        filterAndSortImages,
        updateGridLayout,
        updateThumbnailSizeUI,
        renderImageGrid: (images, folders) => renderImageGrid(images, folders, loadImagesWrapper)
    };
}

export function createImageGalleryTab(container) {
    // Create all components
    const header = createGalleryHeader();
    const folderAndControls = createFolderSelectorAndControls(); // Combined section
    const grid = createWrappedThumbnailGrid();
    const metadata = createMetadataPanel();

    // Set up event handlers and provide necessary functions via parameters
    const galleryFunctions = {
        showFullImage,
        showImageContextMenu, 
        browseCustomFolder,
        toggleViewMode,
        handleDatasetText,
        showCombinedImageTextEditor,
        datasetTextManager: {
            editDatasetText,
            createDatasetText,
            batchCreateMissingTextFiles,
            batchAppendToAllTextFiles,
            batchFindReplaceAllTextFiles,
            refreshCurrentTextDisplay
        }
    };
    
    const eventHandlers = setupGalleryEventHandlers(folderAndControls, null, grid, metadata, header, galleryFunctions);

    // Assemble the layout
    assembleGalleryTabLayout(container, {
        header,
        folderAndControls, // Combined section
        grid,
        metadata
    });

    // Initialize grid layout with current thumbnail size
    if (eventHandlers.updateGridLayout) {
        eventHandlers.updateGridLayout();
    }

    // Restore previously selected folder
    const savedFolder = selectors.selectedFolder();
    if (savedFolder && savedFolder !== 'notes') {
        folderAndControls.folderDropdown.value = savedFolder;
    }

    // Initialize with default state
    
    // Auto-load from saved folder selection
    setTimeout(() => {
        try {
            const savedFolder = selectors.selectedFolder() || 'notes';
            const existingImages = selectors.galleryImages();
            
            // Check if we already have images loaded (from background preload)
            if (existingImages && existingImages.length > 0) {
                console.log('Gallery: Images already preloaded, rendering existing data');
                const existingFolders = selectors.galleryFolders() || [];
                if (eventHandlers && eventHandlers.renderImageGrid) {
                    eventHandlers.renderImageGrid(existingImages, existingFolders);
                }
                return;
            }
            
            // Don't auto-load custom folders without a path
            if (savedFolder === 'custom') {
                const savedPath = selectors.currentPath();
                if (!savedPath || savedPath.trim() === '') {
                    console.log('Gallery: Skipping auto-load of custom folder without path. Defaulting to notes.');
                    actions.setSelectedFolder('notes');
                    folderAndControls.folderDropdown.value = 'notes';
                    if (eventHandlers && eventHandlers.loadImagesFromFolder) {
                        eventHandlers.loadImagesFromFolder('notes');
                    }
                    return;
                }
                // If we have a valid path, proceed with custom folder
                if (eventHandlers && eventHandlers.loadImagesFromFolder) {
                    eventHandlers.loadImagesFromFolder(savedFolder, savedPath);
                }
            } else {
                // Standard folder (notes, input, output)
                if (eventHandlers && eventHandlers.loadImagesFromFolder) {
                    eventHandlers.loadImagesFromFolder(savedFolder);
                } else {
                    console.warn('Gallery event handlers not available for auto-initialization');
                }
            }
        } catch (error) {
            console.error('Error during gallery auto-initialization:', error);
        }
    }, 200);
}

// Default export for module compatibility
export default createImageGalleryTab;

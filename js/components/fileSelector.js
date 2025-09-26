/**
 * File Selector Component - Handles file list dropdown functionality
 */

import {
    hasModelExtension
} from "../shared/constants.js";

import { 
    handleError
} from "../shared/errorHandler.js";

import { 
    actions, 
    selectors 
} from "../shared/stateManager.js";

import { 
    fetchCacheHash, 
    fetchCacheInfo,
    scanModelFolders
} from "../shared/cacheApi.js";

import { 
    createDetailedInfoDisplay 
} from "./infoDisplay.js";

import {
    pullMetadata
} from "../shared/cacheApi.js";

import {
    createLabeledContainer,
    createCustomDropdown as createCacheDropdown,
    addDropdownStyles as addCacheDropdownStyles,
} from "./cacheUI.js";

/**
 * Creates the file selector dropdown section
 * @returns {Object} File selector object with container and dropdown elements
 */
export function createModelsFileSelector() {
    const selectorContainer = document.createElement('div');
    selectorContainer.style.marginBottom = '15px';

    const { container: selectorLabelContainer, label: selectorLabel } = createLabeledContainer('Select File:');

    // Create custom dropdown container
    const { container: selector, button: dropdownButton, menu: dropdownMenu } = createCacheDropdown();
    selector.id = 'cache-file-selector';
    
    // Add CSS for custom dropdown
    addCacheDropdownStyles();

    return {
        selectorContainer,
        selectorLabelContainer,
        selectorLabel,
        selector,
        dropdownButton,
        dropdownMenu
    };
}

/**
 * Sets up event handlers for the file selector dropdown
 * @param {Object} fileSelector - File selector object from createModelsFileSelector
 * @param {Object} actionButtons - Action buttons object
 * @param {HTMLElement} infoDisplay - Info display element
 * @param {Object} filterControls - Filter controls object
 */
export function setupFileSelectorEventHandlers(fileSelector, actionButtons, infoDisplay, filterControls) {
    const { dropdownButton, dropdownMenu, selector } = fileSelector;
    
    // Handle dropdown button click
    dropdownButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event from bubbling to document click handler
        
        const currentDropdownState = selectors.isDropdownOpen();
        actions.toggleDropdown(!currentDropdownState); // Toggle dropdown state
        
        if (!currentDropdownState) { // Opening dropdown
            // Position dropdown menu dynamically
            const rect = dropdownButton.getBoundingClientRect();
            dropdownMenu.style.left = `${rect.left}px`;
            dropdownMenu.style.top = `${rect.bottom}px`;
            dropdownMenu.style.width = `${rect.width}px`;
            dropdownMenu.style.display = 'block';
            dropdownButton.innerHTML = '<span>Select a file...</span><span>▲</span>';
        } else { // Closing dropdown
            dropdownMenu.style.display = 'none';
            dropdownButton.innerHTML = '<span>Select a file...</span><span>▼</span>';
            
            // Hide all submenus when closing dropdown
            document.querySelectorAll('.cache-dropdown-submenu').forEach(menu => {
                menu.style.display = 'none';
            });
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const isDropdownOpen = selectors.isDropdownOpen();
        if (!selector.contains(e.target) && !dropdownMenu.contains(e.target) && isDropdownOpen) {
            dropdownMenu.style.display = 'none';
            actions.toggleDropdown(false); // Close dropdown via state action
            const selectedHash = selectors.selectedHash();
            dropdownButton.innerHTML = selectedHash ? 
                dropdownButton.innerHTML.replace('▲', '▼') : 
                '<span>Select a file...</span><span>▼</span>';
            
            // Hide all submenus when closing dropdown
            document.querySelectorAll('.cache-dropdown-submenu').forEach(menu => {
                menu.style.display = 'none';
            });
        }
    });
}

/**
 * Merge filesystem scan results with cache data
 * @param {Object} filesystemData - Results from scanModelFolders
 * @param {Object} hashData - Cache hash data
 * @param {Object} infoData - Cache info data
 * @returns {Object} - Merged data with all files (cached and uncached)
 */
export function mergeFilesystemWithCache(filesystemData, hashData, infoData) {
    const mergedFiles = {};
    
    // Add all files from filesystem scan
    for (const [folderType, files] of Object.entries(filesystemData)) {
        if (Array.isArray(files)) {
            files.forEach(filePath => {
                if (hasModelExtension(filePath)) {
                    const hash = hashData[filePath] || null;
                    const info = hash ? infoData[hash] || {} : {};
                    
                    mergedFiles[filePath] = {
                        hash: hash,
                        info: info,
                        isCached: !!hash,
                        folderType: folderType
                    };
                }
            });
        }
    }
    
    // Add any cached files that might not have been found in filesystem scan
    // (edge case for files that might be in cache but moved/deleted)
    for (const [filePath, hash] of Object.entries(hashData)) {
        if (!mergedFiles[filePath]) {
            mergedFiles[filePath] = {
                hash: hash,
                info: infoData[hash] || {},
                isCached: true,
                folderType: 'unknown' // We can't determine folder type from cache alone
            };
        }
    }
    
    return mergedFiles;
}

/**
 * Sort files based on selected criteria
 * @param {Array} files - Array of file paths
 * @param {string} sortBy - Sort criteria
 * @param {Object} allFiles - File data object
 * @param {boolean} isDescending - Sort direction
 * @returns {Array} Sorted array of file paths
 */
export function sortFiles(files, sortBy, allFiles, isDescending = false) {
    return files.sort((a, b) => {
        const fileDataA = allFiles[a];
        const fileDataB = allFiles[b];
        const infoA = fileDataA ? fileDataA.info : {};
        const infoB = fileDataB ? fileDataB.info : {};
        
        let result = 0;
        
        switch (sortBy) {
            case 'name':
                result = a.localeCompare(b);
                break;
            case 'lastused': {
                const lastUsedA = (infoA && (infoA.lastUsed || infoA.last_accessed)) ? new Date(infoA.lastUsed || infoA.last_accessed) : new Date(0);
                const lastUsedB = (infoB && (infoB.lastUsed || infoB.last_accessed)) ? new Date(infoB.lastUsed || infoB.last_accessed) : new Date(0);
                result = lastUsedB - lastUsedA; // Most recent first by default
                break;
            }
            case 'size': {
                const sizeA = (infoA && infoA.file_size) ? infoA.file_size : 0;
                const sizeB = (infoB && infoB.file_size) ? infoB.file_size : 0;
                result = sizeB - sizeA; // Largest first by default
                break;
            }
            case 'type': {
                // Sort by folder type instead of Civitai model type
                const getFolderType = (path) => {
                    if (path.includes('/checkpoints/')) return 'checkpoints';
                    if (path.includes('/loras/')) return 'loras';
                    if (path.includes('/vae/')) return 'vae';
                    if (path.includes('/text_encoders/') || path.includes('/clip/')) return 'text_encoders';
                    if (path.includes('/diffusion_models/') || path.includes('/unet/')) return 'diffusion_models';
                    return 'unknown';
                };
                
                const typeA = getFolderType(a);
                const typeB = getFolderType(b);
                
                if (typeA !== typeB) {
                    result = typeA.localeCompare(typeB);
                } else {
                    result = a.localeCompare(b); // Secondary sort by name
                }
                break;
            }
            default:
                result = a.localeCompare(b);
        }
        
        // Apply descending order if requested
        return isDescending ? -result : result;
    });
}

/**
 * Organize files into folder structure
 * @param {Array} sortedFiles - Array of sorted file paths
 * @param {Object} allFiles - File data object
 * @returns {Object} Organized folder structure
 */
export function organizeFolderStructure(sortedFiles, allFiles) {
    const folderStructure = {};
    
    sortedFiles.forEach(filePath => {
        const fileData = allFiles[filePath];
        const { hash, info, isCached, folderType } = fileData || {};
        
        // Extract relative path based on folder structure rather than model type
        let relativePath = filePath;
        let detectedFolderType = folderType;
        
        // Determine folder type from path if not already determined
        if (!detectedFolderType || detectedFolderType === 'unknown') {
            if (filePath.includes('/checkpoints/')) {
                detectedFolderType = 'checkpoints';
            } else if (filePath.includes('/loras/')) {
                detectedFolderType = 'loras';
            } else if (filePath.includes('/vae/')) {
                detectedFolderType = 'vae';
            } else if (filePath.includes('/text_encoders/') || filePath.includes('/clip/')) {
                detectedFolderType = 'text_encoders';
            } else if (filePath.includes('/diffusion_models/') || filePath.includes('/unet/')) {
                detectedFolderType = 'diffusion_models';
            }
        }
        
        if (detectedFolderType && detectedFolderType !== 'unknown') {
            // Find the base directory in the path
            const pathParts = filePath.split('/');
            let baseDirIndex = -1;
            
            // Look for the folder type in the path
            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                if (part === detectedFolderType || 
                    (detectedFolderType === 'text_encoders' && part === 'clip') ||
                    (detectedFolderType === 'diffusion_models' && part === 'unet')) {
                    baseDirIndex = i;
                    break;
                }
            }
            
            if (baseDirIndex !== -1 && baseDirIndex < pathParts.length - 1) {
                // Extract the relative path from the base directory
                relativePath = pathParts.slice(baseDirIndex + 1).join('/');
            } else {
                // Fallback to just the filename if we can't find the base directory
                relativePath = pathParts[pathParts.length - 1];
            }
        } else {
            // For files not in recognized folders, just show the filename
            relativePath = filePath.split('/').pop() || filePath;
        }
        
        // Split the relative path into folder structure
        const pathParts = relativePath.split('/');
        const fileName = pathParts.pop(); // Remove filename
        const folderPath = pathParts.join('/');
        
        // Initialize folder structure
        if (!folderStructure[folderPath]) {
            folderStructure[folderPath] = [];
        }
        
        // Add file to the appropriate folder (include cached status)
        folderStructure[folderPath].push({
            hash: hash,
            fileName: fileName,
            fullPath: filePath,
            info: info || {},
            isCached: isCached || false
        });
    });
    
    return folderStructure;
}

/**
 * Create dropdown items from folder structure
 * @param {Object} folderStructure - Organized folder structure
 * @param {string} sortBy - Sort criteria
 * @param {Object} hashData - Cache hash data
 * @param {Object} infoData - Cache info data
 * @param {Object} fileSelector - File selector object
 * @param {Object} actionButtons - Action buttons object
 * @param {HTMLElement} infoDisplay - Info display element
 * @param {Object} filterControls - Filter controls object
 */
export function createDropdownItems(folderStructure, sortBy, hashData, infoData, fileSelector, actionButtons, infoDisplay, filterControls) {
    const { dropdownMenu, dropdownButton } = fileSelector;
    
    // Get sort direction from button
    const isDescending = filterControls.sortOrderButton.textContent === '↓';
    
    // Create a combined data structure for sortFiles
    const allFiles = {};
    Object.values(folderStructure).flat().forEach(file => {
        allFiles[file.fullPath] = {
            info: file.info,
            isCached: file.isCached
        };
    });
    
    // Sort folders and create dropdown items
    const sortedFolders = Object.keys(folderStructure).sort((a, b) => {
        // Empty folder (root files) should come first
        if (a === '') return -1;
        if (b === '') return 1;
        return a.localeCompare(b);
    });
    
    // Add root files first
    if (folderStructure['']) {
        const rootFiles = folderStructure[''];
        const rootFilePaths = rootFiles.map(file => file.fullPath);
        const sortedRootFilePaths = sortFiles(rootFilePaths, sortBy, allFiles, isDescending);
        
        // Create a map for quick lookup
        const rootFileMap = new Map();
        rootFiles.forEach(file => rootFileMap.set(file.fullPath, file));
        
        // Add files in sorted order
        sortedRootFilePaths.forEach(filePath => {
            const file = rootFileMap.get(filePath);
            if (file) {
                dropdownMenu.appendChild(createFileItem(file, fileSelector, actionButtons, infoDisplay, filterControls));
            }
        });
    }
    
    // Add folders (simplified for now - no submenus)
    sortedFolders.forEach(folderPath => {
        if (folderPath === '') return; // Skip root files, already added
        
        const files = folderStructure[folderPath];
        const folderItem = document.createElement('div');
        folderItem.className = 'cache-dropdown-item folder';
        folderItem.textContent = folderPath;
        
        const submenu = createSubmenu(files, sortBy, hashData, infoData, fileSelector, actionButtons, infoDisplay, filterControls);
        // Append submenu to document body instead of folder item to avoid clipping
        document.body.appendChild(submenu);
        
        let submenuTimeout;
        
        // Show submenu on hover with slight delay
        folderItem.addEventListener('mouseenter', (e) => {
            // Clear any existing timeout
            clearTimeout(submenuTimeout);
            
            // Hide all other submenus first
            document.querySelectorAll('.cache-dropdown-submenu').forEach(menu => {
                if (menu !== submenu) {
                    menu.style.display = 'none';
                }
            });
            
            // Position submenu next to the folder item
            const rect = folderItem.getBoundingClientRect();
            submenu.style.left = `${rect.right + 5}px`;
            submenu.style.top = `${rect.top}px`;
            
            // Show this submenu
            submenu.style.display = 'block';
        });
        
        // Keep submenu open when hovering over the submenu itself
        submenu.addEventListener('mouseenter', () => {
            clearTimeout(submenuTimeout);
            submenu.style.display = 'block';
        });
        
        // Hide submenu when leaving both folder and submenu
        folderItem.addEventListener('mouseleave', (e) => {
            submenuTimeout = setTimeout(() => {
                submenu.style.display = 'none';
            }, 150);
        });
        
        submenu.addEventListener('mouseleave', (e) => {
            submenuTimeout = setTimeout(() => {
                submenu.style.display = 'none';
            }, 150);
        });
        
        // Re-enter submenu cancels the hide timeout
        submenu.addEventListener('mouseenter', () => {
            clearTimeout(submenuTimeout);
        });
        
        // Re-enter folder cancels the hide timeout
        folderItem.addEventListener('mouseenter', () => {
            clearTimeout(submenuTimeout);
        });
        
        // Click handling for folders
        folderItem.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Hide all other submenus
            document.querySelectorAll('.cache-dropdown-submenu').forEach(menu => {
                if (menu !== submenu) {
                    menu.style.display = 'none';
                }
            });
            
            // Toggle this submenu
            if (submenu.style.display === 'block') {
                submenu.style.display = 'none';
            } else {
                // Position submenu next to the folder item
                const rect = folderItem.getBoundingClientRect();
                submenu.style.left = `${rect.right + 5}px`;
                submenu.style.top = `${rect.top}px`;
                submenu.style.display = 'block';
            }
        });
        
        dropdownMenu.appendChild(folderItem);
    });
}

/**
 * Create submenu for folder contents
 * @param {Array} files - Array of file objects
 * @param {string} sortBy - Sort criteria
 * @param {Object} hashData - Cache hash data
 * @param {Object} infoData - Cache info data
 * @param {Object} fileSelector - File selector object
 * @param {Object} actionButtons - Action buttons object
 * @param {HTMLElement} infoDisplay - Info display element
 * @param {Object} filterControls - Filter controls object
 * @returns {HTMLElement} Submenu element
 */
export function createSubmenu(files, sortBy, hashData, infoData, fileSelector, actionButtons, infoDisplay, filterControls) {
    const submenu = document.createElement('div');
    submenu.className = 'cache-dropdown-submenu';
    
    // Get sort direction from button
    const isDescending = filterControls.sortOrderButton.textContent === '↓';
    
    // Create a combined data structure for sortFiles
    const allFiles = {};
    files.forEach(file => {
        allFiles[file.fullPath] = {
            info: file.info,
            isCached: file.isCached
        };
    });
    
    // Sort files within the submenu using the same criteria
    const sortedSubFiles = files.map(file => file.fullPath);
    const sortedSubFilePaths = sortFiles(sortedSubFiles, sortBy, allFiles, isDescending);
    
    // Create a map for quick lookup
    const fileMap = new Map();
    files.forEach(file => fileMap.set(file.fullPath, file));
    
    // Add files in sorted order
    sortedSubFilePaths.forEach(filePath => {
        const file = fileMap.get(filePath);
        if (file) {
            const fileItem = createFileItem(file, fileSelector, actionButtons, infoDisplay, filterControls);
            submenu.appendChild(fileItem);
        }
    });
    
    return submenu;
}

/**
 * Create individual file item for dropdown
 * @param {Object} file - File object
 * @param {Object} fileSelector - File selector object
 * @param {Object} actionButtons - Action buttons object
 * @param {HTMLElement} infoDisplay - Info display element
 * @param {Object} filterControls - Filter controls object
 * @returns {HTMLElement} File item element
 */
export function createFileItem(file, fileSelector, actionButtons, infoDisplay, filterControls) {
    const { dropdownButton, dropdownMenu } = fileSelector;
    const { pullButton, editButton } = actionButtons;
    
    const item = document.createElement('div');
    item.className = 'cache-dropdown-item file';
    
    // Handle both cached and uncached models
    if (file.isCached) {
        item.dataset.hash = file.hash;
    } else {
        item.dataset.uncachedPath = file.fullPath;
    }
    
    let displayName = file.fileName;
    
    // Show model type from cache if available
    if (file.info && file.info.model && file.info.model.type) {
        displayName += ` [${file.info.model.type}]`;
    }
    
    // Add visual indicator for uncached models
    if (!file.isCached) {
        displayName += ' (uncached)';
        item.style.fontStyle = 'italic';
        item.style.color = '#999';
    }
    
    item.textContent = displayName;
    item.title = file.fullPath + (file.isCached ? '' : ' - Click to cache model information');
    
    item.addEventListener('click', async () => {
        if (file.isCached) {
            // Handle cached model selection
            actions.selectModel(file.hash);
            dropdownButton.innerHTML = `<span>${displayName}</span><span>▼</span>`;
            dropdownMenu.style.display = 'none';
            actions.toggleDropdown(false);
            
            // Hide all submenus when selecting a file
            document.querySelectorAll('.cache-dropdown-submenu').forEach(menu => {
                menu.style.display = 'none';
            });
            
            // Enable buttons when a file is selected
            if (pullButton) {
                pullButton.disabled = false;
                pullButton.style.opacity = '1';
            }
            if (editButton) {
                editButton.disabled = false;
                editButton.style.opacity = '1';
            }
            
            // Show loading while creating info display
            infoDisplay.innerHTML = '<div style="text-align: center; padding: 20px; color: #888; font-style: italic;">Loading model information...</div>';
            
            // Update info display - use selector to get current selected hash
            const selectedHash = selectors.selectedHash();
            const cacheData = selectors.cacheData();
            const selectedInfo = cacheData.info[selectedHash];
            const showNsfw = filterControls.nsfwCheckbox.checked;
            
            // Use proper detailed info display
            try {
                const infoElement = await createDetailedInfoDisplay(selectedHash, selectedInfo, showNsfw);
                infoDisplay.innerHTML = '';
                infoDisplay.appendChild(infoElement);
            } catch (error) {
                console.error('Error updating info display:', error);
                infoDisplay.innerHTML = `
                    <div style="padding: 15px; background: #2a2a2a; border-radius: 8px; margin: 10px 0;">
                        <h3 style="margin: 0 0 10px 0; color: #569cd6;">Error loading model information</h3>
                        <p>Failed to update display: ${error.message}</p>
                    </div>
                `;
            }
        } else {
            // Handle uncached model - automatically pull metadata
            dropdownButton.innerHTML = `<span>Processing ${file.fileName}...</span><span>▼</span>`;
            dropdownMenu.style.display = 'none';
            actions.toggleDropdown(false);
            
            infoDisplay.innerHTML = '<div style="text-align: center; padding: 20px; color: #569cd6; font-style: italic;">🔄 Automatically pulling metadata for uncached model...</div>';
            
            try {
                // Automatically pull metadata for uncached model
                const result = await pullMetadata(file.fullPath);
                
                if (result.success) {
                    // Refresh the file list to show the newly cached model
                    // This needs to be handled by the parent component
                    // For now, show success message
                    infoDisplay.innerHTML = `
                        <div style="padding: 15px; background: #2d4a2d; border-radius: 8px; margin: 10px 0; border: 1px solid #4CAF50;">
                            <h3 style="margin: 0 0 10px 0; color: #4CAF50;">✅ Model Cached Successfully</h3>
                            <p><strong>File:</strong> ${file.fileName}</p>
                            <p><strong>Hash:</strong> ${result.hash || 'Generated'}</p>
                            <p>Model information has been cached. Please refresh the list to see the updated model.</p>
                        </div>
                    `;
                } else {
                    throw new Error(result.error || 'Unknown error occurred');
                }
            } catch (error) {
                console.error('Error auto-pulling metadata:', error);
                infoDisplay.innerHTML = `
                    <div style="padding: 15px; background: #4a2d2d; border-radius: 8px; margin: 10px 0; border: 1px solid #F44336;">
                        <h3 style="margin: 0 0 10px 0; color: #F44336;">❌ Failed to Cache Model</h3>
                        <p><strong>File:</strong> ${file.fileName}</p>
                        <p><strong>Error:</strong> ${error.message}</p>
                        <p>You can try again by clicking the Pull button or manually refreshing the list.</p>
                    </div>
                `;
                dropdownButton.innerHTML = '<span>Select a file...</span><span>▼</span>';
            }
        }
    });
    
    return item;
}

/**
 * Main function to update the file list dropdown
 * @param {Object} fileSelector - File selector object
 * @param {Object} filterControls - Filter controls object
 * @param {Object} actionButtons - Action buttons object
 * @param {HTMLElement} infoDisplay - Info display element
 * @param {Function} onRefreshCallback - Optional callback to call after successful refresh
 */
export async function updateFileList(fileSelector, filterControls, actionButtons, infoDisplay, onRefreshCallback = null) {
    try {
        const { dropdownMenu, dropdownButton } = fileSelector;
        
        // Show loading state
        infoDisplay.innerHTML = '<div style="text-align: center; padding: 20px; color: #888; font-style: italic;">Loading models from filesystem and cache...</div>';

        // Clean up any existing submenus
        document.querySelectorAll('.cache-dropdown-submenu').forEach(menu => {
            menu.remove();
        });

        // Get current filter type to optimize filesystem scan
        const filterType = filterControls.filterSelector.value;
        
        // Determine which folders to scan based on filter
        let foldersToScan = ['all'];
        if (filterType !== 'all') {
            foldersToScan = [filterType];
        }

        // Fetch cache data, info data, and filesystem scan in parallel
        const [hashData, infoData, filesystemData] = await Promise.all([
            fetchCacheHash(),
            fetchCacheInfo(),
            scanModelFolders(foldersToScan)
        ]);

        // Merge filesystem scan with cache data
        const allFiles = mergeFilesystemWithCache(filesystemData, hashData, infoData);

        // Store cache data in state management (for compatibility)
        actions.setCacheData({ hash: hashData, info: infoData });

        // Clear and populate dropdown menu
        dropdownMenu.innerHTML = '';
        dropdownButton.innerHTML = '<span>Select a file...</span><span>▼</span>';
        actions.selectModel(null);

        // Get current filter values
        const searchTerm = filterControls.searchInput.value.toLowerCase().trim();
        const lastUsedFilter = filterControls.lastUsedSelector.value;
        const updateFilter = filterControls.updateSelector.value;
        const sortBy = filterControls.sortSelector.value;

        // Filter files based on criteria
        const filteredFiles = Object.keys(allFiles).filter(filePath => {
            const fileData = allFiles[filePath];
            const { hash, info, isCached, folderType } = fileData;
            
            // Check folder type filter (already handled by filesystem scan optimization, but double-check)
            if (filterType !== 'all') {
                // Extract folder type from file path as fallback
                let detectedFolderType = folderType;
                if (!detectedFolderType || detectedFolderType === 'unknown') {
                    if (filePath.includes('/checkpoints/')) {
                        detectedFolderType = 'checkpoints';
                    } else if (filePath.includes('/loras/')) {
                        detectedFolderType = 'loras';
                    } else if (filePath.includes('/vae/')) {
                        detectedFolderType = 'vae';
                    } else if (filePath.includes('/text_encoders/') || filePath.includes('/clip/')) {
                        detectedFolderType = 'text_encoders';
                    } else if (filePath.includes('/diffusion_models/') || filePath.includes('/unet/')) {
                        detectedFolderType = 'diffusion_models';
                    }
                }
                
                // If the folder type doesn't match the filter, exclude this file
                if (detectedFolderType !== filterType) {
                    return false;
                }
            }
            
            // Check search term filter
            if (searchTerm) {
                const fileName = filePath.split('/').pop() || '';
                const modelName = (info && info.model && info.model.name) || '';
                const versionName = (info && info.name) || '';
                
                const searchableText = `${fileName} ${modelName} ${versionName}`.toLowerCase();
                if (!searchableText.includes(searchTerm)) {
                    return false;
                }
            }
            
            // Check last used filter
            if (lastUsedFilter !== 'all') {
                const lastUsed = info && (info.lastUsed || info.last_accessed);
                
                if (lastUsedFilter === 'never') {
                    // Show models that have never been used
                    if (lastUsed) {
                        return false;
                    }
                } else {
                    // Show models used within the specified time frame
                    if (!lastUsed) {
                        return false;
                    }
                    
                    const lastUsedDate = new Date(lastUsed);
                    const now = new Date();
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                    
                    switch (lastUsedFilter) {
                        case 'today':
                            if (lastUsedDate < today) {
                                return false;
                            }
                            break;
                        case 'week':
                            if (lastUsedDate < weekAgo) {
                                return false;
                            }
                            break;
                        case 'month':
                            if (lastUsedDate < monthAgo) {
                                return false;
                            }
                            break;
                    }
                }
            }
            
            // Check update filter
            if (updateFilter !== 'all') {
                const hasUpdate = info && info.update_available;
                
                if (updateFilter === 'available') {
                    // Show only models with updates available
                    if (!hasUpdate) {
                        return false;
                    }
                } else if (updateFilter === 'none') {
                    // Show only models without updates available
                    if (hasUpdate) {
                        return false;
                    }
                }
            }
            
            return true;
        });

        // Sort files
        const isDescending = filterControls.sortOrderButton.textContent === '↓';
        const sortedFiles = sortFiles(filteredFiles, sortBy, allFiles, isDescending);
        
        if (sortedFiles.length === 0) {
            const filterText = filterType === 'all' ? 'model files' : `files from ${filterType} folder`;
            const noFilesItem = document.createElement('div');
            noFilesItem.className = 'cache-dropdown-item';
            noFilesItem.textContent = `No ${filterText} found`;
            noFilesItem.style.color = '#888';
            dropdownMenu.appendChild(noFilesItem);
            infoDisplay.innerHTML = `<div style="text-align: center; padding: 20px; color: #888;">No ${filterText} available</div>`;
            return;
        }

        // Organize files into folder structure
        const folderStructure = organizeFolderStructure(sortedFiles, allFiles);
        
        // Create dropdown items
        createDropdownItems(folderStructure, sortBy, hashData, infoData, fileSelector, actionButtons, infoDisplay, filterControls);

        infoDisplay.innerHTML = '<div style="text-align: center; padding: 20px; color: #888;">Select a file to view its information</div>';

        // Call refresh callback if provided
        if (onRefreshCallback && typeof onRefreshCallback === 'function') {
            onRefreshCallback();
        }

    } catch (error) {
        console.error('Error updating file list:', error);
        const { dropdownMenu } = fileSelector;
        dropdownMenu.innerHTML = '<div class="cache-dropdown-item" style="color: #f44336;">Error loading files</div>';
        infoDisplay.innerHTML = '<div style="text-align: center; padding: 20px; color: #f44336;">Error loading cache data</div>';
    }
}

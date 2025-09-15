/**
 * Models Tab - Handles model browsing, filtering, and information display
 */

import { 
    FILTER_OPTIONS, 
    BUTTON_CONFIGS
} from "../shared/config.js";

import {
    MODEL_FILE_EXTENSIONS,
    hasModelExtension
} from "../shared/constants.js";

import { notifications } from "../shared/notifications.js";

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
} from "../components/infoDisplay.js";

import { 
    escapeHtml,
    formatFileSize,
    generateHtmlContent,
    openHtmlReport
} from "../reports/reportGenerator.js";

import {
    confirmDialog,
    alertDialog,
    createDialog,
    createInlineProgressBar
} from "../components/dialogManager.js";

import {
    pullMetadata,
    updateCacheInfo
} from "../shared/cacheApi.js";

// Import shared UI components - will be created next
import {
    createHeader,
    createFilterSection,
    createSearchSection,
    createToggleSection,
    createLabeledContainer,
    createCustomDropdown as createCacheDropdown,
    createStyledButton,
    addDropdownStyles as addCacheDropdownStyles,
    createInfoDisplay
} from "../components/cacheUIComponents.js";

/**
 * Creates the Models tab header section
 * @returns {HTMLElement} Header element
 */
function createModelsHeader() {
    return createHeader('Model Browser', 'Browse cached models and their metadata');
}

/**
 * Creates the filter controls section for the Models tab
 * @returns {Object} Filter controls object with references to all filter elements
 */
function createModelsFilterControls() {
    // Create individual filter elements
    const { container: filterContainer, select: filterSelector } = createFilterSection('Folder:', FILTER_OPTIONS.folderType);
    const { container: searchContainer, input: searchInput } = createSearchSection('', 'Type to search models...');
    const { container: lastUsedContainer, select: lastUsedSelector } = createFilterSection('Last Used:', FILTER_OPTIONS.lastUsed);
    const { container: updateContainer, select: updateSelector } = createFilterSection('Updates:', FILTER_OPTIONS.updates);
    const { container: nsfwContainer, checkbox: nsfwCheckbox } = createToggleSection('Show NSFW Images', 'nsfw-toggle');

    // Update filter dropdown styling to match gallery
    [filterSelector, lastUsedSelector, updateSelector].forEach(select => {
        select.style.cssText = `
            width: 100%;
            padding: 4px 8px;
            background: #333;
            color: #fff;
            border: 1px solid #555;
            border-radius: 4px;
            font-size: 11px;
            cursor: pointer;
            margin-bottom: 0;
        `;
    });

    // Update filter labels to match gallery styling with middle alignment
    [filterContainer, lastUsedContainer, updateContainer].forEach(container => {
        const label = container.querySelector('label');
        if (label) {
            label.style.cssText = `
                display: block;
                color: #ccc;
                font-size: 11px;
                margin-bottom: 4px;
                font-weight: normal;
            `;
        }
        container.style.cssText = `
            margin-bottom: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
        `;
    });

    // Create sort dropdown (without direction options)
    const sortContainer = document.createElement('div');
    sortContainer.style.cssText = `
        display: flex;
        gap: 8px;
        align-items: center;
    `;

    const sortLabel = document.createElement('label');
    sortLabel.textContent = 'Sort:';
    sortLabel.style.cssText = `
        color: #ccc;
        font-size: 12px;
        min-width: 35px;
    `;

    const sortSelector = document.createElement('select');
    sortSelector.style.cssText = `
        flex: 1;
        padding: 4px 8px;
        background: #333;
        border: 1px solid #555;
        border-radius: 4px;
        color: white;
        font-size: 11px;
        cursor: pointer;
    `;

    // Add sort options without direction suffixes
    const baseSortOptions = [
        { value: 'name', text: 'Name' },
        { value: 'lastused', text: 'Last Used' },
        { value: 'size', text: 'File Size' },
        { value: 'type', text: 'Folder Type' }
    ];

    baseSortOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text;
        sortSelector.appendChild(optionElement);
    });

    // Create sort order button
    const sortOrderButton = document.createElement('button');
    sortOrderButton.textContent = '↑';
    sortOrderButton.title = 'Toggle sort direction (Ascending/Descending)';
    sortOrderButton.style.cssText = `
        background: #444;
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        min-width: 30px;
        transition: background-color 0.2s;
    `;

    sortOrderButton.addEventListener('mouseenter', () => {
        sortOrderButton.style.backgroundColor = '#555';
    });

    sortOrderButton.addEventListener('mouseleave', () => {
        sortOrderButton.style.backgroundColor = '#444';
    });

    sortContainer.appendChild(sortLabel);
    sortContainer.appendChild(sortSelector);
    sortContainer.appendChild(sortOrderButton);

    // Update NSFW checkbox styling to match gallery
    nsfwContainer.style.cssText = `
        margin-bottom: 0;
        display: flex;
        align-items: center;
        gap: 6px;
    `;
    
    const nsfwLabel = nsfwContainer.querySelector('label');
    if (nsfwLabel) {
        nsfwLabel.style.cssText = `
            color: #ccc;
            font-size: 11px;
            cursor: pointer;
            user-select: none;
            font-weight: normal;
        `;
    }
    
    nsfwCheckbox.style.cssText = `
        margin: 0;
        transform: scale(1.1);
    `;

    // Create main filters container with visual grouping
    const filtersMainContainer = document.createElement('div');
    filtersMainContainer.style.cssText = `
        background: #2a2a2a;
        border: 1px solid #444;
        border-radius: 6px;
        padding: 15px;
        margin-bottom: 15px;
    `;

    // Create filters header
    const filtersHeader = document.createElement('h4');
    filtersHeader.style.cssText = `
        margin: 0 0 10px 0;
        color: #4CAF50;
        font-size: 14px;
    `;
    filtersHeader.textContent = 'Folder & Search Options';

    // Search gets full width and moved to bottom
    searchContainer.style.cssText = `
        margin-top: 15px;
        display: flex;
        gap: 8px;
        align-items: center;
    `;
    
    // Clear any existing content and rebuild search container
    searchContainer.innerHTML = '';
    
    // Update search input styling to match gallery
    searchInput.style.cssText = `
        flex: 1;
        padding: 6px 10px;
        background: #333;
        border: 1px solid #555;
        border-radius: 4px;
        color: white;
        font-size: 12px;
    `;

    // Add search label for better UX
    const searchLabel = document.createElement('label');
    searchLabel.textContent = 'Search:';
    searchLabel.style.cssText = `
        color: #ccc;
        font-size: 12px;
        min-width: 50px;
        white-space: nowrap;
    `;
    
    // Build search container with label and input
    searchContainer.appendChild(searchLabel);
    searchContainer.appendChild(searchInput);

    // Create filters section (without sorting)
    const filtersContainer = document.createElement('div');
    filtersContainer.style.cssText = `
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 8px;
        margin-bottom: 10px;
        align-items: center;
    `;

    // Create filters subsection header
    const filtersSubHeader = document.createElement('label');
    filtersSubHeader.style.cssText = `
        color: #ccc;
        margin-bottom: 8px;
        font-size: 12px;
        font-weight: bold;
        display: block;
    `;
    filtersSubHeader.textContent = 'Filters';

    // Create sorting section
    const sortingContainer = document.createElement('div');
    sortingContainer.style.cssText = `
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 10px;
    `;

    // Assemble the filters container (filters first, then sorting, then search at bottom)
    filtersMainContainer.appendChild(filtersHeader);
    filtersMainContainer.appendChild(filtersSubHeader);
    filtersMainContainer.appendChild(filtersContainer);
    filtersMainContainer.appendChild(sortingContainer);
    filtersMainContainer.appendChild(searchContainer);

    // Add filters to the filters row
    filtersContainer.appendChild(filterContainer);
    filtersContainer.appendChild(lastUsedContainer);
    filtersContainer.appendChild(updateContainer);

    // Add sorting to the sorting row
    sortingContainer.appendChild(sortContainer);

    return {
        filtersMainContainer,
        searchContainer, 
        searchInput,
        filtersContainer,
        sortingContainer,
        filterContainer,
        filterSelector,
        sortContainer,
        sortSelector,
        sortOrderButton,
        lastUsedContainer,
        lastUsedSelector,
        updateContainer,
        updateSelector,
        nsfwContainer,
        nsfwCheckbox
    };
}

/**
 * Creates the file selector dropdown section
 * @returns {Object} File selector object with container and dropdown elements
 */
function createModelsFileSelector() {
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
 * Creates the action buttons section for the Models tab
 * @returns {Object} Action buttons object with all button references
 */
function createModelsActionButtons() {
    const refreshButton = createStyledButton(BUTTON_CONFIGS.refresh.text, BUTTON_CONFIGS.refresh.color, BUTTON_CONFIGS.refresh.icon);
    
    const pullButton = createStyledButton(BUTTON_CONFIGS.pull.text, BUTTON_CONFIGS.pull.color, BUTTON_CONFIGS.pull.icon);
    pullButton.disabled = true; // Initially disabled until a file is selected
    pullButton.style.opacity = '0.5';

    const editButton = createStyledButton(BUTTON_CONFIGS.edit.text, BUTTON_CONFIGS.edit.color, BUTTON_CONFIGS.edit.icon);
    editButton.disabled = true; // Initially disabled until a file is selected
    editButton.style.opacity = '0.5';

    const scanButton = createStyledButton(BUTTON_CONFIGS.scan.text, BUTTON_CONFIGS.scan.color, BUTTON_CONFIGS.scan.icon);

    const reportButton = createStyledButton(BUTTON_CONFIGS.report.text, BUTTON_CONFIGS.report.color, BUTTON_CONFIGS.report.icon);

    return {
        refreshButton,
        pullButton,
        editButton,
        scanButton,
        reportButton
    };
}

/**
 * Sets up event handlers for Models tab interactions
 * @param {Object} filterControls - Filter controls object from createModelsFilterControls
 * @param {Object} fileSelector - File selector object from createModelsFileSelector  
 * @param {Object} actionButtons - Action buttons object from createModelsActionButtons
 * @param {HTMLElement} infoDisplay - Info display element
 */
function setupModelsEventHandlers(filterControls, fileSelector, actionButtons, infoDisplay, progressBar) {
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
    
    // Add action button event handlers
    const { refreshButton, pullButton, editButton, scanButton, reportButton } = actionButtons;
    
    // Refresh button handler (already added above)
    refreshButton.addEventListener('click', updateFileList);
    
    // Pull button handler - pulls metadata from Civitai
    pullButton.addEventListener('click', async () => {
        const selectedHash = selectors.selectedHash();
        if (!selectedHash) {
            alertDialog('Please select a model first.', 'No Model Selected');
            return;
        }
        
        const cacheData = selectors.cacheData();
        const filePath = Object.keys(cacheData.hash).find(path => cacheData.hash[path] === selectedHash);
        
        if (!filePath) {
            alertDialog('Could not find file path for selected model.', 'Error');
            return;
        }
        
        try {
            pullButton.disabled = true;
            pullButton.textContent = 'Pulling...';
            pullButton.style.opacity = '0.6';
            
            const confirmed = await confirmDialog(
                `Pull latest metadata from Civitai for:\n${filePath.split('/').pop()}?`,
                'Pull Metadata'
            );
            
            if (confirmed) {
                // Show progress for metadata pull
                progressBar.updateTitle('Pulling Metadata');
                progressBar.reset();
                progressBar.show();
                
                progressBar.updateProgress(25, 'Connecting to Civitai...');
                await new Promise(resolve => setTimeout(resolve, 200));
                
                progressBar.updateProgress(50, 'Fetching model metadata...');
                await pullMetadata(filePath, false);
                
                progressBar.updateProgress(75, 'Refreshing local cache...');
                // Refresh the data and update display
                await updateFileList();
                
                progressBar.updateProgress(100, 'Metadata updated successfully!');
                
                alertDialog('Metadata pulled successfully!', 'Success');
            }
        } catch (error) {
            console.error('Error pulling metadata:', error);
            progressBar.hide();
            alertDialog(`Failed to pull metadata: ${error.message}`, 'Error');
        } finally {
            pullButton.disabled = false;
            pullButton.textContent = BUTTON_CONFIGS.pull.text;
            pullButton.style.opacity = '1';
        }
    });
    
    // Edit button handler - opens edit dialog for model info
    editButton.addEventListener('click', async () => {
        const selectedHash = selectors.selectedHash();
        if (!selectedHash) {
            alertDialog('Please select a model first.', 'No Model Selected');
            return;
        }
        
        const cacheData = selectors.cacheData();
        const selectedInfo = cacheData.info[selectedHash] || {};
        const filePath = Object.keys(cacheData.hash).find(path => cacheData.hash[path] === selectedHash);
        
        // Create edit dialog content
        const editContent = document.createElement('div');
        editContent.innerHTML = `
            <div style="padding: 20px; max-width: 600px;">
                <h3 style="margin: 0 0 15px 0; color: #569cd6;">Edit Model Information</h3>
                <p style="margin-bottom: 15px; color: #888;">File: ${filePath ? filePath.split('/').pop() : 'Unknown'}</p>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Model Name:</label>
                        <input type="text" id="edit-model-name" value="${escapeHtml(selectedInfo.model?.name || '')}" 
                               style="width: 100%; padding: 8px; background: #1a1a1a; border: 1px solid #444; border-radius: 4px; color: white;">
                        <small style="color: #888; font-size: 11px;">The main model name (e.g., "RealisticVision")</small>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Version Name:</label>
                        <input type="text" id="edit-version-name" value="${escapeHtml(selectedInfo.name || '')}" 
                               style="width: 100%; padding: 8px; background: #1a1a1a; border: 1px solid #444; border-radius: 4px; color: white;">
                        <small style="color: #888; font-size: 11px;">Version name (e.g., "v5.1", "Final")</small>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Model Type:</label>
                        <select id="edit-type" style="width: 100%; padding: 8px; background: #1a1a1a; border: 1px solid #444; border-radius: 4px; color: white;">
                            <option value="">Unknown</option>
                            <option value="Checkpoint" ${(selectedInfo.model?.type || selectedInfo.model_type) === 'Checkpoint' ? 'selected' : ''}>Checkpoint</option>
                            <option value="LORA" ${(selectedInfo.model?.type || selectedInfo.model_type) === 'LORA' ? 'selected' : ''}>LORA</option>
                            <option value="LyCORIS" ${(selectedInfo.model?.type || selectedInfo.model_type) === 'LyCORIS' ? 'selected' : ''}>LyCORIS</option>
                            <option value="TextualInversion" ${(selectedInfo.model?.type || selectedInfo.model_type) === 'TextualInversion' ? 'selected' : ''}>Textual Inversion</option>
                            <option value="VAE" ${(selectedInfo.model?.type || selectedInfo.model_type) === 'VAE' ? 'selected' : ''}>VAE</option>
                            <option value="Controlnet" ${(selectedInfo.model?.type || selectedInfo.model_type) === 'Controlnet' ? 'selected' : ''}>ControlNet</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Base Model:</label>
                        <select id="edit-base-model" style="width: 100%; padding: 8px; background: #1a1a1a; border: 1px solid #444; border-radius: 4px; color: white;">
                            <option value="">Unknown</option>
                            <option value="SD 1.5" ${(selectedInfo.baseModel || selectedInfo.base_model) === 'SD 1.5' ? 'selected' : ''}>SD 1.5</option>
                            <option value="SDXL 1.0" ${(selectedInfo.baseModel || selectedInfo.base_model) === 'SDXL 1.0' ? 'selected' : ''}>SDXL 1.0</option>
                            <option value="SD 2.1" ${(selectedInfo.baseModel || selectedInfo.base_model) === 'SD 2.1' ? 'selected' : ''}>SD 2.1</option>
                            <option value="Pony" ${(selectedInfo.baseModel || selectedInfo.base_model) === 'Pony' ? 'selected' : ''}>Pony</option>
                            <option value="Flux.1 D" ${(selectedInfo.baseModel || selectedInfo.base_model) === 'Flux.1 D' ? 'selected' : ''}>Flux.1 D</option>
                            <option value="Flux.1 S" ${(selectedInfo.baseModel || selectedInfo.base_model) === 'Flux.1 S' ? 'selected' : ''}>Flux.1 S</option>
                            <option value="Other" ${!['SD 1.5', 'SDXL 1.0', 'SD 2.1', 'Pony', 'Flux.1 D', 'Flux.1 S'].includes(selectedInfo.baseModel || selectedInfo.base_model) && (selectedInfo.baseModel || selectedInfo.base_model) ? 'selected' : ''}>Other</option>
                        </select>
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Description:</label>
                    <textarea id="edit-description" rows="4" 
                              style="width: 100%; padding: 8px; background: #1a1a1a; border: 1px solid #444; border-radius: 4px; color: white; resize: vertical;">${escapeHtml(selectedInfo.description || '')}</textarea>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Trigger Words (comma-separated):</label>
                    <input type="text" id="edit-triggers" value="${escapeHtml((selectedInfo.trainedWords || []).join(', '))}" 
                           style="width: 100%; padding: 8px; background: #1a1a1a; border: 1px solid #444; border-radius: 4px; color: white;">
                    <small style="color: #888; font-size: 11px;">Enter activation keywords or trigger words separated by commas</small>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Personal Notes:</label>
                    <textarea id="edit-notes" rows="3" 
                              style="width: 100%; padding: 8px; background: #1a1a1a; border: 1px solid #444; border-radius: 4px; color: white; resize: vertical;">${escapeHtml(selectedInfo.notes || '')}</textarea>
                    <small style="color: #888; font-size: 11px;">Your personal notes about this model (usage tips, quality, etc.)</small>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">
                            <input type="checkbox" id="edit-nsfw" ${selectedInfo.nsfw ? 'checked' : ''} 
                                   style="margin-right: 5px;">
                            NSFW Content
                        </label>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">
                            <input type="checkbox" id="edit-favorite" ${selectedInfo.favorite || selectedInfo.is_favorite ? 'checked' : ''} 
                                   style="margin-right: 5px;">
                            Mark as Favorite
                        </label>
                    </div>
                </div>
            </div>
        `;
        
        const dialog = createDialog({
            title: 'Edit Model Information',
            content: editContent,
            width: '700px'
        });
        
        // Add save and cancel buttons
        dialog.addFooterButton('Save', async () => {
            try {
                const modelName = document.getElementById('edit-model-name').value.trim();
                const versionName = document.getElementById('edit-version-name').value.trim();
                const modelType = document.getElementById('edit-type').value;
                const baseModel = document.getElementById('edit-base-model').value;
                const description = document.getElementById('edit-description').value.trim();
                const triggerText = document.getElementById('edit-triggers').value.trim();
                const notes = document.getElementById('edit-notes').value.trim();
                const nsfw = document.getElementById('edit-nsfw').checked;
                const favorite = document.getElementById('edit-favorite').checked;
                
                const triggers = triggerText ? triggerText.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];
                
                const updatedInfo = {
                    ...selectedInfo,
                    name: versionName, // This is the version name
                    description: description,
                    trainedWords: triggers,
                    notes: notes,
                    nsfw: nsfw,
                    favorite: favorite,
                    is_favorite: favorite // Support both formats
                };
                
                // Update model information properly
                if (modelName || modelType || baseModel) {
                    updatedInfo.model = {
                        ...selectedInfo.model,
                        ...(modelName && { name: modelName }), // Set model name correctly
                        ...(modelType && { type: modelType })
                    };
                    
                    if (baseModel) {
                        updatedInfo.baseModel = baseModel;
                        updatedInfo.base_model = baseModel;
                    }
                }
                
                await updateCacheInfo(selectedHash, updatedInfo);
                
                // Refresh data and update display
                await updateFileList();
                
                // Re-select the model to update the info display
                const fileElement = document.querySelector(`.cache-dropdown-item.file[data-hash="${selectedHash}"]`);
                if (fileElement) {
                    fileElement.click();
                }
                
                dialog.close();
                alertDialog('Model information updated successfully!', 'Success');
            } catch (error) {
                console.error('Error updating model info:', error);
                alertDialog(`Failed to update model information: ${error.message}`, 'Error');
            }
        }, { backgroundColor: '#4CAF50' });
        
        dialog.addFooterButton('Cancel', () => {
            dialog.close();
        }, { backgroundColor: '#666' });
        
        dialog.show();
    });
    
    // Scan button handler - opens comprehensive scan dialog
    scanButton.addEventListener('click', async () => {
        try {
            const { ModelScanDialog } = await import('../dialogs/modelScanDialog.js');
            const scanDialog = new ModelScanDialog({
                onScanComplete: () => {
                    // Refresh the file list after successful scan
                    updateFileList();
                }
            });
            
            await scanDialog.show();
        } catch (error) {
            console.error('Error opening scan dialog:', error);
            notifications.error('Failed to open scan dialog', error.message);
        }
    });
    
        // Report button handler - generates HTML report
    reportButton.addEventListener('click', async () => {
        try {
            reportButton.disabled = true;
            reportButton.textContent = 'Generating...';
            reportButton.style.opacity = '0.6';
            
            // Show progress bar and reset it
            progressBar.updateTitle('Generating Report');
            progressBar.reset();
            progressBar.show();
            
            const cacheData = selectors.cacheData();
            const hashData = cacheData.hash;
            const infoData = cacheData.info;
            
            if (!hashData || Object.keys(hashData).length === 0) {
                alertDialog('No model data available. Please refresh the cache first.', 'No Data');
                return;
            }
            
            // Update progress
            progressBar.updateProgress(10, 'Processing model data...');
            await new Promise(resolve => setTimeout(resolve, 100)); // Brief pause for UI update
            
            // Prepare models array for report generation
            const models = Object.keys(hashData).map(filePath => ({
                filePath: filePath,
                hash: hashData[filePath],
                info: infoData[hashData[filePath]] || {}
            }));
            
            // Update progress
            progressBar.updateProgress(20, `Processing ${models.length} models...`);
            await new Promise(resolve => setTimeout(resolve, 100)); // Brief pause for UI update
            
            // Get current filter selections from the models tab
            const currentSort = filterControls.sortSelector.value;
            const isDescending = filterControls.sortOrderButton.textContent === '↓';
            const currentFolderFilter = filterControls.filterSelector.value;
            
            // Build filter description for the report
            let filterDescription = '';
            if (currentFolderFilter !== 'all') {
                const selectedFilterOption = filterControls.filterSelector.options[filterControls.filterSelector.selectedIndex];
                filterDescription = `Filter: ${selectedFilterOption.text}`;
            }
            
            // Generate HTML report with detailed progress updates
            const htmlContent = await generateHtmlContent({
                models: models,
                title: 'SageUtils Model Cache Report',
                sortBy: currentSort,
                folderFilter: currentFolderFilter,
                filterDescription: filterDescription,
                sortDescription: ` • Sorted by: ${filterControls.sortSelector.options[filterControls.sortSelector.selectedIndex].text} (${isDescending ? 'Descending' : 'Ascending'})`,
                progressCallback: (progress, message) => {
                    // Map the HTML generation progress to the 40-95% range
                    const adjustedProgress = 40 + (progress * 0.55);
                    progressBar.updateProgress(adjustedProgress, message);
                }
            });
            
            // Final steps
            progressBar.updateProgress(95, 'Opening report...');
            await new Promise(resolve => setTimeout(resolve, 100)); // Brief pause for UI update
            
            // Open report in new window
            openHtmlReport(htmlContent, 'SageUtils Model Cache Report');
            
            progressBar.updateProgress(100, 'Report generated successfully!');
            
        } catch (error) {
            console.error('Error generating report:', error);
            progressBar.hide();
            alertDialog(`Failed to generate report: ${error.message}`, 'Error');
        } finally {
            reportButton.disabled = false;
            reportButton.textContent = BUTTON_CONFIGS.report.text;
            reportButton.style.opacity = '1';
        }
    });
    
    // Add filter change handlers
    filterControls.filterSelector.addEventListener('change', updateFileList);
    filterControls.searchInput.addEventListener('input', updateFileList);
    filterControls.lastUsedSelector.addEventListener('change', updateFileList);
    filterControls.updateSelector.addEventListener('change', updateFileList);
    filterControls.sortSelector.addEventListener('change', updateFileList);
    
    // Add sort order button handler
    filterControls.sortOrderButton.addEventListener('click', () => {
        // Toggle the sort order button
        const isDescending = filterControls.sortOrderButton.textContent === '↓';
        filterControls.sortOrderButton.textContent = isDescending ? '↑' : '↓';
        filterControls.sortOrderButton.title = isDescending ? 
            'Toggle sort direction (Ascending/Descending)' : 
            'Toggle sort direction (Descending/Ascending)';
        
        // Trigger re-sort
        updateFileList();
    });
    
    // NSFW checkbox should only affect the info display, not the file list
    filterControls.nsfwCheckbox.addEventListener('change', async () => {
        // Only update the info display if a model is currently selected
        const selectedHash = selectors.selectedHash();
        if (selectedHash) {
            const cacheData = selectors.cacheData();
            const selectedInfo = cacheData.info[selectedHash];
            const showNsfw = filterControls.nsfwCheckbox.checked;
            
            // Show loading while updating info display
            infoDisplay.innerHTML = '<div style="text-align: center; padding: 20px; color: #888; font-style: italic;">Updating display...</div>';
            
            // Update info display with new NSFW setting using the same approach as file selection
            try {
                const infoElement = await createDetailedInfoDisplay(selectedHash, selectedInfo, showNsfw);
                infoDisplay.innerHTML = '';
                infoDisplay.appendChild(infoElement);
            } catch (error) {
                console.error('Error updating info display:', error);
                // Fallback to basic display
                infoDisplay.innerHTML = `
                    <div style="padding: 15px; background: #2a2a2a; border-radius: 8px; margin: 10px 0;">
                        <h3 style="margin: 0 0 10px 0; color: #569cd6;">Error loading model information</h3>
                        <p>Failed to update display: ${error.message}</p>
                    </div>
                `;
            }
        }
    });
    
    // Initialize data loading
    updateFileList();
    
    /**
     * Merge filesystem scan results with cache data
     * @param {Object} filesystemData - Results from scanModelFolders
     * @param {Object} hashData - Cache hash data
     * @param {Object} infoData - Cache info data
     * @returns {Object} - Merged data with all files (cached and uncached)
     */
    function mergeFilesystemWithCache(filesystemData, hashData, infoData) {
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
    
    // Populate dropdown with files
    async function updateFileList() {
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

        } catch (error) {
            console.error('Error updating file list:', error);
            const { dropdownMenu } = fileSelector;
            dropdownMenu.innerHTML = '<div class="cache-dropdown-item" style="color: #f44336;">Error loading files</div>';
            infoDisplay.innerHTML = '<div style="text-align: center; padding: 20px; color: #f44336;">Error loading cache data</div>';
        }
    }
}

// Helper function to sort files based on selected criteria
function sortFiles(files, sortBy, allFiles, isDescending = false) {
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

// Helper function to organize files into folder structure
function organizeFolderStructure(sortedFiles, allFiles) {
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

// Helper function to create dropdown items
function createDropdownItems(folderStructure, sortBy, hashData, infoData, fileSelector, actionButtons, infoDisplay, filterControls) {
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

// Helper function to create submenu for folder contents
function createSubmenu(files, sortBy, hashData, infoData, fileSelector, actionButtons, infoDisplay, filterControls) {
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

// Helper function to create individual file item (extracted for reuse)
function createFileItem(file, fileSelector, actionButtons, infoDisplay, filterControls) {
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
                    await updateFileList();
                    
                    // Show success message
                    infoDisplay.innerHTML = `
                        <div style="padding: 15px; background: #2d4a2d; border-radius: 8px; margin: 10px 0; border: 1px solid #4CAF50;">
                            <h3 style="margin: 0 0 10px 0; color: #4CAF50;">✅ Model Cached Successfully</h3>
                            <p><strong>File:</strong> ${file.fileName}</p>
                            <p><strong>Hash:</strong> ${result.hash || 'Generated'}</p>
                            <p>Model information has been cached. You can now select it from the dropdown.</p>
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
 * Assembles the complete Models tab layout
 * @param {HTMLElement} container - Container element to populate
 * @param {Object} components - All tab components
 */
function assembleModelsTabLayout(container, components) {
    const {
        header,
        filterControls,
        fileSelector,
        actionButtons,
        infoDisplay
    } = components;

    // Clear container
    container.innerHTML = '';

    // Create main content container with gallery-style padding
    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = `
        padding: 15px;
    `;

    // Add header with reduced padding to match gallery
    header.style.padding = '10px 15px';
    container.appendChild(header);

    // Add organized filters section
    contentContainer.appendChild(filterControls.filtersMainContainer);

    // Add file selector
    contentContainer.appendChild(fileSelector.selectorContainer);
    fileSelector.selectorContainer.appendChild(fileSelector.selectorLabelContainer);
    fileSelector.selectorContainer.appendChild(fileSelector.selector);

    // Add action buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        gap: 8px;
        margin-bottom: 15px;
        flex-wrap: wrap;
    `;
    
    Object.values(actionButtons).forEach(button => {
        buttonContainer.appendChild(button);
    });
    contentContainer.appendChild(buttonContainer);

    // Add progress bar (initially hidden)
    const progressBar = createInlineProgressBar({
        title: 'Operation Progress',
        initialMessage: 'Ready...'
    });
    contentContainer.appendChild(progressBar.container);

    // Add NSFW checkbox right above model information
    contentContainer.appendChild(filterControls.nsfwContainer);

    // Add info display
    contentContainer.appendChild(infoDisplay);
    
    // Add content container to main container
    container.appendChild(contentContainer);
    
    // Store progress bar reference for use in event handlers
    container._progressBar = progressBar;
    
    return progressBar; // Return progress bar for event handler setup
}

/**
 * Main function to create the Models tab
 * @param {HTMLElement} container - Container element to populate
 */
export function createModelsTab(container) {
    // Create all components
    const header = createModelsHeader();
    const filterControls = createModelsFilterControls();
    const fileSelector = createModelsFileSelector();
    const actionButtons = createModelsActionButtons();
    const infoDisplay = createInfoDisplay();

    // Assemble the layout first (this creates the progress bar)
    const progressBar = assembleModelsTabLayout(container, {
        header,
        filterControls,
        fileSelector,
        actionButtons,
        infoDisplay
    });

    // Set up event handlers after layout assembly (so progress bar exists)
    setupModelsEventHandlers(filterControls, fileSelector, actionButtons, infoDisplay, progressBar);
}

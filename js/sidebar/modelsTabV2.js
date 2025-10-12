/**
 * Models Tab V2 - Redesigned with ModelBrowser component
 * Replaces dropdown selector with browser-style list
 * Reorganizes actions by scope (multi-model vs single-model)
 * Uses component system for better maintainability
 */

// Import component libraries
import { createButton, createConfigButton, BUTTON_VARIANTS } from "../components/buttons.js";
import { createSelect, createInput } from "../components/formElements.js";
import { createSection, createCard, createFlexContainer } from "../components/layout.js";
import { createInlineProgressBar } from "../components/progressBar.js";
import { confirmDialog, alertDialog, createDialog } from "../components/dialogManager.js";
import { createDetailedInfoDisplay } from "../components/infoDisplay.js";
import { copyToClipboard } from "../components/clipboard.js";

// Import new ModelBrowser component
import { ModelBrowser } from "../file/modelBrowser.js";

// Import shared modules
import { FILTER_OPTIONS } from "../shared/config.js";
import { notifications } from "../shared/notifications.js";
import { handleError } from "../shared/errorHandler.js";
import { selectors, actions } from "../shared/stateManager.js";

// Import API functions
import { pullMetadata, updateCacheInfo } from "../shared/api/cacheApi.js";

// Import utilities
import { escapeHtml, generateHtmlContent, openHtmlReport } from "../reports/reportGenerator.js";

/**
 * Creates the unified header section with filters and actions
 * @param {Function} onRefresh - Refresh button callback
 * @param {Function} onScan - Scan button callback
 * @param {Function} onReport - Report button callback
 * @returns {Object} Header section and all control references
 */
function createHeaderAndControls(onRefresh, onScan, onReport) {
    const section = createSection('Model Browser', null, {
        collapsible: false,
        padding: '12px',  // Control the content padding
        style: {
            marginBottom: '15px'
        }
    });
    
    // Get the content area to append our controls to
    const contentArea = section.querySelector('div:last-child');
    
    // Helper to create labeled select
    const createLabeledSelect = (labelText, items) => {
        const container = document.createElement('div');
        const label = document.createElement('label');
        label.textContent = labelText;
        label.style.cssText = `
            display: block;
            color: #ccc;
            font-size: 11px;
            margin-bottom: 4px;
        `;
        const select = createSelect({
            items: items,
            style: {
                width: '100%'
            }
        });
        container.appendChild(label);
        container.appendChild(select);
        return { container, select };
    };
    
    // Create filter grid
    const filterGrid = document.createElement('div');
    filterGrid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 10px;
        margin-bottom: 10px;
    `;
    
    // Folder type filter
    const { container: folderContainer, select: folderSelect } = createLabeledSelect('Folder:', FILTER_OPTIONS.folderType);
    
    // Last used filter
    const { container: lastUsedContainer, select: lastUsedSelect } = createLabeledSelect('Last Used:', FILTER_OPTIONS.lastUsed);
    
    // Updates filter
    const { container: updatesContainer, select: updatesSelect } = createLabeledSelect('Updates:', FILTER_OPTIONS.updates);
    
    filterGrid.appendChild(folderContainer);
    filterGrid.appendChild(lastUsedContainer);
    filterGrid.appendChild(updatesContainer);
    
    // Create sort controls
    const sortContainer = createFlexContainer({
        gap: '8px',
        alignItems: 'center',
        styles: {
            marginBottom: '8px'  // Space before search input
        }
    });
    
    const sortLabel = document.createElement('label');
    sortLabel.textContent = 'Sort:';
    sortLabel.style.cssText = `
        color: #ccc;
        font-size: 12px;
        min-width: 40px;
    `;
    
    const sortSelect = createSelect({
        items: [
            { value: 'name', text: 'Name' },
            { value: 'lastused', text: 'Last Used' },
            { value: 'size', text: 'File Size' },
            { value: 'type', text: 'Folder Type' }
        ],
        style: {
            flex: '1'
        }
    });
    
    const sortOrderButton = createButton('↑', () => {
        const isDescending = sortOrderButton.textContent === '↓';
        sortOrderButton.textContent = isDescending ? '↑' : '↓';
        sortOrderButton.title = isDescending ? 
            'Ascending (click to change)' : 
            'Descending (click to change)';
    }, {
        variant: BUTTON_VARIANTS.SECONDARY,
        title: 'Toggle sort direction',
        styles: {
            minWidth: '40px',
            padding: '6px 8px'
        }
    });
    
    sortContainer.appendChild(sortLabel);
    sortContainer.appendChild(sortSelect);
    sortContainer.appendChild(sortOrderButton);
    
    // Create search input
    const searchInput = createInput({
        type: 'text',
        placeholder: 'Search models by name or path...',
        style: {
            width: '100%',
            marginTop: '8px',     // Space from sort controls
            marginBottom: '8px'   // Space before buttons
        }
    });
    
    // Create action buttons (below search)
    const buttonContainer = createFlexContainer({
        gap: '8px',
        wrap: true,
        styles: {
            marginTop: '0',
            marginBottom: '0'
        }
    });
    
    const refreshButton = createConfigButton('refresh');
    refreshButton.setAttribute('data-test', 'refresh-btn');
    refreshButton.addEventListener('click', onRefresh);
    
    const scanButton = createConfigButton('scan');
    scanButton.setAttribute('data-test', 'scan-btn');
    scanButton.addEventListener('click', onScan);
    
    const reportButton = createConfigButton('report');
    reportButton.setAttribute('data-test', 'report-btn');
    reportButton.addEventListener('click', onReport);
    
    buttonContainer.appendChild(refreshButton);
    buttonContainer.appendChild(scanButton);
    buttonContainer.appendChild(reportButton);
    
    // Assemble section - append to contentArea, not section
    contentArea.appendChild(filterGrid);
    contentArea.appendChild(sortContainer);
    contentArea.appendChild(searchInput);
    contentArea.appendChild(buttonContainer);
    
    // Restore persisted filter values from state
    const savedFilters = selectors.modelFilters();
    if (savedFilters) {
        if (savedFilters.type) {
            folderSelect.value = savedFilters.type;
        }
        if (savedFilters.lastUsed) {
            lastUsedSelect.value = savedFilters.lastUsed;
        }
        if (savedFilters.updates) {
            updatesSelect.value = savedFilters.updates;
        }
        if (savedFilters.search) {
            searchInput.value = savedFilters.search;
        }
        if (savedFilters.sort) {
            const sortValue = savedFilters.sort.replace(/-desc$/, '');
            const isDescending = savedFilters.sort.endsWith('-desc');
            
            sortSelect.value = sortValue;
            sortOrderButton.textContent = isDescending ? '↓' : '↑';
        }
    }
    
    return {
        section,
        folderSelect,
        lastUsedSelect,
        updatesSelect,
        sortSelect,
        sortOrderButton,
        searchInput,
        refreshButton,
        scanButton,
        reportButton
    };
}

/**
 * Creates single-model action buttons (in info panel)
 * These actions require a model to be selected
 * @param {string} modelHash - Currently selected model hash
 * @param {string} modelPath - Currently selected model path
 * @param {Function} onPull - Pull metadata callback
 * @param {Function} onEdit - Edit info callback
 * @returns {HTMLElement} Action buttons container
 */
function createSingleModelActions(modelHash, modelPath, onPull, onEdit) {
    const container = createFlexContainer({
        gap: '8px',
        wrap: true,
        styles: {
            marginBottom: '15px'
        }
    });
    
    // Pull metadata button
    const pullButton = createConfigButton('pull');
    pullButton.setAttribute('data-test', 'pull-btn');
    pullButton.addEventListener('click', onPull);
    container.appendChild(pullButton);
    
    // Edit info button
    const editButton = createConfigButton('edit');
    editButton.setAttribute('data-test', 'edit-btn');
    editButton.addEventListener('click', onEdit);
    container.appendChild(editButton);
    
    // Copy hash button
    const copyHashButton = createButton('Copy Hash', () => {
        copyToClipboard(modelHash, 'Model hash copied to clipboard!');
    }, {
        variant: BUTTON_VARIANTS.SECONDARY
    });
    copyHashButton.setAttribute('data-test', 'copy-hash-btn');
    container.appendChild(copyHashButton);
    
    // Copy path button
    const copyPathButton = createButton('Copy Path', () => {
        copyToClipboard(modelPath, 'Model path copied to clipboard!');
    }, {
        variant: BUTTON_VARIANTS.SECONDARY
    });
    copyPathButton.setAttribute('data-test', 'copy-path-btn');
    container.appendChild(copyPathButton);
    
    return container;
}

/**
 * Creates NSFW toggle (inline, compact version for gallery header)
 * @param {boolean} initialValue - Initial toggle state
 * @param {Function} onChange - Change callback
 * @returns {HTMLElement} NSFW toggle container
 */
function createNsfwToggle(initialValue, onChange) {
    const container = document.createElement('div');
    container.style.cssText = `
        display: flex;
        align-items: center;
        gap: 6px;
    `;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'nsfw-toggle-v2';
    checkbox.checked = initialValue;
    checkbox.style.cssText = `
        margin: 0;
        cursor: pointer;
    `;
    
    const label = document.createElement('label');
    label.htmlFor = 'nsfw-toggle-v2';
    label.textContent = 'Show NSFW';
    label.style.cssText = `
        color: #ccc;
        font-size: 11px;
        cursor: pointer;
        user-select: none;
    `;
    
    checkbox.addEventListener('change', () => {
        onChange(checkbox.checked);
    });
    
    container.appendChild(checkbox);
    container.appendChild(label);
    
    return container;
}

/**
 * Creates the model info display with integrated actions
 * @param {string} modelHash - Model hash
 * @param {Object} modelInfo - Model information
 * @param {string} modelPath - Model file path
 * @param {boolean} showNsfw - Whether to show NSFW images
 * @param {Object} callbacks - Action callbacks
 * @returns {Promise<HTMLElement>} Info display container
 */
async function createModelInfoPanel(modelHash, modelInfo, modelPath, showNsfw, callbacks) {
    const container = createCard({
        padding: '15px',
        styles: {
            marginTop: '15px'
        }
    });
    
    // Add model-specific actions at the top
    const actionsSection = createSingleModelActions(
        modelHash,
        modelPath,
        callbacks.onPull,
        callbacks.onEdit
    );
    container.appendChild(actionsSection);
    
    // Create NSFW toggle
    const nsfwToggle = createNsfwToggle(showNsfw, callbacks.onNsfwToggle);
    
    // Add detailed info display
    try {
        const infoDisplay = await createDetailedInfoDisplay(modelHash, modelInfo, showNsfw);
        container.appendChild(infoDisplay);
        
        // Move NSFW toggle to the gallery header spot if it exists
        const nsfwSpot = infoDisplay.querySelector('#nsfw-toggle-spot');
        if (nsfwSpot) {
            nsfwSpot.appendChild(nsfwToggle);
        } else {
            // Fallback: add it at the top if no gallery was created
            const fallbackContainer = document.createElement('div');
            fallbackContainer.style.cssText = `
                margin-bottom: 15px;
                padding: 10px;
                background: #2a2a2a;
                border-radius: 4px;
            `;
            fallbackContainer.appendChild(nsfwToggle);
            container.insertBefore(fallbackContainer, infoDisplay);
        }
    } catch (error) {
        console.error('Error creating info display:', error);
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            padding: 20px;
            background: #3a2a2a;
            border: 1px solid #f44336;
            border-radius: 4px;
            color: #f44336;
        `;
        errorDiv.textContent = `Error loading model information: ${error.message}`;
        container.appendChild(errorDiv);
    }
    
    return container;
}

/**
 * Creates empty state display when no model is selected
 * @returns {HTMLElement} Empty state element
 */
function createEmptyInfoPanel() {
    const container = createCard({
        padding: '40px 20px',
        styles: {
            marginTop: '15px',
            textAlign: 'center'
        }
    });
    
    const icon = document.createElement('div');
    icon.style.cssText = `
        font-size: 48px;
        margin-bottom: 15px;
        opacity: 0.5;
    `;
    icon.textContent = '📦';
    
    const message = document.createElement('div');
    message.style.cssText = `
        color: #888;
        font-size: 14px;
        font-style: italic;
    `;
    message.textContent = 'Select a model to view details';
    
    container.appendChild(icon);
    container.appendChild(message);
    
    return container;
}

/**
 * Opens the edit metadata dialog
 * @param {string} modelHash - Model hash
 * @param {Object} modelInfo - Current model information
 * @param {string} filePath - Model file path
 * @param {Function} onSave - Save callback
 */
async function openEditDialog(modelHash, modelInfo, filePath, onSave) {
    const fileName = filePath.split('/').pop();
    
    // Create dialog content
    const content = document.createElement('div');
    content.innerHTML = `
        <div style="padding: 20px; max-width: 600px;">
            <h3 style="margin: 0 0 15px 0; color: #569cd6;">Edit Model Information</h3>
            <p style="margin-bottom: 15px; color: #888;">File: ${escapeHtml(fileName)}</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Model Name:</label>
                    <input type="text" id="edit-model-name" value="${escapeHtml(modelInfo.model?.name || '')}" 
                           style="width: 100%; padding: 8px; background: #1a1a1a; border: 1px solid #444; border-radius: 4px; color: white;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Version Name:</label>
                    <input type="text" id="edit-version-name" value="${escapeHtml(modelInfo.name || '')}" 
                           style="width: 100%; padding: 8px; background: #1a1a1a; border: 1px solid #444; border-radius: 4px; color: white;">
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Model Type:</label>
                    <select id="edit-type" style="width: 100%; padding: 8px; background: #1a1a1a; border: 1px solid #444; border-radius: 4px; color: white;">
                        <option value="">Unknown</option>
                        <option value="Checkpoint" ${(modelInfo.model?.type || modelInfo.model_type) === 'Checkpoint' ? 'selected' : ''}>Checkpoint</option>
                        <option value="LORA" ${(modelInfo.model?.type || modelInfo.model_type) === 'LORA' ? 'selected' : ''}>LORA</option>
                        <option value="LyCORIS" ${(modelInfo.model?.type || modelInfo.model_type) === 'LyCORIS' ? 'selected' : ''}>LyCORIS</option>
                        <option value="TextualInversion" ${(modelInfo.model?.type || modelInfo.model_type) === 'TextualInversion' ? 'selected' : ''}>Textual Inversion</option>
                        <option value="VAE" ${(modelInfo.model?.type || modelInfo.model_type) === 'VAE' ? 'selected' : ''}>VAE</option>
                        <option value="Controlnet" ${(modelInfo.model?.type || modelInfo.model_type) === 'Controlnet' ? 'selected' : ''}>ControlNet</option>
                    </select>
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Base Model:</label>
                    <select id="edit-base-model" style="width: 100%; padding: 8px; background: #1a1a1a; border: 1px solid #444; border-radius: 4px; color: white;">
                        <option value="">Unknown</option>
                        <option value="SD 1.5" ${(modelInfo.baseModel || modelInfo.base_model) === 'SD 1.5' ? 'selected' : ''}>SD 1.5</option>
                        <option value="SDXL 1.0" ${(modelInfo.baseModel || modelInfo.base_model) === 'SDXL 1.0' ? 'selected' : ''}>SDXL 1.0</option>
                        <option value="SD 2.1" ${(modelInfo.baseModel || modelInfo.base_model) === 'SD 2.1' ? 'selected' : ''}>SD 2.1</option>
                        <option value="Pony" ${(modelInfo.baseModel || modelInfo.base_model) === 'Pony' ? 'selected' : ''}>Pony</option>
                        <option value="Flux.1 D" ${(modelInfo.baseModel || modelInfo.base_model) === 'Flux.1 D' ? 'selected' : ''}>Flux.1 D</option>
                        <option value="Flux.1 S" ${(modelInfo.baseModel || modelInfo.base_model) === 'Flux.1 S' ? 'selected' : ''}>Flux.1 S</option>
                    </select>
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Description:</label>
                <textarea id="edit-description" rows="4" 
                          style="width: 100%; padding: 8px; background: #1a1a1a; border: 1px solid #444; border-radius: 4px; color: white; resize: vertical;">${escapeHtml(modelInfo.description || '')}</textarea>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Trigger Words (comma-separated):</label>
                <input type="text" id="edit-triggers" value="${escapeHtml((modelInfo.trainedWords || []).join(', '))}" 
                       style="width: 100%; padding: 8px; background: #1a1a1a; border: 1px solid #444; border-radius: 4px; color: white;">
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Personal Notes:</label>
                <textarea id="edit-notes" rows="3" 
                          style="width: 100%; padding: 8px; background: #1a1a1a; border: 1px solid #444; border-radius: 4px; color: white; resize: vertical;">${escapeHtml(modelInfo.notes || '')}</textarea>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="edit-nsfw" ${modelInfo.nsfw ? 'checked' : ''}>
                    <span>NSFW Content</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="edit-favorite" ${modelInfo.favorite || modelInfo.is_favorite ? 'checked' : ''}>
                    <span>Mark as Favorite</span>
                </label>
            </div>
        </div>
    `;
    
    const dialog = createDialog({
        title: 'Edit Model Information',
        content: content,
        width: '700px'
    });
    
    // Add save button
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
                ...modelInfo,
                name: versionName,
                description: description,
                trainedWords: triggers,
                notes: notes,
                nsfw: nsfw,
                favorite: favorite,
                is_favorite: favorite
            };
            
            // Update model information
            if (modelName || modelType || baseModel) {
                updatedInfo.model = {
                    ...modelInfo.model,
                    ...(modelName && { name: modelName }),
                    ...(modelType && { type: modelType })
                };
                
                if (baseModel) {
                    updatedInfo.baseModel = baseModel;
                    updatedInfo.base_model = baseModel;
                }
            }
            
            await updateCacheInfo(modelHash, updatedInfo);
            
            dialog.close();
            
            if (onSave) {
                await onSave();
            }
            
            alertDialog('Model information updated successfully!', 'Success');
        } catch (error) {
            console.error('Error updating model info:', error);
            alertDialog(`Failed to update model information: ${error.message}`, 'Error');
        }
    }, { backgroundColor: '#4CAF50' });
    
    // Add cancel button
    dialog.addFooterButton('Cancel', () => {
        dialog.close();
    }, { backgroundColor: '#666' });
    
    dialog.show();
}

/**
 * Opens the model scan dialog
 */
async function openScanDialog() {
    try {
        const { ModelScanDialog } = await import('../dialogs/modelScanDialog.js');
        const scanDialog = new ModelScanDialog({
            onScanComplete: () => {
                // Dialog will handle its own refresh
            }
        });
        
        await scanDialog.show();
    } catch (error) {
        console.error('Error opening scan dialog:', error);
        notifications.error('Failed to open scan dialog', error.message);
    }
}

/**
 * Main function to create the Models Tab V2
 * @param {HTMLElement} container - Container element to populate
 */
export function createModelsTabV2(container) {
    // Clear container
    container.innerHTML = '';
    container.className = 'models-tab-v2';
    
    // Set up progress bar (initially hidden)
    const progressBar = createInlineProgressBar({
        title: 'Operation Progress',
        initialMessage: 'Ready...'
    });
    
    // Track current state
    let selectedModelHash = null;
    let currentFilters = selectors.modelFilters() || {};
    let showNsfw = currentFilters.showNsfw !== undefined ? currentFilters.showNsfw : false;
    
    // Create unified header with filters and actions
    const headerControls = createHeaderAndControls(
        // Refresh handler
        async () => {
            await loadModels();
        },
        // Scan handler
        async () => {
            await openScanDialog();
        },
        // Report handler
        async () => {
            await generateReport();
        }
    );
    container.appendChild(headerControls.section);
    
    // Create ModelBrowser
    const modelBrowser = new ModelBrowser({
        selectionMode: 'single',
        showFileSize: true,
        showLastUsed: true,
        allowQuickActions: true,
        maxHeight: '400px',
        onSelect: async (hash, modelData) => {
            selectedModelHash = hash;
            await updateInfoDisplay(hash, modelData);
        },
        onQuickAction: async (action, hash) => {
            switch (action) {
                case 'copyHash':
                    // Already handled by component
                    break;
                case 'pull':
                    await pullModelMetadata(hash);
                    break;
                case 'edit':
                    await editModelInfo(hash);
                    break;
            }
        }
    });
    
    modelBrowser.render(container);
    
    // Add progress bar
    container.appendChild(progressBar.container);
    
    // Create info display container
    const infoDisplayContainer = document.createElement('div');
    infoDisplayContainer.className = 'model-info-container';
    container.appendChild(infoDisplayContainer);
    
    // Show empty state initially
    infoDisplayContainer.appendChild(createEmptyInfoPanel());
    
    // ==================== Event Handlers ====================
    
    /**
     * Loads models from cache and updates browser
     */
    async function loadModels() {
        try {
            const cacheData = selectors.cacheData();
            
            console.log('[ModelsTabV2] loadModels called, cacheData:', cacheData);
            
            if (!cacheData || !cacheData.hash) {
                console.warn('[ModelsTabV2] No cache data or hash found');
                modelBrowser.updateModels([]);
                return;
            }
            
            // Convert cache data to model array and deduplicate by hash
            // This handles cases where symbolic links create multiple paths to the same file
            const modelsByHash = new Map();
            
            Object.keys(cacheData.hash).forEach(filePath => {
                const hash = cacheData.hash[filePath];
                
                // Only keep the first path encountered for each hash
                if (!modelsByHash.has(hash)) {
                    modelsByHash.set(hash, {
                        hash: hash,
                        path: filePath,
                        info: cacheData.info[hash] || {}
                    });
                } else {
                    // Optional: prefer shorter paths or non-symlink paths
                    const existing = modelsByHash.get(hash);
                    // If new path is shorter, use it (likely the real path)
                    if (filePath.length < existing.path.length) {
                        modelsByHash.set(hash, {
                            hash: hash,
                            path: filePath,
                            info: cacheData.info[hash] || {}
                        });
                    }
                }
            });
            
            const models = Array.from(modelsByHash.values());
            
            console.log('[ModelsTabV2] Loaded models:', models.length, '(deduplicated from', Object.keys(cacheData.hash).length, 'paths)');
            
            modelBrowser.updateModels(models);
            applyCurrentFilters();
        } catch (error) {
            console.error('[ModelsTabV2] Error loading models:', error);
            notifications.error('Failed to load models', error.message);
        }
    }
    
    /**
     * Applies current filters to the model browser
     */
    function applyCurrentFilters() {
        const sortValue = headerControls.sortSelect.value;
        const isDescending = headerControls.sortOrderButton.textContent === '↓';
        
        const filters = {
            search: headerControls.searchInput.value,
            type: headerControls.folderSelect.value,
            lastUsed: headerControls.lastUsedSelect.value,
            updates: headerControls.updatesSelect.value,
            sort: isDescending ? `${sortValue}-desc` : sortValue
        };
        
        currentFilters = filters;
        actions.updateFilters({ ...filters, showNsfw });
        
        modelBrowser.applyFilters(filters);
    }
    
    /**
     * Updates the info display for selected model
     */
    /**
     * Updates the info display for selected model
     * @param {string} hash - Model hash
     * @param {Object} modelData - Model data
     * @param {boolean} preserveScroll - Whether to preserve scroll position
     */
    async function updateInfoDisplay(hash, modelData, preserveScroll = false) {
        // Save scroll position if requested
        let scrollPosition = 0;
        let scrollContainer = null;
        
        if (preserveScroll && infoDisplayContainer.firstChild) {
            // Find the actual scrollable container (the tab content area)
            scrollContainer = container.closest('.tab-content-area');
            if (scrollContainer) {
                scrollPosition = scrollContainer.scrollTop;
            }
        }
        
        infoDisplayContainer.innerHTML = '';
        
        if (!hash || !modelData) {
            infoDisplayContainer.appendChild(createEmptyInfoPanel());
            return;
        }
        
        try {
            const infoPanel = await createModelInfoPanel(
                hash,
                modelData.info,
                modelData.path,
                showNsfw,
                {
                    onPull: () => pullModelMetadata(hash),
                    onEdit: () => editModelInfo(hash),
                    onNsfwToggle: async (checked) => {
                        showNsfw = checked;
                        actions.updateFilters({ ...currentFilters, showNsfw });
                        // Preserve scroll when toggling NSFW
                        await updateInfoDisplay(hash, modelData, true);
                    }
                }
            );
            
            infoDisplayContainer.appendChild(infoPanel);
            
            // Restore scroll position if requested
            if (preserveScroll && scrollContainer && scrollPosition > 0) {
                // Use setTimeout to ensure DOM is fully rendered
                setTimeout(() => {
                    scrollContainer.scrollTop = scrollPosition;
                }, 0);
            }
        } catch (error) {
            console.error('Error updating info display:', error);
            const errorPanel = createCard({
                padding: '20px',
                styles: {
                    marginTop: '15px',
                    background: '#3a2a2a',
                    border: '1px solid #f44336'
                }
            });
            errorPanel.innerHTML = `<div style="color: #f44336;">Error loading model information: ${error.message}</div>`;
            infoDisplayContainer.appendChild(errorPanel);
        }
    }
    
    /**
     * Pulls metadata for a model from Civitai
     */
    async function pullModelMetadata(hash) {
        try {
            const cacheData = selectors.cacheData();
            const filePath = Object.keys(cacheData.hash).find(path => cacheData.hash[path] === hash);
            
            if (!filePath) {
                alertDialog('Could not find file path for selected model.', 'Error');
                return;
            }
            
            const fileName = filePath.split('/').pop();
            const confirmed = await confirmDialog(
                `Pull latest metadata from Civitai for:\n${fileName}?`,
                'Pull Metadata'
            );
            
            if (!confirmed) return;
            
            progressBar.updateTitle('Pulling Metadata');
            progressBar.reset();
            progressBar.show();
            
            progressBar.updateProgress(25, 'Connecting to Civitai...');
            await new Promise(resolve => setTimeout(resolve, 200));
            
            progressBar.updateProgress(50, 'Fetching model metadata...');
            await pullMetadata(filePath, false);
            
            progressBar.updateProgress(75, 'Refreshing cache...');
            await loadModels();
            
            progressBar.updateProgress(100, 'Metadata updated successfully!');
            
            // Re-select the model to update display
            const modelData = modelBrowser.filteredModels.find(m => m.hash === hash);
            if (modelData) {
                await updateInfoDisplay(hash, modelData);
            }
            
            setTimeout(() => progressBar.hide(), 1500);
            
        } catch (error) {
            console.error('Error pulling metadata:', error);
            progressBar.hide();
            alertDialog(`Failed to pull metadata: ${error.message}`, 'Error');
        }
    }
    
    /**
     * Opens edit dialog for a model
     */
    async function editModelInfo(hash) {
        const cacheData = selectors.cacheData();
        const modelInfo = cacheData.info[hash] || {};
        const filePath = Object.keys(cacheData.hash).find(path => cacheData.hash[path] === hash);
        
        if (!filePath) {
            alertDialog('Could not find file path for selected model.', 'Error');
            return;
        }
        
        await openEditDialog(hash, modelInfo, filePath, async () => {
            await loadModels();
            
            // Re-select the model to update display
            const modelData = modelBrowser.filteredModels.find(m => m.hash === hash);
            if (modelData) {
                await updateInfoDisplay(hash, modelData);
            }
        });
    }
    
    /**
     * Generates HTML report
     */
    async function generateReport() {
        try {
            headerControls.reportButton.disabled = true;
            headerControls.reportButton.textContent = 'Generating...';
            
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
            
            progressBar.updateProgress(10, 'Processing model data...');
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const models = Object.keys(hashData).map(filePath => ({
                filePath: filePath,
                hash: hashData[filePath],
                info: infoData[hashData[filePath]] || {}
            }));
            
            progressBar.updateProgress(20, `Processing ${models.length} models...`);
            
            const sortValue = headerControls.sortSelect.value;
            const isDescending = headerControls.sortOrderButton.textContent === '↓';
            const reportSortBy = isDescending ? `${sortValue}-desc` : sortValue;
            
            const htmlContent = await generateHtmlContent({
                models: models,
                title: 'SageUtils Model Cache Report',
                sortBy: reportSortBy,
                folderFilter: headerControls.folderSelect.value,
                progressCallback: (progress, message) => {
                    const adjustedProgress = 40 + (progress * 0.55);
                    progressBar.updateProgress(adjustedProgress, message);
                }
            });
            
            progressBar.updateProgress(95, 'Opening report...');
            await new Promise(resolve => setTimeout(resolve, 100));
            
            openHtmlReport(htmlContent, 'SageUtils Model Cache Report');
            
            progressBar.updateProgress(100, 'Report generated successfully!');
            setTimeout(() => progressBar.hide(), 1500);
            
        } catch (error) {
            console.error('Error generating report:', error);
            progressBar.hide();
            alertDialog(`Failed to generate report: ${error.message}`, 'Error');
        } finally {
            headerControls.reportButton.disabled = false;
            headerControls.reportButton.textContent = 'Report';
        }
    }
    
    // ==================== Filter Event Listeners ====================
    
    headerControls.folderSelect.addEventListener('change', () => {
        applyCurrentFilters();
    });
    
    headerControls.lastUsedSelect.addEventListener('change', () => {
        applyCurrentFilters();
    });
    
    headerControls.updatesSelect.addEventListener('change', () => {
        applyCurrentFilters();
    });
    
    headerControls.sortSelect.addEventListener('change', () => {
        applyCurrentFilters();
    });
    
    headerControls.sortOrderButton.addEventListener('click', () => {
        applyCurrentFilters();
    });
    
    headerControls.searchInput.addEventListener('input', () => {
        applyCurrentFilters();
    });
    
    // ==================== Initialize ====================
    
    // Load initial data
    loadModels();
    
    // Store references for cleanup
    container._modelsTabV2 = {
        modelBrowser,
        progressBar,
        destroy: () => {
            if (modelBrowser) {
                modelBrowser.destroy();
            }
        }
    };
}

// Export for module compatibility
export default createModelsTabV2;

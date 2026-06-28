/**
 * Models Tab V2 - Redesigned with ModelBrowser component
 * Replaces dropdown selector with browser-style list
 * Reorganizes actions by scope (multi-model vs single-model)
 * Uses component system for better maintainability
 */

// Import component libraries
import { createButton, createConfigButton, BUTTON_VARIANTS } from "../components/buttons.js";
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
import { loadHtmlTemplate, renderHtmlTemplate, createElementFromTemplate } from "../utils/htmlTemplateLoader.js";
import { createComponentLogger } from "../utils/logger.js";
import { loadSidebarStyle } from './sidebarStyles.js';

console.log('[SageUtils] modelsTabV2.js imported');

// Component logger
const log = createComponentLogger('ModelsTabV2');

let modelsTabV2EmptyInfoPanelTemplate = null;
let modelsTabV2ErrorPanelTemplate = null;
let modelsTabV2EditDialogTemplate = null;
let modelsTabV2HeaderControlsTemplate = null;
let modelsTabV2NsfwToggleTemplate = null;

function buildSelectOptions(options, selectedValue) {
    return options.map(({ value, text }) => {
        const selectedAttribute = value === selectedValue ? ' selected' : '';
        return `<option value="${escapeHtml(value)}"${selectedAttribute}>${escapeHtml(text)}</option>`;
    }).join('');
}

async function getModelsTabV2HeaderControlsTemplate() {
    if (!modelsTabV2HeaderControlsTemplate) {
        modelsTabV2HeaderControlsTemplate = await loadHtmlTemplate('extensions/comfyui_sageutils/sidebar/partials/modelsTabV2HeaderControls.html');
    }
    return modelsTabV2HeaderControlsTemplate;
}

async function renderModelsTabV2HeaderControls(data) {
    const template = await getModelsTabV2HeaderControlsTemplate();
    return createElementFromTemplate(renderHtmlTemplate(template, data));
}

async function getModelsTabV2NsfwToggleTemplate() {
    if (!modelsTabV2NsfwToggleTemplate) {
        modelsTabV2NsfwToggleTemplate = await loadHtmlTemplate('extensions/comfyui_sageutils/sidebar/partials/modelsTabV2NsfwToggle.html');
    }
    return modelsTabV2NsfwToggleTemplate;
}

async function renderModelsTabV2NsfwToggle(data) {
    const template = await getModelsTabV2NsfwToggleTemplate();
    return createElementFromTemplate(renderHtmlTemplate(template, data));
}

async function getModelsTabV2EmptyInfoPanelTemplate() {
    if (!modelsTabV2EmptyInfoPanelTemplate) {
        modelsTabV2EmptyInfoPanelTemplate = await loadHtmlTemplate('extensions/comfyui_sageutils/sidebar/partials/modelsTabV2EmptyInfoPanel.html');
    }
    return modelsTabV2EmptyInfoPanelTemplate;
}

async function renderModelsTabV2EmptyInfoPanel() {
    const template = await getModelsTabV2EmptyInfoPanelTemplate();
    return createElementFromTemplate(renderHtmlTemplate(template, {}));
}

async function getModelsTabV2ErrorPanelTemplate() {
    if (!modelsTabV2ErrorPanelTemplate) {
        modelsTabV2ErrorPanelTemplate = await loadHtmlTemplate('extensions/comfyui_sageutils/sidebar/partials/modelsTabV2ErrorPanel.html');
    }
    return modelsTabV2ErrorPanelTemplate;
}

async function renderModelsTabV2ErrorPanel(message) {
    const template = await getModelsTabV2ErrorPanelTemplate();
    return createElementFromTemplate(renderHtmlTemplate(template, { message }));
}

async function getModelsTabV2EditDialogTemplate() {
    if (!modelsTabV2EditDialogTemplate) {
        modelsTabV2EditDialogTemplate = await loadHtmlTemplate('extensions/comfyui_sageutils/sidebar/partials/modelsTabV2EditDialog.html');
    }
    return modelsTabV2EditDialogTemplate;
}

async function renderModelsTabV2EditDialog(data) {
    const template = await getModelsTabV2EditDialogTemplate();
    return createElementFromTemplate(renderHtmlTemplate(template, data));
}

let modelsTabV2SingleModelActionsTemplate = null;

async function getModelsTabV2SingleModelActionsTemplate() {
    if (!modelsTabV2SingleModelActionsTemplate) {
        modelsTabV2SingleModelActionsTemplate = await loadHtmlTemplate('extensions/comfyui_sageutils/sidebar/partials/modelsTabV2SingleModelActions.html');
    }
    return modelsTabV2SingleModelActionsTemplate;
}

async function renderModelsTabV2SingleModelActions() {
    const template = await getModelsTabV2SingleModelActionsTemplate();
    return createElementFromTemplate(renderHtmlTemplate(template, {}));
}

/**
 * Creates the unified header section with filters and actions
 * @param {Function} onRefresh - Refresh button callback
 * @param {Function} onScan - Scan button callback
 * @param {Function} onReport - Report button callback
 * @returns {Object} Header section and all control references
 */
async function createHeaderAndControls(onRefresh, onScan, onReport) {
    const section = createSection('Model Browser', null, {
        collapsible: false,
        padding: '12px',  // Control the content padding
        style: {
            marginBottom: '15px'
        }
    });
    
    // Get the content area to append our controls to
    const contentArea = section.querySelector('div:last-child');

    // Create collapsible search/filter controls section
    const searchControlsSection = createSection('Search & Filters', null, {
        collapsible: true,
        collapsed: false,
        style: {
            marginBottom: '0'
        }
    });
    const searchControlsContent = searchControlsSection.querySelector('div:last-child');

    const headerTemplate = await renderModelsTabV2HeaderControls({
        folderOptions: buildSelectOptions(FILTER_OPTIONS.folderType, ''),
        lastUsedOptions: buildSelectOptions(FILTER_OPTIONS.lastUsed, ''),
        updatesOptions: buildSelectOptions(FILTER_OPTIONS.updates, ''),
        sortOptions: buildSelectOptions([
            { value: 'name', text: 'Name' },
            { value: 'lastused', text: 'Last Used' },
            { value: 'size', text: 'File Size' },
            { value: 'type', text: 'Folder Type' }
        ], '')
    });

    searchControlsContent.appendChild(headerTemplate);
    contentArea.appendChild(searchControlsSection);

    const folderSelect = section.querySelector('#models-v2-folder-select');
    const lastUsedSelect = section.querySelector('#models-v2-last-used-select');
    const updatesSelect = section.querySelector('#models-v2-updates-select');
    const sortSelect = section.querySelector('#models-v2-sort-select');
    const sortOrderButton = section.querySelector('#models-v2-sort-order-btn');
    const searchInput = section.querySelector('#models-v2-search-input');
    const refreshButton = section.querySelector('#models-v2-refresh-btn');
    const scanButton = section.querySelector('#models-v2-scan-btn');
    const reportButton = section.querySelector('#models-v2-report-btn');

    sortOrderButton.addEventListener('click', () => {
        const isDescending = sortOrderButton.textContent === '↓';
        sortOrderButton.textContent = isDescending ? '↑' : '↓';
        sortOrderButton.title = isDescending ?
            'Ascending (click to change)' :
            'Descending (click to change)';
    });

    refreshButton.addEventListener('click', onRefresh);
    scanButton.addEventListener('click', onScan);
    reportButton.addEventListener('click', onReport);

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
async function createSingleModelActions(modelHash, modelPath, onPull, onEdit) {
    const container = await renderModelsTabV2SingleModelActions();
    
    const pullButton = container.querySelector('#models-v2-pull-btn');
    const editButton = container.querySelector('#models-v2-edit-btn');
    const copyHashButton = container.querySelector('#models-v2-copy-hash-btn');
    const copyPathButton = container.querySelector('#models-v2-copy-path-btn');

    if (pullButton) {
        pullButton.addEventListener('click', onPull);
    }
    if (editButton) {
        editButton.addEventListener('click', onEdit);
    }
    if (copyHashButton) {
        copyHashButton.addEventListener('click', () => {
            copyToClipboard(modelHash, 'Model hash copied to clipboard!');
        });
    }
    if (copyPathButton) {
        copyPathButton.addEventListener('click', () => {
            copyToClipboard(modelPath, 'Model path copied to clipboard!');
        });
    }

    return container;
}

/**
 * Creates NSFW toggle (inline, compact version for gallery header)
 * @param {boolean} initialValue - Initial toggle state
 * @param {Function} onChange - Change callback
 * @returns {HTMLElement} NSFW toggle container
 */
async function createNsfwToggle(initialValue, onChange) {
    const toggleElement = await renderModelsTabV2NsfwToggle({
        nsfwChecked: initialValue ? 'checked' : ''
    });

    const checkbox = toggleElement.querySelector('#nsfw-toggle-v2');
    if (checkbox) {
        checkbox.addEventListener('change', () => {
            onChange(checkbox.checked);
        });
    }

    return toggleElement;
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
    const actionsSection = await createSingleModelActions(
        modelHash,
        modelPath,
        callbacks.onPull,
        callbacks.onEdit
    );
    container.appendChild(actionsSection);
    
    // Create NSFW toggle
    const nsfwToggle = await createNsfwToggle(showNsfw, callbacks.onNsfwToggle);
    
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
            fallbackContainer.className = 'models-v2-nsfw-fallback';
            fallbackContainer.appendChild(nsfwToggle);
            container.insertBefore(fallbackContainer, infoDisplay);
        }
    } catch (error) {
        console.error('Error creating info display:', error);
        const errorPanel = await renderModelsTabV2ErrorPanel(error.message);
        container.appendChild(errorPanel);
    }
    
    return container;
}

/**
 * Creates empty state display when no model is selected
 * @returns {Promise<HTMLElement>} Empty state element
 */
async function createEmptyInfoPanel() {
    return await renderModelsTabV2EmptyInfoPanel();
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

    const getValue = (value) => typeof value === 'string' ? value : '';
    const modelNameValue = getValue(modelInfo.model?.name || '');
    const versionNameValue = getValue(modelInfo.name || '');
    const modelTypeValue = getValue(modelInfo.model?.type || modelInfo.model_type || '');
    const baseModelValue = getValue(modelInfo.baseModel || modelInfo.base_model || '');
    const descriptionValue = getValue(modelInfo.description || '');
    const triggersValue = (modelInfo.trainedWords || []).join(', ');
    const notesValue = getValue(modelInfo.notes || '');
    const nsfwValue = Boolean(modelInfo.nsfw);
    const favoriteValue = Boolean(modelInfo.favorite || modelInfo.is_favorite);
    const blacklistValue = Boolean(modelInfo.blacklist);

    const typeOptions = [
        { value: '', text: 'Unknown' },
        { value: 'Checkpoint', text: 'Checkpoint' },
        { value: 'LORA', text: 'LORA' },
        { value: 'LyCORIS', text: 'LyCORIS' },
        { value: 'TextualInversion', text: 'Textual Inversion' },
        { value: 'VAE', text: 'VAE' },
        { value: 'Controlnet', text: 'ControlNet' }
    ];

    const baseModelOptions = [
        { value: '', text: 'Unknown' },
        { value: 'SD 1.5', text: 'SD 1.5' },
        { value: 'SDXL 1.0', text: 'SDXL 1.0' },
        { value: 'SD 2.1', text: 'SD 2.1' },
        { value: 'Pony', text: 'Pony' },
        { value: 'Flux.1 D', text: 'Flux.1 D' },
        { value: 'Flux.1 S', text: 'Flux.1 S' }
    ];

    const content = await renderModelsTabV2EditDialog({
        fileName: escapeHtml(fileName),
        modelNameValue: escapeHtml(modelNameValue),
        versionNameValue: escapeHtml(versionNameValue),
        descriptionValue: escapeHtml(descriptionValue),
        triggersValue: escapeHtml(triggersValue),
        notesValue: escapeHtml(notesValue),
        typeOptions: buildSelectOptions(typeOptions, modelTypeValue),
        baseModelOptions: buildSelectOptions(baseModelOptions, baseModelValue),
        nsfwChecked: nsfwValue ? 'checked' : '',
        favoriteChecked: favoriteValue ? 'checked' : '',
        blacklistChecked: blacklistValue ? 'checked' : ''
    });

    const dialog = createDialog({
        title: 'Edit Model Information',
        content: content,
        width: '700px'
    });

    dialog.addFooterButton('Save', async () => {
        try {
            const root = content;
            const modelName = root.querySelector('#edit-model-name').value.trim();
            const versionName = root.querySelector('#edit-version-name').value.trim();
            const modelType = root.querySelector('#edit-type').value;
            const baseModel = root.querySelector('#edit-base-model').value;
            const description = root.querySelector('#edit-description').value.trim();
            const triggerText = root.querySelector('#edit-triggers').value.trim();
            const notes = root.querySelector('#edit-notes').value.trim();
            const nsfw = root.querySelector('#edit-nsfw').checked;
            const favorite = root.querySelector('#edit-favorite').checked;
            const blacklist = root.querySelector('#edit-blacklist').checked;

            const triggers = triggerText ? triggerText.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];

            const updatedInfo = {
                ...modelInfo,
                name: versionName,
                description,
                trainedWords: triggers,
                notes,
                nsfw,
                favorite,
                is_favorite: favorite,
                blacklist
            };

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

            try {
                const currentCache = selectors.cacheData() || { hash: {}, info: {} };
                const newInfo = { ...(currentCache.info || {}), [modelHash]: updatedInfo };
                actions.setCacheData({ hash: currentCache.hash || {}, info: newInfo });
            } catch (e) {
                console.warn('State cache update after save failed (non-fatal):', e);
            }

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

    // Helper to repopulate form fields from modelInfo into the edit dialog DOM
    const populateEditForm = (info) => {
        const gV = (v) => typeof v === 'string' ? v : '';
        
        content.querySelector('#edit-model-name').value = gV(info.model?.name || '');
        content.querySelector('#edit-version-name').value = gV(info.name || '');
        content.querySelector('#edit-type').value = gV(info.model?.type || info.model_type || '');
        content.querySelector('#edit-base-model').value = gV(info.baseModel || info.base_model || '');
        content.querySelector('#edit-description').value = gV(info.description || '');
        content.querySelector('#edit-triggers').value = (info.trainedWords || []).join(', ');
        content.querySelector('#edit-notes').value = gV(info.notes || '');
        content.querySelector('#edit-nsfw').checked = Boolean(info.nsfw);
        content.querySelector('#edit-favorite').checked = Boolean(info.favorite || info.is_favorite);
        content.querySelector('#edit-blacklist').checked = Boolean(info.blacklist);

        // Keep the modelInfo reference in sync so Save uses fresh data too
        Object.assign(modelInfo, info);
    };

    dialog.addFooterButton('Scan', async () => {
        try {
            const result = await pullMetadata(filePath, false);
            
            if (!result.success) {
                alertDialog(result.error || 'Unable to retrieve model information.', 'Error');
                return;
            }
            
            // Read back the refreshed info from cache state and repopulate form fields
            try {
                const currentCache = selectors.cacheData() || { hash: {}, info: {} };
                const freshInfo = (currentCache.info && currentCache.info[modelHash]) || modelInfo;
                populateEditForm(freshInfo);
                alertDialog('Model information updated from scan!', 'Success');
            } catch (e) {
                console.warn('Could not refresh form after scan:', e);
                // Fallback: use whatever the API returned in result.info if available
                if (result && result.info) {
                    populateEditForm(result.info);
                    alertDialog('Model information updated from scan!', 'Success');
                } else {
                    alertDialog(
                        'Scan completed but could not refresh form fields. The data has been saved — close and reopen this dialog to see updates.',
                        'Info'
                    );
                }
            }
        } catch (error) {
            console.error('Error scanning model:', error);
            alertDialog(`Unable to retrieve information: ${error.message}`, 'Error');
        }
    }, { backgroundColor: '#2196F3' });

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
 * @example
 * // Basic usage
 * const container = document.getElementById('models-tab');
 * createModelsTabV2(container);
 * 
 * @example
 * // Typically called from tab manager
 * tabManager.addTab({
 *     id: 'models',
 *     label: 'Models',
 *     factory: (container) => createModelsTabV2(container)
 * });
 */
export async function createModelsTabV2(container) {
    // Clear container
    container.innerHTML = '';
    container.classList.add('models-tab-v2');
    loadSidebarStyle('models-v2-styles', 'extensions/comfyui_sageutils/sidebar/modelsTabV2.css');
    
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
    const headerControls = await createHeaderAndControls(
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
    infoDisplayContainer.appendChild(await createEmptyInfoPanel());
    
    // ==================== Event Handlers ====================
    
    /**
     * Loads models from cache and updates browser
     */
    async function loadModels() {
        try {
            const cacheData = selectors.cacheData();
            
            log.debug('loadModels called, cacheData:', cacheData);
            
            if (!cacheData || !cacheData.hash) {
                log.warn('No cache data or hash found');
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
            
            log.debug('Loaded models:', models.length, '(deduplicated from', Object.keys(cacheData.hash).length, 'paths)');
            
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
            infoDisplayContainer.appendChild(await createEmptyInfoPanel());
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
            const errorPanel = await renderModelsTabV2ErrorPanel(error.message);
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

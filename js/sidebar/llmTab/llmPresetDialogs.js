/**
 * LLM Preset Dialogs Component
 * Handles all preset and system prompt management dialogs
 */

import { createSelect } from '../../components/formElements.js';

/**
 * Show save preset dialog
 * @param {Object} state - Tab state object
 * @param {HTMLElement} modelSelection - Model selection section
 * @param {Function} loadPresets - Function to reload presets
 * @param {Function} showNotification - Notification function
 */
export async function showSavePresetDialog(state, modelSelection, loadPresets, showNotification) {
    const dialog = document.createElement('div');
    dialog.className = 'llm-modal-overlay';
    
    const content = document.createElement('div');
    content.className = 'llm-modal-content';
    
    const title = document.createElement('h3');
    title.textContent = 'Save Preset';
    title.className = 'llm-modal-title';
    
    const form = document.createElement('form');
    form.className = 'llm-preset-form';
    
    // Preset name
    const nameGroup = createFormGroup(
        'Preset Name',
        (() => {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'llm-input llm-preset-name-input';
            input.placeholder = 'e.g., My Custom Preset';
            input.required = true;
            return input;
        })()
    );
    
    // Description
    const descGroup = createFormGroup(
        'Description (optional)',
        (() => {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'llm-input llm-preset-desc-input';
            input.placeholder = 'e.g., For detailed image descriptions';
            return input;
        })()
    );
    
    // Category
    const categoryGroup = createFormGroup(
        'Category (optional)',
        (() => {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'llm-input llm-preset-category-input';
            input.placeholder = 'e.g., custom';
            input.value = 'custom';
            return input;
        })()
    );
    
    form.appendChild(nameGroup);
    form.appendChild(descGroup);
    form.appendChild(categoryGroup);
    
    // Buttons
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'llm-modal-buttons';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'llm-btn llm-btn-secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => dialog.remove());
    
    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.className = 'llm-btn llm-btn-primary';
    saveBtn.textContent = 'Save Preset';
    
    buttonGroup.appendChild(cancelBtn);
    buttonGroup.appendChild(saveBtn);
    
    form.appendChild(buttonGroup);
    
    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nameInput = form.querySelector('.llm-preset-name-input');
        const descInput = form.querySelector('.llm-preset-desc-input');
        const categoryInput = form.querySelector('.llm-preset-category-input');
        
        const name = nameInput.value.trim();
        const description = descInput.value.trim();
        const category = categoryInput.value.trim() || 'custom';
        
        if (!name) {
            showNotification('Preset name is required', 'error');
            return;
        }
        
        try {
            // Import preset module
            const presetModule = await import('../../llm/llmPresets.js');
            
            // Create preset from current state
            const presetData = presetModule.createPresetFromState(state, name, description, category);
            
            // Generate ID from name
            const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
            
            // Save preset
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            
            await presetModule.savePreset(id, presetData);
            
            // Reload presets
            await loadPresets(state, modelSelection);
            
            // Select the new preset
            const presetSelect = modelSelection.querySelector('.llm-preset-select');
            if (presetSelect) {
                presetSelect.value = id;
            }
            
            dialog.remove();
            showNotification(`Preset "${name}" saved successfully`, 'success');
            
        } catch (error) {
            console.error('Error saving preset:', error);
            showNotification(`Failed to save preset: ${error.message}`, 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Preset';
        }
    });
    
    content.appendChild(title);
    content.appendChild(form);
    dialog.appendChild(content);
    document.body.appendChild(dialog);
    
    // Focus name input
    setTimeout(() => {
        form.querySelector('.llm-preset-name-input').focus();
    }, 100);
    
    // Close on overlay click
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.remove();
        }
    });
}

/**
 * Show preset and system prompt management dialog
 * @param {Object} state - Tab state object
 * @param {HTMLElement} modelSelection - Model selection section
 * @param {HTMLElement} advancedOptions - Advanced options section
 * @param {HTMLElement} inputSection - Input section
 * @param {Function} loadPresets - Function to reload presets
 * @param {Function} applyPresetToUI - Function to apply preset
 * @param {Function} showNotification - Notification function
 */
export async function showManagePresetsDialog(state, modelSelection, advancedOptions, inputSection, loadPresets, applyPresetToUI, showNotification) {
    const dialog = document.createElement('div');
    dialog.className = 'llm-modal-overlay';
    
    const content = document.createElement('div');
    content.className = 'llm-modal-content llm-modal-large';
    
    const title = document.createElement('h3');
    title.textContent = 'Manage Presets & System Prompts';
    title.className = 'llm-modal-title';
    
    // Tab navigation
    const tabNav = document.createElement('div');
    tabNav.className = 'llm-tab-nav';
    
    const presetsTab = document.createElement('button');
    presetsTab.type = 'button';
    presetsTab.className = 'llm-tab-btn active';
    presetsTab.textContent = 'Presets';
    
    const systemPromptsTab = document.createElement('button');
    systemPromptsTab.type = 'button';
    systemPromptsTab.className = 'llm-tab-btn';
    systemPromptsTab.textContent = 'System Prompts';
    
    tabNav.appendChild(presetsTab);
    tabNav.appendChild(systemPromptsTab);
    
    // Tab content containers
    const tabContent = document.createElement('div');
    tabContent.className = 'llm-tab-content';
    
    const presetsPanel = createPresetsPanel(state, modelSelection, advancedOptions, inputSection, loadPresets, applyPresetToUI, showNotification, dialog);
    const systemPromptsPanel = createSystemPromptsPanel(state, modelSelection, advancedOptions, inputSection, showNotification, dialog);
    
    systemPromptsPanel.style.display = 'none';
    
    tabContent.appendChild(presetsPanel);
    tabContent.appendChild(systemPromptsPanel);
    
    // Tab switching
    presetsTab.addEventListener('click', () => {
        presetsTab.classList.add('active');
        systemPromptsTab.classList.remove('active');
        presetsPanel.style.display = 'block';
        systemPromptsPanel.style.display = 'none';
    });
    
    systemPromptsTab.addEventListener('click', () => {
        systemPromptsTab.classList.add('active');
        presetsTab.classList.remove('active');
        systemPromptsPanel.style.display = 'block';
        presetsPanel.style.display = 'none';
    });
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'llm-modal-close';
    closeBtn.innerHTML = '×';
    closeBtn.addEventListener('click', () => dialog.remove());
    
    content.appendChild(closeBtn);
    content.appendChild(title);
    content.appendChild(tabNav);
    content.appendChild(tabContent);
    dialog.appendChild(content);
    document.body.appendChild(dialog);
    
    // Close on overlay click
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.remove();
        }
    });
}

/**
 * Create presets management panel
 */
function createPresetsPanel(state, modelSelection, advancedOptions, inputSection, loadPresets, applyPresetToUI, showNotification, parentDialog) {
    const panel = document.createElement('div');
    panel.className = 'llm-presets-panel';
    
    const list = document.createElement('div');
    list.className = 'llm-preset-list';
    
    if (!state.presets || Object.keys(state.presets).length === 0) {
        list.innerHTML = '<p class="llm-placeholder">No presets available</p>';
    } else {
        Object.entries(state.presets).forEach(([id, preset]) => {
            const item = document.createElement('div');
            item.className = 'llm-preset-item';
            
            const info = document.createElement('div');
            info.className = 'llm-preset-info';
            
            const presetName = document.createElement('div');
            presetName.className = 'llm-preset-item-name';
            presetName.textContent = preset.name;
            if (preset.isBuiltin) {
                presetName.innerHTML = `⭐ ${preset.name} <span class="llm-builtin-badge">Built-in</span>`;
            } else if (preset.isUserOverride) {
                presetName.innerHTML = `✏️ ${preset.name} <span class="llm-builtin-badge llm-override-badge">Customized</span>`;
            }
            
            const presetDesc = document.createElement('div');
            presetDesc.className = 'llm-preset-item-desc';
            presetDesc.textContent = preset.description || 'No description';
            
            info.appendChild(presetName);
            info.appendChild(presetDesc);
            
            const actions = document.createElement('div');
            actions.className = 'llm-preset-item-actions';
            
            const applyBtn = document.createElement('button');
            applyBtn.className = 'llm-btn llm-btn-small llm-btn-primary';
            applyBtn.textContent = 'Apply';
            applyBtn.addEventListener('click', async () => {
                await applyPresetToUI(state, id, modelSelection, advancedOptions, inputSection);
                
                // Update preset dropdown
                const presetSelect = modelSelection.querySelector('.llm-preset-select');
                if (presetSelect) {
                    presetSelect.value = id;
                }
            });
            
            actions.appendChild(applyBtn);
            
            // Add Edit button for all presets
            const editBtn = document.createElement('button');
            editBtn.className = 'llm-btn llm-btn-small llm-btn-secondary';
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', async () => {
                await showPresetEditor(state, modelSelection, advancedOptions, inputSection, id, preset, loadPresets, showNotification);
            });
            actions.appendChild(editBtn);
            
            // Show delete only for custom presets or user overrides
            if (!preset.isBuiltin || preset.isUserOverride) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'llm-btn llm-btn-small llm-btn-danger';
                deleteBtn.textContent = preset.isUserOverride ? 'Reset' : 'Delete';
                deleteBtn.addEventListener('click', async () => {
                    const confirmMsg = preset.isUserOverride 
                        ? `Reset "${preset.name}" to default settings?`
                        : `Delete preset "${preset.name}"?`;
                    
                    if (confirm(confirmMsg)) {
                        try {
                            const presetModule = await import('../../llm/llmPresets.js');
                            await presetModule.deletePreset(id);
                            await loadPresets(state, modelSelection);
                            
                            // Refresh the dialog
                            if (parentDialog) {
                                parentDialog.remove();
                                await showManagePresetsDialog(state, modelSelection, advancedOptions, inputSection, loadPresets, applyPresetToUI, showNotification);
                            }
                            
                            const msg = preset.isUserOverride 
                                ? `Preset "${preset.name}" reset to defaults`
                                : `Preset "${preset.name}" deleted`;
                            showNotification(msg, 'success');
                        } catch (error) {
                            showNotification(`Failed to ${preset.isUserOverride ? 'reset' : 'delete'} preset: ${error.message}`, 'error');
                        }
                    }
                });
                actions.appendChild(deleteBtn);
            }
            
            item.appendChild(info);
            item.appendChild(actions);
            list.appendChild(item);
        });
    }
    
    panel.appendChild(list);
    return panel;
}

/**
 * Show preset editor dialog for creating or editing presets
 */
async function showPresetEditor(state, modelSelection, advancedOptions, inputSection, presetId = null, existingPreset = null, loadPresets, showNotification) {
    const presetModule = await import('../../llm/llmPresets.js');
    const { api } = await import('/scripts/api.js');
    
    // If editing a built-in, get the original for comparison
    const isEditingBuiltin = existingPreset && existingPreset.isBuiltin && !existingPreset.isUserOverride;
    const isEditingUserOverride = existingPreset && existingPreset.isUserOverride;
    
    // Create modal
    const dialog = document.createElement('div');
    dialog.className = 'llm-modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'llm-modal llm-preset-editor-modal';
    
    const title = document.createElement('h3');
    title.className = 'llm-modal-title';
    if (isEditingBuiltin) {
        title.textContent = `Customize "${existingPreset.name}"`;
    } else if (existingPreset) {
        title.textContent = `Edit "${existingPreset.name}"`;
    } else {
        title.textContent = 'Create New Preset';
    }
    
    modal.appendChild(title);
    
    // Note for built-in presets
    if (isEditingBuiltin) {
        const note = document.createElement('div');
        note.className = 'llm-info-message';
        note.innerHTML = '💡 <strong>Note:</strong> This will create a customized version that overrides the built-in preset. You can reset it to defaults later.';
        modal.appendChild(note);
    } else if (isEditingUserOverride) {
        const note = document.createElement('div');
        note.className = 'llm-info-message';
        note.innerHTML = '✏️ <strong>Editing customized version.</strong> Delete/Reset to restore built-in defaults.';
        modal.appendChild(note);
    }
    
    // Create form
    const form = document.createElement('form');
    form.className = 'llm-preset-editor-form';
    
    // Name field (read-only for built-ins)
    const nameGroup = createFormGroup(
        'Preset Name',
        (() => {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'llm-input llm-preset-name-input';
            input.placeholder = 'e.g., My Custom Preset';
            input.value = existingPreset ? existingPreset.name : '';
            if (isEditingBuiltin || isEditingUserOverride) {
                input.readOnly = true;
                input.style.opacity = '0.6';
            }
            input.required = true;
            return input;
        })()
    );
    
    // Description field
    const descGroup = createFormGroup(
        'Description',
        (() => {
            const input = document.createElement('textarea');
            input.className = 'llm-input llm-preset-desc-input';
            input.placeholder = 'Brief description of this preset...';
            input.value = existingPreset ? (existingPreset.description || '') : '';
            input.rows = 2;
            return input;
        })()
    );
    
    // Provider field
    const providerGroup = createFormGroup(
        'Provider',
        (() => {
            const select = createSelect({
                items: [
                    { value: 'ollama', text: 'Ollama' },
                    { value: 'lmstudio', text: 'LM Studio' }
                ],
                className: 'llm-select llm-preset-provider-select'
            });
            select.value = existingPreset ? existingPreset.provider : state.provider;
            return select;
        })()
    );
    
    // Model field - dropdown that updates based on provider
    const modelGroup = createFormGroup(
        'Model',
        (() => {
            const select = createSelect({
                items: [{ value: '', text: 'Loading models...' }],
                className: 'llm-select llm-preset-model-select'
            });
            
            // Function to load models for the selected provider
            const loadModelsForProvider = async (provider) => {
                try {
                    const response = await api.fetchApi('/sage_llm/models');
                    const data = await response.json();
                    
                    if (data.success) {
                        const models = data.data.models[provider] || [];
                        
                        // Get vision models to mark them
                        const visionResponse = await api.fetchApi('/sage_llm/vision_models');
                        const visionData = await visionResponse.json();
                        const visionModels = visionData.success ? (visionData.data.models[provider] || []) : [];
                        const visionModelSet = new Set(visionModels);
                        
                        // Clear and populate dropdown
                        const items = [{ value: '', text: 'Use current model' }];
                        models.forEach(model => {
                            const icon = visionModelSet.has(model) ? '👁️ ' : '';
                            items.push({ value: model, text: `${icon}${model}` });
                        });
                        
                        select.innerHTML = '';
                        items.forEach(item => {
                            const option = document.createElement('option');
                            option.value = item.value;
                            option.textContent = item.text;
                            select.appendChild(option);
                        });
                        
                        // Set the value if we have one
                        if (existingPreset && existingPreset.model) {
                            select.value = existingPreset.model;
                        }
                    } else {
                        select.innerHTML = '<option value="">Failed to load models</option>';
                    }
                } catch (error) {
                    console.error('Error loading models:', error);
                    select.innerHTML = '<option value="">Error loading models</option>';
                }
            };
            
            // Initial load
            const initialProvider = existingPreset ? existingPreset.provider : state.provider;
            loadModelsForProvider(initialProvider);
            
            return select;
        })()
    );
    
    // Prompt Template field
    const promptTemplateGroup = createFormGroup(
        'Prompt Template',
        (() => {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'llm-input llm-preset-template-input';
            input.placeholder = 'e.g., description/Descriptive Prompt';
            input.value = existingPreset ? (existingPreset.promptTemplate || '') : '';
            return input;
        })()
    );
    
    // System Prompt field
    const systemPromptGroup = createFormGroup(
        'System Prompt',
        (() => {
            const select = createSelect({
                items: [],
                className: 'llm-select llm-preset-sysprompt-select'
            });
            
            // Load system prompts
            presetModule.getSystemPrompts().then(prompts => {
                const items = [];
                Object.entries(prompts).forEach(([id, prompt]) => {
                    items.push({
                        value: id,
                        text: prompt.name + (prompt.isBuiltin ? ' ⭐' : '')
                    });
                });
                
                select.innerHTML = '';
                items.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.value;
                    option.textContent = item.text;
                    select.appendChild(option);
                });
                
                if (existingPreset && existingPreset.systemPrompt) {
                    select.value = existingPreset.systemPrompt;
                }
            });
            
            return select;
        })()
    );
    
    // Category field (hidden for built-ins)
    let categoryGroup = null;
    if (!isEditingBuiltin && !isEditingUserOverride) {
        categoryGroup = createFormGroup(
            'Category',
            (() => {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'llm-input llm-preset-category-input';
                input.placeholder = 'e.g., custom';
                input.value = existingPreset ? (existingPreset.category || 'custom') : 'custom';
                return input;
            })()
        );
    }
    
    // Settings section
    const settingsTitle = document.createElement('h4');
    settingsTitle.textContent = 'Settings';
    settingsTitle.style.marginTop = '1rem';
    
    const temperatureGroup = createFormGroup(
        'Temperature',
        (() => {
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'llm-input llm-preset-temperature-input';
            input.min = '0';
            input.max = '2';
            input.step = '0.1';
            input.value = existingPreset ? (existingPreset.settings?.temperature ?? 0.7) : 0.7;
            return input;
        })()
    );
    
    const maxTokensGroup = createFormGroup(
        'Max Tokens',
        (() => {
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'llm-input llm-preset-maxtokens-input';
            input.min = '1';
            input.value = existingPreset ? (existingPreset.settings?.maxTokens ?? 512) : 512;
            return input;
        })()
    );
    
    const seedGroup = createFormGroup(
        'Seed (-1 for random)',
        (() => {
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'llm-input llm-preset-seed-input';
            input.value = existingPreset ? (existingPreset.settings?.seed ?? -1) : -1;
            return input;
        })()
    );
    
    // Append all fields
    form.appendChild(nameGroup);
    form.appendChild(descGroup);
    form.appendChild(providerGroup);
    form.appendChild(modelGroup);
    form.appendChild(promptTemplateGroup);
    form.appendChild(systemPromptGroup);
    if (categoryGroup) form.appendChild(categoryGroup);
    form.appendChild(settingsTitle);
    form.appendChild(temperatureGroup);
    form.appendChild(maxTokensGroup);
    form.appendChild(seedGroup);
    
    // Buttons
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'llm-modal-buttons';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'llm-btn llm-btn-secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => dialog.remove());
    
    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.className = 'llm-btn llm-btn-primary';
    saveBtn.textContent = isEditingBuiltin ? 'Save Customization' : 'Save Preset';
    
    buttonGroup.appendChild(cancelBtn);
    buttonGroup.appendChild(saveBtn);
    
    form.appendChild(buttonGroup);
    
    // Set up provider change handler to reload models
    const providerSelectEl = form.querySelector('.llm-preset-provider-select');
    const modelSelectEl = form.querySelector('.llm-preset-model-select');
    
    if (providerSelectEl && modelSelectEl) {
        providerSelectEl.addEventListener('change', async () => {
            const selectedProvider = providerSelectEl.value;
            modelSelectEl.innerHTML = '<option value="">Loading models...</option>';
            
            try {
                const response = await api.fetchApi('/sage_llm/models');
                const data = await response.json();
                
                if (data.success) {
                    const models = data.data.models[selectedProvider] || [];
                    
                    // Get vision models to mark them
                    const visionResponse = await api.fetchApi('/sage_llm/vision_models');
                    const visionData = await visionResponse.json();
                    const visionModels = visionData.success ? (visionData.data.models[selectedProvider] || []) : [];
                    const visionModelSet = new Set(visionModels);
                    
                    // Clear and populate dropdown
                    modelSelectEl.innerHTML = '<option value="">Use current model</option>';
                    models.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model;
                        const icon = visionModelSet.has(model) ? '👁️ ' : '';
                        option.textContent = `${icon}${model}`;
                        modelSelectEl.appendChild(option);
                    });
                } else {
                    modelSelectEl.innerHTML = '<option value="">Failed to load models</option>';
                }
            } catch (error) {
                console.error('Error loading models:', error);
                modelSelectEl.innerHTML = '<option value="">Error loading models</option>';
            }
        });
    }
    
    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = form.querySelector('.llm-preset-name-input').value.trim();
        const description = form.querySelector('.llm-preset-desc-input').value.trim();
        const provider = form.querySelector('.llm-preset-provider-select').value;
        const model = form.querySelector('.llm-preset-model-select').value || null;
        const promptTemplate = form.querySelector('.llm-preset-template-input').value.trim();
        const systemPrompt = form.querySelector('.llm-preset-sysprompt-select').value;
        const category = categoryGroup ? form.querySelector('.llm-preset-category-input').value.trim() : (existingPreset?.category || 'custom');
        const temperature = parseFloat(form.querySelector('.llm-preset-temperature-input').value);
        const maxTokens = parseInt(form.querySelector('.llm-preset-maxtokens-input').value);
        const seed = parseInt(form.querySelector('.llm-preset-seed-input').value);
        
        if (!name) {
            showNotification('Preset name is required', 'error');
            return;
        }
        
        try {
            // Build preset data
            const presetData = {
                name,
                description,
                category,
                provider,
                model,
                promptTemplate,
                systemPrompt,
                settings: {
                    temperature,
                    maxTokens,
                    seed,
                    keepAlive: existingPreset?.settings?.keepAlive ?? 300,
                    includeHistory: existingPreset?.settings?.includeHistory ?? false
                },
                isBuiltin: false // User versions are never marked as built-in
            };
            
            // Generate or use existing ID
            const id = presetId || name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
            
            // Save preset
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            
            await presetModule.savePreset(id, presetData);
            
            // Reload presets
            await loadPresets(state, modelSelection);
            
            // Refresh the manage dialog if it's open
            const manageDialog = document.querySelector('.llm-modal-overlay');
            if (manageDialog) {
                manageDialog.remove();
                await showManagePresetsDialog(state, modelSelection, advancedOptions, inputSection, loadPresets, null, showNotification);
            }
            
            dialog.remove();
            
            const msg = isEditingBuiltin 
                ? `Custom version of "${name}" saved successfully`
                : `Preset "${name}" saved successfully`;
            showNotification(msg, 'success');
            
        } catch (error) {
            console.error('Error saving preset:', error);
            showNotification(`Failed to save preset: ${error.message}`, 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = isEditingBuiltin ? 'Save Customization' : 'Save Preset';
        }
    });
    
    modal.appendChild(form);
    dialog.appendChild(modal);
    document.body.appendChild(dialog);
    
    // Focus first input
    const firstInput = form.querySelector('input:not([readonly])');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
    }
}

/**
 * Create system prompts management panel
 */
function createSystemPromptsPanel(state, modelSelection, advancedOptions, inputSection, showNotification, parentDialog) {
    const panel = document.createElement('div');
    panel.className = 'llm-system-prompts-panel';
    
    // Add new prompt button
    const addBtn = document.createElement('button');
    addBtn.className = 'llm-btn llm-btn-primary';
    addBtn.innerHTML = '+ Add System Prompt';
    addBtn.addEventListener('click', () => {
        showSystemPromptEditor(state, modelSelection, advancedOptions, inputSection, null, showNotification);
    });
    
    panel.appendChild(addBtn);
    
    const list = document.createElement('div');
    list.className = 'llm-system-prompt-list';
    list.innerHTML = '<p class="llm-placeholder">Loading system prompts...</p>';
    
    // Load system prompts
    import('../../llm/llmPresets.js').then(async (presetModule) => {
        const systemPrompts = await presetModule.getSystemPrompts();
        
        list.innerHTML = '';
        
        if (!systemPrompts || Object.keys(systemPrompts).length === 0) {
            list.innerHTML = '<p class="llm-placeholder">No system prompts available</p>';
            return;
        }
        
        Object.entries(systemPrompts).forEach(([id, prompt]) => {
            const item = document.createElement('div');
            item.className = 'llm-system-prompt-item';
            
            const info = document.createElement('div');
            info.className = 'llm-system-prompt-info';
            
            const promptName = document.createElement('div');
            promptName.className = 'llm-system-prompt-item-name';
            promptName.textContent = prompt.name;
            if (prompt.isBuiltin) {
                promptName.innerHTML = `⭐ ${prompt.name} <span class="llm-builtin-badge">Built-in</span>`;
            }
            
            const promptDesc = document.createElement('div');
            promptDesc.className = 'llm-system-prompt-item-desc';
            promptDesc.textContent = prompt.description || 'No description';
            
            info.appendChild(promptName);
            info.appendChild(promptDesc);
            
            const actions = document.createElement('div');
            actions.className = 'llm-system-prompt-item-actions';
            
            const useBtn = document.createElement('button');
            useBtn.className = 'llm-btn llm-btn-small llm-btn-primary';
            useBtn.textContent = 'Use';
            useBtn.addEventListener('click', () => {
                const systemPromptTextarea = advancedOptions.querySelector('.llm-system-prompt-textarea');
                if (systemPromptTextarea) {
                    systemPromptTextarea.value = prompt.content || '';
                    systemPromptTextarea.dispatchEvent(new Event('input'));
                    showNotification(`System prompt "${prompt.name}" applied`, 'success');
                }
            });
            
            actions.appendChild(useBtn);
            
            // Only show edit/delete for custom prompts
            if (!prompt.isBuiltin) {
                const editBtn = document.createElement('button');
                editBtn.className = 'llm-btn llm-btn-small llm-btn-secondary';
                editBtn.textContent = 'Edit';
                editBtn.addEventListener('click', () => {
                    showSystemPromptEditor(state, modelSelection, advancedOptions, inputSection, { id, ...prompt }, showNotification);
                });
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'llm-btn llm-btn-small llm-btn-danger';
                deleteBtn.textContent = 'Delete';
                deleteBtn.addEventListener('click', async () => {
                    if (confirm(`Delete system prompt "${prompt.name}"?`)) {
                        try {
                            await presetModule.deleteSystemPrompt(id);
                            
                            // Refresh the dialog
                            if (parentDialog) {
                                parentDialog.remove();
                                await showManagePresetsDialog(state, modelSelection, advancedOptions, inputSection, null, null, showNotification);
                            }
                            
                            showNotification(`System prompt "${prompt.name}" deleted`, 'success');
                        } catch (error) {
                            showNotification(`Failed to delete system prompt: ${error.message}`, 'error');
                        }
                    }
                });
                
                actions.appendChild(editBtn);
                actions.appendChild(deleteBtn);
            }
            
            item.appendChild(info);
            item.appendChild(actions);
            list.appendChild(item);
        });
    }).catch(error => {
        console.error('Error loading system prompts:', error);
        list.innerHTML = '<p class="llm-placeholder error">Error loading system prompts</p>';
    });
    
    panel.appendChild(list);
    return panel;
}

/**
 * Show system prompt editor dialog
 */
export async function showSystemPromptEditor(state, modelSelection, advancedOptions, inputSection, existingPrompt, showNotification) {
    const dialog = document.createElement('div');
    dialog.className = 'llm-modal-overlay';
    
    const content = document.createElement('div');
    content.className = 'llm-modal-content llm-modal-large';
    
    const title = document.createElement('h3');
    title.textContent = existingPrompt ? 'Edit System Prompt' : 'New System Prompt';
    title.className = 'llm-modal-title';
    
    const form = document.createElement('form');
    form.className = 'llm-system-prompt-form';
    
    // Prompt name
    const nameGroup = createFormGroup(
        'Name',
        (() => {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'llm-input llm-system-prompt-name-input';
            input.placeholder = 'e.g., Creative Assistant';
            input.required = true;
            input.value = existingPrompt?.name || '';
            return input;
        })()
    );
    
    // Description
    const descGroup = createFormGroup(
        'Description (optional)',
        (() => {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'llm-input llm-system-prompt-desc-input';
            input.placeholder = 'e.g., Encourages creative and detailed responses';
            input.value = existingPrompt?.description || '';
            return input;
        })()
    );
    
    // Content
    const contentGroup = createFormGroup(
        'Prompt Content',
        (() => {
            const textarea = document.createElement('textarea');
            textarea.className = 'llm-textarea llm-system-prompt-content-input';
            textarea.placeholder = 'Enter the system prompt content...';
            textarea.rows = 15;
            textarea.required = true;
            textarea.value = existingPrompt?.content || '';
            return textarea;
        })()
    );
    
    form.appendChild(nameGroup);
    form.appendChild(descGroup);
    form.appendChild(contentGroup);
    
    // Buttons
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'llm-modal-buttons';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'llm-btn llm-btn-secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => dialog.remove());
    
    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.className = 'llm-btn llm-btn-primary';
    saveBtn.textContent = existingPrompt ? 'Update' : 'Save';
    
    buttonGroup.appendChild(cancelBtn);
    buttonGroup.appendChild(saveBtn);
    
    form.appendChild(buttonGroup);
    
    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nameInput = form.querySelector('.llm-system-prompt-name-input');
        const descInput = form.querySelector('.llm-system-prompt-desc-input');
        const contentInput = form.querySelector('.llm-system-prompt-content-input');
        
        const name = nameInput.value.trim();
        const description = descInput.value.trim();
        const promptContent = contentInput.value.trim();
        
        if (!name || !promptContent) {
            showNotification('Name and content are required', 'error');
            return;
        }
        
        try {
            // Import preset module
            const presetModule = await import('../../llm/llmPresets.js');
            
            // Generate ID from name (or use existing)
            const id = existingPrompt?.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
            
            // Save system prompt
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            
            await presetModule.saveSystemPrompt(id, {
                name,
                content: promptContent,
                description
            });
            
            dialog.remove();
            
            // Refresh the manage dialog if open
            const manageDialog = document.querySelector('.llm-modal-overlay');
            if (manageDialog) {
                manageDialog.remove();
                await showManagePresetsDialog(state, modelSelection, advancedOptions, inputSection, null, null, showNotification);
            }
            
            showNotification(`System prompt "${name}" saved successfully`, 'success');
            
        } catch (error) {
            console.error('Error saving system prompt:', error);
            showNotification(`Failed to save system prompt: ${error.message}`, 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = existingPrompt ? 'Update' : 'Save';
        }
    });
    
    content.appendChild(title);
    content.appendChild(form);
    dialog.appendChild(content);
    document.body.appendChild(dialog);
    
    // Focus name input
    setTimeout(() => {
        form.querySelector('.llm-system-prompt-name-input').focus();
    }, 100);
    
    // Close on overlay click
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.remove();
        }
    });
}

/**
 * Apply a preset to the UI
 * @param {Object} state - Tab state object
 * @param {string} presetId - Preset ID to apply
 * @param {HTMLElement} modelSelection - Model selection section
 * @param {HTMLElement} advancedOptions - Advanced options section
 * @param {HTMLElement} inputSection - Input section
 */
export async function applyPresetToUI(state, presetId, modelSelection, advancedOptions, inputSection) {
    if (!presetId || !state.presets || !state.presets[presetId]) {
        return;
    }
    
    const preset = state.presets[presetId];
    
    try {
        // Import preset module and settings
        const presetModule = await import('../../llm/llmPresets.js');
        const { updateUIFromSettings } = await import('../../llm/llmSettings.js');
        
        // Apply preset to state
        presetModule.applyPreset(state, preset);
        
        // Load and apply system prompt content if specified
        if (preset.systemPrompt) {
            const systemPrompts = await presetModule.getSystemPrompts();
            const systemPromptData = systemPrompts[preset.systemPrompt];
            
            if (systemPromptData && systemPromptData.content) {
                // Apply actual system prompt content to textarea
                const systemPromptTextarea = advancedOptions.querySelector('.llm-system-prompt-textarea');
                if (systemPromptTextarea) {
                    systemPromptTextarea.value = systemPromptData.content;
                    state.settings.systemPrompt = systemPromptData.content;
                }
            }
        }
        
        // Apply prompt template if specified
        if (preset.promptTemplate && state.prompts?.base) {
            const [category, templateName] = preset.promptTemplate.split('/');
            
            // Find the template
            let templateKey = null;
            let templateData = null;
            
            for (const [key, template] of Object.entries(state.prompts.base)) {
                if (template.category === category && template.name === templateName) {
                    templateKey = key;
                    templateData = template;
                    break;
                }
            }
            
            if (templateData) {
                // Update category dropdown
                const categorySelect = advancedOptions.querySelector('.llm-category-select');
                if (categorySelect) {
                    categorySelect.value = category;
                    categorySelect.dispatchEvent(new Event('change'));
                }
                
                // Wait for template dropdown to populate, then select template
                setTimeout(() => {
                    const templateSelect = advancedOptions.querySelector('.llm-template-select');
                    if (templateSelect) {
                        templateSelect.value = templateKey;
                        templateSelect.dispatchEvent(new Event('change'));
                        
                        // Apply template prompt to main textarea
                        if (templateData.prompt && inputSection) {
                            const textarea = inputSection.querySelector('.llm-textarea');
                            if (textarea) {
                                textarea.value = templateData.prompt;
                                textarea.dispatchEvent(new Event('input'));
                            }
                        }
                    }
                }, 150);
            }
        }
        
        // Update UI to reflect new settings
        updateUIFromSettings(state.settings, advancedOptions);
        
        // Update provider and model selects
        const providerSelect = modelSelection.querySelector('.llm-provider-select');
        const modelSelect = modelSelection.querySelector('.llm-model-select');
        
        if (providerSelect && providerSelect.value !== state.provider) {
            providerSelect.value = state.provider;
            providerSelect.dispatchEvent(new Event('change'));
            
            // Wait for provider change to load models
            if (preset.model) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        if (modelSelect && preset.model) {
            // Try to set the model value (will work if it's in the dropdown)
            const modelExists = Array.from(modelSelect.options).some(opt => opt.value === preset.model);
            if (modelExists) {
                modelSelect.value = preset.model;
                state.model = preset.model;
                modelSelect.dispatchEvent(new Event('change'));
            } else {
                console.warn(`Model "${preset.model}" not found in current provider's model list`);
            }
        }
        
        console.log('[LLM Tab] Applied preset to UI:', preset.name);
        
    } catch (error) {
        console.error('[LLM Tab] Failed to apply preset to UI:', error);
    }
}

/**
 * Helper function to create a form group with label and input
 */
function createFormGroup(label, input) {
    const group = document.createElement('div');
    group.className = 'llm-form-group';
    
    const labelElem = document.createElement('label');
    labelElem.textContent = label;
    labelElem.className = 'llm-label';
    
    group.appendChild(labelElem);
    group.appendChild(input);
    
    return group;
}

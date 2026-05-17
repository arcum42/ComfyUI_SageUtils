/**
 * LLM Event Handlers
 * Wires all components together with event listeners
 */

import { handleSend, handleStop, handleCopy, handleCopyToNode, handleCopyFromNode } from '../compose/llmGenerationHandler.js';
import { loadModels, updateModelDropdown, loadPresets, rememberProviderModel } from './llmModelSelection.js';
import { showSavePresetDialog, showManagePresetsDialog } from './llmPresetDialogs.js';
import { clearAllImages, handleFileUpload } from '../compose/llmVisionSection.js';
import { saveSettings, applyModelSettingsForActiveSelection, setModelContext } from '../../../llm/llmSettings.js';
import { getModelCapabilityFlags } from '../../../llm/llmProviders.js';

const LLM_LAST_PROVIDER_KEY = 'llm_last_selected_provider';

/**
 * Setup all event handlers for the LLM tab
 * @param {Object} state - Tab state object
 * @param {HTMLElement} wrapper - Tab wrapper element
 * @param {HTMLElement} modelSelection - Model selection section
 * @param {HTMLElement} visionSection - Vision section
 * @param {HTMLElement} inputSection - Input section
 * @param {HTMLElement} advancedOptions - Advanced options section
 * @param {HTMLElement} responseSection - Response section
 * @param {HTMLElement} historySection - History section
 * @param {Object} app - ComfyUI app instance
 * @param {Function} showNotification - Notification function
 * @param {Function} showStatus - Status message function
 * @param {Function} applyPresetToUI - Apply preset function
 * @param {Function} resetSettingsToDefaults - Reset settings function
 * @param {Function} updateConversationList - Update conversation list UI function
 */
export function setupEventHandlers(
    state,
    wrapper,
    modelSelection,
    visionSection,
    inputSection,
    sendBtn,
    advancedOptions,
    responseSection,
    historySection,
    app,
    showNotification,
    showStatus,
    applyPresetToUI,
    resetSettingsToDefaults,
    updateConversationList
) {
    // Get all UI elements
    const providerSelect = modelSelection.querySelector('.llm-provider-select');
    const modelSelect = modelSelection.querySelector('.llm-model-select');
    const refreshBtn = modelSelection.querySelector('.llm-refresh-btn');
    const textarea = inputSection.querySelector('.llm-textarea');
    const copyBtn = responseSection.querySelector('.llm-copy-btn');
    const copyToNodeBtn = responseSection.querySelector('.llm-copy-to-node-btn');
    const stopBtn = responseSection.querySelector('.llm-stop-btn');
    
    // Vision section controls
    const uploadZone = visionSection.querySelector('.llm-upload-zone');
    const fileInput = visionSection.querySelector('.llm-file-input');
    const previewGrid = visionSection.querySelector('.llm-image-preview-grid');
    const imageCount = visionSection.querySelector('.llm-image-count');
    const clearAllBtn = visionSection.querySelector('.llm-clear-all-images-btn');
    
    // Preset controls
    const presetSelect = modelSelection.querySelector('.llm-preset-select');
    const savePresetBtn = modelSelection.querySelector('.llm-save-preset-btn');
    const managePresetsBtn = modelSelection.querySelector('.llm-manage-presets-btn');
    
    // Advanced options controls
    const categorySelect = advancedOptions.querySelector('.llm-category-select');
    const templateSelect = advancedOptions.querySelector('.llm-template-select');
    const extrasGrid = advancedOptions.querySelector('.llm-extras-grid');
    const systemPromptTextarea = advancedOptions.querySelector('.llm-system-prompt-textarea');
    
    // Reset settings button
    const resetSettingsBtn = advancedOptions.querySelector('.llm-reset-settings-btn');
    
    // ========== Provider & Model Events ==========
    
    // Provider change
    providerSelect.addEventListener('change', async () => {
        const previousProvider = state.provider;
        const previousModel = state.model;
        setModelContext(state.settings, previousProvider, previousModel);
        saveSettings(state.settings);

        state.provider = providerSelect.value;
        try {
            localStorage.setItem(LLM_LAST_PROVIDER_KEY, state.provider);
        } catch (error) {
            console.warn('[LLM] Failed to persist last selected provider:', error);
        }
        const preferredModel = state.lastModelsByProvider?.[state.provider] || null;
        updateModelDropdown(state, modelSelect, state.provider, preferredModel);
        await loadModels(state, modelSelection, visionSection); // Reload to update status

        // Resolve settings for the newly selected model
        applyModelSettingsForActiveSelection(state, advancedOptions);
        
        // Show/hide provider-specific settings
        showProviderOptions(advancedOptions, state.provider);
        updateCapabilityControlledOptions(state, advancedOptions);
        
        // Update vision section visibility
        updateVisionSectionVisibility(state, visionSection);
    });
    
    // Model change
    modelSelect.addEventListener('change', () => {
        const previousProvider = state.provider;
        const previousModel = state.model;
        setModelContext(state.settings, previousProvider, previousModel);
        saveSettings(state.settings);

        state.model = modelSelect.value;
        rememberProviderModel(state, state.provider, state.model);

        applyModelSettingsForActiveSelection(state, advancedOptions);
        updateCapabilityControlledOptions(state, advancedOptions);
        
        // Update vision section visibility
        updateVisionSectionVisibility(state, visionSection);
    });
    
    // Refresh button
    refreshBtn.addEventListener('click', async () => {
        await loadModels(state, modelSelection, visionSection, true); // Force re-initialization
        applyModelSettingsForActiveSelection(state, advancedOptions);
    });
    
    // ========== Preset Events ==========
    
    // Preset selection change
    if (presetSelect) {
        presetSelect.addEventListener('change', async () => {
            const presetId = presetSelect.value;
            if (presetId) {
                await applyPresetToUI(state, presetId, modelSelection, advancedOptions, inputSection);
            }
        });
    }
    
    // Save preset button
    if (savePresetBtn) {
        savePresetBtn.addEventListener('click', () => {
            showSavePresetDialog(state, modelSelection, loadPresets, showNotification);
        });
    }
    
    // Manage presets button
    if (managePresetsBtn) {
        managePresetsBtn.addEventListener('click', () => {
            showManagePresetsDialog(
                state,
                modelSelection,
                advancedOptions,
                inputSection,
                loadPresets,
                applyPresetToUI,
                showNotification
            );
        });
    }
    
    // ========== Template & Extras Events ==========
    
    // Category change - update template dropdown
    if (categorySelect) {
        categorySelect.addEventListener('change', () => {
            const category = categorySelect.value;
            state.selectedCategory = category;
            
            if (!category || !state.prompts?.base) {
                templateSelect.innerHTML = '<option value="">Select template...</option>';
                templateSelect.disabled = true;
                return;
            }
            
            // Filter templates by category
            const options = ['<option value="">Select template...</option>'];
            Object.entries(state.prompts.base).forEach(([key, template]) => {
                if (template.category === category) {
                    options.push(`<option value="${key}">${template.name}</option>`);
                }
            });
            
            templateSelect.innerHTML = options.join('');
            templateSelect.disabled = false;
        });
    }
    
    // Template change - populate main textarea
    if (templateSelect) {
        templateSelect.addEventListener('change', () => {
            const templateKey = templateSelect.value;
            state.settings.promptTemplate = templateKey;
            
            if (templateKey && state.prompts?.base?.[templateKey]) {
                const template = state.prompts.base[templateKey];
                // Populate main prompt textarea
                if (template.prompt && textarea) {
                    textarea.value = template.prompt;
                    // Trigger character counter update
                    textarea.dispatchEvent(new Event('input'));
                }
            }
        });
    }
    
    // Extras checkboxes change
    if (extrasGrid) {
        extrasGrid.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.dataset.extraKey) {
                const key = e.target.dataset.extraKey;
                state.selectedExtras[key] = e.target.checked;
            }
        });
    }
    
    // System prompt change
    if (systemPromptTextarea) {
        systemPromptTextarea.addEventListener('input', () => {
            state.settings.systemPrompt = systemPromptTextarea.value;
            saveSettings(state.settings);
        });
    }
    
    // ========== Compose Template Section Events ==========
    
    setupComposeTemplateHandlers(state, inputSection, textarea);
    
    // ========== Settings Events ==========
    
    // Setup all slider and input event handlers
    setupSettingsEventHandlers(state, advancedOptions);
    showProviderOptions(advancedOptions, state.provider);
    updateCapabilityControlledOptions(state, advancedOptions);
    updateVisionSectionVisibility(state, visionSection);
    
    // Reset settings button
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', () => {
            if (confirm('Reset all settings to defaults?')) {
                resetSettingsToDefaults(state, advancedOptions);
            }
        });
    }
    
    // ========== Generation Events ==========
    
    // Send button
    sendBtn.addEventListener('click', () => {
        handleSend(state, textarea, responseSection, sendBtn, stopBtn, historySection, updateConversationList);
    });
    
    // Ctrl+Enter on textarea to send
    textarea.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            handleSend(state, textarea, responseSection, sendBtn, stopBtn, historySection, updateConversationList);
        }
    });
    
    // Stop button
    stopBtn.addEventListener('click', () => {
        handleStop(state, responseSection, sendBtn, stopBtn);
    });
    
    // From node button
    const fromNodeBtn = inputSection.querySelector('.llm-from-node-btn');
    if (fromNodeBtn) {
        fromNodeBtn.addEventListener('click', () => {
            handleCopyFromNode(textarea, app, showNotification);
        });
    }
    
    // Copy button
    copyBtn.addEventListener('click', () => {
        handleCopy(responseSection, copyBtn);
    });
    
    // Copy to node button
    copyToNodeBtn.addEventListener('click', () => {
        handleCopyToNode(responseSection, copyToNodeBtn, app);
    });
    
    // Send to Prompt Builder button
    const sendToPromptBtn = responseSection.querySelector('.llm-send-to-prompt-btn');
    if (sendToPromptBtn) {
        sendToPromptBtn.addEventListener('click', () => {
            const responseDisplay = responseSection.querySelector('.llm-response-display');
            const responseText = responseDisplay.textContent.trim();
            
            if (!responseText || responseText === 'Response will appear here...') {
                showStatus(responseSection, 'No response to send', 'error');
                return;
            }
            
            // Visual feedback - show sending state
            const originalText = sendToPromptBtn.textContent;
            sendToPromptBtn.disabled = true;
            sendToPromptBtn.textContent = '📤 Sending...';
            
            // Use cross-tab messaging to send text to Prompt Builder
            import('../../../shared/crossTabMessaging.js').then(({ sendTextToPromptBuilder }) => {
                sendTextToPromptBuilder(responseText, {
                    source: 'llm',
                    autoSwitch: true
                });
                showNotification('Response sent to Prompt Builder', 'success');
                
                // Visual feedback - show success
                sendToPromptBtn.textContent = '✓ Sent!';
                sendToPromptBtn.style.background = 'var(--success-color, #4caf50)';
                
                setTimeout(() => {
                    sendToPromptBtn.textContent = originalText;
                    sendToPromptBtn.style.background = '';
                    sendToPromptBtn.disabled = false;
                }, 1500);
            }).catch(err => {
                console.error('[LLM] Failed to send to Prompt Builder:', err);
                showStatus(responseSection, 'Failed to send to Prompt Builder', 'error');
                
                // Reset button on error
                sendToPromptBtn.textContent = originalText;
                sendToPromptBtn.disabled = false;
            });
        });
    }
    
    // ========== Vision Events ==========
    
    // Click upload zone to trigger file input
    if (uploadZone) {
        uploadZone.addEventListener('click', () => {
            fileInput.click();
        });
    }
    
    // File input change
    if (fileInput) {
        fileInput.addEventListener('change', async () => {
            const files = Array.from(fileInput.files);
            await handleFileUpload(state, visionSection, files);
            fileInput.value = ''; // Reset input
        });
    }
    
    // Drag and drop handlers
    if (uploadZone) {
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
            await handleFileUpload(state, visionSection, files);
        });
    }
    
    // Clipboard paste handler (on document for global paste)
    const pasteHandler = async (e) => {
        // Only handle paste when LLM tab is active and vision section is visible
        if (!visionSection || visionSection.style.display === 'none') return;
        
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
            await handleFileUpload(state, visionSection, files.filter(Boolean));
        }
    };
    
    document.addEventListener('paste', pasteHandler);
    
    // Store paste handler for cleanup
    state._pasteHandler = pasteHandler;
    
    // Clear all images button
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            clearAllImages(state, visionSection);
        });
    }
    
    // ========== History Section Events ==========
    
    // New conversation button
    const newConversationBtn = historySection.querySelector('.llm-new-conversation-btn');
    if (newConversationBtn) {
        newConversationBtn.addEventListener('click', () => {
            startNewConversation(state, historySection, responseSection, updateConversationList);
        });
    }
    
    // Export button
    const exportBtn = historySection.querySelector('.llm-export-history-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            exportConversationHistory(state);
        });
    }
    
    // Import button
    const importBtn = historySection.querySelector('.llm-import-history-btn');
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            importConversationHistory(state, historySection, responseSection, updateConversationList);
        });
    }
    
    // Clear button
    const clearBtn = historySection.querySelector('.llm-clear-history-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            clearConversationHistory(state, historySection, responseSection, updateConversationList);
        });
    }
    
    // ========== Skip Save Checkbox Events ==========
    
    // Skip save checkbox - update message in real-time
    const skipSaveCheckbox = inputSection.querySelector('.llm-skip-save-checkbox');
    if (skipSaveCheckbox) {
        skipSaveCheckbox.addEventListener('change', () => {
            const emptyMessage = historySection.querySelector('.llm-history-empty');
            if (emptyMessage && emptyMessage.style.display !== 'none') {
                if (skipSaveCheckbox.checked) {
                    emptyMessage.textContent = 'History saving disabled (uncheck to save)';
                } else {
                    emptyMessage.textContent = 'No conversation history yet';
                }
            }
        });
    }
    
    // Save to History button - retroactively save skipped conversation
    const saveToHistoryBtn = responseSection?.querySelector('.llm-save-to-history-btn');
    if (saveToHistoryBtn) {
        saveToHistoryBtn.addEventListener('click', async () => {
            // Check if we have unsaved prompt and response
            if (!state._unsavedPrompt || !state._unsavedResponse) {
                console.warn('No unsaved conversation to save');
                return;
            }
            
            // Import necessary functions
            const { addMessageToHistory, saveConversationHistory } = await import('../compose/llmGenerationHandler.js');
            const { renderHistory } = await import('../chat/llmHistorySection.js');
            const { updateConversationList } = await import('../chat/llmHistorySection.js');
            
            // Save user message
            addMessageToHistory(state, 'user', state._unsavedPrompt, {
                provider: state._unsavedProvider,
                model: state._unsavedModel
            });
            
            // Save assistant response
            addMessageToHistory(state, 'assistant', state._unsavedResponse, {
                provider: state._unsavedProvider,
                model: state._unsavedModel
            });
            
            // Update conversation list UI
            if (updateConversationList) {
                updateConversationList(state, historySection, responseSection);
            }
            
            // Render the current conversation's messages
            const currentConversation = state.conversationHistory?.find(c => c.id === state.currentConversationId);
            if (currentConversation) {
                // Delete handler for individual messages
                const handleDeleteMessage = (index) => {
                    currentConversation.messages.splice(index, 1);
                    currentConversation.updated = Date.now();
                    saveConversationHistory(state.conversationHistory);
                    renderHistory(historySection, currentConversation.messages, handleDeleteMessage);
                    updateConversationList(state, historySection, responseSection);
                };
                
                renderHistory(historySection, currentConversation.messages, handleDeleteMessage);
            }
            
            // Hide the button
            saveToHistoryBtn.style.display = 'none';
            
            // Clear unsaved state
            delete state._unsavedPrompt;
            delete state._unsavedProvider;
            delete state._unsavedModel;
            delete state._unsavedResponse;
            
            // Show success feedback
            console.log('Conversation saved to history');
        });
    }
    
    // Initialize provider-specific settings visibility
    showProviderOptions(advancedOptions, state.provider);
}

/**
 * Setup all settings slider and input event handlers
 * @param {Object} state - Tab state object
 * @param {HTMLElement} advancedOptions - Advanced options section
 */
function setupComposeTemplateHandlers(state, inputSection, textarea) {
    const templateSection = inputSection.querySelector('.llm-compose-template-section');
    if (!templateSection) return;

    const categorySelect = templateSection._categorySelect;
    const templateSelect = templateSection._templateSelect;
    const templateState = templateSection._templateState;

    if (!categorySelect || !templateSelect) return;

    // Category change handler
    categorySelect.addEventListener('change', () => {
        const category = categorySelect.value;
        templateState.selectedCategory = category;

        if (!category || !state.prompts?.base) {
            templateSelect.innerHTML = '<option value="">Select template...</option>';
            templateSelect.disabled = true;
            return;
        }

        // Filter templates by category
        const options = ['<option value="">Select template...</option>'];
        Object.entries(state.prompts.base).forEach(([key, template]) => {
            if (template.category === category) {
                options.push(`<option value="${key}">${template.name}</option>`);
            }
        });

        templateSelect.innerHTML = options.join('');
        templateSelect.disabled = false;
    });

    // Template change handler with confirmation
    templateSelect.addEventListener('change', () => {
        const templateKey = templateSelect.value;
        if (!templateKey || !state.prompts?.base?.[templateKey]) return;

        const template = state.prompts.base[templateKey];
        const templateContent = template.prompt || '';

        // Check if we should confirm before replacing
        const shouldConfirm = templateState.promptModified && textarea.value.trim();

        if (shouldConfirm) {
            // Show custom dialog with three options
            showTemplateActionDialog(templateKey, templateContent, textarea, templateState, state, templateSelect);
            return;
        }

        // No existing content, just replace
        updatePromptWithTemplate(templateContent, textarea, templateState, state, 'replace');
        state.settings.promptTemplate = templateKey;
        saveSettings(state.settings);
    });
}

/**
 * Show dialog with three options for applying template to prompt
 */
function showTemplateActionDialog(templateKey, templateContent, textarea, templateState, state, templateSelect) {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: #2a2a2a;
        border: 1px solid #4a9eff;
        border-radius: 8px;
        padding: 24px;
        max-width: 500px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        color: #ffffff;
        font-family: 'Segoe UI', sans-serif;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Apply Template';
    title.style.cssText = `
        margin: 0 0 12px 0;
        font-size: 18px;
        color: #4a9eff;
    `;
    content.appendChild(title);

    const message = document.createElement('p');
    message.textContent = 'Your current prompt has been modified. How would you like to apply this template?';
    message.style.cssText = `
        margin: 0 0 20px 0;
        font-size: 14px;
        line-height: 1.5;
        color: #cccccc;
    `;
    content.appendChild(message);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        flex-wrap: wrap;
    `;

    const createButton = (label, action, isPrimary) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.style.cssText = `
            padding: 10px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: background-color 0.2s;
            ${isPrimary
                ? 'background: #4a9eff; color: #000;'
                : 'background: #444; color: #fff;'
            }
        `;
        btn.addEventListener('mouseover', () => {
            btn.style.opacity = '0.9';
        });
        btn.addEventListener('mouseout', () => {
            btn.style.opacity = '1';
        });
        btn.addEventListener('click', () => {
            dialog.remove();
            if (action === 'replace') {
                updatePromptWithTemplate(templateContent, textarea, templateState, state, 'replace');
                state.settings.promptTemplate = templateKey;
                saveSettings(state.settings);
            } else if (action === 'insert') {
                updatePromptWithTemplate(templateContent, textarea, templateState, state, 'insert');
                state.settings.promptTemplate = templateKey;
                saveSettings(state.settings);
            } else {
                templateSelect.value = '';
            }
        });
        buttonContainer.appendChild(btn);
    };

    createButton('Cancel', 'cancel', false);
    createButton('Insert at Beginning', 'insert', false);
    createButton('Replace', 'replace', true);

    content.appendChild(buttonContainer);
    dialog.appendChild(content);
    document.body.appendChild(dialog);
}

/**
 * Update prompt textarea with template content
 */
function updatePromptWithTemplate(templateContent, textarea, templateState, state, action) {
    if (action === 'replace') {
        textarea.value = templateContent;
    } else if (action === 'insert') {
        // Insert at beginning with a separator
        const currentValue = textarea.value.trim();
        textarea.value = templateContent + (currentValue ? '\n\n' + currentValue : '');
    }

    textarea.dispatchEvent(new Event('input'));

    // Import update function with correct path
    import('../compose/llmComposeTemplateSection.js').then(({ updateTemplateState }) => {
        updateTemplateState(templateState, templateContent, textarea);
    }).catch(err => {
        console.error('[LLM] Failed to import llmComposeTemplateSection:', err);
    });
}

/**
 * Setup all settings slider and input event handlers
 * @param {Object} state - Tab state object
 * @param {HTMLElement} advancedOptions - Advanced options section
 */
function setupSettingsEventHandlers(state, advancedOptions) {
    // Common settings — both Ollama and LM Studio sections have their own
    // temperature/seed/maxTokens controls with the same class names, so we
    // must attach a listener to every matching element, not just the first.
    advancedOptions.querySelectorAll('.llm-temperature-slider').forEach((slider) => {
        slider.addEventListener('input', () => {
            state.settings.temperature = parseFloat(slider.value);
            console.debug('[LLM Settings] temperature changed ->', state.settings.temperature, '| context:', state.settings.__llmModelContext);
            saveSettings(state.settings);
        });
    });

    advancedOptions.querySelectorAll('.llm-seed-input').forEach((input) => {
        input.addEventListener('input', () => {
            const value = input.value.trim();
            state.settings.seed = value === '' ? undefined : parseInt(value);
            console.debug('[LLM Settings] seed changed ->', state.settings.seed, '| context:', state.settings.__llmModelContext);
            saveSettings(state.settings);
        });
    });

    advancedOptions.querySelectorAll('.llm-max-tokens-slider').forEach((slider) => {
        slider.addEventListener('input', () => {
            state.settings.maxTokens = parseInt(slider.value);
            console.debug('[LLM Settings] maxTokens changed ->', state.settings.maxTokens, '| context:', state.settings.__llmModelContext);
            saveSettings(state.settings);
        });
    });
    
    // Ollama-specific settings
    setupOllamaSettingsHandlers(state, advancedOptions);
    
    // LM Studio-specific settings
    setupLMStudioSettingsHandlers(state, advancedOptions);
    
    // Context window settings
    const includeHistoryCheckbox = advancedOptions.querySelector('.llm-include-history');
    const maxHistoryInput = advancedOptions.querySelector('.llm-max-history-input');
    
    if (includeHistoryCheckbox) {
        includeHistoryCheckbox.addEventListener('change', () => {
            state.settings.includeHistory = includeHistoryCheckbox.checked;
            saveSettings(state.settings);
        });
    }
    
    if (maxHistoryInput) {
        maxHistoryInput.addEventListener('input', () => {
            state.settings.maxHistoryMessages = parseInt(maxHistoryInput.value) || 10;
            saveSettings(state.settings);
        });
    }

    // Shared advanced controls (provider-agnostic payload controls)
    const contextLengthSlider = advancedOptions.querySelector('.llm-context-length-slider');
    const contextLengthEnabledCheckbox = advancedOptions.querySelector('.llm-context-length-enabled');
    const reasoningEnabledCheckbox = advancedOptions.querySelector('.llm-reasoning-enabled');
    const reasoningLevelSelect = advancedOptions.querySelector('.llm-reasoning-level-select');
    const showReasoningCheckbox = advancedOptions.querySelector('.llm-show-reasoning');
    const toolsEnabledCheckbox = advancedOptions.querySelector('.llm-tools-enabled');
    const mcpEnabledCheckbox = advancedOptions.querySelector('.llm-mcp-enabled');
    const toolProfileSelect = advancedOptions.querySelector('.llm-tool-profile-select');
    const mcpProfileSelect = advancedOptions.querySelector('.llm-mcp-profile-select');

    const updateReasoningLevelEnabledState = () => {
        if (!reasoningLevelSelect) return;
        const enabled = reasoningEnabledCheckbox ? reasoningEnabledCheckbox.checked : true;
        reasoningLevelSelect.disabled = !enabled;
    };

    if (contextLengthSlider) {
        contextLengthSlider.addEventListener('input', () => {
            state.settings.contextLength = parseInt(contextLengthSlider.value) || 4096;
            saveSettings(state.settings);
        });
    }

    if (contextLengthEnabledCheckbox) {
        contextLengthEnabledCheckbox.addEventListener('change', () => {
            state.settings.contextLengthEnabled = contextLengthEnabledCheckbox.checked;
            if (contextLengthSlider) {
                contextLengthSlider.disabled = !contextLengthEnabledCheckbox.checked || !(state.provider === 'lmstudio_rest' || state.provider === 'ollama_rest');
            }
            saveSettings(state.settings);
        });
    }

    if (reasoningEnabledCheckbox) {
        reasoningEnabledCheckbox.addEventListener('change', () => {
            state.settings.reasoningEnabled = reasoningEnabledCheckbox.checked;
            updateReasoningLevelEnabledState();
            saveSettings(state.settings);
        });
        updateReasoningLevelEnabledState();
    }

    if (reasoningLevelSelect) {
        reasoningLevelSelect.addEventListener('change', () => {
            state.settings.reasoningLevel = reasoningLevelSelect.value || 'off';
            saveSettings(state.settings);
        });
    }

    if (showReasoningCheckbox) {
        showReasoningCheckbox.addEventListener('change', () => {
            state.settings.showReasoning = showReasoningCheckbox.checked;
            saveSettings(state.settings);
        });
    }

    if (toolsEnabledCheckbox) {
        toolsEnabledCheckbox.addEventListener('change', () => {
            state.settings.toolsEnabled = toolsEnabledCheckbox.checked;
            saveSettings(state.settings);
        });
    }

    if (mcpEnabledCheckbox) {
        mcpEnabledCheckbox.addEventListener('change', () => {
            state.settings.mcpEnabled = mcpEnabledCheckbox.checked;
            saveSettings(state.settings);
        });
    }

    if (toolProfileSelect) {
        toolProfileSelect.addEventListener('change', () => {
            state.settings.toolProfile = toolProfileSelect.value || 'none';
            saveSettings(state.settings);
        });
    }

    if (mcpProfileSelect) {
        mcpProfileSelect.addEventListener('change', () => {
            state.settings.mcpProfile = mcpProfileSelect.value || 'none';
            saveSettings(state.settings);
        });
    }

    setupProviderOptionToggleHandlers(state, advancedOptions);
}

/**
 * Show or hide advanced controls based on the active model/provider capabilities.
 * @param {Object} state - Tab state object
 * @param {HTMLElement} advancedOptions - Advanced options section
 */
function updateCapabilityControlledOptions(state, advancedOptions) {
    if (!advancedOptions) return;

    const flags = state.model ? getModelCapabilityFlags(
        state.provider,
        state.model,
        state.capabilities,
        state.visionModels,
        state.toolModels,
        state.reasoningModels
    ) : null;

    const provider = state.provider;
    const supportsReasoning = Boolean(flags?.reasoning) && (provider === 'lmstudio_rest' || provider === 'ollama_rest');
    const supportsTools = Boolean(flags?.toolUse) && (provider === 'lmstudio_rest' || provider === 'ollama_rest');
    const supportsMcp = provider === 'lmstudio_rest';

    const toggleRow = (selector, visible) => {
        const row = advancedOptions.querySelector(selector);
        if (row) {
            row.style.display = visible ? '' : 'none';
        }
    };

    toggleRow('.llm-context-length-enabled-row', provider === 'lmstudio_rest' || provider === 'ollama_rest');
    toggleRow('.llm-context-length-row', provider === 'lmstudio_rest' || provider === 'ollama_rest');
    toggleRow('.llm-reasoning-enabled-row', supportsReasoning);
    toggleRow('.llm-reasoning-level-row', supportsReasoning);
    toggleRow('.llm-show-reasoning-row', supportsReasoning);
    toggleRow('.llm-tools-enabled-row', supportsTools);
    toggleRow('.llm-tool-profile-row', supportsTools);
    toggleRow('.llm-mcp-enabled-row', supportsMcp);
    toggleRow('.llm-mcp-profile-row', supportsMcp);

    const reasoningEnabled = advancedOptions.querySelector('.llm-reasoning-enabled');
    const reasoningLevel = advancedOptions.querySelector('.llm-reasoning-level-select');
    if (reasoningEnabled) {
        reasoningEnabled.disabled = !supportsReasoning;
    }
    if (reasoningLevel) {
        reasoningLevel.disabled = !supportsReasoning || !(reasoningEnabled?.checked ?? false);
    }

    const showReasoning = advancedOptions.querySelector('.llm-show-reasoning');
    if (showReasoning) {
        showReasoning.disabled = !supportsReasoning;
    }

    const toolsEnabled = advancedOptions.querySelector('.llm-tools-enabled');
    const toolProfile = advancedOptions.querySelector('.llm-tool-profile-select');
    if (toolsEnabled) {
        toolsEnabled.disabled = !supportsTools;
    }
    if (toolProfile) {
        toolProfile.disabled = !supportsTools;
    }

    const mcpEnabled = advancedOptions.querySelector('.llm-mcp-enabled');
    const mcpProfile = advancedOptions.querySelector('.llm-mcp-profile-select');
    if (mcpEnabled) {
        mcpEnabled.disabled = !supportsMcp;
    }
    if (mcpProfile) {
        mcpProfile.disabled = !supportsMcp;
    }

    const contextLength = advancedOptions.querySelector('.llm-context-length-slider');
    const contextLengthEnabled = advancedOptions.querySelector('.llm-context-length-enabled');
    if (contextLength) {
        const providerSupportsContextLength = provider === 'lmstudio_rest' || provider === 'ollama_rest';
        const sendContextLength = contextLengthEnabled ? contextLengthEnabled.checked : true;
        contextLength.disabled = !providerSupportsContextLength || !sendContextLength;
    }

    if (contextLengthEnabled) {
        contextLengthEnabled.disabled = !(provider === 'lmstudio_rest' || provider === 'ollama_rest');
    }
}

const PROVIDER_OPTION_TOGGLE_DEFAULTS = {
    ollama: {
        enabled: false,
        options: {
            temperature: true,
            top_p: true,
            top_k: true,
            repeat_penalty: true,
            presence_penalty: true,
            frequency_penalty: true,
            max_tokens: true,
            num_ctx: true,
            keep_alive: true,
            seed: true,
        },
    },
    lmstudio: {
        enabled: false,
        options: {
            temperature: true,
            top_p: true,
            max_tokens: true,
            presence_penalty: true,
            frequency_penalty: true,
            repeat_penalty: true,
            top_k: true,
            seed: true,
        },
    },
};

function getProviderOptionDefaults(provider) {
    return PROVIDER_OPTION_TOGGLE_DEFAULTS[provider] || { enabled: true, options: {} };
}

function ensureProviderOptionToggleSettings(settings) {
    settings.providerOptions = settings.providerOptions || {};

    Object.entries(PROVIDER_OPTION_TOGGLE_DEFAULTS).forEach(([provider, defaults]) => {
        const existing = settings.providerOptions[provider] || {};
        settings.providerOptions[provider] = {
            enabled: existing.enabled !== undefined ? existing.enabled : defaults.enabled,
            options: {
                ...defaults.options,
                ...(existing.options || {}),
            },
        };
    });
}

function setupProviderOptionToggleHandlers(state, advancedOptions) {
    ensureProviderOptionToggleSettings(state.settings);

    const sectionToggles = advancedOptions.querySelectorAll('.llm-provider-section-toggle');
    sectionToggles.forEach((toggle) => {
        const provider = toggle.dataset.provider;
        if (!provider) return;

        const defaults = getProviderOptionDefaults(provider);
        const savedEnabled = state.settings.providerOptions?.[provider]?.enabled;
        toggle.checked = savedEnabled !== undefined ? savedEnabled : defaults.enabled;
        toggle.dispatchEvent(new Event('change'));

        toggle.addEventListener('change', () => {
            ensureProviderOptionToggleSettings(state.settings);
            state.settings.providerOptions[provider].enabled = toggle.checked;
            saveSettings(state.settings);
        });
    });

    const optionToggles = advancedOptions.querySelectorAll('.llm-provider-option-toggle');
    optionToggles.forEach((toggle) => {
        const provider = toggle.dataset.provider;
        const optionKey = toggle.dataset.optionKey;
        if (!provider || !optionKey) return;

        const defaults = getProviderOptionDefaults(provider);
        const savedValue = state.settings.providerOptions?.[provider]?.options?.[optionKey];
        const defaultValue = defaults.options[optionKey] !== undefined ? defaults.options[optionKey] : true;
        toggle.checked = savedValue !== undefined ? savedValue : defaultValue;
        toggle.dispatchEvent(new Event('change'));

        toggle.addEventListener('change', () => {
            ensureProviderOptionToggleSettings(state.settings);
            state.settings.providerOptions[provider].options[optionKey] = toggle.checked;
            saveSettings(state.settings);
        });
    });
}

/**
 * Setup Ollama-specific settings handlers
 */
function setupOllamaSettingsHandlers(state, advancedOptions) {
    const ollamaSection = advancedOptions.querySelector('.llm-ollama-options');
    if (!ollamaSection) return;
    
    const topKSlider = ollamaSection.querySelector('.llm-top-k-slider');
    const topPSlider = ollamaSection.querySelector('.llm-top-p-slider');
    const repeatPenaltySlider = ollamaSection.querySelector('.llm-repeat-penalty-slider');
    const presencePenaltySlider = ollamaSection.querySelector('.llm-presence-penalty-slider');
    const frequencyPenaltySlider = ollamaSection.querySelector('.llm-frequency-penalty-slider');
    const contextWindowSlider = ollamaSection.querySelector('.llm-context-window-slider');
    const keepAliveInput = ollamaSection.querySelector('.llm-keep-alive-input');
    
    if (topKSlider) {
        topKSlider.addEventListener('input', () => {
            state.settings.topK = parseInt(topKSlider.value);
            console.debug('[LLM Settings] [Ollama] topK changed ->', state.settings.topK);
            saveSettings(state.settings);
        });
    }
    
    if (topPSlider) {
        topPSlider.addEventListener('input', () => {
            state.settings.topP = parseFloat(topPSlider.value);
            console.debug('[LLM Settings] [Ollama] topP changed ->', state.settings.topP);
            saveSettings(state.settings);
        });
    }
    
    if (repeatPenaltySlider) {
        repeatPenaltySlider.addEventListener('input', () => {
            state.settings.repeatPenalty = parseFloat(repeatPenaltySlider.value);
            console.debug('[LLM Settings] [Ollama] repeatPenalty changed ->', state.settings.repeatPenalty);
            saveSettings(state.settings);
        });
    }
    
    if (presencePenaltySlider) {
        presencePenaltySlider.addEventListener('input', () => {
            state.settings.presencePenalty = parseFloat(presencePenaltySlider.value);
            console.debug('[LLM Settings] [Ollama] presencePenalty changed ->', state.settings.presencePenalty);
            saveSettings(state.settings);
        });
    }
    
    if (frequencyPenaltySlider) {
        frequencyPenaltySlider.addEventListener('input', () => {
            state.settings.frequencyPenalty = parseFloat(frequencyPenaltySlider.value);
            console.debug('[LLM Settings] [Ollama] frequencyPenalty changed ->', state.settings.frequencyPenalty);
            saveSettings(state.settings);
        });
    }
    
    if (contextWindowSlider) {
        contextWindowSlider.addEventListener('input', () => {
            state.settings.numCtx = parseInt(contextWindowSlider.value);
            console.debug('[LLM Settings] [Ollama] numCtx changed ->', state.settings.numCtx);
            saveSettings(state.settings);
        });
    }
    
    if (keepAliveInput) {
        keepAliveInput.addEventListener('input', () => {
            state.settings.keepAlive = keepAliveInput.value;
            console.debug('[LLM Settings] [Ollama] keepAlive changed ->', state.settings.keepAlive);
            saveSettings(state.settings);
        });
    }
}

/**
 * Setup LM Studio-specific settings handlers
 */
function setupLMStudioSettingsHandlers(state, advancedOptions) {
    const lmstudioSection = advancedOptions.querySelector('.llm-lmstudio-options');
    if (!lmstudioSection) return;
    
    const topKSlider = lmstudioSection.querySelector('.llm-top-k-slider');
    const topPSlider = lmstudioSection.querySelector('.llm-top-p-slider');
    const repeatPenaltySlider = lmstudioSection.querySelector('.llm-repeat-penalty-slider');
    const presencePenaltySlider = lmstudioSection.querySelector('.llm-presence-penalty-slider');
    const frequencyPenaltySlider = lmstudioSection.querySelector('.llm-frequency-penalty-slider');
    const streamCheckbox = lmstudioSection.querySelector('.llm-stream-checkbox');
    const stopSequencesTextarea = lmstudioSection.querySelector('.llm-stop-sequences-textarea');
    const logitBiasTextarea = lmstudioSection.querySelector('.llm-logit-bias-textarea');
    
    if (topKSlider) {
        topKSlider.addEventListener('input', () => {
            state.settings.topK = parseInt(topKSlider.value);
            console.debug('[LLM Settings] [LMStudio] topK changed ->', state.settings.topK);
            saveSettings(state.settings);
        });
    }
    
    if (topPSlider) {
        topPSlider.addEventListener('input', () => {
            state.settings.topP = parseFloat(topPSlider.value);
            console.debug('[LLM Settings] [LMStudio] topP changed ->', state.settings.topP);
            saveSettings(state.settings);
        });
    }
    
    if (repeatPenaltySlider) {
        repeatPenaltySlider.addEventListener('input', () => {
            state.settings.repeatPenalty = parseFloat(repeatPenaltySlider.value);
            console.debug('[LLM Settings] [LMStudio] repeatPenalty changed ->', state.settings.repeatPenalty);
            saveSettings(state.settings);
        });
    }
    
    if (presencePenaltySlider) {
        presencePenaltySlider.addEventListener('input', () => {
            state.settings.presencePenalty = parseFloat(presencePenaltySlider.value);
            console.debug('[LLM Settings] [LMStudio] presencePenalty changed ->', state.settings.presencePenalty);
            saveSettings(state.settings);
        });
    }
    
    if (frequencyPenaltySlider) {
        frequencyPenaltySlider.addEventListener('input', () => {
            state.settings.frequencyPenalty = parseFloat(frequencyPenaltySlider.value);
            console.debug('[LLM Settings] [LMStudio] frequencyPenalty changed ->', state.settings.frequencyPenalty);
            saveSettings(state.settings);
        });
    }
    
    if (streamCheckbox) {
        streamCheckbox.addEventListener('change', () => {
            state.settings.stream = streamCheckbox.checked;
            saveSettings(state.settings);
        });
    }
    
    if (stopSequencesTextarea) {
        stopSequencesTextarea.addEventListener('input', () => {
            const value = stopSequencesTextarea.value.trim();
            state.settings.stop = value ? value.split('\n').map(s => s.trim()).filter(s => s) : undefined;
            saveSettings(state.settings);
        });
    }
    
    if (logitBiasTextarea) {
        logitBiasTextarea.addEventListener('input', () => {
            const value = logitBiasTextarea.value.trim();
            try {
                state.settings.logit_bias = value ? JSON.parse(value) : undefined;
                saveSettings(state.settings);
            } catch (error) {
                console.warn('Invalid logit bias JSON:', error);
            }
        });
    }
}

/**
 * Show/hide provider-specific options sections
 * @param {HTMLElement} advancedOptions - Advanced options section
 * @param {string} provider - Selected provider
 */
export function showProviderOptions(advancedOptions, provider) {
    const ollamaSection = advancedOptions.querySelector('.llm-ollama-options');
    const lmstudioSection = advancedOptions.querySelector('.llm-lmstudio-options');
    const noOptionsMsg = advancedOptions.querySelector('.llm-no-provider-options');
    const hasProviderSection = provider === 'ollama_rest' || provider === 'lmstudio_rest';

    if (ollamaSection) {
        ollamaSection.style.display = provider === 'ollama_rest' ? 'block' : 'none';
    }
    if (lmstudioSection) {
        lmstudioSection.style.display = provider === 'lmstudio_rest' ? 'block' : 'none';
    }
    if (noOptionsMsg) {
        noOptionsMsg.style.display = hasProviderSection ? 'none' : 'block';
    }
}

/**
 * Update vision section visibility based on selected model
 * @param {Object} state - Tab state object
 * @param {HTMLElement} visionSection - Vision section element
 */
function updateVisionSectionVisibility(state, visionSection) {
    if (!visionSection) return;

    const flags = state.model ? getModelCapabilityFlags(
        state.provider,
        state.model,
        state.capabilities,
        state.visionModels,
        state.toolModels,
        state.reasoningModels
    ) : null;
    const hasVisionModel = Boolean(flags?.vision);
    visionSection.style.display = hasVisionModel ? 'block' : 'none';
    
    console.log('[LLM] Vision section visibility:', {
        model: state.model,
        provider: state.provider,
        hasVisionModel,
        visionModels: state.visionModels,
        display: visionSection.style.display
    });
    
    // Clear images if switching to non-vision model
    if (!hasVisionModel && state.images.length > 0) {
        clearAllImages(state, visionSection);
    }
}

/**
 * Cleanup event handlers when tab is destroyed
 * @param {Object} state - Tab state object
 */
export function cleanupEventHandlers(state) {
    // Remove paste handler if it exists
    if (state._pasteHandler) {
        document.removeEventListener('paste', state._pasteHandler);
        delete state._pasteHandler;
    }
}

/**
 * Start a new conversation
 */
async function startNewConversation(state, historySection, responseSection, updateConversationList) {
    const { startNewConversation: startNew } = await import('../compose/llmGenerationHandler.js');
    const { renderHistory } = await import('../chat/llmHistorySection.js');
    
    startNew(state);
    renderHistory(historySection, []);
    updateConversationList(state, historySection, responseSection);
    
    // Clear response display
    const responseDisplay = responseSection.querySelector('.llm-response-display');
    if (responseDisplay) {
        responseDisplay.textContent = '';
    }
}

/**
 * Export conversation history to JSON file
 */
function exportConversationHistory(state) {
    if (!state.conversationHistory || state.conversationHistory.length === 0) {
        alert('No conversation history to export');
        return;
    }
    
    const dataStr = JSON.stringify(state.conversationHistory, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `llm_conversations_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Import conversation history from JSON file
 */
async function importConversationHistory(state, historySection, responseSection, updateConversationList) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const imported = JSON.parse(text);
            
            if (!Array.isArray(imported)) {
                alert('Invalid conversation history format');
                return;
            }
            
            // Merge with existing history (avoid duplicates)
            const { saveConversationHistory } = await import('../compose/llmGenerationHandler.js');
            const existingIds = new Set(state.conversationHistory.map(c => c.id));
            const newConversations = imported.filter(c => !existingIds.has(c.id));
            
            state.conversationHistory = [...state.conversationHistory, ...newConversations];
            saveConversationHistory(state.conversationHistory);
            updateConversationList(state, historySection, responseSection);
            
            alert(`Imported ${newConversations.length} conversations`);
        } catch (error) {
            console.error('Import error:', error);
            alert('Failed to import conversation history: ' + error.message);
        }
    };
    
    input.click();
}

/**
 * Clear all conversation history
 */
async function clearConversationHistory(state, historySection, responseSection, updateConversationList) {
    if (!confirm('Clear all conversation history? This cannot be undone.')) {
        return;
    }
    
    const { saveConversationHistory } = await import('../compose/llmGenerationHandler.js');
    const { renderHistory } = await import('../chat/llmHistorySection.js');
    
    state.conversationHistory = [];
    state.currentConversationId = null;
    saveConversationHistory([]);
    
    renderHistory(historySection, []);
    updateConversationList(state, historySection, responseSection);
    
    // Clear response display
    const responseDisplay = responseSection.querySelector('.llm-response-display');
    if (responseDisplay) {
        responseDisplay.textContent = '';
    }
}

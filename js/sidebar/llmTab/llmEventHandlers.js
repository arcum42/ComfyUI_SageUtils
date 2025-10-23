/**
 * LLM Event Handlers
 * Wires all components together with event listeners
 */

import { handleSend, handleStop, handleCopy, handleCopyToNode, handleCopyFromNode } from './llmGenerationHandler.js';
import { loadModels, updateModelDropdown, loadPresets } from './llmModelSelection.js';
import { showSavePresetDialog, showManagePresetsDialog } from './llmPresetDialogs.js';
import { clearAllImages, handleFileUpload } from './llmVisionSection.js';
import { saveSettings } from '../../llm/llmSettings.js';
import { isVisionModel } from '../../llm/llmProviders.js';

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
    const sendBtn = wrapper.querySelector('.llm-send-btn');
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
        state.provider = providerSelect.value;
        updateModelDropdown(state, modelSelect, state.provider);
        await loadModels(state, modelSelection, visionSection); // Reload to update status
        
        // Show/hide provider-specific settings
        showProviderOptions(advancedOptions, state.provider);
        
        // Update vision section visibility
        updateVisionSectionVisibility(state, visionSection);
    });
    
    // Model change
    modelSelect.addEventListener('change', () => {
        state.model = modelSelect.value;
        
        // Update vision section visibility
        updateVisionSectionVisibility(state, visionSection);
    });
    
    // Refresh button
    refreshBtn.addEventListener('click', () => {
        loadModels(state, modelSelection, visionSection, true); // Force re-initialization
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
    
    // ========== Settings Events ==========
    
    // Setup all slider and input event handlers
    setupSettingsEventHandlers(state, advancedOptions);
    
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
            import('../../shared/crossTabMessaging.js').then(({ sendTextToPromptBuilder }) => {
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
            const { addMessageToHistory, saveConversationHistory } = await import('./llmGenerationHandler.js');
            const { renderHistory } = await import('./llmHistorySection.js');
            const { updateConversationList } = await import('./llmHistorySection.js');
            
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
function setupSettingsEventHandlers(state, advancedOptions) {
    // Common settings
    const temperatureSlider = advancedOptions.querySelector('.llm-temperature-slider');
    const seedInput = advancedOptions.querySelector('.llm-seed-input');
    const maxTokensSlider = advancedOptions.querySelector('.llm-max-tokens-slider');
    
    if (temperatureSlider) {
        temperatureSlider.addEventListener('input', () => {
            state.settings.temperature = parseFloat(temperatureSlider.value);
            saveSettings(state.settings);
        });
    }
    
    if (seedInput) {
        seedInput.addEventListener('input', () => {
            const value = seedInput.value.trim();
            state.settings.seed = value === '' ? undefined : parseInt(value);
            saveSettings(state.settings);
        });
    }
    
    if (maxTokensSlider) {
        maxTokensSlider.addEventListener('input', () => {
            state.settings.maxTokens = parseInt(maxTokensSlider.value);
            saveSettings(state.settings);
        });
    }
    
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
            state.settings.top_k = parseInt(topKSlider.value);
            saveSettings(state.settings);
        });
    }
    
    if (topPSlider) {
        topPSlider.addEventListener('input', () => {
            state.settings.top_p = parseFloat(topPSlider.value);
            saveSettings(state.settings);
        });
    }
    
    if (repeatPenaltySlider) {
        repeatPenaltySlider.addEventListener('input', () => {
            state.settings.repeat_penalty = parseFloat(repeatPenaltySlider.value);
            saveSettings(state.settings);
        });
    }
    
    if (presencePenaltySlider) {
        presencePenaltySlider.addEventListener('input', () => {
            state.settings.presence_penalty = parseFloat(presencePenaltySlider.value);
            saveSettings(state.settings);
        });
    }
    
    if (frequencyPenaltySlider) {
        frequencyPenaltySlider.addEventListener('input', () => {
            state.settings.frequency_penalty = parseFloat(frequencyPenaltySlider.value);
            saveSettings(state.settings);
        });
    }
    
    if (contextWindowSlider) {
        contextWindowSlider.addEventListener('input', () => {
            state.settings.num_ctx = parseInt(contextWindowSlider.value);
            saveSettings(state.settings);
        });
    }
    
    if (keepAliveInput) {
        keepAliveInput.addEventListener('input', () => {
            state.settings.keep_alive = keepAliveInput.value;
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
            state.settings.top_k = parseInt(topKSlider.value);
            saveSettings(state.settings);
        });
    }
    
    if (topPSlider) {
        topPSlider.addEventListener('input', () => {
            state.settings.top_p = parseFloat(topPSlider.value);
            saveSettings(state.settings);
        });
    }
    
    if (repeatPenaltySlider) {
        repeatPenaltySlider.addEventListener('input', () => {
            state.settings.repeat_penalty = parseFloat(repeatPenaltySlider.value);
            saveSettings(state.settings);
        });
    }
    
    if (presencePenaltySlider) {
        presencePenaltySlider.addEventListener('input', () => {
            state.settings.presence_penalty = parseFloat(presencePenaltySlider.value);
            saveSettings(state.settings);
        });
    }
    
    if (frequencyPenaltySlider) {
        frequencyPenaltySlider.addEventListener('input', () => {
            state.settings.frequency_penalty = parseFloat(frequencyPenaltySlider.value);
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
function showProviderOptions(advancedOptions, provider) {
    const ollamaSection = advancedOptions.querySelector('.llm-ollama-options');
    const lmstudioSection = advancedOptions.querySelector('.llm-lmstudio-options');
    
    if (ollamaSection) {
        ollamaSection.style.display = provider === 'ollama' ? 'block' : 'none';
    }
    if (lmstudioSection) {
        lmstudioSection.style.display = provider === 'lmstudio' ? 'block' : 'none';
    }
}

/**
 * Update vision section visibility based on selected model
 * @param {Object} state - Tab state object
 * @param {HTMLElement} visionSection - Vision section element
 */
function updateVisionSectionVisibility(state, visionSection) {
    if (!visionSection) return;
    
    const hasVisionModel = state.model && isVisionModel(state.model, state.provider, state.visionModels);
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
    const { startNewConversation: startNew } = await import('./llmGenerationHandler.js');
    const { renderHistory } = await import('./llmHistorySection.js');
    
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
            const { saveConversationHistory } = await import('./llmGenerationHandler.js');
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
    
    const { saveConversationHistory } = await import('./llmGenerationHandler.js');
    const { renderHistory } = await import('./llmHistorySection.js');
    
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

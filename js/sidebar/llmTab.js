/**
 * LLM Chat Tab - Main tab component for LLM interactions
 * Provides interface for text and vision generation with streaming support
 */

import * as llmApi from '../llm/llmApi.js';
import { showNotification } from '../shared/crossTabMessaging.js';
import { copyTextToSelectedNode } from '../utils/textCopyUtils.js';
import { copyTextFromSelectedNode } from '../utils/textCopyFromNode.js';
import { app } from '../../../scripts/app.js';

/**
 * Creates the main LLM tab content
 * @param {HTMLElement} container - The container element for the tab
 * @returns {Object} - Tab utility object with destroy method
 */
export function createLLMTab(container) {
    // Clear any existing content
    container.innerHTML = '';
    container.className = 'llm-tab';
    
    // Create main wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'llm-wrapper';
    
    // Create header section
    const header = createHeader();
    wrapper.appendChild(header);
    
    // Create model selection section
    const modelSelection = createModelSelection();
    wrapper.appendChild(modelSelection);
    
    // Create vision upload section (hidden by default)
    const visionSection = createVisionSection();
    wrapper.appendChild(visionSection);
    
    // Create input section
    const inputSection = createInputSection();
    wrapper.appendChild(inputSection);
    
    // Create advanced options section
    const advancedOptions = createAdvancedOptions();
    wrapper.appendChild(advancedOptions);
    
    // Create response section
    const responseSection = createResponseSection();
    wrapper.appendChild(responseSection);
    
    // Create history section
    const historySection = createHistorySection();
    wrapper.appendChild(historySection);
    
    container.appendChild(wrapper);
    
    // Add styles
    addLLMStyles();
    
    // Initialize tab state
    const state = {
        provider: 'ollama',
        model: null,
        models: { ollama: [], lmstudio: [] },
        visionModels: { ollama: [], lmstudio: [] },
        generating: false,
        streamController: null,
        // Vision support
        images: [], // Array of { file, preview, base64 }
        // Prompt template state
        selectedCategory: '',
        selectedExtras: {}, // Track which extras are enabled
        // Conversation history
        currentConversationId: null,
        currentConversationMessages: [],
        conversationHistory: loadConversationHistory(),
        // Generation settings (will be loaded from localStorage if available)
        settings: getDefaultSettings()
    };
    
    // Load saved settings from localStorage
    const savedSettings = loadSettings();
    if (savedSettings) {
        state.settings = { ...state.settings, ...savedSettings };
    }
    
    // Load initial data
    initializeTab(state, modelSelection, visionSection, inputSection, advancedOptions, responseSection, historySection);
    
    // Update UI from loaded settings
    updateUIFromSettings(state.settings, advancedOptions);
    
    // Initialize history panel
    updateConversationList(state, historySection, responseSection);
    
    // Wire up history action buttons
    const newConvBtn = historySection.querySelector('.llm-new-conversation-btn');
    newConvBtn.addEventListener('click', () => {
        startNewConversation(state);
        updateConversationList(state, historySection, responseSection);
        
        // Clear response area
        const responseDisplay = responseSection.querySelector('.llm-response-display');
        if (responseDisplay) {
            responseDisplay.textContent = '';
        }
        
        // Show feedback
        const statusMessage = responseSection.querySelector('.llm-status-message');
        if (statusMessage) {
            statusMessage.textContent = 'Started new conversation';
            statusMessage.className = 'llm-status-message success';
            setTimeout(() => {
                statusMessage.textContent = '';
                statusMessage.className = 'llm-status-message';
            }, 2000);
        }
    });
    
    const clearHistoryBtn = historySection.querySelector('.llm-clear-history-btn');
    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all conversation history? This cannot be undone.')) {
            clearAllHistory(state);
            updateConversationList(state, historySection, responseSection);
            
            // Show feedback
            const statusMessage = responseSection.querySelector('.llm-status-message');
            if (statusMessage) {
                statusMessage.textContent = 'All conversation history cleared';
                statusMessage.className = 'llm-status-message success';
                setTimeout(() => {
                    statusMessage.textContent = '';
                    statusMessage.className = 'llm-status-message';
                }, 2000);
            }
        }
    });
    
    const importBtn = historySection.querySelector('.llm-import-conversation-btn');
    const fileInput = historySection.querySelector('input[type="file"]');
    
    importBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const imported = JSON.parse(text);
            
            // Validate the imported conversation structure
            if (!imported.id || !imported.messages || !Array.isArray(imported.messages)) {
                throw new Error('Invalid conversation format');
            }
            
            // Check if conversation already exists
            const existingIndex = state.conversationHistory.findIndex(c => c.id === imported.id);
            if (existingIndex >= 0) {
                if (!confirm('A conversation with this ID already exists. Overwrite it?')) {
                    fileInput.value = '';
                    return;
                }
                state.conversationHistory[existingIndex] = imported;
            } else {
                state.conversationHistory.push(imported);
            }
            
            saveConversationHistory(state.conversationHistory);
            updateConversationList(state, historySection, responseSection);
            
            // Show feedback
            const statusMessage = responseSection.querySelector('.llm-status-message');
            if (statusMessage) {
                statusMessage.textContent = `Imported conversation: ${imported.title}`;
                statusMessage.className = 'llm-status-message llm-status-success';
                setTimeout(() => {
                    statusMessage.textContent = '';
                    statusMessage.className = 'llm-status-message';
                }, 3000);
            }
        } catch (error) {
            alert(`Failed to import conversation: ${error.message}`);
        }
        
        fileInput.value = ''; // Reset input
    });
    
    // Subscribe to cross-tab messages
    import('../shared/crossTabMessaging.js').then(({ getEventBus, MessageTypes, requestTabSwitch }) => {
        const bus = getEventBus();
        
        // Store unsubscribe functions for cleanup
        if (!state.unsubscribers) {
            state.unsubscribers = [];
        }
        
        // Handle image transfers from Gallery
        const unsubImage = bus.subscribe(MessageTypes.IMAGE_TRANSFER, async (message) => {
            const { images, source, autoSwitch } = message.data;
            
            if (!images || images.length === 0) return;
            
            // Add images to state
            images.forEach(img => {
                // Strip data URL prefix if present (backend expects just base64)
                let base64Data = img.base64;
                if (base64Data && base64Data.includes(',')) {
                    // Remove "data:image/xxx;base64," prefix
                    base64Data = base64Data.split(',')[1];
                }
                
                // Avoid duplicates
                const exists = state.images.some(existing => 
                    existing.preview === img.preview || 
                    existing.base64 === base64Data
                );
                if (!exists) {
                    state.images.push({
                        file: img.file,
                        preview: img.preview,
                        base64: base64Data,  // Store without data URL prefix
                        name: img.name
                    });
                }
            });
            
            // Update vision section UI
            const previewGrid = visionSection.querySelector('.llm-image-preview-grid');
            const imageCount = visionSection.querySelector('.llm-image-count');
            const clearAllBtn = visionSection.querySelector('.llm-clear-all-images-btn');
            
            if (!previewGrid || !imageCount) {
                console.warn('[LLM Tab] Vision section elements not found');
                return;
            }
            
            // Show vision section and preview grid
            visionSection.style.display = 'block';
            previewGrid.style.display = 'grid';
            
            updateVisionPreview();
            
            // Helper function to update vision preview
            function updateVisionPreview() {
                // Re-render preview grid
                previewGrid.innerHTML = '';
                state.images.forEach((img, index) => {
                    const preview = document.createElement('div');
                    preview.className = 'llm-image-preview';
                    
                    const imgElem = document.createElement('img');
                    // Use preview URL if available, otherwise reconstruct data URL from base64
                    if (img.preview) {
                        imgElem.src = img.preview;
                    } else if (img.base64) {
                        // Reconstruct data URL (base64 is stored without prefix)
                        imgElem.src = `data:image/jpeg;base64,${img.base64}`;
                    }
                    imgElem.alt = img.name || `Image ${index + 1}`;
                    
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'llm-remove-image-btn';
                    removeBtn.innerHTML = '×';
                    removeBtn.title = 'Remove image';
                    removeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        // Remove this specific image
                        state.images = state.images.filter((_, i) => i !== index);
                        // Re-render the preview
                        updateVisionPreview();
                        
                        // Hide grid if no images
                        if (state.images.length === 0) {
                            previewGrid.style.display = 'none';
                        }
                        
                        // Notify others
                        bus.publish(MessageTypes.IMAGE_QUEUE_UPDATE, { count: state.images.length });
                    });
                    
                    preview.appendChild(imgElem);
                    preview.appendChild(removeBtn);
                    previewGrid.appendChild(preview);
                });
                
                // Update count
                imageCount.textContent = `${state.images.length} image${state.images.length !== 1 ? 's' : ''}`;
                
                // Show/hide clear all button
                if (clearAllBtn) {
                    clearAllBtn.style.display = state.images.length > 0 ? 'inline-block' : 'none';
                }
            }
            
            // Auto-switch to LLM tab if requested
            if (autoSwitch) {
                requestTabSwitch('llm', { source: 'image-transfer' });
            }
        });
        state.unsubscribers.push(unsubImage);
        
        // Handle text transfers to LLM
        const unsubText = bus.subscribe(MessageTypes.TEXT_TO_LLM, (message) => {
            const { text, target, source, autoSwitch } = message.data;
            
            const textarea = target === 'system' 
                ? inputSection.querySelector('.llm-system-prompt')
                : inputSection.querySelector('.llm-main-prompt');
            
            if (textarea) {
                textarea.value = text;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            // Auto-switch to LLM tab if requested
            if (autoSwitch) {
                requestTabSwitch('llm', { source: 'text-transfer' });
            }
        });
        state.unsubscribers.push(unsubText);
        
        // Handle LLM state requests (for preset API)
        const unsubStateRequest = bus.subscribe(MessageTypes.LLM_STATE_REQUEST, (message) => {
            // Respond with current state
            bus.publish(MessageTypes.LLM_STATE_RESPONSE, {
                state: state,
                source: message.data.source
            });
        });
        state.unsubscribers.push(unsubStateRequest);
        
        // Handle preset application from external sources
        const unsubPresetApplied = bus.subscribe(MessageTypes.LLM_PRESET_APPLIED, async (message) => {
            const { presetId, state: newState } = message.data;
            
            // Update UI to reflect the new state
            if (newState && newState.settings) {
                updateUIFromSettings(newState.settings, advancedOptions);
                
                // Update model selection if provided
                if (newState.provider) {
                    const providerSelect = modelSelection.querySelector('.llm-provider-select');
                    if (providerSelect) {
                        providerSelect.value = newState.provider;
                        providerSelect.dispatchEvent(new Event('change'));
                    }
                }
                
                if (newState.model) {
                    const modelSelect = modelSelection.querySelector('.llm-model-select');
                    if (modelSelect) {
                        setTimeout(() => {
                            modelSelect.value = newState.model;
                            modelSelect.dispatchEvent(new Event('change'));
                        }, 100);
                    }
                }
                
                // Update preset dropdown
                const presetSelect = modelSelection.querySelector('.llm-preset-select');
                if (presetSelect && presetId) {
                    presetSelect.value = presetId;
                }
            }
        });
        state.unsubscribers.push(unsubPresetApplied);
    }).catch(err => {
        console.warn('[LLM Tab] Failed to load cross-tab messaging:', err);
    });
    
    // Return utility object
    return {
        wrapper,
        state,
        refresh: () => loadModels(state, modelSelection, visionSection),
        destroy: () => {
            // Cleanup subscriptions
            if (state.unsubscribers) {
                state.unsubscribers.forEach(unsub => {
                    try {
                        unsub();
                    } catch (err) {
                        console.warn('[LLM Tab] Error unsubscribing:', err);
                    }
                });
                state.unsubscribers = [];
            }
            
            // Stop streaming if active
            if (state.streamController) {
                state.streamController.stop();
            }
        }
    };
}

/**
 * Creates the header section
 * @returns {HTMLElement} - Header element
 */
function createHeader() {
    const header = document.createElement('div');
    header.className = 'llm-header';
    header.setAttribute('role', 'banner');
    
    const title = document.createElement('h2');
    title.textContent = 'LLM Chat';
    title.className = 'llm-title';
    title.id = 'llm-tab-title';
    title.setAttribute('aria-label', 'LLM Chat Interface');
    
    const description = document.createElement('p');
    description.textContent = 'Chat with language models using Ollama or LM Studio';
    description.className = 'llm-description';
    
    header.appendChild(title);
    header.appendChild(description);
    
    return header;
}

/**
 * Creates the model selection section
 * @returns {HTMLElement} - Model selection element
 */
function createModelSelection() {
    const section = document.createElement('div');
    section.className = 'llm-model-selection';
    
    // Provider selection
    const providerGroup = document.createElement('div');
    providerGroup.className = 'llm-form-group';
    
    const providerLabel = document.createElement('label');
    providerLabel.textContent = 'Provider';
    providerLabel.className = 'llm-label';
    
    const providerSelect = document.createElement('select');
    providerSelect.className = 'llm-select llm-provider-select';
    providerSelect.innerHTML = `
        <option value="ollama">Ollama</option>
        <option value="lmstudio">LM Studio</option>
    `;
    
    providerGroup.appendChild(providerLabel);
    providerGroup.appendChild(providerSelect);
    
    // Model selection
    const modelGroup = document.createElement('div');
    modelGroup.className = 'llm-form-group';
    
    const modelLabel = document.createElement('label');
    modelLabel.textContent = 'Model';
    modelLabel.className = 'llm-label';
    
    const modelSelect = document.createElement('select');
    modelSelect.className = 'llm-select llm-model-select';
    modelSelect.innerHTML = '<option value="">Loading models...</option>';
    modelSelect.setAttribute('aria-label', 'Select LLM model');
    
    modelGroup.appendChild(modelLabel);
    modelGroup.appendChild(modelSelect);
    
    // Status indicator
    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'llm-status-indicator';
    statusIndicator.innerHTML = `
        <span class="status-dot"></span>
        <span class="status-text">Checking status...</span>
    `;
    
    // Refresh button
    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'llm-btn llm-btn-secondary llm-refresh-btn';
    refreshBtn.innerHTML = '🔄 Refresh Models';
    refreshBtn.title = 'Reload model list';
    
    // Preset selection
    const presetGroup = document.createElement('div');
    presetGroup.className = 'llm-form-group';
    
    const presetLabel = document.createElement('label');
    presetLabel.textContent = 'Preset';
    presetLabel.className = 'llm-label';
    
    const presetSelect = document.createElement('select');
    presetSelect.className = 'llm-select llm-preset-select';
    presetSelect.innerHTML = '<option value="">Loading presets...</option>';
    
    presetGroup.appendChild(presetLabel);
    presetGroup.appendChild(presetSelect);
    
    // Preset action buttons
    const presetActions = document.createElement('div');
    presetActions.className = 'llm-preset-actions';
    
    const savePresetBtn = document.createElement('button');
    savePresetBtn.className = 'llm-btn llm-btn-secondary llm-btn-small llm-save-preset-btn';
    savePresetBtn.innerHTML = '💾 Save';
    savePresetBtn.title = 'Save current settings as preset';
    
    const managePresetsBtn = document.createElement('button');
    managePresetsBtn.className = 'llm-btn llm-btn-secondary llm-btn-small llm-manage-presets-btn';
    managePresetsBtn.innerHTML = '⚙️ Manage';
    managePresetsBtn.title = 'Manage presets and system prompts';
    
    presetActions.appendChild(savePresetBtn);
    presetActions.appendChild(managePresetsBtn);
    
    // Layout
    const topRow = document.createElement('div');
    topRow.className = 'llm-selection-row';
    topRow.appendChild(providerGroup);
    topRow.appendChild(modelGroup);
    
    const presetRow = document.createElement('div');
    presetRow.className = 'llm-selection-row';
    presetRow.appendChild(presetGroup);
    presetRow.appendChild(presetActions);
    
    const bottomRow = document.createElement('div');
    bottomRow.className = 'llm-selection-row';
    bottomRow.appendChild(statusIndicator);
    bottomRow.appendChild(refreshBtn);
    
    section.appendChild(topRow);
    section.appendChild(presetRow);
    section.appendChild(bottomRow);
    
    return section;
}

/**
 * Creates the vision upload section
 * @returns {HTMLElement} - Vision section element
 */
function createVisionSection() {
    const section = document.createElement('div');
    section.className = 'llm-vision-section';
    section.style.display = 'none'; // Hidden by default
    
    // Section header
    const header = document.createElement('div');
    header.className = 'llm-vision-header';
    
    const title = document.createElement('h3');
    title.textContent = 'Images';
    title.className = 'llm-section-title';
    
    const imageCount = document.createElement('span');
    imageCount.className = 'llm-image-count';
    imageCount.textContent = '0 images';
    
    const clearAllBtn = document.createElement('button');
    clearAllBtn.className = 'llm-btn llm-btn-secondary llm-clear-all-images-btn';
    clearAllBtn.textContent = 'Clear All';
    clearAllBtn.style.display = 'none';
    
    header.appendChild(title);
    header.appendChild(imageCount);
    header.appendChild(clearAllBtn);
    
    // Upload zone
    const uploadZone = document.createElement('div');
    uploadZone.className = 'llm-upload-zone';
    
    const uploadIcon = document.createElement('div');
    uploadIcon.className = 'llm-upload-icon';
    uploadIcon.innerHTML = '📁';
    
    const uploadText = document.createElement('div');
    uploadText.className = 'llm-upload-text';
    uploadText.innerHTML = `
        <strong>Drop images here or click to upload</strong>
        <span>You can also paste images from clipboard (Ctrl+V)</span>
    `;
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.className = 'llm-file-input';
    fileInput.style.display = 'none';
    
    uploadZone.appendChild(uploadIcon);
    uploadZone.appendChild(uploadText);
    uploadZone.appendChild(fileInput);
    
    // Image preview grid
    const previewGrid = document.createElement('div');
    previewGrid.className = 'llm-image-preview-grid';
    previewGrid.style.display = 'none';
    
    section.appendChild(header);
    section.appendChild(uploadZone);
    section.appendChild(previewGrid);
    
    return section;
}

/**
 * Creates the input section
 * @returns {HTMLElement} - Input section element
 */
function createInputSection() {
    const section = document.createElement('div');
    section.className = 'llm-input-section';
    
    // Input header
    const inputHeader = document.createElement('div');
    inputHeader.className = 'llm-input-header';
    
    const inputTitle = document.createElement('h3');
    inputTitle.textContent = 'Prompt';
    inputTitle.className = 'llm-section-title';
    
    const charCounter = document.createElement('span');
    charCounter.className = 'llm-char-counter';
    charCounter.id = 'llm-char-counter';
    charCounter.textContent = '0 characters';
    charCounter.setAttribute('aria-live', 'polite');
    charCounter.setAttribute('aria-atomic', 'true');
    
    inputHeader.appendChild(inputTitle);
    inputHeader.appendChild(charCounter);
    
    // Textarea
    const textarea = document.createElement('textarea');
    textarea.className = 'llm-textarea llm-main-prompt';
    textarea.placeholder = 'Type your prompt here... (Ctrl+Enter to send)';
    textarea.rows = 6;
    
    // Character counter update
    textarea.addEventListener('input', () => {
        const count = textarea.value.length;
        charCounter.textContent = `${count} character${count !== 1 ? 's' : ''}`;
    });
    
    // Ctrl+Enter to send
    textarea.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            const sendBtn = section.querySelector('.llm-send-btn');
            if (sendBtn && !sendBtn.disabled) {
                sendBtn.click();
            }
        }
        // Escape to blur
        if (e.key === 'Escape') {
            textarea.blur();
        }
    });
    
    // Action buttons (placeholders for Phase 8 cross-tab integration)
    const actionButtons = document.createElement('div');
    actionButtons.className = 'llm-action-buttons';
    
    const fromPromptsBtn = document.createElement('button');
    fromPromptsBtn.className = 'llm-btn llm-btn-secondary llm-btn-small';
    fromPromptsBtn.innerHTML = '← From Prompts';
    fromPromptsBtn.title = 'Receive text from Prompt Builder tab (Phase 8)';
    fromPromptsBtn.disabled = true; // Will be enabled in Phase 8
    
    const toPromptsBtn = document.createElement('button');
    toPromptsBtn.className = 'llm-btn llm-btn-secondary llm-btn-small';
    toPromptsBtn.innerHTML = 'To Prompts →';
    toPromptsBtn.title = 'Send text to Prompt Builder tab (Phase 8)';
    toPromptsBtn.disabled = true; // Will be enabled in Phase 8
    
    const fromNodeBtn = document.createElement('button');
    fromNodeBtn.className = 'llm-btn llm-btn-secondary llm-btn-small llm-from-node-btn';
    fromNodeBtn.innerHTML = '📥 From Node';
    fromNodeBtn.title = 'Copy text from selected node to prompt';
    fromNodeBtn.setAttribute('aria-label', 'Copy text from selected node');
    
    actionButtons.appendChild(fromPromptsBtn);
    actionButtons.appendChild(toPromptsBtn);
    actionButtons.appendChild(fromNodeBtn);
    
    // Send button
    const sendBtn = document.createElement('button');
    sendBtn.className = 'llm-btn llm-btn-primary llm-send-btn';
    sendBtn.innerHTML = '📤 Send';
    sendBtn.title = 'Generate response (Ctrl+Enter)';
    sendBtn.setAttribute('aria-label', 'Send message to LLM');
    
    section.appendChild(inputHeader);
    section.appendChild(textarea);
    section.appendChild(actionButtons);
    section.appendChild(sendBtn);
    
    return section;
}

/**
 * Creates the advanced options section
 * @returns {HTMLElement} - Advanced options element
 */
function createAdvancedOptions() {
    const section = document.createElement('div');
    section.className = 'llm-advanced-section';
    
    // Section header (collapsible)
    const header = document.createElement('div');
    header.className = 'llm-advanced-header';
    
    const title = document.createElement('h3');
    title.textContent = '⚙️ Advanced Options';
    title.className = 'llm-section-title';
    
    const headerActions = document.createElement('div');
    headerActions.className = 'llm-header-actions';
    
    const resetBtn = document.createElement('button');
    resetBtn.className = 'llm-btn llm-btn-secondary llm-btn-small llm-reset-settings-btn';
    resetBtn.textContent = '↺ Reset';
    resetBtn.title = 'Reset all settings to defaults';
    
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'llm-collapse-btn';
    toggleBtn.textContent = '▼';
    toggleBtn.title = 'Toggle advanced options';
    
    headerActions.appendChild(resetBtn);
    headerActions.appendChild(toggleBtn);
    
    header.appendChild(title);
    header.appendChild(headerActions);
    
    // Content container (initially collapsed)
    const content = document.createElement('div');
    content.className = 'llm-advanced-content';
    content.style.display = 'none';
    
    // Prompt template selector
    const templateGroup = createFormGroup(
        'Prompt Template',
        createTemplateSelector()
    );
    content.appendChild(templateGroup);
    
    // Prompt extras (modifiers)
    content.appendChild(createPromptExtras());
    
    // System prompt
    const systemPromptGroup = createFormGroup(
        'System Prompt',
        createSystemPromptInput()
    );
    content.appendChild(systemPromptGroup);
    
    // Generation settings row 1
    const settingsRow1 = document.createElement('div');
    settingsRow1.className = 'llm-settings-row';
    
    const tempGroup = createFormGroup(
        'Temperature',
        createTemperatureSlider()
    );
    
    const seedGroup = createFormGroup(
        'Seed',
        createSeedInput()
    );
    
    settingsRow1.appendChild(tempGroup);
    settingsRow1.appendChild(seedGroup);
    content.appendChild(settingsRow1);
    
    // Generation settings row 2
    const settingsRow2 = document.createElement('div');
    settingsRow2.className = 'llm-settings-row';
    
    const maxTokensGroup = createFormGroup(
        'Max Tokens',
        createMaxTokensInput()
    );
    
    settingsRow2.appendChild(maxTokensGroup);
    content.appendChild(settingsRow2);
    
    // Keep Alive (common to both providers)
    const keepAliveGroup = createFormGroup(
        'Keep Alive',
        createKeepAliveSlider()
    );
    content.appendChild(keepAliveGroup);
    
    // Ollama-specific settings (will be shown/hidden based on provider)
    const ollamaSettings = document.createElement('div');
    ollamaSettings.className = 'llm-ollama-settings';
    
    const ollamaTitle = document.createElement('h4');
    ollamaTitle.textContent = 'Ollama Advanced Options';
    ollamaTitle.className = 'llm-subsection-title';
    ollamaSettings.appendChild(ollamaTitle);
    
    // Row 1: Top K, Top P
    const ollamaRow1 = document.createElement('div');
    ollamaRow1.className = 'llm-settings-row';
    
    const topKGroup = createFormGroup(
        'Top K',
        createTopKSlider()
    );
    
    const topPGroup = createFormGroup(
        'Top P',
        createTopPSlider()
    );
    
    ollamaRow1.appendChild(topKGroup);
    ollamaRow1.appendChild(topPGroup);
    ollamaSettings.appendChild(ollamaRow1);
    
    // Row 2: Repeat Penalty, Repeat Last N
    const ollamaRow2 = document.createElement('div');
    ollamaRow2.className = 'llm-settings-row';
    
    const repeatPenaltyGroup = createFormGroup(
        'Repeat Penalty',
        createRepeatPenaltySlider()
    );
    
    const repeatLastNGroup = createFormGroup(
        'Repeat Last N',
        createRepeatLastNSlider()
    );
    
    ollamaRow2.appendChild(repeatPenaltyGroup);
    ollamaRow2.appendChild(repeatLastNGroup);
    ollamaSettings.appendChild(ollamaRow2);
    
    // Row 3: Num Keep, Num Predict
    const ollamaRow3 = document.createElement('div');
    ollamaRow3.className = 'llm-settings-row';
    
    const numKeepGroup = createFormGroup(
        'Num Keep',
        createNumKeepSlider()
    );
    
    const numPredictGroup = createFormGroup(
        'Num Predict',
        createNumPredictSlider()
    );
    
    ollamaRow3.appendChild(numKeepGroup);
    ollamaRow3.appendChild(numPredictGroup);
    ollamaSettings.appendChild(ollamaRow3);
    
    // Row 4: Presence Penalty, Frequency Penalty
    const ollamaRow4 = document.createElement('div');
    ollamaRow4.className = 'llm-settings-row';
    
    const presencePenaltyGroup = createFormGroup(
        'Presence Penalty',
        createPresencePenaltySlider()
    );
    
    const frequencyPenaltyGroup = createFormGroup(
        'Frequency Penalty',
        createFrequencyPenaltySlider()
    );
    
    ollamaRow4.appendChild(presencePenaltyGroup);
    ollamaRow4.appendChild(frequencyPenaltyGroup);
    ollamaSettings.appendChild(ollamaRow4);
    
    content.appendChild(ollamaSettings);
    
    // LM Studio-specific settings (will be shown/hidden based on provider)
    const lmstudioSettings = document.createElement('div');
    lmstudioSettings.className = 'llm-lmstudio-settings';
    lmstudioSettings.style.display = 'none';
    
    const lmstudioTitle = document.createElement('h4');
    lmstudioTitle.textContent = 'LM Studio Options';
    lmstudioTitle.className = 'llm-subsection-title';
    lmstudioSettings.appendChild(lmstudioTitle);
    
    const lmsRow1 = document.createElement('div');
    lmsRow1.className = 'llm-settings-row';
    
    const lmsTopKGroup = createFormGroup(
        'Top K',
        createLMSTopKSlider()
    );
    
    const lmsTopPGroup = createFormGroup(
        'Top P',
        createLMSTopPSlider()
    );
    
    lmsRow1.appendChild(lmsTopKGroup);
    lmsRow1.appendChild(lmsTopPGroup);
    lmstudioSettings.appendChild(lmsRow1);
    
    const lmsRow2 = document.createElement('div');
    lmsRow2.className = 'llm-settings-row';
    
    const lmsRepeatPenaltyGroup = createFormGroup(
        'Repeat Penalty',
        createLMSRepeatPenaltySlider()
    );
    
    const lmsMinPGroup = createFormGroup(
        'Min P',
        createLMSMinPSlider()
    );
    
    lmsRow2.appendChild(lmsRepeatPenaltyGroup);
    lmsRow2.appendChild(lmsMinPGroup);
    lmstudioSettings.appendChild(lmsRow2);
    
    content.appendChild(lmstudioSettings);
    
    // Conversation context settings
    const contextSettings = document.createElement('div');
    contextSettings.className = 'llm-context-settings';
    
    const contextTitle = document.createElement('h4');
    contextTitle.textContent = 'Conversation Context';
    contextTitle.className = 'llm-subsection-title';
    contextSettings.appendChild(contextTitle);
    
    // Include history checkbox
    const includeHistoryGroup = document.createElement('div');
    includeHistoryGroup.className = 'llm-form-group';
    
    const includeHistoryLabel = document.createElement('label');
    includeHistoryLabel.className = 'llm-checkbox-label';
    
    const includeHistoryCheckbox = document.createElement('input');
    includeHistoryCheckbox.type = 'checkbox';
    includeHistoryCheckbox.className = 'llm-checkbox llm-include-history';
    includeHistoryCheckbox.checked = false;
    
    const includeHistoryText = document.createElement('span');
    includeHistoryText.textContent = 'Include conversation history in prompts';
    
    includeHistoryLabel.appendChild(includeHistoryCheckbox);
    includeHistoryLabel.appendChild(includeHistoryText);
    includeHistoryGroup.appendChild(includeHistoryLabel);
    contextSettings.appendChild(includeHistoryGroup);
    
    // Max history messages
    const maxHistoryGroup = createFormGroup(
        'Max History Messages',
        createMaxHistoryInput()
    );
    contextSettings.appendChild(maxHistoryGroup);
    
    content.appendChild(contextSettings);
    
    // Toggle functionality
    let isCollapsed = true;
    header.addEventListener('click', () => {
        isCollapsed = !isCollapsed;
        content.style.display = isCollapsed ? 'none' : 'block';
        toggleBtn.textContent = isCollapsed ? '▼' : '▲';
    });
    
    section.appendChild(header);
    section.appendChild(content);
    
    return section;
}

/**
 * Helper: Create a form group with label and input
 * @param {string} label - Label text
 * @param {HTMLElement} input - Input element
 * @returns {HTMLElement} - Form group element
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

/**
 * Create template selector dropdown
 * @returns {HTMLElement} - Container with category and template selectors
 */
function createTemplateSelector() {
    const container = document.createElement('div');
    container.className = 'llm-template-selector-container';
    
    // Category selector
    const categorySelect = document.createElement('select');
    categorySelect.className = 'llm-select llm-category-select';
    categorySelect.innerHTML = '<option value="">Select category...</option>';
    
    // Template selector
    const templateSelect = document.createElement('select');
    templateSelect.className = 'llm-select llm-template-select';
    templateSelect.innerHTML = '<option value="">Select template...</option>';
    templateSelect.disabled = true;
    
    container.appendChild(categorySelect);
    container.appendChild(templateSelect);
    
    return container;
}

/**
 * Create prompt extras checkboxes
 * @returns {HTMLElement} - Container with checkboxes for prompt extras
 */
function createPromptExtras() {
    const container = document.createElement('div');
    container.className = 'llm-prompt-extras';
    
    const title = document.createElement('h4');
    title.textContent = 'Prompt Modifiers';
    title.className = 'llm-subsection-title';
    container.appendChild(title);
    
    const grid = document.createElement('div');
    grid.className = 'llm-extras-grid';
    container.appendChild(grid);
    
    return container;
}

/**
 * Add image to preview grid
 * @param {Object} state - Tab state
 * @param {HTMLElement} previewGrid - Preview grid container
 * @param {HTMLElement} imageCount - Image count indicator
 * @param {HTMLElement} clearAllBtn - Clear all button
 * @param {File} file - Image file
 */
async function addImageToPreview(state, previewGrid, imageCount, clearAllBtn, file) {
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    
    // Convert to base64
    const base64 = await fileToBase64(file);
    
    // Add to state
    const imageData = { file, preview: previewUrl, base64 };
    state.images.push(imageData);
    
    // Create preview item
    const previewItem = document.createElement('div');
    previewItem.className = 'llm-image-preview-item';
    
    const img = document.createElement('img');
    img.src = previewUrl;
    img.className = 'llm-preview-image';
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'llm-remove-image-btn';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Remove image';
    removeBtn.addEventListener('click', () => {
        removeImageFromPreview(state, previewGrid, imageCount, clearAllBtn, imageData, previewItem);
    });
    
    previewItem.appendChild(img);
    previewItem.appendChild(removeBtn);
    previewGrid.appendChild(previewItem);
    
    // Update UI
    updateImageUI(state, previewGrid, imageCount, clearAllBtn);
}

/**
 * Remove image from preview grid
 * @param {Object} state - Tab state
 * @param {HTMLElement} previewGrid - Preview grid container
 * @param {HTMLElement} imageCount - Image count indicator
 * @param {HTMLElement} clearAllBtn - Clear all button
 * @param {Object} imageData - Image data to remove
 * @param {HTMLElement} previewItem - Preview item element
 */
function removeImageFromPreview(state, previewGrid, imageCount, clearAllBtn, imageData, previewItem) {
    // Remove from state
    const index = state.images.indexOf(imageData);
    if (index > -1) {
        state.images.splice(index, 1);
    }
    
    // Revoke URL
    URL.revokeObjectURL(imageData.preview);
    
    // Remove from DOM
    previewItem.remove();
    
    // Update UI
    updateImageUI(state, previewGrid, imageCount, clearAllBtn);
}

/**
 * Clear all images
 * @param {Object} state - Tab state
 * @param {HTMLElement} previewGrid - Preview grid container
 * @param {HTMLElement} imageCount - Image count indicator
 * @param {HTMLElement} clearAllBtn - Clear all button
 */
function clearAllImages(state, previewGrid, imageCount, clearAllBtn) {
    // Revoke all URLs
    state.images.forEach(img => URL.revokeObjectURL(img.preview));
    
    // Clear state
    state.images = [];
    
    // Clear DOM
    previewGrid.innerHTML = '';
    
    // Update UI
    updateImageUI(state, previewGrid, imageCount, clearAllBtn);
}

/**
 * Update image UI elements
 * @param {Object} state - Tab state
 * @param {HTMLElement} previewGrid - Preview grid container
 * @param {HTMLElement} imageCount - Image count indicator
 * @param {HTMLElement} clearAllBtn - Clear all button
 */
function updateImageUI(state, previewGrid, imageCount, clearAllBtn) {
    const count = state.images.length;
    imageCount.textContent = `${count} image${count !== 1 ? 's' : ''}`;
    
    if (count > 0) {
        previewGrid.style.display = 'grid';
        clearAllBtn.style.display = 'inline-block';
    } else {
        previewGrid.style.display = 'none';
        clearAllBtn.style.display = 'none';
    }
}

/**
 * Convert file to base64
 * @param {File} file - File to convert
 * @returns {Promise<string>} - Base64 string (without data URL prefix)
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Strip the data URL prefix (e.g., "data:image/png;base64,")
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Validate image file
 * @param {File} file - File to validate
 * @returns {Object|null} - Error object if invalid, null if valid
 */
function validateImageFile(file) {
    // List of supported image formats
    const supportedFormats = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif'
    ];
    
    // Check if it's an image
    if (!file.type.startsWith('image/')) {
        return { file: file.name, error: 'Not an image file' };
    }
    
    // Check if format is supported
    if (!supportedFormats.includes(file.type.toLowerCase())) {
        const format = file.type.split('/')[1]?.toUpperCase() || 'unknown';
        return { file: file.name, error: `Unsupported format (${format}). Supported: JPEG, PNG, WEBP, GIF` };
    }
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(1);
        return { file: file.name, error: `File too large (${sizeMB}MB). Maximum: 10MB` };
    }
    
    return null; // Valid
}

/**
 * Create system prompt textarea
 * @returns {HTMLElement} - System prompt textarea
 */
function createSystemPromptInput() {
    const container = document.createElement('div');
    container.className = 'llm-system-prompt-container';
    
    const textarea = document.createElement('textarea');
    textarea.className = 'llm-textarea llm-system-prompt';
    textarea.placeholder = 'Optional: Define the AI\'s role and behavior (e.g., "You are a helpful assistant...")';
    textarea.rows = 3;
    textarea.setAttribute('aria-label', 'System prompt - Define AI behavior');
    
    // Keyboard shortcuts
    textarea.addEventListener('keydown', (e) => {
        // Escape to blur/unfocus
        if (e.key === 'Escape') {
            textarea.blur();
        }
    });
    
    const clearBtn = document.createElement('button');
    clearBtn.className = 'llm-btn llm-btn-secondary llm-btn-small llm-clear-system-btn';
    clearBtn.innerHTML = '🗑️ Clear';
    clearBtn.title = 'Clear system prompt';
    clearBtn.addEventListener('click', () => {
        textarea.value = '';
        textarea.dispatchEvent(new Event('input'));
    });
    
    container.appendChild(textarea);
    container.appendChild(clearBtn);
    
    return container;
}

/**
 * Create temperature slider
 * @returns {HTMLElement} - Temperature slider container
 */
function createTemperatureSlider() {
    const container = document.createElement('div');
    container.className = 'llm-slider-container';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '2';
    slider.step = '0.1';
    slider.value = '0.7';
    slider.className = 'llm-slider llm-temperature-slider';
    
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'llm-slider-value';
    valueDisplay.textContent = '0.7';
    
    slider.addEventListener('input', () => {
        valueDisplay.textContent = slider.value;
    });
    
    container.appendChild(slider);
    container.appendChild(valueDisplay);
    
    return container;
}

/**
 * Create seed input
 * @returns {HTMLElement} - Seed input container
 */
function createSeedInput() {
    const container = document.createElement('div');
    container.className = 'llm-seed-container';
    
    const input = document.createElement('input');
    input.type = 'number';
    input.value = '42';
    input.className = 'llm-input llm-seed-input';
    input.placeholder = 'Seed';
    
    const randomBtn = document.createElement('button');
    randomBtn.className = 'llm-btn llm-btn-secondary llm-btn-small llm-random-seed-btn';
    randomBtn.innerHTML = '🎲';
    randomBtn.title = 'Random seed';
    randomBtn.addEventListener('click', () => {
        input.value = Math.floor(Math.random() * 1000000);
        input.dispatchEvent(new Event('input'));
    });
    
    container.appendChild(input);
    container.appendChild(randomBtn);
    
    return container;
}

/**
 * Create max tokens input
 * @returns {HTMLElement} - Max tokens input container
 */
function createMaxTokensInput() {
    const container = document.createElement('div');
    container.className = 'llm-max-tokens-container';
    
    const input = document.createElement('input');
    input.type = 'number';
    input.value = '1024';
    input.min = '1';
    input.max = '32768';
    input.className = 'llm-input llm-max-tokens-input';
    input.placeholder = 'Max tokens';
    
    const presets = document.createElement('div');
    presets.className = 'llm-token-presets';
    
    const presetValues = [256, 512, 1024, 2048, 4096];
    presetValues.forEach(value => {
        const btn = document.createElement('button');
        btn.className = 'llm-btn llm-btn-secondary llm-btn-small';
        btn.textContent = value.toString();
        btn.title = `Set to ${value} tokens`;
        btn.addEventListener('click', () => {
            input.value = value;
            input.dispatchEvent(new Event('input'));
        });
        presets.appendChild(btn);
    });
    
    container.appendChild(input);
    container.appendChild(presets);
    
    return container;
}

/**
 * Create max history messages input
 * @returns {HTMLElement} - Max history input container
 */
function createMaxHistoryInput() {
    const container = document.createElement('div');
    container.className = 'llm-max-history-container';
    
    const input = document.createElement('input');
    input.type = 'number';
    input.value = '10';
    input.min = '1';
    input.max = '100';
    input.className = 'llm-input llm-max-history-input';
    input.placeholder = 'Max messages';
    input.title = 'Maximum number of previous messages to include (2 messages = 1 exchange)';
    
    const presets = document.createElement('div');
    presets.className = 'llm-history-presets';
    
    const presetValues = [5, 10, 20, 50];
    presetValues.forEach(value => {
        const btn = document.createElement('button');
        btn.className = 'llm-btn llm-btn-secondary llm-btn-small';
        btn.textContent = value.toString();
        btn.title = `Set to ${value} messages`;
        btn.addEventListener('click', () => {
            input.value = value;
            input.dispatchEvent(new Event('input'));
        });
        presets.appendChild(btn);
    });
    
    container.appendChild(input);
    container.appendChild(presets);
    
    return container;
}

/**
 * Create top-k slider (Ollama)
 * @returns {HTMLElement} - Top-k slider container
 */
function createTopKSlider() {
    const container = document.createElement('div');
    container.className = 'llm-slider-container';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '1';
    slider.max = '100';
    slider.step = '1';
    slider.value = '40';
    slider.className = 'llm-slider llm-topk-slider';
    
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'llm-slider-value';
    valueDisplay.textContent = '40';
    
    slider.addEventListener('input', () => {
        valueDisplay.textContent = slider.value;
    });
    
    container.appendChild(slider);
    container.appendChild(valueDisplay);
    
    return container;
}

/**
 * Create top-p slider (Ollama)
 * @returns {HTMLElement} - Top-p slider container
 */
function createTopPSlider() {
    const container = document.createElement('div');
    container.className = 'llm-slider-container';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.05';
    slider.value = '0.9';
    slider.className = 'llm-slider llm-topp-slider';
    
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'llm-slider-value';
    valueDisplay.textContent = '0.9';
    
    slider.addEventListener('input', () => {
        valueDisplay.textContent = slider.value;
    });
    
    container.appendChild(slider);
    container.appendChild(valueDisplay);
    
    return container;
}

/**
 * Create repeat penalty slider (Ollama)
 * @returns {HTMLElement} - Repeat penalty slider container
 */
function createRepeatPenaltySlider() {
    const container = document.createElement('div');
    container.className = 'llm-slider-container';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '2';
    slider.step = '0.1';
    slider.value = '1.1';
    slider.className = 'llm-slider llm-repeat-penalty-slider';
    
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'llm-slider-value';
    valueDisplay.textContent = '1.1';
    
    slider.addEventListener('input', () => {
        valueDisplay.textContent = slider.value;
    });
    
    container.appendChild(slider);
    container.appendChild(valueDisplay);
    
    return container;
}

/**
 * Create LM Studio top K slider
 * @returns {HTMLElement} - Top K slider container
 */
function createLMSTopKSlider() {
    const container = document.createElement('div');
    container.className = 'llm-slider-container';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '1';
    slider.max = '100';
    slider.step = '1';
    slider.value = '40';
    slider.className = 'llm-slider llm-lms-topk-slider';
    
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'llm-slider-value';
    valueDisplay.textContent = '40';
    
    slider.addEventListener('input', () => {
        valueDisplay.textContent = slider.value;
    });
    
    container.appendChild(slider);
    container.appendChild(valueDisplay);
    
    return container;
}

/**
 * Create LM Studio top P slider
 * @returns {HTMLElement} - Top P slider container
 */
function createLMSTopPSlider() {
    const container = document.createElement('div');
    container.className = 'llm-slider-container';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.01';
    slider.value = '0.95';
    slider.className = 'llm-slider llm-lms-topp-slider';
    
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'llm-slider-value';
    valueDisplay.textContent = '0.95';
    
    slider.addEventListener('input', () => {
        valueDisplay.textContent = slider.value;
    });
    
    container.appendChild(slider);
    container.appendChild(valueDisplay);
    
    return container;
}

/**
 * Create LM Studio repeat penalty slider
 * @returns {HTMLElement} - Repeat penalty slider container
 */
function createLMSRepeatPenaltySlider() {
    const container = document.createElement('div');
    container.className = 'llm-slider-container';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '2';
    slider.step = '0.1';
    slider.value = '1.1';
    slider.className = 'llm-slider llm-lms-repeat-penalty-slider';
    
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'llm-slider-value';
    valueDisplay.textContent = '1.1';
    
    slider.addEventListener('input', () => {
        valueDisplay.textContent = slider.value;
    });
    
    container.appendChild(slider);
    container.appendChild(valueDisplay);
    
    return container;
}

/**
 * Create LM Studio min P slider
 * @returns {HTMLElement} - Min P slider container
 */
function createLMSMinPSlider() {
    const container = document.createElement('div');
    container.className = 'llm-slider-container';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.01';
    slider.value = '0.05';
    slider.className = 'llm-slider llm-lms-minp-slider';
    
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'llm-slider-value';
    valueDisplay.textContent = '0.05';
    
    slider.addEventListener('input', () => {
        valueDisplay.textContent = slider.value;
    });
    
    container.appendChild(slider);
    container.appendChild(valueDisplay);
    
    return container;
}

/**
 * Create num keep slider (Ollama)
 * @returns {HTMLElement} - Num keep slider container
 */
function createNumKeepSlider() {
    const container = document.createElement('div');
    container.className = 'llm-slider-container';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.step = '1';
    slider.value = '0';
    slider.className = 'llm-slider llm-num-keep-slider';
    
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'llm-slider-value';
    valueDisplay.textContent = '0';
    
    slider.addEventListener('input', () => {
        valueDisplay.textContent = slider.value;
    });
    
    container.appendChild(slider);
    container.appendChild(valueDisplay);
    
    return container;
}

/**
 * Create num predict slider (Ollama)
 * @returns {HTMLElement} - Num predict slider container
 */
function createNumPredictSlider() {
    const container = document.createElement('div');
    container.className = 'llm-slider-container';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '-1';
    slider.max = '2048';
    slider.step = '1';
    slider.value = '-1';
    slider.className = 'llm-slider llm-num-predict-slider';
    
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'llm-slider-value';
    valueDisplay.textContent = '-1';
    
    slider.addEventListener('input', () => {
        valueDisplay.textContent = slider.value;
    });
    
    container.appendChild(slider);
    container.appendChild(valueDisplay);
    
    return container;
}

/**
 * Create repeat last N slider (Ollama)
 * @returns {HTMLElement} - Repeat last N slider container
 */
function createRepeatLastNSlider() {
    const container = document.createElement('div');
    container.className = 'llm-slider-container';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '256';
    slider.step = '1';
    slider.value = '64';
    slider.className = 'llm-slider llm-repeat-last-n-slider';
    
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'llm-slider-value';
    valueDisplay.textContent = '64';
    
    slider.addEventListener('input', () => {
        valueDisplay.textContent = slider.value;
    });
    
    container.appendChild(slider);
    container.appendChild(valueDisplay);
    
    return container;
}

/**
 * Create presence penalty slider (Ollama)
 * @returns {HTMLElement} - Presence penalty slider container
 */
function createPresencePenaltySlider() {
    const container = document.createElement('div');
    container.className = 'llm-slider-container';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '-2';
    slider.max = '2';
    slider.step = '0.1';
    slider.value = '0';
    slider.className = 'llm-slider llm-presence-penalty-slider';
    
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'llm-slider-value';
    valueDisplay.textContent = '0.0';
    
    slider.addEventListener('input', () => {
        valueDisplay.textContent = parseFloat(slider.value).toFixed(1);
    });
    
    container.appendChild(slider);
    container.appendChild(valueDisplay);
    
    return container;
}

/**
 * Create frequency penalty slider (Ollama)
 * @returns {HTMLElement} - Frequency penalty slider container
 */
function createFrequencyPenaltySlider() {
    const container = document.createElement('div');
    container.className = 'llm-slider-container';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '-2';
    slider.max = '2';
    slider.step = '0.1';
    slider.value = '0';
    slider.className = 'llm-slider llm-frequency-penalty-slider';
    
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'llm-slider-value';
    valueDisplay.textContent = '0.0';
    
    slider.addEventListener('input', () => {
        valueDisplay.textContent = parseFloat(slider.value).toFixed(1);
    });
    
    container.appendChild(slider);
    container.appendChild(valueDisplay);
    
    return container;
}

/**
 * Create keep alive slider (both providers)
 * @returns {HTMLElement} - Keep alive slider container
 */
function createKeepAliveSlider() {
    const container = document.createElement('div');
    container.className = 'llm-slider-container';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '3600';
    slider.step = '60';
    slider.value = '300';
    slider.className = 'llm-slider llm-keep-alive-slider';
    
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'llm-slider-value';
    valueDisplay.textContent = '5m';
    
    slider.addEventListener('input', () => {
        const seconds = parseInt(slider.value);
        if (seconds === 0) {
            valueDisplay.textContent = 'Off';
        } else if (seconds < 60) {
            valueDisplay.textContent = `${seconds}s`;
        } else {
            valueDisplay.textContent = `${Math.floor(seconds / 60)}m`;
        }
    });
    
    container.appendChild(slider);
    container.appendChild(valueDisplay);
    
    return container;
}

/**
 * Creates the response section
 * @returns {HTMLElement} - Response section element
 */
function createResponseSection() {
    const section = document.createElement('div');
    section.className = 'llm-response-section';
    section.setAttribute('role', 'region');
    section.setAttribute('aria-labelledby', 'llm-response-title');
    
    // Response header
    const responseHeader = document.createElement('div');
    responseHeader.className = 'llm-response-header';
    
    const responseTitle = document.createElement('h3');
    responseTitle.textContent = 'Response';
    responseTitle.className = 'llm-section-title';
    responseTitle.id = 'llm-response-title';
    
    const responseActions = document.createElement('div');
    responseActions.className = 'llm-response-actions';
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'llm-btn llm-btn-secondary llm-btn-small llm-copy-btn';
    copyBtn.innerHTML = '📋 Copy';
    copyBtn.title = 'Copy response to clipboard';
    copyBtn.style.display = 'none'; // Hide until response generated
    copyBtn.setAttribute('aria-label', 'Copy response to clipboard');
    
    const copyToNodeBtn = document.createElement('button');
    copyToNodeBtn.className = 'llm-btn llm-btn-secondary llm-btn-small llm-copy-to-node-btn';
    copyToNodeBtn.innerHTML = '📤 To Node';
    copyToNodeBtn.title = 'Copy response to selected node';
    copyToNodeBtn.style.display = 'none'; // Hide until response generated
    copyToNodeBtn.setAttribute('aria-label', 'Copy response to selected node');
    
    const sendToPromptBtn = document.createElement('button');
    sendToPromptBtn.className = 'llm-btn llm-btn-secondary llm-btn-small llm-send-to-prompt-btn';
    sendToPromptBtn.innerHTML = '📝 Send to Prompt Builder';
    sendToPromptBtn.title = 'Send response to Prompt Builder tab';
    sendToPromptBtn.style.display = 'none'; // Hide until response generated
    sendToPromptBtn.setAttribute('aria-label', 'Send response to Prompt Builder tab');
    
    const stopBtn = document.createElement('button');
    stopBtn.className = 'llm-btn llm-btn-danger llm-btn-small llm-stop-btn';
    stopBtn.innerHTML = '⏹ Stop';
    stopBtn.title = 'Stop generation';
    stopBtn.style.display = 'none'; // Hide until generating
    stopBtn.setAttribute('aria-label', 'Stop generation');
    
    responseActions.appendChild(copyBtn);
    responseActions.appendChild(copyToNodeBtn);
    responseActions.appendChild(sendToPromptBtn);
    responseActions.appendChild(stopBtn);
    
    responseHeader.appendChild(responseTitle);
    responseHeader.appendChild(responseActions);
    
    // Response display area
    const responseDisplay = document.createElement('div');
    responseDisplay.className = 'llm-response-display';
    responseDisplay.innerHTML = '<p class="llm-placeholder">Response will appear here...</p>';
    responseDisplay.setAttribute('role', 'log');
    responseDisplay.setAttribute('aria-live', 'polite');
    responseDisplay.setAttribute('aria-atomic', 'false');
    responseDisplay.setAttribute('aria-label', 'LLM response output');
    responseDisplay.setAttribute('role', 'log');
    responseDisplay.setAttribute('aria-live', 'polite');
    responseDisplay.setAttribute('aria-atomic', 'false');
    responseDisplay.setAttribute('aria-label', 'LLM response output');
    
    // Status message
    const statusMessage = document.createElement('div');
    statusMessage.className = 'llm-status-message';
    statusMessage.style.display = 'none';
    statusMessage.setAttribute('role', 'status');
    statusMessage.setAttribute('aria-live', 'polite');
    statusMessage.setAttribute('aria-atomic', 'true');
    
    section.appendChild(responseHeader);
    section.appendChild(responseDisplay);
    section.appendChild(statusMessage);
    
    return section;
}

/**
 * Create conversation history section
 * @returns {HTMLElement} - History section element
 */
function createHistorySection() {
    const section = document.createElement('div');
    section.className = 'llm-history-section';
    
    // Section header (collapsible)
    const header = document.createElement('div');
    header.className = 'llm-history-header';
    
    const title = document.createElement('h3');
    title.textContent = '📜 Conversation History';
    title.className = 'llm-section-title';
    
    const headerActions = document.createElement('div');
    headerActions.className = 'llm-header-actions';
    
    const newConvBtn = document.createElement('button');
    newConvBtn.className = 'llm-btn llm-btn-secondary llm-btn-small llm-new-conversation-btn';
    newConvBtn.innerHTML = '+ New';
    newConvBtn.title = 'Start new conversation';
    
    const importBtn = document.createElement('button');
    importBtn.className = 'llm-btn llm-btn-secondary llm-btn-small llm-import-conversation-btn';
    importBtn.innerHTML = '📥 Import';
    importBtn.title = 'Import conversation from JSON file';
    
    // Hidden file input for import
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    
    const clearHistoryBtn = document.createElement('button');
    clearHistoryBtn.className = 'llm-btn llm-btn-danger llm-btn-small llm-clear-history-btn';
    clearHistoryBtn.innerHTML = '🗑️ Clear All';
    clearHistoryBtn.title = 'Clear all conversation history';
    
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'llm-collapse-btn';
    toggleBtn.textContent = '▼';
    toggleBtn.title = 'Toggle history panel';
    
    headerActions.appendChild(newConvBtn);
    headerActions.appendChild(importBtn);
    headerActions.appendChild(clearHistoryBtn);
    headerActions.appendChild(toggleBtn);
    
    header.appendChild(title);
    header.appendChild(headerActions);
    header.appendChild(fileInput);
    
    // Content container (initially collapsed)
    const content = document.createElement('div');
    content.className = 'llm-history-content';
    content.style.display = 'none';
    
    // Conversation list
    const conversationList = document.createElement('div');
    conversationList.className = 'llm-conversation-list';
    conversationList.innerHTML = '<p class="llm-placeholder">No conversations yet...</p>';
    
    content.appendChild(conversationList);
    
    // Toggle functionality
    let isCollapsed = true;
    header.addEventListener('click', (e) => {
        // Don't toggle if clicking on buttons
        if (e.target.closest('button')) return;
        
        isCollapsed = !isCollapsed;
        content.style.display = isCollapsed ? 'none' : 'block';
        toggleBtn.textContent = isCollapsed ? '▼' : '▲';
    });
    
    section.appendChild(header);
    section.appendChild(content);
    
    return section;
}

/**
 * Update conversation list in history panel
 * @param {Object} state - Tab state object
 * @param {HTMLElement} historySection - History section element
 * @param {HTMLElement} responseSection - Response section element
 */
function updateConversationList(state, historySection, responseSection) {
    const conversationList = historySection.querySelector('.llm-conversation-list');
    if (!conversationList) return;
    
    if (!state.conversationHistory || state.conversationHistory.length === 0) {
        conversationList.innerHTML = '<p class="llm-placeholder">No conversations yet...</p>';
        return;
    }
    
    conversationList.innerHTML = '';
    
    state.conversationHistory.forEach(conversation => {
        const item = document.createElement('div');
        item.className = 'llm-conversation-item';
        if (conversation.id === state.currentConversationId) {
            item.classList.add('active');
        }
        
        const itemHeader = document.createElement('div');
        itemHeader.className = 'llm-conversation-item-header';
        
        const itemTitle = document.createElement('div');
        itemTitle.className = 'llm-conversation-item-title';
        itemTitle.textContent = conversation.title;
        itemTitle.title = conversation.title;
        
        const itemActions = document.createElement('div');
        itemActions.className = 'llm-conversation-item-actions';
        
        const exportBtn = document.createElement('button');
        exportBtn.className = 'llm-btn-icon';
        exportBtn.innerHTML = '💾';
        exportBtn.title = 'Export conversation';
        exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showExportMenu(conversation, exportBtn);
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'llm-btn-icon llm-btn-danger-icon';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Delete conversation';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Delete this conversation?')) {
                deleteConversation(state, conversation.id);
                updateConversationList(state, historySection, responseSection);
            }
        });
        
        itemActions.appendChild(exportBtn);
        itemActions.appendChild(deleteBtn);
        
        itemHeader.appendChild(itemTitle);
        itemHeader.appendChild(itemActions);
        
        const itemMeta = document.createElement('div');
        itemMeta.className = 'llm-conversation-item-meta';
        const date = new Date(conversation.updated).toLocaleString();
        const messageCount = conversation.messages.length;
        itemMeta.textContent = `${date} • ${messageCount} message${messageCount !== 1 ? 's' : ''}`;
        
        item.appendChild(itemHeader);
        item.appendChild(itemMeta);
        
        // Click to load conversation
        item.addEventListener('click', () => {
            loadAndDisplayConversation(state, conversation.id, historySection, responseSection);
        });
        
        conversationList.appendChild(item);
    });
}

/**
 * Show export menu for a conversation
 * @param {Object} conversation - Conversation object
 * @param {HTMLElement} button - Button element that triggered the menu
 */
function showExportMenu(conversation, button) {
    // Remove any existing menu
    const existingMenu = document.querySelector('.llm-export-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    const menu = document.createElement('div');
    menu.className = 'llm-export-menu';
    
    const exportJSON = document.createElement('button');
    exportJSON.textContent = 'Export as JSON';
    exportJSON.className = 'llm-export-menu-item';
    exportJSON.addEventListener('click', () => {
        downloadConversation(conversation, 'json');
        menu.remove();
    });
    
    const exportText = document.createElement('button');
    exportText.textContent = 'Export as Text';
    exportText.className = 'llm-export-menu-item';
    exportText.addEventListener('click', () => {
        downloadConversation(conversation, 'text');
        menu.remove();
    });
    
    menu.appendChild(exportJSON);
    menu.appendChild(exportText);
    
    // Position menu next to button
    const rect = button.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 5}px`;
    menu.style.left = `${rect.left}px`;
    
    document.body.appendChild(menu);
    
    // Close menu when clicking outside
    setTimeout(() => {
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        document.addEventListener('click', closeMenu);
    }, 100);
}

/**
 * Load and display a conversation
 * @param {Object} state - Tab state object
 * @param {string} conversationId - Conversation ID to load
 * @param {HTMLElement} historySection - History section element
 * @param {HTMLElement} responseSection - Response section element
 */
function loadAndDisplayConversation(state, conversationId, historySection, responseSection) {
    const conversation = loadConversation(state, conversationId);
    if (!conversation) return;
    
    // Update active state in list
    updateConversationList(state, historySection, responseSection);
    
    // Display conversation messages
    const responseDisplay = responseSection.querySelector('.llm-response-display');
    if (responseDisplay) {
        // Build formatted conversation display
        let displayText = '';
        conversation.messages.forEach((msg, index) => {
            const timestamp = new Date(msg.timestamp).toLocaleString();
            const roleLabel = msg.role === 'user' ? '👤 User' : '🤖 Assistant';
            
            displayText += `${roleLabel} (${timestamp}):\n`;
            displayText += `${msg.content}\n`;
            
            // Add separator between messages (but not after last one)
            if (index < conversation.messages.length - 1) {
                displayText += '\n' + '─'.repeat(60) + '\n\n';
            }
        });
        
        responseDisplay.textContent = displayText;
        responseDisplay.scrollTop = 0; // Scroll to top
    }
    
    // Show status
    const statusMessage = responseSection.querySelector('.llm-status-message');
    if (statusMessage) {
        statusMessage.textContent = `Loaded conversation: ${conversation.title}`;
        statusMessage.className = 'llm-status-message llm-status-info';
        setTimeout(() => {
            statusMessage.textContent = '';
            statusMessage.className = 'llm-status-message';
        }, 3000);
    }
}

/**
 * Initialize tab with data loading
 * @param {Object} state - Tab state object
 * @param {HTMLElement} modelSelection - Model selection section
 * @param {HTMLElement} inputSection - Input section
 * @param {HTMLElement} advancedOptions - Advanced options section
 * @param {HTMLElement} responseSection - Response section
 */
async function initializeTab(state, modelSelection, visionSection, inputSection, advancedOptions, responseSection, historySection) {
    // Load status and models
    await loadModels(state, modelSelection, visionSection);
    
    // Load prompt templates
    await loadPromptTemplates(state, advancedOptions);
    
    // Load presets
    await loadPresets(state, modelSelection);
    
    // Set up event handlers
    setupEventHandlers(state, modelSelection, visionSection, inputSection, advancedOptions, responseSection, historySection);
}

/**
 * Load models and status from API
 * @param {Object} state - Tab state object
 * @param {HTMLElement} modelSelection - Model selection section
 * @param {HTMLElement} visionSection - Vision section
 */
async function loadModels(state, modelSelection, visionSection, force = false) {
    const providerSelect = modelSelection.querySelector('.llm-provider-select');
    const modelSelect = modelSelection.querySelector('.llm-model-select');
    const statusIndicator = modelSelection.querySelector('.llm-status-indicator');
    const statusDot = statusIndicator.querySelector('.status-dot');
    const statusText = statusIndicator.querySelector('.status-text');
    
    try {
        // Show loading state
        modelSelect.innerHTML = '<option value="">Loading models...</option>';
        modelSelect.disabled = true;
        statusDot.className = 'status-dot status-loading';
        statusText.textContent = force ? 'Re-initializing...' : 'Loading...';
        
        // Fetch status, models, and vision models (with force flag if requested)
        const [status, modelsData, visionModelsData] = await Promise.all([
            llmApi.getStatus(),
            llmApi.getModels(force),
            llmApi.getVisionModels(force)
        ]);
        
        // Store models in state
        state.models = modelsData.models;
        state.visionModels = visionModelsData.models;
        
        // Update status indicator
        const currentProvider = providerSelect.value;
        const isAvailable = status[currentProvider]?.available;
        const isEnabled = status[currentProvider]?.enabled;
        
        if (isAvailable && isEnabled) {
            statusDot.className = 'status-dot status-online';
            statusText.textContent = `${currentProvider === 'ollama' ? 'Ollama' : 'LM Studio'} online`;
        } else if (!isEnabled) {
            statusDot.className = 'status-dot status-disabled';
            statusText.textContent = `${currentProvider === 'ollama' ? 'Ollama' : 'LM Studio'} disabled`;
        } else {
            statusDot.className = 'status-dot status-offline';
            statusText.textContent = `${currentProvider === 'ollama' ? 'Ollama' : 'LM Studio'} offline`;
        }
        
        // Populate model dropdown
        updateModelDropdown(state, modelSelect, currentProvider);
        
    } catch (error) {
        console.error('Error loading models:', error);
        statusDot.className = 'status-dot status-error';
        statusText.textContent = 'Error loading models';
        modelSelect.innerHTML = '<option value="">Error loading models</option>';
    } finally {
        modelSelect.disabled = false;
    }
}

/**
 * Update model dropdown based on selected provider
 * @param {Object} state - Tab state object
 * @param {HTMLSelectElement} modelSelect - Model select element
 * @param {string} provider - Selected provider
 */
function updateModelDropdown(state, modelSelect, provider) {
    const models = state.models[provider] || [];
    const visionModels = state.visionModels[provider] || [];
    
    if (models.length === 0) {
        modelSelect.innerHTML = '<option value="">No models available</option>';
        state.model = null;
        return;
    }
    
    // Create Set for faster lookup
    const visionModelSet = new Set(visionModels);
    
    modelSelect.innerHTML = models.map(model => {
        const isVision = visionModelSet.has(model);
        const icon = isVision ? '👁️ ' : '';
        return `<option value="${model}">${icon}${model}</option>`;
    }).join('');
    
    // Select first model by default
    state.model = models[0];
}

/**
 * Toggle vision section visibility based on selected model
 * @param {Object} state - Tab state object
 * @param {HTMLElement} visionSection - Vision section element
 */
function updateVisionSectionVisibility(state, visionSection) {
    if (!state.model) {
        visionSection.style.display = 'none';
        return;
    }
    
    const visionModels = state.visionModels[state.provider] || [];
    const isVisionModel = visionModels.includes(state.model);
    
    visionSection.style.display = isVisionModel ? 'block' : 'none';
}

/**
 * Load prompt templates from API
 * @param {Object} state - Tab state object
 * @param {HTMLElement} advancedOptions - Advanced options section
 */
async function loadPromptTemplates(state, advancedOptions) {
    const categorySelect = advancedOptions.querySelector('.llm-category-select');
    const extrasGrid = advancedOptions.querySelector('.llm-extras-grid');
    
    try {
        const prompts = await llmApi.getPrompts();
        state.prompts = prompts;
        
        // Build category options from base prompts
        const categories = new Set();
        if (prompts.base) {
            Object.values(prompts.base).forEach(template => {
                if (template.category) {
                    categories.add(template.category);
                }
            });
        }
        
        const categoryOptions = ['<option value="">Select category...</option>'];
        Array.from(categories).sort().forEach(category => {
            categoryOptions.push(`<option value="${category}">${category}</option>`);
        });
        categorySelect.innerHTML = categoryOptions.join('');
        
        // Build extras checkboxes
        if (extrasGrid && prompts.extra) {
            extrasGrid.innerHTML = '';
            
            Object.entries(prompts.extra).forEach(([key, extra]) => {
                if (extra.type === 'boolean') {
                    const checkboxContainer = document.createElement('label');
                    checkboxContainer.className = 'llm-extra-checkbox-label';
                    
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.className = 'llm-extra-checkbox';
                    checkbox.dataset.extraKey = key;
                    checkbox.checked = extra.default || false;
                    
                    const labelText = document.createElement('span');
                    labelText.textContent = extra.name;
                    labelText.title = extra.prompt;
                    
                    checkboxContainer.appendChild(checkbox);
                    checkboxContainer.appendChild(labelText);
                    extrasGrid.appendChild(checkboxContainer);
                    
                    // Initialize state
                    state.selectedExtras[key] = checkbox.checked;
                }
            });
        }
        
    } catch (error) {
        console.error('Error loading prompt templates:', error);
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">Error loading templates</option>';
        }
    }
}

/**
 * Load presets from API and populate dropdown
 * @param {Object} state - Tab state object
 * @param {HTMLElement} modelSelection - Model selection section
 */
async function loadPresets(state, modelSelection) {
    const presetSelect = modelSelection.querySelector('.llm-preset-select');
    
    try {
        // Import preset module
        const presetModule = await import('../llm/llmPresets.js');
        const presets = await presetModule.getPresets();
        
        // Store presets in state
        state.presets = presets;
        
        // Build preset options grouped by category
        const options = ['<option value="">None (Manual Settings)</option>'];
        
        // Group presets by category
        const categories = {};
        Object.entries(presets).forEach(([id, preset]) => {
            const category = preset.category || 'other';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push({ id, preset });
        });
        
        // Add options by category
        const sortedCategories = Object.keys(categories).sort((a, b) => {
            // Built-in categories first
            const order = ['description', 'chat', 'custom', 'imported', 'other'];
            const aIndex = order.indexOf(a);
            const bIndex = order.indexOf(b);
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            return a.localeCompare(b);
        });
        
        sortedCategories.forEach(category => {
            // Add optgroup
            const label = category.charAt(0).toUpperCase() + category.slice(1);
            options.push(`<optgroup label="${label}">`);
            
            // Add presets in this category
            categories[category]
                .sort((a, b) => a.preset.name.localeCompare(b.preset.name))
                .forEach(({ id, preset }) => {
                    const icon = preset.isBuiltin ? '⭐ ' : '';
                    const description = preset.description ? ` - ${preset.description}` : '';
                    options.push(`<option value="${id}">${icon}${preset.name}${description}</option>`);
                });
            
            options.push('</optgroup>');
        });
        
        presetSelect.innerHTML = options.join('');
        
    } catch (error) {
        console.error('Error loading presets:', error);
        presetSelect.innerHTML = '<option value="">Error loading presets</option>';
    }
}

/**
 * Apply a preset to current settings
 * @param {Object} state - Tab state object
 * @param {string} presetId - ID of preset to apply
 * @param {HTMLElement} modelSelection - Model selection section
 * @param {HTMLElement} advancedOptions - Advanced options section
 * @param {HTMLElement} inputSection - Input section (for prompt textarea)
 */
async function applyPresetToUI(state, presetId, modelSelection, advancedOptions, inputSection) {
    if (!presetId || !state.presets || !state.presets[presetId]) {
        return;
    }
    
    const preset = state.presets[presetId];
    
    try {
        // Import preset module
        const presetModule = await import('../llm/llmPresets.js');
        
        // Apply preset to state
        presetModule.applyPreset(state, preset);
        
        // Load and apply system prompt content if specified
        if (preset.systemPrompt) {
            const systemPrompts = await presetModule.getSystemPrompts();
            const systemPromptData = systemPrompts[preset.systemPrompt];
            
            if (systemPromptData && systemPromptData.content) {
                // Apply actual system prompt content to textarea
                const systemPromptTextarea = advancedOptions.querySelector('.llm-system-prompt');
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
                            const textarea = inputSection.querySelector('.llm-main-prompt');
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
        
        showNotification(`Preset "${preset.name}" applied`, 'success');
        
    } catch (error) {
        console.error('Error applying preset:', error);
        showNotification(`Failed to apply preset: ${error.message}`, 'error');
    }
}

/**
 * Show save preset dialog
 * @param {Object} state - Tab state object
 * @param {HTMLElement} modelSelection - Model selection section
 */
async function showSavePresetDialog(state, modelSelection) {
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
            const presetModule = await import('../llm/llmPresets.js');
            
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
 */
async function showManagePresetsDialog(state, modelSelection, advancedOptions, inputSection) {
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
    
    const presetsPanel = createPresetsPanel(state, modelSelection, advancedOptions, inputSection);
    const systemPromptsPanel = createSystemPromptsPanel(state, modelSelection, advancedOptions, inputSection);
    
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
 * @param {Object} state - Tab state object
 * @param {HTMLElement} modelSelection - Model selection section
 * @param {HTMLElement} advancedOptions - Advanced options section
 * @param {HTMLElement} inputSection - Input section
 * @returns {HTMLElement} - Presets panel
 */
function createPresetsPanel(state, modelSelection, advancedOptions, inputSection) {
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
                await showPresetEditor(state, modelSelection, advancedOptions, inputSection, id, preset);
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
                            const presetModule = await import('../llm/llmPresets.js');
                            await presetModule.deletePreset(id);
                            await loadPresets(state, modelSelection);
                            
                            // Refresh the dialog
                            const dialog = document.querySelector('.llm-modal-overlay');
                            if (dialog) {
                                dialog.remove();
                                await showManagePresetsDialog(state, modelSelection, advancedOptions, inputSection);
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
 * When editing a built-in preset, it saves as a user override
 */
async function showPresetEditor(state, modelSelection, advancedOptions, inputSection, presetId = null, existingPreset = null) {
    const presetModule = await import('../llm/llmPresets.js');
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
            const select = document.createElement('select');
            select.className = 'llm-select llm-preset-provider-select';
            
            const providers = ['ollama', 'lmstudio'];
            providers.forEach(provider => {
                const option = document.createElement('option');
                option.value = provider;
                option.textContent = provider.charAt(0).toUpperCase() + provider.slice(1);
                select.appendChild(option);
            });
            
            select.value = existingPreset ? existingPreset.provider : state.provider;
            return select;
        })()
    );
    
    // Model field - now a dropdown that updates based on provider
    const modelGroup = createFormGroup(
        'Model',
        (() => {
            const select = document.createElement('select');
            select.className = 'llm-select llm-preset-model-select';
            select.innerHTML = '<option value="">Loading models...</option>';
            
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
                        select.innerHTML = '<option value="">Use current model</option>';
                        models.forEach(model => {
                            const option = document.createElement('option');
                            option.value = model;
                            const icon = visionModelSet.has(model) ? '👁️ ' : '';
                            option.textContent = `${icon}${model}`;
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
            const select = document.createElement('select');
            select.className = 'llm-select llm-preset-sysprompt-select';
            
            // Load system prompts
            presetModule.getSystemPrompts().then(prompts => {
                Object.entries(prompts).forEach(([id, prompt]) => {
                    const option = document.createElement('option');
                    option.value = id;
                    option.textContent = prompt.name + (prompt.isBuiltin ? ' ⭐' : '');
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
                await showManagePresetsDialog(state, modelSelection, advancedOptions, inputSection);
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
 * @param {Object} state - Tab state object
 * @param {HTMLElement} modelSelection - Model selection section
 * @param {HTMLElement} advancedOptions - Advanced options section
 * @param {HTMLElement} inputSection - Input section
 * @returns {HTMLElement} - System prompts panel
 */
function createSystemPromptsPanel(state, modelSelection, advancedOptions, inputSection) {
    const panel = document.createElement('div');
    panel.className = 'llm-system-prompts-panel';
    
    // Add new prompt button
    const addBtn = document.createElement('button');
    addBtn.className = 'llm-btn llm-btn-primary';
    addBtn.innerHTML = '+ Add System Prompt';
    addBtn.addEventListener('click', () => {
        showSystemPromptEditor(state, modelSelection, advancedOptions, inputSection, null);
    });
    
    panel.appendChild(addBtn);
    
    const list = document.createElement('div');
    list.className = 'llm-system-prompt-list';
    list.innerHTML = '<p class="llm-placeholder">Loading system prompts...</p>';
    
    // Load system prompts
    import('../llm/llmPresets.js').then(async (presetModule) => {
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
                const systemPromptTextarea = advancedOptions.querySelector('.llm-system-prompt');
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
                    showSystemPromptEditor(state, modelSelection, advancedOptions, inputSection, { id, ...prompt });
                });
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'llm-btn llm-btn-small llm-btn-danger';
                deleteBtn.textContent = 'Delete';
                deleteBtn.addEventListener('click', async () => {
                    if (confirm(`Delete system prompt "${prompt.name}"?`)) {
                        try {
                            await presetModule.deleteSystemPrompt(id);
                            
                            // Refresh the dialog
                            const dialog = document.querySelector('.llm-modal-overlay');
                            if (dialog) {
                                dialog.remove();
                                await showManagePresetsDialog(state, modelSelection, advancedOptions, inputSection);
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
 * @param {Object} state - Tab state object
 * @param {HTMLElement} modelSelection - Model selection section
 * @param {HTMLElement} advancedOptions - Advanced options section
 * @param {HTMLElement} inputSection - Input section
 * @param {Object|null} existingPrompt - Existing prompt to edit, or null for new
 */
async function showSystemPromptEditor(state, modelSelection, advancedOptions, inputSection, existingPrompt) {
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
            const presetModule = await import('../llm/llmPresets.js');
            
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
                await showManagePresetsDialog(state, modelSelection, advancedOptions, inputSection);
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
 * Set up event handlers for user interactions
 * @param {Object} state - Tab state object
 * @param {HTMLElement} modelSelection - Model selection section
 * @param {HTMLElement} inputSection - Input section
 * @param {HTMLElement} advancedOptions - Advanced options section
 * @param {HTMLElement} responseSection - Response section
 */
function setupEventHandlers(state, modelSelection, visionSection, inputSection, advancedOptions, responseSection, historySection) {
    const providerSelect = modelSelection.querySelector('.llm-provider-select');
    const modelSelect = modelSelection.querySelector('.llm-model-select');
    const refreshBtn = modelSelection.querySelector('.llm-refresh-btn');
    const sendBtn = inputSection.querySelector('.llm-send-btn');
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
    const systemPrompt = advancedOptions.querySelector('.llm-system-prompt');
    const temperatureSlider = advancedOptions.querySelector('.llm-temperature-slider');
    const seedInput = advancedOptions.querySelector('.llm-seed-input');
    const maxTokensInput = advancedOptions.querySelector('.llm-max-tokens-input');
    const keepAliveSlider = advancedOptions.querySelector('.llm-keep-alive-slider');
    
    // Ollama advanced options
    const topKSlider = advancedOptions.querySelector('.llm-topk-slider');
    const topPSlider = advancedOptions.querySelector('.llm-topp-slider');
    const repeatPenaltySlider = advancedOptions.querySelector('.llm-repeat-penalty-slider');
    const repeatLastNSlider = advancedOptions.querySelector('.llm-repeat-last-n-slider');
    const numKeepSlider = advancedOptions.querySelector('.llm-num-keep-slider');
    const numPredictSlider = advancedOptions.querySelector('.llm-num-predict-slider');
    const presencePenaltySlider = advancedOptions.querySelector('.llm-presence-penalty-slider');
    const frequencyPenaltySlider = advancedOptions.querySelector('.llm-frequency-penalty-slider');
    const ollamaSettings = advancedOptions.querySelector('.llm-ollama-settings');
    
    // LM Studio controls
    const lmsTopKSlider = advancedOptions.querySelector('.llm-lms-topk-slider');
    const lmsTopPSlider = advancedOptions.querySelector('.llm-lms-topp-slider');
    const lmsRepeatPenaltySlider = advancedOptions.querySelector('.llm-lms-repeat-penalty-slider');
    const lmsMinPSlider = advancedOptions.querySelector('.llm-lms-minp-slider');
    const lmstudioSettings = advancedOptions.querySelector('.llm-lmstudio-settings');
    
    // Reset settings button
    const resetSettingsBtn = advancedOptions.querySelector('.llm-reset-settings-btn');
    
    // Provider change
    providerSelect.addEventListener('change', () => {
        state.provider = providerSelect.value;
        updateModelDropdown(state, modelSelect, state.provider);
        loadModels(state, modelSelection, visionSection); // Reload to update status
        
        // Show/hide provider-specific settings
        if (ollamaSettings) {
            ollamaSettings.style.display = state.provider === 'ollama' ? 'block' : 'none';
        }
        if (lmstudioSettings) {
            lmstudioSettings.style.display = state.provider === 'lmstudio' ? 'block' : 'none';
        }
        
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
            showSavePresetDialog(state, modelSelection);
        });
    }
    
    // Manage presets button
    if (managePresetsBtn) {
        managePresetsBtn.addEventListener('click', () => {
            showManagePresetsDialog(state, modelSelection, advancedOptions, inputSection);
        });
    }
    
    // Reset settings button
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', () => {
            if (confirm('Reset all settings to defaults?')) {
                resetSettingsToDefaults(state, advancedOptions);
            }
        });
    }
    
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
            if (e.target.classList.contains('llm-extra-checkbox')) {
                const key = e.target.dataset.extraKey;
                state.selectedExtras[key] = e.target.checked;
            }
        });
    }
    
    // System prompt change
    if (systemPrompt) {
        systemPrompt.addEventListener('input', () => {
            state.settings.systemPrompt = systemPrompt.value;
        });
    }
    
    // Temperature change
    if (temperatureSlider) {
        temperatureSlider.addEventListener('input', () => {
            state.settings.temperature = parseFloat(temperatureSlider.value);
            saveSettings(state.settings);
        });
    }
    
    // Seed change
    if (seedInput) {
        seedInput.addEventListener('input', () => {
            state.settings.seed = parseInt(seedInput.value) || 42;
            saveSettings(state.settings);
        });
    }
    
    // Max tokens change
    if (maxTokensInput) {
        maxTokensInput.addEventListener('input', () => {
            state.settings.maxTokens = parseInt(maxTokensInput.value) || 1024;
            saveSettings(state.settings);
        });
    }
    
    // Keep alive change
    if (keepAliveSlider) {
        keepAliveSlider.addEventListener('input', () => {
            state.settings.keepAlive = parseInt(keepAliveSlider.value);
            saveSettings(state.settings);
        });
    }
    
    // Ollama-specific settings
    if (topKSlider) {
        topKSlider.addEventListener('input', () => {
            state.settings.topK = parseInt(topKSlider.value);
            saveSettings(state.settings);
        });
    }
    
    if (topPSlider) {
        topPSlider.addEventListener('input', () => {
            state.settings.topP = parseFloat(topPSlider.value);
            saveSettings(state.settings);
        });
    }
    
    if (repeatPenaltySlider) {
        repeatPenaltySlider.addEventListener('input', () => {
            state.settings.repeatPenalty = parseFloat(repeatPenaltySlider.value);
            saveSettings(state.settings);
        });
    }
    
    if (repeatLastNSlider) {
        repeatLastNSlider.addEventListener('input', () => {
            state.settings.repeatLastN = parseInt(repeatLastNSlider.value);
            saveSettings(state.settings);
        });
    }
    
    if (numKeepSlider) {
        numKeepSlider.addEventListener('input', () => {
            state.settings.numKeep = parseInt(numKeepSlider.value);
            saveSettings(state.settings);
        });
    }
    
    if (numPredictSlider) {
        numPredictSlider.addEventListener('input', () => {
            state.settings.numPredict = parseInt(numPredictSlider.value);
            saveSettings(state.settings);
        });
    }
    
    if (presencePenaltySlider) {
        presencePenaltySlider.addEventListener('input', () => {
            state.settings.presencePenalty = parseFloat(presencePenaltySlider.value);
            saveSettings(state.settings);
        });
    }
    
    if (frequencyPenaltySlider) {
        frequencyPenaltySlider.addEventListener('input', () => {
            state.settings.frequencyPenalty = parseFloat(frequencyPenaltySlider.value);
            saveSettings(state.settings);
        });
    }
    
    // LM Studio-specific settings
    if (lmsTopKSlider) {
        lmsTopKSlider.addEventListener('input', () => {
            state.settings.lmsTopK = parseInt(lmsTopKSlider.value);
            saveSettings(state.settings);
        });
    }
    
    if (lmsTopPSlider) {
        lmsTopPSlider.addEventListener('input', () => {
            state.settings.lmsTopP = parseFloat(lmsTopPSlider.value);
            saveSettings(state.settings);
        });
    }
    
    if (lmsRepeatPenaltySlider) {
        lmsRepeatPenaltySlider.addEventListener('input', () => {
            state.settings.lmsRepeatPenalty = parseFloat(lmsRepeatPenaltySlider.value);
            saveSettings(state.settings);
        });
    }
    
    if (lmsMinPSlider) {
        lmsMinPSlider.addEventListener('input', () => {
            state.settings.lmsMinP = parseFloat(lmsMinPSlider.value);
            saveSettings(state.settings);
        });
    }
    
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
    
    // Initialize provider-specific settings visibility
    if (ollamaSettings) {
        ollamaSettings.style.display = state.provider === 'ollama' ? 'block' : 'none';
    }
    if (lmstudioSettings) {
        lmstudioSettings.style.display = state.provider === 'lmstudio' ? 'block' : 'none';
    }
    
    // Send button
    sendBtn.addEventListener('click', () => {
        handleSend(state, textarea, responseSection, sendBtn, stopBtn, historySection);
    });
    
    // From node button
    const fromNodeBtn = inputSection.querySelector('.llm-from-node-btn');
    if (fromNodeBtn) {
        fromNodeBtn.addEventListener('click', () => {
            handleCopyFromNode(textarea);
        });
    }
    
    // Stop button
    stopBtn.addEventListener('click', () => {
        handleStop(state, responseSection, sendBtn, stopBtn);
    });
    
    // Vision section event handlers
    
    // Click upload zone to trigger file input
    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    // File input change
    fileInput.addEventListener('change', async () => {
        const files = Array.from(fileInput.files);
        await handleFileUpload(state, previewGrid, imageCount, clearAllBtn, files);
        fileInput.value = ''; // Reset input
    });
    
    // Drag and drop handlers
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
        await handleFileUpload(state, previewGrid, imageCount, clearAllBtn, files);
    });
    
    // Clipboard paste handler (on document for global paste)
    document.addEventListener('paste', async (e) => {
        // Only handle paste when LLM tab is active and vision section is visible
        if (visionSection.style.display === 'none') return;
        
        const items = Array.from(e.clipboardData.items);
        const imageItems = items.filter(item => item.type.startsWith('image/'));
        
        if (imageItems.length > 0) {
            e.preventDefault();
            const files = await Promise.all(
                imageItems.map(item => {
                    return new Promise((resolve) => {
                        const blob = item.getAsFile();
                        resolve(blob);
                    })
                })
            );
            await handleFileUpload(state, previewGrid, imageCount, clearAllBtn, files.filter(Boolean));
        }
    });
    
    // Clear all images button
    clearAllBtn.addEventListener('click', () => {
        clearAllImages(state, previewGrid, imageCount, clearAllBtn);
    });
    
    // Copy button
    copyBtn.addEventListener('click', () => {
        handleCopy(responseSection, copyBtn);
    });
    
    // Copy to node button
    copyToNodeBtn.addEventListener('click', () => {
        handleCopyToNode(responseSection, copyToNodeBtn);
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
            import('../shared/crossTabMessaging.js').then(({ sendTextToPromptBuilder, showNotification }) => {
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
}

/**
 * Handle file upload
 * @param {Object} state - Tab state object
 * @param {HTMLElement} previewGrid - Preview grid container
 * @param {HTMLElement} imageCount - Image count indicator
 * @param {HTMLElement} clearAllBtn - Clear all button
 * @param {File[]} files - Files to upload
 */
async function handleFileUpload(state, previewGrid, imageCount, clearAllBtn, files) {
    const MAX_IMAGES = 10;
    const validFiles = [];
    const errors = [];
    
    // Validate each file
    for (const file of files) {
        const error = validateImageFile(file);
        if (error) {
            errors.push(error);
        } else {
            validFiles.push(file);
        }
    }
    
    // Check if adding these images would exceed the limit
    const currentCount = state.images.length;
    const totalCount = currentCount + validFiles.length;
    
    if (totalCount > MAX_IMAGES) {
        const remaining = MAX_IMAGES - currentCount;
        if (remaining <= 0) {
            showNotification(`Maximum ${MAX_IMAGES} images allowed. Please remove some images first.`, 'error');
            return;
        }
        showNotification(`Can only add ${remaining} more image${remaining === 1 ? '' : 's'} (${MAX_IMAGES} max). Adding first ${remaining}.`, 'warning');
        validFiles.splice(remaining); // Keep only what fits
    }
    
    // Show validation errors
    if (errors.length > 0) {
        const errorMessages = errors.map(e => `${e.file}: ${e.error}`);
        const message = errors.length === 1 
            ? errorMessages[0]
            : `${errors.length} file(s) rejected:\n${errorMessages.slice(0, 3).join('\n')}${errors.length > 3 ? '\n...' : ''}`;
        showNotification(message, 'error');
    }
    
    if (validFiles.length === 0) {
        return;
    }
    
    // Add each valid image to preview
    for (const file of validFiles) {
        await addImageToPreview(state, previewGrid, imageCount, clearAllBtn, file);
    }
    
    // Show success message
    if (validFiles.length > 0) {
        const msg = validFiles.length === 1 
            ? `Added 1 image` 
            : `Added ${validFiles.length} images`;
        showNotification(msg, 'success');
    }
}

/**
 * Handle send button click
 * @param {Object} state - Tab state object
 * @param {HTMLTextAreaElement} textarea - Input textarea
 * @param {HTMLElement} responseSection - Response section
 * @param {HTMLButtonElement} sendBtn - Send button
 * @param {HTMLButtonElement} stopBtn - Stop button
 */
async function handleSend(state, textarea, responseSection, sendBtn, stopBtn, historySection) {
    let prompt = textarea.value.trim();
    
    if (!prompt) {
        showStatus(responseSection, 'Please enter a prompt', 'error');
        return;
    }
    
    // Apply selected extras to the prompt
    if (state.prompts?.extra && state.selectedExtras) {
        let extrasText = '';
        Object.entries(state.selectedExtras).forEach(([key, enabled]) => {
            if (enabled && state.prompts.extra[key]) {
                const extra = state.prompts.extra[key];
                if (extra.prompt) {
                    extrasText += extra.prompt + '\n\n';
                }
            }
        });
        
        if (extrasText) {
            // Add extras to the prompt
            prompt = prompt + '\n\n' + extrasText.trim();
        }
    }
    
    // Include conversation history if enabled
    if (state.settings.includeHistory && state.currentConversationMessages.length > 0) {
        const maxMessages = state.settings.maxHistoryMessages || 10;
        const recentMessages = state.currentConversationMessages.slice(-maxMessages);
        
        let historyText = '\n\n--- Previous conversation ---\n';
        recentMessages.forEach(msg => {
            const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
            historyText += `\n${roleLabel}: ${msg.content}\n`;
        });
        historyText += '--- End of previous conversation ---\n\n';
        historyText += 'Current message:\n';
        
        prompt = historyText + prompt;
    }
    
    if (!state.model) {
        showStatus(responseSection, 'Please select a model', 'error');
        return;
    }
    
    if (state.generating) {
        return; // Already generating
    }
    
    // Start new conversation if none exists
    if (!state.currentConversationId) {
        startNewConversation(state);
    }
    
    // Save user message to conversation history
    const originalPrompt = textarea.value.trim(); // Save original without extras
    addMessageToHistory(state, 'user', originalPrompt, {
        provider: state.provider,
        model: state.model
    });
    
    // Clear any previous error/status when starting new generation
    showStatus(responseSection, '', '');
    
    // Update UI for generation
    state.generating = true;
    sendBtn.disabled = true;
    stopBtn.style.display = 'inline-block';
    responseSection.querySelector('.llm-copy-btn').style.display = 'none';
    responseSection.querySelector('.llm-copy-to-node-btn').style.display = 'none';
    const sendToPromptBtn = responseSection.querySelector('.llm-send-to-prompt-btn');
    if (sendToPromptBtn) sendToPromptBtn.style.display = 'none';
    
    const responseDisplay = responseSection.querySelector('.llm-response-display');
    responseDisplay.innerHTML = '';
    responseDisplay.classList.add('generating');
    
    showStatus(responseSection, 'Generating...', 'info');
    
    try {
        let fullResponse = '';
        
        // Build options from state settings
        const options = {
            temperature: state.settings.temperature,
            seed: state.settings.seed,
            max_tokens: state.settings.maxTokens,
            keep_alive: state.settings.keepAlive
        };
        
        // Add provider-specific options
        if (state.provider === 'ollama') {
            options.num_keep = state.settings.numKeep;
            options.num_predict = state.settings.numPredict;
            options.top_k = state.settings.topK;
            options.top_p = state.settings.topP;
            options.repeat_last_n = state.settings.repeatLastN;
            options.repeat_penalty = state.settings.repeatPenalty;
            options.presence_penalty = state.settings.presencePenalty;
            options.frequency_penalty = state.settings.frequencyPenalty;
        } else if (state.provider === 'lmstudio') {
            options.topKSampling = state.settings.lmsTopK;
            options.topPSampling = state.settings.lmsTopP;
            options.repeatPenalty = state.settings.lmsRepeatPenalty;
            options.minPSampling = state.settings.lmsMinP;
        }
        
        // Check if we have images (vision mode)
        const hasImages = state.images && state.images.length > 0;
        
        if (hasImages) {
            // Use vision API
            const images = state.images.map(img => img.base64);
            
            // Debug: Log first image info
            console.log('[LLM] Sending images to API:', {
                count: images.length,
                firstImageLength: images[0]?.length,
                firstImagePreview: images[0]?.substring(0, 100)
            });
            
            state.streamController = await llmApi.generateVisionStream(
                {
                    provider: state.provider,
                    model: state.model,
                    prompt: prompt,
                    images: images,
                    system_prompt: state.settings.systemPrompt || undefined,
                    options: options
                },
                // onChunk callback
                (chunk, done, full) => {
                    if (chunk) {
                        fullResponse += chunk;
                        responseDisplay.textContent = fullResponse;
                        // Auto-scroll to bottom
                        responseDisplay.scrollTop = responseDisplay.scrollHeight;
                    }
                    
                    if (done) {
                        // Save assistant response to conversation history
                        addMessageToHistory(state, 'assistant', fullResponse, {
                            provider: state.provider,
                            model: state.model
                        });
                        
                        // Update history list UI
                        if (historySection) {
                            updateConversationList(state, historySection, responseSection);
                        }
                        
                        state.generating = false;
                        state.streamController = null;
                        sendBtn.disabled = false;
                        stopBtn.style.display = 'none';
                        responseDisplay.classList.remove('generating');
                        responseSection.querySelector('.llm-copy-btn').style.display = 'inline-block';
                        responseSection.querySelector('.llm-copy-to-node-btn').style.display = 'inline-block';
                        const sendToPromptBtn = responseSection.querySelector('.llm-send-to-prompt-btn');
                        if (sendToPromptBtn) sendToPromptBtn.style.display = 'inline-block';
                        showStatus(responseSection, 'Generation complete', 'success');
                    }
                },
                // onError callback
                (error) => {
                    state.generating = false;
                    state.streamController = null;
                    sendBtn.disabled = false;
                    stopBtn.style.display = 'none';
                    responseDisplay.classList.remove('generating');
                    showStatus(responseSection, `Error: ${error.message}`, 'error');
                }
            );
        } else {
            // Use text-only API
            state.streamController = await llmApi.generateStream(
                {
                    provider: state.provider,
                    model: state.model,
                    prompt: prompt,
                    system_prompt: state.settings.systemPrompt || undefined,
                    options: options
                },
                // onChunk callback
                (chunk, done, full) => {
                    if (chunk) {
                        fullResponse += chunk;
                        responseDisplay.textContent = fullResponse;
                        // Auto-scroll to bottom
                        responseDisplay.scrollTop = responseDisplay.scrollHeight;
                    }
                    
                    if (done) {
                        // Save assistant response to conversation history
                        addMessageToHistory(state, 'assistant', fullResponse, {
                            provider: state.provider,
                            model: state.model
                        });
                        
                        // Update history list UI
                        if (historySection) {
                            updateConversationList(state, historySection, responseSection);
                        }
                        
                        state.generating = false;
                        state.streamController = null;
                        sendBtn.disabled = false;
                        stopBtn.style.display = 'none';
                        responseDisplay.classList.remove('generating');
                        responseSection.querySelector('.llm-copy-btn').style.display = 'inline-block';
                        responseSection.querySelector('.llm-copy-to-node-btn').style.display = 'inline-block';
                        const sendToPromptBtnText = responseSection.querySelector('.llm-send-to-prompt-btn');
                        if (sendToPromptBtnText) sendToPromptBtnText.style.display = 'inline-block';
                        showStatus(responseSection, 'Generation complete', 'success');
                    }
                },
                // onError callback
                (error) => {
                    state.generating = false;
                    state.streamController = null;
                    sendBtn.disabled = false;
                    stopBtn.style.display = 'none';
                    responseDisplay.classList.remove('generating');
                    showStatus(responseSection, `Error: ${error.message}`, 'error');
                }
            );
        }
        
    } catch (error) {
        state.generating = false;
        state.streamController = null;
        sendBtn.disabled = false;
        stopBtn.style.display = 'none';
        responseDisplay.classList.remove('generating');
        showStatus(responseSection, `Error: ${error.message}`, 'error');
    }
}

/**
 * Handle stop button click
 * @param {Object} state - Tab state object
 * @param {HTMLElement} responseSection - Response section
 * @param {HTMLButtonElement} sendBtn - Send button
 * @param {HTMLButtonElement} stopBtn - Stop button
 */
function handleStop(state, responseSection, sendBtn, stopBtn) {
    if (state.streamController) {
        state.streamController.stop();
        state.streamController = null;
    }
    
    state.generating = false;
    sendBtn.disabled = false;
    stopBtn.style.display = 'none';
    
    const responseDisplay = responseSection.querySelector('.llm-response-display');
    responseDisplay.classList.remove('generating');
    
    showStatus(responseSection, 'Generation stopped', 'warning');
}

/**
 * Handle copy button click
 * @param {HTMLElement} responseSection - Response section
 * @param {HTMLButtonElement} copyBtn - Copy button
 */
async function handleCopy(responseSection, copyBtn) {
    const responseDisplay = responseSection.querySelector('.llm-response-display');
    const text = responseDisplay.textContent;
    
    try {
        await navigator.clipboard.writeText(text);
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '✓ Copied!';
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
        }, 2000);
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        showStatus(responseSection, 'Failed to copy to clipboard', 'error');
    }
}

/**
 * Handle copy to node button click
 * @param {HTMLElement} responseSection - Response section
 * @param {HTMLButtonElement} copyToNodeBtn - Copy to node button
 */
function handleCopyToNode(responseSection, copyToNodeBtn) {
    const responseDisplay = responseSection.querySelector('.llm-response-display');
    const text = responseDisplay.textContent;
    
    const success = copyTextToSelectedNode(app, text);
    
    if (success) {
        const originalText = copyToNodeBtn.innerHTML;
        copyToNodeBtn.innerHTML = '✓ Copied!';
        showStatus(responseSection, 'Response copied to selected node', 'success');
        setTimeout(() => {
            copyToNodeBtn.innerHTML = originalText;
        }, 2000);
    } else {
        showStatus(responseSection, 'Please select a CLIPTextEncode or Sage text node first', 'error');
    }
}

/**
 * Handle copy from node button click
 * @param {HTMLTextAreaElement} textarea - The prompt textarea element
 */
function handleCopyFromNode(textarea) {
    const result = copyTextFromSelectedNode(app);
    
    if (result.success) {
        textarea.value = result.text;
        // Trigger input event to update character counter
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        showNotification(`Text copied from ${result.nodeType} node!`, 'success');
    } else {
        showNotification(result.error || 'Please select a CLIPTextEncode or Sage text node first', 'error');
    }
}

/**
 * Show status message
 * @param {HTMLElement} responseSection - Response section
 * @param {string} message - Status message
 * @param {string} type - Message type: 'info', 'success', 'warning', 'error'
 */
/**
 * Save settings to localStorage
 * @param {Object} settings - Settings object to save
 */
function saveSettings(settings) {
    try {
        localStorage.setItem('llm_tab_settings', JSON.stringify(settings));
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

/**
 * Load settings from localStorage
 * @returns {Object|null} - Saved settings or null if none exist
 */
function loadSettings() {
    try {
        const saved = localStorage.getItem('llm_tab_settings');
        return saved ? JSON.parse(saved) : null;
    } catch (error) {
        console.error('Error loading settings:', error);
        return null;
    }
}

/**
 * Get default settings
 * @returns {Object} - Default settings object
 */
function getDefaultSettings() {
    return {
        temperature: 0.7,
        seed: 42,
        maxTokens: 1024,
        keepAlive: 300,
        systemPrompt: '',
        promptTemplate: '',
        // Context window management
        includeHistory: false,
        maxHistoryMessages: 10,
        // Ollama-specific advanced options
        numKeep: 0,
        numPredict: -1,
        topK: 40,
        topP: 0.9,
        repeatLastN: 64,
        repeatPenalty: 1.1,
        presencePenalty: 0.0,
        frequencyPenalty: 0.0,
        // LM Studio-specific
        lmsTopK: 40,
        lmsTopP: 0.95,
        lmsRepeatPenalty: 1.1,
        lmsMinP: 0.05
    };
}

/**
 * Reset settings to defaults
 * @param {Object} state - Tab state object
 * @param {HTMLElement} advancedOptions - Advanced options section
 */
function resetSettingsToDefaults(state, advancedOptions) {
    const defaults = getDefaultSettings();
    state.settings = { ...defaults };
    
    // Update UI to reflect defaults
    updateUIFromSettings(state.settings, advancedOptions);
    
    // Save to localStorage
    saveSettings(state.settings);
}

/**
 * ============================================================================
 * CONVERSATION HISTORY FUNCTIONS
 * ============================================================================
 */

/**
 * Save conversation history to localStorage
 * @param {Array} conversations - Array of conversation objects
 */
function saveConversationHistory(conversations) {
    try {
        localStorage.setItem('llm_conversation_history', JSON.stringify(conversations));
    } catch (error) {
        console.error('Error saving conversation history:', error);
    }
}

/**
 * Load conversation history from localStorage
 * @returns {Array} - Array of conversation objects
 */
function loadConversationHistory() {
    try {
        const saved = localStorage.getItem('llm_conversation_history');
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error('Error loading conversation history:', error);
        return [];
    }
}

/**
 * Add a message to the current conversation
 * @param {Object} state - Tab state object
 * @param {string} role - Message role: 'user' or 'assistant'
 * @param {string} content - Message content
 * @param {Object} metadata - Optional metadata (model, provider, etc.)
 */
function addMessageToHistory(state, role, content, metadata = {}) {
    if (!state.currentConversationId) {
        // Start a new conversation
        state.currentConversationId = generateConversationId();
        state.conversationHistory = loadConversationHistory();
    }
    
    // Find or create current conversation
    let conversation = state.conversationHistory.find(c => c.id === state.currentConversationId);
    if (!conversation) {
        conversation = {
            id: state.currentConversationId,
            title: generateConversationTitle(content),
            created: Date.now(),
            updated: Date.now(),
            messages: [],
            metadata: {
                provider: state.provider,
                model: state.model,
                ...metadata
            }
        };
        state.conversationHistory.unshift(conversation);
    }
    
    // Add message
    conversation.messages.push({
        role,
        content,
        timestamp: Date.now()
    });
    
    conversation.updated = Date.now();
    
    // Save to localStorage
    saveConversationHistory(state.conversationHistory);
}

/**
 * Generate a unique conversation ID
 * @returns {string} - Unique ID
 */
function generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a conversation title from the first user message
 * @param {string} content - Message content
 * @returns {string} - Conversation title
 */
function generateConversationTitle(content) {
    const maxLength = 50;
    const title = content.trim().split('\n')[0]; // First line
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
}

/**
 * Start a new conversation
 * @param {Object} state - Tab state object
 */
function startNewConversation(state) {
    state.currentConversationId = null;
    state.currentConversationMessages = [];
}

/**
 * Load a specific conversation
 * @param {Object} state - Tab state object
 * @param {string} conversationId - Conversation ID to load
 * @returns {Object|null} - Conversation object or null if not found
 */
function loadConversation(state, conversationId) {
    const history = loadConversationHistory();
    const conversation = history.find(c => c.id === conversationId);
    
    if (conversation) {
        state.currentConversationId = conversationId;
        state.currentConversationMessages = [...conversation.messages];
        return conversation;
    }
    
    return null;
}

/**
 * Delete a conversation from history
 * @param {Object} state - Tab state object
 * @param {string} conversationId - Conversation ID to delete
 */
function deleteConversation(state, conversationId) {
    state.conversationHistory = state.conversationHistory.filter(c => c.id !== conversationId);
    saveConversationHistory(state.conversationHistory);
    
    // If deleting current conversation, start new one
    if (state.currentConversationId === conversationId) {
        startNewConversation(state);
    }
}

/**
 * Clear all conversation history
 * @param {Object} state - Tab state object
 */
function clearAllHistory(state) {
    state.conversationHistory = [];
    saveConversationHistory([]);
    startNewConversation(state);
}

/**
 * Export conversation as JSON
 * @param {Object} conversation - Conversation object to export
 * @returns {string} - JSON string
 */
function exportConversationJSON(conversation) {
    return JSON.stringify(conversation, null, 2);
}

/**
 * Export conversation as plain text
 * @param {Object} conversation - Conversation object to export
 * @returns {string} - Formatted text
 */
function exportConversationText(conversation) {
    const lines = [];
    lines.push(`Conversation: ${conversation.title}`);
    lines.push(`Created: ${new Date(conversation.created).toLocaleString()}`);
    lines.push(`Model: ${conversation.metadata.model} (${conversation.metadata.provider})`);
    lines.push('=' .repeat(60));
    lines.push('');
    
    conversation.messages.forEach(msg => {
        const role = msg.role === 'user' ? 'USER' : 'ASSISTANT';
        const time = new Date(msg.timestamp).toLocaleTimeString();
        lines.push(`[${role}] ${time}`);
        lines.push(msg.content);
        lines.push('');
        lines.push('-'.repeat(60));
        lines.push('');
    });
    
    return lines.join('\n');
}

/**
 * Download conversation as file
 * @param {Object} conversation - Conversation object
 * @param {string} format - 'json' or 'text'
 */
function downloadConversation(conversation, format = 'json') {
    const content = format === 'json' 
        ? exportConversationJSON(conversation)
        : exportConversationText(conversation);
    
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation_${conversation.id}.${format === 'json' ? 'json' : 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * ============================================================================
 * END CONVERSATION HISTORY FUNCTIONS
 * ============================================================================
 */

/**
 * Update UI elements from settings object
 * @param {Object} settings - Settings object
 * @param {HTMLElement} advancedOptions - Advanced options section
 */
function updateUIFromSettings(settings, advancedOptions) {
    // Common settings
    const temperatureSlider = advancedOptions.querySelector('.llm-temperature-slider');
    const seedInput = advancedOptions.querySelector('.llm-seed-input');
    const maxTokensInput = advancedOptions.querySelector('.llm-max-tokens-input');
    const keepAliveSlider = advancedOptions.querySelector('.llm-keep-alive-slider');
    const systemPrompt = advancedOptions.querySelector('.llm-system-prompt');
    
    if (temperatureSlider) {
        temperatureSlider.value = settings.temperature;
        const valueDisplay = temperatureSlider.nextElementSibling;
        if (valueDisplay) valueDisplay.textContent = settings.temperature;
    }
    
    if (seedInput) {
        seedInput.value = settings.seed;
    }
    
    if (maxTokensInput) {
        maxTokensInput.value = settings.maxTokens;
    }
    
    if (keepAliveSlider) {
        keepAliveSlider.value = settings.keepAlive;
        keepAliveSlider.dispatchEvent(new Event('input')); // Update display
    }
    
    if (systemPrompt) {
        systemPrompt.value = settings.systemPrompt || '';
    }
    
    // Ollama settings
    const topKSlider = advancedOptions.querySelector('.llm-topk-slider');
    const topPSlider = advancedOptions.querySelector('.llm-topp-slider');
    const repeatPenaltySlider = advancedOptions.querySelector('.llm-repeat-penalty-slider');
    const repeatLastNSlider = advancedOptions.querySelector('.llm-repeat-last-n-slider');
    const numKeepSlider = advancedOptions.querySelector('.llm-num-keep-slider');
    const numPredictSlider = advancedOptions.querySelector('.llm-num-predict-slider');
    const presencePenaltySlider = advancedOptions.querySelector('.llm-presence-penalty-slider');
    const frequencyPenaltySlider = advancedOptions.querySelector('.llm-frequency-penalty-slider');
    
    const updateSlider = (slider, value) => {
        if (slider) {
            slider.value = value;
            const valueDisplay = slider.nextElementSibling;
            if (valueDisplay) {
                if (slider.classList.contains('llm-presence-penalty-slider') || 
                    slider.classList.contains('llm-frequency-penalty-slider')) {
                    valueDisplay.textContent = parseFloat(value).toFixed(1);
                } else {
                    valueDisplay.textContent = value;
                }
            }
        }
    };
    
    updateSlider(topKSlider, settings.topK);
    updateSlider(topPSlider, settings.topP);
    updateSlider(repeatPenaltySlider, settings.repeatPenalty);
    updateSlider(repeatLastNSlider, settings.repeatLastN);
    updateSlider(numKeepSlider, settings.numKeep);
    updateSlider(numPredictSlider, settings.numPredict);
    updateSlider(presencePenaltySlider, settings.presencePenalty);
    updateSlider(frequencyPenaltySlider, settings.frequencyPenalty);
    
    // LM Studio settings
    const lmsTopKSlider = advancedOptions.querySelector('.llm-lms-topk-slider');
    const lmsTopPSlider = advancedOptions.querySelector('.llm-lms-topp-slider');
    const lmsRepeatPenaltySlider = advancedOptions.querySelector('.llm-lms-repeat-penalty-slider');
    const lmsMinPSlider = advancedOptions.querySelector('.llm-lms-minp-slider');
    
    updateSlider(lmsTopKSlider, settings.lmsTopK);
    updateSlider(lmsTopPSlider, settings.lmsTopP);
    updateSlider(lmsRepeatPenaltySlider, settings.lmsRepeatPenalty);
    updateSlider(lmsMinPSlider, settings.lmsMinP);
    
    // Context window settings
    const includeHistoryCheckbox = advancedOptions.querySelector('.llm-include-history');
    const maxHistoryInput = advancedOptions.querySelector('.llm-max-history-input');
    
    if (includeHistoryCheckbox) {
        includeHistoryCheckbox.checked = settings.includeHistory || false;
    }
    
    if (maxHistoryInput) {
        maxHistoryInput.value = settings.maxHistoryMessages || 10;
    }
}

/**
 * Display status message in response section
 * @param {HTMLElement} responseSection - Response section element
 * @param {string} message - Status message
 * @param {string} type - Message type (info, success, error)
 */
function showStatus(responseSection, message, type) {
    const statusMessage = responseSection.querySelector('.llm-status-message');
    statusMessage.textContent = message;
    statusMessage.className = `llm-status-message llm-status-${type}`;
    statusMessage.style.display = 'block';
    
    // Auto-hide after 5 seconds (except errors)
    if (type !== 'error') {
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 5000);
    }
}

/**
 * Add LLM tab styles to the document
 */
function addLLMStyles() {
    const styleId = 'llm-tab-styles';
    
    // Remove existing styles if they exist
    const existingStyles = document.getElementById(styleId);
    if (existingStyles) {
        existingStyles.remove();
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* Main container */
        .llm-tab {
            height: 100%;
            display: flex;
            flex-direction: column;
            background: var(--bg-color, #1a1a1a);
            color: var(--fg-color, #ffffff);
            font-family: var(--font-family, 'Segoe UI', sans-serif);
        }

        .llm-wrapper {
            height: 100%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* Header */
        .llm-header {
            padding: 16px;
            border-bottom: 1px solid var(--border-color, #444);
            background: var(--bg-color-secondary, #2a2a2a);
        }

        .llm-title {
            margin: 0 0 8px 0;
            font-size: 20px;
            font-weight: 600;
            color: var(--primary-color, #4a9eff);
        }

        .llm-description {
            margin: 0;
            font-size: 14px;
            color: var(--text-secondary, #cccccc);
            line-height: 1.4;
        }

        /* Model selection */
        .llm-model-selection {
            padding: 16px;
            border-bottom: 1px solid var(--border-color, #444);
            background: var(--bg-color-tertiary, #1e1e1e);
        }

        .llm-selection-row {
            display: flex;
            gap: 12px;
            align-items: center;
            margin-bottom: 12px;
        }

        .llm-selection-row:last-child {
            margin-bottom: 0;
        }

        .llm-form-group {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .llm-label {
            font-size: 13px;
            font-weight: 500;
            color: var(--text-secondary, #cccccc);
        }

        .llm-select {
            padding: 8px 12px;
            background: var(--bg-color, #1a1a1a);
            border: 1px solid var(--border-color, #444);
            border-radius: 4px;
            color: var(--fg-color, #ffffff);
            font-size: 14px;
            cursor: pointer;
            transition: border-color 0.2s, box-shadow 0.2s;
        }

        .llm-select:hover {
            border-color: var(--primary-color, #4a9eff);
        }

        .llm-select:focus {
            outline: none;
            border-color: var(--primary-color, #4a9eff);
            box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.2);
        }

        .llm-select:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* Status indicator */
        .llm-status-indicator {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            color: var(--text-secondary, #cccccc);
        }

        .status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            animation: pulse 2s ease-in-out infinite;
        }

        .status-dot.status-online {
            background: #6bcf7f;
            box-shadow: 0 0 8px rgba(107, 207, 127, 0.5);
        }

        .status-dot.status-offline {
            background: #888;
        }

        .status-dot.status-error {
            background: #f44336;
            box-shadow: 0 0 8px rgba(244, 67, 54, 0.5);
        }

        .status-dot.status-loading {
            background: #4a9eff;
            animation: pulse 1s ease-in-out infinite;
        }

        .status-dot.status-disabled {
            background: #666;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        /* Vision section */
        .llm-vision-section {
            padding: 16px;
            border-bottom: 1px solid var(--border-color, #444);
            background: var(--bg-color-secondary, #2a2a2a);
        }

        .llm-vision-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .llm-image-count {
            font-size: 13px;
            color: var(--text-secondary, #cccccc);
            margin-left: auto;
            margin-right: 12px;
        }

        .llm-clear-all-images-btn {
            font-size: 12px;
            padding: 4px 10px;
        }

        /* Upload zone */
        .llm-upload-zone {
            border: 2px dashed var(--border-color, #444);
            border-radius: 8px;
            padding: 32px 16px;
            text-align: center;
            cursor: pointer;
            background: var(--bg-color, #1a1a1a);
            transition: border-color 0.2s, background-color 0.2s;
        }

        .llm-upload-zone:hover {
            border-color: var(--primary-color, #4a9eff);
            background: var(--bg-color-tertiary, #222);
        }

        .llm-upload-zone.drag-over {
            border-color: var(--primary-color, #4a9eff);
            background: rgba(74, 158, 255, 0.1);
        }

        .llm-upload-icon {
            font-size: 48px;
            margin-bottom: 12px;
        }

        .llm-upload-text {
            color: var(--text-secondary, #cccccc);
        }

        .llm-upload-text strong {
            display: block;
            color: var(--fg-color, #ffffff);
            margin-bottom: 8px;
            font-size: 14px;
        }

        .llm-upload-text span {
            font-size: 12px;
            color: var(--text-tertiary, #999);
        }

        .llm-file-input {
            display: none;
        }

        /* Image preview grid */
        .llm-image-preview-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 12px;
            margin-top: 16px;
        }

        .llm-image-preview-item {
            position: relative;
            aspect-ratio: 1;
            border-radius: 8px;
            overflow: hidden;
            background: var(--bg-color, #1a1a1a);
            border: 1px solid var(--border-color, #444);
        }

        .llm-preview-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .llm-remove-image-btn {
            position: absolute;
            top: 4px;
            right: 4px;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            border: none;
            font-size: 18px;
            line-height: 1;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s;
        }

        .llm-remove-image-btn:hover {
            background: rgba(244, 67, 54, 0.9);
        }

        /* Input section */
        .llm-input-section {
            padding: 16px;
            border-bottom: 1px solid var(--border-color, #444);
            background: var(--bg-color-secondary, #2a2a2a);
        }

        .llm-input-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .llm-section-title {
            margin: 0;
            font-size: 16px;
            font-weight: 500;
            color: var(--fg-color, #ffffff);
        }

        .llm-char-counter {
            font-size: 12px;
            color: var(--text-secondary, #888);
        }

        .llm-textarea {
            width: 100%;
            padding: 12px;
            background: var(--bg-color, #1a1a1a);
            border: 1px solid var(--border-color, #444);
            border-radius: 4px;
            color: var(--fg-color, #ffffff);
            font-size: 14px;
            font-family: var(--font-family, 'Segoe UI', sans-serif);
            resize: vertical;
            min-height: 100px;
            transition: border-color 0.2s, box-shadow 0.2s;
        }

        .llm-textarea:focus {
            outline: none;
            border-color: var(--primary-color, #4a9eff);
            box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.2);
        }

        .llm-textarea::placeholder {
            color: var(--text-secondary, #666);
        }

        .llm-action-buttons {
            display: flex;
            gap: 8px;
            margin: 12px 0;
        }

        /* Advanced options section */
        .llm-advanced-section {
            border-bottom: 1px solid var(--border-color, #444);
            background: var(--bg-color-tertiary, #1e1e1e);
        }

        .llm-advanced-header {
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            background: var(--bg-color-secondary, #2a2a2a);
            transition: background-color 0.2s;
        }

        .llm-advanced-header:hover {
            background: var(--bg-color-tertiary, #333);
        }
        
        .llm-header-actions {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        
        .llm-reset-settings-btn {
            font-size: 12px;
            padding: 4px 8px !important;
            opacity: 0.8;
        }
        
        .llm-reset-settings-btn:hover {
            opacity: 1;
        }

        .llm-collapse-btn {
            background: none;
            border: none;
            color: var(--fg-color, #ffffff);
            font-size: 14px;
            cursor: pointer;
            padding: 4px 8px;
            transition: transform 0.2s;
        }

        .llm-advanced-content {
            padding: 16px;
        }

        .llm-settings-row {
            display: flex;
            gap: 16px;
            margin-bottom: 16px;
        }

        .llm-settings-row .llm-form-group {
            flex: 1;
        }

        .llm-subsection-title {
            margin: 16px 0 12px 0;
            font-size: 14px;
            font-weight: 500;
            color: var(--primary-color, #4a9eff);
            border-bottom: 1px solid var(--border-color, #444);
            padding-bottom: 8px;
        }

        .llm-ollama-settings {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid var(--border-color, #444);
        }

        .llm-lmstudio-settings {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid var(--border-color, #444);
        }

        /* Template selector */
        .llm-template-selector-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .llm-category-select,
        .llm-template-select {
            width: 100%;
        }

        /* Prompt extras */
        .llm-prompt-extras {
            margin: 16px 0;
        }

        .llm-extras-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 8px;
            margin-top: 12px;
        }

        .llm-extra-checkbox-label {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 8px;
            background: var(--bg-color, #1a1a1a);
            border: 1px solid var(--border-color, #444);
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.2s, border-color 0.2s;
        }

        .llm-extra-checkbox-label:hover {
            background: var(--bg-color-tertiary, #222);
            border-color: var(--primary-color, #4a9eff);
        }

        .llm-extra-checkbox {
            cursor: pointer;
            width: 16px;
            height: 16px;
        }

        .llm-extra-checkbox-label span {
            font-size: 13px;
            color: var(--fg-color, #ffffff);
            user-select: none;
        }

        /* Sliders */
        .llm-slider-container {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .llm-slider {
            flex: 1;
            height: 6px;
            border-radius: 3px;
            outline: none;
            background: var(--bg-color, #1a1a1a);
            border: 1px solid var(--border-color, #444);
            cursor: pointer;
        }

        .llm-slider::-webkit-slider-thumb {
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: var(--primary-color, #4a9eff);
            cursor: pointer;
            transition: background-color 0.2s, transform 0.1s;
        }

        .llm-slider::-webkit-slider-thumb:hover {
            background: var(--primary-light, #5ba9ff);
            transform: scale(1.1);
        }

        .llm-slider::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: var(--primary-color, #4a9eff);
            cursor: pointer;
            border: none;
            transition: background-color 0.2s, transform 0.1s;
        }

        .llm-slider::-moz-range-thumb:hover {
            background: var(--primary-light, #5ba9ff);
            transform: scale(1.1);
        }

        .llm-slider-value {
            min-width: 45px;
            text-align: right;
            font-size: 13px;
            font-weight: 500;
            color: var(--primary-color, #4a9eff);
        }

        /* Number inputs */
        .llm-input {
            width: 100%;
            padding: 8px 12px;
            background: var(--bg-color, #1a1a1a);
            border: 1px solid var(--border-color, #444);
            border-radius: 4px;
            color: var(--fg-color, #ffffff);
            font-size: 14px;
            transition: border-color 0.2s, box-shadow 0.2s;
        }

        .llm-input:focus {
            outline: none;
            border-color: var(--primary-color, #4a9eff);
            box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.2);
        }

        /* Seed input container */
        .llm-seed-container {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .llm-seed-container .llm-input {
            flex: 1;
        }

        .llm-random-seed-btn {
            padding: 8px 12px;
            font-size: 16px;
        }

        /* Max tokens container */
        .llm-max-tokens-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .llm-token-presets {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
        }

        .llm-token-presets .llm-btn {
            padding: 4px 10px;
            font-size: 12px;
        }

        /* System prompt container */
        .llm-system-prompt-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .llm-system-prompt {
            min-height: 80px;
        }

        .llm-clear-system-btn {
            align-self: flex-end;
        }

        /* Response section */
        .llm-response-section {
            flex: 1;
            padding: 16px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .llm-response-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .llm-response-actions {
            display: flex;
            gap: 8px;
        }

        .llm-response-display {
            flex: 1;
            padding: 12px;
            background: var(--bg-color-tertiary, #1e1e1e);
            border: 1px solid var(--border-color, #444);
            border-radius: 4px;
            color: var(--fg-color, #ffffff);
            font-size: 14px;
            font-family: var(--font-family-mono, 'Consolas', monospace);
            line-height: 1.6;
            overflow-y: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .llm-response-display.generating {
            border-color: var(--primary-color, #4a9eff);
            box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.1);
        }

        .llm-placeholder {
            color: var(--text-secondary, #666);
            font-style: italic;
            text-align: center;
            margin-top: 20px;
        }

        /* Buttons */
        .llm-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s, transform 0.1s, opacity 0.2s, box-shadow 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        .llm-btn:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }

        .llm-btn:active:not(:disabled) {
            transform: translateY(0);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        .llm-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .llm-btn:focus {
            outline: 2px solid var(--primary-color, #4a9eff);
            outline-offset: 2px;
        }

        .llm-btn-primary {
            background: linear-gradient(135deg, #4a9eff 0%, #357abd 100%);
            color: white;
        }

        .llm-btn-primary:hover:not(:disabled) {
            background: linear-gradient(135deg, #5ba9ff 0%, #4686c9 100%);
            box-shadow: 0 2px 6px rgba(74, 158, 255, 0.4);
        }

        .llm-btn-secondary {
            background: var(--bg-color-secondary, #2a2a2a);
            color: var(--fg-color, #ffffff);
            border: 1px solid var(--border-color, #444);
        }

        .llm-btn-secondary:hover:not(:disabled) {
            background: var(--bg-color-tertiary, #333);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }

        .llm-btn-danger {
            background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
            color: white;
        }

        .llm-btn-danger:hover:not(:disabled) {
            background: linear-gradient(135deg, #f55549 0%, #e13f38 100%);
            box-shadow: 0 2px 6px rgba(244, 67, 54, 0.4);
        }

        .llm-btn-small {
            padding: 6px 12px;
            font-size: 12px;
        }

        .llm-send-btn {
            width: 100%;
            padding: 12px;
            margin-top: 12px;
        }

        /* Status messages */
        .llm-status-message {
            margin-top: 12px;
            padding: 10px 14px;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 500;
        }

        .llm-status-info {
            background: rgba(74, 158, 255, 0.15);
            border: 1px solid rgba(74, 158, 255, 0.3);
            color: #4a9eff;
        }

        .llm-status-success {
            background: rgba(107, 207, 127, 0.15);
            border: 1px solid rgba(107, 207, 127, 0.3);
            color: #6bcf7f;
        }

        .llm-status-warning {
            background: rgba(255, 167, 38, 0.15);
            border: 1px solid rgba(255, 167, 38, 0.3);
            color: #ffa726;
        }

        .llm-status-error {
            background: rgba(244, 67, 54, 0.15);
            border: 1px solid rgba(244, 67, 54, 0.3);
            color: #f44336;
        }

        /* Provider-specific colors */
        .llm-provider-select option[value="ollama"] {
            color: #6bcf7f;
        }

        .llm-provider-select option[value="lmstudio"] {
            color: #4a9eff;
        }

        /* History section */
        .llm-history-section {
            padding: 16px;
            border-top: 1px solid var(--border-color, #444);
            background: var(--bg-color-secondary, #2a2a2a);
        }

        .llm-history-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            user-select: none;
        }

        .llm-header-actions {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .llm-collapse-btn {
            background: transparent;
            border: none;
            color: var(--fg-color, #ffffff);
            font-size: 12px;
            cursor: pointer;
            padding: 4px 8px;
            transition: transform 0.2s;
        }

        .llm-collapse-btn:hover {
            background: var(--bg-color-tertiary, #333);
            border-radius: 4px;
        }

        .llm-history-content {
            margin-top: 16px;
            max-height: 500px;
            overflow-y: auto;
        }

        .llm-conversation-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .llm-conversation-item {
            padding: 12px;
            background: var(--bg-color-tertiary, #1e1e1e);
            border: 1px solid var(--border-color, #444);
            border-radius: 4px;
            cursor: pointer;
            transition: border-color 0.2s, background-color 0.2s;
        }

        .llm-conversation-item:hover {
            border-color: var(--primary-color, #4a9eff);
            background: var(--bg-color, #1a1a1a);
        }

        .llm-conversation-item.active {
            border-color: var(--primary-color, #4a9eff);
            background: rgba(74, 158, 255, 0.1);
        }

        .llm-conversation-item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        }

        .llm-conversation-item-title {
            font-size: 14px;
            font-weight: 500;
            color: var(--fg-color, #ffffff);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            flex: 1;
            margin-right: 8px;
        }

        .llm-conversation-item-actions {
            display: flex;
            gap: 4px;
            opacity: 0;
            transition: opacity 0.2s;
        }

        .llm-conversation-item:hover .llm-conversation-item-actions {
            opacity: 1;
        }

        .llm-conversation-item-meta {
            font-size: 12px;
            color: var(--text-secondary, #999);
        }

        .llm-btn-icon {
            background: transparent;
            border: none;
            color: var(--fg-color, #ffffff);
            cursor: pointer;
            padding: 4px 8px;
            font-size: 14px;
            border-radius: 4px;
            transition: background-color 0.2s;
        }

        .llm-btn-icon:hover {
            background: var(--bg-color, #1a1a1a);
        }

        .llm-btn-danger-icon {
            color: #f44336;
        }

        .llm-btn-danger-icon:hover {
            background: rgba(244, 67, 54, 0.2);
        }

        .llm-export-menu {
            background: var(--bg-color-secondary, #2a2a2a);
            border: 1px solid var(--border-color, #444);
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            min-width: 150px;
        }

        .llm-export-menu-item {
            display: block;
            width: 100%;
            padding: 10px 14px;
            background: transparent;
            border: none;
            color: var(--fg-color, #ffffff);
            font-size: 13px;
            text-align: left;
            cursor: pointer;
            transition: background-color 0.2s;
        }

        .llm-export-menu-item:hover {
            background: var(--bg-color-tertiary, #333);
        }

        .llm-export-menu-item:first-child {
            border-radius: 4px 4px 0 0;
        }

        .llm-export-menu-item:last-child {
            border-radius: 0 0 4px 4px;
        }

        /* Preset controls */
        .llm-preset-actions {
            display: flex;
            gap: 8px;
            align-items: flex-end;
            flex: 0 0 auto;
        }

        /* Modal overlay */
        .llm-modal-overlay {
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
            backdrop-filter: blur(4px);
        }

        .llm-modal-content {
            background: var(--bg-color-secondary, #2a2a2a);
            border: 1px solid var(--border-color, #444);
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            padding: 24px;
            position: relative;
        }

        .llm-modal-large {
            max-width: 800px;
        }

        .llm-modal-title {
            margin: 0 0 20px 0;
            font-size: 18px;
            font-weight: 600;
            color: var(--fg-color, #ffffff);
        }

        .llm-modal-close {
            position: absolute;
            top: 16px;
            right: 16px;
            background: transparent;
            border: none;
            color: var(--text-secondary, #999);
            font-size: 28px;
            line-height: 1;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-center;
            border-radius: 4px;
            transition: background-color 0.2s, color 0.2s;
        }

        .llm-modal-close:hover {
            background: var(--bg-color-tertiary, #333);
            color: var(--fg-color, #ffffff);
        }

        .llm-modal-buttons {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 24px;
        }

        /* Preset forms */
        .llm-preset-form,
        .llm-system-prompt-form {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        /* Tabs within modal */
        .llm-tab-nav {
            display: flex;
            gap: 8px;
            margin-bottom: 20px;
            border-bottom: 1px solid var(--border-color, #444);
            padding-bottom: 8px;
        }

        .llm-tab-btn {
            background: transparent;
            border: none;
            color: var(--text-secondary, #999);
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            padding: 8px 16px;
            border-radius: 4px 4px 0 0;
            transition: background-color 0.2s, color 0.2s;
        }

        .llm-tab-btn:hover {
            background: var(--bg-color-tertiary, #333);
            color: var(--fg-color, #ffffff);
        }

        .llm-tab-btn.active {
            background: var(--bg-color-tertiary, #333);
            color: var(--primary-color, #4a9eff);
            border-bottom: 2px solid var(--primary-color, #4a9eff);
        }

        .llm-tab-content {
            min-height: 300px;
        }

        /* Preset list */
        .llm-preset-list,
        .llm-system-prompt-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            max-height: 500px;
            overflow-y: auto;
        }

        .llm-preset-item,
        .llm-system-prompt-item {
            display: flex;
            gap: 12px;
            padding: 16px;
            background: var(--bg-color, #1a1a1a);
            border: 1px solid var(--border-color, #444);
            border-radius: 6px;
            transition: border-color 0.2s;
        }

        .llm-preset-item:hover,
        .llm-system-prompt-item:hover {
            border-color: var(--primary-color, #4a9eff);
        }

        .llm-preset-info,
        .llm-system-prompt-info {
            flex: 1;
        }

        .llm-preset-item-name,
        .llm-system-prompt-item-name {
            font-size: 15px;
            font-weight: 500;
            color: var(--fg-color, #ffffff);
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .llm-builtin-badge {
            display: inline-block;
            background: rgba(74, 158, 255, 0.2);
            color: var(--primary-color, #4a9eff);
            font-size: 11px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .llm-override-badge {
            background: rgba(255, 193, 7, 0.2);
            color: var(--warning-color, #ffc107);
        }

        .llm-info-message {
            background: rgba(74, 158, 255, 0.1);
            border-left: 3px solid var(--primary-color, #4a9eff);
            padding: 12px;
            margin: 12px 0;
            border-radius: 4px;
            font-size: 13px;
            line-height: 1.5;
        }

        .llm-info-message strong {
            color: var(--primary-color, #4a9eff);
        }

        .llm-preset-item-desc,
        .llm-system-prompt-item-desc {
            font-size: 13px;
            color: var(--text-secondary, #999);
            line-height: 1.4;
        }

        .llm-preset-item-actions,
        .llm-system-prompt-item-actions {
            display: flex;
            gap: 8px;
            align-items: flex-start;
            flex-shrink: 0;
        }

        /* Responsive adjustments */
        @media (max-width: 600px) {
            .llm-selection-row {
                flex-direction: column;
            }

            .llm-form-group {
                width: 100%;
            }
        }
    `;
    
    document.head.appendChild(style);
}

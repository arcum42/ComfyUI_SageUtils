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
import * as llmProviderEvents from './llmProviderEvents.js';
import * as llmTemplateEvents from './llmTemplateEvents.js';
import * as llmPresetEvents from './llmPresetEvents.js';
import * as llmVisionEvents from './llmVisionEvents.js';
import * as llmHistoryEvents from './llmHistoryEvents.js';

const LLM_LAST_PROVIDER_KEY = 'llm_last_selected_provider';

/**
 * Setup all event handlers for the LLM tab
 * @param {Object} state - Tab state object
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

    // ========== Provider & Model Events (delegated)

    providerSelect.addEventListener('change', async () => {
        await llmProviderEvents.handleProviderChange(
            state, providerSelect,
            modelSelection, visionSection, advancedOptions,
            updateModelDropdown, loadModels,
            setModelContext, saveSettings,
            applyModelSettingsForActiveSelection,
            showProviderOptions,
            updateCapabilityControlledOptions, updateVisionSectionVisibility
        );
    });

    modelSelect.addEventListener('change', () => {
        llmProviderEvents.handleModelChange(
            state, modelSelect,
            advancedOptions,
            rememberProviderModel,
            setModelContext, saveSettings,
            applyModelSettingsForActiveSelection,
            updateCapabilityControlledOptions, updateVisionSectionVisibility,
            visionSection
        );
    });

    refreshBtn.addEventListener('click', async () => {
        await llmProviderEvents.handleRefreshModels(
            state, modelSelection, visionSection, advancedOptions,
            loadModels, applyModelSettingsForActiveSelection
        );
    });

    // ========== Preset Events ==========

    // Preset selection change
    if (presetSelect) {
        presetSelect.addEventListener('change', async () => {
            await llmPresetEvents.handlePresetChange(
                state, presetSelect,
                modelSelection, loadPresets, showNotification,
                advancedOptions, inputSection,
                applyPresetToUI
            );
        });
    }

    // Save preset button
    if (savePresetBtn) {
        savePresetBtn.addEventListener('click', () => {
            llmPresetEvents.handleSavePresetClick(
                showSavePresetDialog, state, modelSelection, loadPresets, showNotification
            );
        });
    }

    // Manage presets button
    if (managePresetsBtn) {
        managePresetsBtn.addEventListener('click', () => {
            llmPresetEvents.handleManagePresetsClick(
                showManagePresetsDialog, state,
                modelSelection, advancedOptions, inputSection,
                loadPresets, applyPresetToUI, showNotification
            );
        });
    }

    // ========== Template & Extras Events ==========

    // Category change
    if (categorySelect && templateSelect) {
        categorySelect.addEventListener('change', () => {
            llmTemplateEvents.handleCategoryChange(state, categorySelect, templateSelect);
        });
    }

    // Template change
    if (templateSelect && textarea) {
        templateSelect.addEventListener('change', () => {
            llmTemplateEvents.handleTemplateChange(state, templateSelect, textarea);
        });
    }

    // Extras checkboxes
    if (extrasGrid) {
        extrasGrid.addEventListener('change', (e) => {
            llmTemplateEvents.handleExtrasChange(state, e);
        });
    }

    // System prompt
    if (systemPromptTextarea) {
        systemPromptTextarea.addEventListener('input', () => {
            llmTemplateEvents.handleSystemPromptChange(state, systemPromptTextarea, saveSettings);
        });
    }

    // Compose template section event handlers
    setupComposeTemplateHandlers(state, inputSection, textarea);

    // Settings slider and advanced controls handlers
    setupSettingsEventHandlers(state, advancedOptions);

    // ========== Generation Events ==========

    // Send button click
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

    // Stop button click
    stopBtn.addEventListener('click', () => {
        handleStop(state, responseSection, sendBtn, stopBtn);
    });

    // From Node button — read prompt from selected ComfyUI node
    const fromNodeBtn = inputSection.querySelector('.llm-from-node-btn');
    if (fromNodeBtn) {
        fromNodeBtn.addEventListener('click', () => {
            handleCopyFromNode(textarea, app, showNotification);
        });
    }

    // Copy response to clipboard
    copyBtn.addEventListener('click', () => {
        handleCopy(responseSection, copyBtn);
    });

    // Copy to node — paste response into selected ComfyUI node
    copyToNodeBtn.addEventListener('click', () => {
        handleCopyToNode(responseSection, copyToNodeBtn, app);
    });

    // Send to Prompt Builder button (cross-tab messaging)
    const sendToPromptBtn = responseSection.querySelector('.llm-send-to-prompt-btn');
    if (sendToPromptBtn) {
        sendToPromptBtn.addEventListener('click', () => {
            const responseText = getTranscriptText(responseSection).trim();

            if (!responseText) {
                showStatus(responseSection, 'No response to send', 'error');
                return;
            }

            // Visual feedback — show sending state
            const originalText = sendToPromptBtn.textContent;
            sendToPromptBtn.disabled = true;
            sendToPromptBtn.textContent = '\ud83d\udce4 Sending...';

            // Use cross-tab messaging to send text to Prompt Builder
            import('../../../shared/crossTabMessaging.js').then(({ sendTextToPromptBuilder }) => {
                sendTextToPromptBuilder(responseText, {
                    source: 'llm',
                    autoSwitch: true
                });
                showNotification('Response sent to Prompt Builder', 'success');

                // Visual feedback — show success
                sendToPromptBtn.textContent = '\u2713 Sent!';
                sendToPromptBtn.classList.add('llm-btn-success-flash');

                setTimeout(() => {
                    sendToPromptBtn.textContent = originalText;
                    sendToPromptBtn.classList.remove('llm-btn-success-flash');
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

    // Upload zone click
    if (uploadZone) {
        uploadZone.addEventListener('click', () => {
            llmVisionEvents.handleUploadZoneClick(uploadZone, fileInput);
        });
    }

    // File input change
    fileInput.addEventListener('change', async () => {
        await llmVisionEvents.handleFileInputChange(
            state, visionSection, fileInput,
            handleFileUpload
        );
    });

    // Drag and drop
    if (uploadZone) {
        uploadZone.addEventListener('dragover', (e) => {
            llmVisionEvents.handleDragOver(e, uploadZone);
        });
        uploadZone.addEventListener('dragleave', (e) => {
            llmVisionEvents.handleDragLeave(e, uploadZone);
        });
        uploadZone.addEventListener('drop', async (e) => {
            await llmVisionEvents.handleDrop(
                state, visionSection, uploadZone, e,
                handleFileUpload
            );
        });
    }

    // Clipboard paste
    const pasteHandler = llmVisionEvents.createPasteHandler(
        state, visionSection,
        handleFileUpload
    );
    if (pasteHandler) {
        if (state._pasteHandler) {
            document.removeEventListener('paste', state._pasteHandler);
        }
        state._pasteHandler = pasteHandler;
        document.addEventListener('paste', pasteHandler);
    }

    // Clear all images
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            llmVisionEvents.handleClearAllImagesClick(state, visionSection);
        });
    }


    // ========== History Section Events ==========

    // New conversation button
    const newConversationBtn = historySection.querySelector('.llm-new-conversation-btn');
    if (newConversationBtn) {
        newConversationBtn.addEventListener('click', () => {
            llmHistoryEvents.handleNewConversationClick(state, historySection, responseSection);
        });
    }

    // Export button
    const exportBtn = historySection.querySelector('.llm-export-history-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            llmHistoryEvents.handleExportClick(state);
        });
    }

    // Import button  
    const importBtn = historySection.querySelector('.llm-import-history-btn');
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            llmHistoryEvents.handleImportClick(state, historySection, responseSection);
        });
    }

    // Clear button
    const clearBtn = historySection.querySelector('.llm-clear-history-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            llmHistoryEvents.handleClearClick(state, historySection, responseSection);
        });
    }

    // Skip save checkbox - update message in real-time
    llmHistoryEvents.handleSkipSaveCheckboxChange(historySection);

    // Save to History button
    const saveToHistoryBtn = responseSection?.querySelector('.llm-save-to-history-btn');
    if (saveToHistoryBtn) {
        saveToHistoryBtn.addEventListener('click', () => {
            llmHistoryEvents.handleSaveToHistoryClick(saveToHistoryBtn, state, historySection, responseSection, updateConversationList);
        });
    }


    
    // Reset settings button
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', () => {
            resetSettingsToDefaults(state, advancedOptions);
        });
    }

    // Initialize provider-specific settings visibility
    showProviderOptions(advancedOptions, state.provider);
}

/**
 * Setup compose template event handlers
 * @param {Object} state - Tab state object
 * @param {HTMLElement} inputSection - Input section
 * @param {HTMLTextAreaElement} textarea - Prompt textarea
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
    dialog.className = 'llm-dialog-overlay';

    const content = document.createElement('div');
    content.className = 'llm-dialog-content';

    const title = document.createElement('h3');
    title.textContent = 'Apply Template';
    title.className = 'llm-dialog-title';
    content.appendChild(title);

    const message = document.createElement('p');
    message.textContent = 'Your current prompt has been modified. How would you like to apply this template?';
    message.className = 'llm-dialog-message';
    content.appendChild(message);

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'llm-dialog-button-container';

    const createButton = (label, action, isPrimary) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.className = `llm-dialog-button${isPrimary ? ' llm-dialog-button--primary' : ''}`;
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
    // Common settings: both Ollama and LM Studio sections have their own
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
            row.classList.toggle('llm-hidden', !visible);
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
        ollamaSection.classList.toggle('llm-hidden', provider !== 'ollama_rest');
    }
    if (lmstudioSection) {
        lmstudioSection.classList.toggle('llm-hidden', provider !== 'lmstudio_rest');
    }
    if (noOptionsMsg) {
        noOptionsMsg.classList.toggle('llm-hidden', hasProviderSection);
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
    visionSection.classList.toggle('llm-hidden', !hasVisionModel);
    
    console.log('[LLM] Vision section visibility:', {
        model: state.model,
        provider: state.provider,
        hasVisionModel,
        visionModels: state.visionModels,
        hidden: visionSection.classList.contains('llm-hidden')
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

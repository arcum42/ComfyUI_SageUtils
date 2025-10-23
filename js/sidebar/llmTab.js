/**
 * LLM Chat Tab - Main tab component for LLM interactions
 * Provides interface for text and vision generation with streaming support
 */

// External dependencies
import { app } from '../../../scripts/app.js';
import { api } from '../../../scripts/api.js';
import { showNotification } from '../shared/crossTabMessaging.js';

// Core utilities
import { LLMConversation } from '../llm/llmConversation.js';
import { getDefaultSettings, loadSettings, updateUIFromSettings, saveSettings } from '../llm/llmSettings.js';
import { isVisionModel } from '../llm/llmProviders.js';

// UI Components
import { createHeader } from './llmTab/llmHeader.js';
import { addLLMStyles } from './llmTab/llmStyles.js';
import { createInputSection, getPromptText } from './llmTab/llmInputSection.js';
import { createResponseSection, showStatus } from './llmTab/llmResponseSection.js';
import { createVisionSection } from './llmTab/llmVisionSection.js';
import { createModelSelection, loadModels, loadPresets } from './llmTab/llmModelSelection.js';
import { createHistorySection, updateConversationList } from './llmTab/llmHistorySection.js';
import { createAdvancedOptions } from './llmTab/llmAdvancedOptions.js';

// Generation and event handling
import { applyPresetToUI } from './llmTab/llmPresetDialogs.js';
import { setupEventHandlers, cleanupEventHandlers } from './llmTab/llmEventHandlers.js';

/**
 * Load default LLM provider from settings
 * @returns {Promise<string>} Default provider ('ollama' or 'lmstudio')
 */
async function loadDefaultProvider() {
    try {
        const response = await api.fetchApi('/sage_utils/settings');
        if (response.ok) {
            const data = await response.json();
            console.log('[LLM Tab] Settings API response:', data);
            
            if (data.success && data.settings && data.settings.default_llm_provider) {
                const setting = data.settings.default_llm_provider;
                console.log('[LLM Tab] default_llm_provider setting:', setting);
                
                // Try current_value first, then fall back to default
                const provider = setting.current_value || setting.default;
                console.log('[LLM Tab] Resolved provider value:', provider);
                
                if (provider === 'ollama' || provider === 'lmstudio') {
                    console.log(`[LLM Tab] Loading default LLM provider: ${provider}`);
                    return provider;
                } else {
                    console.warn(`[LLM Tab] Invalid provider value: ${provider}, using ollama`);
                }
            } else {
                console.warn('[LLM Tab] default_llm_provider setting not found in response');
            }
        } else {
            console.warn('[LLM Tab] Settings API request failed:', response.status);
        }
    } catch (error) {
        console.warn('[LLM Tab] Failed to load default LLM provider setting, using ollama:', error);
    }
    return 'ollama'; // Default fallback
}

/**
 * Initialize tab with prompts, presets, models, and event handlers
 */
async function initializeTab(state, wrapper, modelSelection, visionSection, inputSection, advancedOptions, responseSection, historySection) {
    try {
        // Load prompts and presets in parallel
        const [promptsData, presetsLoaded] = await Promise.all([
            loadPrompts(state),
            loadPresets(state, modelSelection)
        ]);
        
        // Populate template categories if prompts loaded
        if (promptsData && state.prompts?.base) {
            populateTemplateCategories(state, advancedOptions);
        }
        
        // Load models
        await loadModels(state, modelSelection, visionSection);
        
        // Load and display conversation history
        await loadAndInitializeHistory(state, historySection, responseSection);
        
        // Setup all event handlers
        setupEventHandlers(
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
        );
        
        console.log('[LLM Tab] Initialization complete');
    } catch (error) {
        console.error('[LLM Tab] Initialization failed:', error);
        showStatus(responseSection, 'Failed to initialize LLM tab', 'error');
    }
}

/**
 * Load prompts from API
 */
async function loadPrompts(state) {
    try {
        // Import llmApi dynamically to avoid circular dependencies
        const llmApi = await import('../llm/llmApi.js');
        const prompts = await llmApi.getPrompts();
        state.prompts = prompts;
        console.log('[LLM Tab] Loaded prompts:', prompts);
        return prompts;
    } catch (error) {
        console.error('[LLM Tab] Failed to load prompts:', error);
        state.prompts = { base: {}, extras: {} };
        return null;
    }
}

/**
 * Load and initialize conversation history from localStorage
 */
async function loadAndInitializeHistory(state, historySection, responseSection) {
    try {
        // Import required functions
        const { loadConversationHistory, saveConversationHistory } = await import('./llmTab/llmGenerationHandler.js');
        const { renderHistory, updateConversationList } = await import('./llmTab/llmHistorySection.js');
        
        // Load conversation history from localStorage
        state.conversationHistory = loadConversationHistory();
        
        // Update conversation list UI
        if (state.conversationHistory && state.conversationHistory.length > 0) {
            updateConversationList(state, historySection, responseSection);
            
            // Load the most recent conversation by default
            const mostRecentConversation = state.conversationHistory[0]; // Conversations are sorted by most recent first
            if (mostRecentConversation) {
                state.currentConversationId = mostRecentConversation.id;
                
                // Create delete handler
                const handleDeleteMessage = (index) => {
                    mostRecentConversation.messages.splice(index, 1);
                    mostRecentConversation.updated = Date.now();
                    saveConversationHistory(state.conversationHistory);
                    renderHistory(historySection, mostRecentConversation.messages, handleDeleteMessage);
                    updateConversationList(state, historySection, responseSection);
                };
                
                renderHistory(historySection, mostRecentConversation.messages, handleDeleteMessage);
            }
        }
        
        console.log('[LLM Tab] Loaded conversation history:', state.conversationHistory?.length || 0, 'conversations');
    } catch (error) {
        console.error('[LLM Tab] Failed to load conversation history:', error);
        state.conversationHistory = [];
    }
}

/**
 * Populate template category dropdown
 */
function populateTemplateCategories(state, advancedOptions) {
    const categorySelect = advancedOptions.querySelector('.llm-category-select');
    if (!categorySelect || !state.prompts?.base) return;
    
    // Get unique categories
    const categories = new Set();
    Object.values(state.prompts.base).forEach(template => {
        if (template.category) {
            categories.add(template.category);
        }
    });
    
    // Populate dropdown
    const options = ['<option value="">Select category...</option>'];
    Array.from(categories).sort().forEach(category => {
        options.push(`<option value="${category}">${category}</option>`);
    });
    
    categorySelect.innerHTML = options.join('');
    
    // Also populate extras grid
    populatePromptExtras(state, advancedOptions);
}

/**
 * Populate prompt extras (modifiers) checkboxes
 */
async function populatePromptExtras(state, advancedOptions) {
    const extrasGrid = advancedOptions.querySelector('.llm-extras-grid');
    if (!extrasGrid || !state.prompts?.extra) return;
    
    // Import createCheckbox
    const { createCheckbox } = await import('../components/formElements.js');
    
    // Clear existing extras
    extrasGrid.innerHTML = '';
    
    // Create checkboxes for each extra
    Object.entries(state.prompts.extra).forEach(([key, extra]) => {
        if (extra.type === 'boolean') {
            const { container, checkbox } = createCheckbox(extra.name, {
                className: 'llm-extra-checkbox',
                labelClass: 'llm-extra-checkbox-label',
                checked: extra.default || false,
                title: extra.prompt
            });
            
            checkbox.dataset.extraKey = key;
            extrasGrid.appendChild(container);
            
            // Initialize state
            state.selectedExtras = state.selectedExtras || {};
            state.selectedExtras[key] = checkbox.checked;
            
            // Add change listener
            checkbox.addEventListener('change', () => {
                state.selectedExtras[key] = checkbox.checked;
            });
        }
    });
}

/**
 * Reset settings to defaults
 */
function resetSettingsToDefaults(state, advancedOptions) {
    state.settings = getDefaultSettings();
    saveSettings(state.settings);
    updateUIFromSettings(state.settings, advancedOptions);
    console.log('[LLM Tab] Settings reset to defaults');
}

/**
 * Creates the main LLM tab content
 * @param {HTMLElement} container - The container element for the tab
 * @returns {Object} - Tab utility object with destroy method
 */
export async function createLLMTab(container) {
    // Clear any existing content
    container.innerHTML = '';
    container.className = 'llm-tab';
    
    // Create main wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'llm-wrapper';
    
    // Create all UI sections
    const header = createHeader();
    const modelSelection = createModelSelection();
    const visionSection = createVisionSection();
    const inputSection = createInputSection();
    const advancedOptions = createAdvancedOptions();
    const responseSection = createResponseSection();
    const historySection = createHistorySection();
    
    // Create send button (positioned after advanced options)
    const sendBtn = document.createElement('button');
    sendBtn.className = 'llm-btn llm-btn-primary llm-send-btn';
    sendBtn.innerHTML = '📤 Send';
    sendBtn.title = 'Generate response (Ctrl+Enter)';
    sendBtn.setAttribute('aria-label', 'Send message to LLM');
    
    // Append all sections to wrapper
    wrapper.appendChild(header);
    wrapper.appendChild(modelSelection);
    wrapper.appendChild(visionSection);
    wrapper.appendChild(inputSection);
    wrapper.appendChild(advancedOptions);
    wrapper.appendChild(sendBtn);
    wrapper.appendChild(responseSection);
    wrapper.appendChild(historySection);
    
    container.appendChild(wrapper);
    
    // Add styles
    addLLMStyles();
    
    // Load default provider from settings
    const defaultProvider = await loadDefaultProvider();
    
    // Initialize tab state
    const state = {
        provider: defaultProvider,
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
        conversationHistory: [],
        // Generation settings (will be loaded from localStorage if available)
        settings: getDefaultSettings()
    };
    
    // Load saved settings from localStorage
    const savedSettings = loadSettings();
    if (savedSettings) {
        state.settings = { ...state.settings, ...savedSettings };
    }
    
    // Load conversation history from localStorage
    try {
        const saved = localStorage.getItem('llm_conversation_history');
        if (saved) {
            state.conversationHistory = JSON.parse(saved);
        }
    } catch (error) {
        console.warn('[LLM Tab] Failed to load conversation history:', error);
    }
    
    // Initialize tab
    await initializeTab(state, wrapper, modelSelection, visionSection, inputSection, advancedOptions, responseSection, historySection);
    
    // Set the provider dropdown to match the loaded default
    const providerSelect = modelSelection.querySelector('.llm-provider-select');
    if (providerSelect && state.provider) {
        console.log(`[LLM Tab] Setting provider dropdown to: ${state.provider}`);
        providerSelect.value = state.provider;
        // Trigger change event to update model list (this will also update vision section)
        providerSelect.dispatchEvent(new Event('change'));
    } else {
        // If no provider change event, manually update vision section
        const { isVisionModel } = await import('../llm/llmProviders.js');
        const hasVisionModel = state.model && isVisionModel(state.model, state.provider, state.visionModels);
        visionSection.style.display = hasVisionModel ? 'block' : 'none';
        console.log('[LLM Tab] Initial vision section state:', {
            model: state.model,
            provider: state.provider,
            hasVisionModel,
            display: visionSection.style.display
        });
    }
    
    // Update UI from loaded settings
    updateUIFromSettings(state.settings, advancedOptions);
    
    // Initialize history panel
    updateConversationList(state, historySection, responseSection);
    
    // Subscribe to cross-tab messages for Prompt Builder and Gallery integration
    const { getEventBus, MessageTypes } = await import('../shared/crossTabMessaging.js');
    const bus = getEventBus();
    
    console.log('[LLM Tab] Setting up cross-tab message subscriptions');
    console.log('[LLM Tab] Available MessageTypes:', MessageTypes);
    
    // Handle text from Prompt Builder
    const textSubscription = bus.subscribe(MessageTypes.PROMPT_BUILDER_TO_LLM, (data) => {
        const textarea = inputSection.querySelector('.llm-textarea');
        if (textarea && data.text) {
            textarea.value = data.text;
            textarea.dispatchEvent(new Event('input')); // Update character counter
            showNotification('Prompt received from Prompt Builder', 'success');
        }
    });
    
    console.log('[LLM Tab] Text subscription created');
    
    // Handle images from Gallery
    const imageSubscription = bus.subscribe(MessageTypes.IMAGE_TRANSFER, async (eventData) => {
        console.log('[LLM Tab] IMAGE_TRANSFER handler called!', eventData);
        
        // Extract the actual data from the event wrapper
        const data = eventData.data || eventData;
        
        if (!data.images || !Array.isArray(data.images)) {
            console.log('[LLM Tab] No valid images array in data:', data);
            return;
        }
        
        console.log('[LLM Tab] Received IMAGE_TRANSFER:', {
            imageCount: data.images.length,
            source: data.source,
            firstImage: data.images[0]
        });
        
        // Only process if vision section is visible
        if (visionSection.style.display === 'none') {
            showNotification('Please select a vision model first', 'warning');
            return;
        }
        
        // Import handleFileUpload
        const { handleFileUpload } = await import('./llmTab/llmVisionSection.js');
        
        // Convert image data to File objects
        const files = await Promise.all(data.images.map(async (imgData, index) => {
            try {
                // If it's an object with base64 property (from gallery)
                let base64Data;
                if (typeof imgData === 'object' && imgData.base64) {
                    base64Data = imgData.base64;
                } else if (typeof imgData === 'string') {
                    base64Data = imgData;
                } else if (imgData instanceof Blob) {
                    // Convert blob to file directly
                    const fileName = imgData.name || `image_${index + 1}.png`;
                    return new File([imgData], fileName, { type: imgData.type || 'image/png' });
                } else {
                    console.warn('[LLM Tab] Unknown image data format:', imgData);
                    return null;
                }
                
                // Ensure data URL has proper prefix
                const dataUrl = base64Data.startsWith('data:') ? base64Data : `data:image/png;base64,${base64Data}`;
                
                // Convert data URL to blob
                const response = await fetch(dataUrl);
                const blob = await response.blob();
                
                // Get filename from imgData if available
                const fileName = (imgData.name || imgData.file?.name || `image_${index + 1}.png`);
                
                // Create File from blob
                return new File([blob], fileName, { type: blob.type || 'image/png' });
            } catch (error) {
                console.error('[LLM Tab] Failed to convert image:', error);
                return null;
            }
        }));
        
        const validFiles = files.filter(Boolean);
        if (validFiles.length > 0) {
            const result = await handleFileUpload(state, visionSection, validFiles);
            
            if (result.added > 0) {
                const msg = result.added === 1 ? 'Added 1 image from gallery' : `Added ${result.added} images from gallery`;
                showNotification(msg, 'success');
            }
            
            if (result.errors.length > 0) {
                result.errors.forEach(err => {
                    showNotification(`${err.file}: ${err.error}`, 'error');
                });
            }
        }
    });
    
    // Legacy message handler for backward compatibility
    const messageHandler = (event) => {
        if (event.data.type === 'PROMPT_BUILDER_TO_LLM') {
            const textarea = inputSection.querySelector('.llm-textarea');
            if (textarea && event.data.text) {
                textarea.value = event.data.text;
                textarea.dispatchEvent(new Event('input')); // Update character counter
                showNotification('Prompt received from Prompt Builder', 'success');
            }
        }
    };
    window.addEventListener('message', messageHandler);
    
    // Return tab utilities
    return {
        destroy: () => {
            console.log('[LLM Tab] Destroying tab...');
            
            // Cleanup event handlers
            cleanupEventHandlers(state);
            
            // Cleanup cross-tab messaging
            if (textSubscription) textSubscription.unsubscribe();
            if (imageSubscription) imageSubscription.unsubscribe();
            window.removeEventListener('message', messageHandler);
            
            // Stop any active generation
            if (state.generating && state.streamController) {
                state.streamController.abort();
            }
            
            // Clear container
            container.innerHTML = '';
            
            console.log('[LLM Tab] Tab destroyed');
        }
    };
}

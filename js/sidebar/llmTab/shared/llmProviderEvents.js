/**
 * LLM Provider & Model Event Handlers
 * 
 * Handles provider selection, model selection, and refresh button events.
 * 
 * IMPORTANT: This module is designed to be called from setupEventHandlers() in llmEventHandlers.js.
 * All dependencies (model loading, settings updates, etc.) are passed in as parameters
 * so this file has NO internal imports — avoiding circular dependency issues entirely.
 */

const LLM_LAST_PROVIDER_KEY = 'llm_last_selected_provider';

/**
 * Handle provider change event.
 * @param {Object} state - Tab state object  
 * @param {HTMLElement} providerSelect - Provider select element
 * @param {HTMLElement} modelSelection - Model selection section
 * @param {HTMLElement} visionSection - Vision section (for visibility updates)
 * @param {HTMLElement} advancedOptions - Advanced options section  
 * @param {Function} updateModelDropdown - Function to update model dropdown
 * @param {Function} loadModels - Function to reload models
 * @param {Function} applyModelSettingsForActiveSelection - Apply settings for active model
 * @param {Function} showProviderOptions - Show/hide provider-specific options
 * @param {Function} updateCapabilityControlledOptions - Update capability controls
 * @param {Function} updateVisionSectionVisibility - Toggle vision section visibility
 */
export async function handleProviderChange(state, providerSelect, 
                                            modelSelection, visionSection, 
                                            advancedOptions,
                                            updateModelDropdown, loadModels,
                                            setModelContext, saveSettings,
                                            applyModelSettingsForActiveSelection, 
                                            showProviderOptions,
                                            updateCapabilityControlledOptions, updateVisionSectionVisibility) {
    const previousProvider = state.provider;
    const previousModel = state.model;

    try {
        // Save context before changing provider  
        setModelContext.call(null, state.settings, previousProvider, previousModel);
        saveSettings.call(null, state.settings);

        state.provider = providerSelect.value;
        
        try {
            localStorage.setItem(LLM_LAST_PROVIDER_KEY, state.provider);
        } catch (error) {
            console.warn('[LLM] Failed to persist last selected provider:', error);
        }

        const preferredModel = state.lastModelsByProvider?.[state.provider] || null;
        
        updateModelDropdown(state, modelSelection.querySelector('.llm-model-select'), 
                           state.provider, preferredModel);
        await loadModels(state, modelSelection, visionSection);

        applyModelSettingsForActiveSelection(state, advancedOptions);
        showProviderOptions(advancedOptions, state.provider);
        updateCapabilityControlledOptions(state, advancedOptions);
        updateVisionSectionVisibility(state, visionSection);

    } catch (error) {
        console.error('[LLM Provider Events] Error in handleProviderChange:', error);
    }
}

/**
 * Handle model change event.  
 */
export function handleModelChange(state, modelSelectEl, 
                                   advancedOptions,
                                   rememberProviderModel,
                                   setModelContext, saveSettings,
                                   applyModelSettingsForActiveSelection,
                                   updateCapabilityControlledOptions, updateVisionSectionVisibility) {
    const previousProvider = state.provider;
    const previousModel = state.model;
    
    // Save context before changing model
    setModelContext.call(null, state.settings, previousProvider, previousModel);
    saveSettings.call(null, state.settings);

    state.model = modelSelectEl.value;
    
    rememberProviderModel(state, state.provider, state.model);
    applyModelSettingsForActiveSelection(state, advancedOptions);
    updateCapabilityControlledOptions(state, advancedOptions);
    updateVisionSectionVisibility(state, visionSection);
}

/**
 * Handle refresh models button click.  
 */
export async function handleRefreshModels(state, modelSelection, 
                                           visionSection, advancedOptions,
                                           loadModels, applyModelSettingsForActiveSelection) {
    try {
        // Force re-initialization (third param = true forces reload)
        await loadModels(state, modelSelection, visionSection, true);
        
        applyModelSettingsForActiveSelection(state, advancedOptions);
        
    } catch (error) {
        console.error('[LLM Provider Events] Error in handleRefreshModels:', error);
    }
}

// Placeholder functions that will be overridden by setupEventHandlers when wiring up

console.log('[SageUtils] llmProviderEvents.js loaded');

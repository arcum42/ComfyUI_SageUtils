/**
 * LLM Preset Event Handlers  
 * 
 * Handles preset selection, save preset dialog, and manage presets dialog.
 * All dependencies (state, DOM elements, external functions) are passed in as parameters
 * so this file has NO internal imports — avoiding circular dependency issues entirely.
 */

/**
 * Handle preset selection change - apply selected preset to UI
 * @param {Object} state - Tab state object  
 * @param {HTMLElement} presetSelect - Preset dropdown element
 * @param {Object} modelSelection - Model selection section
 * @param {Function} loadPresets - Function to reload presets from API
 * @param {Function} showNotification - Notification display function
 * @param {Object} advancedOptions - Advanced options section
 * @param {Object} inputSection - Input/Compose section  
 * @param {Function} applyPresetToUI - Function to apply a preset by ID
 */
export async function handlePresetChange(state, presetSelect, 
                                          modelSelection, loadPresets, showNotification,
                                          advancedOptions, inputSection,
                                          applyPresetToUI) {
    const presetId = presetSelect.value;
    
    if (presetId) {
        await applyPresetToUI(state, presetId, modelSelection, advancedOptions, inputSection);
    }
}

/**
 * Handle save preset button click - show the save preset dialog
 * @param {Function} showSavePresetDialog - Function to open the preset save dialog  
 * @param {Object} state - Tab state object
 * @param {HTMLElement} modelSelection - Model selection section
 * @param {Function} loadPresets - Function to reload presets from API
 * @param {Function} showNotification - Notification display function
 */
export function handleSavePresetClick(showSavePresetDialog, state, modelSelection, loadPresets, showNotification) {
    showSavePresetDialog(state, modelSelection, loadPresets, showNotification);
}

/**
 * Handle manage presets button click - open the presets management dialog
 * @param {Function} showManagePresetsDialog - Function to open the preset manager modal  
 * @param {Object} state - Tab state object
 * @param {HTMLElement} modelSelection - Model selection section
 * @param {HTMLElement} advancedOptions - Advanced options section
 * @param {Object} inputSection - Input/Compose section  
 * @param {Function} loadPresets - Function to reload presets from API
 * @param {Function} applyPresetToUI - Function to apply a preset by ID
 * @param {Function} showNotification - Notification display function
 */
export function handleManagePresetsClick(showManagePresetsDialog, state, 
                                          modelSelection, advancedOptions, inputSection,
                                          loadPresets, applyPresetToUI, showNotification) {
    showManagePresetsDialog(state, modelSelection, advancedOptions, 
                            inputSection, loadPresets, applyPresetToUI, showNotification);
}

console.log('[SageUtils] llmPresetEvents.js loaded');

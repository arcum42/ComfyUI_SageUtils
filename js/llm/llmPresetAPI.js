/**
 * LLM Preset Public API
 * Provides external access to preset and system prompt functionality
 * for use by other tabs like Gallery
 */

import * as llmPresets from './llmPresets.js';

/**
 * Get all available presets
 * @returns {Promise<Object>} - Map of preset ID to preset data
 */
export async function getPresets() {
    return await llmPresets.getPresets();
}

/**
 * Get a specific preset by ID
 * @param {string} presetId - Preset ID
 * @returns {Promise<Object|null>} - Preset data or null if not found
 */
export async function getPreset(presetId) {
    return await llmPresets.getPresetById(presetId);
}

/**
 * Get all available system prompts
 * @returns {Promise<Object>} - Map of system prompt ID to prompt data
 */
export async function getSystemPrompts() {
    return await llmPresets.getSystemPrompts();
}

/**
 * Apply a preset to LLM tab (if available)
 * This function attempts to find the LLM tab state and apply the preset
 * @param {string} presetId - ID of preset to apply
 * @param {Object} options - Application options
 * @param {boolean} options.switchToTab - Whether to switch to LLM tab after applying
 * @param {boolean} options.notify - Whether to show notification
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export async function applyPreset(presetId, options = {}) {
    const { switchToTab = true, notify = true } = options;
    
    try {
        // Get the preset
        const preset = await llmPresets.getPresetById(presetId);
        if (!preset) {
            throw new Error(`Preset "${presetId}" not found`);
        }
        
        // Try to find LLM tab state
        // This is a bit hacky but works for cross-tab communication
        const llmTabState = await getLLMTabState();
        
        if (llmTabState) {
            // Apply preset to state
            llmPresets.applyPreset(llmTabState, preset);
            
            // Trigger UI update (if tab is active)
            await triggerLLMTabUpdate(llmTabState, preset);
            
            if (notify) {
                const { showNotification } = await import('../shared/crossTabMessaging.js');
                showNotification(`Preset "${preset.name}" applied`, 'success');
            }
            
            if (switchToTab) {
                const { requestTabSwitch } = await import('../shared/crossTabMessaging.js');
                requestTabSwitch('llm', { source: 'preset-api', presetId });
            }
            
            return true;
        } else {
            // Store preset to apply when LLM tab loads
            localStorage.setItem('llm_pending_preset', presetId);
            
            if (notify) {
                const { showNotification } = await import('../shared/crossTabMessaging.js');
                showNotification(`Preset will be applied when LLM tab loads`, 'info');
            }
            
            if (switchToTab) {
                const { requestTabSwitch } = await import('../shared/crossTabMessaging.js');
                requestTabSwitch('llm', { source: 'preset-api', presetId });
            }
            
            return true;
        }
    } catch (error) {
        console.error('[Preset API] Error applying preset:', error);
        
        if (notify) {
            const { showNotification } = await import('../shared/crossTabMessaging.js');
            showNotification(`Failed to apply preset: ${error.message}`, 'error');
        }
        
        return false;
    }
}

/**
 * Get LLM tab state (internal helper)
 * @returns {Promise<Object|null>} - LLM tab state or null
 */
async function getLLMTabState() {
    // Try to access LLM tab state through the global app structure
    // This assumes the sidebar has a reference to all tab states
    try {
        // Check if there's a global state manager or event bus we can use
        const { getEventBus, MessageTypes } = await import('../shared/crossTabMessaging.js');
        const bus = getEventBus();
        
        // Request LLM tab state through message bus
        return new Promise((resolve) => {
            let timeout;
            
            const unsubscribe = bus.subscribe(MessageTypes.LLM_STATE_RESPONSE, (message) => {
                clearTimeout(timeout);
                unsubscribe();
                resolve(message.data.state);
            });
            
            // Send request
            bus.publish(MessageTypes.LLM_STATE_REQUEST, { source: 'preset-api' });
            
            // Timeout after 500ms
            timeout = setTimeout(() => {
                unsubscribe();
                resolve(null);
            }, 500);
        });
    } catch (error) {
        console.warn('[Preset API] Could not get LLM tab state:', error);
        return null;
    }
}

/**
 * Trigger LLM tab UI update (internal helper)
 * @param {Object} state - LLM tab state
 * @param {Object} preset - Applied preset
 */
async function triggerLLMTabUpdate(state, preset) {
    try {
        const { getEventBus, MessageTypes } = await import('../shared/crossTabMessaging.js');
        const bus = getEventBus();
        
        // Notify LLM tab to update its UI
        bus.publish(MessageTypes.LLM_PRESET_APPLIED, {
            presetId: preset.id || 'unknown',
            presetName: preset.name,
            state: state
        });
    } catch (error) {
        console.warn('[Preset API] Could not trigger UI update:', error);
    }
}

/**
 * Quick apply preset by name (fuzzy match)
 * Useful for simple integrations that don't know exact preset IDs
 * @param {string} name - Preset name to search for
 * @param {Object} options - Application options
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export async function applyPresetByName(name, options = {}) {
    try {
        const presets = await getPresets();
        
        // Try exact match first
        const exactMatch = Object.entries(presets).find(([id, preset]) => 
            preset.name.toLowerCase() === name.toLowerCase()
        );
        
        if (exactMatch) {
            return await applyPreset(exactMatch[0], options);
        }
        
        // Try partial match
        const partialMatch = Object.entries(presets).find(([id, preset]) =>
            preset.name.toLowerCase().includes(name.toLowerCase())
        );
        
        if (partialMatch) {
            return await applyPreset(partialMatch[0], options);
        }
        
        throw new Error(`No preset found matching "${name}"`);
    } catch (error) {
        console.error('[Preset API] Error applying preset by name:', error);
        
        if (options.notify !== false) {
            const { showNotification } = await import('../shared/crossTabMessaging.js');
            showNotification(`Failed to apply preset: ${error.message}`, 'error');
        }
        
        return false;
    }
}

/**
 * Get preset categories
 * @returns {Promise<string[]>} - Array of category names
 */
export async function getPresetCategories() {
    const presets = await getPresets();
    const categories = new Set();
    
    Object.values(presets).forEach(preset => {
        if (preset.category) {
            categories.add(preset.category);
        }
    });
    
    return Array.from(categories).sort();
}

/**
 * Get presets by category
 * @param {string} category - Category name
 * @returns {Promise<Object>} - Map of preset ID to preset data
 */
export async function getPresetsByCategory(category) {
    const presets = await getPresets();
    const filtered = {};
    
    Object.entries(presets).forEach(([id, preset]) => {
        if (preset.category === category) {
            filtered[id] = preset;
        }
    });
    
    return filtered;
}

/**
 * Get built-in presets only
 * @returns {Promise<Object>} - Map of built-in preset ID to preset data
 */
export async function getBuiltinPresets() {
    const presets = await getPresets();
    const builtin = {};
    
    Object.entries(presets).forEach(([id, preset]) => {
        if (preset.isBuiltin) {
            builtin[id] = preset;
        }
    });
    
    return builtin;
}

/**
 * Get custom (user-created) presets only
 * @returns {Promise<Object>} - Map of custom preset ID to preset data
 */
export async function getCustomPresets() {
    const presets = await getPresets();
    const custom = {};
    
    Object.entries(presets).forEach(([id, preset]) => {
        if (!preset.isBuiltin) {
            custom[id] = preset;
        }
    });
    
    return custom;
}

// Export everything from llmPresets for advanced usage
export { createPresetFromState, savePreset, deletePreset, exportPreset, importPreset } from './llmPresets.js';
export { saveSystemPrompt, deleteSystemPrompt } from './llmPresets.js';

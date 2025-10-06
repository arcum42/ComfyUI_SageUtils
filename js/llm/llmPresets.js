/**
 * LLM Preset Management
 * Handles saving, loading, and managing LLM configuration presets
 * Custom presets and system prompts are stored in the user directory via backend API
 */

import { api } from "../../../scripts/api.js";

/**
 * Built-in system prompts (immutable)
 */
const BUILTIN_SYSTEM_PROMPTS = {
    'default': {
        name: 'Default',
        content: 'You are a helpful AI assistant.',
        description: 'Basic helpful assistant',
        isBuiltin: true
    },
    'e621_prompt_generator': {
        name: 'E621 Prompt Generator',
        content: null, // Will be loaded from server
        description: 'Advanced image description for E621-style prompts',
        isBuiltin: true,
        requiresFile: true,
        filePath: '/sage_utils/system_prompts/e621_prompt_generator.md'
    }
};

/**
 * Built-in presets
 */
const BUILTIN_PRESETS = {
    'descriptive_prompt': {
        name: 'Descriptive Prompt',
        description: 'Generate detailed image descriptions',
        provider: 'ollama',
        model: 'gemma3:12b', // Default vision model for image description
        promptTemplate: 'description/Descriptive Prompt',
        systemPrompt: 'e621_prompt_generator',
        settings: {
            temperature: 0.7,
            seed: -1,
            maxTokens: 512,
            keepAlive: 300,
            includeHistory: false
        },
        isBuiltin: true,
        category: 'description'
    },
    'e621_description': {
        name: 'E621 Image Description',
        description: 'Generate E621-style detailed image descriptions',
        provider: 'ollama',
        model: 'gemma3:12b', // Default vision model for image description
        promptTemplate: 'description/Descriptive Prompt',
        systemPrompt: 'e621_prompt_generator',
        settings: {
            temperature: 0.8,
            seed: -1,
            maxTokens: 1024,
            keepAlive: 300,
            includeHistory: false
        },
        isBuiltin: true,
        category: 'description'
    },
    'casual_chat': {
        name: 'Casual Chat',
        description: 'Friendly conversational assistant',
        provider: 'ollama',
        model: null,
        promptTemplate: '',
        systemPrompt: 'default',
        settings: {
            temperature: 0.9,
            seed: -1,
            maxTokens: 1024,
            keepAlive: 300,
            includeHistory: true,
            maxHistoryMessages: 10
        },
        isBuiltin: true,
        category: 'chat'
    }
};

/**
 * Load system prompt content from server
 * @param {string} filePath - Path to system prompt file
 * @returns {Promise<string>} - System prompt content
 */
async function loadSystemPromptFile(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Failed to load system prompt: ${response.statusText}`);
        }
        return await response.text();
    } catch (error) {
        console.error('Error loading system prompt file:', error);
        throw error;
    }
}

/**
 * Get all system prompts (built-in + custom) from backend
 * @returns {Promise<Object>} - Map of system prompt ID to prompt data
 */
export async function getSystemPrompts() {
    try {
        // Get custom prompts from backend
        const response = await api.fetchApi('/sage_llm/system_prompts/list');
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to get system prompts');
        }
        
        // Merge built-in with custom prompts from backend
        const allPrompts = { ...BUILTIN_SYSTEM_PROMPTS };
        
        // Load content for built-in prompts that require files
        for (const [id, prompt] of Object.entries(allPrompts)) {
            if (prompt.requiresFile && prompt.content === null) {
                try {
                    prompt.content = await loadSystemPromptFile(prompt.filePath);
                } catch (error) {
                    console.warn(`Failed to load system prompt ${id}:`, error);
                    prompt.content = 'Error loading system prompt.';
                }
            }
        }
        
        // Add custom prompts from backend (backend already includes built-ins in the list)
        const customPrompts = data.data.prompts || {};
        for (const [id, meta] of Object.entries(customPrompts)) {
            if (!meta.isBuiltin) {
                // Load custom prompt content from backend
                try {
                    const content = await loadSystemPromptFile(`/sage_utils/system_prompts/${id}.md`);
                    allPrompts[id] = {
                        name: meta.name,
                        content: content,
                        description: meta.description || '',
                        isBuiltin: false
                    };
                } catch (error) {
                    console.warn(`Failed to load custom system prompt ${id}:`, error);
                }
            }
        }
        
        return allPrompts;
    } catch (error) {
        console.error('Error getting system prompts:', error);
        // Return at least built-in prompts on error
        return { ...BUILTIN_SYSTEM_PROMPTS };
    }
}

/**
 * Load custom system prompts from localStorage
 * @returns {Object} - Map of custom system prompts
 */
function loadCustomSystemPrompts() {
    // Deprecated - now using backend API
    return {};
}

/**
 * Save custom system prompts to localStorage
 * @param {Object} prompts - Map of custom system prompts
 */
function saveCustomSystemPrompts(prompts) {
    // Deprecated - now using backend API
}

/**
 * Add or update a custom system prompt via backend API
 * @param {string} id - Unique ID for the prompt
 * @param {Object} promptData - System prompt data
 * @param {string} promptData.name - Display name
 * @param {string} promptData.content - Prompt content
 * @param {string} [promptData.description] - Optional description
 */
export async function saveSystemPrompt(id, promptData) {
    try {
        const response = await api.fetchApi('/sage_llm/system_prompts/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id,
                name: promptData.name,
                content: promptData.content,
                description: promptData.description || ''
            })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to save system prompt');
        }
        
        return data.data;
    } catch (error) {
        console.error('Error saving system prompt:', error);
        throw error;
    }
}

/**
 * Delete a custom system prompt via backend API
 * @param {string} id - System prompt ID
 * @throws {Error} - If trying to delete a built-in prompt
 */
export async function deleteSystemPrompt(id) {
    if (BUILTIN_SYSTEM_PROMPTS[id]) {
        throw new Error('Cannot delete built-in system prompts');
    }
    
    try {
        const response = await api.fetchApi('/sage_llm/system_prompts/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to delete system prompt');
        }
        
        return data.data;
    } catch (error) {
        console.error('Error deleting system prompt:', error);
        throw error;
    }
}

/**
 * Get all presets (built-in + custom) from backend
 * User versions of built-in presets override the built-in versions
 * @returns {Promise<Object>} - Map of preset ID to preset data
 */
export async function getPresets() {
    try {
        // Get custom presets from backend
        const response = await api.fetchApi('/sage_llm/presets/list');
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to get presets');
        }
        
        const customPresets = data.data.presets || {};
        
        // Start with built-in presets
        const allPresets = { ...BUILTIN_PRESETS };
        
        // Override with custom presets (including user versions of built-ins)
        for (const [id, preset] of Object.entries(customPresets)) {
            allPresets[id] = {
                ...preset,
                isUserOverride: BUILTIN_PRESETS[id] !== undefined // Mark if this is overriding a built-in
            };
        }
        
        return allPresets;
    } catch (error) {
        console.error('Error getting presets:', error);
        // Return at least built-in presets on error
        return { ...BUILTIN_PRESETS };
    }
}

/**
 * Load custom presets from localStorage
 * @returns {Object} - Map of custom presets
 */
function loadCustomPresets() {
    // Deprecated - now using backend API
    return {};
}

/**
 * Save custom presets to localStorage
 * @param {Object} presets - Map of custom presets
 */
function saveCustomPresets(presets) {
    // Deprecated - now using backend API
}

/**
 * Create a preset from current state
 * @param {Object} state - Current LLM tab state
 * @param {string} name - Preset name
 * @param {string} [description] - Optional description
 * @param {string} [category] - Optional category
 * @returns {Object} - Created preset object
 */
export function createPresetFromState(state, name, description = '', category = 'custom') {
    return {
        name,
        description,
        category,
        provider: state.provider,
        model: state.model,
        promptTemplate: state.settings.promptTemplate || '',
        systemPrompt: state.settings.systemPrompt || '',
        settings: { ...state.settings },
        isBuiltin: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

/**
 * Save a custom preset via backend API
 * @param {string} id - Unique ID for the preset
 * @param {Object} presetData - Preset data
 */
export async function savePreset(id, presetData) {
    try {
        const response = await api.fetchApi('/sage_llm/presets/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id,
                preset: {
                    ...presetData,
                    isBuiltin: false
                }
            })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to save preset');
        }
        
        return data.data;
    } catch (error) {
        console.error('Error saving preset:', error);
        throw error;
    }
}

/**
 * Delete a custom preset via backend API
 * This can delete both custom presets and user overrides of built-in presets
 * Deleting a user override will restore the built-in preset
 * @param {string} id - Preset ID
 */
export async function deletePreset(id) {
    try {
        const response = await api.fetchApi('/sage_llm/presets/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to delete preset');
        }
        
        return data.data;
    } catch (error) {
        console.error('Error deleting preset:', error);
        throw error;
    }
}

/**
 * Apply a preset to the current state
 * @param {Object} state - LLM tab state
 * @param {Object} preset - Preset to apply
 */
export function applyPreset(state, preset) {
    // Update provider and model
    state.provider = preset.provider;
    if (preset.model) {
        state.model = preset.model;
    }
    
    // Update settings
    state.settings = {
        ...state.settings,
        ...preset.settings,
        promptTemplate: preset.promptTemplate,
        systemPrompt: preset.systemPrompt
    };
}

/**
 * Export preset to JSON file
 * @param {string} id - Preset ID
 * @param {Object} preset - Preset data
 */
export function exportPreset(id, preset) {
    const exportData = {
        id,
        ...preset,
        exportedAt: new Date().toISOString(),
        version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `llm_preset_${id}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Import preset from JSON
 * @param {Object} importedData - Imported preset data
 * @returns {Object} - { id, preset } of imported preset
 */
export function importPreset(importedData) {
    // Validate structure
    if (!importedData.name || !importedData.provider) {
        throw new Error('Invalid preset format');
    }
    
    const id = importedData.id || `imported_${Date.now()}`;
    const preset = {
        name: importedData.name,
        description: importedData.description || '',
        category: importedData.category || 'imported',
        provider: importedData.provider,
        model: importedData.model,
        promptTemplate: importedData.promptTemplate || '',
        systemPrompt: importedData.systemPrompt || '',
        settings: importedData.settings || {},
        isBuiltin: false,
        importedAt: new Date().toISOString()
    };
    
    return { id, preset };
}

/**
 * Get preset by ID
 * @param {string} id - Preset ID
 * @returns {Promise<Object|null>} - Preset data or null if not found
 */
export async function getPresetById(id) {
    const allPresets = await getPresets();
    return allPresets[id] || null;
}

/**
 * Get the original built-in preset data (before any user overrides)
 * @param {string} id - Preset ID
 * @returns {Object|null} - Built-in preset data or null if not a built-in
 */
export function getBuiltinPreset(id) {
    return BUILTIN_PRESETS[id] ? { ...BUILTIN_PRESETS[id] } : null;
}

/**
 * Check if a preset ID refers to a built-in preset
 * @param {string} id - Preset ID
 * @returns {boolean} - True if it's a built-in preset
 */
export function isBuiltinPreset(id) {
    return BUILTIN_PRESETS[id] !== undefined;
}

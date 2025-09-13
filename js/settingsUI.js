// SageUtils Settings Integration
// Integrates SageUtils settings with ComfyUI's native settings system

import { app } from "../../../../scripts/app.js";
import { api } from "../../../../scripts/api.js";

// All of the setting types are based on PrimeVue components.
// https://primevue.org/

// Props described in the PrimeVue documentation can be defined 
// for ComfyUI settings by adding them in an attrs field.

// Helper functions for API communication
async function loadSageSettings() {
    try {
        const response = await api.fetchApi('/sage_utils/settings');
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                // Handle both legacy format (data.settings) and new format (data.data.settings)
                return data.settings || data.data?.settings;
            } else {
                console.error('Server returned error:', data.error);
                if (data.details) {
                    console.error('Error details:', data.details);
                }
            }
        } else {
            console.error('HTTP error:', response.status, response.statusText);
        }
        throw new Error('Failed to load settings from server');
    } catch (error) {
        console.error('Error loading SageUtils settings:', error);
        // Return fallback settings structure
        return {
            enable_ollama: { current_value: true },
            enable_lmstudio: { current_value: true },
            ollama_use_custom_url: { current_value: false },
            ollama_custom_url: { current_value: "" },
            lmstudio_use_custom_url: { current_value: false },
            lmstudio_custom_url: { current_value: "" }
        };
    }
}

async function saveSageSetting(key, value) {
    try {
        const response = await api.fetchApi('/sage_utils/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ [key]: value })
        });

        const data = await response.json();
        if (data.success) {
            console.log(`Successfully saved setting ${key}: ${value}`);
            if (data.errors && data.errors.length > 0) {
                console.warn('Warnings during setting save:', data.errors);
            }
        } else {
            console.error(`Failed to save setting ${key}:`, data.error);
        }
        return data.success;
    } catch (error) {
        console.error(`Error saving SageUtils setting ${key}:`, error);
        return false;
    }
}

// Register SageUtils settings with ComfyUI's native settings system
app.registerExtension({
    name: "arcum42.sage.utils.settings",
    
    async setup() {
        console.log("Setting up SageUtils settings integration...");
        
        // Load current settings from server
        const serverSettings = await loadSageSettings();
        if (!serverSettings) {
            console.warn('Could not load SageUtils settings from server - settings will use defaults');
            return;
        }

        console.log('Loaded SageUtils settings from server:', serverSettings);

        // Set current values for all settings from server
        // Map backend keys to the new frontend setting IDs
        const keyToIdMap = {
            'enable_lmstudio': 'SageUtils.LLM Providers.enable_lmstudio',
            'enable_ollama': 'SageUtils.LLM Providers.enable_ollama',
            'ollama_custom_url': 'SageUtils.Local Custom Ollama URL.ollama_custom_url',
            'ollama_use_custom_url': 'SageUtils.Local Custom Ollama URL.ollama_use_custom_url',
            'lmstudio_custom_url': 'SageUtils.Local Custom LM Studio URL.lmstudio_custom_url',
            'lmstudio_use_custom_url': 'SageUtils.Local Custom LM Studio URL.lmstudio_use_custom_url'
        };

        for (const [key, settingInfo] of Object.entries(serverSettings)) {
            const settingId = keyToIdMap[key];
            if (settingId && settingInfo.current_value !== undefined) {
                try {
                    await app.extensionManager.setting.set(settingId, settingInfo.current_value);
                    console.log(`Set initial value for ${settingId}:`, settingInfo.current_value);
                } catch (error) {
                    console.warn(`Could not set initial value for ${settingId}:`, error);
                }
            }
        }

        console.log(`SageUtils settings integration completed`);
    },

    settings: [
        {
            id: "SageUtils.LLM Providers.enable_lmstudio",
            name: "Enable LM Studio Integration",
            type: "boolean", 
            defaultValue: true,
            tooltip: "Enable LM Studio LLM integration",
            onChange: async (newVal, oldVal) => {
                console.log(`LM Studio integration changed from ${oldVal} to ${newVal}`);
                await saveSageSetting('enable_lmstudio', newVal);
            }
        },
        {
            id: "SageUtils.LLM Providers.enable_ollama",
            name: "Enable Ollama Integration",
            type: "boolean",
            defaultValue: true,
            tooltip: "Enable Ollama LLM integration",
            onChange: async (newVal, oldVal) => {
                console.log(`Ollama integration changed from ${oldVal} to ${newVal}`);
                await saveSageSetting('enable_ollama', newVal);
            }
        },
        {
            id: "SageUtils.Local Custom Ollama URL.ollama_custom_url",
            name: "Address",
            type: "text",
            defaultValue: "",
            tooltip: "Custom URL for Ollama service (e.g., 'http://localhost:11434')",
            onChange: async (newVal, oldVal) => {
                console.log(`Ollama custom URL changed from '${oldVal}' to '${newVal}'`);
                await saveSageSetting('ollama_custom_url', newVal);
            }
        },
        {
            id: "SageUtils.Local Custom Ollama URL.ollama_use_custom_url",
            name: "Enable Custom URL",
            type: "boolean",
            defaultValue: false,
            tooltip: "Use a custom URL for Ollama instead of the default",
            onChange: async (newVal, oldVal) => {
                console.log(`Ollama custom URL setting changed from ${oldVal} to ${newVal}`);
                await saveSageSetting('ollama_use_custom_url', newVal);
            }
        },
        {
            id: "SageUtils.Local Custom LM Studio URL.lmstudio_custom_url",
            name: "Address",
            type: "text",
            defaultValue: "",
            tooltip: "Custom URL for LM Studio service (e.g., 'http://localhost:1234')",
            onChange: async (newVal, oldVal) => {
                console.log(`LM Studio custom URL changed from '${oldVal}' to '${newVal}'`);
                await saveSageSetting('lmstudio_custom_url', newVal);
            }
        },
        {
            id: "SageUtils.Local Custom LM Studio URL.lmstudio_use_custom_url",
            name: "Enable Custom URL",
            type: "boolean",
            defaultValue: false,
            tooltip: "Use a custom URL for LM Studio instead of the default",
            onChange: async (newVal, oldVal) => {
                console.log(`LM Studio custom URL setting changed from ${oldVal} to ${newVal}`);
                await saveSageSetting('lmstudio_use_custom_url', newVal);
            }
        }
    ]
});

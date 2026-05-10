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
            enable_lmstudio_rest: { current_value: false },
            enable_ollama_rest: { current_value: false },
            enable_openai: { current_value: false },
            openai_api_key: { current_value: '' },
            openai_use_custom_url: { current_value: false },
            openai_base_url: { current_value: '' },
            default_llm_provider: { current_value: 'lmstudio_rest' },
            ollama_use_custom_url: { current_value: false },
            ollama_custom_url: { current_value: "" },
            ollama_api_key: { current_value: '' },
            lmstudio_use_custom_url: { current_value: false },
            lmstudio_custom_url: { current_value: "" },
            lmstudio_api_token: { current_value: '' }
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
            'default_llm_provider': 'SageUtils.LLM Providers.default_llm_provider',
            'enable_lmstudio_rest': 'SageUtils.LLM Providers.enable_lmstudio_rest',
            'enable_ollama_rest': 'SageUtils.LLM Providers.enable_ollama_rest',
            'enable_openai': 'SageUtils.LLM Providers.enable_openai',
            'openai_api_key': 'SageUtils.OpenAI.openai_api_key',
            'openai_use_custom_url': 'SageUtils.OpenAI.openai_use_custom_url',
            'openai_base_url': 'SageUtils.OpenAI.openai_base_url',
            'ollama_custom_url': 'SageUtils.Local Custom Ollama URL.ollama_custom_url',
            'ollama_use_custom_url': 'SageUtils.Local Custom Ollama URL.ollama_use_custom_url',
            'ollama_api_key': 'SageUtils.Ollama.ollama_api_key',
            'lmstudio_custom_url': 'SageUtils.Local Custom LM Studio URL.lmstudio_custom_url',
            'lmstudio_use_custom_url': 'SageUtils.Local Custom LM Studio URL.lmstudio_use_custom_url',
            'lmstudio_api_token': 'SageUtils.LM Studio.lmstudio_api_token'
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
            id: "SageUtils.LLM Providers.default_llm_provider",
            name: "Default LLM Provider",
            type: "combo",
            defaultValue: "lmstudio_rest",
            options: ["lmstudio_rest", "ollama_rest", "openai", "native"],
            tooltip: "Default provider used by the LLM sidebar and provider-switching LLM v3 nodes",
            onChange: async (newVal, oldVal) => {
                console.log(`Default LLM provider changed from ${oldVal} to ${newVal}`);
                await saveSageSetting('default_llm_provider', newVal);
            }
        },
        {
            id: "SageUtils.LLM Providers.enable_lmstudio_rest",
            name: "Enable LM Studio Integration",
            type: "boolean",
            defaultValue: false,
            tooltip: "Enable LM Studio REST v1 integration",
            onChange: async (newVal, oldVal) => {
                console.log(`LM Studio REST integration changed from ${oldVal} to ${newVal}`);
                await saveSageSetting('enable_lmstudio_rest', newVal);
            }
        },
        {
            id: "SageUtils.LLM Providers.enable_ollama_rest",
            name: "Enable Ollama Integration",
            type: "boolean",
            defaultValue: false,
            tooltip: "Enable Ollama native REST API integration (no SDK required)",
            onChange: async (newVal, oldVal) => {
                console.log(`Ollama REST integration changed from ${oldVal} to ${newVal}`);
                await saveSageSetting('enable_ollama_rest', newVal);
            }
        },
        {
            id: "SageUtils.LLM Providers.enable_openai",
            name: "Enable OpenAI Integration",
            type: "boolean",
            defaultValue: false,
            tooltip: "Enable OpenAI (or OpenAI-compatible) REST API integration",
            onChange: async (newVal, oldVal) => {
                console.log(`OpenAI integration changed from ${oldVal} to ${newVal}`);
                await saveSageSetting('enable_openai', newVal);
            }
        },
        {
            id: "SageUtils.OpenAI.openai_api_key",
            name: "API Key",
            type: "text",
            defaultValue: "",
            tooltip: "OpenAI API key (or leave blank to use OPENAI_API_KEY env var)",
            onChange: async (newVal, oldVal) => {
                console.log('OpenAI API key changed');
                await saveSageSetting('openai_api_key', newVal);
            }
        },
        {
            id: "SageUtils.OpenAI.openai_use_custom_url",
            name: "Enable Custom URL",
            type: "boolean",
            defaultValue: false,
            tooltip: "Use a custom base URL instead of https://api.openai.com",
            onChange: async (newVal, oldVal) => {
                console.log(`OpenAI custom URL setting changed from ${oldVal} to ${newVal}`);
                await saveSageSetting('openai_use_custom_url', newVal);
            }
        },
        {
            id: "SageUtils.OpenAI.openai_base_url",
            name: "Base URL",
            type: "text",
            defaultValue: "",
            tooltip: "Custom base URL for OpenAI-compatible endpoint (e.g., 'http://localhost:8080')",
            onChange: async (newVal, oldVal) => {
                console.log(`OpenAI base URL changed from '${oldVal}' to '${newVal}'`);
                await saveSageSetting('openai_base_url', newVal);
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
            id: "SageUtils.Ollama.ollama_api_key",
            name: "API Key",
            type: "text",
            defaultValue: "",
            attrs: {
                type: 'password',
                autocomplete: 'off'
            },
            tooltip: "Ollama API key (or leave blank to use OLLAMA_API_KEY env var)",
            onChange: async (newVal) => {
                console.log('Ollama API key changed');
                await saveSageSetting('ollama_api_key', newVal);
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
        },
        {
            id: "SageUtils.LM Studio.lmstudio_api_token",
            name: "API Token",
            type: "text",
            defaultValue: "",
            attrs: {
                type: 'password',
                autocomplete: 'off'
            },
            tooltip: "LM Studio API token (or leave blank to use LMSTUDIO_API_TOKEN env var)",
            onChange: async (newVal) => {
                console.log('LM Studio API token changed');
                await saveSageSetting('lmstudio_api_token', newVal);
            }
        }
    ]
});

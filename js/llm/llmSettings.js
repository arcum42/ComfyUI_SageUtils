/**
 * LLM Settings Management
 * Handles settings persistence, defaults, and UI updates
 */

/**
 * Get default settings
 * @returns {Object} - Default settings object
 */
export function getDefaultSettings() {
    return {
        temperature: 0.7,
        seed: 42,
        maxTokens: 1024,
        keepAlive: 300,
        numCtx: 2048,
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
        lmsMinP: 0.05,
        providerOptions: {
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
        },
        modelSettings: {},
    };
}

function queryFirst(advancedOptions, selectors) {
    if (!advancedOptions) {
        return null;
    }

    for (const selector of selectors) {
        const element = advancedOptions.querySelector(selector);
        if (element) {
            return element;
        }
    }

    return null;
}

function getSettingValue(settings, ...keys) {
    for (const key of keys) {
        if (settings?.[key] !== undefined) {
            return settings[key];
        }
    }

    return undefined;
}

function getProviderSection(advancedOptions, provider) {
    if (!advancedOptions) {
        return null;
    }

    const providerName = provider === 'lmstudio_rest'
        ? 'lmstudio'
        : provider === 'ollama_rest'
            ? 'ollama'
            : null;

    if (!providerName) {
        return null;
    }

    return advancedOptions.querySelector(`.llm-${providerName}-options`);
}

function getActiveSettingsScope(advancedOptions, provider) {
    return getProviderSection(advancedOptions, provider) || advancedOptions;
}

const KEY_ALIASES = {
    max_tokens: 'maxTokens',
    keep_alive: 'keepAlive',
    top_k: 'topK',
    top_p: 'topP',
    repeat_last_n: 'repeatLastN',
    repeat_penalty: 'repeatPenalty',
    presence_penalty: 'presencePenalty',
    frequency_penalty: 'frequencyPenalty',
    num_ctx: 'numCtx',
    lms_top_k: 'lmsTopK',
    lms_top_p: 'lmsTopP',
    lms_repeat_penalty: 'lmsRepeatPenalty',
    lms_min_p: 'lmsMinP',
};

function normalizeSettingKey(key) {
    return KEY_ALIASES[key] || key;
}

function normalizeSettingsObject(settings) {
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
        return settings;
    }

    const normalized = {};

    Object.entries(settings).forEach(([key, value]) => {
        if (key === 'modelSettings' && value && typeof value === 'object' && !Array.isArray(value)) {
            normalized.modelSettings = normalizeModelSettings(value);
            return;
        }

        normalized[normalizeSettingKey(key)] = value;
    });

    return normalized;
}

function normalizeModelSettings(modelSettings) {
    const normalized = {};

    Object.entries(modelSettings || {}).forEach(([provider, providerModels]) => {
        normalized[provider] = {};
        Object.entries(providerModels || {}).forEach(([model, snapshot]) => {
            normalized[provider][model] = normalizeSettingsObject(snapshot);
        });
    });

    return normalized;
}

/**
 * Create a stable key for a provider/model pair.
 * @param {string} provider - Provider identifier
 * @param {string} model - Model identifier
 * @returns {string} - Stable model settings key
 */
export function getModelSettingsKey(provider, model) {
    return `${provider || 'unknown'}::${model || ''}`;
}

/**
 * Attach the active model context to a settings object without persisting it.
 * @param {Object} settings - Settings object
 * @param {string} provider - Active provider
 * @param {string} model - Active model
 * @returns {Object} - The same settings object
 */
export function setModelContext(settings, provider, model) {
    if (!settings || typeof settings !== 'object') {
        return settings;
    }

    Object.defineProperty(settings, '__llmModelContext', {
        value: { provider, model },
        enumerable: false,
        writable: true,
        configurable: true,
    });

    return settings;
}

/**
 * Return a settings object resolved for the active model.
 * History controls remain global while the rest of the settings are per model.
 * @param {Object} settings - Persisted settings object
 * @param {string} provider - Active provider
 * @param {string} model - Active model
 * @returns {Object} - Settings merged for the active model
 */
export function getSettingsForModel(settings, provider, model) {
    const defaults = getDefaultSettings();
    const normalizedSettings = normalizeSettingsObject(settings) || {};
    // Only the stored snapshot for this specific model is merged on top of defaults.
    // We deliberately do NOT spread normalizedSettings here — that would inherit all
    // per-model values (temperature, topK, etc.) from whatever the previous model had
    // in state.settings, making model switches bleed into one another.
    const modelSnapshot = normalizeSettingsObject(normalizedSettings?.modelSettings?.[provider]?.[model] || {});

    return {
        ...defaults,
        ...modelSnapshot,
        // Truly global settings always come from the current persisted settings
        includeHistory: normalizedSettings?.includeHistory ?? defaults.includeHistory,
        maxHistoryMessages: normalizedSettings?.maxHistoryMessages ?? defaults.maxHistoryMessages,
        modelSettings: normalizedSettings?.modelSettings || {},
    };
}

/**
 * Resolve the active model settings onto a state object and refresh the UI.
 * @param {Object} state - LLM tab state object
 * @param {HTMLElement} advancedOptions - Advanced options section
 * @returns {Object} - Updated settings object
 */
export function applyModelSettingsForActiveSelection(state, advancedOptions) {
    if (!state) {
        return null;
    }

    console.debug('[LLM Settings] applyModelSettings - provider:', state.provider, '| model:', state.model);
    state.settings = getSettingsForModel(state.settings, state.provider, state.model);
    setModelContext(state.settings, state.provider, state.model);
    console.debug('[LLM Settings] resolved settings for model:', {
        temperature: state.settings.temperature,
        maxTokens: state.settings.maxTokens,
        topK: state.settings.topK,
        topP: state.settings.topP,
        storedSnapshots: Object.keys(state.settings.modelSettings || {})
            .map(p => `${p}: ${Object.keys(state.settings.modelSettings[p] || {}).join(', ')}`)
    });

    if (advancedOptions) {
        updateUIFromSettings(state.settings, advancedOptions, state.provider);
    }

    return state.settings;
}

/**
 * Save settings to localStorage
 * @param {Object} settings - Settings object to save
 */
export function saveSettings(settings) {
    try {
        const payload = normalizeSettingsObject({ ...(settings || {}) }) || {};
        const modelContext = settings?.__llmModelContext;

        delete payload.__llmModelContext;

        if (modelContext?.provider && modelContext.model) {
            const existingModelSettings = payload.modelSettings || {};
            const providerSettings = { ...(existingModelSettings[modelContext.provider] || {}) };
            const snapshot = extractModelSpecificSettings(payload);
            providerSettings[modelContext.model] = snapshot;
            payload.modelSettings = {
                ...existingModelSettings,
                [modelContext.provider]: providerSettings,
            };

            console.debug('[LLM Settings] saveSettings - storing snapshot for', modelContext.provider, '/', modelContext.model, ':', {
                temperature: snapshot.temperature,
                maxTokens: snapshot.maxTokens,
                topK: snapshot.topK,
                topP: snapshot.topP,
            });

            if (settings && typeof settings === 'object') {
                settings.modelSettings = payload.modelSettings;
            }
        } else {
            console.debug('[LLM Settings] saveSettings - no model context, saving global settings only', {
                hasContext: !!modelContext,
                provider: modelContext?.provider,
                model: modelContext?.model,
            });
        }

        localStorage.setItem('llm_tab_settings', JSON.stringify(payload));
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

/**
 * Extract settings that should be stored per model.
 * @param {Object} settings - Current settings object
 * @returns {Object} - Model-specific settings snapshot
 */
function extractModelSpecificSettings(settings) {
    const modelSpecific = {};
    const globalKeys = new Set(['includeHistory', 'maxHistoryMessages', 'modelSettings']);

    Object.entries(settings || {}).forEach(([key, value]) => {
        if (globalKeys.has(key) || key.startsWith('__')) {
            return;
        }
        modelSpecific[key] = value;
    });

    return modelSpecific;
}

/**
 * Load settings from localStorage
 * @returns {Object|null} - Saved settings or null if none exist
 */
export function loadSettings() {
    try {
        const saved = localStorage.getItem('llm_tab_settings');
        const parsed = saved ? normalizeSettingsObject(JSON.parse(saved)) : null;
        if (parsed) {
            console.debug('[LLM Settings] loadSettings - loaded from localStorage:', {
                temperature: parsed.temperature,
                maxTokens: parsed.maxTokens,
                storedProviders: Object.keys(parsed.modelSettings || {}),
            });
        } else {
            console.debug('[LLM Settings] loadSettings - no saved settings found');
        }
        return parsed;
    } catch (error) {
        console.error('Error loading settings:', error);
        return null;
    }
}

/**
 * Load settings with defaults fallback
 * @returns {Object} - Settings object with defaults for missing values
 */
export function loadSettingsWithDefaults() {
    const defaults = getDefaultSettings();
    const saved = loadSettings();
    return saved ? { ...defaults, ...saved } : defaults;
}

/**
 * Reset settings to defaults
 * @returns {Object} - Default settings object
 */
export function resetSettings() {
    const defaults = getDefaultSettings();
    saveSettings(defaults);
    return defaults;
}

/**
 * Update a single setting
 * @param {string} key - Setting key
 * @param {any} value - Setting value
 * @param {Object} currentSettings - Current settings object
 * @returns {Object} - Updated settings object
 */
export function updateSetting(key, value, currentSettings) {
    const updated = { ...currentSettings, [key]: value };
    saveSettings(updated);
    return updated;
}

/**
 * Update multiple settings at once
 * @param {Object} updates - Object with setting key-value pairs
 * @param {Object} currentSettings - Current settings object
 * @returns {Object} - Updated settings object
 */
export function updateSettings(updates, currentSettings) {
    const updated = { ...currentSettings, ...updates };
    saveSettings(updated);
    return updated;
}

/**
 * Update UI elements from settings object
 * @param {Object} settings - Settings object
 * @param {HTMLElement} advancedOptions - Advanced options section
 */
export function updateUIFromSettings(settings, advancedOptions, provider = settings?.__llmModelContext?.provider) {
    const activeScope = getActiveSettingsScope(advancedOptions, provider);

    // Common settings
    const temperatureSlider = queryFirst(activeScope, ['.llm-temperature-slider']);
    const seedInput = queryFirst(activeScope, ['.llm-seed-input']);
    const maxTokensInput = queryFirst(activeScope, ['.llm-max-tokens-input', '.llm-max-tokens-slider']);
    const keepAliveInput = queryFirst(activeScope, ['.llm-keep-alive-input', '.llm-keep-alive-slider']);
    const systemPrompt = queryFirst(advancedOptions, ['.llm-system-prompt-textarea', '.llm-system-prompt']);

    if (temperatureSlider) {
        const temperature = getSettingValue(settings, 'temperature');
        temperatureSlider.value = temperature;
        // The value display is in a header div above the slider, not a sibling of it.
        // Traverse up to the slider container and find the display span from there.
        const valueDisplay = temperatureSlider.closest('.slider-container')?.querySelector('.slider-value');
        if (valueDisplay && temperature !== undefined) valueDisplay.textContent = parseFloat(temperature).toFixed(1);
    }

    if (seedInput) {
        seedInput.value = getSettingValue(settings, 'seed');
    }

    if (maxTokensInput) {
        maxTokensInput.value = getSettingValue(settings, 'maxTokens', 'max_tokens');
    }

    if (keepAliveInput) {
        keepAliveInput.value = getSettingValue(settings, 'keepAlive', 'keep_alive');
    }

    if (systemPrompt) {
        systemPrompt.value = getSettingValue(settings, 'systemPrompt') || '';
    }

    // Helper function to update slider and its display.
    // The value display span lives in a header div above the slider (created by
    // createSlider in formElements.js), so nextElementSibling is always null here.
    // Traverse up to the .slider-container and query the .slider-value from there.
    const updateSlider = (slider, value) => {
        if (slider) {
            slider.value = value;
            const valueDisplay = slider.closest('.slider-container')?.querySelector('.slider-value');
            if (valueDisplay) {
                // Format based on slider type
                if (slider.classList.contains('llm-presence-penalty-slider') ||
                    slider.classList.contains('llm-frequency-penalty-slider') ||
                    slider.classList.contains('llm-repeat-penalty-slider') ||
                    slider.classList.contains('llm-lms-repeat-penalty-slider')) {
                    valueDisplay.textContent = parseFloat(value).toFixed(1);
                } else if (slider.classList.contains('llm-topp-slider') ||
                    slider.classList.contains('llm-lms-topp-slider') ||
                    slider.classList.contains('llm-lms-minp-slider')) {
                    valueDisplay.textContent = parseFloat(value).toFixed(2);
                } else if (slider.classList.contains('llm-keep-alive-slider')) {
                    const seconds = parseInt(value);
                    if (seconds === 0) {
                        valueDisplay.textContent = 'Off';
                    } else if (seconds < 60) {
                        valueDisplay.textContent = `${seconds}s`;
                    } else {
                        valueDisplay.textContent = `${Math.floor(seconds / 60)}m`;
                    }
                } else {
                    valueDisplay.textContent = value;
                }
            }
        }
    };

    // Ollama settings
    const topKSlider = queryFirst(activeScope, ['.llm-top-k-slider', '.llm-topk-slider']);
    const topPSlider = queryFirst(activeScope, ['.llm-top-p-slider', '.llm-topp-slider']);
    const repeatPenaltySlider = queryFirst(activeScope, ['.llm-repeat-penalty-slider']);
    const repeatLastNSlider = queryFirst(activeScope, ['.llm-repeat-last-n-slider']);
    const numKeepSlider = queryFirst(activeScope, ['.llm-num-keep-slider']);
    const numPredictSlider = queryFirst(activeScope, ['.llm-num-predict-slider']);
    const presencePenaltySlider = queryFirst(activeScope, ['.llm-presence-penalty-slider']);
    const frequencyPenaltySlider = queryFirst(activeScope, ['.llm-frequency-penalty-slider']);

    updateSlider(topKSlider, getSettingValue(settings, 'topK', 'top_k'));
    updateSlider(topPSlider, getSettingValue(settings, 'topP', 'top_p'));
    updateSlider(repeatPenaltySlider, getSettingValue(settings, 'repeatPenalty', 'repeat_penalty'));
    updateSlider(repeatLastNSlider, getSettingValue(settings, 'repeatLastN', 'repeat_last_n'));
    updateSlider(numKeepSlider, getSettingValue(settings, 'numKeep', 'num_keep'));
    updateSlider(numPredictSlider, getSettingValue(settings, 'numPredict', 'num_predict'));
    updateSlider(presencePenaltySlider, getSettingValue(settings, 'presencePenalty', 'presence_penalty'));
    updateSlider(frequencyPenaltySlider, getSettingValue(settings, 'frequencyPenalty', 'frequency_penalty'));

    // LM Studio settings
    const lmsTopKSlider = queryFirst(activeScope, ['.llm-lms-top-k-slider', '.llm-lms-topk-slider']);
    const lmsTopPSlider = queryFirst(activeScope, ['.llm-lms-top-p-slider', '.llm-lms-topp-slider']);
    const lmsRepeatPenaltySlider = queryFirst(activeScope, ['.llm-lms-repeat-penalty-slider']);
    const lmsMinPSlider = queryFirst(activeScope, ['.llm-lms-min-p-slider', '.llm-lms-minp-slider']);

    updateSlider(lmsTopKSlider, getSettingValue(settings, 'lmsTopK', 'lms_top_k'));
    updateSlider(lmsTopPSlider, getSettingValue(settings, 'lmsTopP', 'lms_top_p'));
    updateSlider(lmsRepeatPenaltySlider, getSettingValue(settings, 'lmsRepeatPenalty', 'lms_repeat_penalty'));
    updateSlider(lmsMinPSlider, getSettingValue(settings, 'lmsMinP', 'lms_min_p'));

    // Context window settings
    const includeHistoryCheckbox = queryFirst(advancedOptions, ['.llm-include-history']);
    const maxHistoryInput = queryFirst(advancedOptions, ['.llm-max-history-input']);

    if (includeHistoryCheckbox) {
        includeHistoryCheckbox.checked = getSettingValue(settings, 'includeHistory') || false;
    }

    if (maxHistoryInput) {
        maxHistoryInput.value = getSettingValue(settings, 'maxHistoryMessages') || 10;
    }

    // Provider section "Enable … option payload" main toggles.
    // Dispatching 'change' triggers the existing updateProviderSectionUI listener
    // which re-applies the enabled/disabled visual state to all child controls.
    advancedOptions.querySelectorAll('.llm-provider-section-toggle').forEach((toggle) => {
        const provider = toggle.dataset.provider;
        if (!provider) return;
        const enabled = settings.providerOptions?.[provider]?.enabled;
        if (enabled !== undefined) {
            toggle.checked = enabled;
            toggle.dispatchEvent(new Event('change'));
        }
    });

    // Individual "Include in request" option toggles inside each provider section.
    advancedOptions.querySelectorAll('.llm-provider-option-toggle').forEach((toggle) => {
        const provider = toggle.dataset.provider;
        const optionKey = toggle.dataset.optionKey;
        if (!provider || !optionKey) return;
        const value = settings.providerOptions?.[provider]?.options?.[optionKey];
        if (value !== undefined) {
            toggle.checked = value;
            toggle.dispatchEvent(new Event('change'));
        }
    });
}

/**
 * Extract settings from UI elements
 * @param {HTMLElement} advancedOptions - Advanced options section
 * @returns {Object} - Settings object extracted from UI
 */
export function extractSettingsFromUI(advancedOptions) {
    const settings = {};
    const activeSection = getProviderSection(advancedOptions, null)
        || advancedOptions.querySelector('.llm-ollama-options:not([style*="display: none"])')
        || advancedOptions.querySelector('.llm-lmstudio-options:not([style*="display: none"])')
        || advancedOptions;

    // Common settings
    const temperatureSlider = queryFirst(activeSection, ['.llm-temperature-slider']);
    const seedInput = queryFirst(activeSection, ['.llm-seed-input']);
    const maxTokensInput = queryFirst(activeSection, ['.llm-max-tokens-input', '.llm-max-tokens-slider']);
    const keepAliveInput = queryFirst(activeSection, ['.llm-keep-alive-input', '.llm-keep-alive-slider']);
    const systemPrompt = queryFirst(advancedOptions, ['.llm-system-prompt-textarea', '.llm-system-prompt']);

    if (temperatureSlider) settings.temperature = parseFloat(temperatureSlider.value);
    if (seedInput) settings.seed = parseInt(seedInput.value);
    if (maxTokensInput) settings.maxTokens = parseInt(maxTokensInput.value);
    if (keepAliveInput) settings.keepAlive = parseInt(keepAliveInput.value);
    if (systemPrompt) settings.systemPrompt = systemPrompt.value;

    // Ollama settings
    const topKSlider = queryFirst(activeSection, ['.llm-top-k-slider', '.llm-topk-slider']);
    const topPSlider = queryFirst(activeSection, ['.llm-top-p-slider', '.llm-topp-slider']);
    const repeatPenaltySlider = queryFirst(activeSection, ['.llm-repeat-penalty-slider']);
    const repeatLastNSlider = queryFirst(activeSection, ['.llm-repeat-last-n-slider']);
    const numKeepSlider = queryFirst(activeSection, ['.llm-num-keep-slider']);
    const numPredictSlider = queryFirst(activeSection, ['.llm-num-predict-slider']);
    const presencePenaltySlider = queryFirst(activeSection, ['.llm-presence-penalty-slider']);
    const frequencyPenaltySlider = queryFirst(activeSection, ['.llm-frequency-penalty-slider']);

    if (topKSlider) settings.topK = parseInt(topKSlider.value);
    if (topPSlider) settings.topP = parseFloat(topPSlider.value);
    if (repeatPenaltySlider) settings.repeatPenalty = parseFloat(repeatPenaltySlider.value);
    if (repeatLastNSlider) settings.repeatLastN = parseInt(repeatLastNSlider.value);
    if (numKeepSlider) settings.numKeep = parseInt(numKeepSlider.value);
    if (numPredictSlider) settings.numPredict = parseInt(numPredictSlider.value);
    if (presencePenaltySlider) settings.presencePenalty = parseFloat(presencePenaltySlider.value);
    if (frequencyPenaltySlider) settings.frequencyPenalty = parseFloat(frequencyPenaltySlider.value);

    // LM Studio settings
    const lmsTopKSlider = queryFirst(activeSection, ['.llm-lms-top-k-slider', '.llm-lms-topk-slider']);
    const lmsTopPSlider = queryFirst(activeSection, ['.llm-lms-top-p-slider', '.llm-lms-topp-slider']);
    const lmsRepeatPenaltySlider = queryFirst(activeSection, ['.llm-lms-repeat-penalty-slider']);
    const lmsMinPSlider = queryFirst(activeSection, ['.llm-lms-min-p-slider', '.llm-lms-minp-slider']);

    if (lmsTopKSlider) settings.lmsTopK = parseInt(lmsTopKSlider.value);
    if (lmsTopPSlider) settings.lmsTopP = parseFloat(lmsTopPSlider.value);
    if (lmsRepeatPenaltySlider) settings.lmsRepeatPenalty = parseFloat(lmsRepeatPenaltySlider.value);
    if (lmsMinPSlider) settings.lmsMinP = parseFloat(lmsMinPSlider.value);

    // Context window settings
    const includeHistoryCheckbox = queryFirst(advancedOptions, ['.llm-include-history']);
    const maxHistoryInput = queryFirst(advancedOptions, ['.llm-max-history-input']);

    if (includeHistoryCheckbox) settings.includeHistory = includeHistoryCheckbox.checked;
    if (maxHistoryInput) settings.maxHistoryMessages = parseInt(maxHistoryInput.value);

    return settings;
}

/**
 * Validate settings object
 * @param {Object} settings - Settings to validate
 * @returns {Object} - Validation result { valid: boolean, errors: string[] }
 */
export function validateSettings(settings) {
    const errors = [];

    // Temperature validation
    if (settings.temperature < 0 || settings.temperature > 2) {
        errors.push('Temperature must be between 0 and 2');
    }

    // Max tokens validation
    if (settings.maxTokens < 1 || settings.maxTokens > 32768) {
        errors.push('Max tokens must be between 1 and 32768');
    }

    // Seed validation
    if (settings.seed < -1) {
        errors.push('Seed must be -1 or greater');
    }

    // Keep alive validation
    if (settings.keepAlive < 0 || settings.keepAlive > 3600) {
        errors.push('Keep alive must be between 0 and 3600 seconds');
    }

    // History messages validation
    if (settings.maxHistoryMessages < 1 || settings.maxHistoryMessages > 100) {
        errors.push('Max history messages must be between 1 and 100');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

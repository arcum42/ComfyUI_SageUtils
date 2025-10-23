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
 * Save settings to localStorage
 * @param {Object} settings - Settings object to save
 */
export function saveSettings(settings) {
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
export function loadSettings() {
    try {
        const saved = localStorage.getItem('llm_tab_settings');
        return saved ? JSON.parse(saved) : null;
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
export function updateUIFromSettings(settings, advancedOptions) {
    // Common settings
    const temperatureSlider = advancedOptions.querySelector('.llm-temperature-slider');
    const seedInput = advancedOptions.querySelector('.llm-seed-input');
    const maxTokensInput = advancedOptions.querySelector('.llm-max-tokens-input');
    const keepAliveSlider = advancedOptions.querySelector('.llm-keep-alive-slider');
    const systemPrompt = advancedOptions.querySelector('.llm-system-prompt');

    if (temperatureSlider) {
        temperatureSlider.value = settings.temperature;
        const valueDisplay = temperatureSlider.nextElementSibling;
        if (valueDisplay) valueDisplay.textContent = settings.temperature.toFixed(1);
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

    // Helper function to update slider and its display
    const updateSlider = (slider, value) => {
        if (slider) {
            slider.value = value;
            const valueDisplay = slider.nextElementSibling;
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
    const topKSlider = advancedOptions.querySelector('.llm-topk-slider');
    const topPSlider = advancedOptions.querySelector('.llm-topp-slider');
    const repeatPenaltySlider = advancedOptions.querySelector('.llm-repeat-penalty-slider');
    const repeatLastNSlider = advancedOptions.querySelector('.llm-repeat-last-n-slider');
    const numKeepSlider = advancedOptions.querySelector('.llm-num-keep-slider');
    const numPredictSlider = advancedOptions.querySelector('.llm-num-predict-slider');
    const presencePenaltySlider = advancedOptions.querySelector('.llm-presence-penalty-slider');
    const frequencyPenaltySlider = advancedOptions.querySelector('.llm-frequency-penalty-slider');

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
 * Extract settings from UI elements
 * @param {HTMLElement} advancedOptions - Advanced options section
 * @returns {Object} - Settings object extracted from UI
 */
export function extractSettingsFromUI(advancedOptions) {
    const settings = {};

    // Common settings
    const temperatureSlider = advancedOptions.querySelector('.llm-temperature-slider');
    const seedInput = advancedOptions.querySelector('.llm-seed-input');
    const maxTokensInput = advancedOptions.querySelector('.llm-max-tokens-input');
    const keepAliveSlider = advancedOptions.querySelector('.llm-keep-alive-slider');
    const systemPrompt = advancedOptions.querySelector('.llm-system-prompt');

    if (temperatureSlider) settings.temperature = parseFloat(temperatureSlider.value);
    if (seedInput) settings.seed = parseInt(seedInput.value);
    if (maxTokensInput) settings.maxTokens = parseInt(maxTokensInput.value);
    if (keepAliveSlider) settings.keepAlive = parseInt(keepAliveSlider.value);
    if (systemPrompt) settings.systemPrompt = systemPrompt.value;

    // Ollama settings
    const topKSlider = advancedOptions.querySelector('.llm-topk-slider');
    const topPSlider = advancedOptions.querySelector('.llm-topp-slider');
    const repeatPenaltySlider = advancedOptions.querySelector('.llm-repeat-penalty-slider');
    const repeatLastNSlider = advancedOptions.querySelector('.llm-repeat-last-n-slider');
    const numKeepSlider = advancedOptions.querySelector('.llm-num-keep-slider');
    const numPredictSlider = advancedOptions.querySelector('.llm-num-predict-slider');
    const presencePenaltySlider = advancedOptions.querySelector('.llm-presence-penalty-slider');
    const frequencyPenaltySlider = advancedOptions.querySelector('.llm-frequency-penalty-slider');

    if (topKSlider) settings.topK = parseInt(topKSlider.value);
    if (topPSlider) settings.topP = parseFloat(topPSlider.value);
    if (repeatPenaltySlider) settings.repeatPenalty = parseFloat(repeatPenaltySlider.value);
    if (repeatLastNSlider) settings.repeatLastN = parseInt(repeatLastNSlider.value);
    if (numKeepSlider) settings.numKeep = parseInt(numKeepSlider.value);
    if (numPredictSlider) settings.numPredict = parseInt(numPredictSlider.value);
    if (presencePenaltySlider) settings.presencePenalty = parseFloat(presencePenaltySlider.value);
    if (frequencyPenaltySlider) settings.frequencyPenalty = parseFloat(frequencyPenaltySlider.value);

    // LM Studio settings
    const lmsTopKSlider = advancedOptions.querySelector('.llm-lms-topk-slider');
    const lmsTopPSlider = advancedOptions.querySelector('.llm-lms-topp-slider');
    const lmsRepeatPenaltySlider = advancedOptions.querySelector('.llm-lms-repeat-penalty-slider');
    const lmsMinPSlider = advancedOptions.querySelector('.llm-lms-minp-slider');

    if (lmsTopKSlider) settings.lmsTopK = parseInt(lmsTopKSlider.value);
    if (lmsTopPSlider) settings.lmsTopP = parseFloat(lmsTopPSlider.value);
    if (lmsRepeatPenaltySlider) settings.lmsRepeatPenalty = parseFloat(lmsRepeatPenaltySlider.value);
    if (lmsMinPSlider) settings.lmsMinP = parseFloat(lmsMinPSlider.value);

    // Context window settings
    const includeHistoryCheckbox = advancedOptions.querySelector('.llm-include-history');
    const maxHistoryInput = advancedOptions.querySelector('.llm-max-history-input');

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

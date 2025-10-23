/**
 * LLM Provider-Specific Logic
 * Handles differences between Ollama and LM Studio
 */

/**
 * Build generation options for a specific provider
 * @param {string} provider - 'ollama' or 'lmstudio'
 * @param {Object} settings - Settings object
 * @returns {Object} - Provider-specific options object
 */
export function buildProviderOptions(provider, settings) {
    // Common options for both providers
    const options = {
        temperature: settings.temperature,
        seed: settings.seed,
        max_tokens: settings.maxTokens,
        keep_alive: settings.keepAlive
    };

    // Add provider-specific options
    if (provider === 'ollama') {
        options.num_keep = settings.numKeep;
        options.num_predict = settings.numPredict;
        options.top_k = settings.topK;
        options.top_p = settings.topP;
        options.repeat_last_n = settings.repeatLastN;
        options.repeat_penalty = settings.repeatPenalty;
        options.presence_penalty = settings.presencePenalty;
        options.frequency_penalty = settings.frequencyPenalty;
    } else if (provider === 'lmstudio') {
        options.topKSampling = settings.lmsTopK;
        options.topPSampling = settings.lmsTopP;
        options.repeatPenalty = settings.lmsRepeatPenalty;
        options.minPSampling = settings.lmsMinP;
    }

    return options;
}

/**
 * Get provider-specific default settings
 * @param {string} provider - 'ollama' or 'lmstudio'
 * @returns {Object} - Provider-specific defaults
 */
export function getProviderDefaults(provider) {
    const commonDefaults = {
        temperature: 0.7,
        seed: 42,
        maxTokens: 1024,
        keepAlive: 300
    };

    if (provider === 'ollama') {
        return {
            ...commonDefaults,
            numKeep: 0,
            numPredict: -1,
            topK: 40,
            topP: 0.9,
            repeatLastN: 64,
            repeatPenalty: 1.1,
            presencePenalty: 0.0,
            frequencyPenalty: 0.0
        };
    } else if (provider === 'lmstudio') {
        return {
            ...commonDefaults,
            lmsTopK: 40,
            lmsTopP: 0.95,
            lmsRepeatPenalty: 1.1,
            lmsMinP: 0.05
        };
    }

    return commonDefaults;
}

/**
 * Check if a model supports vision
 * @param {string} model - Model name
 * @param {string} provider - Provider name
 * @param {Object} visionModels - Vision models data { ollama: [...], lmstudio: [...] }
 * @returns {boolean} - True if model supports vision
 */
export function isVisionModel(model, provider, visionModels) {
    if (!model || !provider || !visionModels) {
        return false;
    }

    const providerVisionModels = visionModels[provider] || [];
    return providerVisionModels.includes(model);
}

/**
 * Get provider display name
 * @param {string} provider - Provider identifier
 * @returns {string} - Human-readable provider name
 */
export function getProviderDisplayName(provider) {
    const names = {
        'ollama': 'Ollama',
        'lmstudio': 'LM Studio'
    };
    return names[provider] || provider;
}

/**
 * Get provider status color
 * @param {Object} status - Status object from API
 * @param {string} provider - Provider name
 * @returns {string} - Status class name
 */
export function getProviderStatusClass(status, provider) {
    if (!status || !status[provider]) {
        return 'status-offline';
    }

    const providerStatus = status[provider];

    if (providerStatus.available && providerStatus.enabled) {
        return 'status-online';
    } else if (!providerStatus.enabled) {
        return 'status-disabled';
    } else {
        return 'status-offline';
    }
}

/**
 * Get provider status text
 * @param {Object} status - Status object from API
 * @param {string} provider - Provider name
 * @returns {string} - Status text
 */
export function getProviderStatusText(status, provider) {
    const displayName = getProviderDisplayName(provider);

    if (!status || !status[provider]) {
        return `${displayName} offline`;
    }

    const providerStatus = status[provider];

    if (providerStatus.available && providerStatus.enabled) {
        return `${displayName} online`;
    } else if (!providerStatus.enabled) {
        return `${displayName} disabled`;
    } else {
        return `${displayName} offline`;
    }
}

/**
 * Validate provider configuration
 * @param {string} provider - Provider name
 * @param {string} model - Model name
 * @param {Object} models - Available models data
 * @returns {Object} - Validation result { valid: boolean, error: string }
 */
export function validateProviderConfig(provider, model, models) {
    if (!provider) {
        return { valid: false, error: 'No provider selected' };
    }

    if (!['ollama', 'lmstudio'].includes(provider)) {
        return { valid: false, error: `Invalid provider: ${provider}` };
    }

    if (!model) {
        return { valid: false, error: 'No model selected' };
    }

    if (!models || !models[provider]) {
        return { valid: false, error: 'Models data not loaded' };
    }

    const providerModels = models[provider];
    if (!providerModels.includes(model)) {
        return { valid: false, error: `Model "${model}" not available for ${getProviderDisplayName(provider)}` };
    }

    return { valid: true };
}

/**
 * Get provider-specific parameter descriptions
 * @param {string} provider - Provider name
 * @returns {Object} - Parameter descriptions keyed by parameter name
 */
export function getProviderParameterDescriptions(provider) {
    const common = {
        temperature: 'Controls randomness in output. Lower = more focused, higher = more creative.',
        seed: 'Random seed for reproducible outputs. Use -1 for random.',
        maxTokens: 'Maximum number of tokens to generate.',
        keepAlive: 'How long to keep model loaded in memory (seconds).'
    };

    if (provider === 'ollama') {
        return {
            ...common,
            numKeep: 'Number of tokens to keep from initial prompt.',
            numPredict: 'Maximum tokens to predict. -1 for infinite.',
            topK: 'Limits next token selection to top K tokens.',
            topP: 'Nucleus sampling: cumulative probability threshold.',
            repeatLastN: 'How far back to look for repetitions.',
            repeatPenalty: 'Penalty for repeating tokens.',
            presencePenalty: 'Penalty for tokens that have appeared.',
            frequencyPenalty: 'Penalty based on token frequency.'
        };
    } else if (provider === 'lmstudio') {
        return {
            ...common,
            lmsTopK: 'Limits next token selection to top K tokens.',
            lmsTopP: 'Nucleus sampling: cumulative probability threshold.',
            lmsRepeatPenalty: 'Penalty for repeating tokens.',
            lmsMinP: 'Minimum probability threshold for token selection.'
        };
    }

    return common;
}

/**
 * Get provider-specific setting keys
 * @param {string} provider - Provider name
 * @returns {string[]} - Array of setting keys specific to this provider
 */
export function getProviderSettingKeys(provider) {
    const common = ['temperature', 'seed', 'maxTokens', 'keepAlive', 'systemPrompt', 'promptTemplate', 'includeHistory', 'maxHistoryMessages'];

    if (provider === 'ollama') {
        return [...common, 'numKeep', 'numPredict', 'topK', 'topP', 'repeatLastN', 'repeatPenalty', 'presencePenalty', 'frequencyPenalty'];
    } else if (provider === 'lmstudio') {
        return [...common, 'lmsTopK', 'lmsTopP', 'lmsRepeatPenalty', 'lmsMinP'];
    }

    return common;
}

/**
 * Format model name for display
 * @param {string} model - Model name
 * @param {boolean} isVision - Whether model supports vision
 * @returns {string} - Formatted model name with icon
 */
export function formatModelName(model, isVision) {
    const icon = isVision ? '👁️ ' : '';
    return `${icon}${model}`;
}

/**
 * Parse provider from endpoint URL (for debugging/logging)
 * @param {string} url - API endpoint URL
 * @returns {string|null} - Provider name or null
 */
export function parseProviderFromUrl(url) {
    if (url.includes('ollama')) return 'ollama';
    if (url.includes('lmstudio') || url.includes('localhost:1234')) return 'lmstudio';
    return null;
}

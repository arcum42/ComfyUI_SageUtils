/**
 * LLM Provider-Specific Logic
 * Handles differences between Ollama, LM Studio, and Native providers
 */

/**
 * Build generation options for a specific provider
 * @param {string} provider - 'ollama', 'lmstudio', or 'native'
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
    } else if (provider === 'lmstudio' || provider === 'lmstudio_rest') {
        options.topKSampling = settings.lmsTopK;
        options.topPSampling = settings.lmsTopP;
        options.repeatPenalty = settings.lmsRepeatPenalty;
        options.minPSampling = settings.lmsMinP;
    } else if (provider === 'ollama_rest') {
        options.num_keep = settings.numKeep;
        options.num_predict = settings.numPredict;
        options.top_k = settings.topK;
        options.top_p = settings.topP;
        options.repeat_last_n = settings.repeatLastN;
        options.repeat_penalty = settings.repeatPenalty;
        options.presence_penalty = settings.presencePenalty;
        options.frequency_penalty = settings.frequencyPenalty;
    } else if (provider === 'openai') {
        // OpenAI uses standard options; backend maps them
    } else if (provider === 'native') {
        options.do_sample = true;
        options.max_length = settings.maxTokens;
        options.top_k = settings.topK;
        options.top_p = settings.topP;
        options.min_p = settings.lmsMinP;
        options.repetition_penalty = settings.repeatPenalty;
        options.presence_penalty = settings.presencePenalty;
    }

    return options;
}

/**
 * Get provider-specific default settings
 * @param {string} provider - 'ollama', 'lmstudio', or 'native'
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
    } else if (provider === 'lmstudio' || provider === 'lmstudio_rest') {
        return {
            ...commonDefaults,
            lmsTopK: 40,
            lmsTopP: 0.95,
            lmsRepeatPenalty: 1.1,
            lmsMinP: 0.05
        };
    } else if (provider === 'ollama_rest') {
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
    } else if (provider === 'openai') {
        return { ...commonDefaults };
    } else if (provider === 'native') {
        return {
            ...commonDefaults,
            topK: 64,
            topP: 0.95,
            lmsMinP: 0.05,
            repeatPenalty: 1.05,
            presencePenalty: 0.0
        };
    }

    return commonDefaults;
}

/**
 * Get provider display name
 * @param {string} provider - Provider identifier
 * @returns {string} - Human-readable provider name
 */
export function getProviderDisplayName(provider) {
    const names = {
        'ollama': 'Ollama',
        'lmstudio': 'LM Studio',
        'lmstudio_rest': 'LM Studio (REST)',
        'native': 'Native (CLIP)',
        'ollama_rest': 'Ollama (REST)',
        'openai': 'OpenAI'
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

    if (!['ollama', 'lmstudio', 'lmstudio_rest', 'ollama_rest', 'openai', 'native'].includes(provider)) {
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
    } else if (provider === 'lmstudio' || provider === 'lmstudio_rest') {
        return {
            ...common,
            lmsTopK: 'Limits next token selection to top K tokens.',
            lmsTopP: 'Nucleus sampling: cumulative probability threshold.',
            lmsRepeatPenalty: 'Penalty for repeating tokens.',
            lmsMinP: 'Minimum probability threshold for token selection.'
        };
    } else if (provider === 'ollama_rest') {
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
    } else if (provider === 'openai') {
        return { ...common };
    } else if (provider === 'native') {
        return {
            ...common,
            topK: 'Limits next token selection to top K tokens.',
            topP: 'Nucleus sampling: cumulative probability threshold.',
            lmsMinP: 'Minimum probability floor for candidate tokens.',
            repeatPenalty: 'Penalty for repeating tokens.',
            presencePenalty: 'Encourages introducing new tokens/topics.'
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
    } else if (provider === 'lmstudio' || provider === 'lmstudio_rest') {
        return [...common, 'lmsTopK', 'lmsTopP', 'lmsRepeatPenalty', 'lmsMinP'];
    } else if (provider === 'ollama_rest') {
        return [...common, 'numKeep', 'numPredict', 'topK', 'topP', 'repeatLastN', 'repeatPenalty', 'presencePenalty', 'frequencyPenalty'];
    } else if (provider === 'openai') {
        return [...common];
    } else if (provider === 'native') {
        return [...common, 'topK', 'topP', 'lmsMinP', 'repeatPenalty', 'presencePenalty'];
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
 * Resolve capability flags for a model from route-provided capability maps and fallbacks.
 * @param {string} provider - Provider key
 * @param {string} model - Model name
 * @param {Object} capabilitiesByProvider - Capability map payload from routes
 * @param {Object} visionModelsByProvider - Vision model lists by provider
 * @param {Object} toolModelsByProvider - Tool-capable model lists by provider
 * @param {Object} reasoningModelsByProvider - Reasoning model lists by provider
 * @returns {{vision: boolean, toolUse: boolean, reasoning: boolean}}
 */
export function getModelCapabilityFlags(
    provider,
    model,
    capabilitiesByProvider,
    visionModelsByProvider,
    toolModelsByProvider,
    reasoningModelsByProvider
) {
    const providerCapabilities = capabilitiesByProvider?.[provider] || {};
    const modelCapabilities = providerCapabilities?.[model] || null;

    const visionList = visionModelsByProvider?.[provider] || [];
    const toolList = toolModelsByProvider?.[provider] || [];
    const reasoningList = reasoningModelsByProvider?.[provider] || [];

    const vision = Boolean(modelCapabilities?.vision) || visionList.includes(model);
    const toolUse = Boolean(modelCapabilities?.tool_use) || toolList.includes(model);
    const reasoning = Boolean(modelCapabilities?.reasoning) || reasoningList.includes(model);

    return { vision, toolUse, reasoning };
}

/**
 * Format model label with capability icons.
 * @param {string} model - Model name
 * @param {{vision: boolean, toolUse: boolean, reasoning: boolean}} flags - Capability flags
 * @returns {string} - Formatted display label
 */
export function formatModelNameWithCapabilities(model, flags) {
    const icons = [];
    if (flags?.vision) {
        icons.push('👁️');
    }
    if (flags?.toolUse) {
        icons.push('🛠️');
    }
    if (flags?.reasoning) {
        icons.push('🧠');
    }

    if (icons.length === 0) {
        return model;
    }

    return `${icons.join(' ')} ${model}`;
}

/**
 * Parse provider from endpoint URL (for debugging/logging)
 * @param {string} url - API endpoint URL
 * @returns {string|null} - Provider name or null
 */
export function parseProviderFromUrl(url) {
    if (url.includes('ollama')) return 'ollama';
    if (url.includes('lmstudio') || url.includes('localhost:1234')) return 'lmstudio';
    if (url.includes('native')) return 'native';
    return null;
}

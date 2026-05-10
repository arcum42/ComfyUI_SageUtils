/**
 * LLM Advanced Options Component
 * Contains system prompts, templates, and provider-specific settings
 */

import { createSlider, createSelect, createInput, createTextarea, createFormRow } from '../../../components/formElements.js';
import { createSection } from '../../../components/layout.js';

/**
 * Creates the advanced options section
 * @returns {HTMLElement} - Advanced options section
 */
export function createAdvancedOptions() {
    const container = document.createElement('div');
    container.className = 'llm-advanced-options';

    const overview = document.createElement('div');
    overview.className = 'llm-settings-overview';
    overview.innerHTML = `
        <h3 class="llm-settings-overview-title">Settings Workspace</h3>
        <p class="llm-settings-overview-description">Low-frequency controls live here so Compose and Chat stay focused on generation.</p>
    `;
    container.appendChild(overview);

    const contextGroup = createSettingsGroup(
        'Context',
        'System instructions and conversation history controls.'
    );
    contextGroup.content.appendChild(createSystemPromptSection());
    contextGroup.content.appendChild(createHistoryContextControls());
    container.appendChild(contextGroup.element);

    const generationGroup = createSettingsGroup(
        'Generation And Provider',
        'Provider-tuned generation parameters are kept in their own collapsible sections.'
    );
    generationGroup.content.appendChild(createOllamaOptions());
    generationGroup.content.appendChild(createLMStudioOptions());
    const noProviderOptions = document.createElement('p');
    noProviderOptions.className = 'llm-no-provider-options';
    noProviderOptions.textContent = 'No provider-specific parameters for the currently selected provider.';
    generationGroup.content.appendChild(noProviderOptions);
    container.appendChild(generationGroup.element);

    const diagnosticsGroup = createSettingsGroup(
        'Diagnostics',
        'Debug toggles, raw payload inspection, and deeper runtime controls.'
    );
    const resetBtn = document.createElement('button');
    resetBtn.className = 'llm-btn llm-btn-secondary llm-btn-small llm-reset-settings-btn';
    resetBtn.innerHTML = '↺ Reset to Defaults';
    resetBtn.title = 'Reset all settings to default values';
    diagnosticsGroup.content.appendChild(resetBtn);
    container.appendChild(diagnosticsGroup.element);
    
    return container;
}

function createSettingsGroup(title, description) {
    const element = document.createElement('section');
    element.className = 'llm-settings-group';

    const header = document.createElement('div');
    header.className = 'llm-settings-group-header';

    const heading = document.createElement('h4');
    heading.className = 'llm-settings-group-title';
    heading.textContent = title;

    const body = document.createElement('p');
    body.className = 'llm-settings-group-description';
    body.textContent = description;

    header.appendChild(heading);
    header.appendChild(body);

    const content = document.createElement('div');
    content.className = 'llm-settings-group-content';

    element.appendChild(header);
    element.appendChild(content);

    return { element, content };
}

/**
 * Creates the system prompt section
 */
function createSystemPromptSection() {
    const textarea = createTextarea({
        placeholder: 'Enter system prompt...',
        className: 'llm-system-prompt-textarea',
        rows: 4
    });
    
    const content = document.createElement('div');
    content.className = 'llm-system-prompt-content';
    content.appendChild(textarea);
    
    return createSection('📝 System Prompt', content, {
        collapsible: true,
        collapsed: true,
        className: 'llm-system-prompt-section'
    });
}

/**
 * Creates the template selector section
 */
export function createTemplateSection() {
    const content = document.createElement('div');
    content.className = 'llm-template-content';
    
    // Category selector
    const categorySelect = createSelect({
        items: [{value: '', text: 'Select category...'}],
        className: 'llm-category-select'
    });
    const categoryRow = createFormRow('Category', categorySelect);
    content.appendChild(categoryRow);
    
    // Template selector
    const templateSelect = createSelect({
        items: [{value: '', text: 'Select template...'}],
        className: 'llm-template-select',
        disabled: true
    });
    const templateRow = createFormRow('Template', templateSelect);
    content.appendChild(templateRow);
    
    // Prompt Modifiers section
    const modifiersTitle = document.createElement('h4');
    modifiersTitle.textContent = 'Prompt Modifiers';
    modifiersTitle.className = 'llm-subsection-title';
    modifiersTitle.style.marginTop = '16px';
    modifiersTitle.style.marginBottom = '8px';
    content.appendChild(modifiersTitle);
    
    // Extras grid - will be populated when prompts are loaded
    const extrasGrid = document.createElement('div');
    extrasGrid.className = 'llm-extras-grid';
    content.appendChild(extrasGrid);
    
    return createSection('📋 Prompt Templates', content, {
        collapsible: true,
        collapsed: true,
        className: 'llm-template-section'
    });
}

/**
 * Creates conversation history context controls
 */
function createHistoryContextControls() {
    const content = document.createElement('div');
    content.className = 'llm-history-context-content';

    // Include history checkbox
    const includeRow = document.createElement('div');
    includeRow.className = 'llm-form-row llm-checkbox-row';

    const includeLabel = document.createElement('label');
    includeLabel.className = 'llm-label';
    includeLabel.textContent = 'Include conversation history in requests';

    const includeCheckbox = document.createElement('input');
    includeCheckbox.type = 'checkbox';
    includeCheckbox.className = 'llm-include-history';
    includeCheckbox.id = 'llm-include-history';
    includeCheckbox.title = 'When checked, recent messages from the current conversation are prepended to each request';

    includeLabel.prepend(includeCheckbox);
    includeRow.appendChild(includeLabel);
    content.appendChild(includeRow);

    // Max history messages
    const maxHistoryInput = createInput({
        type: 'number',
        value: '10',
        min: '1',
        max: '50',
        className: 'llm-max-history-input'
    });
    maxHistoryInput.title = 'How many past messages to include (most recent N messages)';
    const maxHistoryRow = createFormRow('Max history messages', maxHistoryInput, {
        helpText: 'Most recent N messages included per request'
    });
    content.appendChild(maxHistoryRow);

    return createSection('🗂 History Context', content, {
        collapsible: true,
        collapsed: true,
        className: 'llm-history-context-section'
    });
}

function setProviderOptionControlEnabled(container, enabled) {
    const controls = container.querySelectorAll('input, select, textarea, button');
    controls.forEach((control) => {
        if (control.classList.contains('llm-provider-option-toggle') || control.classList.contains('llm-provider-section-toggle')) {
            return;
        }
        control.disabled = !enabled;
    });
    container.classList.toggle('disabled', !enabled);
}

function updateProviderSectionUI(content, providerKey, sectionEnabled) {
    const optionContainers = content.querySelectorAll(`.llm-provider-option-control[data-provider="${providerKey}"]`);
    optionContainers.forEach((optionContainer) => {
        const optionToggle = optionContainer.querySelector('.llm-provider-option-toggle');
        if (optionToggle) {
            optionToggle.disabled = !sectionEnabled;
            setProviderOptionControlEnabled(optionContainer, sectionEnabled && optionToggle.checked);
        }
    });
}

function createProviderSectionToggle(content, providerKey, labelText) {
    const row = document.createElement('div');
    row.className = 'llm-provider-section-toggle-row';

    const label = document.createElement('label');
    label.className = 'llm-label llm-provider-section-toggle-label';
    label.textContent = labelText;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'llm-provider-section-toggle';
    checkbox.dataset.provider = providerKey;
    checkbox.checked = true;

    label.prepend(checkbox);
    row.appendChild(label);

    checkbox.addEventListener('change', () => {
        updateProviderSectionUI(content, providerKey, checkbox.checked);
    });

    return row;
}

function wrapProviderOptionControl(providerKey, optionKey, control, includeLabel = 'Include in request') {
    const container = document.createElement('div');
    container.className = 'llm-provider-option-control';
    container.dataset.provider = providerKey;
    container.dataset.optionKey = optionKey;

    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'llm-label llm-provider-option-toggle-label';
    toggleLabel.textContent = includeLabel;

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.className = 'llm-provider-option-toggle';
    toggle.dataset.provider = providerKey;
    toggle.dataset.optionKey = optionKey;
    toggle.checked = true;

    toggleLabel.prepend(toggle);
    container.appendChild(toggleLabel);
    container.appendChild(control);

    toggle.addEventListener('change', () => {
        const sectionToggle = container.closest(`[class$="${providerKey}-options-content"]`)?.querySelector(`.llm-provider-section-toggle[data-provider="${providerKey}"]`);
        const sectionEnabled = sectionToggle ? sectionToggle.checked : true;
        setProviderOptionControlEnabled(container, sectionEnabled && toggle.checked);
    });

    setProviderOptionControlEnabled(container, true);
    return container;
}

/**
 * Creates Ollama-specific options
 */
function createOllamaOptions() {
    const content = document.createElement('div');
    content.className = 'llm-ollama-options-content';
    content.appendChild(createProviderSectionToggle(content, 'ollama', 'Enable Ollama option payload'));
    
    // Temperature
    const { container: tempSlider } = createSlider('Temperature', {
        min: 0,
        max: 2,
        step: 0.1,
        value: 0.8,
        className: 'llm-slider-container',
        sliderClass: 'llm-slider llm-temperature-slider',
        valueClass: 'llm-slider-value',
        formatValue: (v) => parseFloat(v).toFixed(1),
        showValue: true
    });
    content.appendChild(wrapProviderOptionControl('ollama', 'temperature', tempSlider));
    
    // Top P
    const { container: topPSlider } = createSlider('Top P', {
        min: 0,
        max: 1,
        step: 0.05,
        value: 0.9,
        className: 'llm-slider-container',
        sliderClass: 'llm-slider llm-top-p-slider',
        valueClass: 'llm-slider-value',
        formatValue: (v) => parseFloat(v).toFixed(2),
        showValue: true
    });
    content.appendChild(wrapProviderOptionControl('ollama', 'top_p', topPSlider));
    
    // Top K
    const { container: topKSlider } = createSlider('Top K', {
        min: 1,
        max: 100,
        step: 1,
        value: 40,
        className: 'llm-slider-container',
        sliderClass: 'llm-slider llm-top-k-slider',
        valueClass: 'llm-slider-value',
        showValue: true
    });
    content.appendChild(wrapProviderOptionControl('ollama', 'top_k', topKSlider));
    
    // Repeat Penalty
    const { container: repeatPenaltySlider } = createSlider('Repeat Penalty', {
        min: 0,
        max: 2,
        step: 0.1,
        value: 1.1,
        className: 'llm-slider-container',
        sliderClass: 'llm-slider llm-repeat-penalty-slider',
        valueClass: 'llm-slider-value',
        formatValue: (v) => parseFloat(v).toFixed(1),
        showValue: true
    });
    content.appendChild(wrapProviderOptionControl('ollama', 'repeat_penalty', repeatPenaltySlider));
    
    // Presence Penalty
    const { container: presencePenaltySlider } = createSlider('Presence Penalty', {
        min: -2,
        max: 2,
        step: 0.1,
        value: 0,
        className: 'llm-slider-container',
        sliderClass: 'llm-slider llm-presence-penalty-slider',
        valueClass: 'llm-slider-value',
        formatValue: (v) => parseFloat(v).toFixed(1),
        showValue: true
    });
    content.appendChild(wrapProviderOptionControl('ollama', 'presence_penalty', presencePenaltySlider));
    
    // Frequency Penalty
    const { container: frequencyPenaltySlider } = createSlider('Frequency Penalty', {
        min: -2,
        max: 2,
        step: 0.1,
        value: 0,
        className: 'llm-slider-container',
        sliderClass: 'llm-slider llm-frequency-penalty-slider',
        valueClass: 'llm-slider-value',
        formatValue: (v) => parseFloat(v).toFixed(1),
        showValue: true
    });
    content.appendChild(wrapProviderOptionControl('ollama', 'frequency_penalty', frequencyPenaltySlider));
    
    // Max Tokens
    const { container: maxTokensSlider } = createSlider('Max Tokens', {
        min: 1,
        max: 32768,
        step: 1,
        value: 2048,
        className: 'llm-slider-container',
        sliderClass: 'llm-slider llm-max-tokens-slider',
        valueClass: 'llm-slider-value',
        showValue: true
    });
    content.appendChild(wrapProviderOptionControl('ollama', 'max_tokens', maxTokensSlider));
    
    // Context Window
    const { container: contextWindowSlider } = createSlider('Context Window', {
        min: 512,
        max: 32768,
        step: 512,
        value: 2048,
        className: 'llm-slider-container',
        sliderClass: 'llm-slider llm-context-window-slider',
        valueClass: 'llm-slider-value',
        showValue: true
    });
    content.appendChild(wrapProviderOptionControl('ollama', 'num_ctx', contextWindowSlider));
    
    // Keep Alive and Seed on same row
    const bottomRow = document.createElement('div');
    bottomRow.className = 'llm-bottom-inputs-row';
    bottomRow.style.display = 'grid';
    bottomRow.style.gridTemplateColumns = '1fr 1fr';
    bottomRow.style.gap = '12px';
    bottomRow.style.marginTop = '8px';
    
    const keepAliveInput = createInput({
        type: 'text',
        placeholder: '5m',
        value: '5m',
        className: 'llm-keep-alive-input'
    });
    const keepAliveRow = createFormRow('Keep Alive', keepAliveInput, {
        helpText: 'e.g., 5m, 1h, -1'
    });
    keepAliveRow.style.marginBottom = '0';
    
    const seedInput = createInput({
        type: 'number',
        placeholder: 'Random',
        className: 'llm-seed-input'
    });
    const seedRow = createFormRow('Seed', seedInput);
    seedRow.style.marginBottom = '0';
    
    bottomRow.appendChild(wrapProviderOptionControl('ollama', 'keep_alive', keepAliveRow));
    bottomRow.appendChild(wrapProviderOptionControl('ollama', 'seed', seedRow));
    content.appendChild(bottomRow);
    
    return createSection('⚙️ Ollama Options', content, {
        collapsible: true,
        collapsed: true,
        className: 'llm-ollama-options'
    });
}

/**
 * Creates LM Studio-specific options
 */
function createLMStudioOptions() {
    const content = document.createElement('div');
    content.className = 'llm-lmstudio-options-content';
    content.appendChild(createProviderSectionToggle(content, 'lmstudio', 'Enable LM Studio option payload'));
    
    // Temperature
    const { container: tempSlider } = createSlider('Temperature', {
        min: 0,
        max: 2,
        step: 0.1,
        value: 0.8,
        className: 'llm-slider-container',
        sliderClass: 'llm-slider llm-temperature-slider',
        valueClass: 'llm-slider-value',
        formatValue: (v) => parseFloat(v).toFixed(1),
        showValue: true
    });
    content.appendChild(wrapProviderOptionControl('lmstudio', 'temperature', tempSlider));
    
    // Top P
    const { container: topPSlider } = createSlider('Top P', {
        min: 0,
        max: 1,
        step: 0.05,
        value: 0.9,
        className: 'llm-slider-container',
        sliderClass: 'llm-slider llm-top-p-slider',
        valueClass: 'llm-slider-value',
        formatValue: (v) => parseFloat(v).toFixed(2),
        showValue: true
    });
    content.appendChild(wrapProviderOptionControl('lmstudio', 'top_p', topPSlider));
    
    // Max Tokens
    const { container: maxTokensSlider } = createSlider('Max Tokens', {
        min: 1,
        max: 32768,
        step: 1,
        value: 2048,
        className: 'llm-slider-container',
        sliderClass: 'llm-slider llm-max-tokens-slider',
        valueClass: 'llm-slider-value',
        showValue: true
    });
    content.appendChild(wrapProviderOptionControl('lmstudio', 'max_tokens', maxTokensSlider));
    
    // Presence Penalty
    const { container: presencePenaltySlider } = createSlider('Presence Penalty', {
        min: -2,
        max: 2,
        step: 0.1,
        value: 0,
        className: 'llm-slider-container',
        sliderClass: 'llm-slider llm-presence-penalty-slider',
        valueClass: 'llm-slider-value',
        formatValue: (v) => parseFloat(v).toFixed(1),
        showValue: true
    });
    content.appendChild(wrapProviderOptionControl('lmstudio', 'presence_penalty', presencePenaltySlider));
    
    // Frequency Penalty
    const { container: frequencyPenaltySlider } = createSlider('Frequency Penalty', {
        min: -2,
        max: 2,
        step: 0.1,
        value: 0,
        className: 'llm-slider-container',
        sliderClass: 'llm-slider llm-frequency-penalty-slider',
        valueClass: 'llm-slider-value',
        formatValue: (v) => parseFloat(v).toFixed(1),
        showValue: true
    });
    content.appendChild(wrapProviderOptionControl('lmstudio', 'frequency_penalty', frequencyPenaltySlider));
    
    // Repeat Penalty
    const { container: repeatPenaltySlider } = createSlider('Repeat Penalty', {
        min: 0,
        max: 2,
        step: 0.1,
        value: 1.0,
        className: 'llm-slider-container',
        sliderClass: 'llm-slider llm-repeat-penalty-slider',
        valueClass: 'llm-slider-value',
        formatValue: (v) => parseFloat(v).toFixed(1),
        showValue: true
    });
    content.appendChild(wrapProviderOptionControl('lmstudio', 'repeat_penalty', repeatPenaltySlider));
    
    // Top K
    const { container: topKSlider } = createSlider('Top K', {
        min: 1,
        max: 100,
        step: 1,
        value: 40,
        className: 'llm-slider-container',
        sliderClass: 'llm-slider llm-top-k-slider',
        valueClass: 'llm-slider-value',
        showValue: true
    });
    content.appendChild(wrapProviderOptionControl('lmstudio', 'top_k', topKSlider));
    
    // Seed (at bottom with some spacing)
    const seedInput = createInput({
        type: 'number',
        placeholder: 'Random',
        className: 'llm-seed-input'
    });
    const seedRow = createFormRow('Seed', seedInput);
    seedRow.style.marginTop = '8px';
    content.appendChild(wrapProviderOptionControl('lmstudio', 'seed', seedRow));
    
    return createSection('⚙️ LM Studio Options', content, {
        collapsible: true,
        collapsed: true,
        className: 'llm-lmstudio-options'
    });
}

/**
 * Get settings from UI
 * @param {HTMLElement} advancedOptions - Advanced options container
 * @returns {Object} - Settings object
 */
export function getSettingsFromUI(advancedOptions) {
    const settings = {};
    
    // System prompt
    const systemPromptTextarea = advancedOptions.querySelector('.llm-system-prompt-textarea');
    if (systemPromptTextarea) {
        settings.systemPrompt = systemPromptTextarea.value;
    }

    // History context
    const includeHistoryCheckbox = advancedOptions.querySelector('.llm-include-history');
    if (includeHistoryCheckbox) {
        settings.includeHistory = includeHistoryCheckbox.checked;
    }
    const maxHistoryInput = advancedOptions.querySelector('.llm-max-history-input');
    if (maxHistoryInput) {
        settings.maxHistoryMessages = parseInt(maxHistoryInput.value) || 10;
    }
    
    // Common settings
    const seedInput = advancedOptions.querySelector('.llm-seed-input');
    if (seedInput && seedInput.value) {
        settings.seed = parseInt(seedInput.value);
    }
    
    // Get all slider values
    const sliders = {
        temperature: '.llm-temperature-slider',
        topP: '.llm-top-p-slider',
        topK: '.llm-top-k-slider',
        repeatPenalty: '.llm-repeat-penalty-slider',
        presencePenalty: '.llm-presence-penalty-slider',
        frequencyPenalty: '.llm-frequency-penalty-slider',
        maxTokens: '.llm-max-tokens-slider',
        numCtx: '.llm-context-window-slider'
    };
    
    Object.entries(sliders).forEach(([key, selector]) => {
        const slider = advancedOptions.querySelector(selector);
        if (slider) {
            settings[key] = parseFloat(slider.value) || parseInt(slider.value);
        }
    });
    
    // Keep alive
    const keepAliveInput = advancedOptions.querySelector('.llm-keep-alive-input');
    if (keepAliveInput) {
        settings.keepAlive = keepAliveInput.value;
    }

    const providerOptions = {};
    advancedOptions.querySelectorAll('.llm-provider-section-toggle').forEach((toggle) => {
        const provider = toggle.dataset.provider;
        if (!provider) return;
        providerOptions[provider] = providerOptions[provider] || { enabled: true, options: {} };
        providerOptions[provider].enabled = toggle.checked;
    });

    advancedOptions.querySelectorAll('.llm-provider-option-toggle').forEach((toggle) => {
        const provider = toggle.dataset.provider;
        const optionKey = toggle.dataset.optionKey;
        if (!provider || !optionKey) return;
        providerOptions[provider] = providerOptions[provider] || { enabled: true, options: {} };
        providerOptions[provider].options[optionKey] = toggle.checked;
    });

    settings.providerOptions = providerOptions;
    
    return settings;
}

/**
 * Update UI with settings
 * @param {Object} settings - Settings to apply
 * @param {HTMLElement} advancedOptions - Advanced options container
 */
export function updateUIWithSettings(settings, advancedOptions) {
    if (!settings || !advancedOptions) return;
    
    // System prompt
    if (settings.systemPrompt !== undefined) {
        const textarea = advancedOptions.querySelector('.llm-system-prompt-textarea');
        if (textarea) {
            textarea.value = settings.systemPrompt;
        }
    }

    // History context
    if (settings.includeHistory !== undefined) {
        const checkbox = advancedOptions.querySelector('.llm-include-history');
        if (checkbox) checkbox.checked = settings.includeHistory;
    }
    if (settings.maxHistoryMessages !== undefined) {
        const maxInput = advancedOptions.querySelector('.llm-max-history-input');
        if (maxInput) maxInput.value = settings.maxHistoryMessages;
    }
    
    // Seed
    if (settings.seed !== undefined) {
        const seedInput = advancedOptions.querySelector('.llm-seed-input');
        if (seedInput) {
            seedInput.value = settings.seed;
        }
    }
    
    // Update all sliders
    const sliderMappings = {
        temperature: '.llm-temperature-slider',
        topP: '.llm-top-p-slider',
        topK: '.llm-top-k-slider',
        repeatPenalty: '.llm-repeat-penalty-slider',
        presencePenalty: '.llm-presence-penalty-slider',
        frequencyPenalty: '.llm-frequency-penalty-slider',
        maxTokens: '.llm-max-tokens-slider',
        numCtx: '.llm-context-window-slider'
    };
    
    Object.entries(sliderMappings).forEach(([key, selector]) => {
        if (settings[key] !== undefined) {
            const slider = advancedOptions.querySelector(selector);
            if (slider) {
                slider.value = settings[key];
                // Trigger input event to update value display
                slider.dispatchEvent(new Event('input'));
            }
        }
    });
    
    // Keep alive
    if (settings.keepAlive !== undefined) {
        const keepAliveInput = advancedOptions.querySelector('.llm-keep-alive-input');
        if (keepAliveInput) {
            keepAliveInput.value = settings.keepAlive;
        }
    }

    const providerOptions = settings.providerOptions || {};
    advancedOptions.querySelectorAll('.llm-provider-section-toggle').forEach((toggle) => {
        const provider = toggle.dataset.provider;
        if (!provider) return;
        const providerState = providerOptions[provider];
        if (providerState && providerState.enabled !== undefined) {
            toggle.checked = providerState.enabled;
            toggle.dispatchEvent(new Event('change'));
        }
    });

    advancedOptions.querySelectorAll('.llm-provider-option-toggle').forEach((toggle) => {
        const provider = toggle.dataset.provider;
        const optionKey = toggle.dataset.optionKey;
        if (!provider || !optionKey) return;
        const optionState = providerOptions?.[provider]?.options?.[optionKey];
        if (optionState !== undefined) {
            toggle.checked = optionState;
            toggle.dispatchEvent(new Event('change'));
        }
    });
}

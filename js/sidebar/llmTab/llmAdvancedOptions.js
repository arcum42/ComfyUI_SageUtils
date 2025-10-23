/**
 * LLM Advanced Options Component
 * Contains system prompts, templates, and provider-specific settings
 */

import { createSlider, createSelect, createInput, createTextarea, createFormRow } from '../../components/formElements.js';
import { createSection } from '../../components/layout.js';

/**
 * Creates the advanced options section
 * @returns {HTMLElement} - Advanced options section
 */
export function createAdvancedOptions() {
    const container = document.createElement('div');
    container.className = 'llm-advanced-options';
    
    // System prompt section
    const systemPromptSection = createSystemPromptSection();
    container.appendChild(systemPromptSection);
    
    // Template selector section
    const templateSection = createTemplateSection();
    container.appendChild(templateSection);
    
    // Ollama options (hidden by default)
    const ollamaSection = createOllamaOptions();
    container.appendChild(ollamaSection);
    
    // LM Studio options (hidden by default)
    const lmstudioSection = createLMStudioOptions();
    container.appendChild(lmstudioSection);
    
    return container;
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
function createTemplateSection() {
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
 * Creates Ollama-specific options
 */
function createOllamaOptions() {
    const content = document.createElement('div');
    content.className = 'llm-ollama-options-content';
    
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
    content.appendChild(tempSlider);
    
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
    content.appendChild(topPSlider);
    
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
    content.appendChild(topKSlider);
    
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
    content.appendChild(repeatPenaltySlider);
    
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
    content.appendChild(presencePenaltySlider);
    
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
    content.appendChild(frequencyPenaltySlider);
    
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
    content.appendChild(maxTokensSlider);
    
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
    content.appendChild(contextWindowSlider);
    
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
    
    bottomRow.appendChild(keepAliveRow);
    bottomRow.appendChild(seedRow);
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
    content.appendChild(tempSlider);
    
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
    content.appendChild(topPSlider);
    
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
    content.appendChild(maxTokensSlider);
    
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
    content.appendChild(presencePenaltySlider);
    
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
    content.appendChild(frequencyPenaltySlider);
    
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
    content.appendChild(repeatPenaltySlider);
    
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
    content.appendChild(topKSlider);
    
    // Seed (at bottom with some spacing)
    const seedInput = createInput({
        type: 'number',
        placeholder: 'Random',
        className: 'llm-seed-input'
    });
    const seedRow = createFormRow('Seed', seedInput);
    seedRow.style.marginTop = '8px';
    content.appendChild(seedRow);
    
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
    
    // Common settings
    const seedInput = advancedOptions.querySelector('.llm-seed-input');
    if (seedInput && seedInput.value) {
        settings.seed = parseInt(seedInput.value);
    }
    
    // Get all slider values
    const sliders = {
        temperature: '.llm-temperature-slider',
        top_p: '.llm-top-p-slider',
        top_k: '.llm-top-k-slider',
        repeat_penalty: '.llm-repeat-penalty-slider',
        presence_penalty: '.llm-presence-penalty-slider',
        frequency_penalty: '.llm-frequency-penalty-slider',
        max_tokens: '.llm-max-tokens-slider',
        num_ctx: '.llm-context-window-slider'
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
        settings.keep_alive = keepAliveInput.value;
    }
    
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
        top_p: '.llm-top-p-slider',
        top_k: '.llm-top-k-slider',
        repeat_penalty: '.llm-repeat-penalty-slider',
        presence_penalty: '.llm-presence-penalty-slider',
        frequency_penalty: '.llm-frequency-penalty-slider',
        max_tokens: '.llm-max-tokens-slider',
        num_ctx: '.llm-context-window-slider'
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
    if (settings.keep_alive !== undefined) {
        const keepAliveInput = advancedOptions.querySelector('.llm-keep-alive-input');
        if (keepAliveInput) {
            keepAliveInput.value = settings.keep_alive;
        }
    }
}

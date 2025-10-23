/**
 * LLM Model Selection Component
 * Creates the model/provider selection interface with status and preset management
 */

import { createSelect } from '../../components/formElements.js';
import * as llmApi from '../../llm/llmApi.js';
import { getProviderDisplayName, getProviderStatusClass, getProviderStatusText, formatModelName } from '../../llm/llmProviders.js';

/**
 * Creates the model selection section
 * @returns {HTMLElement} - Model selection element
 */
export function createModelSelection() {
    const section = document.createElement('div');
    section.className = 'llm-model-selection';
    
    // Provider selection
    const providerGroup = document.createElement('div');
    providerGroup.className = 'llm-form-group';
    
    const providerLabel = document.createElement('label');
    providerLabel.textContent = 'Provider';
    providerLabel.className = 'llm-label';
    
    const providerSelect = createSelect({
        items: [
            { value: 'ollama', text: 'Ollama' },
            { value: 'lmstudio', text: 'LM Studio' }
        ],
        className: 'llm-select llm-provider-select'
    });
    
    providerGroup.appendChild(providerLabel);
    providerGroup.appendChild(providerSelect);
    
    // Model selection
    const modelGroup = document.createElement('div');
    modelGroup.className = 'llm-form-group';
    
    const modelLabel = document.createElement('label');
    modelLabel.textContent = 'Model';
    modelLabel.className = 'llm-label';
    
    const modelSelect = createSelect({
        items: [{ value: '', text: 'Loading models...' }],
        className: 'llm-select llm-model-select',
        ariaLabel: 'Select LLM model'
    });
    
    modelGroup.appendChild(modelLabel);
    modelGroup.appendChild(modelSelect);
    
    // Status indicator
    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'llm-status-indicator';
    statusIndicator.innerHTML = `
        <span class="status-dot"></span>
        <span class="status-text">Checking status...</span>
    `;
    
    // Refresh button
    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'llm-btn llm-btn-secondary llm-refresh-btn';
    refreshBtn.innerHTML = '🔄 Refresh Models';
    refreshBtn.title = 'Reload model list';
    
    // Preset selection
    const presetGroup = document.createElement('div');
    presetGroup.className = 'llm-form-group';
    
    const presetLabel = document.createElement('label');
    presetLabel.textContent = 'Preset';
    presetLabel.className = 'llm-label';
    
    const presetSelect = createSelect({
        items: [{ value: '', text: 'Loading presets...' }],
        className: 'llm-select llm-preset-select'
    });
    
    presetGroup.appendChild(presetLabel);
    presetGroup.appendChild(presetSelect);
    
    // Preset action buttons
    const presetActions = document.createElement('div');
    presetActions.className = 'llm-preset-actions';
    
    const savePresetBtn = document.createElement('button');
    savePresetBtn.className = 'llm-btn llm-btn-secondary llm-btn-small llm-save-preset-btn';
    savePresetBtn.innerHTML = '💾 Save';
    savePresetBtn.title = 'Save current settings as preset';
    
    const managePresetsBtn = document.createElement('button');
    managePresetsBtn.className = 'llm-btn llm-btn-secondary llm-btn-small llm-manage-presets-btn';
    managePresetsBtn.innerHTML = '⚙️ Manage';
    managePresetsBtn.title = 'Manage presets and system prompts';
    
    presetActions.appendChild(savePresetBtn);
    presetActions.appendChild(managePresetsBtn);
    
    // Layout
    const topRow = document.createElement('div');
    topRow.className = 'llm-selection-row';
    topRow.appendChild(providerGroup);
    topRow.appendChild(modelGroup);
    
    const presetRow = document.createElement('div');
    presetRow.className = 'llm-selection-row';
    presetRow.appendChild(presetGroup);
    presetRow.appendChild(presetActions);
    
    const bottomRow = document.createElement('div');
    bottomRow.className = 'llm-selection-row';
    bottomRow.appendChild(statusIndicator);
    bottomRow.appendChild(refreshBtn);
    
    section.appendChild(topRow);
    section.appendChild(presetRow);
    section.appendChild(bottomRow);
    
    return section;
}

/**
 * Load models and status from API
 * @param {Object} state - Tab state object
 * @param {HTMLElement} modelSelection - Model selection section
 * @param {HTMLElement} visionSection - Vision section (to update visibility)
 * @param {boolean} force - Force re-initialization
 */
export async function loadModels(state, modelSelection, visionSection, force = false) {
    const providerSelect = modelSelection.querySelector('.llm-provider-select');
    const modelSelect = modelSelection.querySelector('.llm-model-select');
    const statusIndicator = modelSelection.querySelector('.llm-status-indicator');
    const statusDot = statusIndicator.querySelector('.status-dot');
    const statusText = statusIndicator.querySelector('.status-text');
    
    try {
        // Show loading state
        modelSelect.innerHTML = '<option value="">Loading models...</option>';
        modelSelect.disabled = true;
        statusDot.className = 'status-dot status-loading';
        statusText.textContent = force ? 'Re-initializing...' : 'Loading...';
        
        // Fetch status, models, and vision models (with force flag if requested)
        const [status, modelsData, visionModelsData] = await Promise.all([
            llmApi.getStatus(),
            llmApi.getModels(force),
            llmApi.getVisionModels(force)
        ]);
        
        // Store models in state
        state.models = modelsData.models;
        state.visionModels = visionModelsData.models;
        
        // Update status indicator
        const currentProvider = providerSelect.value;
        const statusClass = getProviderStatusClass(status, currentProvider);
        const statusTextValue = getProviderStatusText(status, currentProvider);
        
        statusDot.className = `status-dot ${statusClass}`;
        statusText.textContent = statusTextValue;
        
        // Populate model dropdown
        updateModelDropdown(state, modelSelect, currentProvider);
        
        // Update vision section visibility based on selected model
        if (visionSection) {
            const { isVisionModel } = await import('../../llm/llmProviders.js');
            const hasVisionModel = state.model && isVisionModel(state.model, state.provider, state.visionModels);
            visionSection.style.display = hasVisionModel ? 'block' : 'none';
            
            console.log('[LLM] Initial vision section setup:', {
                model: state.model,
                provider: state.provider,
                hasVisionModel,
                visionModels: state.visionModels,
                display: visionSection.style.display
            });
        }
        
    } catch (error) {
        console.error('Error loading models:', error);
        statusDot.className = 'status-dot status-error';
        statusText.textContent = 'Error loading models';
        modelSelect.innerHTML = '<option value="">Error loading models</option>';
    } finally {
        modelSelect.disabled = false;
    }
}

/**
 * Update model dropdown based on selected provider
 * @param {Object} state - Tab state object
 * @param {HTMLSelectElement} modelSelect - Model select element
 * @param {string} provider - Selected provider
 */
export function updateModelDropdown(state, modelSelect, provider) {
    const models = state.models[provider] || [];
    const visionModels = state.visionModels[provider] || [];
    
    if (models.length === 0) {
        modelSelect.innerHTML = '<option value="">No models available</option>';
        state.model = null;
        return;
    }
    
    // Create Set for faster lookup
    const visionModelSet = new Set(visionModels);
    
    modelSelect.innerHTML = models.map(model => {
        const isVision = visionModelSet.has(model);
        const displayName = formatModelName(model, isVision);
        return `<option value="${model}">${displayName}</option>`;
    }).join('');
    
    // Select first model by default
    state.model = models[0];
}

/**
 * Load presets from API and populate dropdown
 * @param {Object} state - Tab state object
 * @param {HTMLElement} modelSelection - Model selection section
 */
export async function loadPresets(state, modelSelection) {
    const presetSelect = modelSelection.querySelector('.llm-preset-select');
    
    try {
        // Import preset module
        const presetModule = await import('../../llm/llmPresets.js');
        const presets = await presetModule.getPresets();
        
        // Store presets in state
        state.presets = presets;
        
        // Build preset options grouped by category
        const options = ['<option value="">None (Manual Settings)</option>'];
        
        // Group presets by category
        const categories = {};
        Object.entries(presets).forEach(([id, preset]) => {
            const category = preset.category || 'other';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push({ id, preset });
        });
        
        // Add options by category
        const sortedCategories = Object.keys(categories).sort((a, b) => {
            // Built-in categories first
            const order = ['description', 'chat', 'custom', 'imported', 'other'];
            const aIndex = order.indexOf(a);
            const bIndex = order.indexOf(b);
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            return a.localeCompare(b);
        });
        
        sortedCategories.forEach(category => {
            // Add optgroup
            const label = category.charAt(0).toUpperCase() + category.slice(1);
            options.push(`<optgroup label="${label}">`);
            
            // Add presets in this category
            categories[category]
                .sort((a, b) => a.preset.name.localeCompare(b.preset.name))
                .forEach(({ id, preset }) => {
                    const icon = preset.isBuiltin ? '⭐ ' : '';
                    const description = preset.description ? ` - ${preset.description}` : '';
                    options.push(`<option value="${id}">${icon}${preset.name}${description}</option>`);
                });
            
            options.push('</optgroup>');
        });
        
        presetSelect.innerHTML = options.join('');
        
    } catch (error) {
        console.error('Error loading presets:', error);
        presetSelect.innerHTML = '<option value="">Error loading presets</option>';
    }
}

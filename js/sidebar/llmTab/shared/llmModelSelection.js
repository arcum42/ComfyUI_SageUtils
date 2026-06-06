/**
 * LLM Model Selection Component
 * Creates the model/provider selection interface with status and preset management
 */

import { createSelect } from '../../../components/formElements.js';
import { alertDialog } from '../../../components/dialogManager.js';
import * as llmApi from '../../../llm/llmApi.js';
import {
    getProviderDisplayName,
    getProviderStatusClass,
    getProviderStatusText,
    formatModelNameWithCapabilities,
    getModelCapabilityFlags
} from '../../../llm/llmProviders.js';
import { loadHtmlTemplate, createElementFromTemplate } from '../../../utils/htmlTemplateLoader.js';

const LLM_LAST_MODELS_KEY = 'llm_last_models_by_provider';

function loadLastModelsByProvider() {
    try {
        const raw = localStorage.getItem(LLM_LAST_MODELS_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function saveLastModelsByProvider(lastModelsByProvider) {
    try {
        localStorage.setItem(LLM_LAST_MODELS_KEY, JSON.stringify(lastModelsByProvider || {}));
    } catch (error) {
        console.warn('Failed to save provider model memory:', error);
    }
}

let modelLoadErrorDialogOpen = false;
let lastModelLoadErrorMessage = '';
let lastModelLoadErrorTime = 0;

function showModelLoadErrorDialog(message) {
    if (!message) {
        return;
    }

    const now = Date.now();
    const isRapidDuplicate = message === lastModelLoadErrorMessage && (now - lastModelLoadErrorTime) < 1500;

    if (modelLoadErrorDialogOpen || isRapidDuplicate) {
        return;
    }

    modelLoadErrorDialogOpen = true;
    lastModelLoadErrorMessage = message;
    lastModelLoadErrorTime = now;

    alertDialog(message, 'LLM Model Load Error')
        .catch((dialogError) => {
            console.error('Failed to show LLM model load error dialog:', dialogError);
        })
        .finally(() => {
            modelLoadErrorDialogOpen = false;
        });
}

/**
 * Creates the model selection section
 * @returns {Promise<HTMLElement>} - Model selection element
 */
export async function createModelSelection() {
    const section = await renderLlmModelSelection();

    const providerSelect = createSelect({
        items: [
            { value: 'lmstudio_rest', text: 'LM Studio' },
            { value: 'ollama_rest', text: 'Ollama' },
            { value: 'openai', text: 'OpenAI' },
            { value: 'native', text: 'Native (CLIP)' }
        ],
        className: 'llm-select llm-provider-select'
    });

    const modelSelect = createSelect({
        items: [{ value: '', text: 'Loading models...' }],
        className: 'llm-select llm-model-select',
        ariaLabel: 'Select LLM model'
    });

    const presetSelect = createSelect({
        items: [{ value: '', text: 'Loading presets...' }],
        className: 'llm-select llm-preset-select'
    });

    section.querySelector('.llm-provider-host')?.appendChild(providerSelect);
    section.querySelector('.llm-model-host')?.appendChild(modelSelect);
    section.querySelector('.llm-preset-host')?.appendChild(presetSelect);

    return section;
}

let llmModelSelectionTemplate = null;

async function getLlmModelSelectionTemplate() {
    if (!llmModelSelectionTemplate) {
        llmModelSelectionTemplate = await loadHtmlTemplate('extensions/comfyui_sageutils/sidebar/llmTab/partials/llmModelSelection.html');
    }
    return llmModelSelectionTemplate;
}

async function renderLlmModelSelection() {
    const template = await getLlmModelSelectionTemplate();
    return createElementFromTemplate(template);
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
        if (!state.lastModelsByProvider) {
            state.lastModelsByProvider = loadLastModelsByProvider();
        }

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
        state.models = modelsData.models || {};
        state.visionModels = visionModelsData.models || {};
        state.capabilities = modelsData.capabilities || visionModelsData.capabilities || {};
        state.toolModels = modelsData.tool_models || visionModelsData.tool_models || {};
        state.reasoningModels = modelsData.reasoning_models || visionModelsData.reasoning_models || {};
        
        // Update status indicator
        const currentProvider = providerSelect.value;
        const statusClass = getProviderStatusClass(status, currentProvider);
        const statusTextValue = getProviderStatusText(status, currentProvider);
        
        statusDot.className = `status-dot ${statusClass}`;
        statusText.textContent = statusTextValue;
        
        // Populate model dropdown
        const preferredModel = state.lastModelsByProvider?.[currentProvider] || null;
        updateModelDropdown(state, modelSelect, currentProvider, preferredModel);
        
        // Update vision section visibility based on selected model
        if (visionSection) {
            const flags = state.model ? getModelCapabilityFlags(
                state.provider,
                state.model,
                state.capabilities,
                state.visionModels,
                state.toolModels,
                state.reasoningModels
            ) : null;
            const hasVisionModel = Boolean(flags?.vision);
            visionSection.classList.toggle('llm-hidden', !hasVisionModel);
            
            console.log('[LLM] Initial vision section setup:', {
                model: state.model,
                provider: state.provider,
                hasVisionModel,
                visionModels: state.visionModels,
                hidden: visionSection.classList.contains('llm-hidden')
            });
        }
        
    } catch (error) {
        console.error('Error loading models:', error);
        const errorMessage = error?.message || 'Failed to load LLM models. Please check provider availability and settings.';
        statusDot.className = 'status-dot status-error';
        statusText.textContent = 'Error loading models';
        modelSelect.innerHTML = '<option value="">Error loading models</option>';
        showModelLoadErrorDialog(errorMessage);
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
export function updateModelDropdown(state, modelSelect, provider, preferredModel = null) {
    const models = state.models[provider] || [];
    
    if (models.length === 0) {
        const emptyText = provider === 'native' ? 'No CLIP models available' : 'No models available';
        modelSelect.innerHTML = `<option value="">${emptyText}</option>`;
        state.model = null;
        return;
    }

    modelSelect.innerHTML = models.map(model => {
        const flags = getModelCapabilityFlags(
            provider,
            model,
            state.capabilities,
            state.visionModels,
            state.toolModels,
            state.reasoningModels
        );
        const displayName = formatModelNameWithCapabilities(model, flags);
        return `<option value="${model}">${displayName}</option>`;
    }).join('');
    
    const rememberedModel = preferredModel || state.lastModelsByProvider?.[provider] || null;
    if (rememberedModel && models.includes(rememberedModel)) {
        state.model = rememberedModel;
        modelSelect.value = rememberedModel;
    } else {
        state.model = models[0];
        modelSelect.value = state.model;
    }

    state.lastModelsByProvider = state.lastModelsByProvider || {};
    state.lastModelsByProvider[provider] = state.model;
    saveLastModelsByProvider(state.lastModelsByProvider);
}

export function rememberProviderModel(state, provider, model) {
    if (!provider || !model) {
        return;
    }

    state.lastModelsByProvider = state.lastModelsByProvider || loadLastModelsByProvider();
    state.lastModelsByProvider[provider] = model;
    saveLastModelsByProvider(state.lastModelsByProvider);
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
        const presetModule = await import('../../../llm/llmPresets.js');
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

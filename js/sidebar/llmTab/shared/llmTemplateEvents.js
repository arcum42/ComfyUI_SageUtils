/**
 * LLM Template & Extras Event Handlers
 * 
 * Handles template selection, category filtering, extras grid checkboxes, and system prompt changes.
 */

const TEMPLATE_EVENTS_KEY = 'llm_template_events';

export function handleCategoryChange(state, categorySelect, templateSelect) {
    const category = categorySelect.value;
    state.selectedCategory = category;
    
    if (!category || !state.prompts?.base) {
        templateSelect.innerHTML = '<option value="">Select template...</option>';
        templateSelect.disabled = true;
        return;
    }
    
    const options = ['<option value="">Select template...</option>'];
    Object.entries(state.prompts.base).forEach(([key, template]) => {
        if (template.category === category) {
            options.push(`<option value="${key}">${template.name}</option>`);
        }
    });
    
    templateSelect.innerHTML = options.join('');
    templateSelect.disabled = false;
    console.log(`[SageUtils] TemplateEvents: Filtered ${options.length - 1} templates in category "${category}"`);
}

export function handleTemplateChange(state, templateSelect, textarea) {
    const templateKey = templateSelect.value;
    state.settings.promptTemplate = templateKey;
    
    if (templateKey && state.prompts?.base?.[templateKey]) {
        const template = state.prompts.base[templateKey];
        
        textarea.value = template.prompt || '';
        textarea.dispatchEvent(new Event('input'));
        console.log(`[SageUtils] TemplateEvents: Applied template "${template.name}" (${Object.keys(template.variables || {}).length} variables)`);
    }
}

export function handleExtrasChange(state, event) {
    const target = event.target;
    if (target.type === 'checkbox' && target.dataset.extraKey) {
        const key = target.dataset.extraKey;
        state.selectedExtras[key] = target.checked;
    }
}

export function handleSystemPromptChange(state, systemPromptTextarea, saveSettings) {
    const value = systemPromptTextarea.value;
    state.settings.systemPrompt = value;
    
    saveSettings(state.settings);
}

console.log('[SageUtils] llmTemplateEvents.js loaded');

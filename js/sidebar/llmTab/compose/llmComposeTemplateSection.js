/**
 * LLM Compose Template Section
 * Template selector for Compose tab with smart replacement confirmation
 */

import { createSelect, createFormRow } from '../../../components/formElements.js';
import { createSection } from '../../../components/layout.js';

/**
 * Create template section for Compose tab
 * @param {HTMLElement} textarea - The main prompt textarea
 * @returns {HTMLElement} - Template section element
 */
export function createComposeTemplateSection(textarea) {
    const content = document.createElement('div');
    content.className = 'llm-template-content llm-compose-template-content';

    // Track last chosen template and whether prompt was modified
    const state = {
        lastTemplate: '',
        lastTemplateContent: '',
    };

    // Category selector
    const categorySelect = createSelect({
        items: [{ value: '', text: 'Select category...' }],
        className: 'llm-category-select'
    });
    const categoryRow = createFormRow('Category', categorySelect);
    content.appendChild(categoryRow);

    // Template selector
    const templateSelect = createSelect({
        items: [{ value: '', text: 'Select template...' }],
        className: 'llm-template-select',
        disabled: true
    });
    const templateRow = createFormRow('Template', templateSelect);
    content.appendChild(templateRow);
    templateRow.classList.add('llm-form-row--disabled');

    // Track textarea modifications
    textarea.addEventListener('input', () => {
        state.promptModified = textarea.value !== state.lastTemplateContent;
    });

    // Category change handler
    categorySelect.addEventListener('change', () => {
        const category = categorySelect.value;
        state.selectedCategory = category;

        if (!category) {
            // Reset when "Select Category..." is chosen
            templateSelect.innerHTML = '<option value="">Select template...</option>';
            templateSelect.disabled = true;
            templateRow.classList.add('llm-form-row--disabled');
            return;
        }

        // Re-enable template select and show normal opacity
        templateSelect.disabled = false;
        templateRow.classList.remove('llm-form-row--disabled');

        // Repopulate template dropdown with templates from this category
        // This will be wired up in event handlers
        templateSelect.innerHTML = '<option value="">Select template...</option>';
    });

    // Template change handler
    templateSelect.addEventListener('change', () => {
        const templateKey = templateSelect.value;
        if (!templateKey) return;

        // Dispatch event so event handlers can access state and prompts
        const event = new CustomEvent('llm-template-selected', {
            detail: {
                templateKey,
                state,
                textarea,
                shouldConfirm: state.promptModified && state.lastTemplateContent !== textarea.value,
            },
            bubbles: true,
        });
        content.dispatchEvent(event);
    });

    // Export state reference so event handlers can access it
    content._templateState = state;
    content._categorySelect = categorySelect;
    content._templateSelect = templateSelect;

    const section = createSection('📋 Prompt Templates', content, {
        collapsible: true,
        collapsed: true,
        className: 'llm-compose-template-section'
    });

    // Attach state references to section so they're accessible via querySelector
    section._templateState = state;
    section._categorySelect = categorySelect;
    section._templateSelect = templateSelect;

    return section;
}

/**
 * Update template state after a template is chosen
 * @param {Object} state - Template state object from compose template section
 * @param {string} templateContent - The template prompt content
 * @param {HTMLElement} textarea - Main prompt textarea
 */
export function updateTemplateState(state, templateContent, textarea) {
    state.lastTemplate = textarea.value;
    state.lastTemplateContent = templateContent;
    state.promptModified = false;
}

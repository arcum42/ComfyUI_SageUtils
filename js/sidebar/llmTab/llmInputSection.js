/**
 * LLM Input Section Component
 * Creates the prompt input area with character counter and action buttons
 */

import { createTextarea } from '../../components/formElements.js';

/**
 * Creates the input section
 * @returns {HTMLElement} - Input section element
 */
export function createInputSection() {
    const section = document.createElement('div');
    section.className = 'llm-input-section';
    
    // Input header
    const inputHeader = document.createElement('div');
    inputHeader.className = 'llm-input-header';
    
    const inputTitle = document.createElement('h3');
    inputTitle.textContent = 'Prompt';
    inputTitle.className = 'llm-section-title';
    
    const charCounter = document.createElement('span');
    charCounter.className = 'llm-char-counter';
    charCounter.id = 'llm-char-counter';
    charCounter.textContent = '0 characters';
    charCounter.setAttribute('aria-live', 'polite');
    charCounter.setAttribute('aria-atomic', 'true');
    
    inputHeader.appendChild(inputTitle);
    inputHeader.appendChild(charCounter);
    
    // Textarea
    const textarea = createTextarea({
        className: 'llm-textarea llm-main-prompt',
        placeholder: 'Type your prompt here... (Ctrl+Enter to send)',
        rows: 6,
        monospace: false,
        onInput: () => {
            const count = textarea.value.length;
            charCounter.textContent = `${count} character${count !== 1 ? 's' : ''}`;
        },
        onKeydown: (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                const sendBtn = document.querySelector('.llm-send-btn');
                if (sendBtn && !sendBtn.disabled) {
                    sendBtn.click();
                }
            }
            // Escape to blur
            if (e.key === 'Escape') {
                textarea.blur();
            }
        }
    });
    
    // Action buttons (placeholders for Phase 8 cross-tab integration)
    const actionButtons = document.createElement('div');
    actionButtons.className = 'llm-action-buttons';
    
    // Skip save checkbox
    const skipSaveContainer = document.createElement('label');
    skipSaveContainer.className = 'llm-skip-save-container';
    skipSaveContainer.style.display = 'flex';
    skipSaveContainer.style.alignItems = 'center';
    skipSaveContainer.style.gap = '6px';
    skipSaveContainer.style.cursor = 'pointer';
    
    const skipSaveCheckbox = document.createElement('input');
    skipSaveCheckbox.type = 'checkbox';
    skipSaveCheckbox.className = 'llm-skip-save-checkbox';
    skipSaveCheckbox.id = 'llm-skip-save-checkbox';
    
    const skipSaveLabel = document.createElement('span');
    skipSaveLabel.textContent = 'Don\'t save to history';
    skipSaveLabel.style.fontSize = '11px';
    skipSaveLabel.style.color = 'var(--text-secondary, #999)';
    
    skipSaveContainer.appendChild(skipSaveCheckbox);
    skipSaveContainer.appendChild(skipSaveLabel);
    
    const fromPromptsBtn = document.createElement('button');
    fromPromptsBtn.className = 'llm-btn llm-btn-secondary llm-btn-small';
    fromPromptsBtn.innerHTML = '← From Prompts';
    fromPromptsBtn.title = 'Receive text from Prompt Builder tab (Phase 8)';
    fromPromptsBtn.disabled = true; // Will be enabled in Phase 8
    
    const toPromptsBtn = document.createElement('button');
    toPromptsBtn.className = 'llm-btn llm-btn-secondary llm-btn-small';
    toPromptsBtn.innerHTML = 'To Prompts →';
    toPromptsBtn.title = 'Send text to Prompt Builder tab (Phase 8)';
    toPromptsBtn.disabled = true; // Will be enabled in Phase 8
    
    const fromNodeBtn = document.createElement('button');
    fromNodeBtn.className = 'llm-btn llm-btn-secondary llm-btn-small llm-from-node-btn';
    fromNodeBtn.innerHTML = '📥 From Node';
    fromNodeBtn.title = 'Copy text from selected node to prompt';
    fromNodeBtn.setAttribute('aria-label', 'Copy text from selected node');
    
    actionButtons.appendChild(skipSaveContainer);
    actionButtons.appendChild(fromPromptsBtn);
    actionButtons.appendChild(toPromptsBtn);
    actionButtons.appendChild(fromNodeBtn);
    
    section.appendChild(inputHeader);
    section.appendChild(textarea);
    section.appendChild(actionButtons);
    
    return section;
}

/**
 * Get the prompt textarea element
 * @param {HTMLElement} inputSection - Input section element
 * @returns {HTMLTextAreaElement} - Textarea element
 */
export function getPromptTextarea(inputSection) {
    return inputSection.querySelector('.llm-main-prompt');
}

/**
 * Set prompt text
 * @param {HTMLElement} inputSection - Input section element
 * @param {string} text - Text to set
 */
export function setPromptText(inputSection, text) {
    const textarea = getPromptTextarea(inputSection);
    if (textarea) {
        textarea.value = text;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

/**
 * Get prompt text
 * @param {HTMLElement} inputSection - Input section element
 * @returns {string} - Current prompt text
 */
export function getPromptText(inputSection) {
    const textarea = getPromptTextarea(inputSection);
    return textarea ? textarea.value.trim() : '';
}

/**
 * Clear prompt text
 * @param {HTMLElement} inputSection - Input section element
 */
export function clearPromptText(inputSection) {
    setPromptText(inputSection, '');
}

/**
 * LLM Response Section Component
 * Creates the response display area with copy/export buttons
 */

import { loadHtmlTemplate, createElementFromTemplate } from '../../../utils/htmlTemplateLoader.js';

let llmResponseSectionTemplate = null;

async function getLlmResponseSectionTemplate() {
    if (!llmResponseSectionTemplate) {
        llmResponseSectionTemplate = await loadHtmlTemplate('extensions/comfyui_sageutils/sidebar/llmTab/partials/llmResponseSection.html');
    }
    return llmResponseSectionTemplate;
}

/**
 * Creates the response section
 * @returns {Promise<HTMLElement>} - Response section element
 */
export async function createResponseSection() {
    const template = await getLlmResponseSectionTemplate();
    return createElementFromTemplate(template);
}

/**
 * Display status message in response section
 * @param {HTMLElement} responseSection - Response section element
 * @param {string} message - Status message
 * @param {string} type - Message type: 'info', 'success', 'warning', 'error'
 * @param {Object} [options] - Additional options
 * @param {boolean} [options.autoHide] - Auto-hide after 5 seconds (default: true for non-errors)
 * @param {number} [options.progress] - Progress 0-1 to show progress bar
 */
export function showStatus(responseSection, message, type, options = {}) {
    const statusMessage = responseSection.querySelector('.llm-status-message');
    if (!statusMessage) return;
    
    const { autoHide = (type !== 'error'), progress = null } = options;
    
    statusMessage.textContent = message;
    statusMessage.className = `llm-status-message llm-status-${type}`;
    statusMessage.classList.toggle('llm-hidden', !message);
    
    const progressBar = responseSection.querySelector('.llm-progress-bar-container');
    if (progressBar) {
        const fill = progressBar.querySelector('.llm-progress-bar-fill');
        if (progressBar && progress !== null && progress >= 0 && progress <= 1) {
            progressBar.classList.remove('llm-hidden');
            if (fill) {
                fill.style.width = `${Math.round(progress * 100)}%`;
            }
        } else {
            progressBar.classList.add('llm-hidden');
            if (fill) {
                fill.style.width = '0%';
            }
        }
    }
    
    // Auto-hide after 5 seconds (only if enabled)
    if (message && autoHide && type !== 'error') {
        setTimeout(() => {
            if (statusMessage.textContent === message) {
                statusMessage.classList.add('llm-hidden');
            }
        }, 5000);
    }
}

/**
 * Set response text
 * @param {HTMLElement} responseSection - Response section element
 * @param {string} text - Response text
 */
export function setResponseText(responseSection, text) {
    const responseDisplay = responseSection.querySelector('.llm-response-display');
    if (responseDisplay) {
        const placeholder = responseDisplay.querySelector('.llm-response-placeholder');
        const answer = responseDisplay.querySelector('.llm-response-answer');
        if (placeholder) {
            placeholder.classList.toggle('llm-hidden', Boolean(text));
        }
        if (answer) {
            answer.textContent = text || '';
        }
    }
}

/**
 * Get response text
 * @param {HTMLElement} responseSection - Response section element
 * @returns {string} - Current response text
 */
export function getResponseText(responseSection) {
    const responseDisplay = responseSection.querySelector('.llm-response-display');
    if (!responseDisplay) return '';
    const answer = responseDisplay.querySelector('.llm-response-answer');
    return answer ? answer.textContent : '';
}

/**
 * Get the full transcript text, including reasoning when present.
 * @param {HTMLElement} responseSection - Response section element
 * @returns {string} - Combined transcript text
 */
export function getTranscriptText(responseSection) {
    const responseDisplay = responseSection.querySelector('.llm-response-display');
    if (!responseDisplay) return '';

    const parts = [];
    const reasoning = responseDisplay.querySelector('.llm-reasoning-content')?.textContent?.trim();
    const answer = responseDisplay.querySelector('.llm-response-answer')?.textContent?.trim();

    if (reasoning) {
        parts.push(`Reasoning:\n${reasoning}`);
    }
    if (answer) {
        parts.push(`Response:\n${answer}`);
    }

    return parts.join('\n\n');
}

/**
 * Clear response text
 * @param {HTMLElement} responseSection - Response section element
 */
export function clearResponseText(responseSection) {
    setResponseText(responseSection, '');
}

/**
 * Show or hide the reasoning transcript block.
 * @param {HTMLElement} responseSection - Response section element
 * @param {boolean} show - Whether to show reasoning output
 */
export function setReasoningVisible(responseSection, show) {
    const reasoningPanel = responseSection.querySelector('.llm-reasoning-panel');
    if (reasoningPanel) {
        reasoningPanel.hidden = !show;
    }
}

/**
 * Set reasoning text.
 * @param {HTMLElement} responseSection - Response section element
 * @param {string} text - Reasoning text
 */
export function setReasoningText(responseSection, text) {
    const reasoningPanel = responseSection.querySelector('.llm-reasoning-panel');
    const reasoningContent = responseSection.querySelector('.llm-reasoning-content');
    const reasoningBadge = responseSection.querySelector('.llm-reasoning-badge');
    const normalizedText = typeof text === 'string' ? text : '';
    const hasContent = normalizedText.trim().length > 0;

    if (reasoningContent) {
        reasoningContent.textContent = normalizedText;
    }
    if (reasoningPanel) {
        reasoningPanel.hidden = !hasContent;
    }
    if (reasoningBadge) {
        reasoningBadge.textContent = hasContent ? 'Visible' : 'Hidden';
    }
}

/**
 * Append reasoning text for streaming updates.
 * @param {HTMLElement} responseSection - Response section element
 * @param {string} text - Reasoning text to append
 * @param {boolean} autoScroll - Whether to auto-scroll to bottom
 */
export function appendReasoningText(responseSection, text, autoScroll = true) {
    if (typeof text !== 'string' || text.trim().length === 0) {
        return;
    }

    const responseDisplay = responseSection.querySelector('.llm-response-display');
    const reasoningPanel = responseSection.querySelector('.llm-reasoning-panel');
    const reasoningContent = responseSection.querySelector('.llm-reasoning-content');
    const reasoningBadge = responseSection.querySelector('.llm-reasoning-badge');

    if (reasoningPanel) {
        reasoningPanel.hidden = false;
    }
    if (reasoningContent) {
        reasoningContent.textContent += text;
    }
    if (reasoningBadge) {
        reasoningBadge.textContent = 'Visible';
    }

    if (autoScroll && responseDisplay) {
        responseDisplay.scrollTop = responseDisplay.scrollHeight;
    }
}

/**
 * Clear reasoning output.
 * @param {HTMLElement} responseSection - Response section element
 */
export function clearReasoningText(responseSection) {
    setReasoningText(responseSection, '');
}

/**
 * Clear both reasoning and answer text.
 * @param {HTMLElement} responseSection - Response section element
 */
export function clearResponseTranscript(responseSection) {
    clearReasoningText(responseSection);
    clearResponseText(responseSection);
}

/**
 * Show/hide action buttons
 * @param {HTMLElement} responseSection - Response section element
 * @param {boolean} show - Whether to show buttons
 */
export function showActionButtons(responseSection, show) {
    const copyBtn = responseSection.querySelector('.llm-copy-btn');
    const copyToNodeBtn = responseSection.querySelector('.llm-copy-to-node-btn');
    const sendToPromptBtn = responseSection.querySelector('.llm-send-to-prompt-btn');

    if (copyBtn) {
        copyBtn.classList.toggle('llm-hidden', !show);
    }
    if (copyToNodeBtn) {
        copyToNodeBtn.classList.toggle('llm-hidden', !show);
    }
    if (sendToPromptBtn) {
        sendToPromptBtn.classList.toggle('llm-hidden', !show);
    }
}

/**
 * Show/hide stop button
 * @param {HTMLElement} responseSection - Response section element
 * @param {boolean} show - Whether to show stop button
 */
export function showStopButton(responseSection, show) {
    const stopBtn = responseSection.querySelector('.llm-stop-btn');
    if (stopBtn) {
        stopBtn.classList.toggle('llm-hidden', !show);
    }
}

/**
 * Set generating state
 * @param {HTMLElement} responseSection - Response section element
 * @param {boolean} generating - Whether generation is in progress
 */
export function setGeneratingState(responseSection, generating) {
    const responseDisplay = responseSection.querySelector('.llm-response-display');
    if (responseDisplay) {
        if (generating) {
            responseDisplay.classList.add('generating');
        } else {
            responseDisplay.classList.remove('generating');
        }
    }
    
    showStopButton(responseSection, generating);
    showActionButtons(responseSection, !generating);
}

/**
 * Append text to response (for streaming)
 * @param {HTMLElement} responseSection - Response section element
 * @param {string} text - Text to append
 * @param {boolean} autoScroll - Whether to auto-scroll to bottom
 */
export function appendResponseText(responseSection, text, autoScroll = true) {
    const responseDisplay = responseSection.querySelector('.llm-response-display');
    const responseText = responseSection.querySelector('.llm-response-answer');
    const placeholder = responseSection.querySelector('.llm-response-placeholder');
    if (responseText) {
        if (placeholder) {
            placeholder.classList.add('llm-hidden');
        }
        responseText.textContent += text;
        
        if (autoScroll) {
            if (responseDisplay) {
                responseDisplay.scrollTop = responseDisplay.scrollHeight;
            }
        }
    }
}

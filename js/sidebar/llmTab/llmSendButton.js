/**
 * LLM Send Button Component
 * Creates the main send button for the LLM tab
 */

/**
 * Create the send button
 * @returns {HTMLElement} - Send button element
 */
export function createSendButton() {
    const sendBtn = document.createElement('button');
    sendBtn.className = 'llm-btn llm-btn-primary llm-send-btn';
    sendBtn.innerHTML = '📤 Send';
    sendBtn.title = 'Generate response (Ctrl+Enter)';
    sendBtn.setAttribute('aria-label', 'Send message to LLM');
    return sendBtn;
}

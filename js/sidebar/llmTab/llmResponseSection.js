/**
 * LLM Response Section Component
 * Creates the response display area with copy/export buttons
 */

/**
 * Creates the response section
 * @returns {HTMLElement} - Response section element
 */
export function createResponseSection() {
    const section = document.createElement('div');
    section.className = 'llm-response-section';
    section.setAttribute('role', 'region');
    section.setAttribute('aria-labelledby', 'llm-response-title');
    
    // Response header
    const responseHeader = document.createElement('div');
    responseHeader.className = 'llm-response-header';
    
    const responseTitle = document.createElement('h3');
    responseTitle.textContent = 'Response';
    responseTitle.className = 'llm-section-title';
    responseTitle.id = 'llm-response-title';
    
    const responseActions = document.createElement('div');
    responseActions.className = 'llm-response-actions';
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'llm-btn llm-btn-secondary llm-btn-small llm-copy-btn';
    copyBtn.innerHTML = '📋 Copy';
    copyBtn.title = 'Copy response to clipboard';
    copyBtn.style.display = 'none'; // Hide until response generated
    copyBtn.setAttribute('aria-label', 'Copy response to clipboard');
    
    const copyToNodeBtn = document.createElement('button');
    copyToNodeBtn.className = 'llm-btn llm-btn-secondary llm-btn-small llm-copy-to-node-btn';
    copyToNodeBtn.innerHTML = '📤 To Node';
    copyToNodeBtn.title = 'Copy response to selected node';
    copyToNodeBtn.style.display = 'none'; // Hide until response generated
    copyToNodeBtn.setAttribute('aria-label', 'Copy response to selected node');
    
    const sendToPromptBtn = document.createElement('button');
    sendToPromptBtn.className = 'llm-btn llm-btn-secondary llm-btn-small llm-send-to-prompt-btn';
    sendToPromptBtn.innerHTML = '📝 Send to Prompt Builder';
    sendToPromptBtn.title = 'Send response to Prompt Builder tab';
    sendToPromptBtn.style.display = 'none'; // Hide until response generated
    sendToPromptBtn.setAttribute('aria-label', 'Send response to Prompt Builder tab');
    
    const saveToHistoryBtn = document.createElement('button');
    saveToHistoryBtn.className = 'llm-btn llm-btn-primary llm-btn-small llm-save-to-history-btn';
    saveToHistoryBtn.innerHTML = '💾 Save to History';
    saveToHistoryBtn.title = 'Save this conversation to history';
    saveToHistoryBtn.style.display = 'none'; // Only shown when skip save was checked
    saveToHistoryBtn.setAttribute('aria-label', 'Save conversation to history');
    
    const stopBtn = document.createElement('button');
    stopBtn.className = 'llm-btn llm-btn-danger llm-btn-small llm-stop-btn';
    stopBtn.innerHTML = '⏹ Stop';
    stopBtn.title = 'Stop generation';
    stopBtn.style.display = 'none'; // Hide until generating
    stopBtn.setAttribute('aria-label', 'Stop generation');
    
    responseActions.appendChild(copyBtn);
    responseActions.appendChild(copyToNodeBtn);
    responseActions.appendChild(sendToPromptBtn);
    responseActions.appendChild(saveToHistoryBtn);
    responseActions.appendChild(stopBtn);
    
    responseHeader.appendChild(responseTitle);
    responseHeader.appendChild(responseActions);
    
    // Response display area
    const responseDisplay = document.createElement('div');
    responseDisplay.className = 'llm-response-display';
    responseDisplay.innerHTML = '<p class="llm-placeholder">Response will appear here...</p>';
    responseDisplay.setAttribute('role', 'log');
    responseDisplay.setAttribute('aria-live', 'polite');
    responseDisplay.setAttribute('aria-atomic', 'false');
    responseDisplay.setAttribute('aria-label', 'LLM response output');
    
    // Status message
    const statusMessage = document.createElement('div');
    statusMessage.className = 'llm-status-message';
    statusMessage.style.display = 'none';
    statusMessage.setAttribute('role', 'status');
    statusMessage.setAttribute('aria-live', 'polite');
    statusMessage.setAttribute('aria-atomic', 'true');
    
    section.appendChild(responseHeader);
    section.appendChild(responseDisplay);
    section.appendChild(statusMessage);
    
    return section;
}

/**
 * Display status message in response section
 * @param {HTMLElement} responseSection - Response section element
 * @param {string} message - Status message
 * @param {string} type - Message type: 'info', 'success', 'warning', 'error'
 */
export function showStatus(responseSection, message, type) {
    const statusMessage = responseSection.querySelector('.llm-status-message');
    if (!statusMessage) return;
    
    statusMessage.textContent = message;
    statusMessage.className = `llm-status-message llm-status-${type}`;
    statusMessage.style.display = message ? 'block' : 'none';
    
    // Auto-hide after 5 seconds (except errors)
    if (message && type !== 'error') {
        setTimeout(() => {
            statusMessage.style.display = 'none';
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
        responseDisplay.textContent = text;
    }
}

/**
 * Get response text
 * @param {HTMLElement} responseSection - Response section element
 * @returns {string} - Current response text
 */
export function getResponseText(responseSection) {
    const responseDisplay = responseSection.querySelector('.llm-response-display');
    return responseDisplay ? responseDisplay.textContent : '';
}

/**
 * Clear response text
 * @param {HTMLElement} responseSection - Response section element
 */
export function clearResponseText(responseSection) {
    setResponseText(responseSection, '');
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
    
    const display = show ? 'inline-block' : 'none';
    if (copyBtn) copyBtn.style.display = display;
    if (copyToNodeBtn) copyToNodeBtn.style.display = display;
    if (sendToPromptBtn) sendToPromptBtn.style.display = display;
}

/**
 * Show/hide stop button
 * @param {HTMLElement} responseSection - Response section element
 * @param {boolean} show - Whether to show stop button
 */
export function showStopButton(responseSection, show) {
    const stopBtn = responseSection.querySelector('.llm-stop-btn');
    if (stopBtn) {
        stopBtn.style.display = show ? 'inline-block' : 'none';
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
    if (responseDisplay) {
        responseDisplay.textContent += text;
        
        if (autoScroll) {
            responseDisplay.scrollTop = responseDisplay.scrollHeight;
        }
    }
}

/**
 * LLM Generation Handler
 * Handles text and vision generation with streaming support
 */

import * as llmApi from '../../llm/llmApi.js';
import { copyTextToSelectedNode } from '../../utils/textCopyUtils.js';
import { copyTextFromSelectedNode } from '../../utils/textCopyFromNode.js';

/**
 * Handle send button click - start generation
 * @param {Object} state - Tab state object
 * @param {HTMLTextAreaElement} textarea - Prompt textarea
 * @param {HTMLElement} responseSection - Response section
 * @param {HTMLButtonElement} sendBtn - Send button
 * @param {HTMLButtonElement} stopBtn - Stop button
 * @param {HTMLElement} historySection - History section (optional)
 * @param {Function} updateConversationList - Function to update conversation list UI
 */
export async function handleSend(state, textarea, responseSection, sendBtn, stopBtn, historySection, updateConversationList) {
    let prompt = textarea.value.trim();
    
    if (!prompt) {
        showStatus(responseSection, 'Please enter a prompt', 'error');
        return;
    }
    
    // Apply selected extras to the prompt
    if (state.prompts?.extra && state.selectedExtras) {
        let extrasText = '';
        Object.entries(state.selectedExtras).forEach(([key, enabled]) => {
            if (enabled && state.prompts.extra[key]) {
                const extra = state.prompts.extra[key];
                if (extra.prompt) {
                    extrasText += extra.prompt + '\n\n';
                }
            }
        });
        
        if (extrasText) {
            // Add extras to the prompt
            prompt = prompt + '\n\n' + extrasText.trim();
        }
    }
    
    // Include conversation history if enabled
    if (state.settings.includeHistory && state.currentConversationMessages.length > 0) {
        const maxMessages = state.settings.maxHistoryMessages || 10;
        const recentMessages = state.currentConversationMessages.slice(-maxMessages);
        
        let historyText = '\n\n--- Previous conversation ---\n';
        recentMessages.forEach(msg => {
            const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
            historyText += `\n${roleLabel}: ${msg.content}\n`;
        });
        historyText += '--- End of previous conversation ---\n\n';
        historyText += 'Current message:\n';
        
        prompt = historyText + prompt;
    }
    
    if (!state.model) {
        showStatus(responseSection, 'Please select a model', 'error');
        return;
    }
    
    if (state.generating) {
        return; // Already generating
    }
    
    // Start new conversation if none exists
    if (!state.currentConversationId) {
        startNewConversation(state);
    }
    
    // Check if we should skip saving to history
    const skipSaveCheckbox = document.querySelector('.llm-skip-save-checkbox');
    const skipSave = skipSaveCheckbox && skipSaveCheckbox.checked;
    
    // Store the original prompt in state for potential later saving
    if (skipSave) {
        const originalPrompt = textarea.value.trim();
        state._unsavedPrompt = originalPrompt;
        state._unsavedProvider = state.provider;
        state._unsavedModel = state.model;
    }
    
    // Update empty message to indicate skip save status
    if (skipSave) {
        const emptyMessage = historySection.querySelector('.llm-history-empty');
        if (emptyMessage) {
            emptyMessage.textContent = 'History saving disabled for this generation';
            emptyMessage.style.display = 'block';
        }
    }
    
    // Save user message to conversation history (unless skip save is checked)
    if (!skipSave) {
        const originalPrompt = textarea.value.trim(); // Save original without extras
        addMessageToHistory(state, 'user', originalPrompt, {
            provider: state.provider,
            model: state.model
        });
    }
    
    // Clear any previous error/status when starting new generation
    showStatus(responseSection, '', '');
    
    // Update UI for generation
    state.generating = true;
    sendBtn.disabled = true;
    stopBtn.style.display = 'inline-block';
    responseSection.querySelector('.llm-copy-btn').style.display = 'none';
    responseSection.querySelector('.llm-copy-to-node-btn').style.display = 'none';
    const sendToPromptBtn = responseSection.querySelector('.llm-send-to-prompt-btn');
    if (sendToPromptBtn) sendToPromptBtn.style.display = 'none';
    
    const responseDisplay = responseSection.querySelector('.llm-response-display');
    responseDisplay.innerHTML = '';
    responseDisplay.classList.add('generating');
    
    showStatus(responseSection, 'Generating...', 'info');
    
    try {
        let fullResponse = '';
        
        // Build options from state settings
        const options = buildGenerationOptions(state);
        
        // Check if we have images (vision mode)
        const hasImages = state.images && state.images.length > 0;
        
        if (hasImages) {
            // Use vision API
            const images = state.images.map(img => img.base64);
            
            // Debug: Log first image info
            console.log('[LLM] Sending images to API:', {
                count: images.length,
                firstImageLength: images[0]?.length,
                firstImagePreview: images[0]?.substring(0, 100)
            });
            
            state.streamController = await llmApi.generateVisionStream(
                {
                    provider: state.provider,
                    model: state.model,
                    prompt: prompt,
                    images: images,
                    system_prompt: state.settings.systemPrompt || undefined,
                    options: options
                },
                // onChunk callback
                (chunk, done, full) => {
                    if (chunk) {
                        fullResponse += chunk;
                        responseDisplay.textContent = fullResponse;
                        // Auto-scroll to bottom
                        responseDisplay.scrollTop = responseDisplay.scrollHeight;
                    }
                    
                    if (done) {
                        onGenerationComplete(state, fullResponse, responseSection, sendBtn, stopBtn, historySection, updateConversationList);
                    }
                },
                // onError callback
                (error) => {
                    onGenerationError(state, error, responseSection, sendBtn, stopBtn);
                }
            );
        } else {
            // Use text-only API
            state.streamController = await llmApi.generateStream(
                {
                    provider: state.provider,
                    model: state.model,
                    prompt: prompt,
                    system_prompt: state.settings.systemPrompt || undefined,
                    options: options
                },
                // onChunk callback
                (chunk, done, full) => {
                    if (chunk) {
                        fullResponse += chunk;
                        responseDisplay.textContent = fullResponse;
                        // Auto-scroll to bottom
                        responseDisplay.scrollTop = responseDisplay.scrollHeight;
                    }
                    
                    if (done) {
                        onGenerationComplete(state, fullResponse, responseSection, sendBtn, stopBtn, historySection, updateConversationList);
                    }
                },
                // onError callback
                (error) => {
                    onGenerationError(state, error, responseSection, sendBtn, stopBtn);
                }
            );
        }
        
    } catch (error) {
        onGenerationError(state, error, responseSection, sendBtn, stopBtn);
    }
}

/**
 * Handle stop button click
 * @param {Object} state - Tab state object
 * @param {HTMLElement} responseSection - Response section
 * @param {HTMLButtonElement} sendBtn - Send button
 * @param {HTMLButtonElement} stopBtn - Stop button
 */
export function handleStop(state, responseSection, sendBtn, stopBtn) {
    if (state.streamController) {
        state.streamController.stop();
        state.streamController = null;
    }
    
    state.generating = false;
    sendBtn.disabled = false;
    stopBtn.style.display = 'none';
    
    const responseDisplay = responseSection.querySelector('.llm-response-display');
    responseDisplay.classList.remove('generating');
    
    showStatus(responseSection, 'Generation stopped', 'warning');
}

/**
 * Handle copy button click
 * @param {HTMLElement} responseSection - Response section
 * @param {HTMLButtonElement} copyBtn - Copy button
 */
export async function handleCopy(responseSection, copyBtn) {
    const responseDisplay = responseSection.querySelector('.llm-response-display');
    const text = responseDisplay.textContent;
    
    try {
        await navigator.clipboard.writeText(text);
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '✓ Copied!';
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
        }, 2000);
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        showStatus(responseSection, 'Failed to copy to clipboard', 'error');
    }
}

/**
 * Handle copy to node button click
 * @param {HTMLElement} responseSection - Response section
 * @param {HTMLButtonElement} copyToNodeBtn - Copy to node button
 * @param {Object} app - ComfyUI app instance
 */
export function handleCopyToNode(responseSection, copyToNodeBtn, app) {
    const responseDisplay = responseSection.querySelector('.llm-response-display');
    const text = responseDisplay.textContent;
    
    const success = copyTextToSelectedNode(app, text);
    
    if (success) {
        const originalText = copyToNodeBtn.innerHTML;
        copyToNodeBtn.innerHTML = '✓ Copied!';
        showStatus(responseSection, 'Response copied to selected node', 'success');
        setTimeout(() => {
            copyToNodeBtn.innerHTML = originalText;
        }, 2000);
    } else {
        showStatus(responseSection, 'Please select a CLIPTextEncode or Sage text node first', 'error');
    }
}

/**
 * Handle copy from node button click
 * @param {HTMLTextAreaElement} textarea - The prompt textarea element
 * @param {Object} app - ComfyUI app instance
 * @param {Function} showNotification - Notification function
 */
export function handleCopyFromNode(textarea, app, showNotification) {
    const result = copyTextFromSelectedNode(app);
    
    if (result.success) {
        textarea.value = result.text;
        // Trigger input event to update character counter
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        showNotification(`Text copied from ${result.nodeType} node!`, 'success');
    } else {
        showNotification(result.error || 'Please select a CLIPTextEncode or Sage text node first', 'error');
    }
}

/**
 * Build generation options from state settings
 * @param {Object} state - Tab state object
 * @returns {Object} - Generation options
 */
function buildGenerationOptions(state) {
    const options = {
        temperature: state.settings.temperature,
        seed: state.settings.seed,
        max_tokens: state.settings.maxTokens,
        keep_alive: state.settings.keepAlive
    };
    
    // Add provider-specific options
    if (state.provider === 'ollama') {
        options.num_keep = state.settings.numKeep;
        options.num_predict = state.settings.numPredict;
        options.top_k = state.settings.topK;
        options.top_p = state.settings.topP;
        options.repeat_last_n = state.settings.repeatLastN;
        options.repeat_penalty = state.settings.repeatPenalty;
        options.presence_penalty = state.settings.presencePenalty;
        options.frequency_penalty = state.settings.frequencyPenalty;
    } else if (state.provider === 'lmstudio') {
        options.topKSampling = state.settings.lmsTopK;
        options.topPSampling = state.settings.lmsTopP;
        options.repeatPenalty = state.settings.lmsRepeatPenalty;
        options.minPSampling = state.settings.lmsMinP;
    }
    
    return options;
}

/**
 * Called when generation completes successfully
 */
async function onGenerationComplete(state, fullResponse, responseSection, sendBtn, stopBtn, historySection, updateConversationList) {
    // Check if we should skip saving to history
    const skipSaveCheckbox = document.querySelector('.llm-skip-save-checkbox');
    const skipSave = skipSaveCheckbox && skipSaveCheckbox.checked;
    
    // Save assistant response to conversation history (unless skip save is checked)
    if (!skipSave) {
        addMessageToHistory(state, 'assistant', fullResponse, {
            provider: state.provider,
            model: state.model
        });
    } else {
        // Store response for potential later saving
        state._unsavedResponse = fullResponse;
    }
    
    // Update history list UI
    if (historySection && updateConversationList) {
        updateConversationList(state, historySection, responseSection);
        
        // Also render the current conversation's messages (only if not skipping save)
        if (!skipSave) {
            const { renderHistory } = await import('./llmHistorySection.js');
            const currentConversation = state.conversationHistory?.find(c => c.id === state.currentConversationId);
            if (currentConversation) {
                // Delete handler for individual messages
                const handleDeleteMessage = (index) => {
                    currentConversation.messages.splice(index, 1);
                    currentConversation.updated = Date.now();
                    saveConversationHistory(state.conversationHistory);
                    renderHistory(historySection, currentConversation.messages, handleDeleteMessage);
                    updateConversationList(state, historySection, responseSection);
                };
                
                renderHistory(historySection, currentConversation.messages, handleDeleteMessage);
            }
        }
    }
    
    // Reset the skip save checkbox after generation
    if (skipSaveCheckbox) {
        skipSaveCheckbox.checked = false;
    }
    
    // Show/hide Save to History button based on skipSave state
    const saveToHistoryBtn = responseSection?.querySelector('.llm-save-to-history-btn');
    if (saveToHistoryBtn) {
        if (skipSave) {
            saveToHistoryBtn.style.display = 'inline-block';
        } else {
            saveToHistoryBtn.style.display = 'none';
        }
    }
    
    // Reset empty message text back to default
    const emptyMessage = historySection.querySelector('.llm-history-empty');
    if (emptyMessage && !skipSave) {
        // If we saved history, the message will be hidden anyway
        emptyMessage.textContent = 'No conversation history yet';
    } else if (emptyMessage && skipSave) {
        // If we skipped saving, reset message for next time
        emptyMessage.textContent = 'No conversation history yet';
    }
    
    state.generating = false;
    state.streamController = null;
    sendBtn.disabled = false;
    stopBtn.style.display = 'none';
    
    const responseDisplay = responseSection.querySelector('.llm-response-display');
    responseDisplay.classList.remove('generating');
    
    responseSection.querySelector('.llm-copy-btn').style.display = 'inline-block';
    responseSection.querySelector('.llm-copy-to-node-btn').style.display = 'inline-block';
    const sendToPromptBtn = responseSection.querySelector('.llm-send-to-prompt-btn');
    if (sendToPromptBtn) sendToPromptBtn.style.display = 'inline-block';
    
    showStatus(responseSection, 'Generation complete', 'success');
}

/**
 * Called when generation encounters an error
 */
function onGenerationError(state, error, responseSection, sendBtn, stopBtn) {
    state.generating = false;
    state.streamController = null;
    sendBtn.disabled = false;
    stopBtn.style.display = 'none';
    
    const responseDisplay = responseSection.querySelector('.llm-response-display');
    responseDisplay.classList.remove('generating');
    
    showStatus(responseSection, `Error: ${error.message}`, 'error');
}

/**
 * Show status message in response section
 * @param {HTMLElement} responseSection - Response section
 * @param {string} message - Status message
 * @param {string} type - Message type: 'info', 'success', 'warning', 'error'
 */
function showStatus(responseSection, message, type) {
    const statusMessage = responseSection.querySelector('.llm-status-message');
    statusMessage.textContent = message;
    statusMessage.className = `llm-status-message llm-status-${type}`;
    statusMessage.style.display = message ? 'block' : 'none';
    
    // Auto-hide after 5 seconds (except errors)
    if (type !== 'error' && message) {
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 5000);
    }
}

// ========== Conversation Management ==========

/**
 * Add a message to conversation history
 * @param {Object} state - Tab state object
 * @param {string} role - Message role ('user' or 'assistant')
 * @param {string} content - Message content
 * @param {Object} metadata - Additional metadata
 */
export function addMessageToHistory(state, role, content, metadata = {}) {
    if (!state.currentConversationId) {
        // Start a new conversation
        state.currentConversationId = generateConversationId();
        state.conversationHistory = loadConversationHistory();
    }
    
    // Find or create current conversation
    let conversation = state.conversationHistory.find(c => c.id === state.currentConversationId);
    if (!conversation) {
        conversation = {
            id: state.currentConversationId,
            title: generateConversationTitle(content),
            created: Date.now(),
            updated: Date.now(),
            messages: [],
            metadata: {
                provider: state.provider,
                model: state.model,
                ...metadata
            }
        };
        state.conversationHistory.unshift(conversation);
    }
    
    // Add message
    conversation.messages.push({
        role,
        content,
        timestamp: Date.now()
    });
    
    conversation.updated = Date.now();
    
    // Save to localStorage
    saveConversationHistory(state.conversationHistory);
}

/**
 * Start a new conversation
 * @param {Object} state - Tab state object
 */
/**
 * Start a new conversation
 * @param {Object} state - Tab state object
 */
export function startNewConversation(state) {
    state.currentConversationId = null;
    state.currentConversationMessages = [];
}

/**
 * Load a specific conversation
 * @param {Object} state - Tab state object
 * @param {string} conversationId - Conversation ID to load
 * @returns {Object|null} - Conversation object or null if not found
 */
export function loadConversation(state, conversationId) {
    const history = loadConversationHistory();
    const conversation = history.find(c => c.id === conversationId);
    
    if (conversation) {
        state.currentConversationId = conversationId;
        state.currentConversationMessages = [...conversation.messages];
        return conversation;
    }
    
    return null;
}

/**
 * Delete a conversation from history
 * @param {Object} state - Tab state object
 * @param {string} conversationId - Conversation ID to delete
 */
export function deleteConversation(state, conversationId) {
    state.conversationHistory = state.conversationHistory.filter(c => c.id !== conversationId);
    saveConversationHistory(state.conversationHistory);
    
    // If deleting current conversation, start new one
    if (state.currentConversationId === conversationId) {
        startNewConversation(state);
    }
}

/**
 * Save conversation history to localStorage
 * @param {Array} conversations - Array of conversation objects
 */
export function saveConversationHistory(conversations) {
    try {
        localStorage.setItem('llm_conversation_history', JSON.stringify(conversations));
    } catch (error) {
        console.error('Error saving conversation history:', error);
    }
}

/**
 * Load conversation history from localStorage
 * @returns {Array} - Array of conversation objects
 */
export function loadConversationHistory() {
    try {
        const saved = localStorage.getItem('llm_conversation_history');
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error('Error loading conversation history:', error);
        return [];
    }
}

/**
 * Generate a unique conversation ID
 * @returns {string} - Unique ID
 */
function generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a conversation title from the first user message
 * @param {string} content - Message content
 * @returns {string} - Conversation title
 */
function generateConversationTitle(content) {
    const maxLength = 50;
    const title = content.trim().split('\n')[0]; // First line
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
}

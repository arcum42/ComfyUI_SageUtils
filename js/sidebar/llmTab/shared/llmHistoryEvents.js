/**
 * LLM History & Conversation Events Module
 * Handles conversation history UI events (new/export/import/clear/skip-save/save-to-history)
 */

import { addMessageToHistory, startNewConversation, saveConversationHistory } from '../compose/llmGenerationHandler.js';
import { renderHistory as llmRenderHistory, updateConversationList as llmUpdateConvList } from '../chat/llmHistorySection.js';

// ────────────────────────────────────────
// New Conversation Handler
// ────────────────────────────────────────

/**
 * Start a new conversation.
 */
export async function handleNewConversationClick(state, historySection, responseSection) {
        // Use top-level imported function directly
    const startNew = startNewConversation;
    
    // Clear current state
    state.conversationHistory = [];
    state.currentConversationId = null;
    
    // Render empty history
    llmRenderHistory(historySection, []);
    
    // Update conversation list sidebar
    if (typeof llmUpdateConvList === 'function') {
        llmUpdateConvList(state, historySection, responseSection);
    }
    
    // Clear response display
    const responseDisplay = responseSection?.querySelector('.llm-response-display');
    if (responseDisplay) {
        responseDisplay.textContent = '';
    }
}

// ────────────────────────────────────────
// Export Handler
// ────────────────────────────────────────

/**
 * Export conversation history to JSON file.
 */
export function handleExportClick(state) {
    if (!state.conversationHistory || state.conversationHistory.length === 0) {
        alert('No conversation history to export');
        return;
    }
    
    const dataStr = JSON.stringify(state.conversationHistory, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `llm_conversations_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ────────────────────────────────────────
// Import Handler
// ────────────────────────────────────────

/**
 * Import conversation history from JSON file.
 */
export async function handleImportClick(state, historySection, responseSection) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const imported = JSON.parse(text);
            
            if (!Array.isArray(imported)) {
                alert('Invalid conversation history format');
                return;
            }
            
            // Merge with existing history (avoid duplicates)
            const existingIds = new Set(state.conversationHistory.map(c => c.id));
            const newConversations = imported.filter(c => !existingIds.has(c.id));
            
            state.conversationHistory = [...state.conversationHistory, ...newConversations];
            saveConversationHistory(state.conversationHistory);
            
            if (typeof llmUpdateConvList === 'function') {
                llmUpdateConvList(state, historySection, responseSection);
            }
            
            alert(`Imported ${newConversations.length} conversations`);
        } catch (error) {
            console.error('[LLM History Events] Import error:', error);
            alert('Failed to import conversation history: ' + error.message);
        }
    };
    
    input.click();
}

// ────────────────────────────────────────
// Clear Handler
// ────────────────────────────────────────

/**
 * Clear all conversation history.
 */
export async function handleClearClick(state, historySection, responseSection) {
    if (!confirm('Clear all conversation history? This cannot be undone.')) {
        return;
    }
    
    state.conversationHistory = [];
    state.currentConversationId = null;
    saveConversationHistory([]);
    
    llmRenderHistory(historySection, []);
    
    if (typeof llmUpdateConvList === 'function') {
        llmUpdateConvList(state, historySection, responseSection);
    }
    
    // Clear response display
    const responseDisplay = responseSection?.querySelector('.llm-response-display');
    if (responseDisplay) {
        responseDisplay.textContent = '';
    }
}

// ────────────────────────────────────────
// Skip-Save Checkbox Handler
// ────────────────────────────────────────

/**
 * Handle skip-save checkbox change — updates the empty message text in real-time.
 */
export function handleSkipSaveCheckboxChange(historySection) {
    const checkbox = historySection.querySelector('.llm-skip-save-checkbox');
    if (!checkbox) return;

    const emptyMessage = historySection.querySelector('.llm-history-empty');
    
    if (!emptyMessage || emptyMessage.classList.contains('llm-hidden')) {
        return;
    }

    checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
            emptyMessage.textContent = 'History saving disabled (uncheck to save)';
        } else {
            emptyMessage.textContent = 'No conversation history yet';
        }
    });
}

// ────────────────────────────────────────
// Save-to-History Handler
// ────────────────────────────────────────

/**
 * Handle "save to history" button click — retroactively saves unsaved conversation.
 */
export async function handleSaveToHistoryClick(saveToHistoryBtn, state, historySection, responseSection) {
    if (!state._unsavedPrompt || !state._unsavedResponse) {
        console.warn('[LLM History Events] No unsaved conversation to save');
        return;
    }

    // Save user message
    addMessageToHistory(state, 'user', state._unsavedPrompt, {
        provider: state._unsavedProvider,
        model: state._unsavedModel
    });

    // Save assistant response
    addMessageToHistory(state, 'assistant', state._unsavedResponse, {
        provider: state._unsavedProvider,
        model: state._unsavedModel
    });


    // Update conversation list UI
    if (updateConversationList) {
        updateConversationList(state, historySection, responseSection);
    }

    // Render the current conversation's messages
    const currentConversation = state.conversationHistory?.find(c => c.id === state.currentConversationId);
    if (currentConversation) {
        const handleDeleteMessage = (index) => {
            currentConversation.messages.splice(index, 1);
            currentConversation.updated = Date.now();
            saveConversationHistory(state.conversationHistory);
            llmRenderHistory(historySection, currentConversation.messages, handleDeleteMessage);
            updateConversationList(state, historySection, responseSection);
        };

        llmRenderHistory(historySection, currentConversation.messages, handleDeleteMessage);
    }

    // Hide the button
    saveToHistoryBtn.classList.add('llm-hidden');
    console.log('[LLM History Events] Conversation saved to history');
}

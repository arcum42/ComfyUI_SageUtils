/**
 * LLM History Section Component
 * Manages conversation history display, export, import, and clearing
 */

import { createSection } from '../../components/layout.js';

/**
 * Creates the conversation history section
 * @returns {HTMLElement} - History section element
 */
export function createHistorySection() {
    // Create content first (since createSection needs it)
    const content = document.createElement('div');
    content.className = 'llm-history-section-content';
    
    const section = createSection('📜 Conversation History', content, {
        collapsible: true,
        collapsed: true,
        className: 'llm-history-section'
    });
    
    // Conversation list (saved conversations)
    const conversationListHeader = document.createElement('h4');
    conversationListHeader.className = 'llm-subsection-header';
    conversationListHeader.textContent = 'Saved Conversations';
    
    const conversationList = document.createElement('div');
    conversationList.className = 'llm-conversation-list';
    
    // Empty state for conversation list
    const conversationEmptyMessage = document.createElement('p');
    conversationEmptyMessage.className = 'llm-placeholder';
    conversationEmptyMessage.textContent = 'No conversations yet...';
    conversationList.appendChild(conversationEmptyMessage);
    
    // New conversation button
    const newConversationBtn = document.createElement('button');
    newConversationBtn.className = 'llm-btn llm-btn-primary llm-btn-small llm-new-conversation-btn';
    newConversationBtn.innerHTML = '➕ New Conversation';
    newConversationBtn.title = 'Start a new conversation';
    
    // Message history (current conversation messages)
    const historyHeader = document.createElement('h4');
    historyHeader.className = 'llm-subsection-header';
    historyHeader.textContent = 'Current Messages';
    historyHeader.style.marginTop = '16px';
    
    const historyList = document.createElement('div');
    historyList.className = 'llm-history-list';
    
    // Empty state message
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'llm-history-empty';
    emptyMessage.textContent = 'No conversation history yet';
    historyList.appendChild(emptyMessage);
    
    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'llm-history-actions';
    
    const exportBtn = document.createElement('button');
    exportBtn.className = 'llm-btn llm-btn-secondary llm-btn-small llm-export-history-btn';
    exportBtn.innerHTML = '📥 Export';
    exportBtn.title = 'Export conversation history';
    
    const importBtn = document.createElement('button');
    importBtn.className = 'llm-btn llm-btn-secondary llm-btn-small llm-import-history-btn';
    importBtn.innerHTML = '📤 Import';
    importBtn.title = 'Import conversation history from JSON';
    
    const clearBtn = document.createElement('button');
    clearBtn.className = 'llm-btn llm-btn-danger llm-btn-small llm-clear-history-btn';
    clearBtn.innerHTML = '🗑️ Clear';
    clearBtn.title = 'Clear conversation history';
    
    actions.appendChild(exportBtn);
    actions.appendChild(importBtn);
    actions.appendChild(clearBtn);
    
    content.appendChild(conversationListHeader);
    content.appendChild(conversationList);
    content.appendChild(newConversationBtn);
    content.appendChild(historyHeader);
    content.appendChild(historyList);
    content.appendChild(actions);
    
    return section;
}

/**
 * Render the history list in the UI
 * @param {HTMLElement} historySection - History section element
 * @param {Array} history - Array of message objects
 * @param {Function} onDelete - Optional callback when message is deleted (index)
 */
export function renderHistory(historySection, history, onDelete = null) {
    const historyList = historySection.querySelector('.llm-history-list');
    const emptyMessage = historyList.querySelector('.llm-history-empty');
    
    if (!history || history.length === 0) {
        emptyMessage.style.display = 'block';
        // Remove all history items
        historyList.querySelectorAll('.llm-history-item').forEach(item => item.remove());
        return;
    }
    
    emptyMessage.style.display = 'none';
    
    // Clear existing items
    historyList.querySelectorAll('.llm-history-item').forEach(item => item.remove());
    
    // Render each message
    history.forEach((message, index) => {
        const item = createHistoryItem(message, index, onDelete);
        historyList.appendChild(item);
    });
}

/**
 * Create a single history item element
 * @param {Object} message - Message object with role, content, images
 * @param {number} index - Message index
 * @param {Function} onDelete - Optional callback when message is deleted
 * @returns {HTMLElement} - History item element
 */
function createHistoryItem(message, index, onDelete = null) {
    const item = document.createElement('div');
    item.className = `llm-history-item llm-history-${message.role}`;
    item.dataset.index = index;
    
    // Header (collapsible)
    const header = document.createElement('div');
    header.className = 'llm-history-header';
    
    const roleIcon = message.role === 'user' ? '👤' : '🤖';
    const roleLabel = message.role === 'user' ? 'User' : 'Assistant';
    
    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'llm-history-toggle';
    toggleIcon.textContent = '▼';
    
    const roleSpan = document.createElement('span');
    roleSpan.className = 'llm-history-role';
    roleSpan.textContent = `${roleIcon} ${roleLabel}`;
    
    const timestamp = document.createElement('span');
    timestamp.className = 'llm-history-timestamp';
    timestamp.textContent = formatTimestamp(message.timestamp);
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'llm-history-delete';
    deleteBtn.innerHTML = '×';
    deleteBtn.title = 'Remove this message';
    deleteBtn.dataset.index = index;
    deleteBtn.onclick = (e) => {
        e.stopPropagation(); // Prevent header click
        if (onDelete && confirm('Remove this message from history?')) {
            onDelete(index);
        }
    };
    
    header.appendChild(toggleIcon);
    header.appendChild(roleSpan);
    header.appendChild(timestamp);
    header.appendChild(deleteBtn);
    
    item.appendChild(header);
    
    // Content container (collapsible)
    const contentContainer = document.createElement('div');
    contentContainer.className = 'llm-history-content-container';
    
    // Images (if present)
    if (message.images && message.images.length > 0) {
        const imagesContainer = document.createElement('div');
        imagesContainer.className = 'llm-history-images';
        
        message.images.forEach((imageData, imgIndex) => {
            const img = document.createElement('img');
            img.src = imageData;
            img.className = 'llm-history-image';
            img.alt = `Uploaded image ${imgIndex + 1}`;
            img.loading = 'lazy';
            imagesContainer.appendChild(img);
        });
        
        contentContainer.appendChild(imagesContainer);
    }
    
    // Content (always show full content, preserving line breaks)
    const content = document.createElement('div');
    content.className = 'llm-history-content';
    content.textContent = message.content;
    
    contentContainer.appendChild(content);
    item.appendChild(contentContainer);
    
    // Make header clickable to toggle collapse
    header.style.cursor = 'pointer';
    header.onclick = () => {
        const isCollapsed = contentContainer.style.display === 'none';
        contentContainer.style.display = isCollapsed ? 'block' : 'none';
        toggleIcon.textContent = isCollapsed ? '▼' : '▶';
        item.classList.toggle('collapsed', !isCollapsed);
    };
    
    return item;
}

/**
 * Truncate long content for display
 * @param {string} content - Full content text
 * @returns {string} - Truncated content
 */
function truncateContent(content) {
    if (content.length <= 200) {
        return content;
    }
    return content.substring(0, 200) + '...';
}

/**
 * Format timestamp for display
 * @param {number} timestamp - Unix timestamp
 * @returns {string} - Formatted time string
 */
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    // Relative time if recent
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    // Absolute time if older
    const options = { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString(undefined, options);
}

/**
 * Export history as JSON file
 * @param {Array} history - Conversation history
 * @param {string} filename - Export filename
 */
export function exportHistoryAsJSON(history, filename = 'llm-conversation.json') {
    const dataStr = JSON.stringify(history, null, 2);
    downloadFile(dataStr, filename, 'application/json');
}

/**
 * Export history as plain text file
 * @param {Array} history - Conversation history
 * @param {string} filename - Export filename
 */
export function exportHistoryAsText(history, filename = 'llm-conversation.txt') {
    const lines = [];
    
    history.forEach(message => {
        const role = message.role === 'user' ? 'USER' : 'ASSISTANT';
        const timestamp = formatTimestamp(message.timestamp);
        lines.push(`[${timestamp}] ${role}:`);
        lines.push(message.content);
        lines.push(''); // Empty line between messages
    });
    
    const text = lines.join('\n');
    downloadFile(text, filename, 'text/plain');
}

/**
 * Export history as Markdown file
 * @param {Array} history - Conversation history
 * @param {string} filename - Export filename
 */
export function exportHistoryAsMarkdown(history, filename = 'llm-conversation.md') {
    const lines = ['# LLM Conversation', ''];
    
    history.forEach(message => {
        const role = message.role === 'user' ? '👤 **User**' : '🤖 **Assistant**';
        const timestamp = formatTimestamp(message.timestamp);
        lines.push(`## ${role} _(${timestamp})_`);
        lines.push('');
        lines.push(message.content);
        lines.push('');
    });
    
    const markdown = lines.join('\n');
    downloadFile(markdown, filename, 'text/markdown');
}

/**
 * Import history from JSON file
 * @returns {Promise<Array>} - Imported history array
 */
export function importHistory() {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            try {
                const file = e.target.files[0];
                if (!file) {
                    reject(new Error('No file selected'));
                    return;
                }
                
                const text = await file.text();
                const history = JSON.parse(text);
                
                // Validate history structure
                if (!Array.isArray(history)) {
                    throw new Error('Invalid history format: expected array');
                }
                
                // Validate each message
                history.forEach((msg, index) => {
                    if (!msg.role || !msg.content) {
                        throw new Error(`Invalid message at index ${index}: missing role or content`);
                    }
                    if (!['user', 'assistant'].includes(msg.role)) {
                        throw new Error(`Invalid message at index ${index}: invalid role "${msg.role}"`);
                    }
                });
                
                resolve(history);
            } catch (error) {
                reject(error);
            }
        };
        
        input.click();
    });
}

/**
 * Download a file to the user's computer
 * @param {string} content - File content
 * @param {string} filename - Filename
 * @param {string} mimeType - MIME type
 */
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Update conversation list UI
 * @param {Object} state - Tab state object
 * @param {HTMLElement} historySection - History section element
 * @param {HTMLElement} responseSection - Response section element
 */
export function updateConversationList(state, historySection, responseSection) {
    const conversationList = historySection.querySelector('.llm-conversation-list');
    if (!conversationList) return;
    
    if (!state.conversationHistory || state.conversationHistory.length === 0) {
        conversationList.innerHTML = '<p class="llm-placeholder">No conversations yet...</p>';
        return;
    }
    
    conversationList.innerHTML = '';
    
    state.conversationHistory.forEach(conversation => {
        const item = document.createElement('div');
        item.className = 'llm-conversation-item';
        if (conversation.id === state.currentConversationId) {
            item.classList.add('active');
        }
        
        const itemHeader = document.createElement('div');
        itemHeader.className = 'llm-conversation-item-header';
        
        const itemTitle = document.createElement('div');
        itemTitle.className = 'llm-conversation-item-title';
        itemTitle.textContent = conversation.title;
        itemTitle.title = conversation.title;
        
        const itemActions = document.createElement('div');
        itemActions.className = 'llm-conversation-item-actions';
        
        const exportBtn = document.createElement('button');
        exportBtn.className = 'llm-btn-icon';
        exportBtn.innerHTML = '💾';
        exportBtn.title = 'Export conversation';
        exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showExportMenu(conversation, exportBtn);
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'llm-btn-icon llm-btn-danger-icon';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Delete conversation';
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('Delete this conversation?')) {
                // Import deleteConversation dynamically to avoid circular dependency
                const { deleteConversation } = await import('./llmGenerationHandler.js');
                deleteConversation(state, conversation.id);
                updateConversationList(state, historySection, responseSection);
            }
        });
        
        itemActions.appendChild(exportBtn);
        itemActions.appendChild(deleteBtn);
        
        itemHeader.appendChild(itemTitle);
        itemHeader.appendChild(itemActions);
        
        const itemMeta = document.createElement('div');
        itemMeta.className = 'llm-conversation-item-meta';
        const date = new Date(conversation.updated).toLocaleString();
        const messageCount = conversation.messages.length;
        itemMeta.textContent = `${date} • ${messageCount} message${messageCount !== 1 ? 's' : ''}`;
        
        item.appendChild(itemHeader);
        item.appendChild(itemMeta);
        
        // Click to load conversation
        item.addEventListener('click', async () => {
            await loadAndDisplayConversation(state, conversation.id, historySection, responseSection);
        });
        
        conversationList.appendChild(item);
    });
}

/**
 * Show export menu for a conversation
 * @param {Object} conversation - Conversation object
 * @param {HTMLElement} button - Button element that triggered the menu
 */
function showExportMenu(conversation, button) {
    // Remove any existing menu
    const existingMenu = document.querySelector('.llm-export-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    const menu = document.createElement('div');
    menu.className = 'llm-export-menu';
    
    const exportJSON = document.createElement('button');
    exportJSON.textContent = 'Export as JSON';
    exportJSON.className = 'llm-export-menu-item';
    exportJSON.addEventListener('click', () => {
        downloadConversation(conversation, 'json');
        menu.remove();
    });
    
    const exportText = document.createElement('button');
    exportText.textContent = 'Export as Text';
    exportText.className = 'llm-export-menu-item';
    exportText.addEventListener('click', () => {
        downloadConversation(conversation, 'text');
        menu.remove();
    });
    
    menu.appendChild(exportJSON);
    menu.appendChild(exportText);
    
    // Position menu next to button
    const rect = button.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 5}px`;
    menu.style.left = `${rect.left}px`;
    
    document.body.appendChild(menu);
    
    // Close menu when clicking outside
    setTimeout(() => {
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        document.addEventListener('click', closeMenu);
    }, 100);
}

/**
 * Load and display a conversation
 * @param {Object} state - Tab state object
 * @param {string} conversationId - Conversation ID to load
 * @param {HTMLElement} historySection - History section element
 * @param {HTMLElement} responseSection - Response section element
 */
async function loadAndDisplayConversation(state, conversationId, historySection, responseSection) {
    // Import loadConversation dynamically to avoid circular dependency
    const { loadConversation, saveConversationHistory } = await import('./llmGenerationHandler.js');
    const conversation = loadConversation(state, conversationId);
    if (!conversation) return;
    
    // Update active state in list
    updateConversationList(state, historySection, responseSection);
    
    // Render conversation messages in history section
    const handleDeleteMessage = (index) => {
        conversation.messages.splice(index, 1);
        conversation.updated = Date.now();
        saveConversationHistory(state.conversationHistory);
        renderHistory(historySection, conversation.messages, handleDeleteMessage);
        updateConversationList(state, historySection, responseSection);
    };
    
    renderHistory(historySection, conversation.messages, handleDeleteMessage);
    
    // Display conversation messages in response section
    const responseDisplay = responseSection.querySelector('.llm-response-display');
    if (responseDisplay) {
        // Build formatted conversation display
        let displayText = '';
        conversation.messages.forEach((msg, index) => {
            const timestamp = new Date(msg.timestamp).toLocaleString();
            const roleLabel = msg.role === 'user' ? '👤 User' : '🤖 Assistant';
            
            displayText += `${roleLabel} (${timestamp}):\n`;
            displayText += `${msg.content}\n`;
            
            // Add separator between messages (but not after last one)
            if (index < conversation.messages.length - 1) {
                displayText += '\n' + '─'.repeat(60) + '\n\n';
            }
        });
        
        responseDisplay.textContent = displayText;
        responseDisplay.scrollTop = 0; // Scroll to top
    }
    
    // Show status (import dynamically)
    const { showStatus } = await import('./llmResponseSection.js');
    showStatus(responseSection, `Loaded conversation: ${conversation.title}`, 'info');
}

/**
 * Download conversation in specified format
 * @param {Object} conversation - Conversation object
 * @param {string} format - Export format ('json' or 'text')
 */
function downloadConversation(conversation, format = 'json') {
    if (format === 'json') {
        const json = JSON.stringify(conversation, null, 2);
        downloadFile(json, `${conversation.title}.json`, 'application/json');
    } else if (format === 'text') {
        const lines = [];
        lines.push(conversation.title);
        lines.push('='.repeat(conversation.title.length));
        lines.push('');
        
        conversation.messages.forEach(msg => {
            const timestamp = new Date(msg.timestamp).toLocaleString();
            const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
            lines.push(`[${roleLabel}] ${timestamp}`);
            lines.push(msg.content);
            lines.push('');
        });
        
        downloadFile(lines.join('\n'), `${conversation.title}.txt`, 'text/plain');
    }
}

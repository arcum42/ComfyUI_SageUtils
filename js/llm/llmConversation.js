/**
 * LLM Conversation History Management
 * Handles persistence, CRUD operations, and export for conversation history
 */

/**
 * Conversation Manager Class
 * Encapsulates all conversation history operations
 */
export class LLMConversation {
    constructor() {
        this.currentConversationId = null;
        this.currentConversationMessages = [];
        this.conversationHistory = this.loadHistory();
    }

    /**
     * Save conversation history to localStorage
     * @param {Array} conversations - Array of conversation objects
     */
    saveHistory(conversations = null) {
        try {
            const toSave = conversations || this.conversationHistory;
            localStorage.setItem('llm_conversation_history', JSON.stringify(toSave));
        } catch (error) {
            console.error('Error saving conversation history:', error);
        }
    }

    /**
     * Load conversation history from localStorage
     * @returns {Array} - Array of conversation objects
     */
    loadHistory() {
        try {
            const saved = localStorage.getItem('llm_conversation_history');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading conversation history:', error);
            return [];
        }
    }

    /**
     * Add a message to the current conversation
     * @param {string} role - Message role: 'user' or 'assistant'
     * @param {string} content - Message content
     * @param {Object} metadata - Optional metadata (model, provider, etc.)
     */
    addMessage(role, content, metadata = {}) {
        if (!this.currentConversationId) {
            // Start a new conversation
            this.startNew();
        }

        // Find or create current conversation
        let conversation = this.conversationHistory.find(c => c.id === this.currentConversationId);
        if (!conversation) {
            conversation = {
                id: this.currentConversationId,
                title: this.generateTitle(content),
                created: Date.now(),
                updated: Date.now(),
                messages: [],
                metadata: {
                    ...metadata
                }
            };
            this.conversationHistory.unshift(conversation);
        }

        // Add message
        conversation.messages.push({
            role,
            content,
            timestamp: Date.now()
        });

        // Update conversation metadata
        conversation.updated = Date.now();

        // Update current messages array
        this.currentConversationMessages = [...conversation.messages];

        // Save to localStorage
        this.saveHistory();
    }

    /**
     * Generate a unique conversation ID
     * @returns {string} - Unique ID
     */
    generateId() {
        return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate a conversation title from the first user message
     * @param {string} content - Message content
     * @returns {string} - Conversation title
     */
    generateTitle(content) {
        const maxLength = 50;
        const title = content.trim().split('\n')[0]; // First line
        return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
    }

    /**
     * Start a new conversation
     */
    startNew() {
        this.currentConversationId = this.generateId();
        this.currentConversationMessages = [];
    }

    /**
     * Load a specific conversation
     * @param {string} conversationId - Conversation ID to load
     * @returns {Object|null} - Conversation object or null if not found
     */
    load(conversationId) {
        const conversation = this.conversationHistory.find(c => c.id === conversationId);

        if (conversation) {
            this.currentConversationId = conversationId;
            this.currentConversationMessages = [...conversation.messages];
            return conversation;
        }

        return null;
    }

    /**
     * Delete a conversation from history
     * @param {string} conversationId - Conversation ID to delete
     */
    delete(conversationId) {
        this.conversationHistory = this.conversationHistory.filter(c => c.id !== conversationId);
        this.saveHistory();

        // If deleting current conversation, start new one
        if (this.currentConversationId === conversationId) {
            this.startNew();
        }
    }

    /**
     * Clear all conversation history
     */
    clearAll() {
        this.conversationHistory = [];
        this.saveHistory();
        this.startNew();
    }

    /**
     * Export conversation as JSON
     * @param {Object} conversation - Conversation object to export
     * @returns {string} - JSON string
     */
    exportAsJSON(conversation) {
        return JSON.stringify(conversation, null, 2);
    }

    /**
     * Export conversation as plain text
     * @param {Object} conversation - Conversation object to export
     * @returns {string} - Formatted text
     */
    exportAsText(conversation) {
        const lines = [];
        lines.push(`Conversation: ${conversation.title}`);
        lines.push(`Created: ${new Date(conversation.created).toLocaleString()}`);
        lines.push(`Model: ${conversation.metadata.model} (${conversation.metadata.provider})`);
        lines.push('='.repeat(60));
        lines.push('');

        conversation.messages.forEach(msg => {
            const role = msg.role === 'user' ? 'USER' : 'ASSISTANT';
            const time = new Date(msg.timestamp).toLocaleTimeString();
            lines.push(`[${role}] ${time}`);
            lines.push(msg.content);
            lines.push('');
            lines.push('-'.repeat(60));
            lines.push('');
        });

        return lines.join('\n');
    }

    /**
     * Download conversation as file
     * @param {Object} conversation - Conversation object
     * @param {string} format - 'json' or 'text'
     */
    download(conversation, format = 'json') {
        const content = format === 'json'
            ? this.exportAsJSON(conversation)
            : this.exportAsText(conversation);

        const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation_${conversation.id}.${format === 'json' ? 'json' : 'txt'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Get all conversations
     * @returns {Array} - Array of conversation objects
     */
    getAll() {
        return this.conversationHistory;
    }

    /**
     * Get current conversation ID
     * @returns {string|null} - Current conversation ID or null
     */
    getCurrentId() {
        return this.currentConversationId;
    }

    /**
     * Get current conversation messages
     * @returns {Array} - Array of message objects
     */
    getCurrentMessages() {
        return this.currentConversationMessages;
    }

    /**
     * Import a conversation from JSON
     * @param {Object} imported - Conversation object to import
     * @param {boolean} overwrite - Whether to overwrite if exists
     * @returns {boolean} - Success status
     */
    import(imported, overwrite = false) {
        // Validate the imported conversation structure
        if (!imported.id || !imported.messages || !Array.isArray(imported.messages)) {
            throw new Error('Invalid conversation format');
        }

        // Check if conversation already exists
        const existingIndex = this.conversationHistory.findIndex(c => c.id === imported.id);
        if (existingIndex >= 0) {
            if (!overwrite) {
                return false; // Don't overwrite without permission
            }
            this.conversationHistory[existingIndex] = imported;
        } else {
            this.conversationHistory.push(imported);
        }

        this.saveHistory();
        return true;
    }
}

/**
 * Legacy function exports for backward compatibility
 * These wrap the class methods to maintain the original API
 */

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
export function generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a conversation title from the first user message
 * @param {string} content - Message content
 * @returns {string} - Conversation title
 */
export function generateConversationTitle(content) {
    const maxLength = 50;
    const title = content.trim().split('\n')[0]; // First line
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
}

/**
 * Export conversation as JSON
 * @param {Object} conversation - Conversation object to export
 * @returns {string} - JSON string
 */
export function exportConversationJSON(conversation) {
    return JSON.stringify(conversation, null, 2);
}

/**
 * Export conversation as plain text
 * @param {Object} conversation - Conversation object to export
 * @returns {string} - Formatted text
 */
export function exportConversationText(conversation) {
    const lines = [];
    lines.push(`Conversation: ${conversation.title}`);
    lines.push(`Created: ${new Date(conversation.created).toLocaleString()}`);
    lines.push(`Model: ${conversation.metadata.model} (${conversation.metadata.provider})`);
    lines.push('='.repeat(60));
    lines.push('');

    conversation.messages.forEach(msg => {
        const role = msg.role === 'user' ? 'USER' : 'ASSISTANT';
        const time = new Date(msg.timestamp).toLocaleTimeString();
        lines.push(`[${role}] ${time}`);
        lines.push(msg.content);
        lines.push('');
        lines.push('-'.repeat(60));
        lines.push('');
    });

    return lines.join('\n');
}

/**
 * Download conversation as file
 * @param {Object} conversation - Conversation object
 * @param {string} format - 'json' or 'text'
 */
export function downloadConversation(conversation, format = 'json') {
    const content = format === 'json'
        ? exportConversationJSON(conversation)
        : exportConversationText(conversation);

    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation_${conversation.id}.${format === 'json' ? 'json' : 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

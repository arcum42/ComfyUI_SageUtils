/**
 * Cross-Tab Messaging System
 * 
 * Centralized event bus for communication between sidebar tabs.
 * Message types: image-transfer, text-to-llm, text-to-prompt-builder,
 *   tab-switch-request, notification, state-sync, llm-state-request/response,
 *   llm-preset-applied, tab-switched.
 */

let eventBus = null;

class CrossTabMessaging {
    constructor() {
        this.listeners = new Map();
        this.messageQueue = [];
        this.debug = false;
    }

    subscribe(messageType, callback) {
        if (!this.listeners.has(messageType)) {
            this.listeners.set(messageType, new Set());
        }
        this.listeners.get(messageType).add(callback);
        return () => {
            const callbacks = this.listeners.get(messageType);
            if (callbacks) {
                callbacks.delete(callback);
                if (callbacks.size === 0) this.listeners.delete(messageType);
            }
        };
    }

    publish(messageType, data) {
        const message = { type: messageType, data, timestamp: Date.now() };
        this.messageQueue.push(message);
        if (this.messageQueue.length > 100) this.messageQueue.shift();
        const callbacks = this.listeners.get(messageType);
        if (callbacks) {
            callbacks.forEach(cb => {
                try { cb(message); }
                catch (error) { console.error(`[CrossTab] Error in callback for "${messageType}":`, error); }
            });
        }
    }

    setDebug(enabled) { this.debug = enabled; }
    getHistory(count = 10) { return this.messageQueue.slice(-count); }
    clearAll() { this.listeners.clear(); }
}

export function getEventBus() {
    if (!eventBus) eventBus = new CrossTabMessaging();
    return eventBus;
}

/**
 * Message type constants — only types that are actually published or subscribed to.
 */
export const MessageTypes = {
    IMAGE_TRANSFER: 'image-transfer',
    TEXT_TO_LLM: 'text-to-llm',
    TEXT_TO_PROMPT_BUILDER: 'text-to-prompt-builder',
    TAB_SWITCH_REQUEST: 'tab-switch-request',
    TAB_SWITCHED: 'tab-switched',
    STATE_SYNC: 'state-sync',
    NOTIFICATION: 'notification',
    LLM_STATE_REQUEST: 'llm-state-request',
    LLM_STATE_RESPONSE: 'llm-state-response',
    LLM_PRESET_APPLIED: 'llm-preset-applied'
};

/**
 * Helper: send images to LLM tab.
 */
export function sendImagesToLLM(images, options = {}) {
    const bus = getEventBus();
    bus.publish(MessageTypes.IMAGE_TRANSFER, {
        images, source: options.source || 'unknown', autoSwitch: options.autoSwitch !== false
    });
}

/**
 * Helper: send text to LLM tab.
 */
export function sendTextToLLM(text, options = {}) {
    const bus = getEventBus();
    bus.publish(MessageTypes.TEXT_TO_LLM, {
        text, target: options.target || 'main', source: options.source || 'unknown', autoSwitch: options.autoSwitch !== false
    });
}

/**
 * Helper: send text to Prompt Builder.
 */
export function sendTextToPromptBuilder(text, options = {}) {
    const bus = getEventBus();
    bus.publish(MessageTypes.TEXT_TO_PROMPT_BUILDER, {
        text, source: options.source || 'unknown', autoSwitch: options.autoSwitch !== false, append: options.append || false
    });
}

/**
 * Helper: request tab switch.
 */
export function requestTabSwitch(tabId, options = {}) {
    const bus = getEventBus();
    bus.publish(MessageTypes.TAB_SWITCH_REQUEST, {
        tabId, source: options.source || 'unknown', preserveState: options.preserveState !== false
    });
}

/**
 * Helper: show notification.
 */
export function showNotification(message, type = 'info', options = {}) {
    const bus = getEventBus();
    bus.publish(MessageTypes.NOTIFICATION, {
        message, type, duration: options.duration || 3000, source: options.source || 'unknown'
    });
    // Also use the dedicated notification system
    import('./notifications.js').then(({ showToast, NOTIFICATION_TYPES }) => {
        const notifType = {
            'info': NOTIFICATION_TYPES.INFO,
            'success': NOTIFICATION_TYPES.SUCCESS,
            'error': NOTIFICATION_TYPES.ERROR,
            'warning': NOTIFICATION_TYPES.WARNING
        }[type] || NOTIFICATION_TYPES.INFO;
        showToast(message, notifType, options.duration);
    }).catch(err => { console.warn('Failed to load notification system:', err); });
}

// Export singleton getter as default
export default getEventBus;

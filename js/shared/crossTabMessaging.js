/**
 * Cross-Tab Messaging System
 * 
 * Provides a centralized event bus for communication between different tabs
 * in the SageUtils sidebar (LLM, Gallery, Prompt Builder, Files, etc.)
 * 
 * Message Types:
 * - image-transfer: Transfer images from Gallery to LLM tab
 * - text-transfer: Transfer text between LLM and Prompt Builder tabs
 * - tab-switch-request: Request switching to a specific tab
 * - state-sync: Synchronize state across tabs
 * - notification: Show notifications/toasts
 */

// Global event bus instance
let eventBus = null;

/**
 * Cross-tab messaging event bus
 */
class CrossTabMessaging {
    constructor() {
        this.listeners = new Map();
        this.messageQueue = [];
        this.debug = false;
        
        // Rate limiters for different message types
        this.rateLimiters = new Map();
        this.setupRateLimiters();
    }
    
    /**
     * Setup rate limiters for message types
     */
    setupRateLimiters() {
        // Import rate limiter dynamically to avoid circular dependencies
        import('./performanceUtils.js').then(({ RateLimiter }) => {
            // Limit image transfers to 10 per second
            this.rateLimiters.set('image-transfer', new RateLimiter(10, 1000));
            // Limit state syncs to 20 per second
            this.rateLimiters.set('state-sync', new RateLimiter(20, 1000));
            // Limit notifications to 5 per second
            this.rateLimiters.set('notification', new RateLimiter(5, 1000));
        }).catch(err => {
            console.warn('[CrossTab] Failed to load rate limiters:', err);
        });
    }

    /**
     * Subscribe to a message type
     * @param {string} messageType - Type of message to listen for
     * @param {Function} callback - Callback function (message) => void
     * @returns {Function} Unsubscribe function
     */
    subscribe(messageType, callback) {
        if (!this.listeners.has(messageType)) {
            this.listeners.set(messageType, new Set());
        }
        
        this.listeners.get(messageType).add(callback);
        
        if (this.debug) {
            console.log(`[CrossTab] Subscribed to "${messageType}"`);
        }
        
        // Return unsubscribe function
        return () => {
            const callbacks = this.listeners.get(messageType);
            if (callbacks) {
                callbacks.delete(callback);
                if (callbacks.size === 0) {
                    this.listeners.delete(messageType);
                }
            }
        };
    }

    /**
     * Publish a message to all subscribers
     * @param {string} messageType - Type of message
     * @param {Object} data - Message data
     * @param {Object} options - Publishing options
     */
    publish(messageType, data, options = {}) {
        // Check rate limit if applicable
        const rateLimiter = this.rateLimiters.get(messageType);
        if (rateLimiter && !options.ignoreRateLimit) {
            if (!rateLimiter.allowCall()) {
                if (this.debug) {
                    const waitTime = rateLimiter.getWaitTime();
                    console.warn(`[CrossTab] Rate limit exceeded for "${messageType}". Wait ${waitTime}ms`);
                }
                return false; // Rate limited
            }
        }
        
        const message = {
            type: messageType,
            data: data,
            timestamp: Date.now()
        };
        
        if (this.debug) {
            console.log(`[CrossTab] Publishing "${messageType}":`, data);
        }
        
        // Add to queue for debugging/history
        this.messageQueue.push(message);
        if (this.messageQueue.length > 100) {
            this.messageQueue.shift();
        }
        
        // Notify all subscribers
        const callbacks = this.listeners.get(messageType);
        if (callbacks && callbacks.size > 0) {
            callbacks.forEach(callback => {
                try {
                    callback(message);
                } catch (error) {
                    console.error(`[CrossTab] Error in callback for "${messageType}":`, error);
                }
            });
        } else if (this.debug) {
            console.warn(`[CrossTab] No subscribers for "${messageType}"`);
        }
    }

    /**
     * Enable/disable debug logging
     * @param {boolean} enabled - Enable debug mode
     */
    setDebug(enabled) {
        this.debug = enabled;
        console.log(`[CrossTab] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get message history
     * @param {number} count - Number of recent messages to retrieve
     * @returns {Array} Recent messages
     */
    getHistory(count = 10) {
        return this.messageQueue.slice(-count);
    }

    /**
     * Clear all subscribers
     */
    clearAll() {
        this.listeners.clear();
        if (this.debug) {
            console.log('[CrossTab] All subscribers cleared');
        }
    }

    /**
     * Get subscriber count for a message type
     * @param {string} messageType - Message type
     * @returns {number} Number of subscribers
     */
    getSubscriberCount(messageType) {
        const callbacks = this.listeners.get(messageType);
        return callbacks ? callbacks.size : 0;
    }
}

/**
 * Get the global event bus instance (singleton)
 * @returns {CrossTabMessaging} Event bus instance
 */
export function getEventBus() {
    if (!eventBus) {
        eventBus = new CrossTabMessaging();
    }
    return eventBus;
}

/**
 * Message type constants
 */
export const MessageTypes = {
    // Image transfers
    IMAGE_TRANSFER: 'image-transfer',
    IMAGE_QUEUE_UPDATE: 'image-queue-update',
    
    // Text transfers
    TEXT_TO_LLM: 'text-to-llm',
    TEXT_TO_PROMPT_BUILDER: 'text-to-prompt-builder',
    TEXT_TO_FILE: 'text-to-file',
    
    // Tab switching
    TAB_SWITCH_REQUEST: 'tab-switch-request',
    TAB_SWITCHED: 'tab-switched',
    
    // State synchronization
    STATE_SYNC: 'state-sync',
    STATE_UPDATE: 'state-update',
    
    // Notifications
    NOTIFICATION: 'notification',
    ERROR: 'error',
    SUCCESS: 'success',
    
    // Gallery integration
    GALLERY_SELECTION: 'gallery-selection',
    GALLERY_IMAGE_CLICK: 'gallery-image-click',
    
    // LLM integration
    LLM_GENERATION_START: 'llm-generation-start',
    LLM_GENERATION_COMPLETE: 'llm-generation-complete',
    LLM_GENERATION_ERROR: 'llm-generation-error'
};

/**
 * Helper function to send images to LLM tab
 * @param {Array} images - Array of image objects { file, preview, base64 }
 * @param {Object} options - Additional options
 */
export function sendImagesToLLM(images, options = {}) {
    const bus = getEventBus();
    bus.publish(MessageTypes.IMAGE_TRANSFER, {
        images: images,
        source: options.source || 'unknown',
        autoSwitch: options.autoSwitch !== false
    });
}

/**
 * Helper function to send text to LLM tab
 * @param {string} text - Text content
 * @param {Object} options - Additional options
 */
export function sendTextToLLM(text, options = {}) {
    const bus = getEventBus();
    bus.publish(MessageTypes.TEXT_TO_LLM, {
        text: text,
        target: options.target || 'main', // 'main' or 'system'
        source: options.source || 'unknown',
        autoSwitch: options.autoSwitch !== false
    });
}

/**
 * Helper function to send text to Prompt Builder
 * @param {string} text - Text content
 * @param {Object} options - Additional options
 */
export function sendTextToPromptBuilder(text, options = {}) {
    const bus = getEventBus();
    bus.publish(MessageTypes.TEXT_TO_PROMPT_BUILDER, {
        text: text,
        source: options.source || 'unknown',
        autoSwitch: options.autoSwitch !== false,
        append: options.append || false
    });
}

/**
 * Helper function to request tab switch
 * @param {string} tabId - Tab ID to switch to
 * @param {Object} options - Additional options
 */
export function requestTabSwitch(tabId, options = {}) {
    const bus = getEventBus();
    bus.publish(MessageTypes.TAB_SWITCH_REQUEST, {
        tabId: tabId,
        source: options.source || 'unknown',
        preserveState: options.preserveState !== false
    });
}

/**
 * Helper function to show notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type (info, success, error, warning)
 * @param {Object} options - Additional options
 */
export function showNotification(message, type = 'info', options = {}) {
    const bus = getEventBus();
    bus.publish(MessageTypes.NOTIFICATION, {
        message: message,
        type: type,
        duration: options.duration || 3000,
        source: options.source || 'unknown'
    });
    
    // Also use the existing notification system
    import('./notifications.js').then(({ showToast, NOTIFICATION_TYPES }) => {
        const notifType = {
            'info': NOTIFICATION_TYPES.INFO,
            'success': NOTIFICATION_TYPES.SUCCESS,
            'error': NOTIFICATION_TYPES.ERROR,
            'warning': NOTIFICATION_TYPES.WARNING
        }[type] || NOTIFICATION_TYPES.INFO;
        
        showToast(message, notifType, options.duration);
    }).catch(err => {
        console.warn('Failed to load notification system:', err);
    });
}

/**
 * Helper function to sync state across tabs
 * @param {string} key - State key
 * @param {*} value - State value
 * @param {Object} options - Additional options
 */
export function syncState(key, value, options = {}) {
    const bus = getEventBus();
    bus.publish(MessageTypes.STATE_SYNC, {
        key: key,
        value: value,
        source: options.source || 'unknown',
        persist: options.persist !== false
    });
}

// Export singleton instance getter as default
export default getEventBus;

/**
 * Modern Notification System - Toast notifications and inline messages
 * Replaces legacy alert() dialogs with better UX
 */

// Notification types with consistent styling
export const NOTIFICATION_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error', 
    WARNING: 'warning',
    INFO: 'info'
};

// Toast notification configuration
const TOAST_CONFIG = {
    duration: 5000, // 5 seconds default
    position: 'top-right',
    maxToasts: 5
};

let toastContainer = null;
let toastIdCounter = 0;

/**
 * Initialize the toast container if it doesn't exist
 */
function ensureToastContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'sage-toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(toastContainer);
    }
    return toastContainer;
}

/**
 * Get the CSS classes for a notification type
 */
function getNotificationStyles(type) {
    const baseStyles = `
        padding: 12px 16px;
        border-radius: 6px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        font-size: 14px;
        line-height: 1.4;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        pointer-events: auto;
        cursor: pointer;
        transition: all 0.3s ease;
        max-width: 400px;
        word-wrap: break-word;
    `;

    const typeStyles = {
        success: `
            background: #10B981;
            color: white;
            border-left: 4px solid #059669;
        `,
        error: `
            background: #EF4444;
            color: white;
            border-left: 4px solid #DC2626;
        `,
        warning: `
            background: #F59E0B;
            color: white;
            border-left: 4px solid #D97706;
        `,
        info: `
            background: #3B82F6;
            color: white;
            border-left: 4px solid #2563EB;
        `
    };

    return baseStyles + (typeStyles[type] || typeStyles.info);
}

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - Notification type (success, error, warning, info)
 * @param {number} duration - How long to show the toast in milliseconds (0 = permanent)
 * @param {Function} onClick - Optional click handler
 * @returns {string} - Toast ID for manual dismissal
 */
export function showToast(message, type = NOTIFICATION_TYPES.INFO, duration = TOAST_CONFIG.duration, onClick = null) {
    const container = ensureToastContainer();
    const toastId = `toast-${++toastIdCounter}`;
    
    // Limit number of toasts
    const existingToasts = container.querySelectorAll('.sage-toast');
    if (existingToasts.length >= TOAST_CONFIG.maxToasts) {
        existingToasts[0].remove();
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = 'sage-toast';
    toast.style.cssText = getNotificationStyles(type) + `
        transform: translateX(100%);
        animation: slideIn 0.3s ease forwards;
    `;

    // Add close button
    const closeButton = document.createElement('span');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
        float: right;
        margin-left: 10px;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        opacity: 0.7;
    `;
    closeButton.onclick = (e) => {
        e.stopPropagation();
        dismissToast(toastId);
    };

    // Add content
    const content = document.createElement('span');
    content.textContent = message;
    
    toast.appendChild(content);
    toast.appendChild(closeButton);

    // Add click handler if provided
    if (onClick) {
        toast.onclick = (e) => {
            if (e.target !== closeButton) {
                onClick();
                dismissToast(toastId);
            }
        };
    } else {
        // Default: click to dismiss
        toast.onclick = (e) => {
            if (e.target !== closeButton) {
                dismissToast(toastId);
            }
        };
    }

    container.appendChild(toast);

    // Auto-dismiss if duration is specified
    if (duration > 0) {
        setTimeout(() => dismissToast(toastId), duration);
    }

    return toastId;
}

/**
 * Dismiss a specific toast by ID
 */
export function dismissToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.style.cssText += `
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s ease;
        `;
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
}

/**
 * Clear all toasts
 */
export function clearAllToasts() {
    if (toastContainer) {
        toastContainer.innerHTML = '';
    }
}

// Convenience methods for different notification types
export const notifications = {
    success: (message, duration, onClick) => showToast(message, NOTIFICATION_TYPES.SUCCESS, duration, onClick),
    error: (message, duration, onClick) => showToast(message, NOTIFICATION_TYPES.ERROR, duration, onClick),
    warning: (message, duration, onClick) => showToast(message, NOTIFICATION_TYPES.WARNING, duration, onClick),
    info: (message, duration, onClick) => showToast(message, NOTIFICATION_TYPES.INFO, duration, onClick)
};

/**
 * Show a confirmation dialog (replacement for confirm())
 * @param {string} message - The confirmation message
 * @param {string} title - Optional title for the dialog
 * @returns {Promise<boolean>} - Promise that resolves to user's choice
 */
export function showConfirmation(message, title = 'Confirm') {
    return new Promise((resolve) => {
        // Create modal backdrop
        const backdrop = document.createElement('div');
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Create dialog
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            padding: 24px;
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            max-width: 400px;
            width: 90%;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        `;

        // Add title
        const titleEl = document.createElement('h3');
        titleEl.textContent = title;
        titleEl.style.cssText = `
            margin: 0 0 16px 0;
            font-size: 18px;
            font-weight: 600;
            color: #374151;
        `;

        // Add message
        const messageEl = document.createElement('p');
        messageEl.textContent = message;
        messageEl.style.cssText = `
            margin: 0 0 24px 0;
            font-size: 14px;
            line-height: 1.5;
            color: #6B7280;
        `;

        // Add buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 12px;
            justify-content: flex-end;
        `;

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.cssText = `
            padding: 8px 16px;
            border: 1px solid #D1D5DB;
            border-radius: 6px;
            background: white;
            color: #374151;
            cursor: pointer;
            font-size: 14px;
        `;

        const confirmButton = document.createElement('button');
        confirmButton.textContent = 'OK';
        confirmButton.style.cssText = `
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            background: #3B82F6;
            color: white;
            cursor: pointer;
            font-size: 14px;
        `;

        // Event handlers
        const cleanup = () => {
            if (backdrop.parentNode) {
                backdrop.parentNode.removeChild(backdrop);
            }
        };

        cancelButton.onclick = () => {
            resolve(false);
            cleanup();
        };

        confirmButton.onclick = () => {
            resolve(true);
            cleanup();
        };

        backdrop.onclick = (e) => {
            if (e.target === backdrop) {
                resolve(false);
                cleanup();
            }
        };

        // Assemble dialog
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(confirmButton);
        dialog.appendChild(titleEl);
        dialog.appendChild(messageEl);
        dialog.appendChild(buttonContainer);
        backdrop.appendChild(dialog);
        document.body.appendChild(backdrop);

        // Focus the confirm button
        confirmButton.focus();
    });
}

// Add CSS animations
if (!document.querySelector('#sage-notifications-styles')) {
    const styles = document.createElement('style');
    styles.id = 'sage-notifications-styles';
    styles.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .sage-toast:hover {
            transform: scale(1.02);
        }
        
        .sage-toast:active {
            transform: scale(0.98);
        }
    `;
    document.head.appendChild(styles);
}

// Legacy alert() replacement - shows as error toast
export function modernAlert(message) {
    return showToast(message, NOTIFICATION_TYPES.ERROR, 7000); // Longer duration for errors
}

// Legacy confirm() replacement
export function modernConfirm(message) {
    return showConfirmation(message);
}

/**
 * Standardized Error Handling for Sidebar Components
 * Provides consistent error handling, logging, and user feedback
 */

import { MESSAGES, DEBUG } from './config.js';
import { notifications } from './notifications.js';

/**
 * @typedef {Object} ErrorContext
 * @property {string} component - Component where error occurred
 * @property {string} operation - Operation that failed
 * @property {any} [metadata] - Additional error metadata
 * @property {Function} [statusCallback] - Function to update UI status
 * @property {boolean} [showToUser] - Whether to show error to user
 */

/**
 * Error severity levels
 */
export const ERROR_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium', 
    HIGH: 'high',
    CRITICAL: 'critical'
};

/**
 * Error categories for better organization
 */
export const ERROR_CATEGORIES = {
    NETWORK: 'network',
    VALIDATION: 'validation',
    PERMISSION: 'permission',
    NOT_FOUND: 'not_found',
    UNKNOWN: 'unknown'
};

/**
 * Main error handling function
 * @param {Error} error - The error object
 * @param {ErrorContext} context - Context information about the error
 * @returns {void}
 */
export function handleError(error, context = {}) {
    // Guard against undefined/null errors
    if (!error) {
        console.warn('handleError called with undefined/null error', context);
        return;
    }

    const {
        component = 'unknown',
        operation = 'unknown',
        metadata = {},
        statusCallback = null,
        showToUser = true
    } = context;

    // Create standardized error info
    const errorInfo = {
        timestamp: new Date().toISOString(),
        component,
        operation,
        message: error?.message || String(error) || 'Unknown error',
        stack: error?.stack,
        metadata,
        category: categorizeError(error),
        severity: determineSeverity(error, context)
    };

    // Log error based on debug settings
    logError(errorInfo);

    // Update UI status if callback provided
    if (statusCallback && typeof statusCallback === 'function') {
        const userMessage = createUserMessage(errorInfo);
        statusCallback(userMessage, true);
    }

    // Show user notification for high severity errors
    if (showToUser && errorInfo.severity !== ERROR_LEVELS.LOW) {
        showUserError(errorInfo);
    }

    // Track error for analytics (in production)
    trackError(errorInfo);

    return errorInfo;
}

/**
 * Categorize error based on error object properties
 * @param {Error} error - The error object
 * @returns {string} Error category
 */
function categorizeError(error) {
    // Guard against non-object errors
    if (!error || typeof error !== 'object') {
        return ERROR_CATEGORIES.UNKNOWN;
    }

    if (error.status) {
        if (error.status === 404) return ERROR_CATEGORIES.NOT_FOUND;
        if (error.status === 401 || error.status === 403) return ERROR_CATEGORIES.PERMISSION;
        if (error.status >= 500) return ERROR_CATEGORIES.NETWORK;
    }

    const errorMessage = error.message || String(error);
    
    if (error.name === 'ValidationError' || errorMessage.includes('validation')) {
        return ERROR_CATEGORIES.VALIDATION;
    }

    if (error.name === 'NetworkError' || errorMessage.includes('fetch')) {
        return ERROR_CATEGORIES.NETWORK;
    }

    return ERROR_CATEGORIES.UNKNOWN;
}

/**
 * Determine error severity based on error and context
 * @param {Error} error - The error object
 * @param {ErrorContext} context - Error context
 * @returns {string} Error severity level
 */
function determineSeverity(error, context) {
    // Guard against non-object errors
    if (!error || typeof error !== 'object') {
        return ERROR_LEVELS.MEDIUM;
    }

    const errorMessage = error.message || String(error);
    
    // Critical errors that break core functionality
    if (error.name === 'TypeError' || errorMessage.includes('Cannot read property')) {
        return ERROR_LEVELS.CRITICAL;
    }

    // High severity for API failures
    if (error.status >= 500) {
        return ERROR_LEVELS.HIGH;
    }

    // Medium severity for user-facing errors
    if (error.status === 404 || error.status === 400) {
        return ERROR_LEVELS.MEDIUM;
    }

    // Low severity for validation errors
    if (context.category === ERROR_CATEGORIES.VALIDATION) {
        return ERROR_LEVELS.LOW;
    }

    return ERROR_LEVELS.MEDIUM;
}

/**
 * Log error with appropriate level and formatting
 * @param {Object} errorInfo - Structured error information
 */
function logError(errorInfo) {
    const { component, operation, message, severity, category } = errorInfo;
    const prefix = `[${component}:${operation}]`;
    
    if (DEBUG.enabled || DEBUG.components.stateManager) {
        const logMessage = `${prefix} ${message} (${category}/${severity})`;
        
        switch (severity) {
            case ERROR_LEVELS.CRITICAL:
                console.error(logMessage, errorInfo);
                break;
            case ERROR_LEVELS.HIGH:
                console.error(logMessage, errorInfo);
                break;
            case ERROR_LEVELS.MEDIUM:
                console.warn(logMessage, errorInfo);
                break;
            case ERROR_LEVELS.LOW:
                console.info(logMessage, errorInfo);
                break;
            default:
                console.log(logMessage, errorInfo);
        }
    } else {
        // Production logging - less verbose
        console.error(`${prefix} ${message}`);
    }
}

/**
 * Create user-friendly error message
 * @param {Object} errorInfo - Structured error information
 * @returns {string} User-friendly error message
 */
function createUserMessage(errorInfo) {
    const { category, operation, metadata } = errorInfo;
    
    // Use predefined messages for common error types
    switch (category) {
        case ERROR_CATEGORIES.NETWORK:
            return MESSAGES.errors.network;
        case ERROR_CATEGORIES.NOT_FOUND:
            if (metadata.filename) {
                return `File "${metadata.filename}" not found`;
            }
            return MESSAGES.errors.notFound;
        case ERROR_CATEGORIES.PERMISSION:
            return MESSAGES.errors.unauthorized;
        case ERROR_CATEGORIES.VALIDATION:
            if (metadata.field) {
                return `Invalid ${metadata.field}`;
            }
            return MESSAGES.errors.validation;
        default:
            // Customize message based on operation
            if (operation.includes('save')) {
                return MESSAGES.errors.saveFailed;
            }
            if (operation.includes('load')) {
                return MESSAGES.errors.loadFailed;
            }
            return MESSAGES.errors.generic;
    }
}

/**
 * Show error notification to user (can be customized for different UI frameworks)
 * @param {Object} errorInfo - Structured error information
 */
function showUserError(errorInfo) {
    const message = createUserMessage(errorInfo);
    
    // Use modern notification system instead of alerts
    if (errorInfo.severity === ERROR_LEVELS.CRITICAL) {
        notifications.error(`Critical Error: ${message}`, 0); // 0 = permanent until dismissed
    } else if (errorInfo.severity === ERROR_LEVELS.HIGH) {
        notifications.error(`Error: ${message}`);
        console.error(`Error: ${message}`);
    } else if (errorInfo.severity === ERROR_LEVELS.MEDIUM) {
        notifications.warning(message);
    } else {
        notifications.info(message);
    }
}

/**
 * Track error for analytics/monitoring (placeholder for production implementation)
 * @param {Object} errorInfo - Structured error information
 */
function trackError(errorInfo) {
    // In production, this could send errors to:
    // - Error tracking service (Sentry, Bugsnag, etc.)
    // - Analytics platform
    // - Internal logging system
    
    if (DEBUG.enabled) {
        console.log('[ErrorTracking] Would track error:', errorInfo);
    }
}

// =============================================================================
// DEBUGGING AND UTILITY FUNCTIONS (kept for future development/testing)
// =============================================================================

/**
 * Create a safe wrapper function that catches and handles errors
 * @param {Function} fn - Function to wrap
 * @param {ErrorContext} context - Error context for wrapped function
 * @returns {Function} Wrapped function with error handling
 */
export function createSafeWrapper(fn, context = {}) {
    return async function(...args) {
        try {
            return await fn.apply(this, args);
        } catch (error) {
            handleError(error, {
                component: context.component || 'wrapper',
                operation: context.operation || fn.name || 'function call',
                ...context
            });
            
            // Return null or default value on error
            return context.defaultValue || null;
        }
    };
}

/**
 * Retry mechanism for operations that might fail temporarily
 * @param {Function} operation - Operation to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Result of successful operation
 */
export async function retryOperation(operation, options = {}) {
    const {
        maxAttempts = 3,
        delay = 1000,
        backoff = 1.5,
        context = {}
    } = options;

    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            
            if (attempt === maxAttempts) {
                handleError(error, {
                    ...context,
                    metadata: {
                        ...context.metadata,
                        attempts: attempt,
                        maxAttempts
                    }
                });
                throw error;
            }
            
            // Wait before retry with exponential backoff
            const waitTime = delay * Math.pow(backoff, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
    
    throw lastError;
}

/**
 * Development helper to simulate errors for testing
 * @param {string} type - Type of error to simulate
 * @param {ErrorContext} context - Error context
 */
export function simulateError(type, context = {}) {
    if (!DEBUG.enabled) {
        console.warn('Error simulation only available in debug mode');
        return;
    }
    
    const errors = {
        network: new Error('Simulated network error'),
        validation: new Error('Simulated validation error'),
        notFound: Object.assign(new Error('Simulated 404 error'), { status: 404 }),
        permission: Object.assign(new Error('Simulated permission error'), { status: 403 })
    };
    
    const error = errors[type] || new Error(`Simulated ${type} error`);
    handleError(error, {
        component: 'simulator',
        operation: `simulate ${type} error`,
        ...context
    });
}

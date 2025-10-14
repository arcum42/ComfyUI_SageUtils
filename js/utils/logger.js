/**
 * Debug Logger Utility
 * Provides conditional logging for development vs production
 * 
 * @module utils/logger
 * @example
 * import { logger } from './utils/logger.js';
 * 
 * logger.debug('ModelBrowser', 'Rendered 100 models');
 * logger.info('ModelsTab', 'Cache loaded successfully');
 * logger.warn('ModelsTab', 'No cache data found');
 * logger.error('ModelsTab', 'Failed to load', error);
 */

/**
 * Debug logger configuration
 * Set DEBUG_MODE to false for production builds
 */
const DEBUG_MODE = true; // Set to false to disable debug logs

/**
 * Logger class for conditional logging
 */
class Logger {
    /**
     * Creates a new logger instance
     * @param {boolean} enabled - Whether debug logging is enabled
     */
    constructor(enabled = DEBUG_MODE) {
        this.enabled = enabled;
    }
    
    /**
     * Logs a debug message (only when DEBUG_MODE is true)
     * @param {string} component - Component name (e.g., 'ModelBrowser', 'ModelsTabV2')
     * @param {...any} args - Message and additional arguments to log
     * @example
     * logger.debug('ModelBrowser', 'Rendered', models.length, 'models');
     */
    debug(component, ...args) {
        if (this.enabled) {
            console.log(`[${component}]`, ...args);
        }
    }
    
    /**
     * Logs an info message (always shown)
     * @param {string} component - Component name
     * @param {...any} args - Message and additional arguments to log
     */
    info(component, ...args) {
        console.log(`[${component}]`, ...args);
    }
    
    /**
     * Logs a warning message (always shown)
     * @param {string} component - Component name
     * @param {...any} args - Message and additional arguments to log
     */
    warn(component, ...args) {
        console.warn(`[${component}]`, ...args);
    }
    
    /**
     * Logs an error message (always shown)
     * @param {string} component - Component name
     * @param {...any} args - Message and additional arguments to log
     */
    error(component, ...args) {
        console.error(`[${component}]`, ...args);
    }
    
    /**
     * Enables debug logging
     */
    enable() {
        this.enabled = true;
    }
    
    /**
     * Disables debug logging
     */
    disable() {
        this.enabled = false;
    }
}

/**
 * Global logger instance
 * @type {Logger}
 */
export const logger = new Logger();

/**
 * Enables debug mode globally
 * Useful for runtime debugging in browser console
 * @example
 * import { enableDebugMode } from './utils/logger.js';
 * enableDebugMode();
 */
export function enableDebugMode() {
    logger.enable();
    console.log('[Logger] Debug mode enabled');
}

/**
 * Disables debug mode globally
 * @example
 * import { disableDebugMode } from './utils/logger.js';
 * disableDebugMode();
 */
export function disableDebugMode() {
    logger.disable();
    console.log('[Logger] Debug mode disabled');
}

/**
 * Creates a component-specific logger
 * Automatically prefixes all logs with the component name
 * 
 * @param {string} componentName - Name of the component
 * @returns {Object} Logger interface for the component
 * @example
 * const log = createComponentLogger('ModelBrowser');
 * log.debug('Rendered models:', count);
 * log.warn('No models found');
 */
export function createComponentLogger(componentName) {
    return {
        debug: (...args) => logger.debug(componentName, ...args),
        info: (...args) => logger.info(componentName, ...args),
        warn: (...args) => logger.warn(componentName, ...args),
        error: (...args) => logger.error(componentName, ...args)
    };
}

export default logger;

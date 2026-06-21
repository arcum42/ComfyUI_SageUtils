/**
 * Performance Utilities
 * 
 * Provides debouncing, throttling, and rate limiting utilities
 * to optimize performance and prevent overwhelming the system
 */

/**
 * Debounce function - delays execution until after wait time has elapsed since last call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute on leading edge instead of trailing
 * @returns {Function} Debounced function
 */
export function debounce(func, wait, immediate = false) {
    let timeout;
    
    return function executedFunction(...args) {
        const context = this;
        
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        
        const callNow = immediate && !timeout;
        
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        
        if (callNow) func.apply(context, args);
    };
}

/**
 * Throttle function - limits execution to once per wait period
 * @param {Function} func - Function to throttle
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, wait) {
    let inThrottle;
    let lastFunc;
    let lastRan;
    
    return function(...args) {
        const context = this;
        
        if (!inThrottle) {
            func.apply(context, args);
            lastRan = Date.now();
            inThrottle = true;
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(() => {
                if ((Date.now() - lastRan) >= wait) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, Math.max(wait - (Date.now() - lastRan), 0));
        }
    };
}

/**
 * Rate Limiter class - limits calls to a function over time
 */
export class RateLimiter {
    constructor(maxCalls, timeWindow) {
        this.maxCalls = maxCalls;
        this.timeWindow = timeWindow; // in milliseconds
        this.calls = [];
    }
    
    /**
     * Check if a call is allowed
     * @returns {boolean} True if call is allowed
     */
    allowCall() {
        const now = Date.now();
        
        // Remove calls outside the time window
        this.calls = this.calls.filter(time => now - time < this.timeWindow);
        
        // Check if we're under the limit
        if (this.calls.length < this.maxCalls) {
            this.calls.push(now);
            return true;
        }
        
        return false;
    }
    
    /**
     * Get time until next call is allowed
     * @returns {number} Milliseconds until next call allowed, or 0 if allowed now
     */
    getWaitTime() {
        if (this.calls.length < this.maxCalls) {
            return 0;
        }
        
        const now = Date.now();
        const oldestCall = this.calls[0];
        return Math.max(0, this.timeWindow - (now - oldestCall));
    }
    
    /**
     * Reset the rate limiter
     */
    reset() {
        this.calls = [];
    }
}

export default {
    debounce,
    throttle,
    RateLimiter
};

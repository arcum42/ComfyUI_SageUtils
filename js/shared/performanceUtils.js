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

/**
 * Batch processor - collects items and processes them in batches
 */
export class BatchProcessor {
    constructor(processFn, options = {}) {
        this.processFn = processFn;
        this.batchSize = options.batchSize || 10;
        this.delay = options.delay || 100;
        this.items = [];
        this.timeout = null;
    }
    
    /**
     * Add item to batch
     * @param {*} item - Item to add
     */
    add(item) {
        this.items.push(item);
        
        // Process immediately if batch is full
        if (this.items.length >= this.batchSize) {
            this.flush();
        } else {
            // Otherwise schedule processing
            this.scheduleProcess();
        }
    }
    
    /**
     * Schedule batch processing
     */
    scheduleProcess() {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        
        this.timeout = setTimeout(() => {
            this.flush();
        }, this.delay);
    }
    
    /**
     * Process all pending items immediately
     */
    flush() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        
        if (this.items.length > 0) {
            const itemsToProcess = [...this.items];
            this.items = [];
            
            try {
                this.processFn(itemsToProcess);
            } catch (error) {
                console.error('[BatchProcessor] Error processing batch:', error);
            }
        }
    }
    
    /**
     * Get current batch size
     * @returns {number} Number of pending items
     */
    getPendingCount() {
        return this.items.length;
    }
    
    /**
     * Clear pending items without processing
     */
    clear() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        this.items = [];
    }
}

/**
 * Request Animation Frame throttle - limits execution to once per animation frame
 * @param {Function} func - Function to throttle
 * @returns {Function} Throttled function
 */
export function rafThrottle(func) {
    let rafId = null;
    let lastArgs = null;
    
    return function(...args) {
        lastArgs = args;
        
        if (rafId === null) {
            rafId = requestAnimationFrame(() => {
                func.apply(this, lastArgs);
                rafId = null;
                lastArgs = null;
            });
        }
    };
}

/**
 * Memoize function results with LRU cache
 * @param {Function} func - Function to memoize
 * @param {number} maxSize - Maximum cache size
 * @returns {Function} Memoized function
 */
export function memoize(func, maxSize = 100) {
    const cache = new Map();
    const keyOrder = [];
    
    return function(...args) {
        const key = JSON.stringify(args);
        
        if (cache.has(key)) {
            return cache.get(key);
        }
        
        const result = func.apply(this, args);
        
        cache.set(key, result);
        keyOrder.push(key);
        
        // LRU eviction
        if (keyOrder.length > maxSize) {
            const oldestKey = keyOrder.shift();
            cache.delete(oldestKey);
        }
        
        return result;
    };
}

/**
 * Create a lazy loader that only executes once
 * @param {Function} loaderFn - Function to execute once
 * @returns {Function} Lazy loader function
 */
export function lazy(loaderFn) {
    let loaded = false;
    let result = null;
    let promise = null;
    
    return async function() {
        if (loaded) {
            return result;
        }
        
        if (promise) {
            return promise;
        }
        
        promise = (async () => {
            result = await loaderFn();
            loaded = true;
            promise = null;
            return result;
        })();
        
        return promise;
    };
}

export default {
    debounce,
    throttle,
    RateLimiter,
    BatchProcessor,
    rafThrottle,
    memoize,
    lazy
};

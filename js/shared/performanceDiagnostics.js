/**
 * Performance diagnostic utilities for SageUtils.
 * Helps identify what's causing initialization delays and performance issues.
 */

// Track what's blocking initialization
const blockingOperations = new Map();
let lastOperationTime = performance.now();

function trackOperation(name, startTime = performance.now()) {
    const duration = startTime - lastOperationTime;
    if (duration > 100) { // Only track operations that take > 100ms
        blockingOperations.set(name, {
            duration: duration,
            timestamp: startTime,
            stack: new Error().stack
        });
        console.warn(`[PERF] Blocking operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }
    lastOperationTime = performance.now();
}

// Monitor DOM readiness
function monitorDOMReadiness() {
    const states = {
        'DOM_LOADING': document.readyState === 'loading' ? performance.now() : null,
        'DOM_INTERACTIVE': document.readyState === 'interactive' ? performance.now() : null, 
        'DOM_COMPLETE': document.readyState === 'complete' ? performance.now() : null
    };
    
    console.log('[PERF] DOM States:', states);
    
    if (document.readyState !== 'complete') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log(`[PERF] DOMContentLoaded at: ${performance.now().toFixed(2)}ms`);
        });
        
        window.addEventListener('load', () => {
            console.log(`[PERF] Window load at: ${performance.now().toFixed(2)}ms`);
        });
    }
}

// Monitor network activity
function monitorNetworkActivity() {
    if (window.PerformanceObserver) {
        try {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    if (entry.duration > 500) { // Only track slow network requests
                        console.warn(`[PERF] Slow network request: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
                    }
                });
            });
            
            observer.observe({ entryTypes: ['resource', 'navigation'] });
        } catch (error) {
            console.warn('[PERF] Could not setup network monitoring:', error);
        }
    }
}

// Monitor async operations that might be blocking
function monitorAsyncOperations() {
    // Wrap setTimeout to detect long delays
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = function(callback, delay, ...args) {
        const startTime = performance.now();
        return originalSetTimeout(() => {
            const actualDelay = performance.now() - startTime;
            if (actualDelay > delay + 100) { // If significantly longer than expected
                console.warn(`[PERF] setTimeout delay exceeded: expected ${delay}ms, actual ${actualDelay.toFixed(2)}ms`);
            }
            trackOperation(`setTimeout-${delay}ms`);
            return callback.apply(this, args);
        }, delay);
    };
    
    // Wrap requestAnimationFrame
    const originalRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = function(callback) {
        const startTime = performance.now();
        return originalRAF((timestamp) => {
            const delay = timestamp - startTime;
            if (delay > 50) { // RAF should be ~16ms, 50ms+ is concerning
                console.warn(`[PERF] requestAnimationFrame delay: ${delay.toFixed(2)}ms`);
            }
            trackOperation('requestAnimationFrame');
            return callback(timestamp);
        });
    };
}

// Detect long-running synchronous operations
function detectLongSyncOperations() {
    let lastCheck = performance.now();
    
    setInterval(() => {
        const now = performance.now();
        const gap = now - lastCheck;
        
        if (gap > 100) { // > 100ms gap suggests blocking operation
            console.warn(`[PERF] Potential blocking operation detected: ${gap.toFixed(2)}ms gap in execution`);
            trackOperation(`sync-blocking-${gap.toFixed(0)}ms`);
        }
        
        lastCheck = now;
    }, 16); // Check every frame
}

// Monitor module loading
function monitorModuleLoading() {
    const moduleLoadStart = performance.now();
    let modulesLoaded = 0;
    
    // Override dynamic import to track module loading
    if (typeof window.importShim !== 'undefined') {
        const originalImport = window.importShim;
        window.importShim = async function(specifier) {
            const start = performance.now();
            try {
                const result = await originalImport(specifier);
                const duration = performance.now() - start;
                modulesLoaded++;
                
                if (duration > 100) {
                    console.warn(`[PERF] Slow module load: ${specifier} took ${duration.toFixed(2)}ms`);
                }
                
                trackOperation(`module-${specifier}`);
                return result;
            } catch (error) {
                console.error(`[PERF] Module load failed: ${specifier}`, error);
                throw error;
            }
        };
    }
}

// Generate performance diagnostic report
function generatePerformanceDiagnostic() {
    const report = {
        timestamp: new Date().toISOString(),
        pageLoadTime: performance.now(),
        domReadyState: document.readyState,
        blockingOperations: Array.from(blockingOperations.entries()).map(([name, data]) => ({
            name,
            duration: data.duration,
            timestamp: data.timestamp
        })),
        memoryUsage: performance.memory ? {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        } : null,
        timing: performance.timing ? {
            domLoading: performance.timing.domLoading - performance.timing.navigationStart,
            domInteractive: performance.timing.domInteractive - performance.timing.navigationStart,
            domComplete: performance.timing.domComplete - performance.timing.navigationStart,
            loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart
        } : null
    };
    
    console.log('[PERF] Performance Diagnostic Report:', report);
    return report;
}

// Initialize performance monitoring
function initPerformanceMonitoring() {
    console.log('[PERF] Initializing performance monitoring...');
    
    trackOperation('performance-monitoring-start');
    monitorDOMReadiness();
    monitorNetworkActivity();
    monitorAsyncOperations();
    detectLongSyncOperations();
    monitorModuleLoading();
    
    // Generate report after a delay to capture initialization issues
    setTimeout(() => {
        generatePerformanceDiagnostic();
    }, 35000); // After the typical 32s delay
}

// Export for use
window.SageUtilsPerformanceMonitor = {
    trackOperation,
    generatePerformanceDiagnostic,
    blockingOperations,
    init: initPerformanceMonitoring
};

// Auto-initialize if performance monitoring is explicitly enabled
// Note: Changed to be more conservative - only enable if explicitly requested
if (localStorage.getItem('sageutils_perf_monitoring') === 'true' || 
    new URLSearchParams(window.location.search).get('sageutils_perf') === '1' ||
    new URLSearchParams(window.location.search).get('sageutils_gap_analysis') === '1') {
    console.log('[PERF] Performance monitoring explicitly enabled');
    initPerformanceMonitoring();
} else {
    console.log('[PERF] Performance monitoring disabled (set localStorage.setItem("sageutils_perf_monitoring", "true") or add ?sageutils_perf=1 to URL to enable)');
}

export {
    trackOperation,
    generatePerformanceDiagnostic,
    initPerformanceMonitoring
};

/**
 * Performance timing utilities for SageUtils JavaScript side.
 * Provides comprehensive timing functionality to measure initialization and runtime performance.
 */

class PerformanceTimer {
    constructor(name = "SageUtils") {
        this.name = name;
        this.timings = new Map();
        this.initializationTimes = new Map();
        this.startTimes = new Map();
        this.enabled = true;
        
        // Track initialization start
        this.initStartTime = performance.now();
        this.initializationComplete = false;
    }
    
    enable() {
        this.enabled = true;
    }
    
    disable() {
        this.enabled = false;
    }
    
    startTimer(operation) {
        if (!this.enabled) return;
        
        this.startTimes.set(operation, performance.now());
    }
    
    endTimer(operation) {
        if (!this.enabled) return 0.0;
        
        if (!this.startTimes.has(operation)) {
            console.warn(`[TIMING] Timer '${operation}' was never started`);
            return 0.0;
        }
        
        const duration = performance.now() - this.startTimes.get(operation);
        
        // Add to timings list
        if (!this.timings.has(operation)) {
            this.timings.set(operation, []);
        }
        this.timings.get(operation).push(duration);
        
        // Remove from active timers
        this.startTimes.delete(operation);
        
        return duration;
    }
    
    async timeFunction(operation, func) {
        if (!this.enabled) {
            return await func();
        }
        
        const startTime = performance.now();
        try {
            return await func();
        } finally {
            const duration = performance.now() - startTime;
            if (!this.timings.has(operation)) {
                this.timings.set(operation, []);
            }
            this.timings.get(operation).push(duration);
        }
    }
    
    recordInitializationMilestone(milestone) {
        if (!this.enabled) return;
        
        const currentTime = performance.now();
        const durationFromStart = currentTime - this.initStartTime;
        this.initializationTimes.set(milestone, durationFromStart);
        
        console.log(`[TIMING] Initialization milestone '${milestone}': ${durationFromStart.toFixed(4)}ms from start`);
    }
    
    completeInitialization() {
        if (!this.enabled) return 0.0;
        
        if (this.initializationComplete) {
            return this.getTotalInitializationTime();
        }
        
        const totalTime = performance.now() - this.initStartTime;
        this.initializationTimes.set('__complete__', totalTime);
        this.initializationComplete = true;
        
        console.log(`[TIMING] Total initialization time: ${totalTime.toFixed(4)}ms`);
        return totalTime;
    }
    
    getTotalInitializationTime() {
        if (this.initializationTimes.has('__complete__')) {
            return this.initializationTimes.get('__complete__');
        } else if (this.initializationTimes.size > 0) {
            return Math.max(...Array.from(this.initializationTimes.values()));
        } else {
            return 0.0;
        }
    }
    
    getStats(operation) {
        if (!this.timings.has(operation)) {
            return {};
        }
        
        const times = this.timings.get(operation);
        if (times.length === 0) {
            return {};
        }
        
        const total = times.reduce((a, b) => a + b, 0);
        return {
            count: times.length,
            total: total,
            average: total / times.length,
            min: Math.min(...times),
            max: Math.max(...times),
            last: times[times.length - 1]
        };
    }
    
    getAllStats() {
        const stats = {};
        for (const operation of this.timings.keys()) {
            stats[operation] = this.getStats(operation);
        }
        return stats;
    }
    
    getInitializationReport() {
        if (this.initializationTimes.size === 0) {
            return `No initialization timing data for ${this.name}`;
        }
        
        const report = [`\\n=== ${this.name} Initialization Timing Report ===`];
        
        // Sort milestones by time
        const sortedMilestones = Array.from(this.initializationTimes.entries())
            .filter(([key]) => key !== '__complete__')
            .sort(([, a], [, b]) => a - b);
        
        // Add incremental times
        let prevTime = 0.0;
        for (const [milestone, totalTime] of sortedMilestones) {
            const incremental = totalTime - prevTime;
            report.push(`  ${milestone}: ${totalTime.toFixed(4)}ms (+${incremental.toFixed(4)}ms)`);
            prevTime = totalTime;
        }
        
        if (this.initializationTimes.has('__complete__')) {
            const total = this.initializationTimes.get('__complete__');
            report.push(`  TOTAL: ${total.toFixed(4)}ms`);
        }
        
        return report.join('\\n');
    }
    
    getRuntimeReport() {
        if (this.timings.size === 0) {
            return `No runtime timing data for ${this.name}`;
        }
        
        const report = [`\\n=== ${this.name} Runtime Performance Report ===`];
        
        // Sort operations by total time
        const sortedOps = Array.from(this.timings.keys())
            .map(op => [op, this.getStats(op)])
            .filter(([, stats]) => Object.keys(stats).length > 0)
            .sort(([, a], [, b]) => (b.total || 0) - (a.total || 0));
        
        for (const [operation, stats] of sortedOps) {
            report.push(`  ${operation}:`);
            report.push(`    Calls: ${stats.count}`);
            report.push(`    Total: ${stats.total.toFixed(4)}ms`);
            report.push(`    Average: ${stats.average.toFixed(4)}ms`);
            report.push(`    Min: ${stats.min.toFixed(4)}ms`);
            report.push(`    Max: ${stats.max.toFixed(4)}ms`);
            report.push('');
        }
        
        return report.join('\\n');
    }
    
    getFullReport() {
        const initReport = this.getInitializationReport();
        const runtimeReport = this.getRuntimeReport();
        return `${initReport}\\n${runtimeReport}`;
    }
    
    printReport() {
        console.log(this.getFullReport());
    }
    
    reset() {
        this.timings.clear();
        this.initializationTimes.clear();
        this.startTimes.clear();
        this.initStartTime = performance.now();
        this.initializationComplete = false;
    }
    
    exportToObject() {
        return {
            name: this.name,
            initializationTimes: Object.fromEntries(this.initializationTimes),
            runtimeStats: this.getAllStats(),
            totalInitializationTime: this.getTotalInitializationTime(),
            initializationComplete: this.initializationComplete,
            timestamp: new Date().toISOString()
        };
    }
    
    // Send timing data to Python backend for analysis
    async sendTimingDataToServer() {
        if (!this.enabled) return;
        
        try {
            const timingData = this.exportToObject();
            
            const response = await fetch('/sage_utils/timing_data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    source: 'javascript',
                    data: timingData
                })
            });
            
            if (!response.ok) {
                console.warn('[TIMING] Failed to send timing data to server:', response.statusText);
            }
        } catch (error) {
            console.warn('[TIMING] Error sending timing data to server:', error);
        }
    }
}

// Global timer instances
const javascriptTimer = new PerformanceTimer("JavaScript");
const uiTimer = new PerformanceTimer("UI");

// Convenience functions
function startTimer(operation, timer = javascriptTimer) {
    timer.startTimer(operation);
}

function endTimer(operation, timer = javascriptTimer) {
    return timer.endTimer(operation);
}

async function timeFunction(operation, func, timer = javascriptTimer) {
    return await timer.timeFunction(operation, func);
}

function recordInitializationMilestone(milestone, timer = javascriptTimer) {
    timer.recordInitializationMilestone(milestone);
}

function completeInitialization(timer = javascriptTimer) {
    return timer.completeInitialization();
}

function getTimingReport(timer = javascriptTimer) {
    return timer.getFullReport();
}

function printTimingReport(timer = javascriptTimer) {
    timer.printReport();
}

// Function to create timing wrapper for existing functions
function wrapFunctionWithTiming(func, operationName, timer = javascriptTimer) {
    return async function(...args) {
        return await timer.timeFunction(operationName, () => func.apply(this, args));
    };
}

// Function to wrap object methods with timing
function wrapObjectMethodsWithTiming(obj, methodNames, prefix = "", timer = javascriptTimer) {
    methodNames.forEach(methodName => {
        if (typeof obj[methodName] === 'function') {
            const originalMethod = obj[methodName];
            const operationName = prefix ? `${prefix}.${methodName}` : methodName;
            
            obj[methodName] = function(...args) {
                return timer.timeFunction(operationName, () => originalMethod.apply(this, args));
            };
        }
    });
}

// Performance observer for timing DOM events and other browser APIs
class BrowserPerformanceObserver {
    constructor(timer = javascriptTimer) {
        this.timer = timer;
        this.observers = [];
        this.setupObservers();
    }
    
    setupObservers() {
        try {
            // Observe navigation timing
            if (window.PerformanceObserver && window.PerformanceNavigationTiming) {
                const navObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        if (entry.entryType === 'navigation') {
                            this.timer.recordInitializationMilestone('DOM_CONTENT_LOADED', entry.domContentLoadedEventEnd);
                            this.timer.recordInitializationMilestone('LOAD_EVENT', entry.loadEventEnd);
                        }
                    });
                });
                
                navObserver.observe({ entryTypes: ['navigation'] });
                this.observers.push(navObserver);
            }
            
            // Observe resource timing for important resources
            if (window.PerformanceObserver && window.PerformanceResourceTiming) {
                const resourceObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        // Track loading of important JavaScript files
                        if (entry.name.includes('sage') || entry.name.includes('sageutils')) {
                            const filename = entry.name.split('/').pop();
                            this.timer.recordInitializationMilestone(`RESOURCE_${filename}`, entry.responseEnd);
                        }
                    });
                });
                
                resourceObserver.observe({ entryTypes: ['resource'] });
                this.observers.push(resourceObserver);
            }
        } catch (error) {
            console.warn('[TIMING] Could not setup browser performance observers:', error);
        }
    }
    
    disconnect() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
    }
}

// Initialize browser performance observer
const browserObserver = new BrowserPerformanceObserver(javascriptTimer);

// Export for use in other modules
export {
    PerformanceTimer,
    javascriptTimer,
    uiTimer,
    startTimer,
    endTimer,
    timeFunction,
    recordInitializationMilestone,
    completeInitialization,
    getTimingReport,
    printTimingReport,
    wrapFunctionWithTiming,
    wrapObjectMethodsWithTiming,
    BrowserPerformanceObserver,
    browserObserver
};

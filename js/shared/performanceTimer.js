/**
 * Performance timing utilities for SageUtils JavaScript side.
 * Provides initialization timing milestones and optional runtime profiling.
 */

class PerformanceTimer {
    constructor(name = "SageUtils") {
        this.name = name;
        this.timings = new Map();
        this.initializationTimes = new Map();
        this.startTimes = new Map();
        this.enabled = true;

        this.initStartTime = performance.now();
        this.initializationComplete = false;
    }

    enable() { this.enabled = true; }
    disable() { this.enabled = false; }

    startTimer(operation) {
        if (!this.enabled) return;
        this.startTimes.set(operation, performance.now());
    }

    endTimer(operation) {
        if (!this.enabled) return 0.0;
        if (!this.startTimes.has(operation)) {
            if (shouldLogTimingDetails()) console.warn(`[TIMING] Timer '${operation}' was never started`);
            return 0.0;
        }
        const duration = performance.now() - this.startTimes.get(operation);
        if (!this.timings.has(operation)) this.timings.set(operation, []);
        this.timings.get(operation).push(duration);
        this.startTimes.delete(operation);
        return duration;
    }

    async timeFunction(operation, func) {
        if (!this.enabled) return await func();
        const startTime = performance.now();
        try { return await func(); }
        finally {
            const duration = performance.now() - startTime;
            if (!this.timings.has(operation)) this.timings.set(operation, []);
            this.timings.get(operation).push(duration);
        }
    }

    recordInitializationMilestone(milestone) {
        if (!this.enabled) return;
        const currentTime = performance.now();
        const durationFromStart = currentTime - this.initStartTime;
        this.initializationTimes.set(milestone, durationFromStart);
        if (this.enabled && shouldLogTimingDetails()) {
            console.log(`[TIMING] Initialization milestone '${milestone}': ${durationFromStart.toFixed(4)}ms from start`);
        }
    }

    completeInitialization() {
        if (!this.enabled) return 0.0;
        if (this.initializationComplete) return this.getTotalInitializationTime();
        const totalTime = performance.now() - this.initStartTime;
        this.initializationTimes.set('__complete__', totalTime);
        this.initializationComplete = true;
        if (this.enabled && shouldLogTimingDetails()) {
            console.log(`[TIMING] Total initialization time: ${totalTime.toFixed(4)}ms`);
        }
        return totalTime;
    }

    getTotalInitializationTime() {
        if (this.initializationTimes.has('__complete__')) return this.initializationTimes.get('__complete__');
        if (this.initializationTimes.size > 0) return Math.max(...Array.from(this.initializationTimes.values()));
        return 0.0;
    }

    getStats(operation) {
        const times = this.timings.get(operation);
        if (!times || times.length === 0) return {};
        const total = times.reduce((a, b) => a + b, 0);
        return { count: times.length, total, average: total / times.length, min: Math.min(...times), max: Math.max(...times), last: times[times.length - 1] };
    }

    getAllStats() {
        const stats = {};
        for (const op of this.timings.keys()) stats[op] = this.getStats(op);
        return stats;
    }

    getFullReport() {
        const parts = [];
        // Initialization report
        const sortedMilestones = Array.from(this.initializationTimes.entries())
            .filter(([key]) => key !== '__complete__')
            .sort(([, a], [, b]) => a - b);
        if (sortedMilestones.length > 0) {
            parts.push(`\n=== ${this.name} Initialization Timing ===`);
            let prevTime = 0;
            for (const [milestone, totalTime] of sortedMilestones) {
                const incremental = totalTime - prevTime;
                parts.push(`  ${milestone}: ${totalTime.toFixed(2)}ms (+${incremental.toFixed(2)}ms)`);
                prevTime = totalTime;
            }
        }
        if (this.initializationTimes.has('__complete__')) {
            parts.push(`  TOTAL: ${this.initializationTimes.get('__complete__').toFixed(2)}ms`);
        }
        // Runtime report
        const sortedOps = Array.from(this.timings.keys())
            .map(op => [op, this.getStats(op)])
            .filter(([, stats]) => Object.keys(stats).length > 0)
            .sort(([, a], [, b]) => (b.total || 0) - (a.total || 0));
        if (sortedOps.length > 0) {
            parts.push(`\n=== ${this.name} Runtime Performance ===`);
            for (const [operation, stats] of sortedOps) {
                parts.push(`  ${operation}: calls=${stats.count} total=${stats.total.toFixed(2)}ms avg=${stats.average.toFixed(2)}ms`);
            }
        }
        return parts.join('\n');
    }

    printReport() { console.log(this.getFullReport()); }

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

    async sendTimingDataToServer() {
        if (!this.enabled) return;
        try {
            const response = await fetch('/sage_utils/timing_data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source: 'javascript', data: this.exportToObject() })
            });
            if (!response.ok && shouldLogTimingDetails()) {
                console.warn('[TIMING] Failed to send timing data:', response.statusText);
            }
        } catch (error) {
            if (shouldLogTimingDetails()) console.warn('[TIMING] Error sending timing data:', error);
        }
    }
}

// Runtime flag readers (lazy, only called when settings dialog is opened)
function readRuntimeTimingFlags() {
    const params = new URLSearchParams(window.location.search);
    return {
        perfMonitoring: localStorage.getItem('sageutils_perf_monitoring') === 'true' || params.get('sageutils_perf') === '1',
        sendTiming: localStorage.getItem('sageutils_send_timing') === 'true' || params.get('sageutils_timing') === '1',
        printTiming: localStorage.getItem('sageutils_print_timing') === 'true' || params.get('sageutils_timing_print') === '1'
    };
}

function isPerfMonitoringEnabled() { return readRuntimeTimingFlags().perfMonitoring; }
function shouldSendTimingData() { return readRuntimeTimingFlags().sendTiming; }
function shouldPrintTimingReport() { return readRuntimeTimingFlags().printTiming; }
function shouldLogTimingDetails() { const f = readRuntimeTimingFlags(); return f.perfMonitoring || f.printTiming; }

// Global timer instances — disabled by default unless explicitly enabled
const javascriptTimer = new PerformanceTimer("JavaScript");
const uiTimer = new PerformanceTimer("UI");
if (!isPerfMonitoringEnabled()) {
    javascriptTimer.disable();
    uiTimer.disable();
}

// Convenience functions (kept for backward compatibility)
function startTimer(operation, timer = javascriptTimer) { timer.startTimer(operation); }
function endTimer(operation, timer = javascriptTimer) { return timer.endTimer(operation); }
function timeFunction(operation, func, timer = javascriptTimer) { return timer.timeFunction(operation, func); }
function recordInitializationMilestone(milestone, timer = javascriptTimer) { timer.recordInitializationMilestone(milestone); }
function completeInitialization(timer = javascriptTimer) { return timer.completeInitialization(); }
function printTimingReport(timer = javascriptTimer) { timer.printReport(); }

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
    printTimingReport,
    isPerfMonitoringEnabled,
    shouldSendTimingData,
    shouldPrintTimingReport,
    shouldLogTimingDetails
};

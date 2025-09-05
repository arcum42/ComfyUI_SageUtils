/**
 * ComfyUI Startup Gap Analyzer
 * 
 * This script specifically monitors what happens between extension resource loading
 * and when ComfyUI actually calls the extension setup() functions.
 */

class ComfyUIGapAnalyzer {
    constructor() {
        this.enabled = window.location.search.includes('sageutils_gap_analysis=1');
        if (!this.enabled) return;
        
        this.startTime = performance.now();
        this.gapEvents = [];
        this.comfyUIState = {};
        
        console.log('🔍 ComfyUI Gap Analysis enabled - monitoring ComfyUI startup process');
        this.monitorComfyUIStartup();
    }
    
    log(message, data = {}) {
        if (!this.enabled) return;
        
        const elapsed = performance.now() - this.startTime;
        const event = {
            time: elapsed,
            message,
            data,
            stack: new Error().stack.split('\n').slice(2, 4).join('\n') // Just first 2 stack frames
        };
        
        this.gapEvents.push(event);
        console.log(`[GAP ${elapsed.toFixed(0)}ms] ${message}`, data);
    }
    
    monitorComfyUIStartup() {
        // Monitor app object creation and modification
        this.monitorAppObject();
        
        // Monitor graph-related objects
        this.monitorGraphObjects();
        
        // Monitor extension registration and setup calls
        this.monitorExtensionSystem();
        
        // Monitor DOM for ComfyUI UI creation
        this.monitorComfyUIDOM();
        
        // Monitor for specific ComfyUI modules loading
        this.monitorModuleLoading();
        
        // Check for blocking operations
        this.monitorBlockingOperations();
        
        // Report periodically during the gap
        this.startPeriodicReports();
    }
    
    monitorAppObject() {
        // Watch for app object creation/modification
        let appObjectCreated = false;
        
        const checkApp = () => {
            if (window.app && !appObjectCreated) {
                appObjectCreated = true;
                this.log('ComfyUI app object created', {
                    keys: Object.keys(window.app),
                    hasGraph: !!window.app.graph,
                    hasExtensionManager: !!window.app.extensionManager
                });
                
                // Monitor extension manager
                if (window.app.extensionManager) {
                    this.monitorExtensionManager(window.app.extensionManager);
                }
            }
        };
        
        // Check immediately and then periodically
        checkApp();
        const appCheckInterval = setInterval(checkApp, 100);
        
        // Stop checking after 35 seconds
        setTimeout(() => clearInterval(appCheckInterval), 35000);
    }
    
    monitorExtensionManager(extensionManager) {
        this.log('Extension manager available', {
            hasRegisterExtension: typeof extensionManager.registerExtension === 'function',
            hasRegisterSidebarTab: typeof extensionManager.registerSidebarTab === 'function'
        });
        
        // Hook registerExtension if it exists
        if (extensionManager.registerExtension) {
            const originalRegisterExtension = extensionManager.registerExtension;
            extensionManager.registerExtension = (extension) => {
                this.log('Extension being registered', {
                    name: extension.name,
                    hasSetup: typeof extension.setup === 'function',
                    hasBeforeRegisterNodeDef: typeof extension.beforeRegisterNodeDef === 'function'
                });
                
                // Hook the setup function to know when it's called
                if (extension.setup) {
                    const originalSetup = extension.setup;
                    extension.setup = async (...args) => {
                        this.log(`Extension ${extension.name} setup() called`);
                        const result = await originalSetup(...args);
                        this.log(`Extension ${extension.name} setup() completed`);
                        return result;
                    };
                }
                
                return originalRegisterExtension.call(this, extension);
            };
        }
    }
    
    monitorGraphObjects() {
        // Monitor for LiteGraph and graph creation
        const checkGraph = () => {
            if (window.LiteGraph && !this.comfyUIState.liteGraphFound) {
                this.comfyUIState.liteGraphFound = true;
                this.log('LiteGraph available', {
                    version: window.LiteGraph.VERSION,
                    hasLGraph: !!window.LiteGraph.LGraph
                });
            }
            
            if (window.graph && !this.comfyUIState.graphFound) {
                this.comfyUIState.graphFound = true;
                this.log('Graph object created', {
                    constructor: window.graph.constructor.name,
                    hasNodes: !!window.graph.nodes,
                    nodeCount: window.graph.nodes ? window.graph.nodes.length : 0
                });
            }
        };
        
        const graphCheckInterval = setInterval(checkGraph, 100);
        setTimeout(() => clearInterval(graphCheckInterval), 35000);
    }
    
    monitorExtensionSystem() {
        // Look for extension loading indicators in the DOM or console
        // Note: Avoiding console.log override to prevent recursion
        // Instead, we'll monitor other extension system indicators
        
        // Monitor window for extension-related objects
        const checkExtensionObjects = () => {
            // Check for extension loader or manager
            if (window.ComfyUI?.extensionManager && !this.comfyUIState.extensionManagerFound) {
                this.comfyUIState.extensionManagerFound = true;
                this.log('ComfyUI extension manager found');
            }
            
            // Check for loaded extensions
            if (window.app?.extensions && !this.comfyUIState.extensionsFound) {
                this.comfyUIState.extensionsFound = true;
                this.log('Extensions array found', { count: window.app.extensions.length });
            }
        };
        
        const extensionCheckInterval = setInterval(checkExtensionObjects, 200);
        setTimeout(() => clearInterval(extensionCheckInterval), 35000);
    }
    
    monitorComfyUIDOM() {
        // Monitor for ComfyUI-specific DOM elements
        const observer = new MutationObserver((mutations) => {
            try {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Safe property access with type checking
                            const className = node.className;
                            const nodeId = node.id;
                            
                            if (typeof className === 'string' && (
                                className.includes('comfy-') ||
                                className.includes('litegraph') ||
                                nodeId === 'graph-canvas'
                            )) {
                                this.log('ComfyUI UI element added', {
                                    tagName: node.tagName,
                                    className: className,
                                    id: nodeId || ''
                                });
                            }
                        }
                    }
                }
            } catch (error) {
                // Silently handle DOM observation errors to prevent breaking other extensions
                console.error('DOM observation error:', error.message);
            }
        });
        
        try {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            // Clean up after gap period
            setTimeout(() => observer.disconnect(), 35000);
        } catch (error) {
            console.error('Failed to start DOM observer:', error.message);
        }
    }
    
    monitorModuleLoading() {
        // Monitor for dynamic imports or script loading
        const originalImport = window.import;
        if (originalImport) {
            window.import = (specifier) => {
                this.log('Dynamic import', { specifier });
                return originalImport(specifier);
            };
        }
    }
    
    monitorBlockingOperations() {
        // Monitor for potential blocking operations
        let lastHeartbeat = performance.now();
        
        const heartbeat = () => {
            const now = performance.now();
            const gap = now - lastHeartbeat;
            
            if (gap > 500) { // More than 500ms since last heartbeat = blocking
                this.log('Potential blocking operation detected', {
                    gapDuration: `${gap.toFixed(0)}ms`,
                    at: `${(now - this.startTime).toFixed(0)}ms`
                });
            }
            
            lastHeartbeat = now;
        };
        
        const heartbeatInterval = setInterval(heartbeat, 100);
        setTimeout(() => clearInterval(heartbeatInterval), 35000);
    }
    
    startPeriodicReports() {
        const reportInterval = setInterval(() => {
            const elapsed = performance.now() - this.startTime;
            
            // Report every 5 seconds during the critical gap period
            if (elapsed > 1000 && elapsed < 35000 && elapsed % 5000 < 200) {
                this.log('Periodic status report', {
                    elapsed: `${elapsed.toFixed(0)}ms`,
                    comfyUIState: this.comfyUIState,
                    hasApp: !!window.app,
                    hasGraph: !!window.graph,
                    hasLiteGraph: !!window.LiteGraph
                });
            }
            
            // Stop reporting after 35 seconds
            if (elapsed > 35000) {
                clearInterval(reportInterval);
                this.generateFinalReport();
            }
        }, 100);
    }
    
    generateFinalReport() {
        if (!this.enabled || this.gapEvents.length === 0) return;
        
        console.group('📊 ComfyUI Gap Analysis Report');
        
        // Timeline of events
        console.log('Timeline of events during the gap:');
        this.gapEvents.forEach(event => {
            console.log(`${event.time.toFixed(0)}ms: ${event.message}`, event.data);
        });
        
        // Summary
        console.log('\nSummary:');
        console.log(`- Total events logged: ${this.gapEvents.length}`);
        console.log(`- App object created: ${this.comfyUIState.liteGraphFound ? 'Yes' : 'No'}`);
        console.log(`- Graph object created: ${this.comfyUIState.graphFound ? 'Yes' : 'No'}`);
        console.log(`- LiteGraph available: ${this.comfyUIState.liteGraphFound ? 'Yes' : 'No'}`);
        
        // Find potential bottlenecks
        const blockingEvents = this.gapEvents.filter(event => 
            event.message.includes('blocking') || event.message.includes('gap')
        );
        
        if (blockingEvents.length > 0) {
            console.log('\nPotential bottlenecks:');
            blockingEvents.forEach(event => {
                console.log(`- ${event.time.toFixed(0)}ms: ${event.message}`, event.data);
            });
        }
        
        console.groupEnd();
    }
}

// Initialize the analyzer
window.comfyUIGapAnalyzer = new ComfyUIGapAnalyzer();

// Also add a simple function to check what's happening
window.checkComfyUIState = () => {
    console.log('Current ComfyUI state:', {
        app: !!window.app,
        graph: !!window.graph,
        LiteGraph: !!window.LiteGraph,
        extensionManager: !!window.app?.extensionManager,
        canvas: !!document.getElementById('graph-canvas')
    });
};

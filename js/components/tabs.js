/**
 * Tab Management System
 * 
 * Provides a centralized TabManager class and helper functions for creating
 * tabbed interfaces with consistent styling, lazy loading, and state management.
 * 
 * @module components/tabs
 */

/**
 * TabManager - Manages a tabbed interface
 * 
 * Features:
 * - Lazy loading of tab content
 * - State management (active tab, initialized tabs)
 * - Automatic event handling
 * - Visibility control
 * - Consistent styling
 * 
 * @example
 * const tabManager = new TabManager({
 *   container: document.getElementById('myTabs'),
 *   onTabSwitch: (tabId) => console.log('Switched to:', tabId)
 * });
 * 
 * tabManager.addTab('home', 'Home', (container) => {
 *   container.innerHTML = '<p>Home content</p>';
 * });
 * 
 * tabManager.addTab('settings', 'Settings', (container) => {
 *   container.innerHTML = '<p>Settings content</p>';
 * }, { visible: true });
 * 
 * tabManager.init();
 */
const TAB_MANAGER_STYLE_ID = 'sageutils-tab-manager-styles';

function ensureTabManagerStyles() {
    if (document.getElementById(TAB_MANAGER_STYLE_ID)) {
        return;
    }

    const style = document.createElement('style');
    style.id = TAB_MANAGER_STYLE_ID;
    style.textContent = `
        .sage-tabs-header {
            display: flex;
            background: #1e1e1e;
            border-bottom: 2px solid #333;
            padding: 0 10px;
            gap: 2px;
            overflow-x: auto;
            min-height: 50px;
            position: relative;
        }

        .sage-tabs-content-area {
            flex: 1;
            overflow: auto;
        }

        .sage-tab-button {
            padding: 10px 20px;
            border: none;
            background: #2a2a2a;
            color: #ccc;
            cursor: pointer;
            border-radius: 6px 6px 0 0;
            font-size: 13px;
            font-weight: normal;
            transition: all 0.2s ease;
            border-bottom: 2px solid transparent;
            position: relative;
            top: 2px;
            flex-shrink: 0;
            transform: translateY(0);
        }

        .sage-tab-button:hover:not(.active) {
            background: #3a3a3a;
            color: white;
            transform: translateY(-1px);
        }

        .sage-tab-button.active {
            background: #4CAF50;
            color: white;
            font-weight: bold;
            border-bottom: 2px solid #4CAF50;
            transform: translateY(-1px);
        }

        .sage-tab-container {
            display: none;
            height: 100%;
            overflow: auto;
        }

        .sage-tab-container.active {
            display: block;
        }
    `;

    document.head.appendChild(style);
}

export class TabManager {
    /**
     * Create a TabManager
     * @param {Object} options - Configuration options
     * @param {HTMLElement} options.container - Parent container element
     * @param {Function} [options.onTabSwitch] - Callback when tab is switched (tabId)
     * @param {Function} [options.onTabInit] - Callback when tab is initialized (tabId)
     * @param {string} [options.defaultTab] - Default active tab ID
     * @param {boolean} [options.lazyLoad=true] - Enable lazy loading of tab content
     * @param {Object} [options.styles] - Custom style overrides
     */
    constructor(options = {}) {
        this.container = options.container;
        this.onTabSwitch = options.onTabSwitch || null;
        this.onTabInit = options.onTabInit || null;
        this.defaultTab = options.defaultTab || null;
        this.lazyLoad = options.lazyLoad !== false;
        this.customStyles = options.styles || {};
        
        // State
        this.tabs = new Map(); // tabId -> tab config
        this.activeTabId = null;
        this.initializedTabs = new Set();
        
        // DOM elements
        this.tabHeader = null;
        this.tabContent = null;
        this.tabButtons = new Map(); // tabId -> button element
        this.tabContainers = new Map(); // tabId -> content container
        this.initializingTabs = new Set();
        this.cleanupCallbacks = new Set();
    }

    /**
     * Normalize tab definition into a lifecycle contract.
     * Supports legacy factory functions and newer lifecycle objects.
     * @private
     * @param {Function|Object} tabDefinition - Function(container) or { mount, unmount, refresh }
     * @returns {{mount: Function, unmount: Function|null, refresh: Function|null}}
     */
    resolveTabLifecycle(tabDefinition) {
        if (typeof tabDefinition === 'function') {
            return {
                mount: tabDefinition,
                unmount: null,
                refresh: null
            };
        }

        if (tabDefinition && typeof tabDefinition === 'object' && typeof tabDefinition.mount === 'function') {
            return {
                mount: tabDefinition.mount,
                unmount: typeof tabDefinition.unmount === 'function' ? tabDefinition.unmount : null,
                refresh: typeof tabDefinition.refresh === 'function' ? tabDefinition.refresh : null
            };
        }

        throw new Error('TabManager: tab definition must be a function or an object with a mount method');
    }

    /**
     * Execute tab refresh if available.
     * @private
     * @param {Object} config - Tab configuration
     */
    executeTabRefresh(config) {
        const refreshFn = config?.instance?.refresh || config?.lifecycle?.refresh;
        if (typeof refreshFn !== 'function') {
            return;
        }

        try {
            refreshFn({ tabId: config.id, tabManager: this });
        } catch (error) {
            console.warn(`TabManager: refresh failed for tab '${config.id}':`, error);
        }
    }

    /**
     * Execute tab unmount if available.
     * @private
     * @param {Object} config - Tab configuration
     */
    executeTabUnmount(config) {
        const hasMounted = this.initializedTabs.has(config?.id);
        const unmountFn = config?.instance?.unmount || (hasMounted ? config?.lifecycle?.unmount : null);
        if (typeof unmountFn !== 'function') {
            return;
        }

        try {
            unmountFn({ tabId: config.id, tabManager: this });
        } catch (error) {
            console.warn(`TabManager: unmount failed for tab '${config.id}':`, error);
        }
    }

    /**
     * Register a cleanup callback that should run on destroy.
     * @param {Function} cleanup - Callback executed during destroy
     * @returns {Function} Unregister cleanup callback
     */
    registerCleanup(cleanup) {
        if (typeof cleanup !== 'function') {
            return () => {};
        }

        this.cleanupCallbacks.add(cleanup);
        return () => {
            this.cleanupCallbacks.delete(cleanup);
        };
    }
    
    /**
     * Initialize the tab manager - creates header and content areas
     */
    init() {
        if (!this.container) {
            throw new Error('TabManager: container element is required');
        }

        ensureTabManagerStyles();
        
        // Create tab header
        this.tabHeader = document.createElement('div');
        this.tabHeader.className = 'tab-header sage-tabs-header';
        if (this.customStyles.header) {
            this.tabHeader.style.cssText = this.customStyles.header;
        }
        
        // Create tab content area
        this.tabContent = document.createElement('div');
        this.tabContent.className = 'tab-content-area sage-tabs-content-area';
        if (this.customStyles.content) {
            this.tabContent.style.cssText = this.customStyles.content;
        }
        
        this.container.appendChild(this.tabHeader);
        this.container.appendChild(this.tabContent);
        
        return this;
    }
    
    /**
     * Add a tab to the manager
     * @param {string} id - Unique tab identifier
     * @param {string} label - Tab button label
    * @param {Function|Object} tabDefinition - Legacy factory (container => void) or lifecycle object
    *                                        with { mount(container, context), optional unmount(context), optional refresh(context) }
     * @param {Object} [options] - Tab options
     * @param {boolean} [options.visible=true] - Whether tab is visible
     * @param {boolean} [options.active=false] - Whether tab should be active initially
     * @param {string} [options.icon] - Optional icon/emoji for tab button
     * @param {Object} [options.data] - Custom data associated with tab
     * @returns {TabManager} Returns this for chaining
     */
    addTab(id, label, tabDefinition, options = {}) {
        if (this.tabs.has(id)) {
            console.warn(`TabManager: tab with id '${id}' already exists`);
            return this;
        }
        
        const tabConfig = {
            id,
            label,
            lifecycle: this.resolveTabLifecycle(tabDefinition),
            instance: null,
            visible: options.visible !== false,
            icon: options.icon || '',
            data: options.data || {}
        };
        
        this.tabs.set(id, tabConfig);
        
        // Create tab button if visible
        if (tabConfig.visible) {
            this.createTabButton(id);
        }
        
        // Create content container
        this.createTabContainer(id);
        
        // Set as default tab if specified
        if (options.active && !this.defaultTab) {
            this.defaultTab = id;
        }
        
        return this;
    }
    
    /**
     * Create a tab button
     * @private
     * @param {string} tabId - Tab ID
     */
    createTabButton(tabId) {
        const config = this.tabs.get(tabId);
        if (!config) return;
        
        const button = document.createElement('button');
        button.className = 'tab-button sage-tab-button';
        button.dataset.tabId = tabId;
        
        const displayText = config.icon ? `${config.icon} ${config.label}` : config.label;
        button.textContent = displayText;
        
        if (this.customStyles.button) {
            button.style.cssText = this.customStyles.button;
        }
        
        // Click handler
        button.addEventListener('click', () => this.switchTab(tabId));
        
        this.tabButtons.set(tabId, button);
        this.tabHeader.appendChild(button);
    }
    
    /**
     * Create a tab content container
     * @private
     * @param {string} tabId - Tab ID
     */
    createTabContainer(tabId) {
        const container = document.createElement('div');
        container.className = 'tab-container sage-tab-container';
        container.dataset.tabId = tabId;
        
        this.tabContainers.set(tabId, container);
        this.tabContent.appendChild(container);
    }
    
    /**
     * Switch to a specific tab
     * @param {string} tabId - ID of tab to activate
     * @returns {boolean} True if switch was successful
     */
    switchTab(tabId) {
        const config = this.tabs.get(tabId);
        if (!config) {
            console.error(`TabManager: Unknown tab '${tabId}'`);
            return false;
        }
        
        if (!config.visible) {
            console.warn(`TabManager: Cannot switch to hidden tab '${tabId}'`);
            return false;
        }
        
        try {
            // Update button styles
            this.tabButtons.forEach((button, id) => {
                const isActive = id === tabId;
                button.classList.toggle('active', isActive);
            });
            
            // Hide all containers
            this.tabContainers.forEach(container => {
                container.classList.remove('active');
            });
            
            // Show active container
            const container = this.tabContainers.get(tabId);
            if (container) {
                container.classList.add('active');
            }
            
            // Initialize tab content if needed (lazy loading)
            if (this.lazyLoad && !this.initializedTabs.has(tabId)) {
                this.initializeTab(tabId, true); // Show loading for user-initiated switches
            } else if (this.initializedTabs.has(tabId)) {
                // Optional hook for tab content that needs refresh-on-show behavior.
                this.executeTabRefresh(config);
            }
            
            this.activeTabId = tabId;
            
            // Callback
            if (this.onTabSwitch) {
                this.onTabSwitch(tabId);
            }
            
            return true;
        } catch (error) {
            console.error(`TabManager: Error switching to tab '${tabId}':`, error);
            return false;
        }
    }
    
    /**
     * Initialize tab content
     * @private
     * @param {string} tabId - Tab ID
     * @param {boolean} [showLoading=true] - Whether to show loading state
     */
    initializeTab(tabId, showLoading = true) {
        const config = this.tabs.get(tabId);
        const container = this.tabContainers.get(tabId);
        
        if (!config || !container) return;
        
        // Skip if already initialized
        if (this.initializedTabs.has(tabId)) {
            console.debug(`TabManager: Tab '${tabId}' already initialized, skipping`);
            return;
        }

        // Skip duplicate initialization attempts while async mount is in progress.
        if (this.initializingTabs.has(tabId)) {
            console.debug(`TabManager: Tab '${tabId}' is already initializing, skipping`);
            return;
        }

        this.initializingTabs.add(tabId);
        
        console.debug(`TabManager: Initializing tab '${tabId}'`);
        
        try {
            // Show loading state only if requested (skip for background preloading)
            if (showLoading) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #888;">
                        <div style="font-size: 16px; margin-bottom: 10px;">Loading ${config.label}...</div>
                        <div style="font-size: 12px;">Please wait</div>
                    </div>
                `;
            }
            
            // Initialize content immediately for background loading, with small delay for user-initiated
            const initDelay = showLoading ? 50 : 0;
            
            setTimeout(async () => {
                try {
                    container.innerHTML = ''; // Clear loading message
                    const mountResult = await config.lifecycle.mount(container, {
                        tabId,
                        tabManager: this,
                        isBackground: !showLoading
                    });

                    if (typeof mountResult === 'function') {
                        config.instance = {
                            unmount: mountResult,
                            refresh: null
                        };
                    } else if (mountResult && typeof mountResult === 'object') {
                        config.instance = {
                            unmount: typeof mountResult.unmount === 'function'
                                ? mountResult.unmount
                                : (typeof mountResult.destroy === 'function' ? mountResult.destroy : null),
                            refresh: typeof mountResult.refresh === 'function' ? mountResult.refresh : null
                        };
                    } else {
                        config.instance = null;
                    }

                    this.initializedTabs.add(tabId);
                    console.debug(`TabManager: Tab '${tabId}' initialized successfully`);
                    
                    // Callback
                    if (this.onTabInit) {
                        this.onTabInit(tabId);
                    }
                } catch (error) {
                    console.error(`TabManager: Error initializing tab '${tabId}':`, error);
                    container.innerHTML = `
                        <div style="color: #f44336; padding: 20px; text-align: center;">
                            <div style="font-size: 16px; margin-bottom: 10px;">Error loading ${config.label}</div>
                            <div style="font-size: 14px; opacity: 0.8;">${error.message}</div>
                        </div>
                    `;
                } finally {
                    this.initializingTabs.delete(tabId);
                }
            }, initDelay);
        } catch (error) {
            console.error(`TabManager: Error setting up initialization for tab '${tabId}':`, error);
            container.innerHTML = `
                <div style="color: #f44336; padding: 20px; text-align: center;">
                    Error: ${error.message}
                </div>
            `;
            this.initializingTabs.delete(tabId);
        }
    }
    
    /**
     * Remove a tab
     * @param {string} tabId - Tab ID to remove
     * @returns {boolean} True if removal was successful
     */
    removeTab(tabId) {
        const config = this.tabs.get(tabId);
        if (!config) {
            console.warn(`TabManager: Cannot remove non-existent tab '${tabId}'`);
            return false;
        }

        this.executeTabUnmount(config);
        
        // Remove button
        const button = this.tabButtons.get(tabId);
        if (button && button.parentNode) {
            button.parentNode.removeChild(button);
        }
        this.tabButtons.delete(tabId);
        
        // Remove container
        const container = this.tabContainers.get(tabId);
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
        this.tabContainers.delete(tabId);
        
        // Remove from state
        this.tabs.delete(tabId);
        this.initializedTabs.delete(tabId);
        this.initializingTabs.delete(tabId);
        
        // If active tab was removed, switch to first available
        if (this.activeTabId === tabId) {
            const firstTab = Array.from(this.tabs.keys()).find(id => this.tabs.get(id).visible);
            if (firstTab) {
                this.switchTab(firstTab);
            } else {
                this.activeTabId = null;
            }
        }
        
        return true;
    }
    
    /**
     * Show a hidden tab
     * @param {string} tabId - Tab ID to show
     * @returns {boolean} True if successful
     */
    showTab(tabId) {
        const config = this.tabs.get(tabId);
        if (!config) {
            console.warn(`TabManager: Cannot show non-existent tab '${tabId}'`);
            return false;
        }
        
        if (config.visible) {
            return true; // Already visible
        }
        
        config.visible = true;
        
        // Create button if it doesn't exist
        if (!this.tabButtons.has(tabId)) {
            this.createTabButton(tabId);
        } else {
            const button = this.tabButtons.get(tabId);
            button.style.display = 'block';
        }
        
        return true;
    }
    
    /**
     * Hide a tab
     * @param {string} tabId - Tab ID to hide
     * @returns {boolean} True if successful
     */
    hideTab(tabId) {
        const config = this.tabs.get(tabId);
        if (!config) {
            console.warn(`TabManager: Cannot hide non-existent tab '${tabId}'`);
            return false;
        }
        
        config.visible = false;
        
        const button = this.tabButtons.get(tabId);
        if (button) {
            button.style.display = 'none';
        }
        
        // If active tab is being hidden, switch to first visible
        if (this.activeTabId === tabId) {
            const firstVisible = Array.from(this.tabs.keys()).find(id => this.tabs.get(id).visible);
            if (firstVisible) {
                this.switchTab(firstVisible);
            }
        }
        
        return true;
    }
    
    /**
     * Get the currently active tab ID
     * @returns {string|null} Active tab ID or null if none active
     */
    getActiveTab() {
        return this.activeTabId;
    }
    
    /**
     * Check if a tab has been initialized
     * @param {string} tabId - Tab ID to check
     * @returns {boolean} True if tab has been initialized
     */
    isTabInitialized(tabId) {
        return this.initializedTabs.has(tabId);
    }
    
    /**
     * Get all tab IDs
     * @returns {string[]} Array of tab IDs
     */
    getTabIds() {
        return Array.from(this.tabs.keys());
    }
    
    /**
     * Get all visible tab IDs
     * @returns {string[]} Array of visible tab IDs
     */
    getVisibleTabIds() {
        return Array.from(this.tabs.keys()).filter(id => this.tabs.get(id).visible);
    }
    
    /**
     * Activate the first visible tab (usually called after adding all tabs)
     * @returns {boolean} True if a tab was activated
     */
    activateFirstTab() {
        const firstTab = this.defaultTab || this.getVisibleTabIds()[0];
        if (firstTab) {
            return this.switchTab(firstTab);
        }
        return false;
    }
    
    /**
     * Preload tabs during idle time
     * Initializes uninitialized tabs in the background to improve responsiveness
     * Uses requestIdleCallback to avoid blocking the main thread
     * @param {Object} [options] - Preload options
     * @param {number} [options.maxIdleTime=50] - Maximum time to spend in each idle callback (ms)
     * @param {number} [options.timeout=2000] - Timeout for idle callback (ms)
     * @param {string[]} [options.priority] - Array of tab IDs to prioritize for preloading
     */
    preloadTabsDuringIdle(options = {}) {
        const maxIdleTime = options.maxIdleTime || 50; // kept for API compatibility (no longer a hard gate)
        const timeout = options.timeout || 2000;
        const priorityTabs = options.priority || [];
        
        // Get uninitialized tabs
        const uninitializedTabs = this.getVisibleTabIds().filter(
            tabId => !this.initializedTabs.has(tabId) && tabId !== this.activeTabId
        );
        
        if (uninitializedTabs.length === 0) {
            console.debug('[TabManager] All tabs already initialized');
            return;
        }
        
        // Sort tabs by priority
        const sortedTabs = [...uninitializedTabs].sort((a, b) => {
            const aPriority = priorityTabs.indexOf(a);
            const bPriority = priorityTabs.indexOf(b);
            
            // If both have priority, sort by priority order
            if (aPriority !== -1 && bPriority !== -1) {
                return aPriority - bPriority;
            }
            // Priority tabs come first
            if (aPriority !== -1) return -1;
            if (bPriority !== -1) return 1;
            // Otherwise maintain original order
            return 0;
        });
        
        console.debug(`[TabManager] Starting background preload for ${sortedTabs.length} tabs:`, sortedTabs);
        
        // Use requestIdleCallback to initialize tabs during idle time
        const preloadNextTab = (index) => {
            if (index >= sortedTabs.length) {
                console.debug('[TabManager] Background preload complete');
                return;
            }
            
            const tabId = sortedTabs[index];
            
            // Skip if tab was initialized by user interaction in the meantime
            if (this.initializedTabs.has(tabId)) {
                console.debug(`[TabManager] Tab '${tabId}' already initialized, skipping preload`);
                preloadNextTab(index + 1);
                return;
            }
            
            // Check if browser supports requestIdleCallback
            if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(() => {
                    // Skip if tab was initialized while waiting
                    if (this.initializedTabs.has(tabId)) {
                        console.debug(`[TabManager] Tab '${tabId}' already initialized, skipping preload`);
                        preloadNextTab(index + 1);
                        return;
                    }
                    
                    console.debug(`[TabManager] Preloading tab '${tabId}' during idle time`);
                    this.initializeTab(tabId, false); // No loading message for background
                    
                    // Schedule next tab
                    preloadNextTab(index + 1);
                }, { timeout });
            } else {
                // Fallback for browsers without requestIdleCallback
                console.debug(`[TabManager] Preloading tab '${tabId}' using setTimeout fallback`);
                setTimeout(() => {
                    if (!this.initializedTabs.has(tabId)) {
                        this.initializeTab(tabId, false); // No loading message for background
                    }
                    preloadNextTab(index + 1);
                }, 100);
            }
        };
        
        // Start preloading
        preloadNextTab(0);
    }
    
    /**
     * Update tab visibility based on settings object
     * @param {Object} visibilitySettings - Object mapping tab IDs to boolean visibility
     * @example
     * tabManager.updateVisibility({
     *   'home': true,
     *   'settings': false,
     *   'about': true
     * });
     */
    updateVisibility(visibilitySettings) {
        Object.entries(visibilitySettings).forEach(([tabId, visible]) => {
            if (visible) {
                this.showTab(tabId);
            } else {
                this.hideTab(tabId);
            }
        });
    }
    
    /**
     * Cleanup and destroy the tab manager
     */
    destroy() {
        // Run externally registered cleanup callbacks first.
        this.cleanupCallbacks.forEach((cleanup) => {
            try {
                cleanup();
            } catch (error) {
                console.warn('TabManager: cleanup callback failed:', error);
            }
        });
        this.cleanupCallbacks.clear();

        // Legacy observer compatibility for existing call sites.
        if (this.settingsButtonResizeObserver && typeof this.settingsButtonResizeObserver.disconnect === 'function') {
            try {
                this.settingsButtonResizeObserver.disconnect();
            } catch (error) {
                console.warn('TabManager: failed to disconnect settingsButtonResizeObserver:', error);
            }
            this.settingsButtonResizeObserver = null;
        }

        // Remove all tabs
        this.getTabIds().forEach(id => this.removeTab(id));
        
        // Remove DOM elements
        if (this.tabHeader && this.tabHeader.parentNode) {
            this.tabHeader.parentNode.removeChild(this.tabHeader);
        }
        if (this.tabContent && this.tabContent.parentNode) {
            this.tabContent.parentNode.removeChild(this.tabContent);
        }
        
        // Clear state
        this.tabs.clear();
        this.tabButtons.clear();
        this.tabContainers.clear();
        this.initializedTabs.clear();
        this.activeTabId = null;
    }
}

/**
 * Create a standalone tab button (for use outside TabManager)
 * @param {string} text - Button text
 * @param {boolean} isActive - Whether the button is initially active
 * @param {Object} [options] - Style options
 * @returns {HTMLElement} Tab button element
 * 
 * @deprecated Use TabManager class instead for better state management
 */
export function createTabButton(text, isActive = false, options = {}) {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.cssText = `
        padding: 10px 20px;
        border: none;
        background: ${isActive ? '#4CAF50' : '#2a2a2a'};
        color: ${isActive ? 'white' : '#ccc'};
        cursor: pointer;
        border-radius: 6px 6px 0 0;
        margin-right: 2px;
        font-size: 13px;
        font-weight: ${isActive ? 'bold' : 'normal'};
        transition: all 0.2s ease;
        border-bottom: 2px solid ${isActive ? '#4CAF50' : 'transparent'};
        position: relative;
        top: 2px;
        ${options.customStyles || ''}
    `;
    
    // Hover effects
    button.addEventListener('mouseenter', () => {
        if (!button.classList.contains('active')) {
            button.style.background = '#3a3a3a';
            button.style.color = 'white';
            button.style.transform = 'translateY(-1px)';
        }
    });
    
    button.addEventListener('mouseleave', () => {
        if (!button.classList.contains('active')) {
            button.style.background = '#2a2a2a';
            button.style.color = '#ccc';
            button.style.transform = 'translateY(0)';
        }
    });
    
    return button;
}

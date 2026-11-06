/**
 * Tab Management System
 * 
 * Provides a centralized TabManager class and helper functions for creating
 * tabbed interfaces with consistent styling, lazy loading, and state management.
 * 
 * @module components/tabs
 */

import { loadComponentStyles as ensureComponentStyles } from './styleLoader.js';
import { whenStylesSettled, getFailedStyles, retryFailedStyles } from '../sidebar/sidebarStyles.js';
import { createStatusBanner } from './statusBanner.js';

console.log('[SageUtils] tabs.js imported');

function loadComponentStyles() {
    ensureComponentStyles('tabs.js');
}

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

function isTabDebugEnabled() {
    try {
        if (typeof window === 'undefined') {
            return false;
        }

        const debugFlag = window.localStorage?.getItem('sageutils_tab_debug') === 'true';
        const queryFlag = new URLSearchParams(window.location.search).get('sage_tab_debug') === '1';
        return debugFlag || queryFlag;
    } catch {
        return false;
    }
}

function logTabDebug(...args) {
    if (isTabDebugEnabled()) {
        console.debug(...args);
    }
}

function ensureTabManagerStyles() {
    loadComponentStyles();
}

function applyCustomStyles(element, cssText) {
    if (!cssText || typeof cssText !== 'string') {
        return;
    }

    cssText.split(';').forEach((declaration) => {
        const [rawName, rawValue] = declaration.split(':');
        if (!rawName || rawValue === undefined) {
            return;
        }

        const styleName = rawName.trim().replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
        const styleValue = rawValue.trim();
        if (styleValue) {
            element.style[styleName] = styleValue;
        }
    });
}

let tabManagerCounter = 0;

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
        this.idPrefix = `sage-tabs-${++tabManagerCounter}`;
        this.tabContent = null;
        this.tabButtons = new Map(); // tabId -> button element
        this.tabContainers = new Map(); // tabId -> content container
        this.initializingTabs = new Set();
        this.cleanupCallbacks = new Set();
        this.pendingInitTimeouts = new Map();
        this.activePreloadSession = null;
        this.isDestroyed = false;
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

        if (this.isDestroyed) {
            try {
                cleanup();
            } catch (error) {
                console.warn('TabManager: late cleanup callback failed:', error);
            }
            return () => {};
        }

        this.cleanupCallbacks.add(cleanup);
        return () => {
            this.cleanupCallbacks.delete(cleanup);
        };
    }

    /**
     * Cancel a pending initialization timeout.
     * @private
     * @param {string} tabId - Tab ID
     */
    cancelPendingInit(tabId) {
        const timeoutId = this.pendingInitTimeouts.get(tabId);
        if (timeoutId === undefined) {
            return;
        }

        clearTimeout(timeoutId);
        this.pendingInitTimeouts.delete(tabId);
        this.initializingTabs.delete(tabId);
    }

    /**
     * Cancel all pending initialization timeouts.
     * @private
     */
    cancelAllPendingInits() {
        this.pendingInitTimeouts.forEach((timeoutId) => {
            clearTimeout(timeoutId);
        });
        this.pendingInitTimeouts.clear();
        this.initializingTabs.clear();
    }

    /**
     * Dispose a mount result that resolved after the tab manager was torn down.
     * @private
     * @param {string} tabId - Tab ID
     * @param {Function|Object|null} mountResult - Resolved mount result
     */
    cleanupDeferredMountResult(tabId, mountResult) {
        const cleanup = typeof mountResult === 'function'
            ? mountResult
            : (typeof mountResult?.unmount === 'function'
                ? mountResult.unmount
                : (typeof mountResult?.destroy === 'function' ? mountResult.destroy : null));

        if (typeof cleanup !== 'function') {
            return;
        }

        try {
            cleanup({ tabId, tabManager: this });
        } catch (error) {
            console.warn(`TabManager: deferred cleanup failed for tab '${tabId}':`, error);
        }
    }

    /**
     * Cancel the active background preload session, if any.
     */
    cancelScheduledPreloads() {
        const session = this.activePreloadSession;
        if (!session) {
            return;
        }

        session.cancelled = true;

        if (session.idleCallbackId !== null && typeof cancelIdleCallback === 'function') {
            cancelIdleCallback(session.idleCallbackId);
        }

        if (session.timeoutId !== null) {
            clearTimeout(session.timeoutId);
        }

        this.activePreloadSession = null;
    }
    
    /**
     * Initialize the tab manager - creates header and content areas
     */
    init() {
        if (!this.container) {
            throw new Error('TabManager: container element is required');
        }

        this.isDestroyed = false;
        ensureTabManagerStyles();
        
        // Create tab header
        this.tabHeader = document.createElement('div');
        this.tabHeader.className = 'tab-header sage-tabs-header';
        this.tabHeader.setAttribute('role', 'tablist');
        this.tabHeader.setAttribute('aria-label', 'Sage Utils sections');
        this.tabHeader.addEventListener('keydown', (event) => this.handleTabKeydown(event));
        if (this.customStyles.header) {
            applyCustomStyles(this.tabHeader, this.customStyles.header);
        }
        
        // Create tab content area
        this.tabContent = document.createElement('div');
        this.tabContent.className = 'tab-content-area sage-tabs-content-area';
        if (this.customStyles.content) {
            applyCustomStyles(this.tabContent, this.customStyles.content);
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
        button.type = 'button';
        button.id = `${this.idPrefix}-tab-${tabId}`;
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-controls', `${this.idPrefix}-panel-${tabId}`);
        button.setAttribute('aria-selected', 'false');
        button.tabIndex = -1;
        
        const displayText = config.icon ? `${config.icon} ${config.label}` : config.label;
        button.textContent = displayText;
        
        if (this.customStyles.button) {
            applyCustomStyles(button, this.customStyles.button);
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
        container.id = `${this.idPrefix}-panel-${tabId}`;
        container.setAttribute('role', 'tabpanel');
        container.setAttribute('aria-labelledby', `${this.idPrefix}-tab-${tabId}`);
        container.hidden = true;
        
        this.tabContainers.set(tabId, container);
        this.tabContent.appendChild(container);
    }
    
    /**
     * Visible tab IDs in display order
     * @returns {string[]}
     */
    getVisibleTabIds() {
        return Array.from(this.tabs.keys()).filter(id => this.tabs.get(id).visible);
    }

    /**
     * Arrow/Home/End keyboard navigation for the tablist
     * @private
     */
    handleTabKeydown(event) {
        const current = event.target.closest?.('[role="tab"]');
        if (!current) return;
        const ids = this.getVisibleTabIds();
        const index = ids.indexOf(current.dataset.tabId);
        if (index < 0 || ids.length === 0) return;

        let next = null;
        switch (event.key) {
            case 'ArrowRight': next = ids[(index + 1) % ids.length]; break;
            case 'ArrowLeft': next = ids[(index - 1 + ids.length) % ids.length]; break;
            case 'Home': next = ids[0]; break;
            case 'End': next = ids[ids.length - 1]; break;
            default: return;
        }
        event.preventDefault();
        if (this.switchTab(next)) {
            this.tabButtons.get(next)?.focus();
        }
    }

    /**
     * Switch to a specific tab
     * @param {string} tabId - ID of tab to activate
     * @returns {boolean} True if switch was successful
     */
    switchTab(tabId) {
        if (this.isDestroyed) {
            return false;
        }

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
                button.setAttribute('aria-selected', String(isActive));
                button.tabIndex = isActive ? 0 : -1;
            });
            
            // Hide all containers
            this.tabContainers.forEach(container => {
                container.classList.remove('active');
                container.hidden = true;
            });
            
            // Show active container
            const container = this.tabContainers.get(tabId);
            if (container) {
                container.classList.add('active');
                container.hidden = false;
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
        if (this.isDestroyed) return;

        const config = this.tabs.get(tabId);
        const container = this.tabContainers.get(tabId);
        
        if (!config || !container) return;
        
        // Skip if already initialized
        if (this.initializedTabs.has(tabId)) {
            logTabDebug(`TabManager: Tab '${tabId}' already initialized, skipping`);
            return;
        }

        // Skip duplicate initialization attempts while async mount is in progress.
        if (this.initializingTabs.has(tabId)) {
            logTabDebug(`TabManager: Tab '${tabId}' is already initializing, skipping`);
            return;
        }

        this.initializingTabs.add(tabId);
        
        logTabDebug(`TabManager: Initializing tab '${tabId}'`);
        
        try {
            // Show loading state only if requested (skip for background preloading)
            if (showLoading) {
                container.innerHTML = `
                    <div class="sage-tab-loading" role="status" aria-live="polite">
                        <div class="sage-tab-loading-heading">Loading ${config.label}...</div>
                        <div class="sage-tab-loading-message">Please wait</div>
                    </div>
                `;
            }
            
            // Initialize content immediately for background loading, with small delay for user-initiated
            const initDelay = showLoading ? 50 : 0;
            
            const timeoutId = setTimeout(async () => {
                this.pendingInitTimeouts.delete(tabId);

                if (this.isDestroyed || !this.tabs.has(tabId) || this.tabContainers.get(tabId) !== container) {
                    this.initializingTabs.delete(tabId);
                    return;
                }

                try {
                    container.innerHTML = ''; // Clear loading message
                    container.dataset.sageStyles = 'pending';
                    container.setAttribute('aria-busy', 'true');
                    const mountResult = await config.lifecycle.mount(container, {
                        tabId,
                        tabManager: this,
                        isBackground: !showLoading
                    });

                    if (this.isDestroyed || !this.tabs.has(tabId) || this.tabContainers.get(tabId) !== container) {
                        this.cleanupDeferredMountResult(tabId, mountResult);
                        return;
                    }

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
                    logTabDebug(`TabManager: Tab '${tabId}' initialized successfully`);
                    this.settleTabStyles(container);
                    
                    // Callback
                    if (this.onTabInit) {
                        this.onTabInit(tabId);
                    }
                } catch (error) {
                    console.error(`TabManager: Error initializing tab '${tabId}':`, error);
                    if (!this.isDestroyed && this.tabs.has(tabId)) {
                        this.renderTabError(container, config, error, () => {
                            if (container.isConnected && !this.isDestroyed) {
                                container.innerHTML = '';
                                this.initializeTab(tabId, true);
                            }
                        });
                    }
                } finally {
                    this.initializingTabs.delete(tabId);
                }
            }, initDelay);

            this.pendingInitTimeouts.set(tabId, timeoutId);
        } catch (error) {
            console.error(`TabManager: Error setting up initialization for tab '${tabId}':`, error);
            if (!this.isDestroyed && this.tabs.has(tabId)) {
                this.renderTabError(container, config, error, () => {
                    if (container.isConnected && !this.isDestroyed) {
                        container.innerHTML = '';
                        this.initializeTab(tabId, true);
                    }
                });
            }
            this.initializingTabs.delete(tabId);
        }
    }

    /**
     * Reveal a mounted tab once its stylesheets settle; if any failed, keep the
     * (unstyled but usable) content visible with a retry banner.
     * @private
     */
    async settleTabStyles(container) {
        await whenStylesSettled();
        if (this.isDestroyed || !container.isConnected) return;

        delete container.dataset.sageStyles;
        container.removeAttribute('aria-busy');
        container.querySelector(':scope > .sage-style-warning')?.remove();

        if (getFailedStyles().length === 0) return;

        const banner = createStatusBanner({
            type: 'warning',
            message: 'Some styles failed to load, so this tab may look unstyled.',
            actionLabel: 'Retry',
            onAction: async () => {
                const ok = await retryFailedStyles();
                if (ok) banner.remove();
            }
        });
        banner.classList.add('sage-style-warning');
        container.prepend(banner);
    }

    /**
     * Render a safe, retryable tab mount error.
     * @private
     */
    renderTabError(container, config, error, onRetry) {
        const panel = document.createElement('div');
        panel.className = 'sage-tab-error';
        panel.setAttribute('role', 'alert');

        const heading = document.createElement('div');
        heading.className = 'sage-tab-error-heading';
        heading.textContent = `Error loading ${config.label}`;

        const message = document.createElement('div');
        message.className = 'sage-tab-error-text';
        message.textContent = error instanceof Error ? error.message : String(error);

        const retryButton = document.createElement('button');
        retryButton.type = 'button';
        retryButton.className = 'sage-tab-error-retry';
        retryButton.textContent = 'Retry';
        retryButton.addEventListener('click', onRetry, { once: true });

        panel.append(heading, message, retryButton);
        container.replaceChildren(panel);
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

        this.cancelPendingInit(tabId);
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
        if (!this.isDestroyed && this.activeTabId === tabId) {
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
            button.classList.remove('sage-tab-hidden');
            button.hidden = false;
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
            button.classList.add('sage-tab-hidden');
            button.hidden = true;
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
        this.cancelScheduledPreloads();

        const maxIdleTime = options.maxIdleTime || 50; // kept for API compatibility (no longer a hard gate)
        const timeout = options.timeout || 2000;
        const priorityTabs = options.priority || [];
        
        // Get uninitialized tabs
        const uninitializedTabs = this.getVisibleTabIds().filter(
            tabId => !this.initializedTabs.has(tabId) && tabId !== this.activeTabId
        );
        
        if (uninitializedTabs.length === 0) {
            logTabDebug('[TabManager] All tabs already initialized');
            return { cancel: () => {} };
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
        
        logTabDebug(`[TabManager] Starting background preload for ${sortedTabs.length} tabs:`, sortedTabs);

        const session = {
            cancelled: false,
            idleCallbackId: null,
            timeoutId: null,
            cancel: () => {
                if (this.activePreloadSession !== session) {
                    return;
                }
                this.cancelScheduledPreloads();
            }
        };
        this.activePreloadSession = session;

        const finishSession = () => {
            if (this.activePreloadSession === session) {
                this.activePreloadSession = null;
            }
        };
        
        // Resolve once a background mount settles (bounded so a stuck mount cannot stall warmup)
        const waitForMount = (tabId) => new Promise((resolve) => {
            const startedAt = Date.now();
            const check = () => {
                if (session.cancelled || this.isDestroyed || !this.initializingTabs.has(tabId)
                    || Date.now() - startedAt > 10000) {
                    resolve();
                    return;
                }
                session.timeoutId = setTimeout(check, 50);
            };
            check();
        });

        // Use requestIdleCallback to initialize tabs during idle time
        const preloadNextTab = (index) => {
            if (session.cancelled || this.isDestroyed) {
                finishSession();
                return;
            }

            if (index >= sortedTabs.length) {
                logTabDebug('[TabManager] Background preload complete');
                finishSession();
                return;
            }
            
            const tabId = sortedTabs[index];
            
            // Skip if tab was initialized by user interaction in the meantime
            if (this.initializedTabs.has(tabId)) {
                logTabDebug(`[TabManager] Tab '${tabId}' already initialized, skipping preload`);
                preloadNextTab(index + 1);
                return;
            }
            
            // Check if browser supports requestIdleCallback
            if (typeof requestIdleCallback === 'function') {
                session.idleCallbackId = requestIdleCallback(() => {
                    session.idleCallbackId = null;

                    if (session.cancelled || this.isDestroyed) {
                        finishSession();
                        return;
                    }

                    // Skip if tab was initialized while waiting
                    if (this.initializedTabs.has(tabId)) {
                        logTabDebug(`[TabManager] Tab '${tabId}' already initialized, skipping preload`);
                        preloadNextTab(index + 1);
                        return;
                    }
                    
                    logTabDebug(`[TabManager] Preloading tab '${tabId}' during idle time`);
                    this.initializeTab(tabId, false); // No loading message for background
                    
                    // Warm tabs one at a time so mounts do not stack up and block the UI
                    waitForMount(tabId).then(() => preloadNextTab(index + 1));
                }, { timeout });
            } else {
                // Fallback for browsers without requestIdleCallback
                logTabDebug(`[TabManager] Preloading tab '${tabId}' using setTimeout fallback`);
                session.timeoutId = setTimeout(() => {
                    session.timeoutId = null;

                    if (session.cancelled || this.isDestroyed) {
                        finishSession();
                        return;
                    }

                    if (!this.initializedTabs.has(tabId)) {
                        this.initializeTab(tabId, false); // No loading message for background
                    }
                    waitForMount(tabId).then(() => preloadNextTab(index + 1));
                }, 100);
            }
        };
        
        // Start preloading
        preloadNextTab(0);
        return session;
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
        if (this.isDestroyed) {
            return;
        }

        this.isDestroyed = true;
        this.cancelScheduledPreloads();
        this.cancelAllPendingInits();

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
    button.className = `tab-button sage-tab-button${isActive ? ' active' : ''}`;
    if (options.customStyles) {
        applyCustomStyles(button, options.customStyles);
    }
    return button;
}

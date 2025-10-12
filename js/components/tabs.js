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
    }
    
    /**
     * Initialize the tab manager - creates header and content areas
     */
    init() {
        if (!this.container) {
            throw new Error('TabManager: container element is required');
        }
        
        // Create tab header
        this.tabHeader = document.createElement('div');
        this.tabHeader.className = 'tab-header';
        this.tabHeader.style.cssText = `
            display: flex;
            background: #1e1e1e;
            border-bottom: 2px solid #333;
            padding: 0 10px;
            gap: 2px;
            overflow-x: auto;
            min-height: 50px;
            position: relative;
            ${this.customStyles.header || ''}
        `;
        
        // Create tab content area
        this.tabContent = document.createElement('div');
        this.tabContent.className = 'tab-content-area';
        this.tabContent.style.cssText = `
            flex: 1;
            overflow: auto;
            ${this.customStyles.content || ''}
        `;
        
        this.container.appendChild(this.tabHeader);
        this.container.appendChild(this.tabContent);
        
        return this;
    }
    
    /**
     * Add a tab to the manager
     * @param {string} id - Unique tab identifier
     * @param {string} label - Tab button label
     * @param {Function} contentFactory - Function to create tab content: (container) => void
     * @param {Object} [options] - Tab options
     * @param {boolean} [options.visible=true] - Whether tab is visible
     * @param {boolean} [options.active=false] - Whether tab should be active initially
     * @param {string} [options.icon] - Optional icon/emoji for tab button
     * @param {Object} [options.data] - Custom data associated with tab
     * @returns {TabManager} Returns this for chaining
     */
    addTab(id, label, contentFactory, options = {}) {
        if (this.tabs.has(id)) {
            console.warn(`TabManager: tab with id '${id}' already exists`);
            return this;
        }
        
        const tabConfig = {
            id,
            label,
            contentFactory,
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
        button.className = 'tab-button';
        button.dataset.tabId = tabId;
        
        const displayText = config.icon ? `${config.icon} ${config.label}` : config.label;
        button.textContent = displayText;
        
        button.style.cssText = `
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
            ${this.customStyles.button || ''}
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
        container.className = 'tab-container';
        container.dataset.tabId = tabId;
        container.style.cssText = `
            display: none;
            height: 100%;
            overflow: auto;
        `;
        
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
                button.style.background = isActive ? '#4CAF50' : '#2a2a2a';
                button.style.color = isActive ? 'white' : '#ccc';
                button.style.fontWeight = isActive ? 'bold' : 'normal';
                button.style.borderBottom = isActive ? '2px solid #4CAF50' : '2px solid transparent';
                button.style.transform = isActive ? 'translateY(-1px)' : 'translateY(0)';
            });
            
            // Hide all containers
            this.tabContainers.forEach(container => {
                container.style.display = 'none';
            });
            
            // Show active container
            const container = this.tabContainers.get(tabId);
            if (container) {
                container.style.display = 'block';
            }
            
            // Initialize tab content if needed (lazy loading)
            if (this.lazyLoad && !this.initializedTabs.has(tabId)) {
                this.initializeTab(tabId);
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
     */
    initializeTab(tabId) {
        const config = this.tabs.get(tabId);
        const container = this.tabContainers.get(tabId);
        
        if (!config || !container) return;
        
        console.debug(`TabManager: Initializing tab '${tabId}'`);
        
        try {
            // Show loading state
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #888;">
                    <div style="font-size: 16px; margin-bottom: 10px;">Loading ${config.label}...</div>
                    <div style="font-size: 12px;">Please wait</div>
                </div>
            `;
            
            // Initialize content with delay to show loading
            setTimeout(() => {
                try {
                    container.innerHTML = ''; // Clear loading message
                    config.contentFactory(container);
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
                }
            }, 50);
        } catch (error) {
            console.error(`TabManager: Error setting up initialization for tab '${tabId}':`, error);
            container.innerHTML = `
                <div style="color: #f44336; padding: 20px; text-align: center;">
                    Error: ${error.message}
                </div>
            `;
        }
    }
    
    /**
     * Remove a tab
     * @param {string} tabId - Tab ID to remove
     * @returns {boolean} True if removal was successful
     */
    removeTab(tabId) {
        if (!this.tabs.has(tabId)) {
            console.warn(`TabManager: Cannot remove non-existent tab '${tabId}'`);
            return false;
        }
        
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

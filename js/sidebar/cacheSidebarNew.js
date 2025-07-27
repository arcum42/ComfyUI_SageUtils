/**
 * SageUtils Sidebar Tab with Multiple Sub-tabs
 * Multi-tabbed interface for model browser and notes manager
 */

import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";

// Import centralized state management
import { 
    getState, 
    updateState, 
    subscribe, 
    actions, 
    selectors 
} from "../shared/stateManager.js";

// Import configuration and error handling
import { 
    FILTER_OPTIONS, 
    BUTTON_CONFIGS, 
    API_ENDPOINTS,
    FILE_TYPES,
    getFileType,
    supportsPreview,
    getFileTypeIcon
} from "../shared/config.js";

import { 
    handleError, 
    handleApiError, 
    handleFileError,
    createSafeWrapper
} from "../shared/errorHandler.js";

// Import decomposed tab modules
import { createModelsTab } from "./modelsTab.js";
import { createNotesTab } from "./notesTab.js";
import { createCivitaiSearchTab } from "./civitaiSearchTab.js";

// Import cache API functions
import { 
    fetchCacheHash, 
    fetchCacheInfo 
} from "../shared/cacheApi.js";

// Import shared UI components
import {
    createMainContainer,
    createTabButton
} from "../shared/cacheUIComponents.js";

/**
 * Creates the tab header with Models and Notes tabs
 * @returns {Object} Tab header components
 */
function createTabHeader() {
    const tabHeader = document.createElement('div');
    tabHeader.style.cssText = `
        display: flex;
        border-bottom: 2px solid #4CAF50;
        margin-bottom: 15px;
        background: #1a1a1a;
        overflow-x: auto;
        min-height: 50px;
    `;

    const modelsTab = createTabButton('Models', true);
    const notesTab = createTabButton('Notes', false);
    const civitaiTab = createTabButton('Search', false);

    // Ensure tabs are properly sized
    modelsTab.style.flexShrink = '0';
    notesTab.style.flexShrink = '0';
    civitaiTab.style.flexShrink = '0';

    tabHeader.appendChild(modelsTab);
    tabHeader.appendChild(notesTab);
    tabHeader.appendChild(civitaiTab);

    return {
        tabHeader,
        modelsTab,
        notesTab,
        civitaiTab
    };
}

/**
 * Creates the main tab content container
 * @returns {HTMLElement} Tab content container
 */
function createTabContent() {
    const tabContent = document.createElement('div');
    tabContent.style.cssText = `
        flex: 1;
        overflow-y: auto;
        background: #1a1a1a;
        padding: 0;
    `;

    return tabContent;
}

/**
 * Sets up tab switching functionality
 * @param {Object} tabComponents - Tab header components
 * @param {HTMLElement} tabContent - Tab content container
 */
function setupTabSwitching(tabComponents, tabContent) {
    const { modelsTab, notesTab, civitaiTab } = tabComponents;

    /**
     * Switches between tabs
     * @param {HTMLElement} activeButton - The tab button that was clicked
     * @param {Function} tabFunction - The function to create the tab content
     */
    function switchTab(activeButton, tabFunction) {
        // Update button styles
        [modelsTab, notesTab, civitaiTab].forEach(btn => {
            btn.classList.remove('active');
            btn.style.background = '#2a2a2a';
            btn.style.color = '#ccc';
            btn.style.fontWeight = 'normal';
            btn.style.borderBottom = '2px solid transparent';
            btn.style.transform = 'translateY(0)';
        });
        
        activeButton.classList.add('active');
        activeButton.style.background = '#4CAF50';
        activeButton.style.color = 'white';
        activeButton.style.fontWeight = 'bold';
        activeButton.style.borderBottom = '2px solid #4CAF50';
        activeButton.style.transform = 'translateY(-1px)';
        
        // Clear and populate content
        tabContent.innerHTML = '';
        tabFunction(tabContent);
    }
    
    // Tab event listeners
    modelsTab.addEventListener('click', () => switchTab(modelsTab, createModelsTab));
    notesTab.addEventListener('click', () => switchTab(notesTab, createNotesTab));
    civitaiTab.addEventListener('click', () => switchTab(civitaiTab, createCivitaiSearchTab));

    return { switchTab };
}

/**
 * Initialize the cache sidebar data and state
 */
async function initializeSidebarData() {
    try {
        // Set loading state
        actions.setModelsLoading(true);
        
        // Set up error handling for the entire sidebar
        window.addEventListener('error', (event) => {
            console.error('Sidebar error caught:', event.error);
            handleError(event.error, 'Sidebar Error');
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Sidebar promise rejection:', event.reason);
            handleError(event.reason, 'Sidebar Promise Rejection');
        });
        
        // Set up state subscriptions for debugging (optional)
        subscribe((state, prevState) => {
            // Guard against undefined prevState (initial state)
            if (!prevState) return;
            
            // Only log significant state changes
            if (state.activeTab !== prevState.activeTab) {
                console.debug('Active tab changed:', prevState.activeTab, '->', state.activeTab);
            }
            
            if (state.models?.selectedHash !== prevState.models?.selectedHash) {
                console.debug('Selected model changed:', prevState.models?.selectedHash, '->', state.models?.selectedHash);
            }
            
            if (state.models?.isLoading !== prevState.models?.isLoading) {
                console.debug('Models loading state changed:', state.models?.isLoading);
            }
            
            if (state.notes?.isLoading !== prevState.notes?.isLoading) {
                console.debug('Notes loading state changed:', state.notes?.isLoading);
            }
        });
        
        // Pre-load cache data to improve initial performance
        try {
            const [hashData, infoData] = await Promise.all([
                fetchCacheHash(),
                fetchCacheInfo()
            ]);
            
            // Store in state management
            actions.setCacheData({ hash: hashData, info: infoData });
            
            console.debug('Cache data pre-loaded successfully', {
                hashEntries: Object.keys(hashData).length,
                infoEntries: Object.keys(infoData).length
            });
        } catch (cacheError) {
            console.warn('Failed to pre-load cache data:', cacheError);
            // Don't throw - let individual tabs handle their own loading
        }
        
        // Initialize API connection status check
        try {
            const response = await fetch('/sage_cache/stats');
            if (response.ok) {
                console.debug('Cache API connection verified');
            } else {
                console.warn('Cache API connection issue:', response.status);
            }
        } catch (apiError) {
            console.warn('Failed to verify API connection:', apiError);
        }
        
        // Set up periodic cache refresh (every 5 minutes)
        setInterval(async () => {
            try {
                const currentState = getState();
                // Only refresh if not currently loading and a model is selected
                if (!currentState.models.isLoading && currentState.models.selectedHash) {
                    const [hashData, infoData] = await Promise.all([
                        fetchCacheHash(),
                        fetchCacheInfo()
                    ]);
                    actions.setCacheData({ hash: hashData, info: infoData });
                    console.debug('Periodic cache refresh completed');
                }
            } catch (refreshError) {
                console.warn('Periodic cache refresh failed:', refreshError);
            }
        }, 5 * 60 * 1000); // 5 minutes
        
    } catch (error) {
        console.error('Failed to initialize sidebar data:', error);
        handleError(error, 'Sidebar Initialization Error');
    } finally {
        actions.setModelsLoading(false);
    }
}

/**
 * Main function to create the cache sidebar with tabs
 * @param {HTMLElement} el - Element to populate with the sidebar
 */
export function createCacheSidebar(el) {
    // Create main container
    const mainContainer = createMainContainer();
    
    // Create tab components
    const tabComponents = createTabHeader();
    const tabContent = createTabContent();
    
    // Setup tab switching
    setupTabSwitching(tabComponents, tabContent);
    
    // Assemble main container
    mainContainer.appendChild(tabComponents.tabHeader);
    mainContainer.appendChild(tabContent);
    
    // Add to provided element
    el.appendChild(mainContainer);
    
    // Initialize sidebar data and state
    initializeSidebarData();
    
    // Initialize with Models tab
    createModelsTab(tabContent);
}

/**
 * Legacy export for backwards compatibility
 */
export { createCacheSidebar as default };

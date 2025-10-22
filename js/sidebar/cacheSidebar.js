/**
 * SageUtils Sidebar Tab with Multiple Sub-tabs
 * Multi-tabbed interface for model browser and file manager
 * 
 * Performance Optimization: Uses hide/show approach instead of recreating tab content
 * each time, which maintains state and reduces loading times for subsequent tab switches.
 */

// Import centralized state management
import { 
    getState, 
    subscribe, 
    actions,
    selectors
} from "../shared/stateManager.js";

import { 
    handleError
} from "../shared/errorHandler.js";

// Import decomposed tab modules
import { createModelsTab } from "./modelsTab.js";
import { createModelsTabV2 } from "./modelsTabV2.js";
import { createFilesTab } from "./filesTab.js";
import { createCivitaiSearchTab } from "./civitaiSearchTab.js";
import { createImageGalleryTab } from "./imageGalleryTab.js";
import { createPromptBuilderTab } from "./promptBuilderTab.js";
import { createLLMTab } from "./llmTab.js";

// Import cache API functions
import { 
    fetchCacheHash, 
    fetchCacheInfo 
} from "../shared/api/cacheApi.js";

// Import gallery API for background preloading
import { 
    loadImagesFromFolder 
} from "../shared/api/galleryApi.js";

// Import shared UI components
import {
    createMainContainer
} from "../components/cacheUI.js";

// Import TabManager
import { TabManager } from "../components/tabs.js";

// Import API for settings
import { api } from '../../../../scripts/api.js';

// Feature flag for Models Tab V2 (set to true to use new implementation)
const USE_MODELS_TAB_V2 = true;

// Track the current sidebar element for reloading
let currentSidebarElement = null;

/**
 * Load tab visibility settings from the backend
 * @returns {Promise<Object>} Tab visibility settings
 */
async function loadTabVisibilitySettings() {
    try {
        const response = await api.fetchApi('/sage_utils/settings');
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.settings) {
                const settings = data.settings;
                return {
                    show_models_tab: settings.show_models_tab?.current_value !== false,
                    show_files_tab: settings.show_files_tab?.current_value !== false,
                    show_search_tab: settings.show_search_tab?.current_value !== false,
                    show_gallery_tab: settings.show_gallery_tab?.current_value !== false,
                    show_prompts_tab: settings.show_prompts_tab?.current_value !== false,
                    show_llm_tab: settings.show_llm_tab?.current_value !== false
                };
            }
        }
    } catch (error) {
        console.warn('Failed to load tab visibility settings, using defaults:', error);
    }
    
    // Return all tabs visible by default
    return {
        show_models_tab: true,
        show_files_tab: true,
        show_search_tab: true,
        show_gallery_tab: true,
        show_prompts_tab: true,
        show_llm_tab: true
    };
}

/**
 * Creates the tab manager with all tabs
 * @param {HTMLElement} container - Container element for tabs
 * @param {Object} tabVisibility - Object containing visibility settings for each tab
 * @param {Object} tabContentFactories - Object containing content factory functions for each tab
 * @returns {TabManager} Configured TabManager instance
 */
function createTabManager(container, tabVisibility = {}, tabContentFactories = {}) {
    const tabManager = new TabManager({
        container: container,
        lazyLoad: true,
        onTabSwitch: (tabId) => {
            console.debug(`Switched to tab: ${tabId}`);
        },
        onTabInit: (tabId) => {
            console.debug(`Initialized tab: ${tabId}`);
        }
    });
    
    // Initialize the tab manager
    tabManager.init();
    
    // Add all tabs with their visibility settings and content factories
    if (tabVisibility.show_models_tab !== false) {
        tabManager.addTab('models', 'Models', tabContentFactories.models, { active: true });
    }
    
    if (tabVisibility.show_files_tab !== false) {
        tabManager.addTab('notes', 'Files', tabContentFactories.notes);
    }
    
    if (tabVisibility.show_search_tab !== false) {
        tabManager.addTab('civitai', 'Search', tabContentFactories.civitai);
    }
    
    if (tabVisibility.show_gallery_tab !== false) {
        tabManager.addTab('gallery', 'Gallery', tabContentFactories.gallery);
    }
    
    if (tabVisibility.show_prompts_tab !== false) {
        tabManager.addTab('promptBuilder', 'Prompts', tabContentFactories.promptBuilder);
    }
    
    if (tabVisibility.show_llm_tab !== false) {
        tabManager.addTab('llm', 'LLM', tabContentFactories.llm);
    }
    
    // Add settings button to the tab header
    const settingsButton = document.createElement('button');
    settingsButton.innerHTML = '⚙️';
    settingsButton.title = 'Settings';
    settingsButton.className = 'sidebar-settings-button';
    settingsButton.style.cssText = `
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        background: #2a2a2a;
        border: 1px solid #444;
        border-radius: 4px;
        color: #ccc;
        padding: 6px 10px;
        cursor: pointer;
        font-size: 18px;
        transition: all 0.2s ease;
        z-index: 10;
        flex-shrink: 0;
    `;

    // Hover effect
    settingsButton.addEventListener('mouseenter', () => {
        settingsButton.style.background = '#4CAF50';
        settingsButton.style.borderColor = '#4CAF50';
        settingsButton.style.transform = 'translateY(-50%) scale(1.1)';
    });

    settingsButton.addEventListener('mouseleave', () => {
        settingsButton.style.background = '#2a2a2a';
        settingsButton.style.borderColor = '#444';
        settingsButton.style.transform = 'translateY(-50%) scale(1)';
    });

    // Click handler
    settingsButton.addEventListener('click', async () => {
        try {
            const { showSettingsDialog } = await import('../dialogs/settingsDialog.js');
            showSettingsDialog();
        } catch (error) {
            console.error('Failed to open settings dialog:', error);
            handleError(error, 'Settings Dialog Error');
        }
    });

    tabManager.tabHeader.appendChild(settingsButton);

    // Check if settings button overlaps with tabs and hide it if necessary
    const checkSettingsButtonVisibility = () => {
        const header = tabManager.tabHeader;
        const tabs = header.querySelectorAll('.tab-button');
        
        if (tabs.length === 0) return;
        
        // Calculate total width needed for tabs
        let tabsWidth = 0;
        tabs.forEach(tab => {
            tabsWidth += tab.offsetWidth;
        });
        
        // Add padding and gap spacing
        const headerPadding = 20; // 10px on each side
        const tabGaps = (tabs.length - 1) * 2; // 2px gap between tabs
        const settingsButtonWidth = 50; // Approximate width of settings button
        const requiredWidth = tabsWidth + tabGaps + headerPadding + settingsButtonWidth;
        
        // Hide button if there's not enough space
        if (header.offsetWidth < requiredWidth) {
            settingsButton.style.display = 'none';
        } else {
            settingsButton.style.display = 'block';
        }
    };

    // Check visibility on load and resize
    setTimeout(checkSettingsButtonVisibility, 100);
    
    // Use ResizeObserver to dynamically check when header size changes
    const resizeObserver = new ResizeObserver(() => {
        checkSettingsButtonVisibility();
    });
    resizeObserver.observe(tabManager.tabHeader);
    
    // Store observer for cleanup if needed
    tabManager.settingsButtonResizeObserver = resizeObserver;
    
    return tabManager;
}

// Track if global error handlers have been registered to prevent duplicates
let errorHandlersRegistered = false;

/**
 * Initialize the cache sidebar data and state
 */
async function initializeSidebarData() {
    try {
        // Set loading state
        actions.setModelsLoading(true);
        
        // Set up error handling for the entire sidebar (only once)
        if (!errorHandlersRegistered) {
            const sidebarErrorHandler = (event) => {
                console.error('Sidebar error caught:', event.error);
                // Only handle error if it exists
                if (event.error) {
                    handleError(event.error, { component: 'Sidebar', operation: 'Global Error Handler' });
                }
            };
            
            const sidebarRejectionHandler = (event) => {
                console.error('Sidebar promise rejection:', event.reason);
                // Only handle error if it exists
                if (event.reason) {
                    handleError(event.reason, { component: 'Sidebar', operation: 'Promise Rejection' });
                }
            };
            
            window.addEventListener('error', sidebarErrorHandler);
            window.addEventListener('unhandledrejection', sidebarRejectionHandler);
            errorHandlersRegistered = true;
        }
        
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
export async function createCacheSidebar(el) {
    // Store reference for potential reload
    currentSidebarElement = el;
    
    // Load tab visibility settings
    const tabVisibility = await loadTabVisibilitySettings();
    
    // Create main container
    const mainContainer = createMainContainer();
    
    // Create tab content factories for lazy loading
    const tabContentFactories = {
        models: USE_MODELS_TAB_V2 ? createModelsTabV2 : createModelsTab,
        notes: createFilesTab,
        civitai: createCivitaiSearchTab,
        gallery: createImageGalleryTab,
        promptBuilder: createPromptBuilderTab,
        llm: createLLMTab
    };
    
    // Create tab manager
    const tabManager = createTabManager(mainContainer, tabVisibility, tabContentFactories);
    
    // Add to provided element
    el.appendChild(mainContainer);
    
    // Initialize sidebar data and state
    initializeSidebarData();
    
    // Activate the first visible tab
    tabManager.activateFirstTab();
    
    // Preload gallery images in the background for better UX
    // This loads the default folder (usually 'notes') so data is ready when user clicks Gallery tab
    setTimeout(() => {
        const defaultFolder = actions ? (typeof actions.selectedFolder === 'function' ? actions.selectedFolder() : 'notes') : 'notes';
        const savedFolder = selectors.selectedFolder ? selectors.selectedFolder() : defaultFolder;
        const galleryFolder = savedFolder !== 'custom' ? savedFolder : 'notes'; // Don't auto-load custom folders
        
        console.debug(`[Sidebar] Preloading gallery images from '${galleryFolder}' folder in background...`);
        
        loadImagesFromFolder(galleryFolder, null, (msg) => {
            // Only log start and completion messages, skip progress updates to reduce console noise
            if (msg.includes('Loading images from') || msg.includes('Error') || msg.includes('Complete')) {
                console.debug(`[Sidebar Gallery Preload] ${msg}`);
            }
        }).then(() => {
            console.debug(`[Sidebar] Gallery preload complete for '${galleryFolder}' folder`);
        }).catch(err => {
            console.warn(`[Sidebar] Gallery preload failed (non-critical):`, err);
        });
    }, 500); // Small delay to avoid blocking initial sidebar render
    
    // Store references for potential external access
    el._sidebarData = {
        tabManager,
        switchTab: (tabId) => tabManager.switchTab(tabId),
        initializedTabs: tabManager.initializedTabs,
        cleanup: () => {
            // Cleanup cross-tab subscription
            if (crossTabUnsubscribe) {
                try {
                    crossTabUnsubscribe();
                    crossTabUnsubscribe = null;
                } catch (err) {
                    console.warn('[Sidebar] Error unsubscribing from cross-tab messaging:', err);
                }
            }
            // Destroy tab manager
            tabManager.destroy();
        }
    };
    
    // Subscribe to cross-tab messaging for tab switching
    // Use a slight delay to ensure all components are fully initialized
    let crossTabUnsubscribe = null;
    setTimeout(() => {
        import('../shared/crossTabMessaging.js').then(({ getEventBus, MessageTypes }) => {
            const bus = getEventBus();
            
            crossTabUnsubscribe = bus.subscribe(MessageTypes.TAB_SWITCH_REQUEST, (message) => {
                const { tabId, source } = message.data;
                
                // Map tab IDs to actual tab keys used in switchTab()
                const tabKeyMap = {
                    'llm': 'llm',
                    'gallery': 'gallery',
                    'prompts': 'promptBuilder',
                    'prompt-builder': 'promptBuilder', // Alias
                    'files': 'notes',
                    'notes': 'notes',
                    'models': 'models',
                    'civitai': 'civitai'
                };
                
                const tabKey = tabKeyMap[tabId] || tabId;
                
                // Validate that tab manager exists
                if (!tabManager) {
                    console.warn('[Sidebar] TabManager not available');
                    return;
                }
                
                console.debug(`[Sidebar] Received cross-tab switch request for '${tabId}' from ${source}, mapped to '${tabKey}'`);
                
                // Switch to the requested tab using TabManager
                try {
                    tabManager.switchTab(tabKey);
                    bus.publish(MessageTypes.TAB_SWITCHED, { tabId: tabKey, source: 'sidebar' });
                    console.debug(`[Sidebar] Successfully switched to tab: ${tabKey}`);
                } catch (error) {
                    console.error(`[Sidebar] Error switching to tab '${tabKey}':`, error);
                }
            });
            
            console.debug('[Sidebar] Subscribed to cross-tab switch requests');
        }).catch(err => {
            console.warn('[Sidebar] Failed to load cross-tab messaging:', err);
        });
    }, 100);
}

/**
 * Reload the sidebar with updated settings
 * This is called when tab visibility settings change
 */
export async function reloadCacheSidebar() {
    if (!currentSidebarElement) {
        console.warn('No sidebar element reference found for reload');
        return;
    }
    
    console.log('Reloading sidebar with updated settings...');
    
    // Clear the current sidebar content
    currentSidebarElement.innerHTML = '';
    
    // Recreate the sidebar
    await createCacheSidebar(currentSidebarElement);
    
    console.log('Sidebar reloaded successfully');
}

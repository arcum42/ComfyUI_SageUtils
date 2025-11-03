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

// Import global data cache
import { DataCache, CacheKeys } from "../shared/dataCache.js";

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

// Import performance timing utilities for telemetry persistence
import { startTimer, endTimer, javascriptTimer } from "../shared/performanceTimer.js";

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
        startTimer('Sidebar.Settings.Total');
        startTimer('Sidebar.Settings.Fetch');
        const t0 = performance.now();
        const response = await api.fetchApi('/sage_utils/settings');
        endTimer('Sidebar.Settings.Fetch');
        const t1 = performance.now();
        if (response.ok) {
            startTimer('Sidebar.Settings.Parse');
            const jsonStart = performance.now();
            const data = await response.json();
            endTimer('Sidebar.Settings.Parse');
            const jsonEnd = performance.now();
            if (data.success && data.settings) {
                const settings = data.settings;
                startTimer('Sidebar.Settings.Map');
                const mappedStart = performance.now();
                const result = {
                    show_models_tab: settings.show_models_tab?.current_value !== false,
                    show_files_tab: settings.show_files_tab?.current_value !== false,
                    show_search_tab: settings.show_search_tab?.current_value !== false,
                    show_gallery_tab: settings.show_gallery_tab?.current_value !== false,
                    show_prompts_tab: settings.show_prompts_tab?.current_value !== false,
                    show_llm_tab: settings.show_llm_tab?.current_value !== false,
                    _timing: {
                        fetch_ms: +(t1 - t0).toFixed(2),
                        parse_ms: +(jsonEnd - jsonStart).toFixed(2),
                        map_ms: +(performance.now() - mappedStart).toFixed(2),
                        total_ms: +(performance.now() - t0).toFixed(2)
                    }
                };
                endTimer('Sidebar.Settings.Map');
                console.info('[Sidebar] Settings loaded', result._timing);
                endTimer('Sidebar.Settings.Total');
                return result;
            }
        }
    } catch (error) {
        console.warn('Failed to load tab visibility settings, using defaults:', error);
    }
    
    // Return all tabs visible by default
    const fallback = {
        show_models_tab: true,
        show_files_tab: true,
        show_search_tab: true,
        show_gallery_tab: true,
        show_prompts_tab: true,
        show_llm_tab: true,
        _timing: { fallback: true }
    };
    console.info('[Sidebar] Using default visibility settings');
    endTimer('Sidebar.Settings.Total');
    return fallback;
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
        
        // Check if data is already cached from preload
        const cacheHashReady = DataCache.isReady(CacheKeys.CACHE_HASH);
        const cacheInfoReady = DataCache.isReady(CacheKeys.CACHE_INFO);
        
        if (cacheHashReady && cacheInfoReady) {
            console.debug('[Sidebar] Using preloaded cache data');
            
            // Get cached data
            const hashData = DataCache.get(CacheKeys.CACHE_HASH);
            const infoData = DataCache.get(CacheKeys.CACHE_INFO);
            
            // Store in state management
            actions.setCacheData({ hash: hashData, info: infoData });
            
            console.debug('Cache data loaded from preload', {
                hashEntries: Object.keys(hashData).length,
                infoEntries: Object.keys(infoData).length
            });
        } else {
            // Fallback: Load cache data if not preloaded
            console.debug('[Sidebar] Cache not preloaded, loading now...');
            
            try {
                const [hashData, infoData] = await Promise.all([
                    fetchCacheHash(),
                    fetchCacheInfo()
                ]);
                
                // Store in cache for future use
                DataCache.set(CacheKeys.CACHE_HASH, hashData);
                DataCache.set(CacheKeys.CACHE_INFO, infoData);
                
                // Store in state management
                actions.setCacheData({ hash: hashData, info: infoData });
                
                console.debug('Cache data loaded', {
                    hashEntries: Object.keys(hashData).length,
                    infoEntries: Object.keys(infoData).length
                });
            } catch (cacheError) {
                console.warn('Failed to load cache data:', cacheError);
                // Don't throw - let individual tabs handle their own loading
            }
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
                    
                    // Update cache
                    DataCache.set(CacheKeys.CACHE_HASH, hashData);
                    DataCache.set(CacheKeys.CACHE_INFO, infoData);
                    
                    // Update state
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
    // Store reference for potential reload
    currentSidebarElement = el;
    
    // Start with safe defaults (all tabs visible) to avoid blank UI on slow startup
    const defaultVisibility = {
        show_models_tab: true,
        show_files_tab: true,
        show_search_tab: true,
        show_gallery_tab: true,
        show_prompts_tab: true,
        show_llm_tab: true
    };
    let tabVisibility = defaultVisibility;
    
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
    
    // Add a lightweight settings loading indicator in the tab header
    const settingsIndicator = document.createElement('div');
    settingsIndicator.textContent = 'Loading settings…';
    settingsIndicator.className = 'sidebar-settings-indicator';
    settingsIndicator.style.cssText = `
        position: absolute;
        right: 60px;
        top: 50%;
        transform: translateY(-50%);
        background: #2a2a2a;
        border: 1px solid #444;
        border-radius: 4px;
        color: #ddd;
        padding: 4px 8px;
        font-size: 12px;
        opacity: 0.9;
        z-index: 9;
    `;
    // The tabHeader exists post-init inside TabManager
    try { tabManager.tabHeader.appendChild(settingsIndicator); } catch { /* no-op */ }

    // Initialize sidebar data and state
    initializeSidebarData();
    
    // Activate the first visible tab
    tabManager.activateFirstTab();

    // Load tab visibility settings asynchronously and apply when ready
    // This prevents a blank sidebar if the settings endpoint is slow or unavailable at startup
    const settingsLoadStart = performance.now();
    loadTabVisibilitySettings().then((settings) => {
        try {
            tabVisibility = settings || defaultVisibility;
            const mapStart = performance.now();
            const visibilityMap = {
                models: tabVisibility.show_models_tab !== false,
                notes: tabVisibility.show_files_tab !== false,
                civitai: tabVisibility.show_search_tab !== false,
                gallery: tabVisibility.show_gallery_tab !== false,
                promptBuilder: tabVisibility.show_prompts_tab !== false,
                llm: tabVisibility.show_llm_tab !== false
            };

            // Ensure at least one tab remains visible to avoid a blank sidebar
            const anyVisible = Object.values(visibilityMap).some(v => v);
            if (!anyVisible) {
                console.warn('[Sidebar] All tabs were configured hidden; forcing Models tab visible to avoid blank UI.');
                visibilityMap.models = true;
            }
            const mapEnd = performance.now();
            const updateStart = performance.now();
            startTimer('Sidebar.Visibility.Update');
            tabManager.updateVisibility(visibilityMap);
            endTimer('Sidebar.Visibility.Update');
            const updateEnd = performance.now();

            // If current active tab became hidden, activate the first visible tab
            const activeId = tabManager.getActiveTab();
            const activateStart = performance.now();
            startTimer('Sidebar.Visibility.Activate');
            if (!activeId || !visibilityMap[activeId]) {
                tabManager.activateFirstTab();
            }
            endTimer('Sidebar.Visibility.Activate');
            const activateEnd = performance.now();

            // Log a breakdown of where time was spent
            const totalMs = +(performance.now() - settingsLoadStart).toFixed(2);
            const fetchMs = settings?._timing?.fetch_ms ?? null;
            const parseMs = settings?._timing?.parse_ms ?? null;
            const mapMs = settings?._timing?.map_ms ?? +(mapEnd - mapStart).toFixed(2);
            const updateMs = +(updateEnd - updateStart).toFixed(2);
            const activateMs = +(activateEnd - activateStart).toFixed(2);
            console.info('[Sidebar] Visibility settings applied', {
                total_ms: totalMs,
                fetch_ms: fetchMs,
                parse_ms: parseMs,
                map_ms: mapMs,
                update_visibility_ms: updateMs,
                activate_ms: activateMs
            });

            // Optionally persist timing immediately if telemetry is enabled
            const shouldSendTiming = localStorage.getItem('sageutils_send_timing') === 'true' || 
                                     new URLSearchParams(window.location.search).get('sageutils_timing') === '1';
            if (shouldSendTiming) {
                javascriptTimer.sendTimingDataToServer?.().catch(() => {});
            }

            // Remove or update the indicator
            if (settingsIndicator?.parentNode) {
                settingsIndicator.textContent = `Settings applied in ${totalMs} ms`;
                setTimeout(() => {
                    try { settingsIndicator.parentNode.removeChild(settingsIndicator); } catch { /* no-op */ }
                }, 1200);
            }
        } catch (e) {
            console.warn('[Sidebar] Failed applying visibility settings, continuing with defaults:', e);
            if (settingsIndicator?.parentNode) {
                try { settingsIndicator.parentNode.removeChild(settingsIndicator); } catch { /* no-op */ }
            }
        }
    }).catch((e) => {
        console.warn('[Sidebar] Visibility settings load failed, using defaults:', e);
        if (settingsIndicator?.parentNode) {
            try { settingsIndicator.parentNode.removeChild(settingsIndicator); } catch { /* no-op */ }
        }
    });
    
    // Start background preloading of other tabs during idle time
    // Priority order: commonly used tabs first
    setTimeout(() => {
        console.debug('[Sidebar] Starting background tab preloading...');
        tabManager.preloadTabsDuringIdle({
            maxIdleTime: 20,  // Lower threshold to ensure we have real idle time
            timeout: 5000,    // Longer timeout to wait for idle periods
            priority: ['llm', 'gallery', 'promptBuilder', 'notes', 'civitai']
        });
    }, 2000); // Wait 2 seconds after initial load to ensure UI is responsive
    
    // Preload gallery images in the background for better UX
    // This loads the default folder (usually 'notes') so data is ready when user clicks Gallery tab
    setTimeout(() => {
        const defaultFolder = actions ? (typeof actions.selectedFolder === 'function' ? actions.selectedFolder() : 'notes') : 'notes';
        const savedFolder = selectors.selectedFolder ? selectors.selectedFolder() : defaultFolder;
        const galleryFolder = savedFolder !== 'custom' ? savedFolder : 'notes'; // Don't auto-load custom folders
        
        // Check if already preloaded in cache
        const cacheKey = `galleryImages:${galleryFolder}`;
        if (DataCache.isReady(cacheKey)) {
            console.debug(`[Sidebar] Gallery images for '${galleryFolder}' already preloaded`);
            
            // Store in state management
            const cachedData = DataCache.get(cacheKey);
            if (cachedData && cachedData.images) {
                actions.setImages(cachedData.images);
                actions.setFolders(cachedData.folders || []);
                console.debug(`[Sidebar] Gallery cache hit: ${cachedData.images.length} images, ${cachedData.folders?.length || 0} folders`);
            }
            return;
        }
        
        console.debug(`[Sidebar] Preloading gallery images from '${galleryFolder}' folder in background...`);
        
        loadImagesFromFolder(galleryFolder, null, (msg) => {
            // Only log start and completion messages, skip progress updates to reduce console noise
            if (msg.includes('Loading images from') || msg.includes('Error') || msg.includes('Complete')) {
                console.debug(`[Sidebar Gallery Preload] ${msg}`);
            }
        }).then((result) => {
            console.debug(`[Sidebar] Gallery preload complete for '${galleryFolder}' folder`);
            
            // Store in cache for future use
            DataCache.set(cacheKey, result);
            
            // Also store in state management
            if (result && result.images) {
                actions.setImages(result.images);
                actions.setFolders(result.folders || []);
            }
        }).catch(err => {
            console.warn(`[Sidebar] Gallery preload failed (non-critical):`, err);
        });
    }, 1500); // Slightly longer delay to let tab preloading start first
    
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

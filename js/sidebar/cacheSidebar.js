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
    createMainContainer,
    createTabButton
} from "../components/cacheUI.js";

/**
 * Creates the tab header with Models, Files, Search, Gallery, Prompt Builder, and LLM tabs
 * @returns {Object} Object containing tab button elements
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
    const notesTab = createTabButton('Files', false);
    const civitaiTab = createTabButton('Search', false);
    const galleryTab = createTabButton('Gallery', false);
    const promptBuilderTab = createTabButton('Prompts', false);
    const llmTab = createTabButton('LLM', false);

    // Ensure tabs are properly sized
    modelsTab.style.flexShrink = '0';
    notesTab.style.flexShrink = '0';
    civitaiTab.style.flexShrink = '0';
    galleryTab.style.flexShrink = '0';
    promptBuilderTab.style.flexShrink = '0';
    llmTab.style.flexShrink = '0';

    tabHeader.appendChild(modelsTab);
    tabHeader.appendChild(notesTab);
    tabHeader.appendChild(civitaiTab);
    tabHeader.appendChild(galleryTab);
    tabHeader.appendChild(promptBuilderTab);
    tabHeader.appendChild(llmTab);

    return {
        tabHeader,
        modelsTab,
        notesTab,
        civitaiTab,
        galleryTab,
        promptBuilderTab,
        llmTab
    };
}

/**
 * Creates the main tab content container with individual tab containers
 * @returns {Object} Tab content container and individual tab containers
 */
function createTabContent() {
    const tabContent = document.createElement('div');
    tabContent.style.cssText = `
        flex: 1;
        overflow-y: auto;
        background: #1a1a1a;
        padding: 0;
        position: relative;
    `;

    // Create individual containers for each tab
    const modelsContainer = document.createElement('div');
    modelsContainer.style.cssText = `
        display: block;
        width: 100%;
        height: 100%;
    `;
    modelsContainer.setAttribute('data-tab', 'models');

    const notesContainer = document.createElement('div');
    notesContainer.style.cssText = `
        display: none;
        width: 100%;
        height: 100%;
    `;
    notesContainer.setAttribute('data-tab', 'notes');

    const civitaiContainer = document.createElement('div');
    civitaiContainer.style.cssText = `
        display: none;
        width: 100%;
        height: 100%;
    `;
    civitaiContainer.setAttribute('data-tab', 'civitai');

    const galleryContainer = document.createElement('div');
    galleryContainer.style.cssText = `
        display: none;
        width: 100%;
        height: 100%;
    `;
    galleryContainer.setAttribute('data-tab', 'gallery');

    const promptBuilderContainer = document.createElement('div');
    promptBuilderContainer.style.cssText = `
        display: none;
        width: 100%;
        height: 100%;
    `;
    promptBuilderContainer.setAttribute('data-tab', 'promptBuilder');

    const llmContainer = document.createElement('div');
    llmContainer.style.cssText = `
        display: none;
        width: 100%;
        height: 100%;
    `;
    llmContainer.setAttribute('data-tab', 'llm');

    // Append all containers to main content
    tabContent.appendChild(modelsContainer);
    tabContent.appendChild(notesContainer);
    tabContent.appendChild(civitaiContainer);
    tabContent.appendChild(galleryContainer);
    tabContent.appendChild(promptBuilderContainer);
    tabContent.appendChild(llmContainer);

    return {
        tabContent,
        containers: {
            models: modelsContainer,
            notes: notesContainer,
            civitai: civitaiContainer,
            gallery: galleryContainer,
            promptBuilder: promptBuilderContainer,
            llm: llmContainer
        }
    };
}

/**
 * Sets up tab switching functionality with lazy loading and hide/show approach
 * @param {Object} tabComponents - Tab header components
 * @param {Object} tabContentData - Tab content data with containers
 */
function setupTabSwitching(tabComponents, tabContentData) {
    const { modelsTab, notesTab, civitaiTab, galleryTab, promptBuilderTab, llmTab } = tabComponents;
    const { containers } = tabContentData;
    
    // Track which tabs have been initialized
    const initializedTabs = {
        models: false,
        notes: false,
        civitai: false,
        gallery: false,
        promptBuilder: false,
        llm: false
    };
    
    // Tab configuration mapping
    const tabConfig = {
        models: {
            button: modelsTab,
            container: containers.models,
            createFunction: createModelsTab
        },
        notes: {
            button: notesTab,
            container: containers.notes,
            createFunction: createFilesTab
        },
        civitai: {
            button: civitaiTab,
            container: containers.civitai,
            createFunction: createCivitaiSearchTab
        },
        gallery: {
            button: galleryTab,
            container: containers.gallery,
            createFunction: createImageGalleryTab
        },
        promptBuilder: {
            button: promptBuilderTab,
            container: containers.promptBuilder,
            createFunction: createPromptBuilderTab
        },
        llm: {
            button: llmTab,
            container: containers.llm,
            createFunction: createLLMTab
        }
    };

    /**
     * Switches between tabs using hide/show approach
     * @param {string} activeTabKey - The key of the tab to show
     */
    function switchTab(activeTabKey) {
        const config = tabConfig[activeTabKey];
        if (!config) {
            console.error(`Unknown tab: ${activeTabKey}`);
            return;
        }
        
        try {
            // Update button styles for all tabs
            Object.values(tabConfig).forEach(({ button }) => {
                button.classList.remove('active');
                button.style.background = '#2a2a2a';
                button.style.color = '#ccc';
                button.style.fontWeight = 'normal';
                button.style.borderBottom = '2px solid transparent';
                button.style.transform = 'translateY(0)';
            });
            
            // Style the active button
            config.button.classList.add('active');
            config.button.style.background = '#4CAF50';
            config.button.style.color = 'white';
            config.button.style.fontWeight = 'bold';
            config.button.style.borderBottom = '2px solid #4CAF50';
            config.button.style.transform = 'translateY(-1px)';
            
            // Hide all tab containers
            Object.values(containers).forEach(container => {
                container.style.display = 'none';
            });
            
            // Show the active tab container
            config.container.style.display = 'block';
            
            // Initialize tab content if not already done (lazy loading)
            if (!initializedTabs[activeTabKey]) {
                console.debug(`Initializing ${activeTabKey} tab for the first time`);
                
                try {
                    // Show loading state
                    config.container.innerHTML = `
                        <div style="text-align: center; padding: 40px; color: #888;">
                            <div style="font-size: 16px; margin-bottom: 10px;">Loading ${activeTabKey} tab...</div>
                            <div style="font-size: 12px;">Please wait while content is initialized</div>
                        </div>
                    `;
                    
                    // Initialize the tab content with a small delay to show loading state
                    setTimeout(() => {
                        try {
                            console.log(`Calling createFunction for ${activeTabKey} with container:`, config.container);
                            config.createFunction(config.container);
                            initializedTabs[activeTabKey] = true;
                            console.debug(`${activeTabKey} tab initialized successfully`);
                        } catch (initError) {
                            console.error(`Error initializing ${activeTabKey} tab:`, initError);
                            config.container.innerHTML = `
                                <div style="color: #f44336; padding: 20px; text-align: center;">
                                    <div style="font-size: 16px; margin-bottom: 10px;">Error loading ${activeTabKey} tab</div>
                                    <div style="font-size: 14px; opacity: 0.8;">${initError.message}</div>
                                    <button onclick="location.reload()" 
                                            style="margin-top: 15px; padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                        Reload Page
                                    </button>
                                </div>
                            `;
                        }
                    }, 50); // Small delay to ensure loading state is visible
                } catch (error) {
                    console.error(`Error setting up ${activeTabKey} tab initialization:`, error);
                    config.container.innerHTML = `
                        <div style="color: #f44336; padding: 20px; text-align: center;">
                            Error loading tab content: ${error.message}
                        </div>
                    `;
                }
            } else {
                console.debug(`Showing already initialized ${activeTabKey} tab`);
            }
            
        } catch (error) {
            console.error('Error switching tab:', error);
            handleError(error, 'Tab Switching Error');
        }
    }
    
    // Tab event listeners
    modelsTab.addEventListener('click', () => switchTab('models'));
    notesTab.addEventListener('click', () => switchTab('notes'));
    civitaiTab.addEventListener('click', () => switchTab('civitai'));
    galleryTab.addEventListener('click', () => switchTab('gallery'));
    promptBuilderTab.addEventListener('click', () => switchTab('promptBuilder'));
    llmTab.addEventListener('click', () => switchTab('llm'));

    return { switchTab, initializedTabs };
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
    const tabContentData = createTabContent();
    
    // Setup tab switching with hide/show approach
    const { switchTab, initializedTabs } = setupTabSwitching(tabComponents, tabContentData);
    
    // Assemble main container
    mainContainer.appendChild(tabComponents.tabHeader);
    mainContainer.appendChild(tabContentData.tabContent);
    
    // Add to provided element
    el.appendChild(mainContainer);
    
    // Initialize sidebar data and state
    initializeSidebarData();
    
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
        tabComponents,
        tabContentData,
        switchTab,
        initializedTabs,
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
            // Cleanup individual tabs if they have destroy methods
            Object.entries(initializedTabs).forEach(([key, tabObj]) => {
                if (tabObj && typeof tabObj.destroy === 'function') {
                    try {
                        tabObj.destroy();
                    } catch (err) {
                        console.warn(`[Sidebar] Error destroying ${key} tab:`, err);
                    }
                }
            });
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
                
                // Validate that switchTab function exists
                if (typeof switchTab !== 'function') {
                    console.warn('[Sidebar] switchTab function not available');
                    return;
                }
                
                try {
                    switchTab(tabKey);
                    bus.publish(MessageTypes.TAB_SWITCHED, { tabId: tabKey, source: 'sidebar' });
                } catch (error) {
                    console.error(`[Sidebar] Error switching to tab '${tabKey}':`, error);
                }
            });
        }).catch(err => {
            console.warn('[Sidebar] Failed to load cross-tab messaging:', err);
        });
    }, 100);
    
    // Initialize with Models tab (this will lazy load it)
    setTimeout(() => {
        switchTab('models');
    }, 0);
}

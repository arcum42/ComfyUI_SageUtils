/**
 * Centralized State Management for Sidebar
 * Provides a single source of truth for sidebar state with debugging and change tracking
 * Includes localStorage persistence to maintain state across sidebar close/reopen
 */

// LocalStorage key for persisting state
const PERSISTENCE_KEY = 'sageutils_sidebar_state';

// Debounce timer for saving state
let saveDebounceTimer = null;
const SAVE_DEBOUNCE_MS = 500;

/**
 * @typedef {Object} ModelFilters
 * @property {string} type - Model type filter ('all', 'LORA', 'Checkpoint', etc.)
 * @property {string} search - Search term filter
 * @property {string} lastUsed - Last used filter ('all', 'today', 'week', 'month', 'never')
 * @property {string} updates - Update availability filter ('all', 'available', 'none')
 * @property {string} sort - Sort criteria ('name', 'lastused', 'size', 'type', etc.)
 * @property {boolean} showNsfw - Whether to show NSFW content
 */

/**
 * @typedef {Object} ModelsTabState
 * @property {string|null} selectedHash - Currently selected model hash
 * @property {boolean} isDropdownOpen - Whether the file dropdown is open
 * @property {ModelFilters} filters - Current filter settings
 * @property {Object} cacheData - Cached model data (hash and info)
 * @property {boolean} isLoading - Whether data is currently loading
 */

/**
 * @typedef {Object} NotesTabState
 * @property {string|null} currentFile - Currently selected/edited file
 * @property {boolean} isModified - Whether current file has unsaved changes
 * @property {boolean} showPreview - Whether preview panel is visible
 * @property {Array<string>} filesData - List of available files
 * @property {boolean} isLoading - Whether file list is loading
 */

/**
 * @typedef {Object} GalleryTabState
 * @property {string} selectedFolder - Current folder ('notes', 'input', 'output', 'custom')
 * @property {Array<string>} customFolders - Array of remembered custom folder paths
 * @property {string|null} selectedImage - Currently selected image path
 * @property {Array<Object>} images - Array of image objects in current folder
 * @property {string} sortBy - Sort criteria ('name', 'name-desc', 'date', 'date-desc')
 * @property {string} searchQuery - Current search filter
 * @property {string} viewMode - View mode ('grid', 'list')
 * @property {string} thumbnailSize - Thumbnail size ('small', 'medium', 'large')
 * @property {boolean} showMetadata - Whether metadata panel is visible
 * @property {boolean} isLoading - Whether data is currently loading
 * @property {Object} fullImageView - Full image viewer state
 */

/**
 * @typedef {Object} PromptBuilderTabState
 * @property {string} positivePrompt - Positive prompt text
 * @property {string} negativePrompt - Negative prompt text
 * @property {number} seed - Random seed for generation
 * @property {number} count - Number of prompts to generate
 * @property {Array<Object>} results - Array of generated prompt results
 */

/**
 * @typedef {Object} SidebarState
 * @property {string} activeTab - Currently active tab ('models', 'notes', 'civitai', 'gallery', 'promptBuilder')
 * @property {ModelsTabState} models - Models tab state
 * @property {NotesTabState} notes - Notes tab state
 * @property {GalleryTabState} gallery - Gallery tab state
 * @property {PromptBuilderTabState} promptBuilder - Prompt Builder tab state
 */

// Initial state
const initialState = {
    activeTab: 'models',
    models: {
        selectedHash: null,
        isDropdownOpen: false,
        filters: {
            type: 'all',
            search: '',
            lastUsed: 'all',
            updates: 'all',
            sort: 'name',
            showNsfw: false
        },
        cacheData: {
            hash: {},
            info: {}
        },
        isLoading: false
    },
    notes: {
        currentFile: null,
        isModified: false,
        showPreview: false,
        filesData: [],
        isLoading: false
    },
    gallery: {
        selectedFolder: 'notes',
        customFolders: [],
        selectedImage: null,
        images: [],
        folders: [],
        currentPath: '',
        sortBy: 'name',
        searchQuery: '',
        viewMode: 'grid',
        thumbnailSize: 'medium',
        showMetadata: false,
        showMetadataOnly: false,
        isLoading: false,
        fullImageView: {
            isOpen: false,
            currentImage: null,
            showMetadata: false
        }
    },
    promptBuilder: {
        positivePrompt: '',
        negativePrompt: '',
        seed: 0,
        count: 1,
        results: []
    }
};

/**
 * Load persisted state from localStorage
 * @returns {Object|null} Persisted state or null if none exists
 */
function loadPersistedState() {
    try {
        const stored = localStorage.getItem(PERSISTENCE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // console.debug('[StateManager] Loaded persisted state from localStorage:', parsed);
            return parsed;
        } else {
            // console.debug('[StateManager] No persisted state found in localStorage');
        }
    } catch (error) {
        console.error('[StateManager] Error loading persisted state:', error);
    }
    return null;
}

/**
 * Save current state to localStorage (debounced)
 */
function savePersistedState() {
    // Clear any pending save
    if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
    }
    
    // Debounce the save operation
    saveDebounceTimer = setTimeout(() => {
        try {
            // Don't persist temporary data like loading states and cache data
            const stateToPersist = {
                activeTab: currentState.activeTab,
                models: {
                    selectedHash: currentState.models.selectedHash,
                    filters: currentState.models.filters
                },
                notes: {
                    currentFile: currentState.notes.currentFile,
                    showPreview: currentState.notes.showPreview
                },
                gallery: {
                    selectedFolder: currentState.gallery.selectedFolder,
                    customFolders: currentState.gallery.customFolders,
                    selectedImage: currentState.gallery.selectedImage,
                    currentPath: currentState.gallery.currentPath,
                    sortBy: currentState.gallery.sortBy,
                    searchQuery: currentState.gallery.searchQuery,
                    viewMode: currentState.gallery.viewMode,
                    thumbnailSize: currentState.gallery.thumbnailSize,
                    showMetadata: currentState.gallery.showMetadata,
                    showMetadataOnly: currentState.gallery.showMetadataOnly
                },
                promptBuilder: {
                    positivePrompt: currentState.promptBuilder.positivePrompt,
                    negativePrompt: currentState.promptBuilder.negativePrompt,
                    seed: currentState.promptBuilder.seed,
                    count: currentState.promptBuilder.count,
                    results: currentState.promptBuilder.results
                }
            };
            
            localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(stateToPersist));
            // console.debug('[StateManager] State persisted to localStorage');
        } catch (error) {
            console.error('[StateManager] Error saving persisted state:', error);
        }
    }, SAVE_DEBOUNCE_MS);
}

/**
 * Deep merge two objects, with source overwriting target
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
    const output = { ...target };
    
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            output[key] = deepMerge(target[key] || {}, source[key]);
        } else {
            output[key] = source[key];
        }
    }
    
    return output;
}

// Create a deep copy of initial state
let currentState = JSON.parse(JSON.stringify(initialState));

// Try to load persisted state and merge with initial state
const persistedState = loadPersistedState();
if (persistedState) {
    currentState = deepMerge(currentState, persistedState);
    // console.debug('[StateManager] Initialized with persisted state:', currentState);
} else {
    // console.debug('[StateManager] Initialized with default state:', currentState);
}

// State change listeners
const listeners = new Set();

/**
 * Get a deep copy of the current state
 * @returns {SidebarState} Current state
 */
export function getState() {
    return JSON.parse(JSON.stringify(currentState));
}

/**
 * Get a specific part of the state using dot notation
 * @param {string} path - Path to the state value (e.g., 'models.selectedHash')
 * @returns {any} State value at the specified path
 */
export function getStateValue(path) {
    const keys = path.split('.');
    let value = currentState;
    
    for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
            value = value[key];
        } else {
            return undefined;
        }
    }
    
    return value;
}

/**
 * Deep equality check for comparing values
 * @param {any} a - First value
 * @param {any} b - Second value
 * @returns {boolean} Whether values are deeply equal
 */
function deepEqual(a, b) {
    if (a === b) return true;
    
    if (a == null || b == null) return a === b;
    
    if (typeof a !== typeof b) return false;
    
    if (typeof a !== 'object') return a === b;
    
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    
    if (Array.isArray(a)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!deepEqual(a[i], b[i])) return false;
        }
        return true;
    }
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!deepEqual(a[key], b[key])) return false;
    }
    
    return true;
}

/**
 * Update state immutably with change tracking and validation
 * @param {string} path - Path to the state value (e.g., 'models.selectedHash')
 * @param {any} value - New value to set
 * @param {string} [action] - Optional action description for debugging
 */
export function updateState(path, value, action = 'update') {
    const oldValue = getStateValue(path);
    
    // Debug logging to track rapid updates
    if (window._stateUpdateDebug) {
        console.log(`[StateManager] updateState called: path="${path}", action="${action}"`, { oldValue, newValue: value });
    }
    
    // Don't update if value hasn't changed (deep comparison for objects, shallow for primitives)
    if (deepEqual(oldValue, value)) {
        return;
    }
    
    // Create new state with immutable update
    const newState = JSON.parse(JSON.stringify(currentState));
    const keys = path.split('.');
    let target = newState;
    
    // Navigate to the parent object
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!target[key] || typeof target[key] !== 'object') {
            target[key] = {};
        }
        target = target[key];
    }
    
    // Set the final value
    const finalKey = keys[keys.length - 1];
    target[finalKey] = value;
    
    // Validate state structure
    if (!validateState(newState)) {
        console.error('[StateManager] Invalid state structure after update:', newState);
        return;
    }
    
    // Update current state
    const previousState = currentState;
    currentState = newState;
    
    // Notify listeners
    notifyListeners({
        type: 'stateChange',
        path,
        oldValue,
        newValue: value,
        action,
        previousState: JSON.parse(JSON.stringify(previousState)),
        currentState: getState()
    });
}

/**
 * Subscribe to state changes
 * @param {Function} listener - Function to call on state changes
 * @returns {Function} Unsubscribe function
 */
export function subscribe(listener) {
    listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
        listeners.delete(listener);
    };
}

/**
 * Notify all listeners of state changes and trigger persistence
 * @param {Object} changeInfo - Information about the change
 */
function notifyListeners(changeInfo) {
    listeners.forEach(listener => {
        try {
            listener(changeInfo);
        } catch (error) {
            console.error('[StateManager] Error in listener:', error);
        }
    });
    
    // Trigger persistence after state changes
    savePersistedState();
}

/**
 * Validate state structure to prevent corruption
 * @param {Object} state - State to validate
 * @returns {boolean} Whether state is valid
 */
function validateState(state) {
    try {
        // Check required top-level keys
        const requiredKeys = ['activeTab', 'models', 'notes', 'gallery', 'promptBuilder'];
        for (const key of requiredKeys) {
            if (!(key in state)) {
                console.error(`[StateManager] Missing required key: ${key}`);
                return false;
            }
        }
        
        // Validate activeTab
        if (!['models', 'notes', 'civitai', 'gallery', 'promptBuilder'].includes(state.activeTab)) {
            console.error(`[StateManager] Invalid activeTab: ${state.activeTab}`);
            return false;
        }
        
        // Validate models section
        if (!state.models || typeof state.models !== 'object') {
            console.error('[StateManager] Invalid models section');
            return false;
        }
        
        // Validate notes section
        if (!state.notes || typeof state.notes !== 'object') {
            console.error('[StateManager] Invalid notes section');
            return false;
        }
        
        // Validate gallery section
        if (!state.gallery || typeof state.gallery !== 'object') {
            console.error('[StateManager] Invalid gallery section');
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('[StateManager] State validation error:', error);
        return false;
    }
}

/**
 * Convenient selectors for common state access patterns
 */
export const selectors = {
    // Models tab selectors
    selectedHash: () => getStateValue('models.selectedHash'),
    isDropdownOpen: () => getStateValue('models.isDropdownOpen'),
    modelFilters: () => getStateValue('models.filters'),
    cacheData: () => getStateValue('models.cacheData'),
    isModelsLoading: () => getStateValue('models.isLoading'),
    
    // Notes tab selectors
    currentFile: () => getStateValue('notes.currentFile'),
    isModified: () => getStateValue('notes.isModified'),
    showPreview: () => getStateValue('notes.showPreview'),
    filesData: () => getStateValue('notes.filesData'),
    isNotesLoading: () => getStateValue('notes.isLoading'),
    
    // Gallery tab selectors
    selectedFolder: () => getStateValue('gallery.selectedFolder'),
    customFolders: () => getStateValue('gallery.customFolders'),
    selectedImage: () => getStateValue('gallery.selectedImage'),
    galleryImages: () => getStateValue('gallery.images'),
    galleryFolders: () => getStateValue('gallery.folders'),
    currentPath: () => getStateValue('gallery.currentPath'),
    gallerySortBy: () => getStateValue('gallery.sortBy'),
    gallerySearchQuery: () => getStateValue('gallery.searchQuery'),
    galleryViewMode: () => getStateValue('gallery.viewMode'),
    thumbnailSize: () => getStateValue('gallery.thumbnailSize'),
    showGalleryMetadata: () => getStateValue('gallery.showMetadata'),
    showMetadataOnly: () => getStateValue('gallery.showMetadataOnly'),
    isGalleryLoading: () => getStateValue('gallery.isLoading'),
    fullImageView: () => getStateValue('gallery.fullImageView'),
    
    // Prompt Builder tab selectors
    positivePrompt: () => getStateValue('promptBuilder.positivePrompt'),
    negativePrompt: () => getStateValue('promptBuilder.negativePrompt'),
    promptSeed: () => getStateValue('promptBuilder.seed'),
    promptCount: () => getStateValue('promptBuilder.count'),
    promptResults: () => getStateValue('promptBuilder.results'),
    
    // General selectors
    activeTab: () => getStateValue('activeTab')
};

/**
 * Action creators for common state updates
 */
export const actions = {
    // Models tab actions
    selectModel: (hash) => updateState('models.selectedHash', hash, 'selectModel'),
    toggleDropdown: (isOpen) => updateState('models.isDropdownOpen', isOpen, 'toggleDropdown'),
    updateFilters: (filters) => updateState('models.filters', { ...getStateValue('models.filters'), ...filters }, 'updateFilters'),
    setCacheData: (data) => updateState('models.cacheData', data, 'setCacheData'),
    setModelsLoading: (loading) => updateState('models.isLoading', loading, 'setModelsLoading'),
    
    // Notes tab actions
    selectFile: (filename) => updateState('notes.currentFile', filename, 'selectFile'),
    setModified: (modified) => updateState('notes.isModified', modified, 'setModified'),
    togglePreview: (show) => updateState('notes.showPreview', show, 'togglePreview'),
    setFilesData: (files) => updateState('notes.filesData', files, 'setFilesData'),
    setNotesLoading: (loading) => updateState('notes.isLoading', loading, 'setNotesLoading'),
    
    // Gallery tab actions
    selectFolder: (folder) => updateState('gallery.selectedFolder', folder, 'selectFolder'),
    addCustomFolder: (path) => updateState('gallery.customFolders', [...selectors.customFolders(), path], 'addCustomFolder'),
    selectImage: (imagePath) => updateState('gallery.selectedImage', imagePath, 'selectImage'),
    setImages: (images) => updateState('gallery.images', images, 'setImages'),
    setFolders: (folders) => updateState('gallery.folders', folders, 'setFolders'),
    setCurrentPath: (path) => updateState('gallery.currentPath', path, 'setCurrentPath'),
    updateSort: (sortBy) => updateState('gallery.sortBy', sortBy, 'updateSort'),
    setSearchQuery: (query) => updateState('gallery.searchQuery', query, 'setSearchQuery'),
    setViewMode: (mode) => updateState('gallery.viewMode', mode, 'setViewMode'),
    setThumbnailSize: (size) => updateState('gallery.thumbnailSize', size, 'setThumbnailSize'),
    toggleMetadata: (show) => updateState('gallery.showMetadata', show, 'toggleMetadata'),
    toggleMetadataOnly: (show) => updateState('gallery.showMetadataOnly', show, 'toggleMetadataOnly'),
    setGalleryLoading: (loading) => updateState('gallery.isLoading', loading, 'setGalleryLoading'),
    openFullImage: (image) => updateState('gallery.fullImageView', { isOpen: true, currentImage: image, showMetadata: false }, 'openFullImage'),
    closeFullImage: () => updateState('gallery.fullImageView', { isOpen: false, currentImage: null, showMetadata: false }, 'closeFullImage'),
    toggleFullImageMetadata: (show) => updateState('gallery.fullImageView.showMetadata', show, 'toggleFullImageMetadata'),
    
    // Prompt Builder tab actions
    setPositivePrompt: (text) => updateState('promptBuilder.positivePrompt', text, 'setPositivePrompt'),
    setNegativePrompt: (text) => updateState('promptBuilder.negativePrompt', text, 'setNegativePrompt'),
    setPromptSeed: (seed) => updateState('promptBuilder.seed', seed, 'setPromptSeed'),
    setPromptCount: (count) => updateState('promptBuilder.count', count, 'setPromptCount'),
    setPromptResults: (results) => updateState('promptBuilder.results', results, 'setPromptResults'),
    addPromptResults: (newResults) => updateState('promptBuilder.results', [...selectors.promptResults(), ...newResults], 'addPromptResults'),
    clearPromptResults: () => updateState('promptBuilder.results', [], 'clearPromptResults'),
    
    // General actions
    switchTab: (tab) => updateState('activeTab', tab, 'switchTab')
};

/**
 * Reset state to initial values and clear localStorage
 */
export function resetState() {
    try {
        // Clear localStorage
        localStorage.removeItem(PERSISTENCE_KEY);
        
        // Reset to initial state
        const previousState = currentState;
        currentState = JSON.parse(JSON.stringify(initialState));
        
        // Notify listeners
        notifyListeners({
            type: 'stateReset',
            previousState: JSON.parse(JSON.stringify(previousState)),
            currentState: getState()
        });
        
        // console.debug('[StateManager] State reset to initial values');
    } catch (error) {
        console.error('[StateManager] Error resetting state:', error);
    }
}

/**
 * Centralized State Management for Sidebar
 * Provides a single source of truth for sidebar state with debugging and change tracking
 */

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
 * @typedef {Object} SidebarState
 * @property {string} activeTab - Currently active tab ('models', 'notes', 'civitai', 'gallery')
 * @property {ModelsTabState} models - Models tab state
 * @property {NotesTabState} notes - Notes tab state
 * @property {GalleryTabState} gallery - Gallery tab state
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
        isLoading: false,
        fullImageView: {
            isOpen: false,
            currentImage: null,
            showMetadata: false
        }
    }
};

// Create a deep copy of initial state
let currentState = JSON.parse(JSON.stringify(initialState));

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
 * Update state immutably with change tracking and validation
 * @param {string} path - Path to the state value (e.g., 'models.selectedHash')
 * @param {any} value - New value to set
 * @param {string} [action] - Optional action description for debugging
 */
export function updateState(path, value, action = 'update') {
    const oldValue = getStateValue(path);
    
    // Don't update if value hasn't changed (shallow comparison)
    if (oldValue === value) {
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
 * Notify all listeners of state changes
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
}

/**
 * Validate state structure to prevent corruption
 * @param {Object} state - State to validate
 * @returns {boolean} Whether state is valid
 */
function validateState(state) {
    try {
        // Check required top-level keys
        const requiredKeys = ['activeTab', 'models', 'notes', 'gallery'];
        for (const key of requiredKeys) {
            if (!(key in state)) {
                console.error(`[StateManager] Missing required key: ${key}`);
                return false;
            }
        }
        
        // Validate activeTab
        if (!['models', 'notes', 'civitai', 'gallery'].includes(state.activeTab)) {
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
    isGalleryLoading: () => getStateValue('gallery.isLoading'),
    fullImageView: () => getStateValue('gallery.fullImageView'),
    
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
    setGalleryLoading: (loading) => updateState('gallery.isLoading', loading, 'setGalleryLoading'),
    openFullImage: (image) => updateState('gallery.fullImageView', { isOpen: true, currentImage: image, showMetadata: false }, 'openFullImage'),
    closeFullImage: () => updateState('gallery.fullImageView', { isOpen: false, currentImage: null, showMetadata: false }, 'closeFullImage'),
    toggleFullImageMetadata: (show) => updateState('gallery.fullImageView.showMetadata', show, 'toggleFullImageMetadata'),
    
    // General actions
    switchTab: (tab) => updateState('activeTab', tab, 'switchTab')
};

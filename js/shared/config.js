/**
 * Centralized Configuration for Sidebar Components
 * Contains all constants, file type patterns, API endpoints, and styling configuration
 */

/**
 * File type detection patterns
 */
export const FILE_TYPES = {
    image: /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i,
    video: /\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv|m4v)$/i,
    text: /\.(txt|md|markdown|json|js|ts|py|yaml|yml|csv|log)$/i,
    markdown: /\.(md|markdown)$/i
};

/**
 * API endpoints configuration
 */
export const API_ENDPOINTS = {
    // Cache management
    cacheHash: '/sage_utils/cache_hash',
    cacheInfo: '/sage_utils/cache_info',
    updateCacheInfo: '/sage_utils/update_cache_info',
    pullMetadata: '/sage_utils/pull_metadata',
    
    // Notes management
    listNotes: '/sage_utils/list_notes',
    readNote: '/sage_utils/read_note',
    saveNote: '/sage_utils/save_note',
    deleteNote: '/sage_utils/delete_note',
    
    // Utility endpoints
    getFileSize: '/sage_utils/get_file_size'
};

/**
 * Filter options for dropdowns
 */
export const FILTER_OPTIONS = {
    modelType: [
        { value: 'all', text: 'All Types' },
        { value: 'Checkpoint', text: 'Checkpoints' },
        { value: 'LORA', text: 'LoRA Models' }
    ],
    
    lastUsed: [
        { value: 'all', text: 'Any Time' },
        { value: 'today', text: 'Used Today' },
        { value: 'week', text: 'Used This Week' },
        { value: 'month', text: 'Used This Month' },
        { value: 'never', text: 'Never Used' }
    ],
    
    updates: [
        { value: 'all', text: 'All Models' },
        { value: 'available', text: 'Updates Available' },
        { value: 'none', text: 'No Updates Available' }
    ],
    
    sort: [
        { value: 'name', text: 'Name (A-Z)' },
        { value: 'name-desc', text: 'Name (Z-A)' },
        { value: 'lastused', text: 'Recently Used' },
        { value: 'lastused-desc', text: 'Oldest Used' },
        { value: 'size', text: 'File Size (Small)' },
        { value: 'size-desc', text: 'File Size (Large)' },
        { value: 'type', text: 'Model Type' }
    ]
};

/**
 * Button configurations for consistent styling and behavior
 */
export const BUTTON_CONFIGS = {
    refresh: {
        text: 'Refresh',
        color: '#4CAF50',
        icon: '🔄'
    },
    pull: {
        text: 'Pull',
        color: '#2196F3',
        icon: '⬇'
    },
    edit: {
        text: 'Edit',
        color: '#FF9800',
        icon: '✏️'
    },
    scan: {
        text: 'Scan All',
        color: '#9C27B0',
        icon: '🔍'
    },
    report: {
        text: 'Report',
        color: '#607D8B',
        icon: '📊'
    },
    save: {
        text: 'Save',
        color: '#4CAF50',
        icon: '💾'
    },
    delete: {
        text: 'Delete',
        color: '#F44336',
        icon: '🗑️'
    },
    newFile: {
        text: 'New File',
        color: '#2196F3',
        icon: '📄'
    }
};

/**
 * Common CSS styles for consistent theming
 */
export const STYLES = {
    colors: {
        primary: '#4CAF50',
        secondary: '#2196F3',
        warning: '#FF9800',
        error: '#F44336',
        info: '#9C27B0',
        muted: '#607D8B',
        
        // Background colors
        background: '#1e1e1e',
        panel: '#2a2a2a',
        card: '#333333',
        input: '#1a1a1a',
        
        // Text colors
        text: '#ffffff',
        textSecondary: '#e0e0e0',
        textMuted: '#888888',
        
        // Border colors
        border: '#444444',
        borderLight: '#555555'
    },
    
    spacing: {
        xs: '2px',
        sm: '5px',
        md: '10px',
        lg: '15px',
        xl: '20px'
    },
    
    typography: {
        fontFamily: {
            body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            mono: '"Courier New", monospace'
        },
        fontSize: {
            xs: '10px',
            sm: '11px',
            md: '12px',
            lg: '13px',
            xl: '14px'
        }
    },
    
    components: {
        button: {
            base: `
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                transition: all 0.2s ease;
                display: inline-flex;
                align-items: center;
                gap: 5px;
            `,
            small: `
                padding: 4px 8px;
                font-size: 11px;
            `,
            disabled: `
                opacity: 0.5;
                cursor: not-allowed;
            `
        },
        
        input: {
            base: `
                padding: 8px;
                background: #1a1a1a;
                color: #fff;
                border: 1px solid #555;
                border-radius: 4px;
                font-size: 12px;
                font-family: inherit;
                transition: border-color 0.2s ease;
            `,
            focus: `
                border-color: #4CAF50;
                outline: none;
            `,
            error: `
                border-color: #F44336;
            `
        },
        
        select: {
            base: `
                padding: 8px;
                background: #333;
                color: #fff;
                border: 1px solid #555;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
            `
        },
        
        panel: {
            base: `
                padding: 15px;
                background: #2a2a2a;
                border-radius: 6px;
                border: 1px solid #444;
                margin-bottom: 15px;
            `,
            header: `
                margin: 0 0 10px 0;
                font-weight: bold;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `
        },
        
        dropdown: {
            container: `
                position: relative;
                width: 100%;
            `,
            button: `
                width: 100%;
                padding: 8px 12px;
                background: #333;
                color: #fff;
                border: 1px solid #555;
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 12px;
                transition: background-color 0.2s ease;
            `,
            menu: `
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: #333;
                border: 1px solid #555;
                border-top: none;
                border-radius: 0 0 4px 4px;
                max-height: 300px;
                overflow-y: auto;
                z-index: 1000;
                display: none;
            `,
            item: `
                padding: 8px 12px;
                cursor: pointer;
                border-bottom: 1px solid #444;
                transition: background-color 0.2s ease;
                color: #fff;
                font-size: 12px;
            `
        }
    }
};

/**
 * Animation and transition configurations
 */
export const ANIMATIONS = {
    durations: {
        fast: '0.15s',
        normal: '0.2s',
        slow: '0.3s'
    },
    
    easings: {
        smooth: 'ease',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        sharp: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
};

/**
 * Performance and caching settings
 */
export const PERFORMANCE = {
    // API response caching
    cache: {
        ttl: 5 * 60 * 1000, // 5 minutes
        maxSize: 100 // Maximum number of cached responses
    },
    
    // Debounce delays for user input
    debounce: {
        search: 300,
        resize: 100,
        scroll: 50
    },
    
    // Batch processing settings
    batch: {
        maxSize: 50, // Maximum items to process in one batch
        delay: 2000 // Delay between API calls (milliseconds)
    }
};

/**
 * Error messages and user feedback
 */
export const MESSAGES = {
    errors: {
        generic: 'An unexpected error occurred',
        network: 'Network error - please check your connection',
        notFound: 'Requested resource not found',
        unauthorized: 'You are not authorized to perform this action',
        validation: 'Invalid input provided',
        fileNotFound: 'File not found',
        saveFailed: 'Failed to save file',
        loadFailed: 'Failed to load data'
    },
    
    success: {
        saved: 'File saved successfully',
        deleted: 'File deleted successfully',
        updated: 'Information updated successfully',
        loaded: 'Data loaded successfully'
    },
    
    loading: {
        default: 'Loading...',
        files: 'Loading files...',
        models: 'Loading models...',
        metadata: 'Loading metadata...',
        saving: 'Saving...',
        deleting: 'Deleting...'
    }
};

/**
 * Development and debugging settings
 */
export const DEBUG = {
    enabled: false, // Set to true for development
    logLevel: 'info', // 'error', 'warn', 'info', 'debug'
    components: {
        stateManager: false,
        apiCalls: false,
        uiUpdates: false
    }
};

/**
 * Feature flags for progressive enhancement
 */
export const FEATURES = {
    markdownPreview: true,
    imagePreview: true,
    videoPreview: true,
    advancedFiltering: true,
    batchOperations: true,
    autoSave: true,
    keyboardShortcuts: true
};

/**
 * Helper function to get file type from filename
 * @param {string} filename - The filename to check
 * @returns {string} The file type ('image', 'video', 'text', 'markdown', 'unknown')
 */
export function getFileType(filename) {
    if (!filename) return 'unknown';
    
    const lower = filename.toLowerCase();
    
    if (FILE_TYPES.image.test(lower)) return 'image';
    if (FILE_TYPES.video.test(lower)) return 'video';
    if (FILE_TYPES.markdown.test(lower)) return 'markdown';
    if (FILE_TYPES.text.test(lower)) return 'text';
    
    return 'unknown';
}

/**
 * Helper function to check if a file type is supported for preview
 * @param {string} fileType - The file type to check
 * @returns {boolean} Whether the file type supports preview
 */
export function supportsPreview(fileType) {
    return ['image', 'video', 'markdown'].includes(fileType);
}

/**
 * Helper function to get appropriate icon for file type
 * @param {string} fileType - The file type
 * @returns {string} Unicode icon for the file type
 */
export function getFileTypeIcon(fileType) {
    const icons = {
        image: '🖼️',
        video: '🎬',
        markdown: '📝',
        text: '📄',
        unknown: '📋'
    };
    
    return icons[fileType] || icons.unknown;
}

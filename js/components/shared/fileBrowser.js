/**
 * Generic File Browser Component
 * Provides configurable file browsing for different file types
 */

// Import API for ComfyUI integration
import { api } from "../../../../../scripts/api.js";

/**
 * Configuration object for file browser instances
 */
export const FILE_BROWSER_CONFIGS = {
    notes: {
        apiEndpoint: '/sage_utils/list_notes',
        supportedExtensions: ['.txt', '.md', '.markdown', '.json', '.yaml', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.m4v'],
        allowEdit: true,
        allowCreate: true,
        allowDelete: true,
        allowCreateFolder: false,
        defaultIcon: '📄',
        emptyMessage: 'No notes files found',
        showHierarchy: false,
        fileItemHeight: '44px'
    },
    wildcards: {
        apiEndpoint: '/sage_utils/wildcard_files',
        supportedExtensions: ['.txt', '.json', '.yaml'],
        allowEdit: true,
        allowCreate: true,
        allowDelete: true,
        allowCreateFolder: true,
        defaultIcon: '🎲',
        emptyMessage: 'No wildcard files found',
        showHierarchy: true,
        fileItemHeight: '44px'
    }
};

/**
 * Generic File Browser Class
 * Handles file listing, selection, and basic file operations
 */
export class GenericFileBrowser {
    constructor(configKey, callbacks = {}) {
        this.config = FILE_BROWSER_CONFIGS[configKey];
        if (!this.config) {
            throw new Error(`Unknown file browser config: ${configKey}`);
        }
        
        this.callbacks = {
            onFileSelect: callbacks.onFileSelect || (() => {}),
            onFileCreate: callbacks.onFileCreate || (() => {}),
            onFileDelete: callbacks.onFileDelete || (() => {}),
            onFolderCreate: callbacks.onFolderCreate || (() => {}),
            onError: callbacks.onError || ((error) => console.error('File browser error:', error)),
            ...callbacks
        };
        
        this.files = [];
        this.selectedFile = null;
        this.container = null;
        this.fileListContainer = null;
        this.isLoading = false;
    }

    /**
     * Creates and returns the file browser UI
     * @param {HTMLElement} parentContainer - Container to append the browser to
     * @returns {Object} - Object containing references to created elements
     */
    render(parentContainer) {
        // Create main container
        this.container = document.createElement('div');
        this.container.className = 'generic-file-browser';
        this.container.style.cssText = `
            margin-bottom: 15px;
            padding: 15px;
            background: #2a2a2a;
            border-radius: 6px;
            border: 1px solid #444;
        `;

        // Create header with actions
        const header = this.createHeader();
        this.container.appendChild(header);

        // Create file list container
        this.fileListContainer = document.createElement('div');
        this.fileListContainer.className = 'file-list-container';
        this.fileListContainer.style.cssText = `
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid #555;
            border-radius: 4px;
            background: #333;
        `;

        this.container.appendChild(this.fileListContainer);

        // Add to parent container
        if (parentContainer) {
            parentContainer.appendChild(this.container);
        }

        // Load initial files
        this.loadFiles();

        return {
            container: this.container,
            header: header,
            fileListContainer: this.fileListContainer
        };
    }

    /**
     * Creates the header section with title and action buttons
     * @returns {HTMLElement} - Header element
     */
    createHeader() {
        const header = document.createElement('div');
        header.className = 'file-browser-header';
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        `;

        // Title
        const title = document.createElement('h4');
        title.style.cssText = `
            margin: 0;
            color: #4CAF50;
            font-size: 14px;
        `;
        title.textContent = 'Files';

        // Actions container
        const actions = document.createElement('div');
        actions.style.cssText = `
            display: flex;
            gap: 8px;
        `;

        // Create action buttons based on config
        if (this.config.allowCreate) {
            const createButton = this.createActionButton('Create File', '#4CAF50', () => {
                this.callbacks.onFileCreate();
            });
            actions.appendChild(createButton);
        }

        if (this.config.allowCreateFolder) {
            const createFolderButton = this.createActionButton('Create Folder', '#2196F3', () => {
                this.callbacks.onFolderCreate();
            });
            actions.appendChild(createFolderButton);
        }

        // Refresh button
        const refreshButton = this.createActionButton('Refresh', '#FF9800', () => {
            this.loadFiles();
        });
        actions.appendChild(refreshButton);

        header.appendChild(title);
        header.appendChild(actions);

        return header;
    }

    /**
     * Creates an action button
     * @param {string} text - Button text
     * @param {string} color - Button color
     * @param {Function} onClick - Click handler
     * @returns {HTMLElement} - Button element
     */
    createActionButton(text, color, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `
            background: ${color};
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            transition: opacity 0.2s;
        `;

        button.addEventListener('click', onClick);
        button.addEventListener('mouseenter', () => {
            button.style.opacity = '0.8';
        });
        button.addEventListener('mouseleave', () => {
            button.style.opacity = '1';
        });

        return button;
    }

    /**
     * Loads files from the API endpoint
     */
    async loadFiles() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoadingState();

        try {
            const response = await api.fetchApi(this.config.apiEndpoint);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            this.files = result.files || [];
            
            this.renderFileList();
            
        } catch (error) {
            this.callbacks.onError(error);
            this.showErrorState(error.message);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Shows loading state in the file list
     */
    showLoadingState() {
        this.fileListContainer.innerHTML = `
            <div style="
                padding: 20px;
                text-align: center;
                color: #888;
                font-style: italic;
            ">
                <div style="margin-bottom: 10px;">🔄</div>
                <div>Loading files...</div>
            </div>
        `;
    }

    /**
     * Shows error state in the file list
     * @param {string} errorMessage - Error message to display
     */
    showErrorState(errorMessage) {
        this.fileListContainer.innerHTML = `
            <div style="
                padding: 20px;
                text-align: center;
                color: #f44336;
                font-style: italic;
            ">
                <div style="margin-bottom: 10px;">❌</div>
                <div>Error loading files</div>
                <div style="font-size: 11px; margin-top: 5px; color: #888;">
                    ${this.escapeHtml(errorMessage)}
                </div>
            </div>
        `;
    }

    /**
     * Renders the file list
     */
    renderFileList() {
        this.fileListContainer.innerHTML = '';

        if (this.files.length === 0) {
            this.showEmptyState();
            return;
        }

        if (this.config.showHierarchy) {
            this.renderHierarchicalList();
        } else {
            this.renderFlatList();
        }
    }

    /**
     * Shows empty state in the file list
     */
    showEmptyState() {
        this.fileListContainer.innerHTML = `
            <div style="
                padding: 20px;
                text-align: center;
                color: #888;
                font-style: italic;
            ">
                <div style="margin-bottom: 10px;">${this.config.defaultIcon}</div>
                <div>${this.config.emptyMessage}</div>
            </div>
        `;
    }

    /**
     * Renders files in a flat list (used by notes)
     */
    renderFlatList() {
        this.files.forEach(filename => {
            const fileItem = this.createFileItem(filename);
            this.fileListContainer.appendChild(fileItem);
        });
    }

    /**
     * Renders files in a hierarchical tree structure (used by wildcards)
     */
    renderHierarchicalList() {
        // For now, implement as flat list
        // TODO: Implement proper tree structure for wildcards
        this.renderFlatList();
    }

    /**
     * Creates a file item element
     * @param {string} filename - Name of the file
     * @param {Object} metadata - Additional file metadata (optional)
     * @returns {HTMLElement} - File item element
     */
    createFileItem(filename, metadata = {}) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.filename = filename;
        fileItem.style.cssText = `
            padding: 8px 12px;
            cursor: pointer;
            border-bottom: 1px solid #333;
            transition: background-color 0.2s;
            display: flex;
            align-items: center;
            gap: 8px;
            min-height: ${this.config.fileItemHeight};
        `;

        // File icon
        const icon = document.createElement('span');
        icon.style.cssText = `
            color: #4CAF50;
            font-size: 14px;
        `;
        icon.textContent = this.getFileIcon(filename);

        // File name
        const nameSpan = document.createElement('span');
        nameSpan.style.cssText = `
            flex: 1;
            color: #fff;
            font-size: 13px;
        `;
        nameSpan.textContent = filename;

        // File info (size, etc.)
        if (metadata.size) {
            const sizeSpan = document.createElement('span');
            sizeSpan.style.cssText = `
                color: #888;
                font-size: 11px;
            `;
            sizeSpan.textContent = this.formatFileSize(metadata.size);
            fileItem.appendChild(sizeSpan);
        }

        fileItem.appendChild(icon);
        fileItem.appendChild(nameSpan);

        // Event handlers
        fileItem.addEventListener('mouseenter', () => {
            fileItem.style.backgroundColor = '#333';
        });

        fileItem.addEventListener('mouseleave', () => {
            fileItem.style.backgroundColor = this.selectedFile === filename ? '#444' : 'transparent';
        });

        fileItem.addEventListener('click', () => {
            this.selectFile(filename);
        });

        return fileItem;
    }

    /**
     * Gets appropriate icon for file type
     * @param {string} filename - Name of the file
     * @returns {string} - Icon character
     */
    getFileIcon(filename) {
        const ext = filename.toLowerCase().split('.').pop();
        
        const iconMap = {
            'txt': '📄',
            'md': '📝',
            'markdown': '📝',
            'json': '⚙️',
            'yaml': '⚙️',
            'yml': '⚙️',
            'jpg': '🖼️',
            'jpeg': '🖼️',
            'png': '🖼️',
            'gif': '🖼️',
            'svg': '🖼️',
            'mp4': '🎬',
            'webm': '🎬',
            'mov': '🎬'
        };

        return iconMap[ext] || this.config.defaultIcon;
    }

    /**
     * Formats file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} - Formatted size string
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Selects a file and triggers the callback
     * @param {string} filename - Name of the file to select
     */
    selectFile(filename) {
        // Update visual selection
        this.fileListContainer.querySelectorAll('.file-item').forEach(item => {
            item.style.backgroundColor = 'transparent';
        });

        const selectedItem = this.fileListContainer.querySelector(`[data-filename="${filename}"]`);
        if (selectedItem) {
            selectedItem.style.backgroundColor = '#444';
        }

        this.selectedFile = filename;
        this.callbacks.onFileSelect(filename);
    }

    /**
     * Gets the currently selected file
     * @returns {string|null} - Selected filename or null
     */
    getSelectedFile() {
        return this.selectedFile;
    }

    /**
     * Refreshes the file list
     */
    refresh() {
        this.loadFiles();
    }

    /**
     * Escapes HTML in text
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Destroys the file browser and cleans up
     */
    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.files = [];
        this.selectedFile = null;
        this.container = null;
        this.fileListContainer = null;
    }
}

export default GenericFileBrowser;

/**
 * Generic File Browser Component
 * Provides configurable file browsing for different file types
 */

// Import API for ComfyUI integration
import { api } from "../../../../scripts/api.js";

// Import button components
import { loadComponentStyles } from '../components/styleLoader.js';
import { createButton, BUTTON_VARIANTS } from "../components/buttons.js";

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
        fileItemHeight: '32px'
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
        fileItemHeight: '32px'
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
        this.isDestroyed = false;
        this.currentPath = ''; // Current folder path for navigation
        this.pathHistory = []; // Navigation history
    }

    /**
     * Creates and returns the file browser UI
     * @param {HTMLElement} parentContainer - Container to append the browser to
     * @returns {Object} - Object containing references to created elements
     */
    render(parentContainer) {
        loadComponentStyles('fileBrowser');

        // Create main container
        this.container = document.createElement('div');
        this.container.className = 'generic-file-browser';

        // Create header with actions
        const header = this.createHeader();
        this.container.appendChild(header);

        // Create file list container
        this.fileListContainer = document.createElement('div');
        this.fileListContainer.className = 'file-list-container';
        this.fileListContainer.setAttribute('role', 'listbox');
        this.fileListContainer.setAttribute('aria-label', `${this.config.title || 'Files'} list`);

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
        header.className = 'file-browser-header file-preview-toolbar';

        // Title
        const title = document.createElement('h4');
        title.className = 'file-preview-title';
        title.textContent = 'Files';

        // Actions container
        const actions = document.createElement('div');
        actions.className = 'file-preview-actions';

        // Create action buttons based on config
        if (this.config.allowCreate) {
            const createFileButton = createButton('Create File', {
                variant: BUTTON_VARIANTS.SUCCESS,
                size: 'small',
                marginTop: '0',
                onClick: () => this.callbacks.onFileCreate()
            });
            actions.appendChild(createFileButton);
        }

        if (this.config.allowCreateFolder) {
            const createFolderButton = createButton('Create Folder', {
                variant: BUTTON_VARIANTS.INFO,
                size: 'small',
                marginTop: '0',
                onClick: () => this.callbacks.onFolderCreate()
            });
            actions.appendChild(createFolderButton);
        }

        // Refresh button
        const refreshButton = createButton('Refresh', {
            variant: BUTTON_VARIANTS.WARNING,
            size: 'small',
            marginTop: '0',
            onClick: () => this.loadFiles()
        });
        actions.appendChild(refreshButton);

        header.appendChild(title);
        header.appendChild(actions);

        return header;
    }

    /**
     * Creates an action button
     * @deprecated Use createButton() from buttons.js instead
     * @param {string} text - Button text
     * @param {string} color - Button color
     * @param {Function} onClick - Click handler
     * @returns {HTMLElement} - Button element
     */
    createActionButton(text, color, onClick) {
        console.warn('createActionButton is deprecated. Use createButton() from buttons.js instead.');
        return createButton(text, {
            color,
            size: 'small',
            marginTop: '0',
            onClick,
            hoverEffect: true
        });
    }

    /**
     * Loads files from the API endpoint
     * @param {string} path - Optional path to load (defaults to current path)
     */
    async loadFiles(path = null) {
        if (this.isDestroyed || this.isLoading) return;
        
        if (path !== null) {
            this.currentPath = path;
        }
        
        this.isLoading = true;
        this.showLoadingState();

        try {
            // Construct API URL with path parameter if needed
            let apiUrl = this.config.apiEndpoint;
            if (this.currentPath) {
                const separator = apiUrl.includes('?') ? '&' : '?';
                apiUrl += `${separator}path=${encodeURIComponent(this.currentPath)}`;
            }
            
            const response = await api.fetchApi(apiUrl);
            if (this.isDestroyed) {
                return;
            }
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (this.isDestroyed) {
                return;
            }
            this.files = result.files || [];
            
            this.renderFileList();
            
        } catch (error) {
            if (this.isDestroyed) {
                return;
            }
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
            <div class="file-list-status" role="status">
                <div class="file-preview-status-icon">🔄</div>
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
            <div class="file-list-status file-list-status--error" role="alert">
                <div class="file-preview-status-icon">❌</div>
                <div>Error loading files</div>
                <div class="file-list-status-detail">${this.escapeHtml(errorMessage)}</div>
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
            <div class="file-list-status" role="status">
                <div class="file-preview-status-icon">${this.config.defaultIcon}</div>
                <div>${this.config.emptyMessage}</div>
            </div>
        `;
    }

    /**
     * Renders files in a flat list (used by notes)
     */
    renderFlatList() {
        this.files.forEach(file => {
            // Handle both string filenames and file objects
            const filename = typeof file === 'string' ? file : (file.name || file.filename || 'Unknown');
            const metadata = typeof file === 'object' ? file : {};
            // For flat lists, use the full path if available (for notes with subfolders)
            const fullPath = typeof file === 'object' ? (file.path || filename) : filename;
            
            const fileItem = this.createFileItem(filename, metadata, fullPath);
            this.fileListContainer.appendChild(fileItem);
        });
    }

    /**
     * Renders files in a hierarchical tree structure (used by wildcards)
     */
    renderHierarchicalList() {
        // Add back navigation if not at root
        if (this.currentPath) {
            const backItem = this.createBackNavigationItem();
            this.fileListContainer.appendChild(backItem);
        }

        // Separate files and folders
        const folders = [];
        const files = [];

        this.files.forEach(item => {
            // Handle both string and object formats
            let itemData;
            if (typeof item === 'string') {
                itemData = { name: item, type: 'file' };
            } else {
                itemData = {
                    name: item.name || item.filename || 'Unknown',
                    type: item.type || (item.is_directory ? 'directory' : 'file'),
                    ...item
                };
            }

            if (itemData.type === 'directory' || itemData.is_directory) {
                folders.push(itemData);
            } else {
                files.push(itemData);
            }
        });

        // Render folders first
        folders.forEach(folder => {
            const folderItem = this.createFolderItem(folder.name, folder);
            this.fileListContainer.appendChild(folderItem);
        });

        // Then render files
        files.forEach(file => {
            // Use file.path for file selection (includes folder path), but file.name for display
            const filePath = file.path || file.name;  // fallback to name if path not available
            const fileItem = this.createFileItem(file.name, file, filePath);
            this.fileListContainer.appendChild(fileItem);
        });
    }

    /**
     * Creates a file item element
     * @param {string} filename - Name of the file
     * @param {Object} metadata - Additional file metadata (optional)
     * @returns {HTMLElement} - File item element
     */
    createFileItem(filename, metadata = {}, fullPath = null) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        // Use full path for data attribute if available, fallback to filename
        const pathForSelection = fullPath || filename;
        fileItem.dataset.filename = pathForSelection;
        fileItem.style.minHeight = this.config.fileItemHeight;
        fileItem.setAttribute('role', 'option');
        const isSelected = this.selectedFile === pathForSelection;
        fileItem.classList.toggle('selected', isSelected);
        fileItem.setAttribute('aria-selected', String(isSelected));

        const icon = document.createElement('span');
        icon.className = 'file-item-icon';
        icon.textContent = this.getFileIcon(filename);

        const nameSpan = document.createElement('span');
        nameSpan.className = 'file-item-name';
        nameSpan.textContent = filename;

        fileItem.appendChild(icon);
        fileItem.appendChild(nameSpan);

        if (metadata.size) {
            const sizeSpan = document.createElement('span');
            sizeSpan.className = 'file-item-size';
            sizeSpan.textContent = this.formatFileSize(metadata.size);
            fileItem.appendChild(sizeSpan);
        }

        this.makeActivatable(fileItem, () => this.selectFile(pathForSelection));

        return fileItem;
    }

    /**
     * Make a list row operable by click, Enter, and Space, and reachable by Tab
     * @param {HTMLElement} element
     * @param {Function} handler
     */
    makeActivatable(element, handler) {
        element.tabIndex = 0;
        element.addEventListener('click', handler);
        element.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handler();
            }
        });
    }

    /**
     * Creates a folder item element
     * @param {string} folderName - Name of the folder
     * @param {Object} metadata - Additional folder metadata (optional)
     * @returns {HTMLElement} - Folder item element
     */
    createFolderItem(folderName, metadata = {}) {
        const folderItem = document.createElement('div');
        folderItem.className = 'folder-item';
        folderItem.dataset.foldername = folderName;
        folderItem.style.minHeight = this.config.fileItemHeight;
        folderItem.setAttribute('role', 'button');
        folderItem.setAttribute('aria-label', `Open folder ${folderName}`);

        const icon = document.createElement('span');
        icon.className = 'file-item-icon';
        icon.textContent = '📁';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'file-item-name';
        nameSpan.textContent = folderName;

        folderItem.appendChild(icon);
        folderItem.appendChild(nameSpan);

        this.makeActivatable(folderItem, () => this.navigateToFolder(folderName));

        return folderItem;
    }

    /**
     * Creates a back navigation item
     * @returns {HTMLElement} - Back navigation element
     */
    createBackNavigationItem() {
        const backItem = document.createElement('div');
        backItem.className = 'back-item';
        backItem.style.minHeight = this.config.fileItemHeight;
        backItem.setAttribute('role', 'button');
        backItem.setAttribute('aria-label', 'Back to parent folder');

        const icon = document.createElement('span');
        icon.className = 'file-item-icon';
        icon.textContent = '⬅️';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'file-item-name';
        nameSpan.textContent = '.. (Back)';

        backItem.appendChild(icon);
        backItem.appendChild(nameSpan);

        this.makeActivatable(backItem, () => this.navigateBack());

        return backItem;
    }

    /**
     * Navigates to a folder
     * @param {string} folderName - Name of the folder to navigate to
     */
    navigateToFolder(folderName) {
        // Add current path to history
        this.pathHistory.push(this.currentPath);
        
        // Update current path
        this.currentPath = this.currentPath ? 
            `${this.currentPath}/${folderName}` : 
            folderName;
        
        // Load files in the new folder
        this.loadFiles();
    }

    /**
     * Navigates back to the previous folder
     */
    navigateBack() {
        if (this.pathHistory.length > 0) {
            this.currentPath = this.pathHistory.pop();
            this.loadFiles();
        }
    }

    /**
     * Gets the current folder path
     * @returns {string} - Current folder path
     */
    getCurrentPath() {
        return this.currentPath;
    }

    /**
     * Navigates to a specific path
     * @param {string} path - Path to navigate to
     */
    navigateToPath(path) {
        this.currentPath = path || '';
        this.pathHistory = [];
        this.loadFiles();
    }

    /**
     * Gets the appropriate icon for a file based on its extension
     * @param {string|Object} file - Filename string or file object
     * @returns {string} - Icon character
     */
    getFileIcon(file) {
        // Handle both string filenames and file objects
        const filename = typeof file === 'string' ? file : (file.name || file.filename || '');
        
        if (!filename || typeof filename !== 'string') {
            return this.config.defaultIcon;
        }
        
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
            const isSelected = item.dataset.filename === filename;
            item.classList.toggle('selected', isSelected);
            item.setAttribute('aria-selected', String(isSelected));
        });

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
     * Changes the configuration and reloads files
     * @param {string} newConfigKey - New configuration key
     */
    changeConfiguration(newConfigKey) {
        this.config = FILE_BROWSER_CONFIGS[newConfigKey];
        if (!this.config) {
            throw new Error(`Unknown file browser config: ${newConfigKey}`);
        }
        
        // Clear current selection and files
        this.selectedFile = null;
        this.files = [];
        
        // Reset navigation state
        this.currentPath = '';
        this.pathHistory = [];
        
        // Reload files with new configuration
        this.loadFiles();
    }

    /**
     * Destroys the file browser and cleans up
     */
    destroy() {
        if (this.isDestroyed) {
            return;
        }
        this.isDestroyed = true;
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

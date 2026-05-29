/**
 * Files Tab - File management components for notes and wildcards directories
 * Handles file editing, viewing, and management using generic components with folder navigation
 */

import { GenericFileManager } from "../file/fileManager.js";
import { createSelect } from "../components/formElements.js";
import { loadSidebarStyle } from './sidebarStyles.js';

/**
 * Creates a folder selector for the Files tab
 * @param {Function} onFolderChange - Callback when folder selection changes
 * @returns {Object} Folder selector components
 */
function createFolderSelector(onFolderChange) {
    const selectorContainer = document.createElement('div');
    selectorContainer.className = 'folder-selector';

    const label = document.createElement('label');
    label.className = 'folder-selector-label';
    label.textContent = 'Folder:';

    // Add folder options
    const folders = [
        { value: 'notes', text: '📝 Notes' },
        { value: 'wildcards', text: '🎲 Wildcards' }
    ];

    const folderDropdown = createSelect({
        items: folders,
        value: 'notes',
        className: 'folder-selector-dropdown',
        onChange: (e) => {
            if (onFolderChange) {
                onFolderChange(e.target.value);
            }
        }
    });

    selectorContainer.appendChild(label);
    selectorContainer.appendChild(folderDropdown);

    return {
        container: selectorContainer,
        dropdown: folderDropdown,
        setFolder: (folderKey) => {
            folderDropdown.value = folderKey;
        }
    };
}

/**
 * Creates the Notes tab header section
 * @returns {HTMLElement} Header element
 */
function createNotesHeader() {
    const header = document.createElement('div');
    header.className = 'notes-header';

    const title = document.createElement('h3');
    title.className = 'notes-title';
    title.textContent = 'File Manager';

    const description = document.createElement('p');
    description.className = 'notes-description';
    description.textContent = 'View, edit, and create files across different folders';

    header.appendChild(title);
    header.appendChild(description);

    return header;
}

/**
 * Sets up status display for the notes tab
 * @returns {Object} Status management functions
 */
function createStatusDisplay() {
    const statusContainer = document.createElement('div');
    statusContainer.className = 'notes-status';

    let statusTimeout;

    function setStatus(message, isError = false) {
        statusContainer.textContent = message;
        statusContainer.classList.toggle('notes-status--error', isError);
        statusContainer.classList.remove('notes-status--faded');
        
        // Clear previous timeout
        if (statusTimeout) {
            clearTimeout(statusTimeout);
        }
        
        // Auto-clear status after 3 seconds unless it's an error
        if (!isError && message) {
            statusTimeout = setTimeout(() => {
                statusContainer.classList.add('notes-status--faded');
                setTimeout(() => {
                    if (statusContainer.textContent === message) {
                        statusContainer.textContent = 'Ready';
                        statusContainer.classList.remove('notes-status--faded');
                    }
                }, 300);
            }, 3000);
        }
    }

    // Initialize with ready state
    setStatus('Ready');

    return {
        container: statusContainer,
        setStatus
    };
}

/**
 * Main function to create the Files tab using shared components
 * @param {HTMLElement} container - Container element to populate
 */
export function createFilesTab(container) {
    // Clear container
    container.innerHTML = '';
    loadSidebarStyle('files-tab-styles', 'extensions/comfyui_sageutils/sidebar/filesTab.css');

    // Create header
    const header = createNotesHeader();
    container.appendChild(header);

    // Create status display (but don't append yet)
    const status = createStatusDisplay();

    // Create file manager with notes configuration
    const fileManager = new GenericFileManager('notes', {
        showPreview: true,
        showEditor: true,
        layout: 'vertical',
        tabbedView: true,
        defaultTab: 'preview',
        callbacks: {
            onFileSelect: (filename) => {
                status.setStatus(`Loaded: ${filename}`);
            },
            onFileCreate: (filename) => {
                status.setStatus(`Creating new file: ${filename}`);
            },
            onFileSave: (filename, content) => {
                if (content !== null) {
                    status.setStatus(`Saved: ${filename}`);
                } else {
                    status.setStatus(`Deleted: ${filename}`);
                }
            },
            onFileCancel: () => {
                status.setStatus('Edit cancelled');
            },
            onContentChange: (content) => {
                // Optional: Could show character count or other stats
            },
            onFileLoad: (filename, content) => {
                if (content === '') {
                    status.setStatus(`New file: ${filename}`);
                } else {
                    status.setStatus(`Loaded: ${filename} (${content.length} characters)`);
                }
            },
            onError: (error, source) => {
                status.setStatus(`Error in ${source}: ${error.message}`, true);
                console.error(`Notes Tab ${source} Error:`, error);
            },
            onConfigChange: (newConfigKey) => {
                status.setStatus(`Switched to ${newConfigKey} folder`);
            },
            browser: {
                // Browser-specific callbacks can go here
            },
            editor: {
                // Editor-specific callbacks can go here
            },
            preview: {
                // Preview-specific callbacks can go here
            }
        }
    });

    // Create folder selector
    const folderSelector = createFolderSelector((folderKey) => {
        // Handle folder change
        fileManager.changeConfiguration(folderKey);
        status.setStatus(`Switched to ${folderKey} folder`);
    });
    
    // Add folder selector to container
    container.appendChild(folderSelector.container);

    // Render the file manager
    const fileManagerComponents = fileManager.render(container);

    // Add status bar at the end
    container.appendChild(status.container);

    // Store reference for cleanup (if needed)
    container._notesFileManager = fileManager;

    // Optional: Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+S to save (when notes tab is active)
        if (e.ctrlKey && e.key === 's' && container.offsetParent !== null) {
            e.preventDefault();
            if (fileManager.fileEditor && fileManager.fileEditor.getCurrentFile()) {
                fileManager.fileEditor.saveFile();
            }
        }
    });

    return {
        fileManager,
        folderSelector,
        header,
        status,
        destroy: () => {
            if (container._notesFileManager) {
                container._notesFileManager.destroy();
                delete container._notesFileManager;
            }
        }
    };
}

/**
 * Cleanup function for the notes tab
 * @param {HTMLElement} container - Container element
 */
export function destroyNotesTab(container) {
    if (container._notesFileManager) {
        container._notesFileManager.destroy();
        delete container._notesFileManager;
    }
}

// Default export for module compatibility
export default createFilesTab;

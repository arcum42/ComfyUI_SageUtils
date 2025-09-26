/**
 * Files Tab - File management components for notes and wildcards directories
 * Handles file editing, viewing, and management using generic components with folder navigation
 */

import { GenericFileManager } from "../components/file/fileManager.js";

/**
 * Creates a folder selector for the Files tab
 * @param {Function} onFolderChange - Callback when folder selection changes
 * @returns {Object} Folder selector components
 */
function createFolderSelector(onFolderChange) {
    const selectorContainer = document.createElement('div');
    selectorContainer.className = 'folder-selector';
    selectorContainer.style.cssText = `
        padding: 15px;
        background: #2d2d2d;
        border: 1px solid #3e3e42;
        border-radius: 8px;
        margin-bottom: 15px;
    `;

    const label = document.createElement('label');
    label.style.cssText = `
        display: block;
        color: #4CAF50;
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 8px;
    `;
    label.textContent = 'Folder:';

    const folderDropdown = document.createElement('select');
    folderDropdown.style.cssText = `
        width: 100%;
        padding: 8px 12px;
        background: #333;
        color: #fff;
        border: 1px solid #555;
        border-radius: 4px;
        font-size: 13px;
        cursor: pointer;
    `;

    // Add folder options
    const folders = [
        { value: 'notes', text: '📝 Notes', icon: '📝' },
        { value: 'wildcards', text: '🎲 Wildcards', icon: '🎲' }
    ];

    folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.value;
        option.textContent = folder.text;
        folderDropdown.appendChild(option);
    });

    // Set default to notes
    folderDropdown.value = 'notes';

    // Add event listener
    folderDropdown.addEventListener('change', (e) => {
        if (onFolderChange) {
            onFolderChange(e.target.value);
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
    header.style.cssText = `
        padding: 15px;
        background: #2d2d2d;
        border: 1px solid #3e3e42;
        border-radius: 8px;
        margin-bottom: 15px;
    `;

    const title = document.createElement('h3');
    title.style.cssText = `
        margin: 0 0 5px 0;
        color: #569cd6;
        font-size: 16px;
    `;
    title.textContent = 'File Manager';

    const description = document.createElement('p');
    description.style.cssText = `
        margin: 0;
        color: #888;
        font-size: 13px;
    `;
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
    statusContainer.style.cssText = `
        margin-bottom: 15px;
        padding: 8px 12px;
        background: #2a2a2a;
        border: 1px solid #444;
        border-radius: 4px;
        color: #4CAF50;
        font-size: 12px;
        min-height: 20px;
        transition: all 0.3s ease;
    `;

    let statusTimeout;

    function setStatus(message, isError = false) {
        statusContainer.textContent = message;
        statusContainer.style.color = isError ? '#f44336' : '#4CAF50';
        statusContainer.style.opacity = '1';
        
        // Clear previous timeout
        if (statusTimeout) {
            clearTimeout(statusTimeout);
        }
        
        // Auto-clear status after 3 seconds unless it's an error
        if (!isError && message) {
            statusTimeout = setTimeout(() => {
                statusContainer.style.opacity = '0.5';
                setTimeout(() => {
                    if (statusContainer.textContent === message) {
                        statusContainer.textContent = 'Ready';
                        statusContainer.style.opacity = '1';
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

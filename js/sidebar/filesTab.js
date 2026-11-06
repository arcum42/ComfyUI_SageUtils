/**
 * Files Tab - File management components for notes and wildcards directories
 * Handles file editing, viewing, and management using generic components with folder navigation
 */

import { registerCommandProvider } from '../shared/commandRegistry.js';
import { GenericFileManager } from "../file/fileManager.js";
import { createSelect } from "../components/formElements.js";
import { loadSidebarStyle } from './sidebarStyles.js';
import { createMarkdownToolbar } from './markdownToolbar.js';

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
    statusContainer.setAttribute('role', 'status');
    statusContainer.setAttribute('aria-live', 'polite');

    let statusTimeout;
    let fadeTimeout;

    function setStatus(message, isError = false) {
        statusContainer.textContent = message;
        statusContainer.classList.toggle('notes-status--error', isError);
        statusContainer.setAttribute('role', isError ? 'alert' : 'status');
        statusContainer.classList.remove('notes-status--faded');
        
        // Clear previous timeout
        if (statusTimeout) {
            clearTimeout(statusTimeout);
        }
        if (fadeTimeout) {
            clearTimeout(fadeTimeout);
        }
        
        // Auto-clear status after 3 seconds unless it's an error
        if (!isError && message) {
            statusTimeout = setTimeout(() => {
                statusContainer.classList.add('notes-status--faded');
                fadeTimeout = setTimeout(() => {
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
        setStatus,
        destroy: () => {
            clearTimeout(statusTimeout);
            clearTimeout(fadeTimeout);
        }
    };
}

/**
 * Main function to create the Files tab using shared components
 * @param {HTMLElement} container - Container element to populate
 */
export function createFilesTab(container) {
    // Clear container
    container.innerHTML = '';
    loadSidebarStyle('files-tab-styles', 'sidebar/filesTab.css');

    // Create header
    const header = createNotesHeader();
    container.appendChild(header);

    // Create status display (but don't append yet)
    const status = createStatusDisplay();

    // Create file manager with notes configuration
    let markdownToolbar;
    const fileManager = new GenericFileManager('notes', {
        showPreview: true,
        showEditor: true,
        layout: 'vertical',
        tabbedView: true,
        defaultTab: 'preview',
        callbacks: {
            onFileSelect: (filename) => {
                markdownToolbar.update(fileManager.fileEditor.getCurrentFile() === filename ? filename : null);
                status.setStatus(`Loaded: ${filename}`);
            },
            onFileCreate: (filename) => {
                markdownToolbar.update(filename);
                status.setStatus(`Creating new file: ${filename}`);
            },
            onFileSave: (filename, content) => {
                if (content !== null) {
                    status.setStatus(`Saved: ${filename}`);
                } else {
                    markdownToolbar.update(null);
                    status.setStatus(`Deleted: ${filename}`);
                }
            },
            onFileCancel: () => {
                markdownToolbar.update(null);
                status.setStatus('Edit cancelled');
            },
            onContentChange: (content) => {
                // Optional: Could show character count or other stats
            },
            onFileLoad: (filename, content) => {
                markdownToolbar.update(filename);
                if (content === '') {
                    status.setStatus(`New file: ${filename}`);
                } else {
                    status.setStatus(`Loaded: ${filename} (${content.length} characters)`);
                }
            },
            onError: (error, source) => {
                const editor = fileManager.fileEditor;
                markdownToolbar.update(editor.textEditor.disabled ? null : editor.getCurrentFile());
                status.setStatus(`Error in ${source}: ${error.message}`, true);
                console.error(`Notes Tab ${source} Error:`, error);
            },
            onConfigChange: (newConfigKey) => {
                markdownToolbar.update(null);
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
    
    // Render the file manager
    const fileManagerComponents = fileManager.render(container);
    const chooser = document.createElement('details');
    chooser.className = 'files-chooser';
    chooser.open = true;
    const chooserSummary = document.createElement('summary');
    chooserSummary.textContent = 'Choose a file';
    chooser.appendChild(chooserSummary);
    chooser.appendChild(folderSelector.container);
    chooser.appendChild(fileManager.fileBrowser.container.parentElement);
    fileManagerComponents.container.prepend(chooser);
    markdownToolbar = createMarkdownToolbar(fileManager.fileEditor);

    // Add status bar at the end
    container.appendChild(status.container);

    // Store reference for cleanup (if needed)
    container._notesFileManager = fileManager;

    // Optional: Add keyboard shortcuts
    const handleKeydown = (e) => {
        // Ctrl+S to save (when notes tab is active)
        if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 's' || container.offsetParent === null) {
            return;
        }

        const target = e.target;
        const isEditable = target instanceof HTMLElement && (
            target.isContentEditable
            || target.matches('input, textarea, select')
        );
        const editor = fileManager.fileEditor;
        if (isEditable && target !== editor?.textEditor) {
            return;
        }
        if (!editor?.getCurrentFile()) {
            return;
        }

        e.preventDefault();
        editor.saveFile();
    };
    document.addEventListener('keydown', handleKeydown);

    const openFolder = (folderKey) => {
        folderSelector.setFolder(folderKey);
        folderSelector.dropdown.dispatchEvent(new Event('change'));
    };
    const unregisterCommands = registerCommandProvider(() => [
        { id: 'files-notes', tab: 'notes', label: 'Files: Open Notes folder', run: () => openFolder('notes') },
        { id: 'files-wildcards', tab: 'notes', label: 'Files: Open Wildcards folder', run: () => openFolder('wildcards') }
    ]);

    let isDestroyed = false;
    const destroy = () => {
        if (isDestroyed) {
            return;
        }
        isDestroyed = true;
        unregisterCommands();
        document.removeEventListener('keydown', handleKeydown);
        status.destroy();
        fileManager.destroy();
        if (container._notesTabCleanup === destroy) {
            delete container._notesTabCleanup;
        }
        if (container._notesFileManager === fileManager) {
            delete container._notesFileManager;
        }
    };

    container._notesTabCleanup = destroy;

    return {
        fileManager,
        folderSelector,
        header,
        status,
        destroy
    };
}

/**
 * Cleanup function for the notes tab
 * @param {HTMLElement} container - Container element
 */
export function destroyNotesTab(container) {
    if (container._notesTabCleanup) {
        container._notesTabCleanup();
    } else if (container._notesFileManager) {
        container._notesFileManager.destroy();
        delete container._notesFileManager;
    }
}

// Default export for module compatibility
export default createFilesTab;

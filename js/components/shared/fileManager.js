/**
 * Generic File Manager Component
 * Combines file browser, editor, and preview into a cohesive file management interface
 */

import { GenericFileBrowser } from './fileBrowser.js';
import { GenericFileEditor } from './fileEditor.js';
import { GenericFilePreview } from './filePreview.js';

/**
 * Generic File Manager Class
 * Orchestrates file browser, editor, and preview components
 */
export class GenericFileManager {
    constructor(configKey, options = {}) {
        this.configKey = configKey;
        this.options = {
            showPreview: true,
            showEditor: true,
            layout: 'vertical', // 'vertical' or 'horizontal'
            previewFirst: false, // whether to show preview above editor
            tabbedView: false, // whether to show preview and editor in tabs
            defaultTab: 'preview', // 'preview' or 'editor' - which tab to show by default
            ...options
        };
        
        this.fileBrowser = null;
        this.fileEditor = null;
        this.filePreview = null;
        this.container = null;
        
        this.callbacks = options.callbacks || {};
    }

    /**
     * Creates and returns the complete file manager UI
     * @param {HTMLElement} parentContainer - Container to append the manager to
     * @returns {Object} - Object containing references to all components
     */
    render(parentContainer) {
        // Create main container
        this.container = document.createElement('div');
        this.container.className = 'generic-file-manager';
        this.container.style.cssText = `
            display: flex;
            flex-direction: ${this.options.layout === 'horizontal' ? 'row' : 'column'};
            gap: 15px;
        `;

        // Create file browser
        this.fileBrowser = new GenericFileBrowser(this.configKey, {
            onFileSelect: (filename) => this.handleFileSelection(filename),
            onFileCreate: () => this.handleFileCreate(),
            onFolderCreate: () => this.handleFolderCreate(),
            onError: (error) => this.handleError(error, 'Browser'),
            ...this.callbacks.browser
        });

        const browserContainer = document.createElement('div');
        browserContainer.className = 'file-manager-browser';
        if (this.options.layout === 'horizontal') {
            browserContainer.style.cssText = `
                flex: 0 0 300px;
                min-width: 300px;
            `;
        }
        
        this.fileBrowser.render(browserContainer);
        this.container.appendChild(browserContainer);

        // Create content container for editor and preview
        const contentContainer = document.createElement('div');
        contentContainer.className = 'file-manager-content';
        contentContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 15px;
            flex: 1;
        `;

        // Create file editor if enabled
        if (this.options.showEditor) {
            this.fileEditor = new GenericFileEditor(this.configKey, {
                onSave: (filename, content) => this.handleFileSave(filename, content),
                onCancel: () => this.handleFileCancel(),
                onChange: (content) => this.handleContentChange(content),
                onLoad: (filename, content) => this.handleFileLoad(filename, content),
                onError: (error) => this.handleError(error, 'Editor'),
                ...this.callbacks.editor
            });
        }

        // Create file preview if enabled
        if (this.options.showPreview) {
            this.filePreview = new GenericFilePreview(this.configKey, {
                onError: (error) => this.handleError(error, 'Preview'),
                ...this.callbacks.preview
            });
        }

        // Add components to content container
        if (this.options.tabbedView && this.options.showEditor && this.options.showPreview) {
            // Create tabbed view for editor and preview
            this.createTabbedView(contentContainer);
        } else {
            // Original behavior - separate components
            if (this.options.previewFirst) {
                // Preview first, then editor
                if (this.filePreview) {
                    const previewContainer = document.createElement('div');
                    previewContainer.className = 'file-manager-preview';
                    this.filePreview.render(previewContainer);
                    contentContainer.appendChild(previewContainer);
                }
                
                if (this.fileEditor) {
                    const editorContainer = document.createElement('div');
                    editorContainer.className = 'file-manager-editor';
                    this.fileEditor.render(editorContainer);
                    contentContainer.appendChild(editorContainer);
                }
            } else {
                // Editor first, then preview (default behavior)
                if (this.fileEditor) {
                    const editorContainer = document.createElement('div');
                    editorContainer.className = 'file-manager-editor';
                    this.fileEditor.render(editorContainer);
                    contentContainer.appendChild(editorContainer);
                }
                
                if (this.filePreview) {
                    const previewContainer = document.createElement('div');
                    previewContainer.className = 'file-manager-preview';
                    this.filePreview.render(previewContainer);
                    contentContainer.appendChild(previewContainer);
                }
            }
        }

        this.container.appendChild(contentContainer);

        // Add to parent container
        if (parentContainer) {
            parentContainer.appendChild(this.container);
        }

        return {
            container: this.container,
            fileBrowser: this.fileBrowser,
            fileEditor: this.fileEditor,
            filePreview: this.filePreview
        };
    }

    /**
     * Creates a tabbed view containing both editor and preview
     * @param {HTMLElement} contentContainer - Container to add the tabbed view to
     */
    createTabbedView(contentContainer) {
        // Create tab container
        const tabbedContainer = document.createElement('div');
        tabbedContainer.className = 'file-manager-tabbed';
        tabbedContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            flex: 1;
        `;

        // Create tab header
        const tabHeader = document.createElement('div');
        tabHeader.className = 'tab-header';
        tabHeader.style.cssText = `
            display: flex;
            border-bottom: 2px solid #4CAF50;
            margin-bottom: 10px;
            background: #1a1a1a;
        `;

        // Create tab buttons
        const previewTab = document.createElement('button');
        previewTab.textContent = 'Preview';
        previewTab.className = 'tab-button preview-tab';
        previewTab.style.cssText = `
            padding: 10px 20px;
            border: none;
            background: #2a2a2a;
            color: #ccc;
            cursor: pointer;
            border-top-left-radius: 4px;
            border-top-right-radius: 4px;
            margin-right: 2px;
            transition: all 0.2s ease;
        `;

        const editorTab = document.createElement('button');
        editorTab.textContent = 'Editor';
        editorTab.className = 'tab-button editor-tab';
        editorTab.style.cssText = `
            padding: 10px 20px;
            border: none;
            background: #2a2a2a;
            color: #ccc;
            cursor: pointer;
            border-top-left-radius: 4px;
            border-top-right-radius: 4px;
            transition: all 0.2s ease;
        `;

        // Add tabs to header
        tabHeader.appendChild(previewTab);
        tabHeader.appendChild(editorTab);

        // Create content area
        const tabContent = document.createElement('div');
        tabContent.className = 'tab-content';
        tabContent.style.cssText = `
            flex: 1;
            position: relative;
        `;

        // Create containers for each tab
        const previewContainer = document.createElement('div');
        previewContainer.className = 'file-manager-preview tab-panel';
        previewContainer.style.cssText = `
            display: ${this.options.defaultTab === 'preview' ? 'block' : 'none'};
        `;

        const editorContainer = document.createElement('div');
        editorContainer.className = 'file-manager-editor tab-panel';
        editorContainer.style.cssText = `
            display: ${this.options.defaultTab === 'editor' ? 'block' : 'none'};
        `;

        // Render components into their containers
        if (this.filePreview) {
            this.filePreview.render(previewContainer);
        }
        
        if (this.fileEditor) {
            this.fileEditor.render(editorContainer);
        }

        // Add containers to tab content
        tabContent.appendChild(previewContainer);
        tabContent.appendChild(editorContainer);

        // Set up tab switching
        const switchToPreview = () => {
            previewTab.style.background = '#4CAF50';
            previewTab.style.color = 'white';
            previewTab.style.fontWeight = 'bold';
            
            editorTab.style.background = '#2a2a2a';
            editorTab.style.color = '#ccc';
            editorTab.style.fontWeight = 'normal';
            
            previewContainer.style.display = 'block';
            editorContainer.style.display = 'none';
        };

        const switchToEditor = () => {
            editorTab.style.background = '#4CAF50';
            editorTab.style.color = 'white';
            editorTab.style.fontWeight = 'bold';
            
            previewTab.style.background = '#2a2a2a';
            previewTab.style.color = '#ccc';
            previewTab.style.fontWeight = 'normal';
            
            editorContainer.style.display = 'block';
            previewContainer.style.display = 'none';
        };

        // Add event listeners
        previewTab.addEventListener('click', switchToPreview);
        editorTab.addEventListener('click', switchToEditor);

        // Set initial active tab
        if (this.options.defaultTab === 'preview') {
            switchToPreview();
        } else {
            switchToEditor();
        }

        // Assemble tabbed container
        tabbedContainer.appendChild(tabHeader);
        tabbedContainer.appendChild(tabContent);

        // Add to content container
        contentContainer.appendChild(tabbedContainer);

        // Store references for external access
        this.tabElements = {
            tabbedContainer,
            tabHeader,
            tabContent,
            previewTab,
            editorTab,
            previewContainer,
            editorContainer,
            switchToPreview,
            switchToEditor
        };
    }

    /**
     * Handles file selection from the browser
     * @param {string} filename - Selected filename
     */
    async handleFileSelection(filename) {
        try {
            // Load file in editor if available
            if (this.fileEditor) {
                await this.fileEditor.loadFile(filename);
            }

            // Update preview if available
            if (this.filePreview) {
                const content = this.fileEditor ? this.fileEditor.getContent() : null;
                this.filePreview.updatePreview(filename, content);
            }

            // Trigger callback
            if (this.callbacks.onFileSelect) {
                this.callbacks.onFileSelect(filename);
            }

        } catch (error) {
            this.handleError(error, 'File Selection');
        }
    }

    /**
     * Handles file creation
     */
    handleFileCreate() {
        const filename = prompt('Enter filename:');
        if (filename) {
            // Create new file in editor
            if (this.fileEditor) {
                this.fileEditor.createNewFile(filename);
            }

            // Clear preview
            if (this.filePreview) {
                this.filePreview.clear();
            }

            // Trigger callback
            if (this.callbacks.onFileCreate) {
                this.callbacks.onFileCreate(filename);
            }
        }
    }

    /**
     * Handles folder creation
     */
    handleFolderCreate() {
        const folderName = prompt('Enter folder name:');
        if (folderName) {
            // Trigger callback
            if (this.callbacks.onFolderCreate) {
                this.callbacks.onFolderCreate(folderName);
            }
        }
    }

    /**
     * Handles file save
     * @param {string} filename - Saved filename
     * @param {string|null} content - File content (null for deletion)
     */
    handleFileSave(filename, content) {
        // Refresh browser to show changes
        if (this.fileBrowser) {
            this.fileBrowser.refresh();
        }

        // Update preview if content exists
        if (this.filePreview && content !== null) {
            this.filePreview.updatePreview(filename, content);
        } else if (this.filePreview && content === null) {
            // File was deleted, clear preview
            this.filePreview.clear();
        }

        // Trigger callback
        if (this.callbacks.onFileSave) {
            this.callbacks.onFileSave(filename, content);
        }
    }

    /**
     * Handles file cancel/close
     */
    handleFileCancel() {
        // Clear editor if available
        if (this.fileEditor) {
            this.fileEditor.clearEditor();
        }

        // Clear preview if available
        if (this.filePreview) {
            this.filePreview.clear();
        }

        // Trigger callback
        if (this.callbacks.onFileCancel) {
            this.callbacks.onFileCancel();
        }
    }

    /**
     * Handles content change in editor
     * @param {string} content - New content
     */
    handleContentChange(content) {
        // Update preview with new content
        if (this.filePreview && this.fileEditor) {
            const filename = this.fileEditor.getCurrentFile();
            if (filename) {
                this.filePreview.updatePreview(filename, content);
            }
        }

        // Trigger callback
        if (this.callbacks.onContentChange) {
            this.callbacks.onContentChange(content);
        }
    }

    /**
     * Handles file load
     * @param {string} filename - Loaded filename
     * @param {string} content - File content
     */
    handleFileLoad(filename, content) {
        // Update preview
        if (this.filePreview) {
            this.filePreview.updatePreview(filename, content);
        }

        // Trigger callback
        if (this.callbacks.onFileLoad) {
            this.callbacks.onFileLoad(filename, content);
        }
    }

    /**
     * Handles errors from any component
     * @param {Error} error - Error object
     * @param {string} source - Source component that generated the error
     */
    handleError(error, source) {
        console.error(`File Manager ${source} Error:`, error);
        
        // Trigger error callback
        if (this.callbacks.onError) {
            this.callbacks.onError(error, source);
        }
    }

    /**
     * Refreshes all components
     */
    refresh() {
        if (this.fileBrowser) {
            this.fileBrowser.refresh();
        }
    }

    /**
     * Gets the currently selected file
     * @returns {string|null} - Selected filename or null
     */
    getSelectedFile() {
        if (this.fileBrowser) {
            return this.fileBrowser.getSelectedFile();
        }
        return null;
    }

    /**
     * Gets the current editor content
     * @returns {string} - Current content
     */
    getContent() {
        if (this.fileEditor) {
            return this.fileEditor.getContent();
        }
        return '';
    }

    /**
     * Sets the editor content
     * @param {string} content - Content to set
     */
    setContent(content) {
        if (this.fileEditor) {
            this.fileEditor.setContent(content);
        }
    }

    /**
     * Checks if current file is modified
     * @returns {boolean} - True if modified
     */
    isModified() {
        if (this.fileEditor) {
            return this.fileEditor.getIsModified();
        }
        return false;
    }

    /**
     * Shows or hides the preview section
     * @param {boolean} show - Whether to show the preview
     */
    togglePreview(show) {
        if (this.filePreview && this.filePreview.container) {
            this.filePreview.container.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Shows or hides the editor section
     * @param {boolean} show - Whether to show the editor
     */
    toggleEditor(show) {
        if (this.fileEditor && this.fileEditor.container) {
            this.fileEditor.container.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Changes the configuration key and updates all components
     * @param {string} newConfigKey - New configuration key (e.g., 'notes', 'wildcards')
     */
    changeConfiguration(newConfigKey) {
        this.configKey = newConfigKey;
        
        // Update file browser configuration
        if (this.fileBrowser) {
            this.fileBrowser.changeConfiguration(newConfigKey);
        }
        
        // Update file editor configuration
        if (this.fileEditor) {
            this.fileEditor.changeConfiguration(newConfigKey);
        }
        
        // Update file preview configuration
        if (this.filePreview) {
            this.filePreview.changeConfiguration(newConfigKey);
        }
        
        // Trigger callbacks if available
        if (this.callbacks.onConfigChange) {
            this.callbacks.onConfigChange(newConfigKey);
        }
    }

    /**
     * Destroys the file manager and all components
     */
    destroy() {
        if (this.fileBrowser) {
            this.fileBrowser.destroy();
        }
        if (this.fileEditor) {
            this.fileEditor.destroy();
        }
        if (this.filePreview) {
            this.filePreview.destroy();
        }

        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        this.fileBrowser = null;
        this.fileEditor = null;
        this.filePreview = null;
        this.container = null;
    }
}

export default GenericFileManager;

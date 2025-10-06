/**
 * Generic File Editor Component
 * Provides reusable file editing functionality with syntax highlighting support
 */

import { api } from "../../../../scripts/api.js";
import { FILE_BROWSER_CONFIGS } from './fileBrowser.js';

/**
 * Generic File Editor component
 * Provides a versatile text editor with auto-save, cancel, and delete functionality
 */

import { copyTextFromSelectedNode } from '../utils/textCopyFromNode.js';
import { app } from '../../../scripts/app.js';
export class GenericFileEditor {
    constructor(configKey, callbacks = {}) {
        this.config = FILE_BROWSER_CONFIGS[configKey];
        if (!this.config) {
            throw new Error(`Unknown file editor config: ${configKey}`);
        }
        
        this.callbacks = {
            onSave: callbacks.onSave || (() => {}),
            onCancel: callbacks.onCancel || (() => {}),
            onChange: callbacks.onChange || (() => {}),
            onLoad: callbacks.onLoad || (() => {}),
            onError: callbacks.onError || ((error) => console.error('File editor error:', error)),
            ...callbacks
        };
        
        this.currentFile = null;
        this.isModified = false;
        this.container = null;
        this.textEditor = null;
        this.saveButton = null;
        this.deleteButton = null;
        this.currentFileNameSpan = null;
    }

    /**
     * Creates and returns the file editor UI
     * @param {HTMLElement} parentContainer - Container to append the editor to
     * @returns {Object} - Object containing references to created elements
     */
    render(parentContainer) {
        // Create main container
        this.container = document.createElement('div');
        this.container.className = 'generic-file-editor';
        this.container.style.cssText = `
            margin-bottom: 15px;
            padding: 15px;
            background: #2a2a2a;
            border-radius: 6px;
            border: 1px solid #444;
        `;

        // Create header
        const header = this.createHeader();
        this.container.appendChild(header);

        // Create text editor
        this.textEditor = this.createTextEditor();
        this.container.appendChild(this.textEditor);

        // Add to parent container
        if (parentContainer) {
            parentContainer.appendChild(this.container);
        }

        return {
            container: this.container,
            header: header,
            textEditor: this.textEditor,
            saveButton: this.saveButton,
            deleteButton: this.deleteButton,
            currentFileNameSpan: this.currentFileNameSpan
        };
    }

    /**
     * Creates the header section with title and action buttons
     * @returns {HTMLElement} - Header element
     */
    createHeader() {
        const header = document.createElement('div');
        header.className = 'file-editor-header';
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        `;

        // Title with current file name
        const titleContainer = document.createElement('div');
        titleContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
        `;

        const title = document.createElement('h4');
        title.style.cssText = `
            margin: 0;
            color: #4CAF50;
            font-size: 14px;
        `;
        title.textContent = 'Editor';

        this.currentFileNameSpan = document.createElement('span');
        this.currentFileNameSpan.style.cssText = `
            color: #999;
            font-weight: normal;
            font-size: 12px;
        `;

        titleContainer.appendChild(title);
        titleContainer.appendChild(this.currentFileNameSpan);

        // Actions container
        const actions = document.createElement('div');
        actions.style.cssText = `
            display: flex;
            gap: 8px;
        `;

        // Copy from node button
        this.copyFromNodeButton = this.createActionButton('📥 From Node', '#9c27b0', () => {
            this.copyFromNode();
        });
        actions.appendChild(this.copyFromNodeButton);
        
        // Save button
        this.saveButton = this.createActionButton('Save', '#4CAF50', () => {
            this.saveFile();
        });
        this.saveButton.disabled = true;
        this.saveButton.style.opacity = '0.5';
        actions.appendChild(this.saveButton);

        // Delete button (if allowed)
        if (this.config.allowDelete) {
            this.deleteButton = this.createActionButton('Delete', '#f44336', () => {
                this.deleteFile();
            });
            this.deleteButton.disabled = true;
            this.deleteButton.style.opacity = '0.5';
            actions.appendChild(this.deleteButton);
        }

        header.appendChild(titleContainer);
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
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: opacity 0.2s;
        `;

        button.addEventListener('click', onClick);
        
        return button;
    }

    /**
     * Creates the text editor textarea
     * @returns {HTMLElement} - Text editor element
     */
    createTextEditor() {
        const textEditor = document.createElement('textarea');
        textEditor.className = 'file-editor-textarea';
        textEditor.style.cssText = `
            width: 100%;
            height: 300px;
            background: #333;
            color: #fff;
            border: 1px solid #555;
            border-radius: 4px;
            padding: 10px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.4;
            resize: vertical;
            box-sizing: border-box;
        `;
        textEditor.placeholder = 'Select a file to edit or create a new one...';

        // Track modifications
        textEditor.addEventListener('input', () => {
            this.setModified(true);
            this.callbacks.onChange(textEditor.value);
        });

        // Auto-resize on content change
        textEditor.addEventListener('input', () => {
            this.autoResize(textEditor);
        });

        return textEditor;
    }

    /**
     * Auto-resizes the textarea based on content
     * @param {HTMLElement} textarea - Textarea element to resize
     */
    autoResize(textarea) {
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        
        // Set height based on scroll height, with min/max constraints
        const minHeight = 300;
        const maxHeight = 600;
        const scrollHeight = textarea.scrollHeight;
        
        textarea.style.height = Math.min(Math.max(scrollHeight, minHeight), maxHeight) + 'px';
    }

    /**
     * Copies text from selected node to editor
     */
    copyFromNode() {
        const result = copyTextFromSelectedNode(app);
        
        if (result.success) {
            this.textEditor.value = result.text;
            this.setModified(true);
            
            // Visual feedback
            const originalBg = this.textEditor.style.backgroundColor;
            this.textEditor.style.backgroundColor = '#9c27b033';
            setTimeout(() => {
                this.textEditor.style.backgroundColor = originalBg;
            }, 300);
            
            console.log(`[GenericFileEditor] Copied text from ${result.nodeType} node to editor`);
        } else {
            // Visual error feedback
            const originalBg = this.textEditor.style.backgroundColor;
            this.textEditor.style.backgroundColor = '#f4433633';
            setTimeout(() => {
                this.textEditor.style.backgroundColor = originalBg;
            }, 300);
            
            console.error(`[GenericFileEditor] Copy from node failed: ${result.error}`);
            alert(`Failed to copy from node: ${result.error}`);
        }
    }

    /**
     * Loads a file for editing
     * @param {string} filename - Name of the file to load
     * @param {string} apiEndpoint - API endpoint to load the file from
     */
    async loadFile(filename, apiEndpoint = null) {
        if (!filename) {
            this.clearEditor();
            return;
        }

        try {
            // Determine API endpoint based on config
            const endpoint = apiEndpoint || this.getLoadEndpoint(filename);
            
            // Check if file is editable
            if (!this.isEditableFile(filename)) {
                this.textEditor.value = '';
                this.textEditor.placeholder = `${this.getFileType(filename)} files cannot be edited as text`;
                this.textEditor.disabled = true;
                this.updateFileDisplay(filename);
                this.setModified(false);
                this.callbacks.onLoad(filename, '');
                return;
            }

            // Load file content
            let response;
            if (this.config.apiEndpoint.includes('wildcard')) {
                // Wildcard files use GET with path parameter
                response = await api.fetchApi(endpoint);
            } else {
                // Notes files use POST with JSON body
                response = await api.fetchApi(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename })
                });
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            // Update editor
            this.currentFile = filename;
            this.textEditor.value = result.content || '';
            this.textEditor.placeholder = 'Select a file to edit or create a new one...';
            this.textEditor.disabled = false;
            this.updateFileDisplay(filename);
            this.setModified(false);
            
            // Auto-resize based on content
            this.autoResize(this.textEditor);
            
            this.callbacks.onLoad(filename, result.content || '');
            
        } catch (error) {
            this.callbacks.onError(error);
            this.clearEditor();
        }
    }

    /**
     * Gets the appropriate load endpoint for a file
     * @param {string} filename - Name of the file
     * @returns {string} - API endpoint
     */
    getLoadEndpoint(filename) {
        // For notes, use the read_note endpoint
        if (this.config.apiEndpoint.includes('notes')) {
            return '/sage_utils/read_note';
        }
        
        // For wildcards, use the wildcard file endpoint
        if (this.config.apiEndpoint.includes('wildcard')) {
            return `/sage_utils/wildcard_file/${encodeURIComponent(filename)}`;
        }
        
        // Default fallback
        return '/sage_utils/read_file';
    }

    /**
     * Checks if a file can be edited as text
     * @param {string} filename - Name of the file
     * @returns {boolean} - True if file can be edited as text
     */
    isEditableFile(filename) {
        const textExtensions = ['.txt', '.md', '.markdown', '.json', '.yaml', '.yml', '.py'];
        const fileExt = '.' + filename.toLowerCase().split('.').pop();
        return textExtensions.includes(fileExt);
    }

    /**
     * Gets the file type description
     * @param {string} filename - Name of the file
     * @returns {string} - File type description
     */
    getFileType(filename) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.m4v'];
        
        const fileExt = '.' + filename.toLowerCase().split('.').pop();
        
        if (imageExtensions.includes(fileExt)) {
            return 'Image';
        } else if (videoExtensions.includes(fileExt)) {
            return 'Video';
        } else {
            return 'Binary';
        }
    }

    /**
     * Updates the file display in the header
     * @param {string} filename - Name of the current file
     */
    updateFileDisplay(filename) {
        if (this.currentFileNameSpan) {
            const displayText = filename ? 
                ` - ${filename}${this.isModified ? ' *' : ''}` : '';
            this.currentFileNameSpan.textContent = displayText;
        }

        // Enable/disable buttons based on file selection
        if (this.saveButton) {
            this.saveButton.disabled = !filename;
            this.saveButton.style.opacity = filename ? '1' : '0.5';
        }

        if (this.deleteButton) {
            this.deleteButton.disabled = !filename;
            this.deleteButton.style.opacity = filename ? '1' : '0.5';
        }
    }

    /**
     * Sets the modified state
     * @param {boolean} modified - Whether the file is modified
     */
    setModified(modified) {
        this.isModified = modified;
        this.updateFileDisplay(this.currentFile);
    }

    /**
     * Saves the current file
     */
    async saveFile() {
        if (!this.currentFile) {
            console.error('FileEditor: No file selected to save');
            this.callbacks.onError(new Error('No file selected to save'));
            return;
        }

        console.log('FileEditor: Saving file:', this.currentFile);
        console.log('FileEditor: File content length:', this.textEditor.value.length);

        try {
            const endpoint = this.getSaveEndpoint();
            console.log('FileEditor: Using save endpoint:', endpoint);
            
            const payload = {
                filename: this.currentFile,
                content: this.textEditor.value
            };
            console.log('FileEditor: Save payload:', payload);
            
            const response = await api.fetchApi(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            console.log('FileEditor: Save response status:', response.status);

            if (!response.ok) {
                // Try to get more details about the error from the response
                let errorDetails = `HTTP error! status: ${response.status}`;
                try {
                    const errorText = await response.text();
                    console.log('FileEditor: Server error response:', errorText);
                    if (errorText) {
                        errorDetails += ` - ${errorText}`;
                    }
                } catch (parseError) {
                    console.log('FileEditor: Could not parse error response');
                }
                throw new Error(errorDetails);
            }

            const result = await response.json();
            console.log('FileEditor: Save result:', result);
            
            if (result.success) {
                console.log('FileEditor: File saved successfully');
                this.setModified(false);
                this.callbacks.onSave(this.currentFile, this.textEditor.value);
            } else {
                throw new Error(result.error || 'Unknown error occurred');
            }

        } catch (error) {
            console.error('FileEditor: Save error:', error);
            this.callbacks.onError(error);
        }
    }

    /**
     * Gets the appropriate save endpoint
     * @returns {string} - API endpoint
     */
    getSaveEndpoint() {
        console.log('FileEditor: Getting save endpoint, config.apiEndpoint:', this.config.apiEndpoint);
        
        // For notes, use the save_note endpoint
        if (this.config.apiEndpoint.includes('notes')) {
            console.log('FileEditor: Using notes save endpoint');
            return '/sage_utils/save_note';
        }
        
        // For wildcards, use the wildcard save endpoint
        if (this.config.apiEndpoint.includes('wildcard')) {
            console.log('FileEditor: Using wildcards save endpoint');
            return '/sage_utils/wildcard/file/save';
        }
        
        // Default fallback
        console.log('FileEditor: Using default save endpoint');
        return '/sage_utils/save_file';
    }

    /**
     * Deletes the current file
     */
    async deleteFile() {
        if (!this.currentFile) {
            this.callbacks.onError(new Error('No file selected to delete'));
            return;
        }

        if (!confirm(`Are you sure you want to delete "${this.currentFile}"?`)) {
            return;
        }

        try {
            const endpoint = this.getDeleteEndpoint();
            
            const response = await api.fetchApi(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: this.currentFile })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                const deletedFile = this.currentFile;
                this.clearEditor();
                this.callbacks.onSave(deletedFile, null); // null content indicates deletion
            } else {
                throw new Error(result.error || 'Unknown error occurred');
            }

        } catch (error) {
            this.callbacks.onError(error);
        }
    }

    /**
     * Gets the appropriate delete endpoint
     * @returns {string} - API endpoint
     */
    getDeleteEndpoint() {
        // For notes, use the delete_note endpoint
        if (this.config.apiEndpoint.includes('notes')) {
            return '/sage_utils/delete_note';
        }
        
        // For wildcards, use the wildcard delete endpoint
        if (this.config.apiEndpoint.includes('wildcard')) {
            return '/sage_utils/wildcard/file/delete';
        }
        
        // Default fallback
        return '/sage_utils/delete_file';
    }

    /**
     * Clears the editor and resets state
     */
    clearEditor() {
        this.currentFile = null;
        this.textEditor.value = '';
        this.textEditor.placeholder = 'Select a file to edit or create a new one...';
        this.textEditor.disabled = false;
        this.setModified(false);
        this.updateFileDisplay(null);
    }

    /**
     * Creates a new file
     * @param {string} filename - Name of the new file
     */
    createNewFile(filename) {
        console.log('FileEditor: Creating new file:', filename);
        this.currentFile = filename;
        
        // Set a minimal default content to avoid empty string validation issues
        const defaultContent = `# ${filename}\n\nCreated: ${new Date().toISOString()}\n\n`;
        this.textEditor.value = defaultContent;
        
        this.textEditor.disabled = false;
        this.textEditor.focus();
        this.setModified(true);
        this.updateFileDisplay(filename);
        console.log('FileEditor: New file setup complete, currentFile:', this.currentFile, 'isModified:', this.isModified);
    }

    /**
     * Gets the current file content
     * @returns {string} - Current content of the editor
     */
    getContent() {
        return this.textEditor.value;
    }

    /**
     * Sets the editor content
     * @param {string} content - Content to set
     */
    setContent(content) {
        this.textEditor.value = content;
        this.autoResize(this.textEditor);
        this.setModified(true);
    }

    /**
     * Gets the current file name
     * @returns {string|null} - Current file name or null
     */
    getCurrentFile() {
        return this.currentFile;
    }

    /**
     * Checks if the file has been modified
     * @returns {boolean} - True if modified
     */
    getIsModified() {
        return this.isModified;
    }

    /**
     * Changes the configuration
     * @param {string} newConfigKey - New configuration key
     */
    changeConfiguration(newConfigKey) {
        this.configKey = newConfigKey;
        this.config = FILE_BROWSER_CONFIGS[newConfigKey];
        if (!this.config) {
            throw new Error(`Unknown file editor config: ${newConfigKey}`);
        }
        
        // Clear current file and reset state
        this.currentFile = null;
        this.isModified = false;
        
        if (this.textEditor) {
            this.textEditor.value = '';
            this.textEditor.disabled = true;
        }
        
        if (this.currentFileNameSpan) {
            this.currentFileNameSpan.textContent = '';
        }
        
        this.updateFileDisplay(null);
    }

    /**
     * Destroys the editor and cleans up
     */
    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.currentFile = null;
        this.isModified = false;
        this.container = null;
        this.textEditor = null;
        this.saveButton = null;
        this.deleteButton = null;
        this.currentFileNameSpan = null;
    }
}

export default GenericFileEditor;

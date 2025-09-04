/**
 * Notes Tab - Handles file editing, viewing, and management for notes directory
 */

import { api } from "../../../scripts/api.js";

import { 
    API_ENDPOINTS,
    FILE_TYPES,
    getFileType,
    supportsPreview,
    getFileTypeIcon
} from "../shared/config.js";

import { 
    handleError
} from "../shared/errorHandler.js";

import { 
    actions, 
    selectors 
} from "../shared/stateManager.js";

import { 
    renderMarkdown, 
    ensureMarkdownStyles 
} from "../shared/markdown.js";

// Import shared UI components
import {
    createHeader,
    createStyledButton,
    createInfoDisplay
} from "../components/cacheUIComponents.js";

/**
 * Creates the Notes tab header section
 * @returns {HTMLElement} Header element
 */
function createNotesHeader() {
    return createHeader('Notes Manager', 'View, edit, and create notes files');
}

/**
 * Creates the file list section for the Notes tab
 * @returns {Object} File list components
 */
function createNotesFileList() {
    const fileListSection = document.createElement('div');
    fileListSection.style.cssText = `
        margin-bottom: 15px;
        padding: 15px;
        background: #2a2a2a;
        border-radius: 6px;
        border: 1px solid #444;
    `;
    
    const fileListHeader = document.createElement('h4');
    fileListHeader.style.cssText = `
        margin: 0 0 10px 0;
        color: #4CAF50;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    fileListHeader.textContent = 'Files';
    
    const createFileButton = document.createElement('button');
    createFileButton.textContent = 'Create New File';
    createFileButton.style.cssText = `
        background: #4CAF50;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    `;
    
    fileListHeader.appendChild(createFileButton);
    
    const fileListContainer = document.createElement('div');
    fileListContainer.id = 'notes-file-list';
    fileListContainer.style.cssText = `
        max-height: 200px;
        overflow-y: auto;
        border: 1px solid #555;
        border-radius: 4px;
        background: #333;
    `;

    fileListSection.appendChild(fileListHeader);
    fileListSection.appendChild(fileListContainer);

    return {
        fileListSection,
        fileListHeader,
        createFileButton,
        fileListContainer
    };
}

/**
 * Creates the file editor section for the Notes tab
 * @returns {Object} File editor components
 */
function createNotesEditor() {
    const editorSection = document.createElement('div');
    editorSection.style.cssText = `
        margin-bottom: 15px;
        padding: 15px;
        background: #2a2a2a;
        border-radius: 6px;
        border: 1px solid #444;
    `;
    
    const editorHeader = document.createElement('h4');
    editorHeader.style.cssText = `
        margin: 0 0 10px 0;
        color: #4CAF50;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    editorHeader.innerHTML = `
        <span>Editor <span id="current-file-name" style="color: #999; font-weight: normal;"></span></span>
        <div>
            <button id="save-file" style="background: #4CAF50; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 5px;">Save</button>
            <button id="delete-file" style="background: #f44336; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">Delete</button>
        </div>
    `;
    
    const textEditor = document.createElement('textarea');
    textEditor.id = 'text-editor';
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

    editorSection.appendChild(editorHeader);
    editorSection.appendChild(textEditor);

    return {
        editorSection,
        editorHeader,
        textEditor,
        saveButton: editorHeader.querySelector('#save-file'),
        deleteButton: editorHeader.querySelector('#delete-file'),
        currentFileNameSpan: editorHeader.querySelector('#current-file-name')
    };
}

/**
 * Creates the preview section for the Notes tab
 * @returns {Object} Preview components
 */
function createNotesPreview() {
    const previewSection = document.createElement('div');
    previewSection.style.cssText = `
        padding: 15px;
        background: #2a2a2a;
        border-radius: 6px;
        border: 1px solid #444;
    `;
    
    const previewHeader = document.createElement('h4');
    previewHeader.style.cssText = `
        margin: 0 0 10px 0;
        color: #4CAF50;
    `;
    previewHeader.textContent = 'Preview';
    
    const previewContainer = document.createElement('div');
    previewContainer.id = 'preview-container';
    previewContainer.style.cssText = `
        min-height: 200px;
        background: #333;
        border: 1px solid #555;
        border-radius: 4px;
        padding: 15px;
        color: #e0e0e0;
        font-family: 'Segoe UI', sans-serif;
        line-height: 1.6;
    `;
    previewContainer.innerHTML = '<em style="color: #999;">Select a file to preview...</em>';

    previewSection.appendChild(previewHeader);
    previewSection.appendChild(previewContainer);

    return {
        previewSection,
        previewHeader,
        previewContainer
    };
}

/**
 * Sets up event handlers for Notes tab interactions
 * @param {Object} fileList - File list components
 * @param {Object} editor - Editor components  
 * @param {Object} preview - Preview components
 */
function setupNotesEventHandlers(fileList, editor, preview) {
    // Helper function to update status (simplified version)
    function setStatus(message, isError = false) {
        console.log(isError ? `Error: ${message}` : message);
    }

    // Helper function to set modified state
    function setModified(modified) {
        actions.setModified(modified);
        if (modified) {
            editor.currentFileNameSpan.textContent = selectors.currentFile() ? ` - ${selectors.currentFile()} *` : '';
        } else {
            editor.currentFileNameSpan.textContent = selectors.currentFile() ? ` - ${selectors.currentFile()}` : '';
        }
    }

    // Helper function to escape HTML
    function escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Load a specific file
    async function loadFile(filename) {
        try {
            setStatus(`Loading ${filename}...`);
            
            const isImage = /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(filename.toLowerCase());
            const isVideo = /\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv|m4v)$/i.test(filename.toLowerCase());
            
            if (isImage || isVideo) {
                // For images and videos, just update UI without loading content into text editor
                actions.selectFile(filename);
                editor.textEditor.value = '';
                editor.textEditor.placeholder = `${isImage ? 'Image' : 'Video'} files cannot be edited as text`;
                editor.textEditor.disabled = true;
                setModified(false);
                setStatus(`Loaded ${isImage ? 'image' : 'video'}: ${filename}`);
            } else {
                // For text files, load content normally
                const response = await api.fetchApi('/sage_utils/read_note', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const result = await response.json();
                
                // Update UI
                actions.selectFile(filename);
                editor.textEditor.value = result.content || '';
                editor.textEditor.placeholder = 'Select a file to edit or create a new one...';
                editor.textEditor.disabled = false;
                setModified(false);
                setStatus(`Loaded: ${filename}`);
            }
            
            // Update file list selection
            fileList.fileListContainer.querySelectorAll('div').forEach(item => {
                item.style.backgroundColor = 'transparent';
            });
            const selectedItem = Array.from(fileList.fileListContainer.children).find(item => 
                item.textContent.trim().includes(filename)
            );
            if (selectedItem) {
                selectedItem.style.backgroundColor = '#444';
            }
            
            // Update preview
            toggleSectionVisibility();
            updatePreview();
            
        } catch (error) {
            console.error('Error loading file:', error);
            setStatus(`Error loading file: ${error.message}`, true);
        }
    }

    // Save file
    async function saveFile() {
        try {
            const filename = selectors.currentFile() || 'new_note.txt';
            if (!filename) {
                setStatus('Please select a file to save', true);
                return;
            }

            const response = await api.fetchApi('/sage_utils/save_note', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: filename,
                    content: editor.textEditor.value
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                setModified(false);
                setStatus(`Saved: ${filename}`);
                // Reload file list to show new file
                await loadNotesFilesList(fileList.fileListContainer);
            } else {
                throw new Error(result.error || 'Unknown error occurred');
            }

        } catch (error) {
            console.error('Error saving file:', error);
            setStatus(`Error saving file: ${error.message}`, true);
        }
    }

    // Delete file
    async function deleteFile() {
        const filename = selectors.currentFile();
        if (!filename) {
            setStatus('No file selected to delete', true);
            return;
        }

        if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
            return;
        }

        try {
            const response = await api.fetchApi('/sage_utils/delete_note', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                // Clear editor
                actions.selectFile(null);
                editor.textEditor.value = '';
                editor.textEditor.placeholder = 'Select a file to edit or create a new one...';
                setModified(false);
                setStatus(`Deleted: ${filename}`);
                // Reload file list
                await loadNotesFilesList(fileList.fileListContainer);
            } else {
                throw new Error(result.error || 'Unknown error occurred');
            }

        } catch (error) {
            console.error('Error deleting file:', error);
            setStatus(`Error deleting file: ${error.message}`, true);
        }
    }

    // Create new file
    function createNewFile() {
        actions.selectFile('new_note.txt');
        editor.textEditor.value = '';
        editor.textEditor.disabled = false;
        editor.textEditor.focus();
        setModified(true);
        setStatus('Creating new file');
        
        // Clear file list selection
        fileList.fileListContainer.querySelectorAll('div').forEach(item => {
            item.style.backgroundColor = 'transparent';
        });
    }

    // Update preview based on file type
    function updatePreview() {
        const filename = selectors.currentFile();
        if (!filename) {
            preview.previewContainer.innerHTML = '<em style="color: #999;">Select a file to preview...</em>';
            return;
        }

        const isMarkdown = filename.toLowerCase().endsWith('.md') || filename.toLowerCase().endsWith('.markdown');
        const isImage = /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(filename.toLowerCase());
        const isVideo = /\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv|m4v)$/i.test(filename.toLowerCase());
        
        if (isMarkdown) {
            ensureMarkdownStyles();
            preview.previewContainer.innerHTML = renderMarkdown(editor.textEditor.value || '');
            preview.previewContainer.className = 'markdown-overlay';
        } else if (isImage) {
            showImagePreview(filename);
        } else if (isVideo) {
            showVideoPreview(filename);
        } else {
            // For other text files, show formatted content
            preview.previewContainer.className = ''; // Remove markdown class
            const content = editor.textEditor.value || '';
            preview.previewContainer.innerHTML = `
                <pre style="white-space: pre-wrap; word-wrap: break-word; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4;">${escapeHtml(content)}</pre>
            `;
        }
    }

    // Function to show image preview
    function showImagePreview(filename) {
        preview.previewContainer.className = ''; // Remove markdown class
        
        // Create image element
        const img = document.createElement('img');
        img.style.cssText = `
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            display: block;
            margin: 0 auto;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;
        
        // Set image source to the notes API endpoint
        img.src = `/sage_utils/read_note?filename=${encodeURIComponent(filename)}`;
        
        // Handle loading states
        img.onload = () => {
            preview.previewContainer.innerHTML = '';
            preview.previewContainer.appendChild(img);
        };
        
        img.onerror = () => {
            preview.previewContainer.innerHTML = `
                <div style="text-align: center; color: #f44336; padding: 20px;">
                    <p>❌ Failed to load image</p>
                    <p style="font-size: 11px; color: #888;">${filename}</p>
                </div>
            `;
        };
        
        // Show loading state
        preview.previewContainer.innerHTML = `
            <div style="text-align: center; color: #888; padding: 20px;">
                <p>🖼️ Loading image...</p>
            </div>
        `;
    }

    // Function to show video preview
    function showVideoPreview(filename) {
        preview.previewContainer.className = ''; // Remove markdown class
        
        // Create video element
        const video = document.createElement('video');
        video.style.cssText = `
            max-width: 100%;
            max-height: 400px;
            width: auto;
            height: auto;
            display: block;
            margin: 0 auto;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;
        video.controls = true;
        video.preload = 'metadata';
        
        // Set video source to the notes API endpoint
        video.src = `/sage_utils/read_note?filename=${encodeURIComponent(filename)}`;
        
        // Handle loading states
        video.addEventListener('loadedmetadata', () => {
            preview.previewContainer.innerHTML = '';
            preview.previewContainer.appendChild(video);
            
            // Add video info
            const infoDiv = document.createElement('div');
            infoDiv.style.cssText = `
                text-align: center;
                color: #888;
                font-size: 11px;
                margin-top: 8px;
                padding: 5px;
            `;
            
            const duration = video.duration;
            const minutes = Math.floor(duration / 60);
            const seconds = Math.floor(duration % 60);
            const durationText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            infoDiv.innerHTML = `
                Duration: ${durationText} | 
                ${video.videoWidth}x${video.videoHeight}
            `;
            preview.previewContainer.appendChild(infoDiv);
        });
        
        video.addEventListener('error', (e) => {
            console.error('Video load error:', e);
            preview.previewContainer.innerHTML = `
                <div style="text-align: center; color: #f44336; padding: 20px;">
                    <p>❌ Failed to load video</p>
                    <p style="font-size: 11px; color: #888;">${filename}</p>
                    <p style="font-size: 10px; color: #666;">Make sure the video format is supported by your browser</p>
                </div>
            `;
        });
        
        // Show loading state
        preview.previewContainer.innerHTML = `
            <div style="text-align: center; color: #888; padding: 20px;">
                <p>🎬 Loading video...</p>
            </div>
        `;
    }

    // Function to toggle section visibility based on file type
    function toggleSectionVisibility() {
        const filename = selectors.currentFile();
        if (!filename) return;
        
        const isMarkdown = filename.toLowerCase().endsWith('.md') || filename.toLowerCase().endsWith('.markdown');
        const isImage = /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(filename.toLowerCase());
        const isVideo = /\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv|m4v)$/i.test(filename.toLowerCase());
        const isTextFile = !isImage && !isVideo; // Everything that's not an image or video is considered text
        
        // Show/hide editor section based on file type
        if (isTextFile) {
            editor.editorSection.style.display = 'block';
        } else {
            editor.editorSection.style.display = 'none';
        }
        
        // Show/hide preview section based on file type
        if (isMarkdown || isImage || isVideo) {
            preview.previewSection.style.display = 'block';
            updatePreview();
        } else {
            preview.previewSection.style.display = 'none';
        }
    }

    // Set up event listeners
    fileList.createFileButton.addEventListener('click', createNewFile);
    editor.saveButton.addEventListener('click', saveFile);
    editor.deleteButton.addEventListener('click', deleteFile);
    
    // Track modifications
    editor.textEditor.addEventListener('input', () => {
        setModified(true);
        updatePreview();
    });

    // Store functions for external access
    return {
        loadFile,
        saveFile,
        deleteFile,
        createNewFile,
        updatePreview
    };
}

/**
 * Loads the list of files in the notes directory
 * @param {HTMLElement} fileListContainer - Container to populate with file list
 */
async function loadNotesFilesList(fileListContainer) {
    try {
        console.log('Loading notes files list...');
        const response = await api.fetchApi('/sage_utils/list_notes');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        actions.setFilesData(result.files || []);
        
        // Clear and populate file list
        fileListContainer.innerHTML = '';
        
        if (selectors.filesData().length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.style.cssText = `
                padding: 20px;
                text-align: center;
                color: #888;
                font-style: italic;
            `;
            emptyMessage.textContent = 'No notes files found';
            fileListContainer.appendChild(emptyMessage);
        } else {
            selectors.filesData().forEach(filename => {
                const fileItem = document.createElement('div');
                fileItem.style.cssText = `
                    padding: 8px 12px;
                    cursor: pointer;
                    border-bottom: 1px solid #333;
                    transition: background-color 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                `;
                
                // Helper function to escape HTML
                function escapeHtml(text) {
                    if (typeof text !== 'string') return '';
                    const div = document.createElement('div');
                    div.textContent = text;
                    return div.innerHTML;
                }
                
                fileItem.innerHTML = `
                    <span style="color: #4CAF50;">📄</span>
                    <span style="flex: 1; color: #fff;">${escapeHtml(filename)}</span>
                `;
                
                fileItem.addEventListener('mouseenter', () => {
                    fileItem.style.backgroundColor = '#333';
                });
                
                fileItem.addEventListener('mouseleave', () => {
                    fileItem.style.backgroundColor = selectors.currentFile() === filename ? '#444' : 'transparent';
                });
                
                // Store a reference to the loadFile function from event handlers
                fileItem.addEventListener('click', () => {
                    // We'll call loadFile through the stored reference
                    if (window.notesEventHandlers && window.notesEventHandlers.loadFile) {
                        window.notesEventHandlers.loadFile(filename);
                    }
                });
                
                fileListContainer.appendChild(fileItem);
            });
        }
        
        console.log(`Loaded ${selectors.filesData().length} notes files`);
    } catch (error) {
        console.error('Error loading files:', error);
        
        // Show error message in the file list
        fileListContainer.innerHTML = '';
        const errorMessage = document.createElement('div');
        errorMessage.style.cssText = `
            padding: 20px;
            text-align: center;
            color: #f44336;
            font-style: italic;
        `;
        errorMessage.textContent = `Error loading files: ${error.message}`;
        fileListContainer.appendChild(errorMessage);
    }
}

/**
 * Assembles the complete Notes tab layout
 * @param {HTMLElement} container - Container element to populate
 * @param {Object} components - All tab components
 */
function assembleNotesTabLayout(container, components) {
    const {
        header,
        fileList,
        editor,
        preview
    } = components;

    // Clear container
    container.innerHTML = '';

    // Create main notes container
    const notesContainer = document.createElement('div');
    notesContainer.style.cssText = `
        padding: 15px;
    `;

    // Add header
    container.appendChild(header);

    // Add all sections to notes container
    notesContainer.appendChild(fileList.fileListSection);
    notesContainer.appendChild(editor.editorSection);
    notesContainer.appendChild(preview.previewSection);

    // Add notes container to main container
    container.appendChild(notesContainer);
}

/**
 * Main function to create the Notes tab
 * @param {HTMLElement} container - Container element to populate
 */
export function createNotesTab(container) {
    // Create all components
    const header = createNotesHeader();
    const fileList = createNotesFileList();
    const editor = createNotesEditor();
    const preview = createNotesPreview();

    // Set up event handlers and store them globally for file list access
    const eventHandlers = setupNotesEventHandlers(fileList, editor, preview);
    window.notesEventHandlers = eventHandlers;

    // Assemble the layout
    assembleNotesTabLayout(container, {
        header,
        fileList,
        editor,
        preview
    });

    // Load initial file list
    loadNotesFilesList(fileList.fileListContainer);
}

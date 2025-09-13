/**
 * Generic File Preview Component
 * Provides reusable file preview functionality for different file types
 */

import { api } from "../../../../../scripts/api.js";
import { FILE_BROWSER_CONFIGS } from './fileBrowser.js';
import { renderMarkdown, ensureMarkdownStyles } from "../../shared/markdown.js";

/**
 * Generic File Preview Class
 * Handles file content preview for various file types
 */
export class GenericFilePreview {
    constructor(configKey, callbacks = {}) {
        this.config = FILE_BROWSER_CONFIGS[configKey];
        if (!this.config) {
            throw new Error(`Unknown file preview config: ${configKey}`);
        }
        
        this.callbacks = {
            onError: callbacks.onError || ((error) => console.error('File preview error:', error)),
            ...callbacks
        };
        
        this.currentFile = null;
        this.container = null;
        this.previewContainer = null;
    }

    /**
     * Creates and returns the file preview UI
     * @param {HTMLElement} parentContainer - Container to append the preview to
     * @returns {Object} - Object containing references to created elements
     */
    render(parentContainer) {
        // Create main container
        this.container = document.createElement('div');
        this.container.className = 'generic-file-preview';
        this.container.style.cssText = `
            padding: 15px;
            background: #2a2a2a;
            border-radius: 6px;
            border: 1px solid #444;
        `;

        // Create header
        const header = this.createHeader();
        this.container.appendChild(header);

        // Create preview container
        this.previewContainer = document.createElement('div');
        this.previewContainer.className = 'preview-container';
        this.previewContainer.style.cssText = `
            min-height: 200px;
            background: #333;
            border: 1px solid #555;
            border-radius: 4px;
            padding: 15px;
            color: #e0e0e0;
            font-family: 'Segoe UI', sans-serif;
            line-height: 1.6;
            overflow: auto;
        `;
        
        this.showEmptyState();
        this.container.appendChild(this.previewContainer);

        // Add to parent container
        if (parentContainer) {
            parentContainer.appendChild(this.container);
        }

        return {
            container: this.container,
            header: header,
            previewContainer: this.previewContainer
        };
    }

    /**
     * Creates the header section
     * @returns {HTMLElement} - Header element
     */
    createHeader() {
        const header = document.createElement('h4');
        header.className = 'file-preview-header';
        header.style.cssText = `
            margin: 0 0 10px 0;
            color: #4CAF50;
            font-size: 14px;
        `;
        header.textContent = 'Preview';

        return header;
    }

    /**
     * Shows empty state in the preview
     */
    showEmptyState() {
        this.previewContainer.innerHTML = '<em style="color: #999;">Select a file to preview...</em>';
        this.previewContainer.className = 'preview-container';
    }

    /**
     * Updates the preview based on file type and content
     * @param {string} filename - Name of the file to preview
     * @param {string} content - Content of the file (for text files)
     */
    updatePreview(filename, content = null) {
        this.currentFile = filename;
        
        if (!filename) {
            this.showEmptyState();
            return;
        }

        const isMarkdown = this.isMarkdownFile(filename);
        const isImage = this.isImageFile(filename);
        const isVideo = this.isVideoFile(filename);
        const isJSON = this.isJSONFile(filename);
        const isYAML = this.isYAMLFile(filename);
        
        if (isMarkdown && content !== null) {
            this.renderMarkdownPreview(content);
        } else if (isJSON && content !== null) {
            this.renderJSONPreview(content);
        } else if (isYAML && content !== null) {
            this.renderYAMLPreview(content);
        } else if (isImage) {
            this.renderImagePreview(filename);
        } else if (isVideo) {
            this.renderVideoPreview(filename);
        } else if (content !== null) {
            this.renderTextPreview(content);
        } else {
            this.showLoadingState();
        }
    }

    /**
     * Shows loading state in the preview
     */
    showLoadingState() {
        this.previewContainer.className = 'preview-container';
        this.previewContainer.innerHTML = `
            <div style="text-align: center; color: #888; padding: 20px;">
                <div style="margin-bottom: 10px;">🔄</div>
                <div>Loading preview...</div>
            </div>
        `;
    }

    /**
     * Renders markdown content as HTML
     * @param {string} content - Markdown content to render
     */
    renderMarkdownPreview(content) {
        try {
            ensureMarkdownStyles();
            this.previewContainer.innerHTML = renderMarkdown(content || '');
            this.previewContainer.className = 'preview-container markdown-overlay';
        } catch (error) {
            this.callbacks.onError(error);
            this.renderErrorPreview('Failed to render markdown preview');
        }
    }

    /**
     * Renders JSON content with syntax highlighting
     * @param {string} content - JSON content to render
     */
    renderJSONPreview(content) {
        this.previewContainer.className = 'preview-container';
        
        try {
            // Try to parse and pretty-print JSON
            const parsed = JSON.parse(content || '{}');
            const formatted = JSON.stringify(parsed, null, 2);
            
            this.previewContainer.innerHTML = `
                <div style="margin-bottom: 10px; color: #4CAF50; font-weight: bold;">📋 JSON Preview</div>
                <pre style="
                    white-space: pre-wrap; 
                    word-wrap: break-word; 
                    font-family: 'Courier New', monospace; 
                    font-size: 12px; 
                    line-height: 1.4;
                    background: #2a2a2a;
                    padding: 10px;
                    border-radius: 4px;
                    border: 1px solid #444;
                    color: #e0e0e0;
                "><code>${this.escapeHtml(formatted)}</code></pre>
            `;
            
        } catch (error) {
            // If JSON is invalid, show as plain text
            this.renderTextPreview(content, 'Invalid JSON - showing as text:');
        }
    }

    /**
     * Renders YAML content
     * @param {string} content - YAML content to render
     */
    renderYAMLPreview(content) {
        this.previewContainer.className = 'preview-container';
        
        this.previewContainer.innerHTML = `
            <div style="margin-bottom: 10px; color: #4CAF50; font-weight: bold;">📋 YAML Preview</div>
            <pre style="
                white-space: pre-wrap; 
                word-wrap: break-word; 
                font-family: 'Courier New', monospace; 
                font-size: 12px; 
                line-height: 1.4;
                background: #2a2a2a;
                padding: 10px;
                border-radius: 4px;
                border: 1px solid #444;
                color: #e0e0e0;
            "><code>${this.escapeHtml(content || '')}</code></pre>
        `;
    }

    /**
     * Renders plain text content
     * @param {string} content - Text content to render
     * @param {string} prefix - Optional prefix text
     */
    renderTextPreview(content, prefix = '') {
        this.previewContainer.className = 'preview-container';
        
        const prefixHtml = prefix ? `<div style="margin-bottom: 10px; color: #FF9800;">${this.escapeHtml(prefix)}</div>` : '';
        
        this.previewContainer.innerHTML = `
            ${prefixHtml}
            <pre style="
                white-space: pre-wrap; 
                word-wrap: break-word; 
                font-family: 'Courier New', monospace; 
                font-size: 12px; 
                line-height: 1.4;
            ">${this.escapeHtml(content || '')}</pre>
        `;
    }

    /**
     * Renders image preview
     * @param {string} filename - Name of the image file
     */
    renderImagePreview(filename) {
        this.previewContainer.className = 'preview-container';
        
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
        
        // Set image source based on config
        img.src = this.getFileUrl(filename);
        
        // Handle loading states
        img.onload = () => {
            this.previewContainer.innerHTML = '';
            this.previewContainer.appendChild(img);
        };
        
        img.onerror = () => {
            this.renderErrorPreview(`Failed to load image: ${filename}`);
        };
        
        // Show loading state
        this.previewContainer.innerHTML = `
            <div style="text-align: center; color: #888; padding: 20px;">
                <p>🖼️ Loading image...</p>
            </div>
        `;
    }

    /**
     * Renders video preview
     * @param {string} filename - Name of the video file
     */
    renderVideoPreview(filename) {
        this.previewContainer.className = 'preview-container';
        
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
        
        // Set video source based on config
        video.src = this.getFileUrl(filename);
        
        // Handle loading states
        video.addEventListener('loadedmetadata', () => {
            this.previewContainer.innerHTML = '';
            this.previewContainer.appendChild(video);
            
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
            this.previewContainer.appendChild(infoDiv);
        });
        
        video.addEventListener('error', (e) => {
            console.error('Video load error:', e);
            this.renderErrorPreview(`Failed to load video: ${filename}`);
        });
        
        // Show loading state
        this.previewContainer.innerHTML = `
            <div style="text-align: center; color: #888; padding: 20px;">
                <p>🎬 Loading video...</p>
            </div>
        `;
    }

    /**
     * Renders error state
     * @param {string} message - Error message to display
     */
    renderErrorPreview(message) {
        this.previewContainer.className = 'preview-container';
        this.previewContainer.innerHTML = `
            <div style="text-align: center; color: #f44336; padding: 20px;">
                <p>❌ ${this.escapeHtml(message)}</p>
            </div>
        `;
    }

    /**
     * Gets the appropriate URL for a file based on config
     * @param {string} filename - Name of the file
     * @returns {string} - URL to access the file
     */
    getFileUrl(filename) {
        // For notes, use the read_note endpoint
        if (this.config.apiEndpoint.includes('notes')) {
            return `/sage_utils/read_note?filename=${encodeURIComponent(filename)}`;
        }
        
        // For wildcards, use the wildcard file endpoint
        if (this.config.apiEndpoint.includes('wildcard')) {
            return `/sage_utils/wildcard_file/${encodeURIComponent(filename)}`;
        }
        
        // Default fallback
        return `/sage_utils/file/${encodeURIComponent(filename)}`;
    }

    /**
     * File type detection methods
     */
    isMarkdownFile(filename) {
        return filename.toLowerCase().endsWith('.md') || filename.toLowerCase().endsWith('.markdown');
    }

    isImageFile(filename) {
        return /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(filename.toLowerCase());
    }

    isVideoFile(filename) {
        return /\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv|m4v)$/i.test(filename.toLowerCase());
    }

    isJSONFile(filename) {
        return filename.toLowerCase().endsWith('.json');
    }

    isYAMLFile(filename) {
        return filename.toLowerCase().endsWith('.yaml') || filename.toLowerCase().endsWith('.yml');
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
     * Gets the current file name
     * @returns {string|null} - Current file name or null
     */
    getCurrentFile() {
        return this.currentFile;
    }

    /**
     * Clears the preview
     */
    clear() {
        this.currentFile = null;
        this.showEmptyState();
    }

    /**
     * Destroys the preview and cleans up
     */
    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.currentFile = null;
        this.container = null;
        this.previewContainer = null;
    }
}

export default GenericFilePreview;

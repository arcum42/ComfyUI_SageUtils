/**
 * Generic File Preview Component
 * Provides reusable file preview functionality for different file types
 */

import { api } from "../../../../scripts/api.js";
import { FILE_BROWSER_CONFIGS } from './fileBrowser.js';
import { renderMarkdown, ensureMarkdownStyles } from "../shared/markdown.js";
import { loadComponentStyles } from '../components/styleLoader.js';
import { copyTextToSelectedNode } from '../utils/textCopyUtils.js';
import { app } from '../../../scripts/app.js';

export class GenericFilePreview {
    constructor(configKey, callbacks = {}) {
        this.config = FILE_BROWSER_CONFIGS[configKey];
        if (!this.config) {
            throw new Error(`Unknown file preview config: ${configKey}`);
        }
        
        this.callbacks = {
            onError: callbacks.onError || ((error) => console.error('File preview error:', error)),
            onCopyToLLM: callbacks.onCopyToLLM || null,
            ...callbacks
        };
        
        this.currentFile = null;
        this.currentContent = null; // Store current content for copying
        this.container = null;
        this.previewContainer = null;
        this.copyToLLMPromptBtn = null; // Button for main prompt
        this.copyToLLMSystemBtn = null; // Button for system prompt
    }

    /**
     * Creates and returns the file preview UI
     * @param {HTMLElement} parentContainer - Container to append the preview to
     * @returns {Object} - Object containing references to created elements
     */
    render(parentContainer) {
        loadComponentStyles('filePreview');

        // Create main container
        this.container = document.createElement('div');
        this.container.className = 'generic-file-preview';

        // Create header
        const header = this.createHeader();
        this.container.appendChild(header);

        // Create preview container
        this.previewContainer = document.createElement('div');
        this.previewContainer.className = 'preview-container';
        
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
        const headerContainer = document.createElement('div');
        headerContainer.className = 'file-preview-toolbar';
        
        const header = document.createElement('h4');
        header.className = 'file-preview-header file-preview-title';
        header.textContent = 'Preview';
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'file-preview-actions';
        
        // Create copy to LLM prompt button
        this.copyToLLMPromptBtn = document.createElement('button');
        this.copyToLLMPromptBtn.className = 'file-preview-action file-preview-action--prompt copy-to-llm-prompt-btn';
        this.copyToLLMPromptBtn.innerHTML = '💬 To Prompt';
        this.copyToLLMPromptBtn.type = 'button';
        this.copyToLLMPromptBtn.disabled = true;
        this.copyToLLMPromptBtn.title = 'Copy file content to LLM tab main prompt';
        
        this.copyToLLMPromptBtn.addEventListener('click', () => {
            this.copyToLLMPromptFallback();
        });
        
        // Create copy to LLM system prompt button
        this.copyToLLMSystemBtn = document.createElement('button');
        this.copyToLLMSystemBtn.className = 'file-preview-action file-preview-action--system copy-to-llm-system-btn';
        this.copyToLLMSystemBtn.innerHTML = '🤖 To System';
        this.copyToLLMSystemBtn.type = 'button';
        this.copyToLLMSystemBtn.disabled = true;
        this.copyToLLMSystemBtn.title = 'Copy file content to LLM tab system prompt';
        
        this.copyToLLMSystemBtn.addEventListener('click', () => {
            if (this.currentContent && this.callbacks.onCopyToLLM) {
                this.callbacks.onCopyToLLM(this.currentContent, this.currentFile);
            } else {
                this.copyToLLMSystemFallback();
            }
        });
        
        // Create copy to node button
        this.copyToNodeBtn = document.createElement('button');
        this.copyToNodeBtn.className = 'file-preview-action file-preview-action--node copy-to-node-btn';
        this.copyToNodeBtn.innerHTML = '📤 To Node';
        this.copyToNodeBtn.type = 'button';
        this.copyToNodeBtn.disabled = true;
        this.copyToNodeBtn.title = 'Copy file content to selected node';
        
        this.copyToNodeBtn.addEventListener('click', () => {
            this.copyToNode();
        });
        
        buttonContainer.appendChild(this.copyToLLMPromptBtn);
        buttonContainer.appendChild(this.copyToLLMSystemBtn);
        buttonContainer.appendChild(this.copyToNodeBtn);
        
        headerContainer.appendChild(header);
        headerContainer.appendChild(buttonContainer);

        return headerContainer;
    }
    
    /**
     * Copy content to selected node
     */
    copyToNode() {
        if (!this.currentContent) {
            console.warn('No content to copy to node');
            return;
        }
        
        const success = copyTextToSelectedNode(app, this.currentContent);
        
        this.flashButton(this.copyToNodeBtn, success, success ? '✓ Copied!' : '❌ Select Node');
    }

    /**
     * Temporarily show success/error feedback on a button
     * @param {HTMLElement} button
     * @param {boolean} success
     * @param {string} text
     */
    flashButton(button, success, text) {
        if (!button) return;
        if (button._flashTimeout) {
            clearTimeout(button._flashTimeout);
        } else {
            button._originalHtml = button.innerHTML;
        }
        button.textContent = text;
        button.classList.toggle('file-preview-action--success', success);
        button.classList.toggle('file-preview-action--error', !success);
        button._flashTimeout = setTimeout(() => {
            button.innerHTML = button._originalHtml;
            button.classList.remove('file-preview-action--success', 'file-preview-action--error');
            button._flashTimeout = null;
        }, 2000);
    }
    
    /**
     * Fallback method to copy to LLM prompt when callback isn't provided
     * Directly accesses the LLM tab if available
     */
    copyToLLMPromptFallback() {
        if (!this.currentContent) {
            console.warn('No content to copy to LLM prompt');
            return;
        }
        
        // Try to find the LLM tab's main prompt textarea
        const promptTextarea = document.querySelector('.llm-main-prompt');
        if (promptTextarea) {
            promptTextarea.value = this.currentContent;
            promptTextarea.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Show success feedback
            this.showCopyFeedback('prompt', true);
        } else {
            console.warn('LLM tab main prompt not found');
            this.showCopyFeedback('prompt', false);
        }
    }
    
    /**
     * Fallback method to copy to LLM system prompt when callback isn't provided
     * Directly accesses the LLM tab if available
     */
    copyToLLMSystemFallback() {
        if (!this.currentContent) {
            console.warn('No content to copy to LLM system prompt');
            return;
        }
        
        // Try to find the LLM tab's system prompt textarea
        const systemPromptTextarea = document.querySelector('.llm-system-prompt');
        if (systemPromptTextarea) {
            systemPromptTextarea.value = this.currentContent;
            systemPromptTextarea.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Show success feedback
            this.showCopyFeedback('system', true);
        } else {
            console.warn('LLM tab system prompt not found');
            this.showCopyFeedback('system', false);
        }
    }
    
    /**
     * Show visual feedback for copy action
     * @param {string} target - 'prompt' or 'system'
     * @param {boolean} success - Whether the copy was successful
     */
    showCopyFeedback(target, success) {
        const button = target === 'prompt' ? this.copyToLLMPromptBtn : this.copyToLLMSystemBtn;
        this.flashButton(button, success, success ? '✓ Copied!' : '✗ Failed');
    }
    
    /**
     * Updates the copy button states
     * @param {boolean} enabled - Whether the buttons should be enabled
     */
    updateCopyButtonState(enabled) {
        const buttons = [this.copyToLLMPromptBtn, this.copyToLLMSystemBtn, this.copyToNodeBtn];
        buttons.forEach(button => {
            if (button) {
                button.disabled = !enabled;
            }
        });
    }

    /**
     * Shows empty state in the preview
     */
    showEmptyState() {
        this.currentContent = null;
        this.updateCopyButtonState(false);
        this.previewContainer.innerHTML = '<em class="file-preview-empty">Select a file to preview...</em>';
        this.previewContainer.className = 'preview-container';
    }

    /**
     * Updates the preview based on file type and content
     * @param {string} filename - Name of the file to preview
     * @param {string} content - Content of the file (for text files)
     */
    updatePreview(filename, content = null) {
        this.currentFile = filename;
        this.currentContent = content; // Store content for copying
        
        if (!filename) {
            this.showEmptyState();
            return;
        }
        
        // Enable copy button if we have text content
        this.updateCopyButtonState(content !== null && typeof content === 'string');

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
            <div class="file-preview-status" role="status">
                <div class="file-preview-status-icon">🔄</div>
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
                <div class="file-preview-label">📋 JSON Preview</div>
                <pre class="file-preview-code"><code>${this.escapeHtml(formatted)}</code></pre>
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
            <div class="file-preview-label">📋 YAML Preview</div>
            <pre class="file-preview-code"><code>${this.escapeHtml(content || '')}</code></pre>
        `;
    }

    /**
     * Renders plain text content
     * @param {string} content - Text content to render
     * @param {string} prefix - Optional prefix text
     */
    renderTextPreview(content, prefix = '') {
        this.previewContainer.className = 'preview-container';
        
        const prefixHtml = prefix ? `<div class="file-preview-label file-preview-label--warning">${this.escapeHtml(prefix)}</div>` : '';
        
        this.previewContainer.innerHTML = `
            ${prefixHtml}
            <pre class="file-preview-code">${this.escapeHtml(content || '')}</pre>
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
        img.className = 'file-preview-media';
        
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
            <div class="file-preview-status" role="status">
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
        video.className = 'file-preview-media file-preview-media--video';
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
            infoDiv.className = 'file-preview-media-info';
            
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
            <div class="file-preview-status" role="status">
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
            <div class="file-preview-status file-preview-status--error" role="alert">
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
     * Changes the configuration
     * @param {string} newConfigKey - New configuration key
     */
    changeConfiguration(newConfigKey) {
        this.configKey = newConfigKey;
        this.config = FILE_BROWSER_CONFIGS[newConfigKey];
        if (!this.config) {
            throw new Error(`Unknown file preview config: ${newConfigKey}`);
        }
        
        // Clear current preview
        this.currentFile = null;
        if (this.previewContainer) {
            this.previewContainer.innerHTML = '<em class="file-preview-empty">Select a file to preview...</em>';
        }
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

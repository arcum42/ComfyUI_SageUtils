// Setup function for Sage_ViewNotes node
// Handles file selection and preview functionality for notes with markdown, image, and video support

import { api } from "../../../../scripts/api.js";
import { createTextOutputWidget, setupMarkdownDisplay, setupImageDisplay, setupVideoDisplay } from "../widgets/display.js";
import { renderMarkdown } from "../shared/markdown.js";

/**
 * Sets up the ViewNotes node with file selection and preview functionality.
 * @param {Object} nodeType - The node type prototype.
 * @param {Object} nodeData - The node data.
 * @param {Object} app - The app instance.
 */
export function setupViewNotesNode(nodeType, nodeData, app) {
  const onNodeCreated = nodeType.prototype.onNodeCreated;
  nodeType.prototype.onNodeCreated = function () {
    if (onNodeCreated) onNodeCreated.apply(this, []);
    
    // Find the filename widget and add callback for file selection
    const filenameWidget = this.widgets?.find(w => w.name === "filename");
    if (filenameWidget) {
      const originalCallback = filenameWidget.callback;
      filenameWidget.callback = async function(value) {
        // Call original callback if it exists
        if (originalCallback) originalCallback.call(this, value);
        
        // Load and display file content when filename changes
        await loadFileContent(this.node, value);
      }.bind({ node: this });
    }
    
    // Load initial file content if a filename is already selected
    setTimeout(() => {
      const currentFilename = filenameWidget?.value;
      if (currentFilename && currentFilename !== "No files found") {
        loadFileContent(this, currentFilename);
      }
    }, 100); // Small delay to ensure node is fully initialized
  };

  /**
   * Loads file content from the notes directory and updates the output widget.
   * @param {Object} node - The node instance.
   * @param {string} filename - The filename to load.
   */
  async function loadFileContent(node, filename) {
    try {
      if (filename === "No files found" || !filename) {
        updateOutputWidget(node, { text: "No file selected or no files found in notes directory." }, filename);
        return;
      }

      // Make API call to get file content
      const response = await api.fetchApi('/sage_utils/read_notes_file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: filename })
      });

      if (response.ok) {
        const data = await response.json();
        updateOutputWidget(node, { text: data.content || "File is empty." }, filename);
      } else {
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
        updateOutputWidget(node, { text: `Error loading file: ${errorData.error || response.statusText}` }, filename);
      }
    } catch (error) {
      console.error("Error loading notes file:", error);
      updateOutputWidget(node, { text: `Error loading file: ${error.message}` }, filename);
    }
  }

  /**
   * Helper to find or create the output widget and update its value.
   * @param {Object} node - The node instance.
   * @param {Object} message - The message object containing text.
   * @param {string} filename - The filename (used to determine if markdown rendering is needed).
   */
  function updateOutputWidget(node, message, filename) {
    const isMarkdown = filename && filename.toLowerCase().endsWith('.md');
    const isImage = filename && /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(filename);
    // Separate browser-supported and unsupported video formats
    const isSupportedVideo = filename && /\.(mp4|webm|ogg|m4v)$/i.test(filename);
    const isUnsupportedVideo = filename && /\.(avi|mov|wmv|flv|mkv)$/i.test(filename);
    const isVideo = isSupportedVideo || isUnsupportedVideo;
    
    let w = createTextOutputWidget(node, app);
    
    // Update content
    const content = Array.isArray(message["text"]) 
      ? message["text"].join("") 
      : (typeof message["text"] === "string" ? message["text"] : String(message["text"] ?? ""));
    
    if (isVideo) {
      // For video files, display the video player or show format info
      setupVideoDisplay(w, filename, isSupportedVideo);
    } else if (isImage) {
      // For image files, display the image
      setupImageDisplay(w, filename);
    } else if (isMarkdown) {
      // For markdown files, use our custom renderer
      setupMarkdownDisplay(w, content);
    } else {
      // For regular text files, just set the value and clean up overlays
      w.value = content;
      
      // Remove any overlays if they exist
      if (w.markdownOverlay) {
        w.markdownOverlay.remove();
        w.markdownOverlay = null;
      }
      if (w.imageOverlay) {
        w.imageOverlay.remove();
        w.imageOverlay = null;
      }
      if (w.videoOverlay) {
        w.videoOverlay.remove();
        w.videoOverlay = null;
      }
      
      // Restore original textarea styling and show it
      if (w.inputEl) {
        w.inputEl.style.opacity = '';
        if (w.inputEl._originalStyle) {
          w.inputEl.style.cssText = w.inputEl._originalStyle;
          w.inputEl.readOnly = w.inputEl._originalReadOnly || false;
          w.inputEl.className = '';
        }
      }
    }
  }

  const onExecuted = nodeType.prototype.onExecuted;
  nodeType.prototype.onExecuted = function (message) {
    // Log output for debugging - show processed text instead of raw array
    if (message && message["text"]) {
      const processedText = Array.isArray(message["text"]) 
        ? message["text"].join("") 
        : String(message["text"]);
      console.log("ViewNotes processed text:", processedText.substring(0, 100) + "...");
    }
    if (onExecuted) onExecuted.apply(this, arguments);
    updateOutputWidget(this, message, this.widgets.find(w => w.name === 'filename')?.value);
    this.onResize?.(this.size);
  };
}

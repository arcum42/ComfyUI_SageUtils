// Main JavaScript file for Sage Utils custom nodes.
// For ComfyUI custom node development, see:
//   https://github.com/chrisgoringe/Comfy-Custom-Node-How-To/
//   https://github.com/chrisgoringe/Comfy-Custom-Node-How-To/wiki/ui_1_starting
//   https://github.com/chrisgoringe/Comfy-Custom-Node-How-To/wiki/remove_or_add_widget

import { app } from "../../../scripts/app.js";
import { ComfyWidgets } from "../../../scripts/widgets.js";
import { api } from "../../scripts/api.js";

const TypeSlot = Object.freeze({
  Input: 1,
  Output: 2,
});

const TypeSlotEvent = Object.freeze({
  Connect: true,
  Disconnect: false,
});

const _ID = "Sage_";

/**
 * Creates a generic setup function for nodes with dynamic input slots.
 * @param {string} prefix - The prefix for the input slot names.
 * @param {string} type - The type for the input slots.
 * @returns {Function} - The setup function for the node type.
 */
function createDynamicInputSetup(prefix, type) {
  return function setupDynamicInputNode(nodeType, nodeData, app) {
    const onNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = async function () {
      const me = onNodeCreated?.apply(this);
      // Add a new dynamic input slot
      this.addInput(prefix, type);
      // Set appearance for the new slot
      const slot = this.inputs[this.inputs.length - 1];
      if (slot) slot.color_off = "#666";
      return me;
    };

    const onConnectionsChange = nodeType.prototype.onConnectionsChange;
    nodeType.prototype.onConnectionsChange = function (slotType, slot_idx, event, link_info, node_slot) {
      const me = onConnectionsChange?.apply(this, arguments);
      if (slotType !== TypeSlot.Input) return me;

      if (link_info && event === TypeSlotEvent.Connect) {
        // Get the parent (left side node) from the link
        const fromNode = this.graph._nodes.find(
          (otherNode) => otherNode.id == link_info.origin_id
        );
        if (fromNode) {
          const parent_link = fromNode.outputs[link_info.origin_slot];
          if (parent_link) {
            node_slot.type = parent_link.type;
            // Set the slot name with the correct count suffix immediately
            const baseName = prefix;
            const realbaseName = node_slot.name.split("_")[0] || baseName;
            let count = 1;
            for (const slot of this.inputs) {
              if (slot !== node_slot && slot.name.startsWith(baseName + "_")) {
                count++;
              }
            }
            node_slot.name = `${realbaseName}_${count}`;
          }
        }
      } else if (event === TypeSlotEvent.Disconnect) {
        this.removeInput(slot_idx);
      }

      // Track each slot name so we can index the uniques
      let idx = 0;
      const slot_tracker = {};
      for (const slot of this.inputs) {
        if (slot.link === null) {
          this.removeInput(idx);
          continue;
        }
        idx += 1;
        const name = slot.name.split("_")[0];
        slot_tracker[name] = (slot_tracker[name] || 0) + 1;
        slot.name = `${name}_${slot_tracker[name]}`;
      }

      // Ensure the last slot is a dynamic entry
      let last = this.inputs[this.inputs.length - 1];
      if (!last || last.name !== prefix || last.type !== type) {
        this.addInput(prefix, type);
        last = this.inputs[this.inputs.length - 1];
        if (last) last.color_off = "#666";
      }

      // Update the index widget to reflect the number of inputs
      const w = this.widgets?.find((w) => w.name === "index");
      if (w) {
        w.options.max = this.inputs.length - 1; // -1 because the last one is dynamic
        if (w.value > w.options.max || w.value < 1) {
          w.value = w.options.max;
        }
        w.onResize?.(w.size);
      }

      // Force the node to resize itself for the new/deleted connections
      this?.graph?.setDirtyCanvas(true);
      return me;
    };
  };
}

/**
 * Sets up the MultiModelPicker node with dynamic input slots and proper naming.
 * @param {Object} nodeType - The node type prototype.
 * @param {Object} nodeData - The node data.
 * @param {Object} app - The app instance.
 */
function setupMultiModelPickerNode(nodeType, nodeData, app) {
  const setupFunction = createDynamicInputSetup("model_info", "MODEL_INFO");
  setupFunction(nodeType, nodeData, app);
}

/**
 * Sets up the TextSubstitution node with dynamic string input slots.
 * @param {Object} nodeType - The node type prototype.
 * @param {Object} nodeData - The node data.
 * @param {Object} app - The app instance.
 */
function setupTextSubstitutionNode(nodeType, nodeData, app) {
  const prefix = "str";
  const type = "STRING";
  
  const onNodeCreated = nodeType.prototype.onNodeCreated;
  nodeType.prototype.onNodeCreated = async function () {
    // Don't call the original onNodeCreated as it might be adding the static inputs incorrectly
    // const me = onNodeCreated?.apply(this);
    
    // Clean up any corrupted static inputs that have "_1" suffixes
    const staticInputs = ["prefix", "suffix", "text", "delimiter"];
    for (let i = this.inputs.length - 1; i >= 0; i--) {
      const slot = this.inputs[i];
      // Skip if slot is undefined or doesn't have a name
      if (!slot || !slot.name) {
        continue;
      }
      // Remove any static inputs with "_1" suffixes (these are corrupted duplicates)
      if (staticInputs.some(name => slot.name === name + "_1")) {
        this.removeInput(i);
      }
    }
    
    // Add a new dynamic input slot
    this.addInput(prefix, type);
    // Set appearance for the new slot
    const slot = this.inputs[this.inputs.length - 1];
    if (slot) slot.color_off = "#666";
    
    return;
  };

  const onConnectionsChange = nodeType.prototype.onConnectionsChange;
  nodeType.prototype.onConnectionsChange = function (slotType, slot_idx, event, link_info, node_slot) {
    // Don't call the original onConnectionsChange as it might be renaming inputs
    // const me = onConnectionsChange?.apply(this, arguments);
    if (slotType !== TypeSlot.Input) return;

    if (link_info && event === TypeSlotEvent.Connect) {
      // Get the parent (left side node) from the link
      const fromNode = this.graph._nodes.find(
        (otherNode) => otherNode.id == link_info.origin_id
      );
      if (fromNode) {
        const parent_link = fromNode.outputs[link_info.origin_slot];
        if (parent_link) {
          node_slot.type = parent_link.type;
          
          // ONLY rename dynamic "str" inputs, NOT static inputs like prefix, suffix, text, delimiter
          const staticInputs = ["prefix", "suffix", "text", "delimiter"];
          if (!staticInputs.includes(node_slot.name)) {
            // Set the slot name with the correct count suffix immediately for dynamic inputs only
            const baseName = prefix;
            const realbaseName = node_slot.name.split("_")[0] || baseName;
            let count = 1;
            for (const slot of this.inputs) {
              if (slot !== node_slot && slot.name.startsWith(baseName + "_")) {
                count++;
              }
            }
            const oldName = node_slot.name;
            node_slot.name = `${realbaseName}_${count}`;
          }
        }
      }
    }
    // Track each slot name so we can index the uniques, but preserve static inputs
    // Static inputs like "text", "delimiter", "prefix", "suffix" should never be renamed
    // First pass: remove disconnected dynamic inputs (iterate backwards to avoid index issues)
    for (let i = this.inputs.length - 1; i >= 0; i--) {
      const slot = this.inputs[i];
      // Skip if slot is undefined or doesn't have a name
      if (!slot || !slot.name) {
        continue;
      }
      // Only process dynamic str inputs (prefix="str") - skip all static inputs
      if (slot.name !== prefix && !slot.name.startsWith(prefix + "_")) {
        continue;
      }
      
      // Remove dynamic str_ inputs that have no connection
      // But keep the base "str" input (it should be the empty one for new connections)
      if (slot.link === null && slot.name.startsWith(prefix + "_")) {
        this.removeInput(i);
      }
    }
    
    // Second pass: renumber remaining connected dynamic inputs sequentially
    const slot_tracker = {};
    for (const slot of this.inputs) {
      // Skip if slot is undefined or doesn't have a name
      if (!slot || !slot.name) {
        continue;
      }
      // Only process dynamic str inputs that are connected and have the suffix pattern
      if (slot.link !== null && slot.name.startsWith(prefix + "_")) {
        const name = slot.name.split("_")[0]; // Should be "str"
        slot_tracker[name] = (slot_tracker[name] || 0) + 1;
        slot.name = `${name}_${slot_tracker[name]}`;
      }
    }

    // Ensure the last slot is a dynamic entry
    let last = this.inputs[this.inputs.length - 1];
    if (!last || last.name !== prefix || last.type !== type) {
      this.addInput(prefix, type);
      last = this.inputs[this.inputs.length - 1];
      if (last) last.color_off = "#666";
    }

    // Note: TextSubstitution doesn't need an index widget like MultiModelPicker
    // because it uses ALL connected inputs, not just one selected input

    // Force the node to resize itself for the new/deleted connections
    this?.graph?.setDirtyCanvas(true);
    
    return;
  };

  // Clean up timer when node is removed
  const onRemoved = nodeType.prototype.onRemoved;
  nodeType.prototype.onRemoved = function() {
    if (onRemoved) onRemoved.apply(this, arguments);
  };
}

/**
 * Sets up a node to view text or any output, updating a read-only widget.
 * @param {Object} nodeType - The node type prototype.
 * @param {Object} nodeData - The node data.
 * @param {Object} app - The app instance.
 */
function setupViewTextOrAnythingNode(nodeType, nodeData, app) {
  const onNodeCreated = nodeType.prototype.onNodeCreated;
  nodeType.prototype.onNodeCreated = function () {
    if (onNodeCreated) onNodeCreated.apply(this, []);
    // No additional setup needed on creation
  };

  /**
   * Helper to find or create the output widget and update its value.
   * @param {Object} node - The node instance.
   * @param {Object} message - The message object containing text.
   */
  function updateOutputWidget(node, message) {
    let w = node.widgets?.find((w) => w.name === "output");
    if (!w) {
      w = ComfyWidgets["STRING"](
        node,
        "output",
        ["STRING", { multiline: true }],
        app
      ).widget;
      w.inputEl.readOnly = true;
      w.inputEl.style.opacity = 0.6;
      w.inputEl.style.fontSize = "9pt";
    }
    // Defensive: handle message["text"] as array or string
    if (Array.isArray(message["text"])) {
      w.value = message["text"].join("");
    } else if (typeof message["text"] === "string") {
      w.value = message["text"];
    } else {
      w.value = String(message["text"] ?? "");
    }
  }

  const onExecuted = nodeType.prototype.onExecuted;
  nodeType.prototype.onExecuted = function (message) {
    // Log output for debugging - show processed text instead of raw array
    if (message && message["text"]) {
      const processedText = Array.isArray(message["text"]) 
        ? message["text"].join("") 
        : String(message["text"]);
      console.log("ViewAnything processed text:", processedText.substring(0, 100) + "...");
    }
    if (onExecuted) onExecuted.apply(this, arguments);
    updateOutputWidget(this, message);
    this.onResize?.(this.size);
  };
}

/**
 * Sets up the ViewNotes node with file selection and preview functionality.
 * @param {Object} nodeType - The node type prototype.
 * @param {Object} nodeData - The node data.
 * @param {Object} app - The app instance.
 */
function setupViewNotesNode(nodeType, nodeData, app) {
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
    let w = node.widgets?.find((w) => w.name === "output");
    
    // Create widget if it doesn't exist
    if (!w) {
      // Try to use MARKDOWN widget for markdown files if available
      if (isMarkdown && ComfyWidgets["MARKDOWN"]) {
        try {
          w = ComfyWidgets["MARKDOWN"](
            node,
            "output",
            ["STRING", { multiline: true }],
            app
          ).widget;
        } catch (error) {
          console.log("MARKDOWN widget not available, falling back to STRING:", error);
          w = null;
        }
      }
      
      // Fallback to STRING widget if MARKDOWN not available or creation failed
      if (!w) {
        w = ComfyWidgets["STRING"](
          node,
          "output",
          ["STRING", { multiline: true }],
          app
        ).widget;
        w.inputEl.readOnly = true;
        w.inputEl.style.opacity = 0.6;
        w.inputEl.style.fontSize = "9pt";
      }
    }
    
    // Update content
    const content = Array.isArray(message["text"]) 
      ? message["text"].join("") 
      : (typeof message["text"] === "string" ? message["text"] : String(message["text"] ?? ""));
    
    // If we have a MARKDOWN widget, just set the value directly
    if (w.type === "MARKDOWN") {
      w.value = content;
    } else if (isVideo) {
      // For video files, display the video player or show format info
      setupVideoDisplay(w, filename, isSupportedVideo);
    } else if (isImage) {
      // For image files, display the image
      setupImageDisplay(w, filename);
    } else if (isMarkdown) {
      // For STRING widgets displaying markdown, use our custom renderer
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

  /**
   * Sets up proper HTML markdown display for a text widget.
   * @param {Object} widget - The text widget.
   * @param {string} content - The markdown content to render.
   */
  function setupMarkdownDisplay(widget, content) {
    // Set the textarea value for fallback
    widget.value = content;
    
    if (widget.inputEl && widget.inputEl.parentElement) {
      // Remove any existing markdown overlay
      const existingOverlay = widget.inputEl.parentElement.querySelector('.markdown-overlay');
      if (existingOverlay) {
        existingOverlay.remove();
      }
      
      // Create markdown display overlay
      const markdownDiv = document.createElement('div');
      markdownDiv.className = 'markdown-overlay';
      markdownDiv.innerHTML = renderMarkdown(content);
      
      // Style the overlay to match the textarea exactly
      markdownDiv.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #1e1e1e;
        color: #d4d4d4;
        padding: 8px 12px;
        border: 1px solid #3e3e3e;
        border-radius: 6px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        line-height: 1.5;
        overflow-y: auto;
        overflow-x: hidden;
        word-wrap: break-word;
        box-sizing: border-box;
        z-index: 1;
        pointer-events: auto;
      `;
      
      // Hide the textarea
      widget.inputEl.style.opacity = '0';
      
      // Make sure the parent has position relative for absolute positioning
      const parent = widget.inputEl.parentElement;
      if (getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
      
      // Insert the overlay
      parent.appendChild(markdownDiv);
      
      // Store reference for cleanup
      widget.markdownOverlay = markdownDiv;
      
      // Add styles for markdown elements
      if (!document.querySelector('#sage-markdown-styles')) {
        const style = document.createElement('style');
        style.id = 'sage-markdown-styles';
        style.textContent = `
          .markdown-overlay h1, .markdown-overlay h2, .markdown-overlay h3,
          .markdown-overlay h4, .markdown-overlay h5, .markdown-overlay h6 {
            color: #569cd6;
            margin: 12px 0 6px 0;
            font-weight: 600;
          }
          .markdown-overlay h1 { font-size: 1.5em; border-bottom: 1px solid #3e3e3e; padding-bottom: 4px; }
          .markdown-overlay h2 { font-size: 1.3em; border-bottom: 1px solid #3e3e3e; padding-bottom: 2px; }
          .markdown-overlay h3 { font-size: 1.1em; }
          .markdown-overlay h4 { font-size: 1em; }
          .markdown-overlay p { margin: 8px 0; }
          .markdown-overlay pre {
            background: #2d2d2d;
            border: 1px solid #404040;
            border-radius: 4px;
            padding: 8px;
            margin: 8px 0;
            overflow-x: auto;
          }
          .markdown-overlay code {
            background: #2d2d2d;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          }
          .markdown-overlay pre code {
            background: transparent;
            padding: 0;
          }
          .markdown-overlay a {
            color: #4fc3f7;
            text-decoration: none;
          }
          .markdown-overlay a:hover {
            text-decoration: underline;
          }
          .markdown-overlay ul, .markdown-overlay ol {
            margin: 8px 0;
            padding-left: 20px;
          }
          .markdown-overlay li {
            margin: 4px 0;
          }
          .markdown-overlay blockquote {
            border-left: 4px solid #569cd6;
            margin: 8px 0;
            padding-left: 12px;
            font-style: italic;
            color: #b0b0b0;
          }
          .markdown-overlay strong {
            font-weight: 600;
            color: #f0f0f0;
          }
          .markdown-overlay em {
            font-style: italic;
            color: #e0e0e0;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }

  /**
   * Sets up image display for a text widget.
   * @param {Object} widget - The text widget.
   * @param {string} filename - The image filename to display.
   */
  function setupImageDisplay(widget, filename) {
    // Set the textarea value to show filename
    widget.value = `Displaying image: ${filename}`;
    
    if (widget.inputEl && widget.inputEl.parentElement) {
      // Remove any existing overlays
      const existingOverlay = widget.inputEl.parentElement.querySelector('.markdown-overlay, .image-overlay, .video-overlay');
      if (existingOverlay) {
        existingOverlay.remove();
      }
      
      // Create image display overlay
      const imageDiv = document.createElement('div');
      imageDiv.className = 'image-overlay';
      
      // Create image element
      const img = document.createElement('img');
      // Construct the URL for the image in the notes directory
      img.src = `/sage_utils/read_notes_file?filename=${encodeURIComponent(filename)}&type=image`;
      img.alt = filename;
      
      // Style the image to fit nicely
      img.style.cssText = `
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
        object-fit: contain;
        display: block;
        margin: auto;
      `;
      
      imageDiv.appendChild(img);
      
      // Style the overlay container
      imageDiv.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #1e1e1e;
        border: 1px solid #3e3e3e;
        border-radius: 6px;
        padding: 8px;
        box-sizing: border-box;
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: auto;
      `;
      
      // Hide the textarea
      widget.inputEl.style.opacity = '0';
      
      // Make sure the parent has position relative for absolute positioning
      const parent = widget.inputEl.parentElement;
      if (getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
      
      // Insert the overlay
      parent.appendChild(imageDiv);
      
      // Store reference for cleanup
      widget.imageOverlay = imageDiv;
      
      // Handle image load errors
      img.onerror = function() {
        imageDiv.innerHTML = `
          <div style="color: #ff6b6b; text-align: center; padding: 20px;">
            <p>Failed to load image: ${filename}</p>
            <p style="font-size: 12px; opacity: 0.7;">Image may not exist or format may not be supported</p>
          </div>
        `;
      };
      
      // Handle successful image load
      img.onload = function() {
        console.log(`Successfully loaded image: ${filename}`);
      };
    }
  }

  /**
   * Sets up video display for a text widget.
   * @param {Object} widget - The text widget.
   * @param {string} filename - The video filename to display.
   * @param {boolean} isSupported - Whether the video format is browser-supported.
   */
  function setupVideoDisplay(widget, filename, isSupported = true) {
    // Set the textarea value to show filename
    widget.value = `Displaying video: ${filename}`;
    
    if (widget.inputEl && widget.inputEl.parentElement) {
      // Remove any existing overlays
      const existingOverlay = widget.inputEl.parentElement.querySelector('.markdown-overlay, .image-overlay, .video-overlay');
      if (existingOverlay) {
        existingOverlay.remove();
      }
      
      // Create video display overlay
      const videoDiv = document.createElement('div');
      videoDiv.className = 'video-overlay';
      
      if (!isSupported) {
        // Show format not supported message
        const extension = filename.split('.').pop().toUpperCase();
        videoDiv.innerHTML = `
          <div style="color: #ff6b6b; text-align: center; padding: 20px;">
            <h3 style="color: #ff6b6b; margin-bottom: 16px;">Video Format Not Supported</h3>
            <p><strong>${filename}</strong></p>
            <p style="font-size: 14px; margin: 16px 0;">
              ${extension} format is not supported by browsers.
            </p>
            <div style="background: #2d2d2d; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: left;">
              <p style="color: #4fc3f7; margin-bottom: 8px; font-weight: bold;">✅ Supported formats:</p>
              <p style="margin: 4px 0; color: #90ee90;">• MP4 (H.264/H.265) - Best compatibility</p>
              <p style="margin: 4px 0; color: #90ee90;">• WebM (VP8/VP9) - Good for web</p>
              <p style="margin: 4px 0; color: #90ee90;">• OGG (Theora) - Open source</p>
              <p style="margin: 4px 0; color: #90ee90;">• M4V - Apple format</p>
              <br>
              <p style="color: #ff6b6b; margin-bottom: 8px; font-weight: bold;">❌ Unsupported formats:</p>
              <p style="margin: 4px 0; color: #ffb6b6;">• MKV, AVI, MOV, WMV, FLV</p>
            </div>
            <p style="font-size: 12px; opacity: 0.7; margin-top: 16px;">
              Convert your video to MP4 or WebM for browser playback.
            </p>
          </div>
        `;
      } else {
        // Create video element for supported formats
        const video = document.createElement('video');
        video.controls = true;
        video.preload = 'metadata';
        video.src = `/sage_utils/read_notes_file?filename=${encodeURIComponent(filename)}&type=video`;
        
        // Style the video to fit nicely
        video.style.cssText = `
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: auto;
          object-fit: contain;
          display: block;
          margin: auto;
        `;
        
        videoDiv.appendChild(video);
        
        // Handle video load errors
        video.onerror = function() {
          videoDiv.innerHTML = `
            <div style="color: #ff6b6b; text-align: center; padding: 20px;">
              <p>Failed to load video: ${filename}</p>
              <p style="font-size: 12px; opacity: 0.7;">The file may be corrupted or the codec may not be supported</p>
              <p style="font-size: 11px; opacity: 0.5;">Try converting to H.264 MP4 for best compatibility</p>
            </div>
          `;
        };
        
        // Handle successful video load
        video.onloadedmetadata = function() {
          console.log(`Successfully loaded video: ${filename} (${video.videoWidth}x${video.videoHeight})`);
        };
        
        // Handle when video data is loaded
        video.onloadeddata = function() {
          console.log(`Video data loaded for: ${filename}`);
        };
      }
      
      // Style the overlay container (applies to both supported and unsupported)
      videoDiv.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #1e1e1e;
        border: 1px solid #3e3e3e;
        border-radius: 6px;
        padding: 8px;
        box-sizing: border-box;
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: auto;
      `;
      
      // Hide the textarea
      widget.inputEl.style.opacity = '0';
      
      // Make sure the parent has position relative for absolute positioning
      const parent = widget.inputEl.parentElement;
      if (getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
      
      // Insert the overlay
      parent.appendChild(videoDiv);
      
      // Store reference for cleanup
      widget.videoOverlay = videoDiv;
    }
  }

  /**
   * Enhanced markdown renderer with better formatting support.
   * @param {string} text - The markdown text to render.
   * @returns {string} - The rendered HTML.
   */
  function renderMarkdown(text) {
    if (!text) return '';
    
    return text
      // Escape HTML first to prevent injection
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Then apply markdown transformations
      // Code blocks (must be before inline code)
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      // Headers (with improved regex)
      .replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>')
      .replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>')
      .replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>')
      .replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>')
      .replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>')
      .replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>')
      // Bold (must be before italic)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Links (open in new tab)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      // Blockquotes
      .replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
      // Unordered lists (improved)
      .replace(/^[\*\-\+]\s+(.+)$/gm, '<li>$1</li>')
      // Ordered lists
      .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
      // Wrap consecutive list items in ul/ol tags
      .replace(/(<li>.*<\/li>)/gs, function(match) {
        return '<ul>' + match + '</ul>';
      })
      // Horizontal rules
      .replace(/^---+$/gm, '<hr>')
      // Paragraphs (wrap non-tag lines)
      .replace(/^(?!<[hul\/]|<pre|<blockquote)(.+)$/gm, '<p>$1</p>')
      // Line breaks
      .replace(/\n/g, '<br>');
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

/**
 * Sets up the Sage_ModelInfoDisplay node to display markdown-formatted model information.
 * @param {object} nodeType - The node type being registered.
 * @param {object} nodeData - The node data from the python node definition.
 * @param {object} app - The ComfyUI app instance.
 */
function setupModelInfoDisplayNode(nodeType, nodeData, app) {
  /**
   * Helper to find or create the output widget and update its value.
   * @param {Object} node - The node instance.
   * @param {Object} message - The message object containing text.
   */
  function updateOutputWidget(node, message) {
    const isMarkdown = true; // Always treat ModelInfoDisplay content as markdown
    let w = node.widgets?.find((w) => w.name === "output");
    
    // Create widget if it doesn't exist
    if (!w) {
      // Option 1: Use native MARKDOWN widget (currently disabled due to image support issues)
      // if (isMarkdown && ComfyWidgets["MARKDOWN"]) {
      //   try {
      //     w = ComfyWidgets["MARKDOWN"](
      //       node,
      //       "output",
      //       ["STRING", { multiline: true }],
      //       app
      //     ).widget;
      //   } catch (error) {
      //     console.log("MARKDOWN widget not available, falling back to STRING:", error);
      //     w = null;
      //   }
      // }
      
      // Option 2: Always use STRING widget with our custom renderer for full control over markdown display
      // The native MARKDOWN widget doesn't support images, so we use our custom implementation
      if (!w) {
        w = ComfyWidgets["STRING"](
          node,
          "output",
          ["STRING", { multiline: true }],
          app
        ).widget;
        w.inputEl.readOnly = true;
        w.inputEl.style.opacity = 0.6;
        w.inputEl.style.fontSize = "9pt";
      }
    }
    
    // Update content - FIX: Properly handle the message data structure
    let content;
    if (message && message.text) {
      if (Array.isArray(message.text)) {
        content = message.text.join("");
        console.log("updateOutputWidget: Converted array to string, length:", content.length);
      } else if (typeof message.text === "string") {
        content = message.text;
        console.log("updateOutputWidget: Using string directly, length:", content.length);
      } else {
        content = String(message.text);
        console.log("updateOutputWidget: Converted to string, length:", content.length);
      }
    } else {
      content = "";
      console.log("updateOutputWidget: No message text, using empty string");
    }
    
    console.log("Content after processing (final):", content.substring(0, 100) + "...");
    
    // Always use our custom markdown renderer for images and full formatting support
    // But first ensure the widget is properly initialized
    if (!w.inputEl) {
      console.log("Widget not yet initialized, waiting for DOM...");
      // Try again after a short delay to let the widget initialize
      setTimeout(() => {
        setupMarkdownDisplay(w, content);
      }, 50);
      return;
    }
    
    setupMarkdownDisplay(w, content);
  }

  /**
   * Sets up proper HTML markdown display for a text widget.
   * @param {Object} widget - The text widget.
   * @param {string} content - The markdown content to render.
   */
  function setupMarkdownDisplay(widget, content) {
    // Set the textarea value for fallback
    widget.value = content;
    
    console.log("Setting up markdown display, content length:", content.length);
    
    // Ensure widget is properly initialized
    if (!widget.inputEl) {
      console.warn("Widget inputEl not available, retrying in 100ms...");
      setTimeout(() => {
        if (widget.inputEl) {
          setupMarkdownDisplay(widget, content);
        } else {
          console.error("Widget still not initialized after delay, falling back to text display");
        }
      }, 100);
      return;
    }
    
    if (!widget.inputEl.parentElement) {
      console.warn("Widget parentElement not available, retrying in 100ms...");
      setTimeout(() => {
        if (widget.inputEl && widget.inputEl.parentElement) {
          setupMarkdownDisplay(widget, content);
        } else {
          console.error("Widget parent still not available after delay, falling back to text display");
        }
      }, 100);
      return;
    }
    
    console.log("Widget is properly initialized, proceeding with markdown setup");
    
    // Remove any existing markdown overlay
    if (widget.markdownOverlay) {
      widget.markdownOverlay.remove();
      widget.markdownOverlay = null;
    }
    
    // Create markdown display overlay
    const markdownDiv = document.createElement('div');
    markdownDiv.className = 'markdown-overlay';
    const renderedHTML = renderMarkdown(content);
    console.log("Rendered HTML length:", renderedHTML.length);
    markdownDiv.innerHTML = renderedHTML;
    
    console.log("Created markdown div with HTML:", markdownDiv.innerHTML.substring(0, 200) + "...");
    
    // Style the overlay to match the textarea exactly
    markdownDiv.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 8px 12px;
      border: 1px solid #3e3e3e;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      overflow-y: auto;
      overflow-x: hidden;
      word-wrap: break-word;
      box-sizing: border-box;
      z-index: 1;
      pointer-events: auto;
    `;
    
    // Hide the textarea
    widget.inputEl.style.opacity = '0';
    console.log("Hiding textarea, opacity set to 0");
    
    // Make sure the parent has position relative for absolute positioning
    const parent = widget.inputEl.parentElement;
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }
    
    // Insert the overlay
    parent.appendChild(markdownDiv);
    console.log("Appended markdown overlay to parent, parent children count:", parent.children.length);
    
    // Store reference for cleanup
    widget.markdownOverlay = markdownDiv;
    
    // Add styles for markdown elements
    if (!document.querySelector('#sage-markdown-styles')) {
      const style = document.createElement('style');
      style.id = 'sage-markdown-styles';
      style.textContent = `
        .markdown-overlay h1, .markdown-overlay h2, .markdown-overlay h3,
        .markdown-overlay h4, .markdown-overlay h5, .markdown-overlay h6 {
          color: #569cd6;
          margin: 12px 0 6px 0;
          font-weight: 600;
        }
        .markdown-overlay h1 { font-size: 1.5em; border-bottom: 1px solid #3e3e3e; padding-bottom: 4px; }
        .markdown-overlay h2 { font-size: 1.3em; border-bottom: 1px solid #3e3e3e; padding-bottom: 2px; }
        .markdown-overlay h3 { font-size: 1.1em; }
        .markdown-overlay h4 { font-size: 1em; }
        .markdown-overlay p { margin: 8px 0; }
        .markdown-overlay pre {
          background: #2d2d2d;
          border: 1px solid #404040;
          border-radius: 4px;
          padding: 8px;
          margin: 8px 0;
          overflow-x: auto;
        }
        .markdown-overlay code {
          background: #2d2d2d;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        }
        .markdown-overlay pre code {
          background: transparent;
          padding: 0;
        }
        .markdown-overlay a {
          color: #4fc3f7;
          text-decoration: none;
        }
        .markdown-overlay a:hover {
          text-decoration: underline;
        }
        .markdown-overlay ul, .markdown-overlay ol {
          margin: 8px 0;
          padding-left: 20px;
        }
        .markdown-overlay li {
          margin: 4px 0;
        }
        .markdown-overlay blockquote {
          border-left: 4px solid #569cd6;
          margin: 8px 0;
          padding-left: 12px;
          font-style: italic;
          color: #b0b0b0;
        }
        .markdown-overlay strong {
          font-weight: 600;
          color: #f0f0f0;
        }
        .markdown-overlay em {
          font-style: italic;
          color: #e0e0e0;
        }
      `;
      document.head.appendChild(style);
      console.log("Added markdown styles to document head");
    } else {
      console.log("Markdown styles already exist in document");
    }
    
    // Add a small delay to ensure the overlay is properly rendered
    setTimeout(() => {
      console.log("Final check - overlay visibility:", getComputedStyle(markdownDiv).visibility);
      console.log("Final check - overlay display:", getComputedStyle(markdownDiv).display);
      console.log("Final check - overlay z-index:", getComputedStyle(markdownDiv).zIndex);
    }, 100);
  }

  /**
   * Enhanced markdown renderer with better formatting support.
   * @param {string} text - The markdown text to render.
   * @returns {string} - The rendered HTML.
   */
  function renderMarkdown(text) {
    if (!text) return '';
    
    console.log("renderMarkdown: Processing text length:", text.length);
    
    let result = text;
    
    // Escape HTML first to prevent injection, but preserve newlines
    result = result
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Then apply markdown transformations in correct order
    // Code blocks first (must be before inline code and other formatting)
    result = result.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Headers (process from h6 to h1 to avoid conflicts)
    result = result.replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>');
    result = result.replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>');
    result = result.replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>');
    result = result.replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>');
    result = result.replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>');
    result = result.replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>');
    
    // Bold text (must be before italic)
    result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Italic text
    result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    result = result.replace(/_([^_]+)_/g, '<em>$1</em>');
    
    // Inline code (after bold/italic to avoid conflicts)
    result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Images (must be before links to avoid conflicts)
    result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, 
      '<img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0; display: block;" onerror="this.style.display=\'none\';">');
    
    // Links (after images)
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, 
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Blockquotes
    result = result.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
    
    // Lists - handle them more carefully to avoid extra breaks
    result = result.replace(/^[\*\-\+]\s+(.+)$/gm, '<li>$1</li>');
    result = result.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
    
    // Wrap consecutive list items in ul tags
    result = result.replace(/(<li>.*?<\/li>(?:\s*<li>.*?<\/li>)*)/gs, '<ul>$1</ul>');
    
    // Horizontal rules
    result = result.replace(/^---+$/gm, '<hr>');
    
    // Split into lines for better processing
    const lines = result.split('\n');
    const processedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) {
        continue;
      }
      
      // Check if this line is already a block element
      const isBlockElement = line.match(/^<(h[1-6]|ul|li|ol|p|div|blockquote|pre|hr)/);
      const isClosingTag = line.match(/^<\/(h[1-6]|ul|li|ol|p|div|blockquote|pre)>/);
      
      if (isBlockElement || isClosingTag) {
        // It's already a block element, add it as-is
        processedLines.push(line);
      } else {
        // It's regular text, wrap it in a paragraph
        if (line.length > 0) {
          processedLines.push(`<p>${line}</p>`);
        }
      }
    }
    
    result = processedLines.join('');
      
    console.log("renderMarkdown: Generated HTML length:", result.length);
    console.log("renderMarkdown: First 200 chars of HTML:", result.substring(0, 200));
    return result;
  }

  const onExecuted = nodeType.prototype.onExecuted;
  nodeType.prototype.onExecuted = function (message) {
    // Log output for debugging - show both raw message and processed content
    console.log("ModelInfoDisplay message:", message);
    
    // Also log the processed content to verify the fix works
    if (message && message.text) {
      let processedContent;
      if (Array.isArray(message.text)) {
        processedContent = message.text.join("");
        console.log("Processed array to string, length:", processedContent.length);
      } else {
        processedContent = String(message.text);
        console.log("Used string directly, length:", processedContent.length);
      }
      console.log("Final processed content preview:", processedContent.substring(0, 100) + "...");
    }
    
    if (onExecuted) onExecuted.apply(this, arguments);
    
    // Handle UI output for display nodes - look for the text data in message.text
    if (message && message.text) {
      updateOutputWidget(this, message);
    }
    
    this.onResize?.(this.size);
  };
}

app.registerExtension({
  name: "arcum42.sage.utils",
  async setup() {
    console.log("Sage Utils loaded.");
  },
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    if (!nodeData.name.startsWith(_ID)) return;
    if (nodeData.name === _ID + "MultiModelPicker") {
      setupMultiModelPickerNode(nodeType, nodeData, app);
      return;
    }
    if (nodeData.name === _ID + "TextSubstitution") {
      setupTextSubstitutionNode(nodeType, nodeData, app);
      return;
    }
    if (nodeData.name === _ID + "ViewAnything") {
      setupViewTextOrAnythingNode(nodeType, nodeData, app);
      return;
    }
    if (nodeData.name === _ID + "ViewNotes") {
      setupViewNotesNode(nodeType, nodeData, app);
      return;
    }
    if (nodeData.name === _ID + "ModelInfoDisplay") {
      setupModelInfoDisplayNode(nodeType, nodeData, app);
      return;
    }
    if (nodeData.name === _ID + "LoraStackInfoDisplay") {
      setupModelInfoDisplayNode(nodeType, nodeData, app); // Reuse the same setup function
      return;
    }
  },
});

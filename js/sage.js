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
    }
    // Note: We don't handle disconnect here anymore, let the cleanup logic handle it

    // Track each slot name so we can index the uniques, but preserve static inputs
    // First pass: remove disconnected dynamic inputs (iterate backwards to avoid index issues)
    for (let i = this.inputs.length - 1; i >= 0; i--) {
      const slot = this.inputs[i];
      // Skip static inputs (anything that's not "str" or "str_X")
      if (slot.name !== prefix && !slot.name.startsWith(prefix + "_")) {
        continue;
      }
      
      // Remove dynamic str_ inputs that have no connection
      // But keep the base "str" input (it should be the empty one for new connections)
      if (slot.link === null && slot.name.startsWith(prefix + "_")) {
        this.removeInput(i);
      }
    }
    
    // Second pass: renumber remaining dynamic inputs (connected ones and the base "str")
    const slot_tracker = {};
    for (const slot of this.inputs) {
      // Skip static inputs (anything that's not "str" or "str_X")
      if (slot.name !== prefix && !slot.name.startsWith(prefix + "_")) {
        continue;
      }
      
      // Only rename connected dynamic str_ inputs (not the base "str" input)
      if (slot.link !== null && slot.name.startsWith(prefix + "_")) {
        const name = slot.name.split("_")[0];
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
    return me;
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
    // Log output for debugging
    console.log(message["text"]);
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
    let w = node.widgets?.find((w) => w.name === "output");
    
    // Create widget if it doesn't exist
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
    
    // Update content
    const content = Array.isArray(message["text"]) 
      ? message["text"].join("") 
      : (typeof message["text"] === "string" ? message["text"] : String(message["text"] ?? ""));
    
    if (isMarkdown) {
      // For markdown files, create a div overlay with rendered content
      setupMarkdownDisplay(w, content);
    } else {
      // For regular text files, just set the value
      w.value = content;
      // Remove any markdown overlay if it exists
      if (w.markdownOverlay) {
        w.markdownOverlay.remove();
        w.markdownOverlay = null;
      }
    }
  }

  /**
   * Sets up markdown display overlay for a text widget.
   * @param {Object} widget - The text widget.
   * @param {string} content - The markdown content to render.
   */
  function setupMarkdownDisplay(widget, content) {
    // Hide the original textarea
    widget.inputEl.style.display = 'none';
    
    // Create or update markdown overlay
    if (!widget.markdownOverlay) {
      widget.markdownOverlay = document.createElement('div');
      widget.markdownOverlay.className = 'markdown-content';
      widget.markdownOverlay.style.cssText = `
        background: #1e1e1e;
        color: #d4d4d4;
        padding: 12px;
        border: 1px solid #3e3e3e;
        border-radius: 6px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-height: 400px;
        overflow-y: auto;
        font-size: 13px;
        line-height: 1.5;
        box-sizing: border-box;
        width: 100%;
        min-height: 100px;
      `;
      
      // Insert after the hidden textarea
      widget.inputEl.parentNode.insertBefore(widget.markdownOverlay, widget.inputEl.nextSibling);
      
      // Add styles if not already added
      if (!document.querySelector('#markdown-styles')) {
        const style = document.createElement('style');
        style.id = 'markdown-styles';
        style.textContent = `
          .markdown-content h1, .markdown-content h2, .markdown-content h3,
          .markdown-content h4, .markdown-content h5, .markdown-content h6 {
            color: #569cd6;
            margin-top: 16px;
            margin-bottom: 8px;
            font-weight: 600;
          }
          .markdown-content h1 { font-size: 1.5em; border-bottom: 1px solid #3e3e3e; padding-bottom: 4px; }
          .markdown-content h2 { font-size: 1.3em; }
          .markdown-content h3 { font-size: 1.1em; }
          .markdown-content p { margin: 8px 0; }
          .markdown-content ul, .markdown-content ol { margin: 8px 0; padding-left: 20px; }
          .markdown-content li { margin: 2px 0; }
          .markdown-content code {
            background: #2d2d2d;
            color: #ce9178;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
          }
          .markdown-content pre {
            background: #2d2d2d;
            color: #d4d4d4;
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 12px 0;
          }
          .markdown-content pre code {
            background: none;
            padding: 0;
            color: inherit;
          }
          .markdown-content blockquote {
            border-left: 4px solid #569cd6;
            margin: 12px 0;
            padding-left: 12px;
            color: #b4b4b4;
            font-style: italic;
          }
          .markdown-content a {
            color: #569cd6;
            text-decoration: none;
          }
          .markdown-content a:hover {
            text-decoration: underline;
          }
          .markdown-content table {
            border-collapse: collapse;
            margin: 12px 0;
            width: 100%;
          }
          .markdown-content th, .markdown-content td {
            border: 1px solid #3e3e3e;
            padding: 6px 12px;
            text-align: left;
          }
          .markdown-content th {
            background: #2d2d2d;
            font-weight: 600;
          }
        `;
        document.head.appendChild(style);
      }
    }
    
    // Update the overlay content
    widget.markdownOverlay.innerHTML = renderMarkdown(content);
    // Keep the original value for the hidden textarea
    widget.value = content;
  }

  /**
   * Simple markdown renderer (basic implementation).
   * For production, consider using a library like 'marked' or 'markdown-it'.
   * @param {string} text - The markdown text to render.
   * @returns {string} - The rendered HTML.
   */
  function renderMarkdown(text) {
    if (!text) return '';
    
    return text
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      // Code blocks
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Line breaks
      .replace(/\n/g, '<br>');
  }

  const onExecuted = nodeType.prototype.onExecuted;
  nodeType.prototype.onExecuted = function (message) {
    // Log output for debugging
    console.log(message["text"]);
    if (onExecuted) onExecuted.apply(this, arguments);
    updateOutputWidget(this, message, this.widgets.find(w => w.name === 'filename')?.value);
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
  },
});

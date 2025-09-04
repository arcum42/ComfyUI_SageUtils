// Setup function for Sage_ModelInfoDisplay and Sage_LoraStackInfoDisplay nodes
// Displays formatted model/LoRA information as markdown with image support

import { createTextOutputWidget, setupMarkdownDisplay } from "../components/display.js";

/**
 * Sets up the Sage_ModelInfoDisplay node to display markdown-formatted model information.
 * Also used for Sage_LoraStackInfoDisplay node for displaying LoRA stack information.
 * @param {object} nodeType - The node type being registered.
 * @param {object} nodeData - The node data from the python node definition.
 * @param {object} app - The ComfyUI app instance.
 */
export function setupModelInfoDisplayNode(nodeType, nodeData, app) {
  /**
   * Helper to find or create the output widget and update its value.
   * @param {Object} node - The node instance.
   * @param {Object} message - The message object containing text.
   */
  function updateOutputWidget(node, message) {
    let w = createTextOutputWidget(node, app);
    
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

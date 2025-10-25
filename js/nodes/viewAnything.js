// Setup function for Sage_ViewAnything node
// Displays text or any output in a read-only widget

import { createTextOutputWidget, updateTextWidget } from "../components/display.js";
import { addCopyButton } from "../utils/addCopyButton.js";
import { app } from "../../../scripts/app.js";

/**
 * Sets up a node to view text or any output, updating a read-only widget.
 * @param {Object} nodeType - The node type prototype.
 * @param {Object} nodeData - The node data.
 * @param {Object} app - The app instance.
 */
export function setupViewTextOrAnythingNode(nodeType, nodeData, app) {
  const onNodeCreated = nodeType.prototype.onNodeCreated;
  nodeType.prototype.onNodeCreated = function () {
    if (onNodeCreated) onNodeCreated.apply(this, []);
    // No additional setup needed on creation
  };

  const onExecuted = nodeType.prototype.onExecuted;
  nodeType.prototype.onExecuted = function (message) {
    // Log output for debugging - show processed text instead of raw array
    /* if (message && message["text"]) {
      const processedText = Array.isArray(message["text"]) 
        ? message["text"].join("") 
        : String(message["text"]);
      console.log("ViewAnything processed text:", processedText.substring(0, 100) + "...");
    } */
    if (onExecuted) onExecuted.apply(this, arguments);
    
    // Create or get the output widget and update it
    const widget = createTextOutputWidget(this, app);
    updateTextWidget(widget, message);
    
    // Add copy-to-node button
/*     addCopyButton(this, () => {
      const content = Array.isArray(message["text"]) 
        ? message["text"].join("") 
        : String(message["text"]);
      return content;
    }, app); */
    
    this.onResize?.(this.size);
  };
}

import { copyTextToSelectedNode } from "./textCopyUtils.js";

/**
 * Adds a "Copy to Selected Node" button to a node
 * @param {Object} node - The ComfyUI node
 * @param {Function} getTextFn - Function that returns the text to copy
 * @param {Object} app - The ComfyUI app instance
 */
export function addCopyButton(node, getTextFn, app) {
    if (node.copyToNodeButton) return; // Already added
    
    node.copyToNodeButton = node.addWidget(
        "button",
        "📋 Copy to Selected Node",
        null,
        () => {
            const text = getTextFn();
            if (!text) {
                app.ui.dialog.show("No text to copy");
                return;
            }
            
            const success = copyTextToSelectedNode(app, text);
            if (success) {
                app.ui.dialog.show("✓ Text copied!");
            } else {
                app.ui.dialog.show("Please select a CLIPTextEncode or Sage text node");
            }
        }
    );
}
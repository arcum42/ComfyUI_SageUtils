/**
 * Utility functions for copying text FROM ComfyUI nodes
 */

import { findWidget, isValidTextTarget } from './textCopyUtils.js';

/**
 * Gets text from a node's text widget
 * @param {Object} node - The ComfyUI node
 * @returns {string|null} The text content if found, null otherwise
 */
function getTextFromNode(node) {
    if (!isValidTextTarget(node)) {
        console.warn("Node is not a valid text source:", node.type);
        return null;
    }
    
    let sourceWidget = null;
    
    // For CLIPTextEncode, use "text" widget
    if (node.type === "CLIPTextEncode") {
        sourceWidget = findWidget(node, "text");
    } else {
        // For Sage text nodes, try "str" first, then "text"
        sourceWidget = findWidget(node, "str") || findWidget(node, "text");
    }
    
    if (!sourceWidget) {
        console.warn("No suitable text widget found in node:", node.type);
        return null;
    }
    
    return sourceWidget.value || "";
}

/**
 * Gets the currently selected node in the graph
 * @param {Object} app - The ComfyUI app instance
 * @returns {Object|null} The selected node, or null if none selected
 */
function getSelectedNode(app) {
    if (!app.canvas || !app.canvas.selected_nodes) return null;
    
    const selectedNodes = Object.keys(app.canvas.selected_nodes);
    if (selectedNodes.length !== 1) return null;
    
    const nodeId = parseInt(selectedNodes[0]);
    return app.graph.getNodeById(nodeId);
}

/**
 * Copies text from the currently selected node
 * @param {Object} app - The ComfyUI app instance
 * @returns {Object} Result object with success status and text/error
 */
function copyTextFromSelectedNode(app) {
    const selectedNode = getSelectedNode(app);
    
    if (!selectedNode) {
        return {
            success: false,
            error: "No node selected"
        };
    }
    
    if (!isValidTextTarget(selectedNode)) {
        return {
            success: false,
            error: "Selected node is not a valid text source"
        };
    }
    
    const text = getTextFromNode(selectedNode);
    
    if (text === null) {
        return {
            success: false,
            error: "Could not extract text from selected node"
        };
    }
    
    return {
        success: true,
        text: text,
        nodeType: selectedNode.type
    };
}

/**
 * Creates a button to copy text from selected node
 * @param {string} label - Button label (default: "Copy from Selected Node")
 * @param {Function} onSuccess - Callback when text is successfully copied (receives text)
 * @param {Function} onError - Callback when copy fails (receives error message)
 * @returns {HTMLButtonElement} The button element
 */
function createCopyFromNodeButton(label = "📥 From Node", onSuccess, onError) {
    const button = document.createElement('button');
    button.textContent = label;
    button.className = 'copy-from-node-button';
    button.title = 'Copy text from selected node';
    
    return button;
}

/**
 * Adds event listener to a button for copying from selected node
 * @param {HTMLButtonElement} button - The button element
 * @param {Object} app - The ComfyUI app instance
 * @param {Function} onSuccess - Callback when text is successfully copied (receives text)
 * @param {Function} onError - Optional callback when copy fails (receives error message)
 */
function setupCopyFromNodeButton(button, app, onSuccess, onError) {
    button.addEventListener('click', () => {
        const result = copyTextFromSelectedNode(app);
        
        if (result.success) {
            if (onSuccess) {
                onSuccess(result.text, result.nodeType);
            }
        } else {
            if (onError) {
                onError(result.error);
            } else {
                console.warn(result.error);
            }
        }
    });
}

// Export functions
export {
    getTextFromNode,
    getSelectedNode,
    copyTextFromSelectedNode,
    createCopyFromNodeButton,
    setupCopyFromNodeButton
};

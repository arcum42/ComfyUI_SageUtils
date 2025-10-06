/**
 * Utility functions for copying text to ComfyUI nodes
 */

/**
 * Finds a widget by name in a node
 * @param {Object} node - The ComfyUI node
 * @param {string} widgetName - Name of the widget to find
 * @returns {Object|null} The widget if found, null otherwise
 */
function findWidget(node, widgetName) {
    if (!node.widgets) return null;
    return node.widgets.find(w => w.name === widgetName) || null;
}

/**
 * Checks if a node is a valid target for text copying
 * @param {Object} node - The ComfyUI node to check
 * @returns {boolean} True if the node can accept text
 */
function isValidTextTarget(node) {
    if (!node || !node.widgets) return false;
    
    // Check for CLIPTextEncode nodes
    if (node.type === "CLIPTextEncode") {
        return findWidget(node, "text") !== null;
    }
    
    // Check for Sage Utils text nodes
    const sageTextNodePrefixes = [
        "Sage_SetText",
        "Sage_SetTextWithInt",
        "SageSetWildcardText",
        "Sage_TextSwitch",
        "Sage_JoinText",
        "Sage_TripleJoinText",
        "Sage_CleanText",
        "Sage_TextRandomLine",
        "Sage_TextSelectLine",
        "Sage_TextSubstitution",
        "Sage_HiDreamE1_Instruction",
        "Sage_TextWeight"
    ];
    
    const isSageTextNode = sageTextNodePrefixes.some(prefix => 
        node.type?.startsWith(prefix)
    );
    
    if (isSageTextNode) {
        // Try to find either "str" or "text" widget
        return findWidget(node, "str") !== null || 
               findWidget(node, "text") !== null;
    }
    
    return false;
}

/**
 * Copies text to a target node's text widget
 * @param {Object} node - The target ComfyUI node
 * @param {string} text - The text to copy
 * @returns {boolean} True if successful, false otherwise
 */
function copyTextToNode(node, text) {
    if (!isValidTextTarget(node)) {
        console.warn("Node is not a valid text target:", node.type);
        return false;
    }
    
    let targetWidget = null;
    
    // For CLIPTextEncode, use "text" widget
    if (node.type === "CLIPTextEncode") {
        targetWidget = findWidget(node, "text");
    } else {
        // For Sage text nodes, try "str" first, then "text"
        targetWidget = findWidget(node, "str") || findWidget(node, "text");
    }
    
    if (!targetWidget) {
        console.warn("No suitable text widget found in node:", node.type);
        return false;
    }
    
    // Set the value
    targetWidget.value = text;
    
    // Trigger any callbacks
    if (targetWidget.callback) {
        targetWidget.callback(text);
    }
    
    // Mark the graph as dirty to ensure it updates
    if (node.graph && node.graph.setDirtyCanvas) {
        node.graph.setDirtyCanvas(true, true);
    }
    
    return true;
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
 * Copies text to the currently selected node
 * @param {Object} app - The ComfyUI app instance
 * @param {string} text - The text to copy
 * @returns {boolean} True if successful, false otherwise
 */
function copyTextToSelectedNode(app, text) {
    const selectedNode = getSelectedNode(app);
    
    if (!selectedNode) {
        console.warn("No node selected");
        return false;
    }
    
    return copyTextToNode(selectedNode, text);
}

/**
 * Creates a context menu action for copying text to a node
 * @param {string} text - The text to copy
 * @param {string} label - Label for the menu item (default: "Copy to selected node")
 * @returns {Object} Context menu item configuration
 */
function createCopyTextMenuItem(text, label = "Copy to selected node") {
    return {
        content: label,
        callback: (app) => {
            const success = copyTextToSelectedNode(app, text);
            if (success) {
                console.log("Text copied to selected node");
            } else {
                alert("Please select a valid text node (CLIPTextEncode or Sage text node)");
            }
        }
    };
}

// Export functions
export {
    findWidget,
    isValidTextTarget,
    copyTextToNode,
    getSelectedNode,
    copyTextToSelectedNode,
    createCopyTextMenuItem
};
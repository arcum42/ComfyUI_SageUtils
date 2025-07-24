// Setup function for Sage_MultiModelPicker node
// Handles dynamic model input slots with proper naming and index widget updates

import { createDynamicInputSetup } from "../shared/utils.js";

/**
 * Sets up the MultiModelPicker node with dynamic input slots and proper naming.
 * @param {Object} nodeType - The node type prototype.
 * @param {Object} nodeData - The node data.
 * @param {Object} app - The app instance.
 */
export function setupMultiModelPickerNode(nodeType, nodeData, app) {
  const setupFunction = createDynamicInputSetup("model_info", "MODEL_INFO");
  setupFunction(nodeType, nodeData, app);
}

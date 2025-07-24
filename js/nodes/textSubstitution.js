// Setup function for Sage_TextSubstitution node
// Handles dynamic string input slots while preserving static inputs

import { TypeSlot, TypeSlotEvent } from "../shared/utils.js";

/**
 * Sets up the TextSubstitution node with dynamic string input slots.
 * @param {Object} nodeType - The node type prototype.
 * @param {Object} nodeData - The node data.
 * @param {Object} app - The app instance.
 */
export function setupTextSubstitutionNode(nodeType, nodeData, app) {
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

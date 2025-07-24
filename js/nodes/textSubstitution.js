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
    // Call the original onNodeCreated first to ensure static inputs are properly set
    if (onNodeCreated) {
      await onNodeCreated.apply(this);
    }
    
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
    
    // Only add the dynamic input slot if it doesn't already exist
    const hasBaseDynamicSlot = this.inputs.some(slot => slot && slot.name === prefix);
    if (!hasBaseDynamicSlot) {
      this.addInput(prefix, type);
      // Set appearance for the new slot
      const slot = this.inputs[this.inputs.length - 1];
      if (slot) slot.color_off = "#666";
    }
    
    return;
  };

  const onConnectionsChange = nodeType.prototype.onConnectionsChange;
  nodeType.prototype.onConnectionsChange = function (slotType, slot_idx, event, link_info, node_slot) {
    // Call the original onConnectionsChange first, but carefully
    if (onConnectionsChange) {
      onConnectionsChange.apply(this, arguments);
    }
    
    if (slotType !== TypeSlot.Input) return;

    // Get static input names to preserve them
    const staticInputs = ["prefix", "suffix", "text", "delimiter"];

    if (link_info && event === TypeSlotEvent.Connect) {
      // Get the parent (left side node) from the link
      const fromNode = this.graph._nodes.find(
        (otherNode) => otherNode.id == link_info.origin_id
      );
      if (fromNode) {
        const parent_link = fromNode.outputs[link_info.origin_slot];
        if (parent_link && node_slot) {
          node_slot.type = parent_link.type;
          
          // ONLY rename dynamic "str" inputs, NOT static inputs
          if (!staticInputs.includes(node_slot.name) && node_slot.name === prefix) {
            // Find the next available number for str_X
            let count = 1;
            const existingNumbers = new Set();
            for (const slot of this.inputs) {
              if (slot && slot.name && slot.name.startsWith(prefix + "_")) {
                const num = parseInt(slot.name.split("_")[1]);
                if (!isNaN(num)) {
                  existingNumbers.add(num);
                }
              }
            }
            // Find the first available number
            while (existingNumbers.has(count)) {
              count++;
            }
            node_slot.name = `${prefix}_${count}`;
          }
        }
      }
    }

    // Clean up and reorganize dynamic inputs
    this.reorganizeDynamicInputs();
    
    return;
  };

  // Add a method to reorganize dynamic inputs properly
  nodeType.prototype.reorganizeDynamicInputs = function() {
    const staticInputs = ["prefix", "suffix", "text", "delimiter"];
    
    // First pass: remove disconnected dynamic inputs (but keep one empty slot at the end)
    const connectedDynamicInputs = [];
    const disconnectedDynamicInputs = [];
    
    for (let i = this.inputs.length - 1; i >= 0; i--) {
      const slot = this.inputs[i];
      if (!slot || !slot.name) {
        continue;
      }
      
      // Skip static inputs
      if (staticInputs.includes(slot.name)) {
        continue;
      }
      
      // Handle dynamic inputs (str, str_1, str_2, etc.)
      if (slot.name === prefix || slot.name.startsWith(prefix + "_")) {
        if (slot.link !== null) {
          connectedDynamicInputs.push(slot);
        } else {
          disconnectedDynamicInputs.push({slot, index: i});
        }
      }
    }
    
    // Remove all but one disconnected dynamic input
    for (let i = 1; i < disconnectedDynamicInputs.length; i++) {
      this.removeInput(disconnectedDynamicInputs[i].index);
    }
    
    // Renumber connected dynamic inputs sequentially
    connectedDynamicInputs.sort((a, b) => {
      const aNum = a.name === prefix ? 0 : parseInt(a.name.split("_")[1]) || 0;
      const bNum = b.name === prefix ? 0 : parseInt(b.name.split("_")[1]) || 0;
      return aNum - bNum;
    });
    
    for (let i = 0; i < connectedDynamicInputs.length; i++) {
      connectedDynamicInputs[i].name = `${prefix}_${i + 1}`;
    }

    // Ensure there's exactly one empty dynamic slot at the end
    const hasEmptyDynamicSlot = this.inputs.some(slot => 
      slot && slot.name === prefix && slot.link === null
    );
    
    if (!hasEmptyDynamicSlot) {
      this.addInput(prefix, type);
      const slot = this.inputs[this.inputs.length - 1];
      if (slot) slot.color_off = "#666";
    }

    // Force the node to resize itself for the new/deleted connections
    this?.graph?.setDirtyCanvas(true);
  };

  // Clean up timer when node is removed
  const onRemoved = nodeType.prototype.onRemoved;
  nodeType.prototype.onRemoved = function() {
    if (onRemoved) onRemoved.apply(this, arguments);
  };
}

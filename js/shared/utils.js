// Shared constants and utilities for Sage Utils nodes
// This file contains common constants, types, and utility functions used across multiple nodes

export const TypeSlot = Object.freeze({
  Input: 1,
  Output: 2,
});

export const TypeSlotEvent = Object.freeze({
  Connect: true,
  Disconnect: false,
});

export const _ID = "Sage_";

/**
 * Creates a generic setup function for nodes with dynamic input slots.
 * @param {string} prefix - The prefix for the input slot names.
 * @param {string} type - The type for the input slots.
 * @returns {Function} - The setup function for the node type.
 */
export function createDynamicInputSetup(prefix, type) {
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

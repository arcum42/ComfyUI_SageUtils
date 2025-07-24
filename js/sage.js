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
    if (nodeData.name === _ID + "ViewAnything" || nodeData.name === _ID + "ViewNotes") {
      setupViewTextOrAnythingNode(nodeType, nodeData, app);
    }
  },
});

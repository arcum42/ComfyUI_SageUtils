// Main javascript file for this node set.

// https://github.com/chrisgoringe/Comfy-Custom-Node-How-To/ is incredibly useful.

// https://github.com/chrisgoringe/Comfy-Custom-Node-How-To/wiki/ui_1_starting
// https://github.com/chrisgoringe/Comfy-Custom-Node-How-To/wiki/remove_or_add_widget



import { app } from "../../../scripts/app.js";
import { ComfyWidgets } from "../../../scripts/widgets.js";
import { api } from "../../scripts/api.js";

const TypeSlot = {
  Input: 1,
  Output: 2,
};

const TypeSlotEvent = {
  Connect: true,
  Disconnect: false,
};

const _ID = "Sage_";
const _PREFIX = "model_info";
const _TYPE = "MODEL_INFO";

function setupMultiModelPickerNode(nodeType, nodeData, app) {
  const onNodeCreated = nodeType.prototype.onNodeCreated;
  nodeType.prototype.onNodeCreated = async function () {
    const me = onNodeCreated?.apply(this);
    // start with a new dynamic input
    this.addInput(_PREFIX, _TYPE);
    // Ensure the new slot has proper appearance
    const slot = this.inputs[this.inputs.length - 1];
    if (slot) {
      slot.color_off = "#666";
    }
    return me;
  };

  const onConnectionsChange = nodeType.prototype.onConnectionsChange;
  nodeType.prototype.onConnectionsChange = function (slotType, slot_idx, event, link_info, node_slot) {
    const me = onConnectionsChange?.apply(this, arguments);

    if (slotType === TypeSlot.Input) {
      if (link_info && event === TypeSlotEvent.Connect) {
        // get the parent (left side node) from the link
        const fromNode = this.graph._nodes.find(
          (otherNode) => otherNode.id == link_info.origin_id
        );

        if (fromNode) {
          // make sure there is a parent for the link
          const parent_link = fromNode.outputs[link_info.origin_slot];
          if (parent_link) {
            node_slot.type = parent_link.type;
            // Set the slot name with the correct count suffix immediately
            // Count how many slots already have the _PREFIX as their base name
            const baseName = _PREFIX;
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
      let slot_tracker = {};
      for (const slot of this.inputs) {
        if (slot.link === null) {
          this.removeInput(idx);
          continue;
        }
        idx += 1;
        const name = slot.name.split("_")[0];

        // Correctly increment the count in slot_tracker
        let count = (slot_tracker[name] || 0) + 1;
        slot_tracker[name] = count;

        // Always update the slot name with the count, even for the first
        slot.name = `${name}_${count}`;
      }

      // check that the last slot is a dynamic entry....
      let last = this.inputs[this.inputs.length - 1];
      if (last === undefined || last.name != _PREFIX || last.type != _TYPE) {
        this.addInput(_PREFIX, _TYPE);
        // Set the unconnected slot to appear gray
        last = this.inputs[this.inputs.length - 1];
        if (last) {
          last.color_off = "#666";
        }
      }

      var w = this.widgets?.find((w) => w.name === "index");
      if (w !== undefined) {
        // Update the index widget to reflect the number of inputs
        w.options.max = this.inputs.length - 1; // -1 because the last one is dynamic
        if ((w.value > w.options.max) || (w.value < 1)) {
          w.value = w.options.max;
        }
        w.onResize?.(w.size);
      }

      // force the node to resize itself for the new/deleted connections
      this?.graph?.setDirtyCanvas(true);
      return me;
    }
  };
}

function setupViewTextOrAnythingNode(nodeType, nodeData, app) {
  const onNodeCreated = nodeType.prototype.onNodeCreated;
  nodeType.prototype.onNodeCreated = function () {
    if (onNodeCreated) onNodeCreated.apply(this, []);
    // Not really doing anything on creation, but passing on the message.
  };

  // Helper to find or create the output widget and update its value
  function updateOutputWidget(node, message) {
    let w = node.widgets?.find((w) => w.name === "output");
    if (w === undefined) {
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
    //console.log("ViewText node executed!");
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
    if (!nodeData.name.startsWith(_ID)) {
      return;
    }

    if (nodeData.name === _ID + "MultiModelPicker") {
      setupMultiModelPickerNode(nodeType, nodeData, app);
      return;
    }
    if (nodeData.name == _ID + "ViewText" || nodeData.name == _ID + "ViewAnything") {
      setupViewTextOrAnythingNode(nodeType, nodeData, app);
    }
  },
});

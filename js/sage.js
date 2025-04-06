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
                node_slot.name = `${_PREFIX}_`;
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

            // Update the slot name with the count if greater than 1
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
      return;
    }
    if (nodeData.name == _ID + "ViewText" || nodeData.name == _ID + "ViewAnything") {
      const onNodeCreated = nodeType.prototype.onNodeCreated;
      nodeType.prototype.onNodeCreated = function () {
        onNodeCreated ? onNodeCreated.apply(this, []) : undefined;
        // Not really doing anything on creation, but passing on the message.
        //console.log("ViewText node created!");
      };

      const onExecuted = nodeType.prototype.onExecuted;
      nodeType.prototype.onExecuted = function (message) {
        //console.log("ViewText node executed!");
        console.log(message["text"]);
        onExecuted?.apply(this, arguments);

        // Find the output.
        var w = this.widgets?.find((w) => w.name === "output");

        // If there is no output, create it.
        if (w === undefined) {
          w = ComfyWidgets["STRING"](
            this,
            "output",
            ["STRING", { multiline: true }],
            app
          ).widget;
          w.inputEl.readOnly = true;
          w.inputEl.style.opacity = 0.6;
          w.inputEl.style.fontSize = "9pt";
        }

        // Put the message that was passed to the node in the value of output, so it is printed on the node.
        w.value = message["text"].join("");
        this.onResize?.(this.size);
      };
    }
  },
});

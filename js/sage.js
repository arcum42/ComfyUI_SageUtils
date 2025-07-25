// Main JavaScript file for Sage Utils custom nodes.
// For ComfyUI custom node development, see:
//   https://github.com/chrisgoringe/Comfy-Custom-Node-How-To/
//   https://github.com/chrisgoringe/Comfy-Custom-Node-How-To/wiki/ui_1_starting
//   https://github.com/chrisgoringe/Comfy-Custom-Node-How-To/wiki/remove_or_add_widget

import { app } from "../../../scripts/app.js";
import { _ID } from "./shared/utils.js";

// Import node setup functions
import { setupMultiModelPickerNode } from "./nodes/multiModelPicker.js";
import { setupTextSubstitutionNode } from "./nodes/textSubstitution.js";
import { setupViewTextOrAnythingNode } from "./nodes/viewAnything.js";
import { setupViewNotesNode } from "./nodes/viewNotes.js";
import { setupModelInfoDisplayNode } from "./nodes/modelInfoDisplay.js";

// Import settings UI
import "./settingsUI.js";

// Import cache sidebar
import { createCacheSidebar } from "./sidebar/cacheSidebar.js";

app.registerExtension({
  name: "arcum42.sage.utils",
  async setup() {
    console.log("Sage Utils loaded.");
    
    // Register the cache sidebar tab
    app.extensionManager.registerSidebarTab({
      id: "sageUtilsCache",
      icon: "pi pi-hammer",
      title: "Cache Browser",
      tooltip: "Browse SageUtils cached files and metadata",
      type: "custom",
      render: createCacheSidebar
    });
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
    if (nodeData.name === _ID + "ViewAnything") {
      setupViewTextOrAnythingNode(nodeType, nodeData, app);
      return;
    }
    if (nodeData.name === _ID + "ViewNotes") {
      setupViewNotesNode(nodeType, nodeData, app);
      return;
    }
    if (nodeData.name === _ID + "ModelInfoDisplay") {
      setupModelInfoDisplayNode(nodeType, nodeData, app);
      return;
    }
    if (nodeData.name === _ID + "LoraStackInfoDisplay") {
      setupModelInfoDisplayNode(nodeType, nodeData, app); // Reuse the same setup function
      return;
    }
  },
});

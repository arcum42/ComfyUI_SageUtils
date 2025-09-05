// Main JavaScript file for Sage Utils custom nodes.
// For ComfyUI custom node development, see:
//   https://github.com/chrisgoringe/Comfy-Custom-Node-How-To/
//   https://github.com/chrisgoringe/Comfy-Custom-Node-How-To/wiki/ui_1_starting
//   https://github.com/chrisgoringe/Comfy-Custom-Node-How-To/wiki/remove_or_add_widget

import { app } from "../../../scripts/app.js";
import { _ID } from "./shared/utils.js";

// Import performance timing utilities
import { 
    javascriptTimer, 
    recordInitializationMilestone, 
    completeInitialization,
    printTimingReport,
    timeFunction 
} from "./shared/performanceTimer.js";

// Record initialization start
recordInitializationMilestone("SAGE_JS_START");

// Import node setup functions
import { setupMultiModelPickerNode } from "./nodes/multiModelPicker.js";
import { setupTextSubstitutionNode } from "./nodes/textSubstitution.js";
import { setupViewTextOrAnythingNode } from "./nodes/viewAnything.js";
import { setupViewNotesNode } from "./nodes/viewNotes.js";
import { setupModelInfoDisplayNode } from "./nodes/modelInfoDisplay.js";
recordInitializationMilestone("NODE_SETUP_FUNCTIONS_IMPORTED");

// Import settings UI
import "./settingsUI.js";
recordInitializationMilestone("SETTINGS_UI_IMPORTED");

// Import cache sidebar
import { createCacheSidebar } from "./sidebar/cacheSidebar.js";
recordInitializationMilestone("CACHE_SIDEBAR_IMPORTED");

app.registerExtension({
  name: "arcum42.sage.utils",
  async setup() {
    recordInitializationMilestone("EXTENSION_SETUP_START");
    
    await timeFunction("EXTENSION_SETUP", async () => {
      console.log("Sage Utils loaded.");
      
      // Register the cache sidebar tab
      const sidebarStart = performance.now();
      app.extensionManager.registerSidebarTab({
        id: "sageUtilsCache",
        icon: "pi pi-hammer",
        title: "SageUtils",
        tooltip: "SageUtils tools: Model browser and notes manager",
        type: "custom",
        render: createCacheSidebar
      });
      const sidebarEnd = performance.now();
      console.log(`Sidebar tab registration took: ${(sidebarEnd - sidebarStart).toFixed(2)}ms`);
      
      recordInitializationMilestone("SIDEBAR_TAB_REGISTERED");
    });
    
    // Complete initialization and optionally send timing data to server
    const totalTime = completeInitialization();
    console.log(`SageUtils JavaScript initialization completed in ${totalTime.toFixed(4)}ms`);
    
    // Send timing data to server if enabled
    const shouldSendTiming = localStorage.getItem('sageutils_send_timing') === 'true' || 
                            new URLSearchParams(window.location.search).get('sageutils_timing') === '1';
    
    if (shouldSendTiming) {
      try {
        await javascriptTimer.sendTimingDataToServer();
        console.log("Timing data sent to server");
      } catch (error) {
        console.warn("Failed to send timing data to server:", error);
      }
    }
    
    // Print timing report to console if enabled
    const shouldPrintReport = localStorage.getItem('sageutils_print_timing') === 'true' || 
                             new URLSearchParams(window.location.search).get('sageutils_timing_print') === '1';
    
    if (shouldPrintReport) {
      printTimingReport();
    }
  },
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    if (!nodeData.name.startsWith(_ID)) return;
    
    // Only time the actual setup functions, not every node
    const needsSetup = [
      _ID + "MultiModelPicker",
      _ID + "TextSubstitution", 
      _ID + "ViewAnything",
      _ID + "ViewNotes",
      _ID + "ModelInfoDisplay",
      _ID + "LoraStackInfoDisplay"
    ];
    
    if (needsSetup.includes(nodeData.name)) {
      await timeFunction(`NODE_SETUP_${nodeData.name}`, async () => {
        if (nodeData.name === _ID + "MultiModelPicker") {
          setupMultiModelPickerNode(nodeType, nodeData, app);
        } else if (nodeData.name === _ID + "TextSubstitution") {
          setupTextSubstitutionNode(nodeType, nodeData, app);
        } else if (nodeData.name === _ID + "ViewAnything") {
          setupViewTextOrAnythingNode(nodeType, nodeData, app);
        } else if (nodeData.name === _ID + "ViewNotes") {
          setupViewNotesNode(nodeType, nodeData, app);
        } else if (nodeData.name === _ID + "ModelInfoDisplay") {
          setupModelInfoDisplayNode(nodeType, nodeData, app);
        } else if (nodeData.name === _ID + "LoraStackInfoDisplay") {
          setupModelInfoDisplayNode(nodeType, nodeData, app);
        }
      });
    }
  },
});

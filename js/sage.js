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
  timeFunction,
  shouldSendTimingData,
  shouldPrintTimingReport,
  shouldLogTimingDetails
} from "./shared/performanceTimer.js";

// Record initialization start
recordInitializationMilestone("SAGE_JS_START");

// Import node setup functions
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

// Import global data cache for preloading
import { DataCache } from "./shared/dataCache.js";
recordInitializationMilestone("DATA_CACHE_IMPORTED");

app.registerExtension({
  name: "arcum42.sage.utils",
  async setup() {
    recordInitializationMilestone("EXTENSION_SETUP_START");
    
    await timeFunction("EXTENSION_SETUP", async () => {
      console.log("Sage Utils loaded.");
      
      // Start preloading critical data immediately (non-blocking)
      const preloadStart = performance.now();
      if (shouldLogTimingDetails()) {
        console.log("[SageUtils] Starting background data preload...");
      }
      
      // Enable debug mode for cache if query parameter or localStorage flag is set
      const shouldDebugCache = new URLSearchParams(window.location.search).get('sageutils_cache_debug') === '1';
      const shouldDebugCacheLS = (localStorage.getItem('sageutils_cache_debug') === 'true') || (localStorage.getItem('sageutils_debug') === 'true');
      if (shouldDebugCache || shouldDebugCacheLS) {
        DataCache.setDebug(true);
      }
      
      // Start preloading in background (don't await)
      DataCache.preloadAll().then(() => {
        const preloadEnd = performance.now();
        if (shouldLogTimingDetails()) {
          console.log(`[SageUtils] Background preload completed in ${(preloadEnd - preloadStart).toFixed(2)}ms`);
          console.log(DataCache.getSummary());
        }
      }).catch(error => {
        console.error("[SageUtils] Background preload failed:", error);
      });
      
      recordInitializationMilestone("DATA_PRELOAD_STARTED");
      
      // Register the cache sidebar tab
      const sidebarStart = performance.now();
      app.extensionManager.registerSidebarTab({
        id: "sageUtilsCache",
        icon: "pi pi-hammer",
        title: "SageUtils",
        tooltip: "SageUtils tools: Model browser, file manager, and prompt builder",
        type: "custom",
        render: createCacheSidebar
      });
      const sidebarEnd = performance.now();
      if (shouldLogTimingDetails()) {
        console.log(`Sidebar tab registration took: ${(sidebarEnd - sidebarStart).toFixed(2)}ms`);
      }
      
      recordInitializationMilestone("SIDEBAR_TAB_REGISTERED");
    });
    
    // Complete initialization and optionally send timing data to server
    const totalTime = completeInitialization();
    if (shouldLogTimingDetails()) {
      console.log(`SageUtils JavaScript initialization completed in ${totalTime.toFixed(4)}ms`);
    }
    
    // Send timing data to server if enabled
    if (shouldSendTimingData()) {
      try {
        await javascriptTimer.sendTimingDataToServer();
        if (shouldLogTimingDetails()) {
          console.log("Timing data sent to server");
        }
      } catch (error) {
        console.warn("Failed to send timing data to server:", error);
      }
    }
    
    // Print timing report to console if enabled
    if (shouldPrintTimingReport()) {
      printTimingReport();
    }
  },
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    if (!nodeData.name.startsWith(_ID)) return;
    
    // Only time the actual setup functions, not every node
    const needsSetup = [
      _ID + "ViewAnything",
      _ID + "ViewNotes",
      _ID + "ModelInfoDisplay",
      _ID + "LoraStackInfoDisplay"
    ];
    
    if (needsSetup.includes(nodeData.name)) {
      await timeFunction(`NODE_SETUP_${nodeData.name}`, async () => {
        if (nodeData.name === _ID + "ViewAnything") {
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

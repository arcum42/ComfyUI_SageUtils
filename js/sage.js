// Main JavaScript file for Sage Utils custom nodes.
// For ComfyUI custom node development, see:
//   https://github.com/chrisgoringe/Comfy-Custom-Node-How-To/
//   https://github.com/chrisgoringe/Comfy-Custom-Node-How-To/wiki/ui_1_starting
//   https://github.com/chrisgoringe/Comfy-Custom-Node-How-To/wiki/remove_or_add_widget

console.log('[SageUtils] sage.js imported');

import { app } from "../../../scripts/app.js";
import { _ID } from "./shared/utils.js";
import { getTextFromNode } from "./utils/textCopyFromNode.js";
import { copyTextToNode } from "./utils/textCopyUtils.js";
import { getEventBus, MessageTypes, sendTextToLLM, sendTextToPromptBuilder, showNotification } from "./shared/crossTabMessaging.js";

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
console.log('[SageUtils] sage.js module loaded');

// Import node setup functions
import { setupViewTextOrAnythingNode } from "./nodes/viewAnything.js";
import { setupViewNotesNode } from "./nodes/viewNotes.js";
import { setupModelInfoDisplayNode } from "./nodes/modelInfoDisplay.js";
recordInitializationMilestone("NODE_SETUP_FUNCTIONS_IMPORTED");

const SAGE_TEXT_NODE_TYPES = [
  _ID + "SetText",
  _ID + "SetTextWithoutComments",
  _ID + "SetTextWithDynamicPrompts"
];

function getNodeIdentifier(node) {
  return node?.comfyClass || node?.type || null;
}

function getSageNodeText(node) {
  const text = getTextFromNode(node);
  if (text === null || typeof text !== "string") {
    throw new Error(`Unable to extract text from node ${getNodeIdentifier(node)}`);
  }
  return text;
}

function updateNodeText(node, newText, append = false) {
  const currentText = getTextFromNode(node) || "";
  const mergedText = append ? `${currentText}${newText}` : newText;
  const success = copyTextToNode(node, mergedText);
  if (!success) {
    showNotification(`Unable to update text on node ${getNodeIdentifier(node)}`, "error", { source: "sage-utils" });
  }
  return success;
}

function getLastLlmResponseFromState(state) {
  if (!state || typeof state !== "object") return null;

  if (state._unsavedResponse && typeof state._unsavedResponse === "string" && state._unsavedResponse.trim()) {
    return state._unsavedResponse;
  }

  const candidateLists = [];
  if (Array.isArray(state.currentConversationMessages)) {
    candidateLists.push(state.currentConversationMessages);
  }

  if (Array.isArray(state.conversationHistory) && state.currentConversationId) {
    const currentConversation = state.conversationHistory.find((c) => c.id === state.currentConversationId);
    if (currentConversation?.messages) {
      candidateLists.push(currentConversation.messages);
    }
  }

  if (candidateLists.length === 0 && Array.isArray(state.conversationHistory) && state.conversationHistory.length > 0) {
    const mostRecent = state.conversationHistory[0];
    if (mostRecent?.messages) {
      candidateLists.push(mostRecent.messages);
    }
  }

  for (const list of candidateLists) {
    if (!Array.isArray(list)) continue;
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const item = list[i];
      const text = item?.text || item?.content;
      const role = item?.role || item?.speaker;
      if (!text || typeof text !== "string") continue;
      if (role === "assistant" || role === "bot" || role === "system" || role === "assistant_response") {
        return text;
      }
    }
  }

  return null;
}

function requestLlmTabState(timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const bus = getEventBus();
    let timeoutId = null;

    const unsubscribe = bus.subscribe(MessageTypes.LLM_STATE_RESPONSE, (message) => {
      const data = message?.data || message;
      if (data?.target !== "sage-utils") return;

      clearTimeout(timeoutId);
      unsubscribe();
      resolve(data.state || null);
    });

    timeoutId = setTimeout(() => {
      unsubscribe();
      reject(new Error("LLM state request timed out"));
    }, timeoutMs);

    bus.publish(MessageTypes.LLM_STATE_REQUEST, { source: "sage-utils" });
  });
}

async function getLastLlmResponse() {
  try {
    const state = await requestLlmTabState();
    return getLastLlmResponseFromState(state);
  } catch (error) {
    console.warn("Failed to get LLM state:", error);
    return null;
  }
}

async function handleReplaceNodeTextWithLlmResponse(node) {
  const responseText = await getLastLlmResponse();
  if (!responseText) {
    showNotification("No last LLM response was available", "error", { source: "sage-utils" });
    return;
  }

  if (updateNodeText(node, responseText, false)) {
    showNotification("Node text replaced with last LLM response", "success", { source: "sage-utils" });
  }
}

async function handleAppendNodeTextWithLlmResponse(node) {
  const responseText = await getLastLlmResponse();
  if (!responseText) {
    showNotification("No last LLM response was available", "error", { source: "sage-utils" });
    return;
  }

  if (updateNodeText(node, responseText, true)) {
    showNotification("Node text appended with last LLM response", "success", { source: "sage-utils" });
  }
}

async function handleSendNodeTextToLLM(node) {
  const text = getSageNodeText(node);
  sendTextToLLM(text, { source: "sage-utils", autoSwitch: true });
  showNotification("Node text sent to LLM prompt", "success", { source: "sage-utils" });
}

async function handleSendNodeTextToPromptBuilder(node) {
  const text = getSageNodeText(node);
  sendTextToPromptBuilder(text, { source: "sage-utils", autoSwitch: true, append: false });
  showNotification("Node text sent to Prompt Builder", "success", { source: "sage-utils" });
}

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
      console.log('[SageUtils] registering sidebar tab');
      try {
        app.extensionManager.registerSidebarTab({
          id: "sageUtilsCache",
          icon: "pi pi-hammer",
          title: "SageUtils",
          tooltip: "SageUtils tools: Model browser, file manager, and prompt builder",
          type: "custom",
          render: createCacheSidebar
        });
      } catch (error) {
        console.error('[SageUtils] failed to register sidebar tab:', error);
        throw error;
      }
      const sidebarEnd = performance.now();
      if (shouldLogTimingDetails()) {
        console.log(`Sidebar tab registration took: ${(sidebarEnd - sidebarStart).toFixed(2)}ms`);
      }
      console.log('[SageUtils] sidebar tab registered successfully');
      
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
  getNodeMenuItems(node) {
    const nodeType = getNodeIdentifier(node);
    if (!nodeType) return [];

    const isTextNode = SAGE_TEXT_NODE_TYPES.includes(nodeType);
    const isViewAnything = nodeType === _ID + "ViewAnything";

    if (!isTextNode && !isViewAnything) {
      return [];
    }

    return [
      {
        content: "LLM actions",
        submenu: {
          options: [
            {
              content: "Replace with last LLM response",
              callback: () => handleReplaceNodeTextWithLlmResponse(node)
            },
            {
              content: "Append last LLM response",
              callback: () => handleAppendNodeTextWithLlmResponse(node)
            },
            {
              content: "Send text to LLM prompt",
              callback: () => handleSendNodeTextToLLM(node)
            },
            {
              content: "Send text to Prompts tab",
              callback: () => handleSendNodeTextToPromptBuilder(node)
            }
          ]
        }
      }
    ];
  }
});

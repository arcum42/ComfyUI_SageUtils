# Plan: Add Sage Utils node context menu actions for LLM and image transfers

## Goal
Add custom context menu items for Sage Utils nodes that allow:

- Replacing or appending the current node text with the last response from the LLM tab
- Sending the current node text to the LLM prompt or to the Prompts tab
- For `Sage_ViewAnything`, only add the send-text items, not replace text actions

> Image-node menu support for `Sage_LoadImage` and `Sage_SaveImageWithMetadata` is deferred to a later goal because it is more complex and may need additional node/image access support.

## Where to begin

### Reference documentation
- Use the official ComfyUI JS context menu guidance at:
  - `https://docs.comfy.org/custom-nodes/js/context-menu-migration`
- The relevant local mirror docs are:
  - `docs/ref_docs/upstream_docs/js/context-menu-migration.md`
  - `docs/ref_docs/frontend/javascript_examples.md`

### Primary code entry points
- `js/sage.js`
  - The main Sage Utils extension registration file
  - It already uses `beforeRegisterNodeDef(nodeType, nodeData, app)` to customize nodes
- `js/nodes/viewAnything.js`
  - Existing node setup logic for `Sage_ViewAnything`
- `js/utils/textCopyUtils.js`
  - Provides utilities to copy text into a target node widget
- `js/utils/textCopyFromNode.js`
  - Provides utilities to read text from a selected node widget
- `js/shared/crossTabMessaging.js`
  - Provides the transport for sending text to the LLM tab and Prompt Builder
- `js/sidebar/llmTab/llmTabShell.js`
  - Shows how the LLM tab receives `TEXT_TO_LLM` and `IMAGE_TRANSFER`
- `js/gallery/galleryEvents.js`
  - Contains an existing example of sending images to the LLM tab via `sendImagesToLLM`

## Plan

### Current implementation status
- Implemented `getNodeMenuItems(node)` in `js/sage.js`.
- Added `LLM actions` submenu for Sage text nodes.
- Added actions:
  - `Replace with last LLM response`
  - `Append last LLM response`
  - `Send text to LLM prompt`
  - `Send text to Prompts tab`
- LLM response retrieval is now requested from the LLM tab via `MessageTypes.LLM_STATE_REQUEST`.
- `ViewAnything` support is planned as a later validation step.

### Step 1: Choose the menu hook strategy

Use the new `getNodeMenuItems(node)` extension hook instead of prototype monkey-patching.

This matches the migration guide approach for node context menus and keeps Sage Utils compatible with the current ComfyUI extension API.

```js
app.registerExtension({
  name: "arcum42.sage.utils",
  getNodeMenuItems(node) {
    const items = [];
    if (node.comfyClass === "Sage_SetText") {
      items.push({
        content: "Send text to LLM prompt",
        callback: () => { ... }
      });
    }
    return items;
  }
});
```

Keep `beforeRegisterNodeDef()` for the existing node setup logic where a node needs custom widget or behavior initialization, but do not use it to add context menu items.

### Step 2: Identify target node classes and actions

Target nodes:
- `Sage_SetText`
- `Sage_SetTextWithoutComments`
- `Sage_SetTextWithDynamicPrompts` (`SageSetWildcardText` backend id)
- `Sage_ViewAnything`

Actions:
- For text nodes:
  - `Replace with LLM response`
  - `Append LLM response`
  - `Send text to LLM prompt`
  - `Send text to Prompts tab`
- For `Sage_ViewAnything`:
  - `Send text to LLM prompt`
  - `Send text to Prompts tab`

Later goal (optional):
- Add image-node menu items for `Sage_LoadImage` and `Sage_SaveImageWithMetadata` to send image data to the LLM tab.

### Step 3: Build helper functions

Add or reuse helpers in `js/utils/` for:
- Extracting text from a node using `textCopyFromNode.js`
- Copying text into a node using `textCopyUtils.js`
- Sending text to the LLM tab and prompt builder via `crossTabMessaging.js`
- Sending images to the LLM tab via `sendImagesToLLM`

Potential new helper functions:
- `sendNodeTextToLLM(node)`
- `sendNodeTextToPromptBuilder(node, append = false)`
- `replaceNodeTextWithLLMResponse(node, response)`
- `appendNodeTextWithLLMResponse(node, response)`
- `sendNodeImageToLLM(node)`

### Step 4: Wire node menu items in `js/sage.js`

In `js/sage.js`:
- Keep the existing `beforeRegisterNodeDef()` logic for node setup only.
- Add a new `getNodeMenuItems(node)` hook on the extension config.
- Return menu items only for the Sage node types that need them.

Example pattern:

```js
app.registerExtension({
  name: "arcum42.sage.utils",
  async setup() {
    // existing setup logic...
  },
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    // existing node setup logic...
  },
  getNodeMenuItems(node) {
    const items = [];

    const textNodes = [
      _ID + "SetText",
      _ID + "SetTextWithoutComments",
      _ID + "SetTextWithDynamicPrompts"
    ];

    if (textNodes.includes(node.comfyClass)) {
      items.push({
        content: "LLM actions",
        submenu: {
          options: [
            {
              content: "Replace with last LLM response",
              callback: () => replaceNodeTextWithLLMResponse(node)
            },
            {
              content: "Append last LLM response",
              callback: () => appendNodeTextWithLLMResponse(node)
            },
            {
              content: "Send text to LLM prompt",
              callback: () => sendNodeTextToLLM(node)
            },
            {
              content: "Send text to Prompts tab",
              callback: () => sendNodeTextToPromptBuilder(node)
            }
          ]
        }
      });
      return items;
    }

    if (node.comfyClass === _ID + "ViewAnything") {
      items.push({
        content: "Send text to LLM prompt",
        callback: () => sendNodeTextToLLM(node)
      });
      items.push({
        content: "Send text to Prompts tab",
        callback: () => sendNodeTextToPromptBuilder(node)
      });
      return items;
    }

    return [];
  }
});
```

This keeps the node menu implementation aligned with the current ComfyUI API, avoids deprecated prototype modifications, and groups the Sage text actions under a single submenu for clarity.

### Step 5: Implement text retrieval and node targeting

Use `textCopyFromNode.js` to read the node's text widget value.

If the node is one of the Sage text setters, use the same widget name detection logic from `textCopyUtils.js` / `textCopyFromNode.js`:
- `str` or `text` widget

If sending text from `Sage_ViewAnything`, use the output string or read from the node's widget similarly.

### Step 6: Implement LLM response handling

The new menu actions should obtain the last LLM response from the LLM tab state.

Potential approaches:
- Ask the LLM tab for its current assistant response via `MessageTypes.LLM_STATE_REQUEST` if the tab exposes it
- Or use the currently loaded response text in the LLM response section via a shared helper that exposes it

The quick path is to copy the last response text from the current LLM tab if it is already available in session state. If not, store the last assistant response in a shared module or localStorage and read it from the helper.

### Step 7: Send text to LLM prompt or Prompt Builder

Use `sendTextToLLM(text, { target: 'main', source: 'sage-utils', autoSwitch: true })` to send text to the LLM tab.

Use `sendTextToPromptBuilder(text, { source: 'sage-utils', autoSwitch: true, append: false })` for Prompts tab.

### Step 8: Send images to LLM tab

For `Sage_LoadImage` and `Sage_SaveImageWithMetadata`:
- Determine the image path from the node's widget/input values if possible
- Use `/sage_utils/image` or existing `loadFullImage()` style helper to convert the image to a data URL
- Publish the payload via `sendImagesToLLM([{ base64: dataUrl, name }], { source: 'sage-utils', autoSwitch: true })`

If node props are not directly accessible from the frontend node instance, the first step is to inspect how those nodes are represented in ComfyUI and whether the node instance has a `widgets` or `inputs` field.

### Step 9: Verify behavior

- Right-click each target node and confirm the new items appear
- For text nodes:
  - `Send text to LLM prompt` should populate the LLM prompt textarea
  - `Send text to Prompts tab` should populate the prompt builder positive prompt
  - `Replace with last LLM response` should overwrite the text node field
  - `Append last LLM response` should append to the text node field
- For `Sage_ViewAnything`:
  - Only send actions appear
- For image nodes:
  - `Send image to LLM tab` should add the image to the vision section

## Open technical questions

1. Where does the LLM tab expose the latest assistant response to other tabs? 
   - Investigate `llmTabShell.js` + `llmGenerationHandler.js` and whether `state._unsavedResponse` is accessible by other modules
2. How does the frontend node object expose text and image field values? 
   - Confirm by inspecting node instance shape in the browser console or by logging `this.widgets` inside `getExtraMenuOptions`
3. For image nodes, can the frontend get the actual saved image file path from the node instance, or does this require a backend helper?

## Suggested next steps

1. Create a new planning document under `docs/planning/` with this plan
2. Add shared helper functions in `js/utils/` for node text extraction and LLM/tab dispatch
3. Patch `js/sage.js` in `beforeRegisterNodeDef()` to add menu items for the target node classes
4. Test each node menu action end-to-end in the Sage Utils UI

## Document references

- `docs/ref_docs/upstream_docs/js/context-menu-migration.md`
- `docs/ref_docs/frontend/javascript_examples.md`
- `js/utils/textCopyUtils.js`
- `js/utils/textCopyFromNode.js`
- `js/shared/crossTabMessaging.js`
- `js/sidebar/llmTab/llmTabShell.js`
- `js/gallery/galleryEvents.js`

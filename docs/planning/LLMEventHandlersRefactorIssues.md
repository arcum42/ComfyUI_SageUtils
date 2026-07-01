# LLM Event Handlers Refactor Issues

This document lists the issues found in the `js/sidebar/llmTab/shared` event handler files after the refactor, along with the fixes that should be applied.

## Summary

The refactor introduced multiple mismatches between event wiring and handler signatures, as well as a few stale/unwired functions. The following issues were found in these files:

- `llmEventHandlers.js`
- `llmProviderEvents.js`
- `llmPresetEvents.js`
- `llmHistoryEvents.js`
- `llmVisionEvents.js`

## Current Status

- ✅ Fixed: paste handler registration and cleanup wiring in `llmEventHandlers.js`
- ✅ Fixed: `handleModelChange` now receives `visionSection` in `llmProviderEvents.js`
- ✅ Fixed: preset event handler argument lists now match between `llmEventHandlers.js` and `llmPresetEvents.js`
- ✅ Fixed: `handleSaveToHistoryClick` now receives `updateConversationList`
- ✅ Fixed: `resetSettingsBtn` is now wired to `resetSettingsToDefaults`
- ✅ Fixed: `state.selectedExtras` initialization added in `llmTemplateEvents.js`
- ✅ Fixed: dead helper functions and unused DOM queries in `llmEventHandlers.js`
- ✅ Fixed: vision preview cleanup selector now matches actual DOM structure

---

## 1. `llmEventHandlers.js`

### 1.1 Paste handler wiring

- Status: ✅ Fixed
- Change:
  - Created the paste handler once
  - Attached it with `document.addEventListener('paste', handler)`
  - Stored it on `state._pasteHandler`
  - Cleanup remains in `cleanupEventHandlers(state)` using the stored handler

### 1.2 Unused `resetSettingsBtn`

- Status: ✅ Fixed
- Change:
  - Wired `resetSettingsBtn` to `resetSettingsToDefaults`

### 1.3 Unused internal helpers

- Status: ✅ Fixed
- Change:
  - `setupComposeTemplateHandlers` and `setupSettingsEventHandlers` are now invoked from `setupEventHandlers()`.

### 1.4 History event action wiring

- Status: ✅ Fixed
- Change:
  - `handleSaveToHistoryClick` now receives `updateConversationList` from `setupEventHandlers`

### 1.5 Unused `wrapper` and `previewGrid` variables

- Status: ✅ Fixed
- Change:
  - Removed the unused `wrapper` parameter from `setupEventHandlers()` in `llmEventHandlers.js`.
  - Removed unused preview-related DOM queries `previewGrid` and `imageCount`.

---

## 2. `llmProviderEvents.js`

### 2.1 Missing `visionSection` parameter in `handleModelChange`

- Status: ✅ Fixed
- Change:
  - Added `visionSection` to the function signature in `llmProviderEvents.js`
  - Updated the caller in `llmEventHandlers.js` to pass `visionSection`

### 2.2 Potential use of `showProviderOptions` and `updateCapabilityControlledOptions`

- Status: ✅ Confirmed
- Note:
  - `setupEventHandlers` already passes both functions correctly.

---

## 3. `llmPresetEvents.js`

### 3.1 Handler signature mismatch for `handlePresetChange`

- Status: ✅ Fixed
- Change:
  - Updated `handlePresetChange` in `llmPresetEvents.js` to accept the actual call-site arguments.
  - Updated `llmEventHandlers.js` to pass `loadPresets`, `showNotification`, `advancedOptions`, `inputSection`, and `applyPresetToUI`.

### 3.2 Handler signature mismatch for `handleManagePresetsClick`

- Status: ✅ Fixed
- Change:
  - Updated `llmEventHandlers.js` to pass `advancedOptions`, `inputSection`, `loadPresets`, `applyPresetToUI`, and `showNotification`.

### 3.3 Handler signature mismatch for `handleSavePresetClick`

- Status: ✅ Confirmed
- Note:
  - `handleSavePresetClick` already matches its caller.

---

## 4. `llmHistoryEvents.js`

### 4.1 Undefined `updateConversationList` usage

- Status: ✅ Fixed
- Change:
  - `handleSaveToHistoryClick` now receives `updateConversationList` as a parameter.
  - `llmEventHandlers.js` now passes `updateConversationList` into the handler.

### 4.2 Event binding logic in `llmEventHandlers.js`

- Status: ⚠️ Needs review
- Note:
  - `handleNewConversationClick` currently does not take `updateConversationList`, but it uses `llmUpdateConvList` internally and is likely sufficient.
  - If a future refactor needs the shared `updateConversationList` function instead, this can be updated then.

---

## 5. `llmVisionEvents.js`

### 5.1 Paste handler logic

- Status: ✅ Fixed
- Change:
  - `llmEventHandlers.js` now attaches the returned handler to `document.addEventListener('paste', handler)`.
  - The handler is stored on `state._pasteHandler` for cleanup.

### 5.2 `handleClearAllImagesClick` cleanup

- Status: ✅ Fixed
- Change:
  - Updated the handler to use the actual preview DOM structure of `.llm-image-preview-item` and `.llm-preview-image`.

---

## 6. Possible hidden issues

### 6.1 `state.selectedExtras` initialization

- Status: ✅ Fixed
- Change:
  - `llmTemplateEvents.handleExtrasChange` now initializes `state.selectedExtras = state.selectedExtras || {}` before use.

### 6.2 `saveSettings` context and calls

- Some handlers call `saveSettings(state.settings)` with `this` binding via `.call(null, ...)` in `llmProviderEvents.js`.
- This is unusual but not necessarily wrong.
- Fix:
  - Confirm `saveSettings` does not rely on `this`; if it does, remove `.call(null, ...)` and call directly.

### 6.3 Code duplication and dead code

- The file `llmEventHandlers copy.js` appears to be a backup/copy and should not be part of normal execution.
- Fix:
  - Keep it as a backup if desired, but do not modify it as part of the fix.

---

## Remaining items

- `handleNewConversationClick` still uses its internal `llmUpdateConvList` path rather than the shared `updateConversationList` callback. This is acceptable for now, but it can be standardized later if desired.

---

## Notes

- This document now tracks the issue review and fix status for `js/sidebar/llmTab/shared/*`.
- The high-priority refactor issues identified earlier have been addressed.

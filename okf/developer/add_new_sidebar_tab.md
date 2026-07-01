---
type: Guide
title: Add a New Sidebar Tab
description: Step-by-step guidance for adding a new sidebar tab to Sage Utils.
resource: Unsloth_Project_Docs.md
tags: [developer, ui, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents how to add a new sidebar tab to the Sage Utils interface.

## Steps

1. Create a new tab module at `js/sidebar/<tabName>Tab.js`.
2. Export a `create<TabName>Tab(container, state)` function that returns the tab content.
3. Import the new tab in `js/sidebar/cacheSidebar.js`.
4. Register the tab in the sidebar tab list.
5. Add state tracking in `js/shared/stateManager.js` if the tab needs persistent settings.
6. Optionally add a visibility setting in `utils/settings.py`.

## Example

```javascript
export function createMyTab(container, state) {
  const tab = document.createElement('div');
  tab.textContent = 'My Tab Content';
  container.append(tab);
  return {
    container: tab,
    destroy: () => tab.remove(),
  };
}
```

## Notes

- Use the shared UI components and layout utilities where possible.
- Keep tabs decoupled by using cross-tab messaging for communication.
- Preserve state by hiding/showing existing tab content rather than recreating it.

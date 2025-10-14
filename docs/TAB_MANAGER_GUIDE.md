# TabManager Class Guide

## Overview

The `TabManager` class provides a comprehensive, reusable solution for creating tabbed interfaces with lazy loading, state management, and visibility control. It eliminates the need for manual tab button creation, state tracking, and switching logic.

**Location:** `js/components/tabs.js`

## When to Use TabManager

Use TabManager when you need:
- Multiple tabs with content that should be lazy-loaded
- State management for active tab and initialization tracking
- Show/hide functionality based on user settings
- Callbacks for tab switching and initialization events
- Consistent tab UI and behavior across your application

## Key Features

- **Lazy Loading**: Tab content is only created when the tab is first activated
- **State Management**: Automatic tracking of active tab and initialized tabs
- **Visibility Control**: Show/hide tabs dynamically based on settings
- **Event Callbacks**: `onTabSwitch` and `onTabInit` hooks for custom logic
- **Loading States**: Built-in "Loading..." placeholder while content initializes
- **Automatic Cleanup**: `destroy()` method for proper resource disposal

## API Reference

### Constructor

```javascript
const tabManager = new TabManager(options);
```

**Options:**
```javascript
{
    container: HTMLElement,        // Required: Container element for the tab interface
    onTabSwitch: (tabId) => {},   // Optional: Called when switching tabs
    onTabInit: (tabId) => {},     // Optional: Called when tab is first initialized
    lazyLoad: true,               // Optional: Enable lazy loading (default: true)
    styles: {                     // Optional: Custom styles (defaults provided)
        tabButton: {},
        tabButtonActive: {},
        tabContent: {}
    }
}
```

### Core Methods

#### `init()`
Initializes the TabManager by creating tab header and content containers.

```javascript
tabManager.init();
```

**Returns:** `TabManager` instance (chainable)

---

#### `addTab(id, label, contentFactory, options)`
Adds a new tab to the interface.

**Parameters:**
- `id` (string): Unique identifier for the tab
- `label` (string): Display text for the tab button
- `contentFactory` (function): Function that returns tab content (HTMLElement or Promise)
- `options` (object): Optional configuration
  - `visible` (boolean): Whether tab should be visible (default: true)
  - `customStyles` (object): Custom styles for this specific tab

**Example:**
```javascript
tabManager.addTab('models', 'Models', () => createModelsTab(), { visible: true });
```

**Returns:** `TabManager` instance (chainable)

---

#### `switchTab(tabId)`
Switches to the specified tab, initializing it if needed.

**Parameters:**
- `tabId` (string): ID of the tab to switch to

**Throws:** Error if tab doesn't exist or is hidden

**Example:**
```javascript
tabManager.switchTab('models');
```

---

#### `removeTab(tabId)`
Removes a tab from the interface.

**Parameters:**
- `tabId` (string): ID of the tab to remove

**Example:**
```javascript
tabManager.removeTab('models');
```

---

#### `showTab(tabId)` / `hideTab(tabId)`
Show or hide a specific tab.

**Parameters:**
- `tabId` (string): ID of the tab to show/hide

**Example:**
```javascript
tabManager.hideTab('advanced');
tabManager.showTab('basic');
```

---

#### `getActiveTab()`
Returns the ID of the currently active tab.

**Returns:** `string | null`

**Example:**
```javascript
const activeTabId = tabManager.getActiveTab();
console.log(`Current tab: ${activeTabId}`);
```

---

#### `isTabInitialized(tabId)`
Checks if a tab has been initialized.

**Parameters:**
- `tabId` (string): ID of the tab to check

**Returns:** `boolean`

**Example:**
```javascript
if (!tabManager.isTabInitialized('models')) {
    console.log('Models tab has not been initialized yet');
}
```

---

#### `getTabIds()` / `getVisibleTabIds()`
Get all tab IDs or only visible tab IDs.

**Returns:** `string[]`

**Example:**
```javascript
const allTabs = tabManager.getTabIds();
const visibleTabs = tabManager.getVisibleTabIds();
```

---

#### `activateFirstTab()`
Activates the first visible tab.

**Example:**
```javascript
tabManager.activateFirstTab();
```

---

#### `updateVisibility(settings)`
Updates tab visibility based on settings object.

**Parameters:**
- `settings` (object): Visibility settings mapping tab IDs to boolean values

**Example:**
```javascript
tabManager.updateVisibility({
    models: true,
    files: true,
    advanced: false
});
```

---

#### `destroy()`
Cleans up all resources and removes event listeners.

**Example:**
```javascript
// When removing the tabbed interface
tabManager.destroy();
```

## Usage Examples

### Basic Setup

```javascript
import { TabManager } from './components/tabs.js';

// Create container
const container = document.createElement('div');
container.style.cssText = `
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
`;

// Create TabManager
const tabManager = new TabManager({
    container: container,
    onTabSwitch: (tabId) => {
        console.log(`Switched to tab: ${tabId}`);
    },
    onTabInit: (tabId) => {
        console.log(`Initialized tab: ${tabId}`);
    }
});

// Initialize and add tabs
tabManager.init()
    .addTab('home', 'Home', createHomeContent)
    .addTab('settings', 'Settings', createSettingsContent)
    .addTab('about', 'About', createAboutContent);

// Activate first tab
tabManager.activateFirstTab();
```

### Content Factory Functions

Content factories can return either an element or a Promise:

```javascript
// Synchronous content
function createHomeContent() {
    const div = document.createElement('div');
    div.innerHTML = '<h1>Welcome Home!</h1>';
    return div;
}

// Asynchronous content (lazy loading)
async function createSettingsContent() {
    // Load settings from server
    const settings = await fetchSettings();
    
    const div = document.createElement('div');
    div.innerHTML = `<h1>Settings</h1><pre>${JSON.stringify(settings, null, 2)}</pre>`;
    return div;
}
```

### Dynamic Visibility

```javascript
// Load visibility settings
const tabVisibility = {
    home: true,
    settings: userHasPermission('settings'),
    advanced: userRole === 'admin',
    about: true
};

// Add tabs with visibility
tabManager.init()
    .addTab('home', 'Home', createHomeContent, { visible: tabVisibility.home })
    .addTab('settings', 'Settings', createSettingsContent, { visible: tabVisibility.settings })
    .addTab('advanced', 'Advanced', createAdvancedContent, { visible: tabVisibility.advanced })
    .addTab('about', 'About', createAboutContent, { visible: tabVisibility.about });

// Update visibility dynamically
document.getElementById('toggleAdvanced').addEventListener('click', () => {
    if (tabManager.getVisibleTabIds().includes('advanced')) {
        tabManager.hideTab('advanced');
    } else {
        tabManager.showTab('advanced');
    }
});
```

### Integration with Settings

```javascript
// Update visibility based on user preferences
async function updateTabVisibility() {
    const settings = await loadUserSettings();
    
    tabManager.updateVisibility({
        home: settings.showHome !== false,
        settings: settings.showSettings !== false,
        advanced: settings.showAdvanced === true && settings.userRole === 'admin',
        about: settings.showAbout !== false
    });
    
    // Re-activate first visible tab if current tab is now hidden
    const activeTab = tabManager.getActiveTab();
    if (activeTab && !tabManager.getVisibleTabIds().includes(activeTab)) {
        tabManager.activateFirstTab();
    }
}
```

### Custom Styling

```javascript
const tabManager = new TabManager({
    container: container,
    styles: {
        tabButton: {
            padding: '12px 24px',
            fontSize: '14px',
            background: '#1a1a1a',
            color: '#999',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
        },
        tabButtonActive: {
            background: '#2196F3',
            color: 'white',
            fontWeight: 'bold'
        },
        tabContent: {
            padding: '24px',
            background: '#2a2a2a',
            borderRadius: '0 0 8px 8px',
            minHeight: '400px'
        }
    }
});
```

## Migration Guide

### From Manual Tab Management to TabManager

**Before:**
```javascript
// OLD APPROACH: Manual tab management (200+ lines)
function createTabHeader(tabVisibility) {
    const tabHeader = document.createElement('div');
    tabHeader.style.cssText = '...';
    
    const modelsTab = createTabButton('Models', true);
    const filesTab = createTabButton('Files', false);
    // ... more tabs
    
    if (tabVisibility.show_models_tab !== false) {
        tabHeader.appendChild(modelsTab);
    }
    // ... more visibility checks
    
    return { tabHeader, modelsTab, filesTab, /* ... */ };
}

function createTabContent() {
    const tabContent = document.createElement('div');
    
    const modelsContent = document.createElement('div');
    modelsContent.id = 'models-content';
    modelsContent.style.display = 'none';
    // ... more content divs
    
    tabContent.appendChild(modelsContent);
    // ... more appends
    
    return { tabContent, modelsContent, filesContent, /* ... */ };
}

function setupTabSwitching(tabComponents, tabContentData) {
    const initializedTabs = new Set();
    let activeTabId = null;
    
    function switchTab(tabId) {
        // 50+ lines of switching logic
        // State management
        // Event listeners
        // Lazy loading
    }
    
    // More event listener setup (80+ lines)
    
    return { switchTab, initializedTabs };
}

// Usage
const tabComponents = createTabHeader(tabVisibility);
const tabContentData = createTabContent();
const { switchTab } = setupTabSwitching(tabComponents, tabContentData);
```

**After:**
```javascript
// NEW APPROACH: TabManager class (clean and concise)
const tabManager = new TabManager({
    container: mainContainer,
    onTabSwitch: (tabId) => console.log(`Switched to: ${tabId}`),
    onTabInit: (tabId) => console.log(`Initialized: ${tabId}`)
});

tabManager.init()
    .addTab('models', 'Models', createModelsTab, { visible: tabVisibility.show_models_tab })
    .addTab('files', 'Files', createFilesTab, { visible: tabVisibility.show_files_tab })
    .addTab('civitai', 'Search', createCivitaiSearchTab, { visible: tabVisibility.show_search_tab })
    .addTab('gallery', 'Gallery', createImageGalleryTab, { visible: tabVisibility.show_gallery_tab })
    .addTab('promptBuilder', 'Prompts', createPromptBuilderTab, { visible: tabVisibility.show_prompts_tab })
    .addTab('llm', 'LLM', createLLMTab, { visible: tabVisibility.show_llm_tab });

tabManager.activateFirstTab();
```

**Line Count Comparison:**
- Before: ~300+ lines (createTabHeader, createTabContent, setupTabSwitching)
- After: ~15 lines
- **Reduction: ~285 lines (95%)**

### Key Migration Steps

1. **Replace tab header creation:**
   - Remove `createTabHeader()` function
   - Use `tabManager.init()` and `addTab()` instead

2. **Replace tab content creation:**
   - Remove `createTabContent()` function
   - Convert to content factory functions that return elements
   - Pass factories to `addTab()`

3. **Replace tab switching logic:**
   - Remove `setupTabSwitching()` function
   - Use `tabManager.switchTab(tabId)` instead
   - Use `onTabSwitch` callback for custom logic

4. **Update visibility management:**
   - Use `visible` option in `addTab()`
   - Use `updateVisibility()` for dynamic changes
   - Use `showTab()` / `hideTab()` for individual tabs

5. **Update cleanup:**
   - Replace manual cleanup with `tabManager.destroy()`

## Best Practices

### 1. Content Factory Functions

Always use factory functions for tab content to enable lazy loading:

```javascript
// ✅ GOOD: Factory function
tabManager.addTab('models', 'Models', () => createModelsTab());

// ❌ BAD: Creating content immediately
const modelsContent = createModelsTab();
tabManager.addTab('models', 'Models', () => modelsContent);
```

### 2. Async Content Loading

For expensive operations, use async factories:

```javascript
async function createDataTab() {
    // Show loading state while fetching
    const data = await fetchLargeDataset();
    
    const container = document.createElement('div');
    container.innerHTML = renderData(data);
    return container;
}

tabManager.addTab('data', 'Data', createDataTab);
```

### 3. State Management

Use callbacks for external state synchronization:

```javascript
const tabManager = new TabManager({
    container: container,
    onTabSwitch: (tabId) => {
        // Update URL
        history.pushState({}, '', `#${tabId}`);
        
        // Analytics
        trackTabView(tabId);
        
        // Cross-tab messaging
        eventBus.publish('TAB_SWITCHED', { tabId });
    }
});
```

### 4. Proper Cleanup

Always call `destroy()` when removing the tab interface:

```javascript
// Store reference
let currentTabManager = null;

function createInterface() {
    currentTabManager = new TabManager({ container });
    // ... setup tabs
}

function destroyInterface() {
    if (currentTabManager) {
        currentTabManager.destroy();
        currentTabManager = null;
    }
}
```

### 5. Error Handling

Handle errors in content factories gracefully:

```javascript
async function createRiskyTab() {
    try {
        const data = await riskyOperation();
        return createSuccessView(data);
    } catch (error) {
        console.error('Tab initialization failed:', error);
        return createErrorView(error);
    }
}

function createErrorView(error) {
    const div = document.createElement('div');
    div.style.cssText = 'padding: 20px; color: #ff5252;';
    div.innerHTML = `
        <h3>Failed to Load Content</h3>
        <p>${error.message}</p>
        <button onclick="location.reload()">Reload</button>
    `;
    return div;
}
```

## Troubleshooting

### Tab Not Switching

**Problem:** `switchTab()` doesn't work

**Solutions:**
1. Check that tab ID is correct
2. Verify tab is visible (not hidden)
3. Check console for errors in content factory
4. Ensure `init()` was called before adding tabs

### Content Not Loading

**Problem:** Tab shows "Loading..." indefinitely

**Solutions:**
1. Check content factory returns element or resolves Promise
2. Add error handling to async factories
3. Check console for errors
4. Verify content factory doesn't throw exceptions

### Visibility Issues

**Problem:** Tabs don't show/hide correctly

**Solutions:**
1. Check visibility settings object structure
2. Use `getVisibleTabIds()` to debug current state
3. Ensure visibility values are boolean (`true`/`false`)
4. Re-activate first tab after hiding current tab

### Memory Leaks

**Problem:** Performance degrades over time

**Solutions:**
1. Always call `destroy()` when removing tab interface
2. Clean up event listeners in content
3. Use `removeTab()` instead of hiding if tab won't be used again
4. Avoid circular references in content factories

## Performance Considerations

### Lazy Loading Benefits

TabManager's lazy loading significantly improves initial load time:

```javascript
// Only active tab content is created initially
tabManager.init()
    .addTab('tab1', 'Quick Tab', createQuickContent)      // Fast
    .addTab('tab2', 'Slow Tab', createExpensiveContent)   // Not created until activated
    .addTab('tab3', 'Heavy Tab', createHeavyContent);     // Not created until activated

tabManager.activateFirstTab(); // Only 'tab1' content is created
```

### Memory Usage

- Inactive tab content remains in memory once initialized
- Use `removeTab()` for tabs that won't be revisited
- Call `destroy()` when entire interface is removed
- Consider re-initializing tabs that are rarely used

## Related Documentation

- [Component System README](../js/components/README.md)
- [Button Component Guide](BUTTON_COMPONENT_GUIDE.md)
- [Form Elements Guide](FORM_ELEMENTS_GUIDE.md)
- [Component Duplication Analysis](COMPONENT_DUPLICATION_ANALYSIS.md)

## Support

For issues or questions:
1. Check this guide's Troubleshooting section
2. Review the TabManager source code (`js/components/tabs.js`)
3. Check `COMPONENT_DUPLICATION_ANALYSIS.md` for migration examples
4. Submit an issue with minimal reproduction case

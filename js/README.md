# JavaScript Code Organization

This directory contains the JavaScript frontend code for Sage Utils custom nodes, organized into a modular structure for better maintainability.

## Directory Structure

```text
js/
├── sage.js                    # Main entry point and extension registration
├── sage_debug.js              # Debug version of main entry point
├── settingsUI.js              # Settings integration with ComfyUI
├── UNUSED_CODE.md             # Documentation of unused code (see cleanup notes)
├── shared/                    # Shared utilities and constants
│   ├── utils.js              # Common utilities and dynamic input setup ✓ USED
│   ├── markdown.js           # Markdown rendering and styling utilities ✓ USED
│   ├── config.js             # Configuration constants and settings ✓ USED
│   ├── stateManager.js       # Centralized state management ✓ PARTIALLY USED
│   ├── errorHandler.js       # Error handling utilities ⚠️ MOSTLY UNUSED
│   ├── cacheApi.js           # Cache API functions ✓ USED
│   ├── cacheUIComponents.js  # UI component creators ✓ USED
│   ├── civitai.js            # CivitAI integration utilities ✓ USED
│   ├── dialogManager.js      # Dialog and modal management ✓ USED
│   ├── infoDisplay.js        # Information display utilities ✓ USED
│   ├── reportGenerator.js    # Report generation utilities ✓ USED
│   ├── uiComponents.js       # General UI component utilities ✓ USED
│   ├── dataProcessors.js     # ❌ ENTIRELY UNUSED - CAN BE DELETED
│   └── fileManager.js        # ❌ ENTIRELY UNUSED - CAN BE DELETED
├── nodes/                     # Individual node setup functions ✓ ALL USED
│   ├── multiModelPicker.js   # Sage_MultiModelPicker node setup
│   ├── textSubstitution.js   # Sage_TextSubstitution node setup
│   ├── viewAnything.js       # Sage_ViewAnything node setup
│   ├── viewNotes.js          # Sage_ViewNotes node setup with file handling
│   └── modelInfoDisplay.js   # Sage_ModelInfoDisplay and Sage_LoraStackInfoDisplay setup
├── widgets/                   # Widget-related functionality ✓ USED
│   └── display.js            # Text, markdown, image, and video display widgets
├── sidebar/                   # Sidebar functionality ✓ USED
│   ├── cacheSidebarNew.js    # Multi-tab sidebar implementation ✓ ACTIVELY USED
│   ├── modelsTab.js          # Models browser tab ✓ USED
│   ├── notesTab.js           # Notes manager tab ✓ USED
│   ├── civitaiSearchTab.js   # CivitAI search tab ✓ USED
│   └── testSidebar.js        # Test sidebar for development
└── docs/                      # Node documentation (existing)
```

## Module Responsibilities

### Core Active Modules

#### `sage.js` (Main Entry Point)
- Extension registration with ComfyUI
- Node type routing to appropriate setup functions
- Sidebar tab registration
- Clean, minimal entry point

#### `settingsUI.js` (Settings Integration)
- Integration with ComfyUI's native settings system
- SageUtils settings management
- Server API communication for settings

### Shared Utilities (Active)

#### `shared/utils.js` ✓ ACTIVELY USED
- Common constants (`TypeSlot`, `TypeSlotEvent`, `_ID`)
- Generic dynamic input setup functionality
- Shared utilities used across multiple nodes

#### `shared/stateManager.js` ✓ PARTIALLY USED
- Centralized state management for sidebar
- State change subscriptions and actions
- **Note**: Contains unused development helpers

#### `shared/config.js` ✓ USED
- Configuration constants and filter options
- File type definitions and utilities
- API endpoints and button configurations

#### `shared/cacheApi.js` ✓ USED
- API functions for cache data retrieval
- Server communication for model cache

#### `shared/errorHandler.js` ⚠️ MOSTLY UNUSED
- Comprehensive error handling framework
- **Warning**: Most functions are unused, only `handleError()` is called

### Widget and Display Systems

#### `widgets/display.js` ✓ USED
- Text widget creation and management
- Markdown display overlay functionality
- Image and video display widgets
- Widget update and content handling utilities

#### `shared/markdown.js` ✓ USED
- Markdown to HTML rendering engine
- CSS styling for markdown elements
- Utilities for markdown display setup

### Node Setup Functions

Each file in `nodes/` handles setup for specific node types:

- **`multiModelPicker.js`** ✓ USED: Dynamic MODEL_INFO input handling
- **`textSubstitution.js`** ✓ USED: Dynamic STRING input handling with static input preservation
- **`viewAnything.js`** ✓ USED: Simple text/content display
- **`viewNotes.js`** ✓ USED: File selection and preview with API integration
- **`modelInfoDisplay.js`** ✓ USED: Markdown-formatted model/LoRA information display

### Sidebar Components

#### `sidebar/cacheSidebarNew.js` ✓ ACTIVELY USED
- Multi-tabbed sidebar interface
- State management integration
- Main sidebar implementation

#### `sidebar/modelsTab.js` ✓ USED
- Model browser functionality
- Model filtering and display

#### `sidebar/notesTab.js` ✓ USED
- Notes file management
- File editing and preview

#### `sidebar/civitaiSearchTab.js` ✓ USED
- CivitAI search integration
- Model discovery features

### Unused Modules (Candidates for Removal)

#### `shared/dataProcessors.js` ❌ ENTIRELY UNUSED
- Model data processing utilities
- **Status**: No imports found anywhere
- **Recommendation**: Can be safely deleted

#### `shared/fileManager.js` ❌ ENTIRELY UNUSED
- File sorting and organization utilities
- **Status**: No imports found anywhere
- **Recommendation**: Can be safely deleted

## Benefits of This Structure

1. **Modularity**: Each component has a clear, focused responsibility
2. **Maintainability**: Changes to specific functionality are isolated to relevant files
3. **Reusability**: Shared utilities can be easily reused across nodes
4. **Scalability**: New nodes can be added easily by creating new files in `nodes/`
5. **Clarity**: The main entry point is clean and easy to understand
6. **Testing**: Individual modules can be tested in isolation

## Code Quality Status

### ✅ Well-Maintained Areas
- Core node functionality (`nodes/` directory)
- Main entry points (`sage.js`, `settingsUI.js`)
- Essential utilities (`shared/utils.js`, `shared/config.js`)
- Active sidebar components

### ⚠️ Areas Needing Attention
- **Error handling**: `shared/errorHandler.js` has many unused functions
- **State management**: `shared/stateManager.js` has unused development helpers
- **Import cleanup**: Several files import unused functions

### ❌ Areas for Cleanup
- **Dead code**: `shared/dataProcessors.js` and `shared/fileManager.js` are completely unused
- **Unused imports**: Multiple files import functions they don't use

## ✅ Cleanup Status (Updated August 2025)

**All major cleanup operations completed successfully!** 

See `CLEANUP_SUMMARY.md` for detailed impact report:
- **3 entire files removed** (dataProcessors.js, fileManager.js, cacheSidebar.js)
- **930+ lines of unused code eliminated**
- **All high and medium priority issues resolved**
- **✅ Codebase is now in excellent health**

## Adding New Nodes

To add a new node:

1. Create a new file in `js/nodes/` (e.g., `newNode.js`)
2. Export a setup function following the existing pattern
3. Import and register it in `sage.js`
4. Use shared utilities from `shared/` and `widgets/` as needed

## Import/Export Pattern

All modules use ES6 import/export syntax:

- Export functions and constants that need to be shared
- Import only what's needed from other modules
- Maintain clear dependency relationships
- **Avoid unused imports** (see UNUSED_CODE.md for current issues)

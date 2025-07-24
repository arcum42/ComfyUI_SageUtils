# JavaScript Code Organization

This directory contains the JavaScript frontend code for Sage Utils custom nodes, organized into a modular structure for better maintainability.

## Directory Structure

```text
js/
├── sage.js                    # Main entry point and extension registration
├── shared/                    # Shared utilities and constants
│   ├── utils.js              # Common utilities and dynamic input setup
│   └── markdown.js           # Markdown rendering and styling utilities
├── nodes/                     # Individual node setup functions
│   ├── multiModelPicker.js   # Sage_MultiModelPicker node setup
│   ├── textSubstitution.js   # Sage_TextSubstitution node setup
│   ├── viewAnything.js       # Sage_ViewAnything node setup
│   ├── viewNotes.js          # Sage_ViewNotes node setup with file handling
│   └── modelInfoDisplay.js   # Sage_ModelInfoDisplay and Sage_LoraStackInfoDisplay setup
├── widgets/                   # Widget-related functionality
│   └── display.js            # Text, markdown, image, and video display widgets
└── docs/                      # Node documentation (existing)
```

## Module Responsibilities

### `sage.js` (Main Entry Point)

- Extension registration with ComfyUI
- Node type routing to appropriate setup functions
- Clean, minimal entry point

### `shared/utils.js`

- Common constants (`TypeSlot`, `TypeSlotEvent`, `_ID`)
- Generic dynamic input setup functionality
- Shared utilities used across multiple nodes

### `shared/markdown.js`

- Markdown to HTML rendering engine
- CSS styling for markdown elements
- Utilities for markdown display setup

### `widgets/display.js`

- Text widget creation and management
- Markdown display overlay functionality
- Image and video display widgets
- Widget update and content handling utilities

### `nodes/` Directory

Each file handles the setup for specific node types:

- **`multiModelPicker.js`**: Dynamic MODEL_INFO input handling
- **`textSubstitution.js`**: Dynamic STRING input handling with static input preservation
- **`viewAnything.js`**: Simple text/content display
- **`viewNotes.js`**: File selection and preview with API integration
- **`modelInfoDisplay.js`**: Markdown-formatted model/LoRA information display

## Benefits of This Structure

1. **Modularity**: Each component has a clear, focused responsibility
2. **Maintainability**: Changes to specific functionality are isolated to relevant files
3. **Reusability**: Shared utilities can be easily reused across nodes
4. **Scalability**: New nodes can be added easily by creating new files in `nodes/`
5. **Clarity**: The main entry point is clean and easy to understand
6. **Testing**: Individual modules can be tested in isolation

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

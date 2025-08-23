# js/nodes Directory Documentation

This directory contains the node setup functions for ComfyUI custom nodes that implement specialized functionality for model handling, text processing, and content display. All nodes in this directory are registered and initialized through the main `sage.js` file.

## Architecture Overview

The nodes follow a consistent pattern where each node type has its own setup function that:

1. Creates dynamic input slots based on configuration
2. Sets up widget display systems
3. Implements content preview and interaction capabilities
4. Integrates with ComfyUI's node graph system

All nodes are prefixed with the SageUtils identifier (`_ID` from `shared/utils.js`) and registered in `sage.js`.

## Node Files

### 1. multiModelPicker.js

**Purpose**: Simple wrapper for dynamic model input selection  
**Complexity**: Low  

**Key Functions:**

- `setupMultiModelPicker(nodeData)`: Main setup function
  - Creates dynamic input slots for model selection
  - Simple pass-through to `setupDynamicInputs` utility

**Usage**: Provides multi-model selection capability for workflows requiring multiple model inputs.

### 2. textSubstitution.js

**Purpose**: Advanced dynamic string input handling with substitution capabilities  
**Complexity**: High  

**Key Functions:**

- `setupTextSubstitution(nodeData)`: Main setup function
  - Sets up dynamic text input management
  - Implements substitution logic for text processing

**Key Features:**

- Dynamic input slot creation and management
- Text substitution and processing capabilities
- Complex input validation and handling
- Integration with ComfyUI's text processing pipeline

**Usage**: Advanced text processing node for dynamic content generation and substitution workflows.

### 3. viewAnything.js

**Purpose**: Generic text display node with configurable content  
**Complexity**: Low  

**Key Functions:**

- `setupViewAnything(nodeData)`: Main setup function
  - Creates text display widget
  - Sets up content preview capabilities

**Key Features:**

- Simple text content display
- Configurable display options
- Integration with widget display system

**Usage**: General-purpose text viewer for displaying any text content in the node graph.

### 4. viewNotes.js

**Purpose**: File selection and preview system with markdown support  
**Complexity**: Medium-High  

**Key Functions:**

- `setupViewNotes(nodeData)`: Main setup function and coordinator
- `updateFilesInWidget(widget, isNotesTab)`: File list population
- `addFileItem(widget, filename, isSelected, isNotesTab)`: Individual file item creation
- `selectFile(widget, filename, isNotesTab)`: File selection handler
- `previewFile(filePath, isNotesTab)`: File content preview
- `renderMarkdown(content)`: Markdown to HTML conversion
- `updatePreview(widget, content, contentType)`: Preview content display

**Key Features:**

- File browser interface with selection
- Markdown rendering support with syntax highlighting
- Preview system for text files
- Integration with notes tab functionality
- Dynamic content updates
- File type detection and appropriate rendering

**Usage**: Primary interface for browsing and previewing notes and documentation files within the workflow environment.

### 5. modelInfoDisplay.js

**Purpose**: Markdown-formatted model information display system  
**Complexity**: Medium  

**Key Functions:**

- `setupModelInfoDisplay(nodeData)`: Main setup function
- `updateContent(widget, content)`: Content update handler
- `createDisplayWidget(nodeData)`: Widget creation utility
- `setupScrollableContainer(widget)`: Scrollable display setup
- `renderMarkdownContent(content)`: Markdown rendering for model info

**Key Features:**

- Specialized model information display
- Markdown rendering with model-specific formatting
- Scrollable content area for large model descriptions
- Integration with model management system
- Dynamic content updates based on model selection

**Usage**: Displays detailed model information in markdown format, typically used alongside model selection nodes.

## Integration Points

### ComfyUI Node Registration

All nodes are registered in `sage.js` through a central dispatcher:

```javascript
// Node registration pattern
if (nodeData.name === _ID + "NodeName") {
    setupNodeName(nodeData);
    return;
}
```

### Shared Dependencies

- `shared/utils.js`: Provides `_ID` constant for node naming
- `shared/cacheUIComponents.js`: Widget creation and management utilities
- Various utility functions for file handling, markdown rendering, and UI interactions

### Widget System Integration

All nodes integrate with the custom widget display system that provides:

- Scrollable content areas
- File selection interfaces
- Markdown rendering capabilities
- Dynamic content updates
- Responsive layout management

## Development Patterns

### Dynamic Input Management

Most nodes implement dynamic input slot creation:

- Runtime addition/removal of input slots
- Type-specific input validation
- Integration with ComfyUI's connection system

### Content Preview Systems

Several nodes implement preview functionality:

- File content preview with appropriate rendering
- Markdown processing with syntax highlighting
- Scrollable display areas for large content

### Event Handling

Consistent event handling patterns:

- File selection events
- Content update events
- Widget interaction events
- Integration with ComfyUI's event system

## Usage Guidelines

1. **Node Setup**: All nodes are automatically registered when the extension loads
2. **Dynamic Inputs**: Nodes with dynamic inputs will show additional slots as configured
3. **Content Display**: Display nodes will show content in scrollable widgets
4. **File Integration**: Notes and file-related nodes integrate with the file system
5. **Markdown Support**: Nodes supporting markdown will render content with appropriate styling

## Maintenance Notes

- Node setup functions should follow the established pattern of single responsibility
- All file operations should include appropriate error handling
- Widget creation should use the shared utility functions for consistency
- Markdown rendering should be sanitized for security
- Dynamic input management should validate input types and connections

This directory represents the core node functionality for the SageUtils extension, providing specialized tools for model management, text processing, and content display within ComfyUI workflows.

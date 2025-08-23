# js/widgets Directory Documentation

This directory contains widget utility functions that provide specialized display and interaction capabilities for ComfyUI custom nodes. The widgets system enables rich content display including text, markdown, images, and videos within the node interface.

## Architecture Overview

The widgets system provides a standardized approach to creating and managing display widgets that:

1. Extend ComfyUI's native widget system with custom functionality
2. Support multiple content types with appropriate rendering
3. Provide overlay-based display for rich content presentation
4. Handle content updates and dynamic display switching
5. Integrate seamlessly with the node graph interface

The widgets are designed to work as overlays on top of standard ComfyUI text widgets, preserving compatibility while enhancing functionality.

## Widget Files

### display.js

**Purpose**: Core widget creation and content display utilities  
**Complexity**: High  

**Dependencies:**

- `ComfyWidgets` from ComfyUI core for base widget functionality
- `renderMarkdown, ensureMarkdownStyles` from `shared/markdown.js` for markdown processing

**Key Functions:**

#### Core Widget Management

- `createTextOutputWidget(node, app, widgetName = "output")`: Creates or retrieves text output widget
  - **Parameters**: node instance, ComfyUI app, optional widget name
  - **Returns**: Widget object with readonly text input
  - **Usage**: Base function for creating display widgets across all content types

- `updateTextWidget(widget, message)`: Updates widget content with defensive handling
  - **Parameters**: widget object, message with text content (array or string)
  - **Features**: Handles both array and string inputs, defensive programming for edge cases
  - **Usage**: Safe content updates for dynamic text display

#### Content Display Systems

- `setupMarkdownDisplay(widget, content)`: Creates markdown overlay with full HTML rendering
  - **Parameters**: text widget, markdown content string
  - **Features**:
    - Asynchronous initialization with retry logic
    - Complete textarea overlay with styled markdown
    - Automatic CSS injection for markdown elements
    - Responsive layout with scrolling support
    - Z-index management for proper display layering
  - **Usage**: Primary function for rich text content display

- `setupImageDisplay(widget, filename)`: Creates image overlay with error handling
  - **Parameters**: text widget, image filename
  - **Features**:
    - Direct image loading from notes directory
    - Responsive image scaling and centering
    - Comprehensive error handling with user feedback
    - Automatic overlay cleanup and replacement
    - Support for various image formats
  - **Usage**: Display images within node interface

- `setupVideoDisplay(widget, filename, isSupported = true)`: Creates video overlay with format validation
  - **Parameters**: text widget, video filename, format support flag
  - **Features**:
    - Browser-native video controls for supported formats
    - Detailed format compatibility information for unsupported files
    - Responsive video scaling and centering
    - Comprehensive error handling with codec information
    - Educational messaging about video format requirements
  - **Usage**: Display videos with format guidance

## Technical Architecture

### Overlay System Design

The widgets use an overlay approach that provides several advantages:

**Positioning Strategy:**

- Absolute positioning over existing ComfyUI text widgets
- Parent element modification to `position: relative` for proper containment
- Z-index management to ensure proper layering
- Automatic cleanup of previous overlays when switching content types

**Content Rendering:**

- **Markdown**: Full HTML rendering with syntax highlighting and styling
- **Images**: Responsive display with automatic scaling and centering
- **Videos**: Native browser controls with format compatibility checking
- **Text**: Fallback display in original textarea for compatibility

### Error Handling and Robustness

**Initialization Safety:**

- Asynchronous widget initialization with retry mechanisms
- Defensive programming for missing DOM elements
- Graceful fallbacks when advanced features are unavailable
- Comprehensive logging for debugging display issues

**Content Loading:**

- Error handling for failed image/video loads
- User-friendly error messages with actionable guidance
- Format validation and compatibility warnings
- Automatic fallback to text display when media fails

### Integration Points

**ComfyUI Integration:**

- Uses `ComfyWidgets["STRING"]` as the base widget type
- Preserves ComfyUI's widget management and serialization
- Maintains compatibility with node graph operations
- Respects ComfyUI's styling and theming conventions

**Shared System Dependencies:**

- Markdown rendering through `shared/markdown.js`
- File serving through custom server routes (`/sage_utils/read_notes_file`)
- CSS styling through `ensureMarkdownStyles()` injection
- Event handling integration with ComfyUI's event system

## Usage Patterns

### Node Integration

Widgets are typically used in node setup functions:

```javascript
import { createTextOutputWidget, setupMarkdownDisplay } from "../widgets/display.js";

// Create base widget
const widget = createTextOutputWidget(nodeData, app, "content");

// Set up content-specific display
setupMarkdownDisplay(widget, markdownContent);
```

### Content Type Switching

The overlay system allows dynamic switching between content types:

```javascript
// Switch from markdown to image
setupImageDisplay(widget, "image.png");

// Switch back to markdown
setupMarkdownDisplay(widget, "# New Content");
```

### Error Handling

All display functions include comprehensive error handling:

```javascript
// Image display with automatic error recovery
setupImageDisplay(widget, filename);
// Automatically shows error message if image fails to load

// Video display with format checking
setupVideoDisplay(widget, filename, isSupportedFormat);
// Shows format guidance for unsupported files
```

## File Dependencies

### Used By (Import Statements)

- `nodes/viewNotes.js`: All display functions for file preview system
- `nodes/modelInfoDisplay.js`: Text and markdown display functions
- `nodes/viewAnything.js`: Basic text display and update functions

### Dependency Graph

```text
widgets/display.js
├── ComfyWidgets (ComfyUI core)
├── shared/markdown.js
│   ├── renderMarkdown()
│   └── ensureMarkdownStyles()
└── Server routes
    └── /sage_utils/read_notes_file
```

## Development Guidelines

### Widget Creation Standards

1. **Base Widget Setup**: Always use `createTextOutputWidget()` as the foundation
2. **Overlay Management**: Clean up existing overlays before creating new ones
3. **Error Handling**: Include comprehensive error handling for all content types
4. **Responsive Design**: Ensure content scales properly within widget boundaries
5. **Accessibility**: Maintain keyboard navigation and screen reader compatibility

### Content Display Principles

1. **Graceful Degradation**: Always provide text fallback for rich content
2. **Performance**: Use lazy loading and efficient DOM manipulation
3. **User Feedback**: Provide clear error messages and loading states
4. **Format Support**: Clearly communicate supported and unsupported formats
5. **Consistency**: Maintain consistent styling across all content types

### Extension Patterns

When adding new content types:

1. Follow the overlay pattern established by existing functions
2. Include comprehensive error handling and user feedback
3. Provide format validation and compatibility information
4. Maintain consistency with existing styling and interaction patterns
5. Add appropriate cleanup and overlay management

## Maintenance Notes

- **Overlay Cleanup**: Ensure proper cleanup of DOM elements when switching content types
- **Memory Management**: Remove event listeners and references when widgets are destroyed
- **Style Isolation**: Maintain CSS encapsulation to avoid conflicts with ComfyUI styling
- **Browser Compatibility**: Test video and image support across different browsers
- **Performance**: Monitor DOM manipulation performance with large content

## Future Enhancement Opportunities

1. **Audio Support**: Add audio file display capabilities
2. **PDF Rendering**: Support for PDF file preview
3. **Code Highlighting**: Enhanced syntax highlighting for code blocks
4. **Interactive Elements**: Support for interactive content within widgets
5. **Thumbnail Generation**: Automatic thumbnail creation for media files

This directory provides the foundation for rich content display within ComfyUI nodes, enabling sophisticated user interfaces while maintaining compatibility with the existing ComfyUI ecosystem.

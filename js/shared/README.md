# js/shared Directory Documentation

This directory contains the core shared utilities and infrastructure that powers the SageUtils ComfyUI extension. These modules provide centralized functionality for state management, API communication, UI components, error handling, and specialized integrations that are used across multiple parts of the system.

## Architecture Overview

The shared system follows a modular architecture where each file has a specific responsibility:

1. **State Management**: Centralized state with reactive updates and debugging
2. **Configuration**: Single source of truth for all constants and settings
3. **API Communication**: Standardized interfaces for server communication
4. **UI Components**: Reusable interface elements with consistent styling
5. **Error Handling**: Comprehensive error management with user feedback
6. **External Integrations**: Specialized modules for third-party services
7. **Utility Functions**: Common operations and helper functions

All modules are designed to be independently testable while maintaining tight integration through well-defined interfaces.

## Core Infrastructure Files

### 1. config.js

**Purpose**: Centralized configuration and constants  
**Lines**: 364  
**Complexity**: Medium  

**Key Exports:**

- `FILE_TYPES`: File type detection patterns for images, videos, text, markdown
- `API_ENDPOINTS`: Complete API endpoint configuration for cache and notes operations
- `FILTER_OPTIONS`: Dropdown options for model filtering and sorting
- `BUTTON_CONFIGS`: Standardized button styling and behavior configurations
- `STYLES`: Comprehensive CSS styling system with colors, spacing, typography
- `ANIMATIONS`: Animation timing and easing configurations
- `PERFORMANCE`: Caching, debouncing, and batch processing settings
- `MESSAGES`: User feedback messages for errors, success, and loading states
- `DEBUG`: Development and debugging configuration flags
- `FEATURES`: Feature flags for progressive enhancement

**Utility Functions:**

- `getFileType(filename)`: Determines file type from filename
- `supportsPreview(fileType)`: Checks if file type supports preview
- `getFileTypeIcon(fileType)`: Returns appropriate Unicode icon for file type

**Usage**: Import specific constants or utility functions as needed. Provides single source of truth for all configuration values.

### 2. stateManager.js

**Purpose**: Centralized state management with reactive updates  
**Lines**: 270  
**Complexity**: High  

**Key Features:**

- **Reactive State System**: Automatic UI updates when state changes
- **Debugging Support**: Comprehensive state change logging and validation
- **Type Safety**: Detailed TypeScript-style type definitions in JSDoc
- **Immutable Updates**: State modification through controlled interface
- **Selective Updates**: Update specific parts of state without full refresh

**State Structure:**

- `activeTab`: Current tab selection ('models' or 'notes')
- `models`: Complete models tab state with filters, selection, cache data
- `notes`: Notes tab state with file selection, editing status, preview settings

**API:**

- `getState()`: Get current state snapshot
- `updateState(updates)`: Update state with partial changes
- `subscribe(listener)`: Subscribe to state changes
- `selectors`: Object containing getter functions for specific state parts

**Usage**: Central hub for all application state. All components should interact with state through this module.

### 3. errorHandler.js

**Purpose**: Standardized error handling and user feedback  
**Lines**: 340  
**Complexity**: High  

**Key Components:**

- `ERROR_LEVELS`: Severity classification (LOW, MEDIUM, HIGH, CRITICAL)
- `ERROR_CATEGORIES`: Error type categorization (NETWORK, VALIDATION, PERMISSION, etc.)
- `handleError(error, context)`: Main error processing function
- `createSafeWrapper(fn, context)`: Creates error-safe function wrappers
- `retryOperation(operation, options)`: Retry mechanism with exponential backoff

**Features:**

- **Contextual Error Handling**: Rich context information for debugging
- **User-Friendly Messages**: Automatic conversion to user-readable messages
- **Logging Integration**: Configurable logging based on debug settings
- **Error Tracking**: Placeholder for production error monitoring
- **Retry Logic**: Built-in retry mechanism for transient failures

**Usage**: Wrap critical operations with error handling. Provides consistent error experience across the application.

## API Communication Files

### 4. cacheApi.js

**Purpose**: Server communication for cache operations  
**Lines**: 163  
**Complexity**: Medium  

**Key Functions:**

- `fetchCacheHash()`: Retrieves file-to-hash mapping from server
- `fetchCacheInfo()`: Gets detailed model information by hash
- `updateCacheInfo(hash, newInfo)`: Updates model metadata on server
- `pullMetadata(hash)`: Initiates metadata pull from external sources

**Global State:**

- `cacheData`: Global cache storage with hash and info mappings

**Usage**: Primary interface for all cache-related server operations. Maintains local cache state synchronized with server.

### 5. civitai.js

**Purpose**: Civitai API integration and image handling  
**Lines**: 257  
**Complexity**: Medium-High  

**Key Functions:**

- `getCivitaiImageApiUrl(hash, options)`: Generates direct Civitai image URLs
- `getCivitaiModelApiUrl(modelId)`: Creates model API URLs
- `extractImageUrls(modelData, options)`: Extracts and filters image URLs
- `hasUpdateAvailable(currentVersion, allVersions)`: Checks for available updates
- `formatTriggerWords(triggerWords)`: Formats model trigger words for display

**Features:**

- **NSFW Filtering**: Configurable NSFW content filtering
- **Direct URL Generation**: Creates direct API URLs for browser loading
- **Update Detection**: Compares versions to detect available updates
- **Image Processing**: Handles image URL extraction and validation

**Usage**: Handles all Civitai-related operations including image loading, model metadata, and update checking.

## UI Infrastructure Files

### 6. cacheUI.js

**Purpose**: Reusable UI component factory functions  
**Lines**: 478  
**Complexity**: Medium-High  

**Component Categories:**

**Basic Elements:**

- `createLabeledContainer(labelText, marginBottom)`: Labeled container with consistent styling
- `createStyledSelect(options)`: Dropdown select with consistent theming
- `createStyledInput(type, placeholder)`: Text input with consistent styling
- `createStyledButton(text, backgroundColor, icon)`: Button with customizable styling

**Complex Components:**

- `createFilterSection(labelText, options)`: Complete filter section with label and dropdown
- `createSearchSection(labelText, placeholder)`: Search input with label
- `createToggleSection(labelText, checkboxId)`: Checkbox toggle with label
- `createCustomDropdown(buttonText)`: Advanced dropdown with custom styling
- `createProgressBar(labelText)`: Progress indicator with label and status

**Layout Components:**

- `createButtonContainer()`: Container for button groups
- Various utility functions for consistent spacing and theming

**Usage**: Building blocks for all UI elements. Ensures consistent styling and behavior across the application.

### 7. dialogManager.js

**Purpose**: Modal dialog and overlay management  
**Lines**: 461  
**Complexity**: Medium-High  

**Dialog Types:**

- `createDialog(options)`: Generic dialog factory with full customization
- `confirmDialog(message, title)`: Confirmation dialog with OK/Cancel
- `alertDialog(message, title)`: Simple alert dialog
- `promptDialog(message, defaultValue, title)`: Input prompt dialog
- `createImageDialog(imageSrc, title)`: Image preview dialog
- `createMetadataDialog(metadata, title)`: Metadata display dialog

**Features:**

- **Backdrop Management**: Blur effects and click-to-close functionality
- **Animation Support**: Smooth fade-in/fade-out animations
- **Responsive Design**: Adapts to different screen sizes
- **Keyboard Support**: ESC key handling for dialog closure
- **Stacking Support**: Multiple dialogs with proper z-index management

**Usage**: Handles all modal interactions throughout the application. Provides consistent dialog experience.

## Content Processing Files

### 8. markdown.js

**Purpose**: Markdown rendering and styling  
**Lines**: 155  
**Complexity**: Medium  

**Key Functions:**

- `renderMarkdown(text)`: Converts markdown to styled HTML
- `ensureMarkdownStyles()`: Injects CSS styles for markdown elements

**Supported Markdown:**

- Headers (H1-H6) with underlines for H1/H2
- Bold and italic text (** and __ for bold, * and _ for italic)
- Inline and block code with syntax highlighting styles
- Links with target="_blank" for external links
- Images with responsive sizing and error handling
- Blockquotes with styled left border
- Unordered and ordered lists
- Horizontal rules

**Features:**

- **HTML Escaping**: Prevents XSS injection while preserving formatting
- **CSS Injection**: Automatic style injection for consistent rendering
- **Responsive Images**: Images scale properly within containers
- **Error Handling**: Graceful handling of malformed markdown

**Usage**: Primary markdown processing for all text content display.

### 9. infoDisplay.js

**Purpose**: Model information display with Civitai integration  
**Lines**: 642  
**Complexity**: High  

**Key Functions:**

- `findAllModelVersions(modelId, currentHash)`: Finds all versions of a model
- `displayModelInfo(container, hash)`: Main model information display
- `updateModelDisplay(infoContainer, hash)`: Updates existing display
- `createVersionComparisonTable(allVersions, currentHash)`: Creates version comparison
- `createInfoSection(title, content, isMarkdown)`: Creates information sections

**Features:**

- **Version Comparison**: Shows local and remote model versions
- **Image Integration**: Displays model images from Civitai
- **Metadata Display**: Comprehensive model information formatting
- **Update Indicators**: Visual indicators for available updates
- **Responsive Layout**: Adapts to different container sizes

**Usage**: Primary interface for displaying detailed model information with version comparison and update detection.

### 10. reportGenerator.js (moved to js/reports/)

**Purpose**: HTML report generation for model collections (now located in `js/reports/reportGenerator.js`)  
**Lines**: 677  
**Complexity**: High  

**Key Functions:**

- `generateHtmlReport(allModels, reportConfig)`: Main report generation
- `createReportHeader(reportConfig, modelStats)`: Creates report header with statistics
- `formatModelRow(model, config)`: Formats individual model table rows
- `addSortingJavaScript()`: Adds interactive sorting functionality
- `getFileSize(filePath)`: Retrieves file size from server

**Features:**

- **Interactive Sorting**: Client-side table sorting with visual indicators
- **Responsive Design**: Mobile-friendly report layout
- **Image Integration**: Automatic image loading from Civitai
- **Filter Integration**: Reflects current filter settings in report
- **Statistics**: Model count and distribution statistics

**Note**: This module has been moved to `js/reports/reportGenerator.js` to better organize report-related functionality.

**Usage**: Generates comprehensive HTML reports for model collections with interactive features.

## Utility Files

### 11. utils.js

**Purpose**: Core constants and dynamic input utilities  
**Lines**: 94  
**Complexity**: Medium  

**Constants:**

- `TypeSlot`: Input/Output slot type enumeration
- `TypeSlotEvent`: Connect/Disconnect event enumeration  
- `_ID`: SageUtils identifier prefix for nodes

**Key Functions:**

- `createDynamicInputSetup(prefix, type)`: Factory for dynamic input node setup

**Features:**

- **Dynamic Input Management**: Runtime addition/removal of input slots
- **Type System Integration**: Works with ComfyUI's type system
- **Slot Renaming**: Automatic slot renaming with proper indexing
- **Connection Handling**: Manages connect/disconnect events

**Usage**: Provides foundational utilities for ComfyUI node integration and dynamic input management.

### 12. metadataCache.js

**Purpose**: Persistent local cache for image metadata (LRU + localStorage)

**Key Functions:**

- `MetadataCache.get(imageOrPath)`: Returns cached metadata or null
- `MetadataCache.set(imageOrPath, metadata)`: Stores metadata and persists between sessions
- `MetadataCache.isStale(imageOrPath)`: TTL-based staleness check
- `MetadataCache.getStats()`: Cache metrics (hits, misses, evictions)

**Features:**

- LRU eviction to cap storage size
- 30-day TTL by default
- Transparent integration in `imageUtils.loadImageMetadata()` so consumers get caching automatically

**Usage**: Typically accessed through `imageUtils.loadImageMetadata(image, { useCache: true })` and `imageUtils.getCachedImageMetadata(image)` when you want instant display followed by revalidation.

## Integration Architecture

### Dependency Graph

```text
shared/
├── config.js (foundation - no dependencies)
├── utils.js (foundation - no dependencies)
├── errorHandler.js (depends on config.js)
├── stateManager.js (depends on config.js, errorHandler.js)
├── api/cacheApi.js (depends on utils.js, errorHandler.js)
├── civitai.js (depends on config.js)
├── markdown.js (depends on config.js)
├── cacheUI.js (depends on config.js, stateManager.js)
├── dialogManager.js (depends on config.js)
└── infoDisplay.js (depends on stateManager.js, civitai.js)

**Reports Directory:**
└── reportGenerator.js (depends on civitai.js, config.js)
```

### Usage Patterns

**Sidebar Components:**

- Import state management, UI components, API functions, and error handling
- Use configuration constants for consistent styling
- Integrate with dialog manager for modal interactions

**Node Components:**

- Import utility functions for dynamic inputs
- Use component display systems and markdown rendering
- Integrate with error handling for robustness

**Cross-Module Communication:**

- State manager provides reactive updates across components
- Error handler ensures consistent error experience
- Configuration provides single source of truth for constants

## Development Guidelines

### Module Design Principles

1. **Single Responsibility**: Each module has one clear purpose
2. **Clear Dependencies**: Explicit imports with minimal coupling
3. **Error Resilience**: Comprehensive error handling throughout
4. **Configuration Driven**: Behavior controlled through config.js
5. **Type Safety**: Extensive JSDoc typing for better development experience

### Extension Patterns

When adding new shared functionality:

1. **Determine Module**: Place in appropriate existing module or create new one
2. **Follow Patterns**: Use established error handling and configuration patterns
3. **Update Dependencies**: Update documentation if creating new dependencies
4. **Add Testing**: Include error cases and edge conditions
5. **Document Integration**: Update this README with new functionality

### Performance Considerations

- **State Updates**: Use selective updates to avoid unnecessary re-renders
- **API Caching**: Leverage built-in caching mechanisms in cacheApi.js
- **Error Batching**: Group related errors to avoid spam
- **Memory Management**: Proper cleanup of event listeners and references

## Maintenance Notes

- **Configuration Changes**: Update config.js rather than hardcoding values
- **State Evolution**: Use migration patterns when changing state structure
- **API Changes**: Update cacheApi.js for server-side changes
- **Error Categories**: Add new error types to errorHandler.js as needed
- **UI Consistency**: Use cacheUI.js for new interface elements

This shared directory represents the foundation of the SageUtils extension, providing robust, reusable infrastructure that ensures consistent behavior, error handling, and user experience across all components of the system.

### Recently Added Modules

- `datasetTextGeneration.js`: UI factory that builds the LLM generation panel (preset selector, append/overwrite mode, actions). Consumed by `datasetTextManager.js` to keep the main editor lean and maintainable.
- `datasetTextBatchOps.js`: UI factory for batch operations (create missing text files, prepend/append text, find/replace) with callbacks for actions. Used by `datasetTextManager.js` to reduce size and improve reuse.
- `datasetTextOps.js`: Shared operational helper(s) for dataset text flows, including `processImagesInCurrentFolder(onItem)` to uniformly iterate images and aggregate counters + errors.

Notes:
- Both `datasetTextGeneration.js` and `datasetTextBatchOps.js` expose their content inside a collapsible panel via `components/collapsiblePanel.js`.
- We intentionally use Unicode caret glyphs (▾/▸) in these headers by explicit override of the repository's ASCII-only rule for better visual affordance. Be careful working near these characters; some search tools may not function properly around them.
- Batch Ops no longer uses a separate "Advanced" toggle; replace options (case sensitive, whole word, regex, dry run) are visible whenever the panel is expanded.

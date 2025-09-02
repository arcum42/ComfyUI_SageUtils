# Sidebar JavaScript Files Documentation

This directory contains the JavaScript files that implement the SageUtils sidebar functionality in ComfyUI. The sidebar provides a multi-tabbed interface for model browsing, notes management, and Civitai integration.

## File Overview

### 📁 Active Files

#### `cacheSidebar.js` - Main Sidebar Controller
**Purpose**: Main entry point and controller for the multi-tabbed sidebar interface

**Key Functions**:
- `createCacheSidebar(el)` - **Main Export** - Creates the complete sidebar with all tabs
- `createTabHeader()` - Creates tab navigation buttons (Models, Notes, Search)
- `createTabContent()` - Creates the content container for tab switching
- `setupTabSwitching(tabComponents, tabContent)` - Handles tab switching logic and events
- `initializeSidebarData()` - Initializes cache data, error handling, and periodic refresh

**Dependencies**:
- State management (`stateManager.js`)
- Configuration constants (`config.js`)
- Tab modules (`modelsTab.js`, `notesTab.js`, `civitaiSearchTab.js`)
- Cache API (`cacheApi.js`)
- UI components (`cacheUIComponents.js`)

**Functionality**:
- Multi-tab interface management
- Global error handling setup
- Cache data pre-loading and periodic refresh
- State change debugging and monitoring
- API connection verification

---

#### `modelsTab.js` - Model Browser Tab
**Purpose**: Provides model browsing, filtering, and detailed information display

**Key Functions**:
- `createModelsTab(container)` - **Main Export** - Creates the complete models tab
- `createModelsHeader()` - Creates tab title and description
- `createModelsFilterControls()` - Creates filtering UI (type, last used, updates, sort)
- `createModelsFileSelector()` - Creates dropdown file selector with folder structure
- `createModelsActionButtons()` - Creates action buttons (refresh, pull metadata, etc.)
- `setupModelsEventHandlers()` - Sets up all event handling for the tab
- `sortFiles(files, sortBy, hashData, infoData)` - Sorts files by various criteria
- `organizeFolderStructure(sortedFiles, hashData, infoData)` - Organizes files into folder hierarchy
- `createDropdownItems()` - Creates dropdown menu items for file selection
- `createSubmenu()` - Creates submenus for folders
- `createFileItem()` - Creates individual file items with model information
- `assembleModelsTabLayout()` - Assembles all components into final layout

**Features**:
- Advanced filtering by model type, usage, and updates
- Hierarchical file browser with folder organization
- Detailed model information display with Civitai integration
- Bulk operations (refresh cache, pull metadata, generate reports)
- Real-time search and filtering
- Model statistics and metadata display

**Data Sources**:
- Local cache hash data (file paths → hashes)
- Local cache info data (hashes → model metadata)
- Civitai API for enhanced model information

---

#### `notesTab.js` - Notes Manager Tab
**Purpose**: File editor and manager for notes and documentation

**Key Functions**:
- `createNotesTab(container)` - **Main Export** - Creates the complete notes tab
- `createNotesHeader()` - Creates tab title and description
- `createNotesFileList()` - Creates file browser for notes directory
- `createNotesEditor()` - Creates text editor with save/delete functionality
- `createNotesPreview()` - Creates preview pane for markdown and other formats
- `setupNotesEventHandlers()` - Sets up file selection, editing, and preview events
- `loadNotesFilesList(container)` - Loads and displays available notes files
- `assembleNotesTabLayout()` - Assembles all components into final layout

**Features**:
- File browser for notes directory
- Syntax-highlighted text editor
- Live markdown preview
- File operations (save, delete, create new)
- Support for multiple file types (txt, md, json, etc.)
- Auto-save indicators and modification tracking
- Split-pane layout with editor and preview

**File Operations**:
- Read files from server notes directory
- Save modified content back to server
- Delete files with confirmation
- Create new files with custom names
- File type detection and appropriate handling

---

#### `civitaiSearchTab.js` - Civitai Integration Tab
**Purpose**: Search, browse, and download models from Civitai marketplace

**Key Functions**:

**Search Features**:

**Model Information**:

**Download Integration**:

---

## Architecture Overview

### Data Flow
1. **Cache Data**: Models tab loads hash and info data from server cache
2. **State Management**: All tabs use centralized state management for persistence
3. **API Integration**: Civitai tab connects to external API for model discovery
4. **File Operations**: Notes tab performs server file operations via API

### Component Hierarchy
```
cacheSidebar.js (Main Controller)
├── modelsTab.js (Model Browser)
├── notesTab.js (Notes Manager)
└── civitaiSearchTab.js (Civitai Search)
```

- **Error Handling**: `../shared/errorHandler.js`

- Error handling centralized with specific error contexts

- Memory management for large file lists

## Integration Points

- Follows ComfyUI styling and UI patterns

- Metadata operations (`/sage_utils/pull_metadata`)

- Model download links and metadata
## 📋 Planned Extensions

### Image Gallery Tab (In Planning)
A comprehensive image gallery tab is planned as the fourth tab in the sidebar. See [IMAGE_GALLERY_TAB_IMPLEMENTATION.md](./IMAGE_GALLERY_TAB_IMPLEMENTATION.md) for detailed implementation specifications.

**Planned Features**:
- Browse images in Notes, Input, Output, and custom folders
- Thumbnail grid with lazy loading and virtual scrolling
- Full-resolution image viewer with metadata display
- Sort by name and creation date
- Copy images to clipboard
- Remember custom folder selections
- Performance optimizations for large image collections

---

*Documentation generated August 23, 2025 - Covers 5 files with comprehensive functionality for model management and discovery*  
*Implementation document for Image Gallery tab added September 1, 2025*

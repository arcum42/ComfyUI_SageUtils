/**
 * Model Browser Component
 * Provides a file browser-style list for model selection
 * Inspired by GenericFileBrowser but specialized for model cache display
 */

import { createButton, BUTTON_VARIANTS } from "../components/buttons.js";
import { createCard } from "../components/layout.js";
import { copyToClipboard } from "../components/clipboard.js";

/**
 * Model Browser Class
 * Handles model listing, selection, filtering, and display
 */
export class ModelBrowser {
    /**
     * Creates a new ModelBrowser instance
     * @param {Object} options - Configuration options
     * @param {string} options.selectionMode - 'single' or 'multi'
     * @param {boolean} options.showThumbnails - Show model preview images
     * @param {string} options.itemHeight - Height of each list item ('auto' or specific value)
     * @param {boolean} options.groupByFolder - Group models by folder type
     * @param {boolean} options.showFileSize - Display file size badge
     * @param {boolean} options.showLastUsed - Display last used badge
     * @param {boolean} options.allowQuickActions - Show quick action buttons on hover
     * @param {Function} options.onSelect - Callback when model is selected
     * @param {Function} options.onDoubleClick - Callback when model is double-clicked
     * @param {Function} options.onQuickAction - Callback when quick action is triggered
     */
    constructor(options = {}) {
        this.options = {
            selectionMode: 'single',     // 'single' or 'multi'
            showThumbnails: false,       // Show model thumbnails (future enhancement)
            itemHeight: 'auto',          // Height of each item
            groupByFolder: false,        // Group by folder type (future enhancement)
            showFileSize: true,          // Display file size
            showLastUsed: true,          // Display last used date
            allowQuickActions: true,     // Show quick action buttons on hover
            maxHeight: '400px',          // Max height of browser container
            ...options
        };
        
        // Model data
        this.models = [];                // Full model list
        this.filteredModels = [];        // Filtered/sorted model list
        this.currentFilters = {};        // Current filter state
        
        // Selection state
        this.selectedModels = new Set(); // Set of selected model hashes
        this.hoveredModel = null;        // Currently hovered model hash
        
        // Folder hierarchy state
        this.expandedFolders = new Set(); // Set of expanded folder paths
        this.showHierarchy = options.showHierarchy !== undefined ? options.showHierarchy : true;
        this.defaultExpanded = options.defaultExpanded !== undefined ? options.defaultExpanded : false;
        
        // UI references
        this.container = null;
        this.listContainer = null;
        this.emptyMessage = null;
        
        // Event callbacks
        this.callbacks = {
            onSelect: options.onSelect || (() => {}),
            onDoubleClick: options.onDoubleClick || (() => {}),
            onQuickAction: options.onQuickAction || (() => {})
        };
        
        // Keyboard navigation state
        this.highlightedIndex = -1;
        
        // Bind methods
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }
    
    /**
     * Renders the model browser UI
     * @param {HTMLElement} parentContainer - Container to append the browser to
     * @returns {HTMLElement} The browser container element
     */
    render(parentContainer) {
        // Create main container using layout component
        this.container = createCard({
            padding: '0',
            styles: {
                marginBottom: '15px',
                overflow: 'hidden'
            }
        });
        
        // Create header
        const header = this.createHeader();
        this.container.appendChild(header);
        
        // Create scrollable list container
        this.listContainer = document.createElement('div');
        this.listContainer.className = 'model-browser-list';
        this.listContainer.style.cssText = `
            max-height: ${this.options.maxHeight};
            overflow-y: auto;
            overflow-x: hidden;
            background: #2a2a2a;
            border-top: 1px solid #444;
        `;
        
        // Create empty message (initially hidden)
        this.emptyMessage = document.createElement('div');
        this.emptyMessage.className = 'model-browser-empty';
        this.emptyMessage.style.cssText = `
            padding: 40px 20px;
            text-align: center;
            color: #888;
            font-style: italic;
            display: none;
        `;
        this.emptyMessage.textContent = 'No models found';
        this.listContainer.appendChild(this.emptyMessage);
        
        this.container.appendChild(this.listContainer);
        
        // Add to parent container
        if (parentContainer) {
            parentContainer.appendChild(this.container);
        }
        
        // Set up keyboard navigation and accessibility
        this.container.addEventListener('keydown', this.handleKeyDown);
        this.container.setAttribute('tabindex', '0');
        this.container.setAttribute('role', 'application');
        this.container.setAttribute('aria-label', 'Model Browser');
        
        // Make list container a listbox for screen readers
        this.listContainer.setAttribute('role', 'listbox');
        this.listContainer.setAttribute('aria-label', 'Models');
        
        return this.container;
    }
    
    /**
     * Creates the header section
     * @returns {HTMLElement} Header element
     */
    createHeader() {
        const header = document.createElement('div');
        header.className = 'model-browser-header';
        header.style.cssText = `
            padding: 12px 15px;
            background: #333;
            border-bottom: 1px solid #444;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
        `;
        
        const leftSection = document.createElement('div');
        leftSection.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
        `;
        
        const title = document.createElement('h4');
        title.style.cssText = `
            margin: 0;
            color: #4CAF50;
            font-size: 14px;
            font-weight: bold;
        `;
        title.textContent = 'Model Browser';
        
        // View mode toggle button
        const viewToggle = document.createElement('button');
        viewToggle.className = 'view-toggle-btn';
        viewToggle.textContent = this.showHierarchy ? '📁' : '📄';
        viewToggle.title = this.showHierarchy ? 'Switch to flat view' : 'Switch to folder view';
        viewToggle.style.cssText = `
            background: #444;
            color: #ddd;
            border: 1px solid #555;
            border-radius: 4px;
            padding: 4px 8px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        `;
        
        viewToggle.addEventListener('click', () => {
            this.showHierarchy = !this.showHierarchy;
            viewToggle.textContent = this.showHierarchy ? '📁' : '📄';
            viewToggle.title = this.showHierarchy ? 'Switch to flat view' : 'Switch to folder view';
            
            // Toggle expand/collapse button visibility
            if (this.expandCollapseBtn) {
                this.expandCollapseBtn.style.display = this.showHierarchy ? 'block' : 'none';
            }
            
            this.renderList();
        });
        
        viewToggle.addEventListener('mouseenter', () => {
            viewToggle.style.background = '#555';
        });
        
        viewToggle.addEventListener('mouseleave', () => {
            viewToggle.style.background = '#444';
        });
        
        leftSection.appendChild(title);
        leftSection.appendChild(viewToggle);
        
        const rightSection = document.createElement('div');
        rightSection.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        // Expand/Collapse All button (only shown in hierarchy mode)
        const expandCollapseBtn = document.createElement('button');
        expandCollapseBtn.className = 'expand-collapse-btn';
        expandCollapseBtn.textContent = 'Expand All';
        expandCollapseBtn.title = 'Expand or collapse all folders';
        expandCollapseBtn.style.cssText = `
            background: #444;
            color: #ddd;
            border: 1px solid #555;
            border-radius: 4px;
            padding: 4px 8px;
            cursor: pointer;
            font-size: 11px;
            transition: all 0.2s;
            display: ${this.showHierarchy ? 'block' : 'none'};
        `;
        this.expandCollapseBtn = expandCollapseBtn;
        
        expandCollapseBtn.addEventListener('click', () => {
            if (this.expandedFolders.size > 0) {
                // Collapse all
                this.expandedFolders.clear();
                expandCollapseBtn.textContent = 'Expand All';
            } else {
                // Expand all - need to collect all folder paths
                this.expandAllFolders();
                expandCollapseBtn.textContent = 'Collapse All';
            }
            this.renderList();
        });
        
        expandCollapseBtn.addEventListener('mouseenter', () => {
            expandCollapseBtn.style.background = '#555';
        });
        
        expandCollapseBtn.addEventListener('mouseleave', () => {
            expandCollapseBtn.style.background = '#444';
        });
        
        const count = document.createElement('span');
        count.className = 'model-count';
        count.style.cssText = `
            color: #888;
            font-size: 12px;
        `;
        count.textContent = '0 models';
        this.countElement = count;
        
        rightSection.appendChild(expandCollapseBtn);
        rightSection.appendChild(count);
        
        header.appendChild(leftSection);
        header.appendChild(rightSection);
        
        return header;
    }
    
    /**
     * Creates a single model list item
     * @param {Object} modelData - Model data object
     * @param {number} index - Index in filtered list
     * @param {number} depth - Nesting depth for indentation
     * @returns {HTMLElement} Model item element
     */
    createModelItem(modelData, index, depth = 0) {
        const { hash, path, info } = modelData;
        const isSelected = this.selectedModels.has(hash);
        const isHighlighted = this.highlightedIndex === index;
        
        // Create item container
        const item = document.createElement('div');
        item.className = 'model-browser-item';
        item.dataset.hash = hash;
        item.dataset.index = index;
        
        // ARIA attributes for accessibility
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', isSelected.toString());
        const modelName = info?.model?.name || info?.name || path.split('/').pop();
        item.setAttribute('aria-label', `Model: ${modelName}`);
        
        item.style.cssText = `
            padding: 12px 15px;
            padding-left: ${15 + (depth * 20)}px;
            border-bottom: 1px solid #333;
            cursor: pointer;
            transition: all 0.15s ease;
            background: ${isSelected ? '#2d5a2d' : isHighlighted ? '#353535' : '#2a2a2a'};
            border-left: 4px solid ${isSelected ? '#4CAF50' : 'transparent'};
            position: relative;
            box-shadow: ${isSelected ? 'inset 0 0 10px rgba(76, 175, 80, 0.2)' : 'none'};
        `;
        
        // Hover effects
        item.addEventListener('mouseenter', () => {
            if (!isSelected) {
                item.style.background = '#353535';
            } else {
                item.style.background = '#358a35';
            }
            this.hoveredModel = hash;
            
            // Show quick actions if enabled
            if (this.options.allowQuickActions) {
                const quickActions = item.querySelector('.model-quick-actions');
                if (quickActions) {
                    quickActions.style.opacity = '1';
                    quickActions.style.pointerEvents = 'auto';
                }
            }
        });
        
        item.addEventListener('mouseleave', () => {
            if (!isSelected) {
                item.style.background = isHighlighted ? '#353535' : '#2a2a2a';
            } else {
                item.style.background = '#2d5a2d';
            }
            this.hoveredModel = null;
            
            // Hide quick actions
            if (this.options.allowQuickActions) {
                const quickActions = item.querySelector('.model-quick-actions');
                if (quickActions) {
                    quickActions.style.opacity = '0';
                    quickActions.style.pointerEvents = 'none';
                }
            }
        });
        
        // Main content
        const content = this.createModelItemContent(modelData);
        item.appendChild(content);
        
        // Quick actions (if enabled)
        if (this.options.allowQuickActions) {
            const quickActions = this.createQuickActions(hash);
            item.appendChild(quickActions);
        }
        
        // Click handler for selection
        item.addEventListener('click', (e) => {
            // Don't trigger if clicking on quick action buttons
            if (e.target.closest('.model-quick-actions')) {
                return;
            }
            this.handleModelSelect(hash, e.ctrlKey || e.metaKey);
        });
        
        // Double-click handler
        item.addEventListener('dblclick', (e) => {
            if (!e.target.closest('.model-quick-actions')) {
                this.callbacks.onDoubleClick(hash, modelData);
            }
        });
        
        return item;
    }
    
    /**
     * Creates the main content for a model item
     * @param {Object} modelData - Model data
     * @returns {HTMLElement} Content element
     */
    createModelItemContent(modelData) {
        const { hash, path, info } = modelData;
        
        const content = document.createElement('div');
        content.className = 'model-item-content';
        content.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 4px;
        `;
        
        // Top row: Icon + Name + Badges
        const topRow = document.createElement('div');
        topRow.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        // Model type icon
        const icon = this.getModelTypeIcon(info);
        const iconSpan = document.createElement('span');
        iconSpan.style.cssText = `
            font-size: 16px;
            flex-shrink: 0;
        `;
        iconSpan.textContent = icon;
        topRow.appendChild(iconSpan);
        
        // Model name (version name or filename)
        const name = document.createElement('div');
        name.style.cssText = `
            flex: 1;
            color: #fff;
            font-size: 13px;
            font-weight: 500;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        `;
        
        const modelName = info?.model?.name || '';
        const versionName = info?.name || '';
        const displayName = versionName 
            ? (modelName ? `${modelName} - ${versionName}` : versionName)
            : (modelName || this.getFileNameFromPath(path));
        
        name.textContent = displayName;
        name.title = displayName; // Show full name on hover
        topRow.appendChild(name);
        
        // Metadata badge (if has metadata)
        if (info && Object.keys(info).length > 0) {
            const metaBadge = this.createBadge('✨', '#4CAF50', 'Has metadata');
            topRow.appendChild(metaBadge);
        }
        
        content.appendChild(topRow);
        
        // File path row
        const pathRow = document.createElement('div');
        pathRow.style.cssText = `
            color: #888;
            font-size: 11px;
            padding-left: 24px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        `;
        pathRow.textContent = path;
        pathRow.title = path; // Show full path on hover
        content.appendChild(pathRow);
        
        // Metadata row: File size, Last used, etc.
        if (this.options.showFileSize || this.options.showLastUsed) {
            const metaRow = document.createElement('div');
            metaRow.style.cssText = `
                display: flex;
                gap: 12px;
                color: #888;
                font-size: 11px;
                padding-left: 24px;
                align-items: center;
            `;
            
            // File size
            if (this.options.showFileSize && info?.file_size) {
                const sizeSpan = document.createElement('span');
                sizeSpan.textContent = `📊 ${this.formatFileSize(info.file_size)}`;
                metaRow.appendChild(sizeSpan);
            }
            
            // Last used
            if (this.options.showLastUsed && info?.last_used) {
                const lastUsedSpan = document.createElement('span');
                lastUsedSpan.textContent = `🕐 ${this.formatLastUsed(info.last_used)}`;
                metaRow.appendChild(lastUsedSpan);
            }
            
            // Has updates badge
            if (info?.has_update) {
                const updateBadge = this.createBadge('🆕', '#FF9800', 'Update available');
                metaRow.appendChild(updateBadge);
            }
            
            if (metaRow.children.length > 0) {
                content.appendChild(metaRow);
            }
        }
        
        return content;
    }
    
    /**
     * Creates quick action buttons for a model
     * @param {string} hash - Model hash
     * @returns {HTMLElement} Quick actions container
     */
    createQuickActions(hash) {
        const container = document.createElement('div');
        container.className = 'model-quick-actions';
        container.style.cssText = `
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            gap: 6px;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.15s ease;
            background: linear-gradient(to left, #2a2a2a 70%, transparent);
            padding-left: 20px;
        `;
        
        // Copy hash button
        const copyHashBtn = createButton('📋', {
            variant: BUTTON_VARIANTS.SECONDARY,
            title: 'Copy hash to clipboard',
            onClick: () => {
                copyToClipboard(hash, 'Model hash copied!');
                this.callbacks.onQuickAction('copyHash', hash);
            },
            style: {
                padding: '4px 8px',
                fontSize: '12px',
                minWidth: '30px',
                height: '26px'
            }
        });
        container.appendChild(copyHashBtn);
        
        // Pull metadata button
        const pullBtn = createButton('⬇️', {
            variant: BUTTON_VARIANTS.SECONDARY,
            title: 'Pull metadata from Civitai',
            onClick: () => {
                this.callbacks.onQuickAction('pull', hash);
            },
            style: {
                padding: '4px 8px',
                fontSize: '12px',
                minWidth: '30px',
                height: '26px'
            }
        });
        container.appendChild(pullBtn);
        
        // Edit button
        const editBtn = createButton('✏️', {
            variant: BUTTON_VARIANTS.SECONDARY,
            title: 'Edit model information',
            onClick: () => {
                this.callbacks.onQuickAction('edit', hash);
            },
            style: {
                padding: '4px 8px',
                fontSize: '12px',
                minWidth: '30px',
                height: '26px'
            }
        });
        container.appendChild(editBtn);
        
        return container;
    }
    
    /**
     * Creates a badge element
     * @param {string} text - Badge text
     * @param {string} color - Badge color
     * @param {string} title - Tooltip text
     * @returns {HTMLElement} Badge element
     */
    createBadge(text, color, title) {
        const badge = document.createElement('span');
        badge.style.cssText = `
            display: inline-flex;
            align-items: center;
            padding: 2px 6px;
            background: ${color}22;
            color: ${color};
            border: 1px solid ${color}44;
            border-radius: 3px;
            font-size: 10px;
            font-weight: 500;
            white-space: nowrap;
        `;
        badge.textContent = text;
        badge.title = title;
        return badge;
    }
    
    /**
     * Handles model selection
     * @param {string} hash - Model hash
     * @param {boolean} isMultiSelect - Whether Ctrl/Cmd key is pressed
     */
    handleModelSelect(hash, isMultiSelect = false) {
        if (this.options.selectionMode === 'single') {
            // Single selection mode
            this.selectedModels.clear();
            this.selectedModels.add(hash);
        } else {
            // Multi selection mode
            if (isMultiSelect) {
                if (this.selectedModels.has(hash)) {
                    this.selectedModels.delete(hash);
                } else {
                    this.selectedModels.add(hash);
                }
            } else {
                this.selectedModels.clear();
                this.selectedModels.add(hash);
            }
        }
        
        // Update visual states
        this.updateSelectionVisuals();
        
        // Get model data
        const modelData = this.filteredModels.find(m => m.hash === hash);
        
        // Trigger callback
        this.callbacks.onSelect(hash, modelData);
    }
    
    /**
     * Updates visual selection states of all items
     */
    updateSelectionVisuals() {
        const items = this.listContainer.querySelectorAll('.model-browser-item');
        items.forEach(item => {
            const hash = item.dataset.hash;
            const isSelected = this.selectedModels.has(hash);
            const index = parseInt(item.dataset.index);
            const isHighlighted = this.highlightedIndex === index;
            
            // Update visual styling with more prominent selected state
            item.style.background = isSelected ? '#2d5a2d' : isHighlighted ? '#353535' : '#2a2a2a';
            item.style.borderLeftColor = isSelected ? '#4CAF50' : 'transparent';
            item.style.borderLeftWidth = isSelected ? '4px' : '4px';
            item.style.boxShadow = isSelected ? 'inset 0 0 10px rgba(76, 175, 80, 0.2)' : 'none';
            
            // Update ARIA attributes for accessibility
            item.setAttribute('aria-selected', isSelected.toString());
            
            // Add focus indicator for highlighted item
            if (isHighlighted) {
                item.style.outline = '2px solid #4CAF50';
                item.style.outlineOffset = '-2px';
            } else {
                item.style.outline = 'none';
            }
        });
    }
    
    /**
     * Handles keyboard navigation
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyDown(e) {
        if (this.filteredModels.length === 0 && e.key !== 'Escape') return;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                // Initialize to first item if no highlight
                if (this.highlightedIndex === -1) {
                    this.highlightedIndex = 0;
                } else {
                    this.highlightedIndex = Math.min(
                        this.highlightedIndex + 1,
                        this.filteredModels.length - 1
                    );
                }
                this.updateSelectionVisuals();
                this.scrollToHighlighted();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                // Initialize to first item if no highlight
                if (this.highlightedIndex === -1) {
                    this.highlightedIndex = 0;
                } else {
                    this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
                }
                this.updateSelectionVisuals();
                this.scrollToHighlighted();
                break;
                
            case 'Enter':
            case ' ': // Spacebar also selects
                e.preventDefault();
                if (this.highlightedIndex >= 0 && this.highlightedIndex < this.filteredModels.length) {
                    const model = this.filteredModels[this.highlightedIndex];
                    this.handleModelSelect(model.hash, e.ctrlKey || e.metaKey);
                }
                break;
                
            case 'Home':
                e.preventDefault();
                this.highlightedIndex = 0;
                this.updateSelectionVisuals();
                this.scrollToHighlighted();
                break;
                
            case 'End':
                e.preventDefault();
                this.highlightedIndex = this.filteredModels.length - 1;
                this.updateSelectionVisuals();
                this.scrollToHighlighted();
                break;
                
            case 'Escape':
                e.preventDefault();
                this.clearSelection();
                this.highlightedIndex = -1;
                this.updateSelectionVisuals();
                break;
                
            case 'PageDown':
                e.preventDefault();
                // Jump down by ~10 items
                this.highlightedIndex = Math.min(
                    this.highlightedIndex + 10,
                    this.filteredModels.length - 1
                );
                this.updateSelectionVisuals();
                this.scrollToHighlighted();
                break;
                
            case 'PageUp':
                e.preventDefault();
                // Jump up by ~10 items
                this.highlightedIndex = Math.max(this.highlightedIndex - 10, 0);
                this.updateSelectionVisuals();
                this.scrollToHighlighted();
                break;
        }
    }
    
    /**
     * Scrolls to the highlighted item
     */
    scrollToHighlighted() {
        const items = this.listContainer.querySelectorAll('.model-browser-item');
        const highlightedItem = items[this.highlightedIndex];
        
        if (highlightedItem) {
            highlightedItem.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }
    
    /**
     * Updates the model list
     * @param {Array} models - Array of model objects {hash, path, info}
     */
    updateModels(models) {
        console.log('[ModelBrowser] updateModels called with', models.length, 'models');
        this.models = models;
        this.applyFilters(this.currentFilters);
    }
    
    /**
     * Applies filters and sorting to the model list
     * @param {Object} filters - Filter configuration
     */
    applyFilters(filters = {}) {
        this.currentFilters = filters;
        
        // Start with full model list
        let filtered = [...this.models];
        
        // Apply search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(model => {
                const name = (model.info?.model?.name || '').toLowerCase();
                const version = (model.info?.name || '').toLowerCase();
                const path = model.path.toLowerCase();
                return name.includes(searchLower) || 
                       version.includes(searchLower) || 
                       path.includes(searchLower);
            });
        }
        
        // Apply folder type filter
        if (filters.type && filters.type !== 'all') {
            filtered = filtered.filter(model => {
                const folderType = this.getFolderType(model.path);
                return folderType === filters.type;
            });
        }
        
        // Apply last used filter
        if (filters.lastUsed && filters.lastUsed !== 'all') {
            const now = Date.now();
            filtered = filtered.filter(model => {
                // Check both lastUsed and last_accessed properties (matches V1 behavior)
                const lastUsedValue = model.info?.lastUsed || model.info?.last_accessed;
                
                if (filters.lastUsed === 'never') {
                    // Show models that have never been used
                    return !lastUsedValue;
                }
                
                // For time-based filters, model must have been used
                if (!lastUsedValue) return false;
                
                const lastUsed = new Date(lastUsedValue).getTime();
                const diffDays = (now - lastUsed) / (1000 * 60 * 60 * 24);
                
                switch (filters.lastUsed) {
                    case 'today':
                        return diffDays < 1;
                    case 'week':
                        return diffDays < 7;
                    case 'month':
                        return diffDays < 30;
                    default:
                        return true;
                }
            });
        }
        
        // Apply updates filter
        if (filters.updates && filters.updates !== 'all') {
            filtered = filtered.filter(model => {
                // Use update_available property (matches V1 behavior)
                const hasUpdate = model.info?.update_available || false;
                
                if (filters.updates === 'available') {
                    // Show only models with updates available
                    return hasUpdate;
                } else if (filters.updates === 'none') {
                    // Show only models without updates available
                    return !hasUpdate;
                }
                return true;
            });
        }
        
        // Apply sorting
        const sortBy = (filters.sort || 'name').replace(/-desc$/, '');
        const isDescending = (filters.sort || '').endsWith('-desc');
        
        filtered.sort((a, b) => {
            let comparison = 0;
            
            switch (sortBy) {
                case 'name':
                    const nameA = (a.info?.model?.name || this.getFileNameFromPath(a.path)).toLowerCase();
                    const nameB = (b.info?.model?.name || this.getFileNameFromPath(b.path)).toLowerCase();
                    comparison = nameA.localeCompare(nameB);
                    break;
                    
                case 'lastused':
                    // Check both lastUsed and last_accessed properties (matches V1 behavior)
                    const lastUsedA = (a.info?.lastUsed || a.info?.last_accessed) ? new Date(a.info.lastUsed || a.info.last_accessed).getTime() : 0;
                    const lastUsedB = (b.info?.lastUsed || b.info?.last_accessed) ? new Date(b.info.lastUsed || b.info.last_accessed).getTime() : 0;
                    comparison = lastUsedB - lastUsedA; // Most recent first
                    break;
                    
                case 'size':
                    const sizeA = a.info?.file_size || 0;
                    const sizeB = b.info?.file_size || 0;
                    comparison = sizeB - sizeA; // Largest first
                    break;
                    
                case 'type':
                    const typeA = this.getFolderType(a.path);
                    const typeB = this.getFolderType(b.path);
                    comparison = typeA.localeCompare(typeB);
                    break;
            }
            
            return isDescending ? -comparison : comparison;
        });
        
        console.log('[ModelBrowser] After filtering:', filtered.length, 'models (from', this.models.length, 'total)');
        
        this.filteredModels = filtered;
        this.renderList();
    }
    
    /**
     * Renders or re-renders the model list
     */
    /**
     * Renders the model list (either flat or hierarchical)
     */
    renderList() {
        const startTime = performance.now();
        
        // Clear existing items (except empty message)
        const items = this.listContainer.querySelectorAll('.model-browser-item, .model-folder-item');
        items.forEach(item => item.remove());
        
        // Update count
        if (this.countElement) {
            const count = this.filteredModels.length;
            this.countElement.textContent = `${count} model${count !== 1 ? 's' : ''}`;
        }
        
        // Show empty message if no models
        if (this.filteredModels.length === 0) {
            this.emptyMessage.style.display = 'block';
            return;
        } else {
            this.emptyMessage.style.display = 'none';
        }
        
        if (this.showHierarchy) {
            // Build and render hierarchical view
            this.renderHierarchical();
        } else {
            // Render flat list
            this.renderFlat();
        }
        
        // Reset highlighted index if out of range
        if (this.highlightedIndex >= this.filteredModels.length) {
            this.highlightedIndex = this.filteredModels.length - 1;
        }
        
        const renderTime = performance.now() - startTime;
        console.log(`[ModelBrowser] Rendered ${this.filteredModels.length} models in ${renderTime.toFixed(2)}ms`);
    }
    
    /**
     * Renders models in a flat list
     */
    /**
     * Renders models in flat list view
     * Uses batch rendering for better performance with large lists
     */
    renderFlat() {
        const BATCH_SIZE = 50; // Render 50 items at a time
        let currentIndex = 0;
        
        const renderBatch = () => {
            const endIndex = Math.min(currentIndex + BATCH_SIZE, this.filteredModels.length);
            const fragment = document.createDocumentFragment();
            
            for (let i = currentIndex; i < endIndex; i++) {
                const item = this.createModelItem(this.filteredModels[i], i);
                fragment.appendChild(item);
            }
            
            this.listContainer.appendChild(fragment);
            currentIndex = endIndex;
            
            if (currentIndex < this.filteredModels.length) {
                requestAnimationFrame(renderBatch);
            }
        };
        
        renderBatch();
    }
    
    /**
     * Renders models in hierarchical folder structure
     */
    renderHierarchical() {
        const hierarchy = this.buildFolderHierarchy(this.filteredModels);
        this.renderFolderNode(hierarchy, this.listContainer, 0);
    }
    
    /**
     * Builds a folder hierarchy from model list
     * @param {Array} models - List of models
     * @returns {Object} Hierarchy tree
     */
    buildFolderHierarchy(models) {
        const root = { children: {}, models: [] };
        
        models.forEach(model => {
            // Extract relative path after base folder (checkpoints, loras, etc.)
            const parts = this.getRelativePathParts(model.path);
            
            if (parts.length === 0) {
                // No subdirectories, add to root
                root.models.push(model);
            } else {
                // Navigate/create folder structure
                let current = root;
                const folderPath = parts.slice(0, -1); // All but filename
                
                folderPath.forEach(part => {
                    if (!current.children[part]) {
                        current.children[part] = { children: {}, models: [], name: part };
                    }
                    current = current.children[part];
                });
                
                // Add model to deepest folder
                current.models.push(model);
            }
        });
        
        return root;
    }
    
    /**
     * Gets path parts relative to base folder
     * @param {string} fullPath - Full model path
     * @returns {Array<string>} Path parts after base folder
     */
    getRelativePathParts(fullPath) {
        // Normalize path separators
        const normalized = fullPath.replace(/\\/g, '/');
        
        // Find the base folder (checkpoints, loras, etc.)
        const baseFolders = ['checkpoints', 'loras', 'embeddings', 'vae', 'controlnet', 'upscale_models', 'clip_vision'];
        let baseIndex = -1;
        let baseFolder = '';
        
        for (const folder of baseFolders) {
            const index = normalized.toLowerCase().indexOf(`/${folder}/`);
            if (index !== -1) {
                baseIndex = index + folder.length + 2; // After "/folder/"
                baseFolder = folder;
                break;
            }
        }
        
        if (baseIndex === -1) {
            // No base folder found, use full path
            return normalized.split('/').filter(p => p);
        }
        
        // Get path after base folder
        const relativePath = normalized.substring(baseIndex);
        return relativePath.split('/').filter(p => p);
    }
    
    /**
     * Renders a folder node and its contents
     * @param {Object} node - Folder node
     * @param {HTMLElement} container - Container element
     * @param {number} depth - Nesting depth
     * @param {string} fullPath - Full path to this node
     */
    renderFolderNode(node, container, depth, fullPath = '') {
        // Render models at this level first
        node.models.forEach(model => {
            const item = this.createModelItem(model, -1, depth);
            container.appendChild(item);
        });
        
        // Render child folders
        Object.keys(node.children).sort().forEach(folderName => {
            const childNode = node.children[folderName];
            const childPath = fullPath ? `${fullPath}/${folderName}` : folderName;
            
            // Create folder item
            const folderItem = this.createFolderItem(folderName, childNode, childPath, depth);
            container.appendChild(folderItem);
            
            // If expanded, render children
            if (this.expandedFolders.has(childPath) || this.defaultExpanded) {
                if (!this.expandedFolders.has(childPath) && this.defaultExpanded) {
                    this.expandedFolders.add(childPath);
                }
                this.renderFolderNode(childNode, container, depth + 1, childPath);
            }
        });
    }
    
    /**
     * Creates a folder item element
     * @param {string} name - Folder name
     * @param {Object} node - Folder node
     * @param {string} fullPath - Full path to folder
     * @param {number} depth - Nesting depth
     * @returns {HTMLElement} Folder element
     */
    createFolderItem(name, node, fullPath, depth) {
        const isExpanded = this.expandedFolders.has(fullPath);
        const modelCount = this.countModelsInNode(node);
        
        const item = document.createElement('div');
        item.className = 'model-folder-item';
        item.dataset.folderPath = fullPath;
        item.style.cssText = `
            padding: 8px 12px;
            padding-left: ${12 + depth * 20}px;
            background: #252525;
            border-bottom: 1px solid #333;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            user-select: none;
        `;
        
        // Expand/collapse icon
        const icon = document.createElement('span');
        icon.className = 'folder-icon';
        icon.textContent = isExpanded ? '▼' : '▶';
        icon.style.cssText = `
            font-size: 10px;
            color: #888;
            width: 12px;
            transition: transform 0.2s;
        `;
        
        // Folder icon
        const folderIcon = document.createElement('span');
        folderIcon.textContent = isExpanded ? '📂' : '📁';
        folderIcon.style.cssText = `
            font-size: 14px;
        `;
        
        // Folder name
        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;
        nameSpan.style.cssText = `
            flex: 1;
            color: #ddd;
            font-weight: 500;
        `;
        
        // Model count badge
        const badge = document.createElement('span');
        badge.textContent = modelCount;
        badge.style.cssText = `
            background: #444;
            color: #aaa;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 11px;
        `;
        
        item.appendChild(icon);
        item.appendChild(folderIcon);
        item.appendChild(nameSpan);
        item.appendChild(badge);
        
        // Click handler to toggle expansion
        item.addEventListener('click', () => {
            this.toggleFolder(fullPath);
        });
        
        // Hover effects
        item.addEventListener('mouseenter', () => {
            item.style.background = '#2d2d2d';
        });
        
        item.addEventListener('mouseleave', () => {
            item.style.background = '#252525';
        });
        
        return item;
    }
    
    /**
     * Counts total models in a node and its children
     * @param {Object} node - Folder node
     * @returns {number} Total model count
     */
    countModelsInNode(node) {
        let count = node.models.length;
        Object.values(node.children).forEach(child => {
            count += this.countModelsInNode(child);
        });
        return count;
    }
    
    /**
     * Toggles a folder's expansion state
     * @param {string} folderPath - Folder path
     */
    toggleFolder(folderPath) {
        if (this.expandedFolders.has(folderPath)) {
            this.expandedFolders.delete(folderPath);
        } else {
            this.expandedFolders.add(folderPath);
        }
        this.renderList();
    }
    
    /**
     * Expands all folders in the hierarchy
     */
    expandAllFolders() {
        const collectFolderPaths = (node, parentPath = '') => {
            Object.keys(node.children).forEach(folderName => {
                const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName;
                this.expandedFolders.add(folderPath);
                collectFolderPaths(node.children[folderName], folderPath);
            });
        };
        
        const hierarchy = this.buildFolderHierarchy(this.filteredModels);
        collectFolderPaths(hierarchy);
    }
    
    /**
     * Gets the currently selected model hash(es)
     * @returns {string|Array<string>} Selected hash or array of hashes
     */
    getSelected() {
        if (this.options.selectionMode === 'single') {
            return this.selectedModels.size > 0 
                ? Array.from(this.selectedModels)[0] 
                : null;
        } else {
            return Array.from(this.selectedModels);
        }
    }
    
    /**
     * Clears all selections
     */
    clearSelection() {
        this.selectedModels.clear();
        this.updateSelectionVisuals();
    }
    
    /**
     * Sets selection programmatically
     * @param {string|Array<string>} hashOrHashes - Hash or array of hashes to select
     */
    setSelected(hashOrHashes) {
        this.selectedModels.clear();
        
        const hashes = Array.isArray(hashOrHashes) ? hashOrHashes : [hashOrHashes];
        
        hashes.forEach(hash => {
            if (this.options.selectionMode === 'single' && this.selectedModels.size > 0) {
                return; // Only allow one selection in single mode
            }
            this.selectedModels.add(hash);
        });
        
        this.updateSelectionVisuals();
    }
    
    /**
     * Destroys the browser and cleans up event listeners
     */
    destroy() {
        if (this.container) {
            this.container.removeEventListener('keydown', this.handleKeyDown);
            this.container.remove();
        }
        
        this.models = [];
        this.filteredModels = [];
        this.selectedModels.clear();
        this.container = null;
        this.listContainer = null;
    }
    
    // ==================== Utility Methods ====================
    
    /**
     * Gets icon for model type
     * @param {Object} info - Model info object
     * @returns {string} Icon emoji
     */
    getModelTypeIcon(info) {
        if (!info || !info.model) return '📦';
        
        const type = info.model.type || info.model_type;
        
        switch (type?.toLowerCase()) {
            case 'checkpoint':
                return '🎨';
            case 'lora':
            case 'lycoris':
                return '🎯';
            case 'textualinversion':
            case 'embedding':
                return '💬';
            case 'vae':
                return '🔧';
            case 'controlnet':
                return '🎮';
            default:
                return '📦';
        }
    }
    
    /**
     * Extracts filename from full path
     * @param {string} path - Full file path
     * @returns {string} Filename
     */
    getFileNameFromPath(path) {
        return path.split('/').pop().split('\\').pop();
    }
    
    /**
     * Gets folder type from path
     * @param {string} path - File path
     * @returns {string} Folder type
     */
    getFolderType(path) {
        const pathLower = path.toLowerCase();
        
        if (pathLower.includes('/checkpoints/') || pathLower.includes('\\checkpoints\\')) {
            return 'checkpoints';
        } else if (pathLower.includes('/loras/') || pathLower.includes('\\loras\\')) {
            return 'loras';
        } else if (pathLower.includes('/embeddings/') || pathLower.includes('\\embeddings\\')) {
            return 'embeddings';
        } else if (pathLower.includes('/vae/') || pathLower.includes('\\vae\\')) {
            return 'vae';
        } else if (pathLower.includes('/controlnet/') || pathLower.includes('\\controlnet\\')) {
            return 'controlnet';
        }
        
        return 'other';
    }
    
    /**
     * Formats file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted size
     */
    formatFileSize(bytes) {
        if (!bytes) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Formats last used timestamp for display
     * @param {string|number} timestamp - Last used timestamp
     * @returns {string} Formatted relative time
     */
    formatLastUsed(timestamp) {
        if (!timestamp) return 'Never';
        
        const now = Date.now();
        const lastUsed = new Date(timestamp).getTime();
        const diffMs = now - lastUsed;
        
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
        return `${Math.floor(diffDays / 365)}y ago`;
    }
}

// Default export
export default ModelBrowser;

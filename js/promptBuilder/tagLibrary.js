/**
 * Tag Library Component
 * Provides UI for managing and using tag collections for prompt building
 */

import { tagApi } from '../shared/api/tagApi.js';
import { createButton, BUTTON_VARIANTS } from '../components/buttons.js';
import { copyToClipboard } from '../components/clipboard.js';
import { showToast, NOTIFICATION_TYPES } from '../shared/notifications.js';
import { ensurePromptBuilderStyles } from './promptBuilderStyles.js';

/**
 * Tag Library class for managing the tag system UI
 */
export class TagLibrary {
    constructor(options = {}) {
        this.options = {
            allowEdit: true,
            showSearch: true,
            compactMode: false,
            onTagInsert: null,
            onTagSetInsert: null,
            ...options
        };
        
        this.tagLibrary = null;
        this.activeCategory = null;
        this.searchQuery = '';
        this.container = null;
        
        // UI elements
        this.categoryTabs = null;
        this.searchInput = null;
        this.tagContainer = null;
        this.actionBar = null;
    }

    /**
     * Create the tag library component
     * @param {HTMLElement} container - Container element
     * @returns {Promise<HTMLElement>} - Created component element
     */
    async create(container) {
        this.container = container;
        
        // Clear the container first
        container.innerHTML = '';
        
        // Load tag library data
        await this.loadTagLibrary();
        
        // Create main structure
        const wrapper = document.createElement('div');
        wrapper.className = 'tag-library-wrapper';

        // Create header with search and actions
        if (this.options.showSearch || this.options.allowEdit) {
            const header = this.createHeader();
            wrapper.appendChild(header);
        }

        // Create category tabs
        const tabsContainer = this.createCategoryTabs();
        wrapper.appendChild(tabsContainer);

        // Create content area
        const contentArea = this.createContentArea();
        wrapper.appendChild(contentArea);

        // Add styles
        this.addStyles();

        // Set initial active category
        if (this.tagLibrary?.categories?.length > 0) {
            this.setActiveCategory(this.tagLibrary.categories[0].id);
        }

        // Append to container
        container.appendChild(wrapper);

        return wrapper;
    }

    /**
     * Load tag library from server
     */
    async loadTagLibrary() {
        try {
            const result = await tagApi.getTagLibrary();
            if (result.success) {
                this.tagLibrary = result.data;
            } else {
                console.error('Failed to load tag library:', result.error);
                this.tagLibrary = this.getEmptyLibrary();
            }
        } catch (error) {
            console.error('Error loading tag library:', error);
            this.tagLibrary = this.getEmptyLibrary();
        }
    }

    /**
     * Get empty library structure
     */
    getEmptyLibrary() {
        return {
            version: '1.0',
            categories: [],
            metadata: {
                total_categories: 0,
                total_tags: 0,
                total_sets: 0
            }
        };
    }

    /**
     * Create the header section
     */
    createHeader() {
        const header = document.createElement('div');
        header.className = 'tag-library-header';

        if (this.options.showSearch) {
            const searchContainer = document.createElement('div');
            searchContainer.className = 'search-container';

            this.searchInput = document.createElement('input');
            this.searchInput.type = 'text';
            this.searchInput.placeholder = 'Search tags...';
            this.searchInput.className = 'tag-search-input';
            
            this.searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.updateTagDisplay();
            });

            const searchIcon = document.createElement('span');
            searchIcon.className = 'search-icon';
            searchIcon.textContent = '🔍';

            searchContainer.appendChild(searchIcon);
            searchContainer.appendChild(this.searchInput);
            header.appendChild(searchContainer);
        }

        if (this.options.allowEdit) {
            this.actionBar = document.createElement('div');
            this.actionBar.className = 'tag-library-actions';

            const addCategoryBtn = this.createButton('+ Category', () => this.showAddCategoryDialog());
            addCategoryBtn.className = 'btn btn-primary btn-sm';
            
            const refreshBtn = this.createButton('🔄', () => this.refreshLibrary());
            refreshBtn.className = 'btn btn-secondary btn-sm';
            refreshBtn.title = 'Refresh library';

            const resetBtn = this.createButton('🔄 Reset to Defaults', () => this.resetToDefaults());
            resetBtn.className = 'btn btn-warning btn-sm';
            resetBtn.title = 'Reset tag library to default categories and tags';

            const mergeBtn = this.createButton('+ Add Defaults', () => this.mergeWithDefaults());
            mergeBtn.className = 'btn btn-info btn-sm';
            mergeBtn.title = 'Add default categories and tags to current library';

            this.actionBar.appendChild(addCategoryBtn);
            this.actionBar.appendChild(refreshBtn);
            this.actionBar.appendChild(resetBtn);
            this.actionBar.appendChild(mergeBtn);
            header.appendChild(this.actionBar);
        }

        return header;
    }

    /**
     * Create category tabs
     */
    createCategoryTabs() {
        const tabsWrapper = document.createElement('div');
        tabsWrapper.className = 'category-tabs-wrapper';

        this.categoryTabs = document.createElement('div');
        this.categoryTabs.className = 'category-tabs';

        this.updateCategoryTabs();
        
        tabsWrapper.appendChild(this.categoryTabs);
        return tabsWrapper;
    }

    /**
     * Update category tabs display
     */
    updateCategoryTabs() {
        if (!this.categoryTabs) return;
        
        this.categoryTabs.innerHTML = '';

        if (!this.tagLibrary?.categories?.length) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-categories-message';
            emptyMsg.textContent = 'No categories found. Click "+ Category" to add one.';
            this.categoryTabs.appendChild(emptyMsg);
            return;
        }

        this.tagLibrary.categories
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .forEach(category => {
                const tab = this.createCategoryTab(category);
                this.categoryTabs.appendChild(tab);
            });
    }

    /**
     * Create a single category tab
     */
    createCategoryTab(category) {
        const tab = document.createElement('button');
        tab.className = 'category-tab';
        tab.setAttribute('data-category-id', category.id);
        
        if (this.activeCategory === category.id) {
            tab.classList.add('active');
        }

        // Add category color if specified
        if (category.color) {
            tab.style.borderBottomColor = category.color;
        }

        const name = document.createElement('span');
        name.className = 'category-name';
        name.textContent = category.name;

        const count = document.createElement('span');
        count.className = 'category-count';
        const tagCount = (category.tags?.length || 0) + (category.sets?.length || 0);
        count.textContent = `(${tagCount})`;

        tab.appendChild(name);
        tab.appendChild(count);

        tab.addEventListener('click', () => {
            this.setActiveCategory(category.id);
        });

        if (this.options.allowEdit) {
            tab.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showCategoryContextMenu(category, e.clientX, e.clientY);
            });
        }

        return tab;
    }

    /**
     * Create content area
     */
    createContentArea() {
        this.tagContainer = document.createElement('div');
        this.tagContainer.className = 'tag-content-area';

        return this.tagContainer;
    }

    /**
     * Set active category
     */
    setActiveCategory(categoryId) {
        this.activeCategory = categoryId;
        
        // Update tab states
        const tabs = this.categoryTabs?.querySelectorAll('.category-tab');
        tabs?.forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-category-id') === categoryId);
        });

        // Update content display
        this.updateTagDisplay();
    }

    /**
     * Update tag display for active category
     */
    updateTagDisplay() {
        if (!this.tagContainer || !this.activeCategory) return;

        this.tagContainer.innerHTML = '';

        const category = this.tagLibrary?.categories?.find(c => c.id === this.activeCategory);
        if (!category) {
            this.tagContainer.innerHTML = '<div class="no-category">Category not found</div>';
            return;
        }

        // Filter tags and sets based on search query
        const filteredTags = this.filterTags(category.tags || []);
        const filteredSets = this.filterTagSets(category.sets || []);

        // Create tag sets section
        if (filteredSets.length > 0) {
            const setsSection = this.createTagSetsSection(filteredSets, category);
            this.tagContainer.appendChild(setsSection);
        }

        // Create individual tags section
        if (filteredTags.length > 0) {
            const tagsSection = this.createTagsSection(filteredTags, category);
            this.tagContainer.appendChild(tagsSection);
        }

        // Show empty state if no content
        if (filteredTags.length === 0 && filteredSets.length === 0) {
            const emptyState = this.createEmptyState(category);
            this.tagContainer.appendChild(emptyState);
        }
    }

    /**
     * Filter tags based on search query
     */
    filterTags(tags) {
        if (!this.searchQuery) return tags;
        const query = this.searchQuery.toLowerCase();
        return tags.filter(tag => tag.toLowerCase().includes(query));
    }

    /**
     * Filter tag sets based on search query
     */
    filterTagSets(sets) {
        if (!this.searchQuery) return sets;
        const query = this.searchQuery.toLowerCase();
        return sets.filter(set => 
            set.name.toLowerCase().includes(query) ||
            set.tags?.some(tag => tag.toLowerCase().includes(query))
        );
    }

    /**
     * Create tag sets section
     */
    createTagSetsSection(tagSets, category) {
        const section = document.createElement('div');
        section.className = 'tag-sets-section';

        const header = document.createElement('div');
        header.className = 'section-header';
        
        const title = document.createElement('h4');
        title.textContent = '📦 Tag Sets';
        title.className = 'section-title';

        if (this.options.allowEdit) {
            const addSetBtn = this.createButton('+', () => this.showAddTagSetDialog(category));
            addSetBtn.className = 'btn btn-sm btn-outline add-set-btn';
            addSetBtn.title = 'Add tag set';
            header.appendChild(title);
            header.appendChild(addSetBtn);
        } else {
            header.appendChild(title);
        }

        section.appendChild(header);

        const setsGrid = document.createElement('div');
        setsGrid.className = 'tag-sets-grid';

        tagSets.forEach(tagSet => {
            const setElement = this.createTagSetElement(tagSet, category);
            setsGrid.appendChild(setElement);
        });

        section.appendChild(setsGrid);
        return section;
    }

    /**
     * Create individual tag set element
     */
    createTagSetElement(tagSet, category) {
        const setElement = document.createElement('div');
        setElement.className = 'tag-set';

        const header = document.createElement('div');
        header.className = 'tag-set-header';

        const name = document.createElement('span');
        name.className = 'tag-set-name';
        name.textContent = tagSet.name;

        const count = document.createElement('span');
        count.className = 'tag-set-count';
        count.textContent = `${tagSet.tags?.length || 0} tags`;

        header.appendChild(name);
        header.appendChild(count);

        if (this.options.allowEdit) {
            const actions = document.createElement('div');
            actions.className = 'tag-set-actions';
            
            const editBtn = this.createButton('✏️', () => this.showEditTagSetDialog(tagSet, category));
            editBtn.className = 'btn btn-xs';
            editBtn.title = 'Edit tag set';
            
            const deleteBtn = this.createButton('🗑️', () => this.deleteTagSet(tagSet, category));
            deleteBtn.className = 'btn btn-xs btn-danger';
            deleteBtn.title = 'Delete tag set';
            
            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);
            header.appendChild(actions);
        }

        setElement.appendChild(header);

        // Add description if available
        if (tagSet.description) {
            const description = document.createElement('div');
            description.className = 'tag-set-description';
            description.textContent = tagSet.description;
            setElement.appendChild(description);
        }

        // Add tags preview
        const tagsPreview = document.createElement('div');
        tagsPreview.className = 'tag-set-preview';
        
        const previewTags = (tagSet.tags || []).slice(0, 5);
        previewTags.forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'preview-tag';
            tagSpan.textContent = tag;
            tagsPreview.appendChild(tagSpan);
        });

        if (tagSet.tags?.length > 5) {
            const more = document.createElement('span');
            more.className = 'preview-more';
            more.textContent = `+${tagSet.tags.length - 5} more`;
            tagsPreview.appendChild(more);
        }

        setElement.appendChild(tagsPreview);

        // Add click handler for tag insertion
        setElement.addEventListener('click', () => {
            this.insertTagSet(tagSet);
        });

        return setElement;
    }

    /**
     * Create individual tags section
     */
    createTagsSection(tags, category) {
        const section = document.createElement('div');
        section.className = 'individual-tags-section';

        const header = document.createElement('div');
        header.className = 'section-header';
        
        const title = document.createElement('h4');
        title.textContent = '🏷️ Individual Tags';
        title.className = 'section-title';

        if (this.options.allowEdit) {
            const addTagBtn = this.createButton('+', () => this.showAddTagDialog(category));
            addTagBtn.className = 'btn btn-sm btn-outline add-tag-btn';
            addTagBtn.title = 'Add tag';
            header.appendChild(title);
            header.appendChild(addTagBtn);
        } else {
            header.appendChild(title);
        }

        section.appendChild(header);

        const tagsGrid = document.createElement('div');
        tagsGrid.className = 'tags-grid';

        tags.forEach(tag => {
            const tagElement = this.createTagElement(tag, category);
            tagsGrid.appendChild(tagElement);
        });

        section.appendChild(tagsGrid);
        return section;
    }

    /**
     * Create individual tag element
     */
    createTagElement(tag, category) {
        const tagElement = document.createElement('span');
        tagElement.className = 'individual-tag';
        tagElement.textContent = tag;

        if (this.options.allowEdit) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'tag-delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.title = 'Remove tag';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteTag(tag, category);
            });
            tagElement.appendChild(deleteBtn);
        }

        tagElement.addEventListener('click', () => {
            this.insertTag(tag);
        });

        return tagElement;
    }

    /**
     * Create empty state
     */
    createEmptyState(category) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';

        if (this.searchQuery) {
            emptyState.innerHTML = `
                <div class="empty-icon">🔍</div>
                <div class="empty-title">No tags found</div>
                <div class="empty-message">No tags match "${this.searchQuery}" in ${category.name}</div>
            `;
        } else {
            emptyState.innerHTML = `
                <div class="empty-icon">🏷️</div>
                <div class="empty-title">No tags yet</div>
                <div class="empty-message">Add some tags to the ${category.name} category</div>
            `;
            
            if (this.options.allowEdit) {
                const addBtn = this.createButton('Add First Tag', () => this.showAddTagDialog(category));
                addBtn.className = 'btn btn-primary';
                emptyState.appendChild(addBtn);
            }
        }

        return emptyState;
    }

    /**
     * Create a button element
     * @deprecated Use createButton() from buttons.js instead
     */
    createButton(text, onClick) {
        return createButton(text, {
            variant: BUTTON_VARIANTS.SECONDARY,
            size: 'small',
            marginTop: '4px',
            onClick
        });
    }

    /**
     * Insert a tag into the active prompt field
     */
    async insertTag(tag) {
        if (this.options.onTagInsert) {
            this.options.onTagInsert(tag);
        } else {
            // Default behavior - copy to clipboard
            const success = await copyToClipboard(tag);
            if (success) {
                showToast(`Copied "${tag}" to clipboard`, NOTIFICATION_TYPES.SUCCESS);
            } else {
                showToast('Failed to copy to clipboard', NOTIFICATION_TYPES.ERROR);
            }
        }
    }

    /**
     * Insert a tag set into the active prompt field
     */
    async insertTagSet(tagSet) {
        const tagsText = tagSet.tags?.join(', ') || '';
        if (this.options.onTagSetInsert) {
            this.options.onTagSetInsert(tagSet, tagsText);
        } else if (this.options.onTagInsert) {
            this.options.onTagInsert(tagsText);
        } else {
            // Default behavior - copy to clipboard
            const success = await copyToClipboard(tagsText);
            if (success) {
                showToast(`Copied "${tagSet.name}" tag set to clipboard`, NOTIFICATION_TYPES.SUCCESS);
            } else {
                showToast('Failed to copy to clipboard', NOTIFICATION_TYPES.ERROR);
            }
        }
    }

    /**
     * Show add category dialog
     */
    showAddCategoryDialog() {
        // This would show a modal dialog for adding categories
        // For now, use a simple prompt
        const name = prompt('Enter category name:');
        if (name) {
            const id = tagApi.generateId(name);
            const newCategory = {
                id,
                name,
                description: '',
                color: '#4a9eff',
                order: this.tagLibrary.categories.length,
                tags: [],
                sets: []
            };
            this.addCategory(newCategory);
        }
    }

    /**
     * Show add tag dialog
     */
    showAddTagDialog(category) {
        const tag = prompt(`Add tag to "${category.name}":`);
        if (tag) {
            this.addTag(tag, category);
        }
    }

    /**
     * Show add tag set dialog
     */
    showAddTagSetDialog(category) {
        const name = prompt(`Enter tag set name for "${category.name}":`);
        if (name) {
            const tags = prompt('Enter tags (comma separated):');
            if (tags) {
                const tagArray = tags.split(',').map(t => t.trim()).filter(t => t);
                const newSet = {
                    id: tagApi.generateId(name),
                    name,
                    description: '',
                    tags: tagArray
                };
                this.addTagSet(newSet, category);
            }
        }
    }

    /**
     * Show edit tag set dialog
     */
    showEditTagSetDialog(tagSet, category) {
        const name = prompt(`Edit tag set name:`, tagSet.name);
        if (name && name !== tagSet.name) {
            tagSet.name = name;
        }
        
        const description = prompt(`Edit description (optional):`, tagSet.description || '');
        tagSet.description = description || '';
        
        const tagsText = prompt(`Edit tags (comma separated):`, tagSet.tags.join(', '));
        if (tagsText) {
            const tagArray = tagsText.split(',').map(t => t.trim()).filter(t => t);
            tagSet.tags = tagArray;
            
            // Save the updated tag set
            this.updateTagSet(tagSet, category);
        }
    }

    /**
     * Show category context menu
     */
    showCategoryContextMenu(category, x, y) {
        // Simple implementation using confirm dialogs
        // In a real implementation, this would show a proper context menu
        const action = prompt(`Category "${category.name}" actions:\n1. Edit\n2. Delete\n3. Add Tag\n4. Add Tag Set\n\nEnter number (1-4):`);
        
        switch(action) {
            case '1':
                this.showEditCategoryDialog(category);
                break;
            case '2':
                this.deleteCategory(category);
                break;
            case '3':
                this.showAddTagDialog(category);
                break;
            case '4':
                this.showAddTagSetDialog(category);
                break;
        }
    }

    /**
     * Show edit category dialog
     */
    showEditCategoryDialog(category) {
        const name = prompt(`Edit category name:`, category.name);
        if (name && name !== category.name) {
            category.name = name;
            category.id = tagApi.generateId(name); // Update ID based on new name
        }
        
        const description = prompt(`Edit description (optional):`, category.description || '');
        category.description = description || '';
        
        const color = prompt(`Edit color (hex code):`, category.color || '#4a9eff');
        if (color && color.match(/^#[0-9A-Fa-f]{6}$/)) {
            category.color = color;
        }
        
        // Save the updated category
        this.updateCategory(category);
    }

    /**
     * Add a new category
     */
    async addCategory(category) {
        try {
            const result = await tagApi.saveCategory(category);
            if (result.success) {
                await this.refreshLibrary();
                this.setActiveCategory(category.id);
                this.showToast(`Category "${category.name}" added successfully`);
            } else {
                showToast(`Failed to add category: ${result.error}`, NOTIFICATION_TYPES.ERROR);
            }
        } catch (error) {
            showToast(`Error adding category: ${error.message}`, NOTIFICATION_TYPES.ERROR);
        }
    }

    /**
     * Add a tag to category
     */
    async addTag(tag, category) {
        try {
            const result = await tagApi.addTagToCategory(category.id, tag);
            if (result.success) {
                await this.refreshLibrary();
                this.updateTagDisplay();
                this.showToast(`Tag "${tag}" added successfully`);
            } else {
                showToast(`Failed to add tag: ${result.error}`, NOTIFICATION_TYPES.ERROR);
            }
        } catch (error) {
            showToast(`Error adding tag: ${error.message}`, NOTIFICATION_TYPES.ERROR);
        }
    }

    /**
     * Add a tag set to category
     */
    async addTagSet(tagSet, category) {
        try {
            const result = await tagApi.addTagSetToCategory(category.id, tagSet);
            if (result.success) {
                await this.refreshLibrary();
                this.updateTagDisplay();
                this.showToast(`Tag set "${tagSet.name}" added successfully`);
            } else {
                showToast(`Failed to add tag set: ${result.error}`, NOTIFICATION_TYPES.ERROR);
            }
        } catch (error) {
            showToast(`Error adding tag set: ${error.message}`, NOTIFICATION_TYPES.ERROR);
        }
    }

    /**
     * Delete a tag from category
     */
    async deleteTag(tag, category) {
        if (!confirm(`Remove "${tag}" from "${category.name}"?`)) return;
        
        try {
            const result = await tagApi.removeTagFromCategory(category.id, tag);
            if (result.success) {
                await this.refreshLibrary();
                this.updateTagDisplay();
                this.showToast(`Tag "${tag}" removed successfully`);
            } else {
                showToast(`Failed to remove tag: ${result.error}`, NOTIFICATION_TYPES.ERROR);
            }
        } catch (error) {
            showToast(`Error removing tag: ${error.message}`, NOTIFICATION_TYPES.ERROR);
        }
    }

    /**
     * Delete a tag set from category
     */
    async deleteTagSet(tagSet, category) {
        if (!confirm(`Delete tag set "${tagSet.name}"?`)) return;
        
        try {
            const result = await tagApi.removeTagSetFromCategory(category.id, tagSet.id);
            if (result.success) {
                await this.refreshLibrary();
                this.updateTagDisplay();
                this.showToast(`Tag set "${tagSet.name}" deleted successfully`);
            } else {
                showToast(`Failed to delete tag set: ${result.error}`, NOTIFICATION_TYPES.ERROR);
            }
        } catch (error) {
            showToast(`Error deleting tag set: ${error.message}`, NOTIFICATION_TYPES.ERROR);
        }
    }

    /**
     * Update a category
     */
    async updateCategory(category) {
        try {
            const result = await tagApi.saveCategory(category);
            if (result.success) {
                await this.refreshLibrary();
                this.setActiveCategory(category.id);
                this.showToast(`Category "${category.name}" updated successfully`);
            } else {
                showToast(`Failed to update category: ${result.error}`, NOTIFICATION_TYPES.ERROR);
            }
        } catch (error) {
            showToast(`Error updating category: ${error.message}`, NOTIFICATION_TYPES.ERROR);
        }
    }

    /**
     * Update a tag set
     */
    async updateTagSet(tagSet, category) {
        try {
            // Remove the old tag set and add the updated one
            const result = await tagApi.removeTagSetFromCategory(category.id, tagSet.id);
            if (result.success) {
                const addResult = await tagApi.addTagSetToCategory(category.id, tagSet);
                if (addResult.success) {
                    await this.refreshLibrary();
                    this.updateTagDisplay();
                    this.showToast(`Tag set "${tagSet.name}" updated successfully`);
                } else {
                    showToast(`Failed to update tag set: ${addResult.error}`, NOTIFICATION_TYPES.ERROR);
                }
            } else {
                showToast(`Failed to update tag set: ${result.error}`, NOTIFICATION_TYPES.ERROR);
            }
        } catch (error) {
            showToast(`Error updating tag set: ${error.message}`, NOTIFICATION_TYPES.ERROR);
        }
    }

    /**
     * Delete a category
     */
    async deleteCategory(category) {
        if (!confirm(`Delete category "${category.name}" and all its tags and sets?`)) return;
        
        try {
            const result = await tagApi.deleteCategory(category.id);
            if (result.success) {
                await this.refreshLibrary();
                // Set active category to first available or null
                if (this.tagLibrary?.categories?.length > 0) {
                    this.setActiveCategory(this.tagLibrary.categories[0].id);
                } else {
                    this.activeCategory = null;
                    this.updateTagDisplay();
                }
                this.showToast(`Category "${category.name}" deleted successfully`);
            } else {
                showToast(`Failed to delete category: ${result.error}`, NOTIFICATION_TYPES.ERROR);
            }
        } catch (error) {
            showToast(`Error deleting category: ${error.message}`, NOTIFICATION_TYPES.ERROR);
        }
    }

    /**
     * Refresh library from server
     */
    async refreshLibrary() {
        tagApi.clearCache();
        await this.loadTagLibrary();
        this.updateCategoryTabs();
        this.updateTagDisplay();
    }

    /**
     * Reset tag library to defaults
     */
    async resetToDefaults() {
        const confirmed = confirm(
            'This will replace your entire tag library with the default categories and tags.\n\n' +
            'All your custom categories, tags, and tag sets will be lost.\n\n' +
            'Are you sure you want to continue?'
        );
        
        if (!confirmed) return;

        try {
            // Load default library structure from the server
            const defaultLibrary = await this.loadDefaultLibrary();
            if (!defaultLibrary) {
                showToast('Failed to load default library', NOTIFICATION_TYPES.ERROR);
                return;
            }

            // Save the default library as the current library
            const result = await tagApi.saveTagLibrary(defaultLibrary);
            if (result.success) {
                await this.refreshLibrary();
                this.showToast('Tag library reset to defaults successfully', 'success');
            } else {
                showToast(`Failed to reset library: ${result.error}`, NOTIFICATION_TYPES.ERROR);
            }
        } catch (error) {
            showToast(`Error resetting library: ${error.message}`, NOTIFICATION_TYPES.ERROR);
        }
    }

    /**
     * Merge current library with defaults
     */
    async mergeWithDefaults() {
        const confirmed = confirm(
            'This will add default categories and tags to your current library.\n\n' +
            'Existing categories with the same names will be merged with default tags.\n\n' +
            'Continue?'
        );
        
        if (!confirmed) return;

        try {
            // Load default library structure
            const defaultLibrary = await this.loadDefaultLibrary();
            if (!defaultLibrary) {
                showToast('Failed to load default library', NOTIFICATION_TYPES.ERROR);
                return;
            }

            // Get current library
            const currentResult = await tagApi.getTagLibrary(false);
            if (!currentResult.success) {
                showToast(`Failed to get current library: ${currentResult.error}`, NOTIFICATION_TYPES.ERROR);
                return;
            }

            const currentLibrary = currentResult.data;
            const mergedLibrary = this.mergeLibraries(currentLibrary, defaultLibrary);

            // Save the merged library
            const result = await tagApi.saveTagLibrary(mergedLibrary);
            if (result.success) {
                await this.refreshLibrary();
                this.showToast('Default categories and tags added successfully', 'success');
            } else {
                showToast(`Failed to merge libraries: ${result.error}`, NOTIFICATION_TYPES.ERROR);
            }
        } catch (error) {
            showToast(`Error merging libraries: ${error.message}`, NOTIFICATION_TYPES.ERROR);
        }
    }

    /**
     * Load default library from assets
     */
    async loadDefaultLibrary() {
        try {
            // Use the server route to get default library
            const response = await fetch('/sage_utils/tags/defaults');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            if (result.success && result.data) {
                return result.data;
            } else {
                throw new Error(result.error || 'Invalid response format');
            }
        } catch (error) {
            console.error('Error loading default library:', error);
            
            // Fallback: try to get a fresh library that might contain defaults
            try {
                // Get fresh library (should load defaults if no user library exists)
                const freshResult = await tagApi.getTagLibrary(false);
                if (freshResult.success && freshResult.data.categories.length > 2) {
                    return freshResult.data;
                }
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
            }
            
            return null;
        }
    }

    /**
     * Merge two libraries, combining categories and avoiding duplicates
     */
    mergeLibraries(currentLibrary, defaultLibrary) {
        const merged = {
            version: currentLibrary.version || defaultLibrary.version,
            categories: [...currentLibrary.categories],
            metadata: currentLibrary.metadata || defaultLibrary.metadata
        };

        // Process each default category
        for (const defaultCategory of defaultLibrary.categories) {
            const existingCategory = merged.categories.find(c => c.id === defaultCategory.id);
            
            if (existingCategory) {
                // Merge tags (avoid duplicates)
                const existingTags = new Set(existingCategory.tags || []);
                for (const tag of defaultCategory.tags || []) {
                    existingTags.add(tag);
                }
                existingCategory.tags = Array.from(existingTags).sort();

                // Merge tag sets (avoid duplicates by ID)
                const existingSets = existingCategory.sets || [];
                const existingSetIds = new Set(existingSets.map(s => s.id));
                
                for (const defaultSet of defaultCategory.sets || []) {
                    if (!existingSetIds.has(defaultSet.id)) {
                        existingSets.push({ ...defaultSet });
                    }
                }
                existingCategory.sets = existingSets;

                // Update other properties if not set
                if (!existingCategory.description && defaultCategory.description) {
                    existingCategory.description = defaultCategory.description;
                }
                if (!existingCategory.color && defaultCategory.color) {
                    existingCategory.color = defaultCategory.color;
                }
            } else {
                // Add new category (deep copy)
                merged.categories.push({
                    ...defaultCategory,
                    tags: [...(defaultCategory.tags || [])],
                    sets: (defaultCategory.sets || []).map(s => ({ ...s, tags: [...s.tags] }))
                });
            }
        }

        // Sort categories by order
        merged.categories.sort((a, b) => (a.order || 0) - (b.order || 0));

        // Update metadata
        merged.metadata.total_categories = merged.categories.length;
        merged.metadata.total_tags = merged.categories.reduce((sum, cat) => sum + (cat.tags?.length || 0), 0);
        merged.metadata.total_sets = merged.categories.reduce((sum, cat) => sum + (cat.sets?.length || 0), 0);

        return merged;
    }

    /**
     * Ensure prompt builder stylesheet is loaded
     */
    addStyles() {
        ensurePromptBuilderStyles();
    }

    /**
     * Destroy the tag library component
     */
    destroy() {
        // Remove styles
        const styles = document.getElementById('tag-library-styles');
        if (styles) {
            styles.remove();
        }

        // Clear references
        this.container = null;
        this.categoryTabs = null;
        this.searchInput = null;
        this.tagContainer = null;
        this.actionBar = null;
    }
}

// Export the tag library component
export const tagLibraryComponent = {
    create: (container, options = {}) => {
        const tagLibrary = new TagLibrary(options);
        return tagLibrary.create(container);
    },
    
    TagLibrary
};

export default tagLibraryComponent;

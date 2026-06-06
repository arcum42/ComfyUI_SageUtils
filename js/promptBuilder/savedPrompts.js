/**
 * Saved Prompts Component
 * Handles prompt storage, retrieval, and management
 */

import { ensurePromptBuilderStyles } from './promptBuilderStyles.js';
import {
    createElementFromTemplate,
    loadHtmlTemplate,
    renderHtmlTemplate
} from '../utils/htmlTemplateLoader.js';

let promptCardTemplate = null;
let addCategoryDialogTemplate = null;
let savePromptDialogTemplate = null;
let promptsEmptyStateTemplate = null;
let promptsLoadingStateTemplate = null;
let promptsErrorStateTemplate = null;

async function getPromptCardTemplate() {
    if (!promptCardTemplate) {
        promptCardTemplate = await loadHtmlTemplate('extensions/comfyui_sageutils/promptBuilder/partials/promptCard.html');
    }
    return promptCardTemplate;
}

async function getAddCategoryDialogTemplate() {
    if (!addCategoryDialogTemplate) {
        addCategoryDialogTemplate = await loadHtmlTemplate('extensions/comfyui_sageutils/promptBuilder/partials/addCategoryDialog.html');
    }
    return addCategoryDialogTemplate;
}

async function getSavePromptDialogTemplate() {
    if (!savePromptDialogTemplate) {
        savePromptDialogTemplate = await loadHtmlTemplate('extensions/comfyui_sageutils/promptBuilder/partials/savePromptDialog.html');
    }
    return savePromptDialogTemplate;
}

async function getPromptsEmptyStateTemplate() {
    if (!promptsEmptyStateTemplate) {
        promptsEmptyStateTemplate = await loadHtmlTemplate('extensions/comfyui_sageutils/promptBuilder/partials/promptsEmptyState.html');
    }
    return promptsEmptyStateTemplate;
}

async function getPromptsLoadingStateTemplate() {
    if (!promptsLoadingStateTemplate) {
        promptsLoadingStateTemplate = await loadHtmlTemplate('extensions/comfyui_sageutils/promptBuilder/partials/promptsLoadingState.html');
    }
    return promptsLoadingStateTemplate;
}

async function getPromptsErrorStateTemplate() {
    if (!promptsErrorStateTemplate) {
        promptsErrorStateTemplate = await loadHtmlTemplate('extensions/comfyui_sageutils/promptBuilder/partials/promptsErrorState.html');
    }
    return promptsErrorStateTemplate;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function renderPromptCard(prompt) {
    const template = await getPromptCardTemplate();
    return createElementFromTemplate(template, {
        name: escapeHtml(prompt.name),
        preview: escapeHtml(prompt.positive.length > 100 ? prompt.positive.substring(0, 97) + '...' : prompt.positive),
        category: escapeHtml(prompt.category),
        usageCount: prompt.used_count || 0
    });
}

async function renderAddCategoryDialog() {
    const template = await getAddCategoryDialogTemplate();
    return createElementFromTemplate(template, {});
}

function buildCategoryOptions(categories) {
    return categories.map(cat => `<option value="${cat}">${cat.charAt(0).toUpperCase() + cat.slice(1)}</option>`).join('');
}

async function renderSavePromptDialog(categoryOptions) {
    const template = await getSavePromptDialogTemplate();
    return createElementFromTemplate(template, { categoryOptions });
}

async function renderPromptsEmptyState() {
    const template = await getPromptsEmptyStateTemplate();
    return createElementFromTemplate(template, {});
}

async function renderPromptsLoadingState() {
    const template = await getPromptsLoadingStateTemplate();
    return createElementFromTemplate(template, {});
}

async function renderPromptsErrorState(message) {
    const template = await getPromptsErrorStateTemplate();
    return createElementFromTemplate(template, { message });
}

/**
 * Saved Prompts API wrapper
 */
const savedPromptsApi = {
    /**
     * Save a prompt
     */
    async savePrompt(promptData) {
        const response = await fetch('/sage_utils/prompts/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(promptData)
        });
        return await response.json();
    },

    /**
     * List all prompts
     */
    async listPrompts(filters = {}) {
        const params = new URLSearchParams();
        if (filters.category) params.set('category', filters.category);
        if (filters.search) params.set('search', filters.search);
        
        const response = await fetch(`/sage_utils/prompts/list?${params}`);
        return await response.json();
    },

    /**
     * Get specific prompt
     */
    async getPrompt(id) {
        const response = await fetch(`/sage_utils/prompts/${id}`);
        return await response.json();
    },

    /**
     * Delete prompt
     */
    async deletePrompt(id) {
        const response = await fetch(`/sage_utils/prompts/${id}`, {
            method: 'DELETE'
        });
        return await response.json();
    },

    /**
     * Update usage count
     */
    async updateUsage(id) {
        const response = await fetch(`/sage_utils/prompts/${id}/use`, {
            method: 'POST'
        });
        return await response.json();
    },

    /**
     * Add a new category
     */
    async addCategory(categoryName) {
        const response = await fetch('/sage_utils/prompts/categories/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: categoryName })
        });
        return await response.json();
    }
};

/**
 * Saved Prompts Component
 */
export const savedPromptsComponent = {
    // Component state
    state: {
        prompts: [],
        categories: [],
        activeCategory: 'all',
        searchQuery: '',
        isLoading: false,
        selectedPrompt: null
    },

    // Component elements
    elements: {
        container: null,
        searchInput: null,
        categoryFilter: null,
        promptsList: null,
        saveDialog: null,
        promptDialog: null
    },

    /**
     * Create the saved prompts component
     */
    create() {
        ensurePromptBuilderStyles();
        this.elements.container = document.createElement('div');
        this.elements.container.className = 'saved-prompts-component';

        // Create header with search and save button
        const header = this.createHeader();
        this.elements.container.appendChild(header);

        // Create prompts list
        this.elements.promptsList = document.createElement('div');
        this.elements.promptsList.className = 'prompts-list';
        this.elements.container.appendChild(this.elements.promptsList);

        // Load prompts
        this.loadPrompts();

        return this.elements.container;
    },

    /**
     * Create header section
     */
    createHeader() {
        const header = document.createElement('div');
        header.className = 'saved-prompts-header';

        // Search input
        this.elements.searchInput = document.createElement('input');
        this.elements.searchInput.type = 'text';
        this.elements.searchInput.placeholder = 'Search saved prompts...';
        this.elements.searchInput.className = 'search-input';
        this.elements.searchInput.addEventListener('input', () => {
            this.state.searchQuery = this.elements.searchInput.value;
            this.filterPrompts();
        });

        // Category filter container
        const categoryContainer = document.createElement('div');
        categoryContainer.className = 'category-container';

        // Category filter
        this.elements.categoryFilter = document.createElement('select');
        this.elements.categoryFilter.className = 'category-filter';
        this.elements.categoryFilter.addEventListener('change', () => {
            this.state.activeCategory = this.elements.categoryFilter.value;
            this.filterPrompts();
        });

        // Add category button
        const addCategoryBtn = document.createElement('button');
        addCategoryBtn.textContent = '+';
        addCategoryBtn.className = 'add-category-btn';
        addCategoryBtn.title = 'Add new category';
        addCategoryBtn.addEventListener('click', () => this.showAddCategoryDialog());

        categoryContainer.appendChild(this.elements.categoryFilter);
        categoryContainer.appendChild(addCategoryBtn);

        // Save current prompt button
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save Current Prompt';
        saveButton.className = 'save-prompt-btn primary-btn';
        saveButton.addEventListener('click', () => this.showSaveDialog());

        header.appendChild(this.elements.searchInput);
        header.appendChild(categoryContainer);
        header.appendChild(saveButton);

        return header;
    },

    /**
     * Load prompts from server
     */
    async loadPrompts() {
        this.state.isLoading = true;
        await this.showLoading();

        try {
            const result = await savedPromptsApi.listPrompts();
            if (result.success) {
                this.state.prompts = result.data.prompts || [];
                this.state.categories = result.data.categories || [];
                this.updateCategoryFilter();
                this.renderPrompts();
            } else {
                this.showError('Failed to load prompts: ' + result.error);
            }
        } catch (error) {
            this.showError('Error loading prompts: ' + error.message);
        } finally {
            this.state.isLoading = false;
        }
    },

    /**
     * Update category filter options
     */
    updateCategoryFilter() {
        this.elements.categoryFilter.innerHTML = '';
        
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'All Categories';
        this.elements.categoryFilter.appendChild(allOption);

        this.state.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            this.elements.categoryFilter.appendChild(option);
        });
    },

    /**
     * Filter and render prompts
     */
    async filterPrompts() {
        await this.renderPrompts();
    },

    /**
     * Render prompts list
     */
    async renderPrompts() {
        let filteredPrompts = this.state.prompts;

        // Filter by category
        if (this.state.activeCategory !== 'all') {
            filteredPrompts = filteredPrompts.filter(p => p.category === this.state.activeCategory);
        }

        // Filter by search
        if (this.state.searchQuery) {
            const query = this.state.searchQuery.toLowerCase();
            filteredPrompts = filteredPrompts.filter(p => 
                p.name.toLowerCase().includes(query) ||
                p.positive.toLowerCase().includes(query) ||
                (p.description && p.description.toLowerCase().includes(query))
            );
        }

        this.elements.promptsList.innerHTML = '';

        if (filteredPrompts.length === 0) {
            const emptyState = await renderPromptsEmptyState();
            this.elements.promptsList.appendChild(emptyState);
            return;
        }

        const promptCards = await Promise.all(filteredPrompts.map(prompt => this.createPromptCard(prompt)));
        promptCards.forEach(card => this.elements.promptsList.appendChild(card));
    },

    /**
     * Create prompt card element
     */
    async createPromptCard(prompt) {
        const card = await renderPromptCard(prompt);

        card.querySelector('.load-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.loadPrompt(prompt);
        });

        card.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deletePrompt(prompt);
        });

        card.addEventListener('click', () => this.viewPrompt(prompt));

        return card;
    },

    /**
     * Show add category dialog
     */
    async showAddCategoryDialog() {
        const dialog = await this.createAddCategoryDialog();
        document.body.appendChild(dialog);
    },

    /**
     * Create add category dialog
     */
    async createAddCategoryDialog() {
        const overlay = await renderAddCategoryDialog();
        const dialog = overlay.querySelector('.add-category-dialog');

        // Event listeners
        const closeDialog = () => document.body.removeChild(overlay);
        
        dialog.querySelector('.close-btn').addEventListener('click', closeDialog);
        dialog.querySelector('.cancel-btn').addEventListener('click', closeDialog);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeDialog();
        });

        const categoryInput = dialog.querySelector('.category-name-input');
        
        // Focus the input
        setTimeout(() => categoryInput.focus(), 100);

        // Handle form submission
        const handleSubmit = async () => {
            const categoryName = categoryInput.value.trim().toLowerCase();

            if (!categoryName) {
                alert('Please enter a category name.');
                return;
            }

            // Validate category name
            if (!categoryName.replace('_', '').match(/^[a-zA-Z0-9]+$/)) {
                alert('Category name can only contain letters, numbers, and underscores.');
                return;
            }

            // Check if category already exists
            if (this.state.categories.includes(categoryName)) {
                alert('This category already exists.');
                return;
            }

            try {
                const result = await savedPromptsApi.addCategory(categoryName);
                if (result.success) {
                    closeDialog();
                    // Update categories and refresh UI
                    this.state.categories = result.data.categories;
                    this.updateCategoryFilter();
                    // Auto-select the new category
                    this.state.activeCategory = categoryName;
                    this.elements.categoryFilter.value = categoryName;
                    this.filterPrompts();
                    this.showSuccess(`Category "${categoryName}" added successfully!`);
                } else {
                    alert('Failed to add category: ' + result.error);
                }
            } catch (error) {
                alert('Error adding category: ' + error.message);
            }
        };

        dialog.querySelector('.add-btn').addEventListener('click', handleSubmit);
        
        // Handle Enter key
        categoryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
            }
        });

        return overlay;
    },

    /**
     * Show save prompt dialog
     */
    async showSaveDialog() {
        // Get current prompt values from generation component
        const positiveInput = document.querySelector('.prompt-generation-component .positive-prompt');
        const negativeInput = document.querySelector('.prompt-generation-component .negative-prompt');

        console.log('Save dialog - found positive input:', positiveInput);
        console.log('Save dialog - found negative input:', negativeInput);

        const currentPositive = positiveInput ? positiveInput.value : '';
        const currentNegative = negativeInput ? negativeInput.value : '';

        console.log('Save dialog - positive value:', currentPositive);
        console.log('Save dialog - negative value:', currentNegative);

        if (!currentPositive.trim()) {
            alert('Please enter a positive prompt before saving.');
            return;
        }

        const dialog = await this.createSaveDialog(currentPositive, currentNegative);
        document.body.appendChild(dialog);
    },

    /**
     * Create save dialog
     */
    async createSaveDialog(positive, negative) {
        const categoryOptions = buildCategoryOptions(this.state.categories);
        const overlay = await renderSavePromptDialog(categoryOptions);
        const dialog = overlay.querySelector('.save-prompt-dialog');

        const closeDialog = () => document.body.removeChild(overlay);

        dialog.querySelector('.close-btn').addEventListener('click', closeDialog);
        dialog.querySelector('.cancel-btn').addEventListener('click', closeDialog);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeDialog();
        });

        dialog.querySelector('.save-btn').addEventListener('click', async () => {
            const name = dialog.querySelector('.prompt-name-input').value.trim();
            const category = dialog.querySelector('.prompt-category-input').value;
            const description = dialog.querySelector('.prompt-description-input').value.trim();
            const tagsText = dialog.querySelector('.prompt-tags-input').value.trim();
            const tags = tagsText ? tagsText.split(',').map(t => t.trim()).filter(t => t) : [];

            if (!name) {
                alert('Please enter a name for the prompt.');
                return;
            }

            const promptData = {
                name,
                positive,
                negative,
                category,
                description,
                tags
            };

            try {
                const result = await savedPromptsApi.savePrompt(promptData);
                if (result.success) {
                    closeDialog();
                    this.loadPrompts(); // Refresh list
                    this.showSuccess('Prompt saved successfully!');
                } else {
                    alert('Failed to save prompt: ' + result.error);
                }
            } catch (error) {
                alert('Error saving prompt: ' + error.message);
            }
        });

        return overlay;
    },

    /**
     * Load prompt into generation fields
     */
    async loadPrompt(prompt) {
        const positiveInput = document.querySelector('.prompt-generation-component .positive-prompt');
        const negativeInput = document.querySelector('.prompt-generation-component .negative-prompt');

        console.log('Load prompt - found positive input:', positiveInput);
        console.log('Load prompt - found negative input:', negativeInput);
        console.log('Load prompt - loading values:', prompt.positive, prompt.negative);

        if (positiveInput) {
            positiveInput.value = prompt.positive;
            console.log('Load prompt - set positive value to:', positiveInput.value);
        }
        if (negativeInput) {
            negativeInput.value = prompt.negative;
            console.log('Load prompt - set negative value to:', negativeInput.value);
        }

        // Trigger input events to update any bound data
        if (positiveInput) positiveInput.dispatchEvent(new Event('input', { bubbles: true }));
        if (negativeInput) negativeInput.dispatchEvent(new Event('input', { bubbles: true }));

        // Update usage count
        try {
            await savedPromptsApi.updateUsage(prompt.id);
            this.loadPrompts(); // Refresh to show updated usage
        } catch (error) {
            console.error('Failed to update usage:', error);
        }

        this.showSuccess(`Loaded "${prompt.name}"`);
    },

    /**
     * Delete prompt with confirmation
     */
    async deletePrompt(prompt) {
        if (!confirm(`Delete "${prompt.name}"?`)) return;

        try {
            const result = await savedPromptsApi.deletePrompt(prompt.id);
            if (result.success) {
                this.loadPrompts(); // Refresh list
                this.showSuccess('Prompt deleted');
            } else {
                alert('Failed to delete prompt: ' + result.error);
            }
        } catch (error) {
            alert('Error deleting prompt: ' + error.message);
        }
    },

    /**
     * View prompt details
     */
    viewPrompt(prompt) {
        // Simple preview for now
        const preview = `
Name: ${prompt.name}
Category: ${prompt.category}

Positive: ${prompt.positive}

Negative: ${prompt.negative}

${prompt.description ? 'Description: ' + prompt.description : ''}
${prompt.tags && prompt.tags.length ? 'Tags: ' + prompt.tags.join(', ') : ''}
        `.trim();
        
        alert(preview);
    },

    /**
     * Utility functions
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    async showLoading() {
        this.elements.promptsList.innerHTML = '';
        const loadingState = await renderPromptsLoadingState();
        this.elements.promptsList.appendChild(loadingState);
    },

    async showError(message) {
        this.elements.promptsList.innerHTML = '';
        const errorState = await renderPromptsErrorState(message);
        this.elements.promptsList.appendChild(errorState);
    },

    showSuccess(message) {
        ensurePromptBuilderStyles();
        const toast = document.createElement('div');
        toast.className = 'success-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => document.body.removeChild(toast), 3000);
    }
};

export default savedPromptsComponent;

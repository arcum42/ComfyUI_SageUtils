/**
 * Prompt Generation Component
 * Handles the main prompt input, generation controls, and results display
 */

import { promptBuilderApi } from './promptBuilderApi.js';

/**
 * Prompt Generation Component
 */
export const promptGenerationComponent = {
    // Component state
    state: {
        isGenerating: false,
        results: [],
        positivePrompt: '',
        negativePrompt: '',
        seed: 0,
        count: 1
    },

    // Component elements
    elements: {
        container: null,
        positiveTextarea: null,
        negativeTextarea: null,
        seedInput: null,
        countInput: null,
        generateButton: null,
        randomSeedButton: null,
        resultsContainer: null,
        clearButton: null,
        loadingIndicator: null
    },

    /**
     * Create the prompt generation component
     * @returns {HTMLElement} - The component container
     */
    create() {
        this.elements.container = document.createElement('div');
        this.elements.container.className = 'prompt-generation-component';

        // Create prompt input section
        const inputSection = this.createInputSection();
        this.elements.container.appendChild(inputSection);

        // Create controls section
        const controlsSection = this.createControlsSection();
        this.elements.container.appendChild(controlsSection);

        // Create results section
        const resultsSection = this.createResultsSection();
        this.elements.container.appendChild(resultsSection);

        // Add component styles
        this.addStyles();

        // Initialize with random seed
        this.generateRandomSeed();

        return this.elements.container;
    },

    /**
     * Create the prompt input section
     * @returns {HTMLElement} - The input section
     */
    createInputSection() {
        const section = document.createElement('div');
        section.className = 'prompt-input-section';

        // Positive prompt
        const positiveGroup = document.createElement('div');
        positiveGroup.className = 'input-group';

        const positiveLabel = document.createElement('label');
        positiveLabel.textContent = 'Positive Prompt';
        positiveLabel.className = 'input-label';
        positiveLabel.htmlFor = 'positive-prompt';

        this.elements.positiveTextarea = document.createElement('textarea');
        this.elements.positiveTextarea.id = 'positive-prompt';
        this.elements.positiveTextarea.className = 'prompt-textarea positive-prompt';
        this.elements.positiveTextarea.placeholder = 'Enter positive prompt with __wildcards__...\n\nExample: __character__ in a __location__, __art_style__';
        this.elements.positiveTextarea.rows = 4;

        positiveGroup.appendChild(positiveLabel);
        positiveGroup.appendChild(this.elements.positiveTextarea);

        // Negative prompt
        const negativeGroup = document.createElement('div');
        negativeGroup.className = 'input-group';

        const negativeLabel = document.createElement('label');
        negativeLabel.textContent = 'Negative Prompt';
        negativeLabel.className = 'input-label';
        negativeLabel.htmlFor = 'negative-prompt';

        this.elements.negativeTextarea = document.createElement('textarea');
        this.elements.negativeTextarea.id = 'negative-prompt';
        this.elements.negativeTextarea.className = 'prompt-textarea negative-prompt';
        this.elements.negativeTextarea.placeholder = 'Enter negative prompt...';
        this.elements.negativeTextarea.rows = 3;

        negativeGroup.appendChild(negativeLabel);
        negativeGroup.appendChild(this.elements.negativeTextarea);

        section.appendChild(positiveGroup);
        section.appendChild(negativeGroup);

        // Add event listeners
        this.elements.positiveTextarea.addEventListener('input', () => {
            this.state.positivePrompt = this.elements.positiveTextarea.value;
            this.updateWildcardHighlighting(this.elements.positiveTextarea);
        });

        this.elements.negativeTextarea.addEventListener('input', () => {
            this.state.negativePrompt = this.elements.negativeTextarea.value;
            this.updateWildcardHighlighting(this.elements.negativeTextarea);
        });

        return section;
    },

    /**
     * Create the controls section
     * @returns {HTMLElement} - The controls section
     */
    createControlsSection() {
        const section = document.createElement('div');
        section.className = 'controls-section';

        // Seed control
        const seedGroup = document.createElement('div');
        seedGroup.className = 'control-group';

        const seedLabel = document.createElement('label');
        seedLabel.textContent = 'Seed';
        seedLabel.className = 'control-label';

        const seedContainer = document.createElement('div');
        seedContainer.className = 'seed-container';

        this.elements.seedInput = document.createElement('input');
        this.elements.seedInput.type = 'number';
        this.elements.seedInput.className = 'seed-input';
        this.elements.seedInput.min = '0';
        this.elements.seedInput.max = '2147483647';
        this.elements.seedInput.value = '0';

        this.elements.randomSeedButton = document.createElement('button');
        this.elements.randomSeedButton.textContent = '🎲';
        this.elements.randomSeedButton.className = 'random-seed-button';
        this.elements.randomSeedButton.title = 'Generate random seed';

        seedContainer.appendChild(this.elements.seedInput);
        seedContainer.appendChild(this.elements.randomSeedButton);

        seedGroup.appendChild(seedLabel);
        seedGroup.appendChild(seedContainer);

        // Count control
        const countGroup = document.createElement('div');
        countGroup.className = 'control-group';

        const countLabel = document.createElement('label');
        countLabel.textContent = 'Count';
        countLabel.className = 'control-label';

        this.elements.countInput = document.createElement('input');
        this.elements.countInput.type = 'number';
        this.elements.countInput.className = 'count-input';
        this.elements.countInput.min = '1';
        this.elements.countInput.max = '10';
        this.elements.countInput.value = '1';

        countGroup.appendChild(countLabel);
        countGroup.appendChild(this.elements.countInput);

        // Action buttons
        const actionGroup = document.createElement('div');
        actionGroup.className = 'action-group';

        this.elements.generateButton = document.createElement('button');
        this.elements.generateButton.textContent = '✨ Generate Prompts';
        this.elements.generateButton.className = 'generate-button primary-button';

        this.elements.clearButton = document.createElement('button');
        this.elements.clearButton.textContent = '🗑️ Clear Results';
        this.elements.clearButton.className = 'clear-button secondary-button';

        actionGroup.appendChild(this.elements.generateButton);
        actionGroup.appendChild(this.elements.clearButton);

        section.appendChild(seedGroup);
        section.appendChild(countGroup);
        section.appendChild(actionGroup);

        // Add event listeners
        this.elements.seedInput.addEventListener('input', () => {
            this.state.seed = parseInt(this.elements.seedInput.value) || 0;
        });

        this.elements.countInput.addEventListener('input', () => {
            this.state.count = Math.max(1, Math.min(10, parseInt(this.elements.countInput.value) || 1));
            this.elements.countInput.value = this.state.count;
        });

        this.elements.randomSeedButton.addEventListener('click', () => {
            this.generateRandomSeed();
        });

        this.elements.generateButton.addEventListener('click', () => {
            this.generatePrompts();
        });

        this.elements.clearButton.addEventListener('click', () => {
            this.clearResults();
        });

        return section;
    },

    /**
     * Create the results section
     * @returns {HTMLElement} - The results section
     */
    createResultsSection() {
        const section = document.createElement('div');
        section.className = 'results-section';

        const header = document.createElement('div');
        header.className = 'results-header';

        const title = document.createElement('h4');
        title.textContent = 'Generated Prompts';
        title.className = 'results-title';

        this.elements.loadingIndicator = document.createElement('div');
        this.elements.loadingIndicator.className = 'loading-indicator hidden';
        this.elements.loadingIndicator.innerHTML = '<div class="spinner"></div> Generating...';

        header.appendChild(title);
        header.appendChild(this.elements.loadingIndicator);

        this.elements.resultsContainer = document.createElement('div');
        this.elements.resultsContainer.className = 'results-container';

        section.appendChild(header);
        section.appendChild(this.elements.resultsContainer);

        return section;
    },

    /**
     * Generate random seed
     */
    generateRandomSeed() {
        const randomSeed = promptBuilderApi.generateRandomSeed();
        this.state.seed = randomSeed;
        this.elements.seedInput.value = randomSeed;
    },

    /**
     * Generate prompts using the API
     */
    async generatePrompts() {
        if (this.state.isGenerating) return;

        const positivePrompt = this.elements.positiveTextarea.value.trim();
        const negativePrompt = this.elements.negativeTextarea.value.trim();

        if (!positivePrompt && !negativePrompt) {
            this.showMessage('Please enter at least one prompt (positive or negative)', 'warning');
            return;
        }

        this.setGenerating(true);

        try {
            const results = await promptBuilderApi.generateMultiplePrompts(
                positivePrompt,
                negativePrompt,
                this.state.seed,
                this.state.count
            );

            this.state.results = [...this.state.results, ...results];
            this.renderResults();
            this.showMessage(`Generated ${results.length} prompt(s) successfully!`, 'success');

        } catch (error) {
            console.error('Error generating prompts:', error);
            this.showMessage('Failed to generate prompts. Please try again.', 'error');
        } finally {
            this.setGenerating(false);
        }
    },

    /**
     * Set generating state
     * @param {boolean} isGenerating - Whether generation is in progress
     */
    setGenerating(isGenerating) {
        this.state.isGenerating = isGenerating;
        this.elements.generateButton.disabled = isGenerating;
        this.elements.loadingIndicator.classList.toggle('hidden', !isGenerating);
        
        if (isGenerating) {
            this.elements.generateButton.textContent = '⏳ Generating...';
        } else {
            this.elements.generateButton.textContent = '✨ Generate Prompts';
        }
    },

    /**
     * Clear all results
     */
    clearResults() {
        this.state.results = [];
        this.renderResults();
        this.showMessage('Results cleared', 'info');
    },

    /**
     * Render the results
     */
    renderResults() {
        this.elements.resultsContainer.innerHTML = '';

        if (this.state.results.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.textContent = 'No prompts generated yet. Enter prompts above and click Generate!';
            this.elements.resultsContainer.appendChild(emptyState);
            return;
        }

        this.state.results.forEach((result, index) => {
            const resultItem = this.createResultItem(result, index);
            this.elements.resultsContainer.appendChild(resultItem);
        });
    },

    /**
     * Create a result item element
     * @param {Object} result - The result data
     * @param {number} index - The result index
     * @returns {HTMLElement} - The result item element
     */
    createResultItem(result, index) {
        const item = document.createElement('div');
        item.className = 'result-item';
        if (result.error) {
            item.classList.add('has-error');
        }

        const header = document.createElement('div');
        header.className = 'result-header';

        const title = document.createElement('div');
        title.className = 'result-title';
        title.textContent = `Prompt ${index + 1} (Seed: ${result.seed})`;

        const actions = document.createElement('div');
        actions.className = 'result-actions';

        // Copy positive button
        if (result.positive) {
            const copyPositiveBtn = document.createElement('button');
            copyPositiveBtn.textContent = '📋 Copy Positive';
            copyPositiveBtn.className = 'copy-button';
            copyPositiveBtn.addEventListener('click', () => {
                this.copyResult(result.positive, 'Positive prompt copied!');
            });
            actions.appendChild(copyPositiveBtn);
        }

        // Copy negative button
        if (result.negative) {
            const copyNegativeBtn = document.createElement('button');
            copyNegativeBtn.textContent = '📋 Copy Negative';
            copyNegativeBtn.className = 'copy-button';
            copyNegativeBtn.addEventListener('click', () => {
                this.copyResult(result.negative, 'Negative prompt copied!');
            });
            actions.appendChild(copyNegativeBtn);
        }

        // Load button
        const loadBtn = document.createElement('button');
        loadBtn.textContent = '⬆️ Load';
        loadBtn.className = 'load-button';
        loadBtn.addEventListener('click', () => {
            this.loadResult(result);
        });
        actions.appendChild(loadBtn);

        header.appendChild(title);
        header.appendChild(actions);

        const content = document.createElement('div');
        content.className = 'result-content';

        if (result.positive) {
            const positiveDiv = document.createElement('div');
            positiveDiv.className = 'result-text positive';
            positiveDiv.innerHTML = `<strong>Positive:</strong> ${result.positive}`;
            content.appendChild(positiveDiv);
        }

        if (result.negative) {
            const negativeDiv = document.createElement('div');
            negativeDiv.className = 'result-text negative';
            negativeDiv.innerHTML = `<strong>Negative:</strong> ${result.negative}`;
            content.appendChild(negativeDiv);
        }

        if (result.error) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'result-error';
            errorDiv.textContent = `Error: ${result.error}`;
            content.appendChild(errorDiv);
        }

        item.appendChild(header);
        item.appendChild(content);

        return item;
    },

    /**
     * Copy result to clipboard
     * @param {string} text - Text to copy
     * @param {string} message - Success message
     */
    async copyResult(text, message) {
        const success = await promptBuilderApi.copyToClipboard(text);
        if (success) {
            this.showMessage(message, 'success');
        } else {
            this.showMessage('Failed to copy to clipboard', 'error');
        }
    },

    /**
     * Load result back into input fields
     * @param {Object} result - The result to load
     */
    loadResult(result) {
        if (result.positive) {
            this.elements.positiveTextarea.value = result.originalPositive || result.positive;
            this.state.positivePrompt = this.elements.positiveTextarea.value;
        }
        if (result.negative) {
            this.elements.negativeTextarea.value = result.originalNegative || result.negative;
            this.state.negativePrompt = this.elements.negativeTextarea.value;
        }
        if (result.seed) {
            this.elements.seedInput.value = result.seed;
            this.state.seed = result.seed;
        }
        this.showMessage('Prompt loaded into fields', 'success');
    },

    /**
     * Update wildcard highlighting (placeholder for future enhancement)
     * @param {HTMLElement} textarea - The textarea to update
     */
    updateWildcardHighlighting(textarea) {
        // For now, just validate the prompt
        const validation = promptBuilderApi.validatePrompt(textarea.value);
        
        // Update textarea title with wildcard info
        if (validation.hasWildcards) {
            textarea.title = `Contains ${validation.wildcardCount} wildcard(s): ${validation.wildcards.join(', ')}`;
        } else {
            textarea.title = '';
        }
    },

    /**
     * Show a message to the user
     * @param {string} message - The message to show
     * @param {string} type - The message type (success, error, warning, info)
     */
    showMessage(message, type = 'info') {
        // For now, just log to console. In the future, this could show toast notifications
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // You could implement a toast notification system here
        // For now, we'll use a simple alert for errors
        if (type === 'error') {
            // Could show a non-intrusive notification instead
            setTimeout(() => {
                if (this.elements.container) {
                    const notification = document.createElement('div');
                    notification.className = `notification ${type}`;
                    notification.textContent = message;
                    this.elements.container.appendChild(notification);
                    
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 3000);
                }
            }, 100);
        }
    },

    /**
     * Add component styles
     */
    addStyles() {
        const styleId = 'prompt-generation-styles';
        
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .prompt-generation-component {
                padding: 16px;
            }

            .prompt-input-section {
                margin-bottom: 20px;
            }

            .input-group {
                margin-bottom: 16px;
            }

            .input-label {
                display: block;
                margin-bottom: 6px;
                font-weight: 500;
                color: var(--fg-color, #ffffff);
            }

            .prompt-textarea {
                width: 100%;
                padding: 12px;
                border: 1px solid var(--border-color, #444);
                border-radius: 6px;
                background: var(--bg-color, #1a1a1a);
                color: var(--fg-color, #ffffff);
                font-family: monospace;
                font-size: 14px;
                line-height: 1.4;
                resize: vertical;
                min-height: 80px;
            }

            .prompt-textarea:focus {
                outline: none;
                border-color: var(--primary-color, #4a9eff);
                box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.2);
            }

            .positive-prompt {
                border-left: 3px solid #4caf50;
            }

            .negative-prompt {
                border-left: 3px solid #f44336;
            }

            .controls-section {
                display: flex;
                gap: 16px;
                margin-bottom: 20px;
                flex-wrap: wrap;
                align-items: end;
            }

            .control-group {
                display: flex;
                flex-direction: column;
                gap: 6px;
                min-width: 120px;
            }

            .control-label {
                font-weight: 500;
                color: var(--fg-color, #ffffff);
                font-size: 14px;
            }

            .seed-container {
                display: flex;
                gap: 4px;
            }

            .seed-input, .count-input {
                padding: 8px 12px;
                border: 1px solid var(--border-color, #444);
                border-radius: 4px;
                background: var(--bg-color, #1a1a1a);
                color: var(--fg-color, #ffffff);
                font-size: 14px;
                width: 100px;
            }

            .random-seed-button {
                padding: 8px;
                border: 1px solid var(--border-color, #444);
                border-radius: 4px;
                background: var(--bg-color-secondary, #2a2a2a);
                color: var(--fg-color, #ffffff);
                cursor: pointer;
                font-size: 16px;
            }

            .random-seed-button:hover {
                background: var(--hover-color, #3a3a3a);
            }

            .action-group {
                display: flex;
                gap: 12px;
                margin-left: auto;
            }

            .primary-button, .secondary-button {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .primary-button {
                background: var(--primary-color, #4a9eff);
                color: white;
            }

            .primary-button:hover:not(:disabled) {
                background: var(--primary-dark, #357abd);
                transform: translateY(-1px);
            }

            .primary-button:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }

            .secondary-button {
                background: var(--bg-color-secondary, #2a2a2a);
                color: var(--fg-color, #ffffff);
                border: 1px solid var(--border-color, #444);
            }

            .secondary-button:hover {
                background: var(--hover-color, #3a3a3a);
            }

            .results-section {
                border-top: 1px solid var(--border-color, #444);
                padding-top: 20px;
            }

            .results-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 16px;
            }

            .results-title {
                margin: 0;
                font-size: 16px;
                color: var(--fg-color, #ffffff);
            }

            .loading-indicator {
                display: flex;
                align-items: center;
                gap: 8px;
                color: var(--primary-color, #4a9eff);
                font-size: 14px;
            }

            .loading-indicator.hidden {
                display: none;
            }

            .spinner {
                width: 16px;
                height: 16px;
                border: 2px solid transparent;
                border-top: 2px solid currentColor;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            .results-container {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .empty-state {
                text-align: center;
                padding: 40px;
                color: var(--text-secondary, #888);
                font-style: italic;
            }

            .result-item {
                border: 1px solid var(--border-color, #444);
                border-radius: 6px;
                background: var(--bg-color-secondary, #2a2a2a);
                overflow: hidden;
            }

            .result-item.has-error {
                border-color: #f44336;
            }

            .result-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px;
                background: var(--bg-color-tertiary, #1e1e1e);
                border-bottom: 1px solid var(--border-color, #444);
            }

            .result-title {
                font-weight: 500;
                color: var(--fg-color, #ffffff);
            }

            .result-actions {
                display: flex;
                gap: 8px;
            }

            .copy-button, .load-button {
                padding: 4px 8px;
                border: 1px solid var(--border-color, #444);
                border-radius: 4px;
                background: var(--bg-color, #1a1a1a);
                color: var(--fg-color, #ffffff);
                font-size: 12px;
                cursor: pointer;
            }

            .copy-button:hover, .load-button:hover {
                background: var(--hover-color, #3a3a3a);
            }

            .result-content {
                padding: 16px;
            }

            .result-text {
                margin-bottom: 12px;
                padding: 8px;
                border-radius: 4px;
                font-family: monospace;
                font-size: 13px;
                line-height: 1.4;
            }

            .result-text.positive {
                background: rgba(76, 175, 80, 0.1);
                border-left: 3px solid #4caf50;
            }

            .result-text.negative {
                background: rgba(244, 67, 54, 0.1);
                border-left: 3px solid #f44336;
            }

            .result-text strong {
                color: var(--fg-color, #ffffff);
            }

            .result-error {
                color: #f44336;
                font-size: 12px;
                font-style: italic;
                padding: 8px;
                background: rgba(244, 67, 54, 0.1);
                border-radius: 4px;
            }

            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 16px;
                border-radius: 6px;
                color: white;
                font-size: 14px;
                z-index: 10000;
                animation: slideIn 0.3s ease;
            }

            .notification.error {
                background: #f44336;
            }

            .notification.success {
                background: #4caf50;
            }

            .notification.warning {
                background: #ff9800;
            }

            .notification.info {
                background: var(--primary-color, #4a9eff);
            }

            @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
            }

            /* Responsive design */
            @media (max-width: 768px) {
                .controls-section {
                    flex-direction: column;
                    align-items: stretch;
                }

                .action-group {
                    margin-left: 0;
                    justify-content: stretch;
                }

                .primary-button, .secondary-button {
                    flex: 1;
                }

                .result-header {
                    flex-direction: column;
                    align-items: start;
                    gap: 8px;
                }

                .result-actions {
                    align-self: stretch;
                    justify-content: space-between;
                }
            }
        `;

        document.head.appendChild(style);
    }
};

export default promptGenerationComponent;

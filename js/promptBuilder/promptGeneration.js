/**
 * Prompt Generation Component
 * Handles the main prompt input, generation controls, and results display
 */

import { promptBuilderApi } from './promptBuilderApi.js';
import { actions, selectors } from '../shared/stateManager.js';
import { copyTextToSelectedNode } from '../utils/textCopyUtils.js';
import { copyTextFromSelectedNode } from '../utils/textCopyFromNode.js';
import { app } from '../../../scripts/app.js';
import { ensurePromptBuilderStyles } from './promptBuilderStyles.js';

/**
 * Prompt Generation Component
 */
export const promptGenerationComponent = {
    // Component state (UI-only, non-persisted)
    state: {
        isGenerating: false,
        unsubscribers: [] // Store unsubscribe functions for cleanup
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
        sendToLLMButton: null,
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

        // Add prompt builder stylesheet
        ensurePromptBuilderStyles();

        // Restore persisted state values
        this.restoreState();

        // Initialize with random seed only if no seed is persisted
        if (!selectors.promptSeed()) {
            this.generateRandomSeed();
        }

        // Subscribe to cross-tab messages
        this.setupCrossTabMessaging();

        return this.elements.container;
    },

    /**
     * Cleanup component resources
     */
    destroy() {
        // Unsubscribe from all cross-tab messages
        if (this.state.unsubscribers) {
            this.state.unsubscribers.forEach(unsub => {
                try {
                    unsub();
                } catch (err) {
                    console.warn('[PromptBuilder] Error unsubscribing:', err);
                }
            });
            this.state.unsubscribers = [];
        }
        
        // Reset state
        this.state.isGenerating = false;
        
        console.debug('[PromptBuilder] Component cleaned up');
    },

    /**
     * Setup cross-tab messaging subscriptions
     */
    setupCrossTabMessaging() {
        import('../shared/crossTabMessaging.js').then(({ getEventBus, MessageTypes, requestTabSwitch }) => {
            const bus = getEventBus();
            
            // Handle text transfers to Prompt Builder
            const unsubscribe = bus.subscribe(MessageTypes.TEXT_TO_PROMPT_BUILDER, (message) => {
                const { text, source, autoSwitch, append } = message.data;
                
                if (!this.elements.positiveTextarea) {
                    console.warn('[PromptBuilder] Positive textarea not initialized');
                    return;
                }
                
                // Set or append text to positive prompt textarea
                if (append && this.elements.positiveTextarea.value) {
                    this.elements.positiveTextarea.value += '\n' + text;
                } else {
                    this.elements.positiveTextarea.value = text;
                }
                
                // Trigger input event to update state
                this.elements.positiveTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                
                // Show success message
                this.showMessage(`Text received from ${source}`, 'success');
                
                // Auto-switch to Prompt Builder tab if requested
                if (autoSwitch) {
                    requestTabSwitch('prompts', { source: 'text-transfer' });
                }
            });
            
            // Store unsubscribe function for cleanup
            this.state.unsubscribers.push(unsubscribe);
        }).catch(err => {
            console.warn('[PromptBuilder] Failed to load cross-tab messaging:', err);
        });
    },

    /**
     * Restore state from global state manager
     */
    restoreState() {
        const positivePrompt = selectors.positivePrompt();
        const negativePrompt = selectors.negativePrompt();
        const seed = selectors.promptSeed();
        const count = selectors.promptCount();

        if (positivePrompt) {
            this.elements.positiveTextarea.value = positivePrompt;
        }
        if (negativePrompt) {
            this.elements.negativeTextarea.value = negativePrompt;
        }
        if (seed !== undefined && seed !== null) {
            this.elements.seedInput.value = seed;
        }
        if (count) {
            this.elements.countInput.value = count;
        }

        // Render any persisted results
        const results = selectors.promptResults();
        if (results && results.length > 0) {
            this.renderResults();
            console.debug('[PromptBuilder] Restored', results.length, 'generated prompts');
        }

        console.debug('[PromptBuilder] Restored state:', { positivePrompt, negativePrompt, seed, count, resultsCount: results?.length || 0 });
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

        // Positive prompt actions (above textarea)
        const positiveActions = document.createElement('div');
        positiveActions.className = 'prompt-actions-bar';

        this.elements.sendToLLMButton = document.createElement('button');
        this.elements.sendToLLMButton.textContent = '🤖 Send to LLM';
        this.elements.sendToLLMButton.className = 'send-to-llm-button secondary-button';
        this.elements.sendToLLMButton.title = 'Send positive prompt to LLM Chat';
        this.elements.sendToLLMButton.setAttribute('aria-label', 'Send positive prompt to LLM Chat tab');

        this.elements.copyFromNodeButton = document.createElement('button');
        this.elements.copyFromNodeButton.textContent = '📥 From Node';
        this.elements.copyFromNodeButton.className = 'copy-from-node-button secondary-button';
        this.elements.copyFromNodeButton.title = 'Copy text from selected node to positive prompt';
        this.elements.copyFromNodeButton.setAttribute('aria-label', 'Copy text from selected node');

        positiveActions.appendChild(this.elements.sendToLLMButton);
        positiveActions.appendChild(this.elements.copyFromNodeButton);

        this.elements.positiveTextarea = document.createElement('textarea');
        this.elements.positiveTextarea.id = 'positive-prompt';
        this.elements.positiveTextarea.className = 'prompt-textarea positive-prompt';
        this.elements.positiveTextarea.placeholder = 'Enter positive prompt with __wildcards__...\n\nExample: __character__ in a __location__, __art_style__';
        this.elements.positiveTextarea.rows = 4;
        this.elements.positiveTextarea.setAttribute('aria-label', 'Positive prompt input with wildcard support');
        this.elements.positiveTextarea.setAttribute('aria-describedby', 'positive-prompt-label');

        positiveGroup.appendChild(positiveLabel);
        positiveGroup.appendChild(positiveActions);
        positiveGroup.appendChild(this.elements.positiveTextarea);

        // Negative prompt
        const negativeGroup = document.createElement('div');
        negativeGroup.className = 'input-group';

        const negativeLabel = document.createElement('label');
        negativeLabel.textContent = 'Negative Prompt';
        negativeLabel.className = 'input-label';
        negativeLabel.htmlFor = 'negative-prompt';

        // Negative prompt actions (above textarea)
        const negativeActions = document.createElement('div');
        negativeActions.className = 'prompt-actions-bar';

        this.elements.sendToLLMButtonNegative = document.createElement('button');
        this.elements.sendToLLMButtonNegative.textContent = '🤖 Send to LLM';
        this.elements.sendToLLMButtonNegative.className = 'send-to-llm-button secondary-button';
        this.elements.sendToLLMButtonNegative.title = 'Send negative prompt to LLM Chat';
        this.elements.sendToLLMButtonNegative.setAttribute('aria-label', 'Send negative prompt to LLM Chat tab');

        this.elements.copyFromNodeButtonNegative = document.createElement('button');
        this.elements.copyFromNodeButtonNegative.textContent = '📥 From Node';
        this.elements.copyFromNodeButtonNegative.className = 'copy-from-node-button secondary-button';
        this.elements.copyFromNodeButtonNegative.title = 'Copy text from selected node to negative prompt';
        this.elements.copyFromNodeButtonNegative.setAttribute('aria-label', 'Copy text from selected node to negative prompt');

        negativeActions.appendChild(this.elements.sendToLLMButtonNegative);
        negativeActions.appendChild(this.elements.copyFromNodeButtonNegative);

        this.elements.negativeTextarea = document.createElement('textarea');
        this.elements.negativeTextarea.id = 'negative-prompt';
        this.elements.negativeTextarea.className = 'prompt-textarea negative-prompt';
        this.elements.negativeTextarea.placeholder = 'Enter negative prompt...';
        this.elements.negativeTextarea.rows = 3;
        this.elements.negativeTextarea.setAttribute('aria-label', 'Negative prompt input');
        this.elements.negativeTextarea.setAttribute('aria-describedby', 'negative-prompt-label');

        negativeGroup.appendChild(negativeLabel);
        negativeGroup.appendChild(negativeActions);
        negativeGroup.appendChild(this.elements.negativeTextarea);

        section.appendChild(positiveGroup);
        section.appendChild(negativeGroup);

        // Create debounced handlers for performance
        import('../shared/performanceUtils.js').then(({ debounce }) => {
            // Debounce state updates (300ms) but keep highlighting responsive
            const debouncedPositiveUpdate = debounce((value) => {
                actions.setPositivePrompt(value);
            }, 300);
            
            const debouncedNegativeUpdate = debounce((value) => {
                actions.setNegativePrompt(value);
            }, 300);
            
            // Store on component for later use
            this._debouncedPositiveUpdate = debouncedPositiveUpdate;
            this._debouncedNegativeUpdate = debouncedNegativeUpdate;
        });

        // Add event listeners
        this.elements.positiveTextarea.addEventListener('input', () => {
            // Update state with debouncing if available, otherwise immediately
            if (this._debouncedPositiveUpdate) {
                this._debouncedPositiveUpdate(this.elements.positiveTextarea.value);
            } else {
                actions.setPositivePrompt(this.elements.positiveTextarea.value);
            }
            // Keep highlighting responsive
            this.updateWildcardHighlighting(this.elements.positiveTextarea);
        });
        
        // Keyboard shortcuts for positive textarea
        this.elements.positiveTextarea.addEventListener('keydown', (e) => {
            // Ctrl+Enter to generate
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                if (this.elements.generateButton && !this.elements.generateButton.disabled) {
                    this.elements.generateButton.click();
                }
            }
            // Escape to blur
            if (e.key === 'Escape') {
                this.elements.positiveTextarea.blur();
            }
        });

        this.elements.negativeTextarea.addEventListener('input', () => {
            // Update state with debouncing if available, otherwise immediately
            if (this._debouncedNegativeUpdate) {
                this._debouncedNegativeUpdate(this.elements.negativeTextarea.value);
            } else {
                actions.setNegativePrompt(this.elements.negativeTextarea.value);
            }
            // Keep highlighting responsive
            this.updateWildcardHighlighting(this.elements.negativeTextarea);
        });
        
        // Keyboard shortcuts for negative textarea
        this.elements.negativeTextarea.addEventListener('keydown', (e) => {
            // Ctrl+Enter to generate
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                if (this.elements.generateButton && !this.elements.generateButton.disabled) {
                    this.elements.generateButton.click();
                }
            }
            // Escape to blur
            if (e.key === 'Escape') {
                this.elements.negativeTextarea.blur();
            }
        });

        // Add event listeners for positive prompt actions
        this.elements.sendToLLMButton.addEventListener('click', () => {
            this.sendToLLM('positive');
        });
        
        this.elements.copyFromNodeButton.addEventListener('click', () => {
            this.copyFromNode('positive');
        });

        // Add event listeners for negative prompt actions
        this.elements.sendToLLMButtonNegative.addEventListener('click', () => {
            this.sendToLLM('negative');
        });
        
        this.elements.copyFromNodeButtonNegative.addEventListener('click', () => {
            this.copyFromNode('negative');
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
        this.elements.seedInput.setAttribute('aria-label', 'Random seed for generation');

        this.elements.randomSeedButton = document.createElement('button');
        this.elements.randomSeedButton.textContent = '🎲';
        this.elements.randomSeedButton.className = 'random-seed-button';
        this.elements.randomSeedButton.title = 'Generate random seed';
        this.elements.randomSeedButton.setAttribute('aria-label', 'Generate random seed');

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
        this.elements.countInput.setAttribute('aria-label', 'Number of prompts to generate');

        countGroup.appendChild(countLabel);
        countGroup.appendChild(this.elements.countInput);

        // Action buttons
        const actionGroup = document.createElement('div');
        actionGroup.className = 'action-group';

        this.elements.generateButton = document.createElement('button');
        this.elements.generateButton.textContent = '✨ Generate Prompts';
        this.elements.generateButton.className = 'generate-button primary-button';
        this.elements.generateButton.title = 'Generate prompts (Ctrl+Enter)';
        this.elements.generateButton.setAttribute('aria-label', 'Generate prompts with wildcards');

        this.elements.clearButton = document.createElement('button');
        this.elements.clearButton.textContent = '🗑️ Clear Results';
        this.elements.clearButton.className = 'clear-button secondary-button';
        this.elements.clearButton.setAttribute('aria-label', 'Clear generated results');

        actionGroup.appendChild(this.elements.generateButton);
        actionGroup.appendChild(this.elements.clearButton);

        section.appendChild(seedGroup);
        section.appendChild(countGroup);
        section.appendChild(actionGroup);

        // Add event listeners
        this.elements.seedInput.addEventListener('input', () => {
            const seed = parseInt(this.elements.seedInput.value) || 0;
            actions.setPromptSeed(seed);
        });

        this.elements.countInput.addEventListener('input', () => {
            const count = Math.max(1, Math.min(10, parseInt(this.elements.countInput.value) || 1));
            this.elements.countInput.value = count;
            actions.setPromptCount(count);
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

    // Header right-side controls container
    const headerControls = document.createElement('div');
    headerControls.className = 'results-header-controls';

    // Clear-all button in results header
    const headerClearBtn = document.createElement('button');
    headerClearBtn.className = 'results-clear-button secondary-button';
    headerClearBtn.textContent = 'Clear All';
    headerClearBtn.title = 'Clear all generated prompts';
    headerClearBtn.setAttribute('aria-label', 'Clear all generated prompts');
    headerClearBtn.addEventListener('click', () => this.clearResults());

    headerControls.appendChild(this.elements.loadingIndicator);
    headerControls.appendChild(headerClearBtn);

    header.appendChild(title);
    header.appendChild(headerControls);

        this.elements.resultsContainer = document.createElement('div');
        this.elements.resultsContainer.className = 'results-container';
        this.elements.resultsContainer.setAttribute('role', 'region');
        this.elements.resultsContainer.setAttribute('aria-labelledby', 'results-title');
        this.elements.resultsContainer.setAttribute('aria-live', 'polite');

        section.appendChild(header);
        section.appendChild(this.elements.resultsContainer);

        return section;
    },

    /**
     * Generate random seed
     */
    generateRandomSeed() {
        const randomSeed = promptBuilderApi.generateRandomSeed();
        actions.setPromptSeed(randomSeed);
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
                selectors.promptSeed(),
                selectors.promptCount()
            );

            actions.addPromptResults(results);
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
        const existing = selectors.promptResults();
        if (!existing || existing.length === 0) {
            return; // Nothing to clear
        }
        if (!window.confirm('Clear all generated prompts? This cannot be undone.')) {
            return;
        }
        actions.clearPromptResults();
        this.renderResults();
        this.showMessage('All generated prompts cleared', 'info');
    },

    /**
     * Send prompt to LLM tab
     * @param {string} promptType - 'positive' or 'negative'
     */
    sendToLLM(promptType = 'positive') {
        const textarea = promptType === 'positive' ? this.elements.positiveTextarea : this.elements.negativeTextarea;
        const promptText = textarea.value.trim();
        
        if (!promptText) {
            this.showMessage(`Please enter a ${promptType} prompt first`, 'error');
            return;
        }
        
        // Visual feedback - show sending state
        const btn = promptType === 'positive' ? this.elements.sendToLLMButton : this.elements.sendToLLMButtonNegative;
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = '📤 Sending...';
        
        // Use cross-tab messaging to send text to LLM
        import('../shared/crossTabMessaging.js').then(({ sendTextToLLM, showNotification }) => {
            sendTextToLLM(promptText, {
                target: 'main',  // Send to main prompt textarea
                source: 'prompt-builder',
                autoSwitch: true
            });
            showNotification(`${promptType.charAt(0).toUpperCase() + promptType.slice(1)} prompt sent to LLM Chat`, 'success');
            this.showMessage('Sent to LLM tab', 'success');
            
            // Visual feedback - show success
            btn.textContent = '✓ Sent!';
            btn.style.background = 'var(--success-color, #4caf50)';
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
                btn.disabled = false;
            }, 1500);
        }).catch(err => {
            console.error('[PromptBuilder] Failed to send to LLM:', err);
            this.showMessage('Failed to send to LLM', 'error');
            
            // Reset button on error
            btn.textContent = originalText;
            btn.disabled = false;
        });
    },

    /**
     * Render the results
     */
    renderResults() {
        this.elements.resultsContainer.innerHTML = '';

        const results = selectors.promptResults();
        if (!results || results.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.textContent = 'No prompts generated yet. Enter prompts above and click Generate!';
            this.elements.resultsContainer.appendChild(emptyState);
            return;
        }

        results.forEach((result, index) => {
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

        const headerActions = document.createElement('div');
        headerActions.className = 'result-header-actions';

        // Load button (stays in header)
        const loadBtn = document.createElement('button');
        loadBtn.textContent = '⬆️ Load';
        loadBtn.className = 'load-button';
        loadBtn.addEventListener('click', () => {
            this.loadResult(result);
        });
        headerActions.appendChild(loadBtn);

        // Delete (close) button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'X'; // ASCII per project guidelines
        deleteBtn.className = 'delete-result-button';
        deleteBtn.title = 'Remove this generated prompt';
        deleteBtn.setAttribute('aria-label', 'Remove generated prompt');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!window.confirm('Remove this generated prompt from the list?')) {
                return;
            }
            const currentResults = [...(selectors.promptResults() || [])];
            // Guard index bounds
            if (index >= 0 && index < currentResults.length) {
                currentResults.splice(index, 1);
                actions.setPromptResults(currentResults);
                this.renderResults();
                this.showMessage('Prompt removed', 'info');
            }
        });
        headerActions.appendChild(deleteBtn);

        header.appendChild(title);
        header.appendChild(headerActions);

        const content = document.createElement('div');
        content.className = 'result-content';

        // Positive prompt section
        if (result.positive) {
            const positiveSection = document.createElement('div');
            positiveSection.className = 'result-prompt-section';
            
            // Positive buttons above the prompt
            const positiveActions = document.createElement('div');
            positiveActions.className = 'result-prompt-actions';
            
            const positiveLabel = document.createElement('span');
            positiveLabel.className = 'prompt-label';
            positiveLabel.textContent = 'Positive:';
            positiveActions.appendChild(positiveLabel);
            
            const copyPositiveBtn = document.createElement('button');
            copyPositiveBtn.textContent = '📋 Copy';
            copyPositiveBtn.className = 'copy-button';
            copyPositiveBtn.title = 'Copy positive prompt to clipboard';
            copyPositiveBtn.addEventListener('click', () => {
                this.copyResult(result.positive, 'Positive prompt copied!');
            });
            positiveActions.appendChild(copyPositiveBtn);
            
            const copyToNodeBtn = document.createElement('button');
            copyToNodeBtn.textContent = '📤 To Node';
            copyToNodeBtn.className = 'copy-to-node-button';
            copyToNodeBtn.title = 'Copy positive prompt to selected node';
            copyToNodeBtn.addEventListener('click', () => {
                this.copyToNode(result.positive, 'Positive');
            });
            positiveActions.appendChild(copyToNodeBtn);
            
            positiveSection.appendChild(positiveActions);
            
            // Positive text
            const positiveDiv = document.createElement('div');
            positiveDiv.className = 'result-text positive';
            positiveDiv.textContent = result.positive;
            positiveSection.appendChild(positiveDiv);
            
            content.appendChild(positiveSection);
        }

        // Negative prompt section
        if (result.negative) {
            const negativeSection = document.createElement('div');
            negativeSection.className = 'result-prompt-section';
            
            // Negative buttons above the prompt
            const negativeActions = document.createElement('div');
            negativeActions.className = 'result-prompt-actions';
            
            const negativeLabel = document.createElement('span');
            negativeLabel.className = 'prompt-label';
            negativeLabel.textContent = 'Negative:';
            negativeActions.appendChild(negativeLabel);
            
            const copyNegativeBtn = document.createElement('button');
            copyNegativeBtn.textContent = '� Copy';
            copyNegativeBtn.className = 'copy-button';
            copyNegativeBtn.title = 'Copy negative prompt to clipboard';
            copyNegativeBtn.addEventListener('click', () => {
                this.copyResult(result.negative, 'Negative prompt copied!');
            });
            negativeActions.appendChild(copyNegativeBtn);
            
            const copyToNodeBtn = document.createElement('button');
            copyToNodeBtn.textContent = '📤 To Node';
            copyToNodeBtn.className = 'copy-to-node-button';
            copyToNodeBtn.title = 'Copy negative prompt to selected node';
            copyToNodeBtn.addEventListener('click', () => {
                this.copyToNode(result.negative, 'Negative');
            });
            negativeActions.appendChild(copyToNodeBtn);
            
            negativeSection.appendChild(negativeActions);
            
            // Negative text
            const negativeDiv = document.createElement('div');
            negativeDiv.className = 'result-text negative';
            negativeDiv.textContent = result.negative;
            negativeSection.appendChild(negativeDiv);
            
            content.appendChild(negativeSection);
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
     * Copy text to selected node
     * @param {string} text - Text to copy
     * @param {string} promptType - Type of prompt (Positive/Negative)
     */
    copyToNode(text, promptType) {
        const success = copyTextToSelectedNode(app, text);
        if (success) {
            this.showMessage(`${promptType} prompt copied to selected node!`, 'success');
        } else {
            this.showMessage('Please select a CLIPTextEncode or Sage text node first', 'warning');
        }
    },

    /**
     * Copy text from selected node to prompt textarea
     * @param {string} promptType - 'positive' or 'negative'
     */
    copyFromNode(promptType = 'positive') {
        const result = copyTextFromSelectedNode(app);
        
        if (result.success) {
            const textarea = promptType === 'positive' ? this.elements.positiveTextarea : this.elements.negativeTextarea;
            const action = promptType === 'positive' ? actions.setPositivePrompt : actions.setNegativePrompt;
            
            // Set text in the appropriate textarea
            textarea.value = result.text;
            // Update state
            action(result.text);
            // Trigger input event
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            
            this.showMessage(`Text copied from ${result.nodeType} node to ${promptType} prompt!`, 'success');
        } else {
            this.showMessage(result.error || 'Please select a CLIPTextEncode or Sage text node first', 'warning');
        }
    },

    /**
     * Load result back into input fields
     * @param {Object} result - The result to load
     */
    loadResult(result) {
        if (result.positive) {
            this.elements.positiveTextarea.value = result.originalPositive || result.positive;
            actions.setPositivePrompt(this.elements.positiveTextarea.value);
        }
        if (result.negative) {
            this.elements.negativeTextarea.value = result.originalNegative || result.negative;
            actions.setNegativePrompt(this.elements.negativeTextarea.value);
        }
        if (result.seed) {
            this.elements.seedInput.value = result.seed;
            actions.setPromptSeed(result.seed);
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
     * Ensure prompt builder stylesheet is loaded
     */
    addStyles() {
        ensurePromptBuilderStyles();
    }
};

export default promptGenerationComponent;

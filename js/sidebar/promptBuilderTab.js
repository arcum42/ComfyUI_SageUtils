/**
 * Prompt Builder Tab - Main tab component for prompt generation and management
 */

import { promptGenerationComponent } from '../promptBuilder/promptGeneration.js';
import { tagLibraryComponent } from '../promptBuilder/tagLibrary.js';
import { savedPromptsComponent } from '../promptBuilder/savedPrompts.js';
import { copyToClipboard } from '../components/clipboard.js';

/**
 * Creates the main Prompt Builder tab content
 * @param {HTMLElement} container - The container element for the tab
 * @returns {Object} - Tab utility object
 */
export function createPromptBuilderTab(container) {
    // Clear any existing content
    container.innerHTML = '';
    container.className = 'prompt-builder-tab';
    
    // Create wrapper for better styling
    const wrapper = document.createElement('div');
    wrapper.className = 'prompt-builder-wrapper';

    // Create header
    const header = createHeader();
    wrapper.appendChild(header);

    // Create main content area
    const contentArea = document.createElement('div');
    contentArea.className = 'prompt-builder-content';

    // Add prompt generation section (always visible at top)
    const generationSection = createGenerationSection();
    contentArea.appendChild(generationSection);

    // Add tag library section (collapsible)
    const tagLibrarySection = createTagLibrarySection();
    contentArea.appendChild(tagLibrarySection);

    // Add saved prompts section (collapsible)
    const savedPromptsSection = createSavedPromptsSection();
    contentArea.appendChild(savedPromptsSection);

    wrapper.appendChild(contentArea);
    container.appendChild(wrapper);

    // Add styles
    addPromptBuilderStyles();
    
    // Return utility object like other tabs
    return {
        wrapper,
        generationSection,
        tagLibrarySection,
        savedPromptsSection,
        destroy: () => {
            destroyPromptBuilderTab(container);
        }
    };
}

/**
 * Creates the header section for the prompt builder
 * @returns {HTMLElement} - The header element
 */
function createHeader() {
    const header = document.createElement('div');
    header.className = 'prompt-builder-header';

    const title = document.createElement('h2');
    title.textContent = 'Prompt Builder';
    title.className = 'prompt-builder-title';

    const description = document.createElement('p');
    description.textContent = 'Generate prompts using wildcards, manage tags, and save prompt collections';
    description.className = 'prompt-builder-description';

    header.appendChild(title);
    header.appendChild(description);

    return header;
}

/**
 * Creates the prompt generation section
 * @returns {HTMLElement} - The generation section element
 */
function createGenerationSection() {
    const section = document.createElement('div');
    section.className = 'prompt-builder-section generation-section';

    const sectionHeader = document.createElement('div');
    sectionHeader.className = 'section-header';
    
    const sectionTitle = document.createElement('h3');
    sectionTitle.textContent = '📝 Prompt Generation';
    sectionTitle.className = 'section-title';
    
    sectionHeader.appendChild(sectionTitle);
    section.appendChild(sectionHeader);

    try {
        // Use the imported prompt generation component
        const generationComponent = promptGenerationComponent.create();
        section.appendChild(generationComponent);
    } catch (error) {
        console.error('Error creating prompt generation component:', error);
        // Fallback to simple content
        const fallbackContent = document.createElement('div');
        fallbackContent.className = 'prompt-builder-fallback';
        fallbackContent.innerHTML = `
            <div style="padding: 16px;">
                <h4>Prompt Builder</h4>
                <p>Error loading prompt generation component: ${error.message}</p>
                <p>Please check the console for more details.</p>
            </div>
        `;
        section.appendChild(fallbackContent);
    }

    return section;
}

/**
 * Creates the tag library section
 * @returns {HTMLElement} - The tag library section element
 */
function createTagLibrarySection() {
    const section = document.createElement('div');
    section.className = 'prompt-builder-section tag-library-section';

    const sectionHeader = document.createElement('div');
    sectionHeader.className = 'section-header collapsible-header';
    
    const sectionTitle = document.createElement('h3');
    sectionTitle.textContent = '🏷️ Tag Library';
    sectionTitle.className = 'section-title';
    
    const collapseBtn = document.createElement('button');
    collapseBtn.className = 'collapse-btn';
    collapseBtn.textContent = '▼';
    collapseBtn.title = 'Toggle tag library';
    
    sectionHeader.appendChild(sectionTitle);
    sectionHeader.appendChild(collapseBtn);
    section.appendChild(sectionHeader);

    const sectionContent = document.createElement('div');
    sectionContent.className = 'section-content';
    
    // Add collapsible functionality
    let isCollapsed = false; // Default: expanded
    
    const toggleCollapse = () => {
        isCollapsed = !isCollapsed;
        sectionContent.style.display = isCollapsed ? 'none' : 'block';
        collapseBtn.textContent = isCollapsed ? '▶' : '▼';
        section.classList.toggle('collapsed', isCollapsed);
    };
    
    sectionHeader.addEventListener('click', toggleCollapse);

    try {
        // Create tag library component with tag insertion callbacks
        const tagLibraryOptions = {
            allowEdit: true,
            showSearch: true,
            compactMode: false,
            onTagInsert: (tag) => {
                insertTagIntoActivePrompt(tag);
            },
            onTagSetInsert: (tagSet, tagsText) => {
                insertTagIntoActivePrompt(tagsText);
            }
        };
        
        // Show loading state while component loads
        sectionContent.innerHTML = '<div class="loading-state">Loading tag library...</div>';
        
        // Create the component asynchronously
        tagLibraryComponent.create(sectionContent, tagLibraryOptions).then(() => {
            // Component loaded successfully
            console.log('Tag library component loaded successfully');
        }).catch((error) => {
            console.error('Failed to load tag library component:', error);
            // Show error fallback
            sectionContent.innerHTML = `
                <div class="tag-library-fallback">
                    <div style="padding: 16px;">
                        <h4>Tag Library</h4>
                        <p>Error loading tag library: ${error.message}</p>
                        <p>Please check the console for more details.</p>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error creating tag library component:', error);
        // Fallback content
        const fallbackContent = document.createElement('div');
        fallbackContent.className = 'tag-library-fallback';
        fallbackContent.innerHTML = `
            <div style="padding: 16px;">
                <h4>Tag Library</h4>
                <p>Error loading tag library: ${error.message}</p>
                <p>Please check the console for more details.</p>
            </div>
        `;
        sectionContent.appendChild(fallbackContent);
    }
    
    section.appendChild(sectionContent);
    return section;
}

/**
 * Creates the saved prompts section
 * @returns {HTMLElement} - The saved prompts section element
 */
function createSavedPromptsSection() {
    const section = document.createElement('div');
    section.className = 'prompt-builder-section saved-prompts-section';

    const sectionHeader = document.createElement('div');
    sectionHeader.className = 'section-header collapsible-header';
    
    const sectionTitle = document.createElement('h3');
    sectionTitle.textContent = '💾 Saved Prompts';
    sectionTitle.className = 'section-title';
    
    const collapseBtn = document.createElement('button');
    collapseBtn.className = 'collapse-btn';
    collapseBtn.textContent = '▶'; // Default: collapsed
    collapseBtn.title = 'Toggle saved prompts';
    
    sectionHeader.appendChild(sectionTitle);
    sectionHeader.appendChild(collapseBtn);
    section.appendChild(sectionHeader);

    const sectionContent = document.createElement('div');
    sectionContent.className = 'section-content';
    sectionContent.style.display = 'none'; // Default: collapsed
    
    // Add collapsible functionality
    let isCollapsed = true; // Default: collapsed
    
    const toggleCollapse = () => {
        isCollapsed = !isCollapsed;
        sectionContent.style.display = isCollapsed ? 'none' : 'block';
        collapseBtn.textContent = isCollapsed ? '▶' : '▼';
        section.classList.toggle('collapsed', isCollapsed);
        
        // Load component when expanded for first time
        if (!isCollapsed && !sectionContent.hasChildNodes()) {
            loadSavedPromptsComponent(sectionContent);
        }
    };
    
    sectionHeader.addEventListener('click', toggleCollapse);

    section.appendChild(sectionContent);
    return section;
}

/**
 * Load the saved prompts component
 * @param {HTMLElement} container - Container for the component
 */
function loadSavedPromptsComponent(container) {
    try {
        // Show loading state
        container.innerHTML = '<div class="loading-state">Loading saved prompts...</div>';
        
        // Create the component
        const component = savedPromptsComponent.create();
        container.innerHTML = '';
        container.appendChild(component);
        
        console.log('Saved prompts component loaded successfully');
    } catch (error) {
        console.error('Failed to load saved prompts component:', error);
        container.innerHTML = `
            <div class="saved-prompts-fallback">
                <div style="padding: 16px;">
                    <h4>Saved Prompts</h4>
                    <p>Error loading saved prompts: ${error.message}</p>
                    <p>Please check the console for more details.</p>
                </div>
            </div>
        `;
    }
}

/**
 * Insert a tag into the active prompt field
 * @param {string} tag - The tag text to insert
 */
function insertTagIntoActivePrompt(tag) {
    try {
        // Find the currently focused prompt input
        const activeInput = document.querySelector('.prompt-generation-component .positive-prompt:focus, .prompt-generation-component .negative-prompt:focus');
        
        if (activeInput) {
            // Insert at cursor position
            const start = activeInput.selectionStart;
            const end = activeInput.selectionEnd;
            const currentValue = activeInput.value;
            
            // Add comma and space if there's existing text and it doesn't end with a comma or space
            let insertText = tag;
            if (start > 0 && !currentValue.slice(start - 1, start).match(/[,\s]/)) {
                insertText = ', ' + tag;
            }
            
            // Insert the tag
            const newValue = currentValue.slice(0, start) + insertText + currentValue.slice(end);
            activeInput.value = newValue;
            
            // Update cursor position
            const newCursorPos = start + insertText.length;
            activeInput.setSelectionRange(newCursorPos, newCursorPos);
            
            // Trigger input event to update any bound data
            activeInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Keep focus on the input
            activeInput.focus();
            
            // Show feedback
            showTagInsertionFeedback(tag);
        } else {
            // No active input, copy to clipboard instead
            copyToClipboard(tag);
            showTagInsertionFeedback(tag, 'clipboard');
        }
    } catch (error) {
        console.error('Error inserting tag:', error);
        // Fallback to clipboard
        copyToClipboard(tag);
        showTagInsertionFeedback(tag, 'clipboard');
    }
}

// copyToClipboard function removed - now imported from components/clipboard.js

/**
 * Show feedback for tag insertion
 * @param {string} tag - The inserted tag
 * @param {string} method - 'insert' or 'clipboard'
 */
function showTagInsertionFeedback(tag, method = 'insert') {
    const message = method === 'clipboard' 
        ? `Copied "${tag}" to clipboard`
        : `Inserted "${tag}" into prompt`;
    
    // Find or create feedback element
    let feedback = document.querySelector('.tag-insertion-feedback');
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.className = 'tag-insertion-feedback';
        document.body.appendChild(feedback);
    }
    
    feedback.textContent = message;
    feedback.style.cssText = `
        position: fixed;
        top: 50px;
        right: 20px;
        padding: 8px 12px;
        background: var(--primary-color, #4a9eff);
        color: white;
        border-radius: 4px;
        font-size: 12px;
        z-index: 10000;
        opacity: 1;
        transition: opacity 0.3s ease;
    `;
    
    // Auto-hide after 2 seconds
    setTimeout(() => {
        feedback.style.opacity = '0';
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 300);
    }, 2000);
}

/**
 * Adds CSS styles for the prompt builder
 */
function addPromptBuilderStyles() {
    const styleId = 'prompt-builder-styles';
    
    // Remove existing styles if they exist
    const existingStyles = document.getElementById(styleId);
    if (existingStyles) {
        existingStyles.remove();
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .prompt-builder-tab {
            height: 100%;
            display: flex;
            flex-direction: column;
            background: var(--bg-color, #1a1a1a);
            color: var(--fg-color, #ffffff);
            font-family: var(--font-family, 'Segoe UI', sans-serif);
        }

        .prompt-builder-wrapper {
            height: 100%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .prompt-builder-header {
            padding: 16px;
            border-bottom: 1px solid var(--border-color, #444);
            background: var(--bg-color-secondary, #2a2a2a);
        }

        .prompt-builder-title {
            margin: 0 0 8px 0;
            font-size: 20px;
            font-weight: 600;
            color: var(--primary-color, #4a9eff);
        }

        .prompt-builder-description {
            margin: 0;
            font-size: 14px;
            color: var(--text-secondary, #cccccc);
            line-height: 1.4;
        }

        .prompt-builder-content {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
        }

        .prompt-builder-section {
            margin-bottom: 24px;
            border: 1px solid var(--border-color, #444);
            border-radius: 8px;
            background: var(--bg-color-tertiary, #1e1e1e);
        }

        .section-header {
            padding: 12px 16px;
            border-bottom: 1px solid var(--border-color, #444);
            background: var(--bg-color-secondary, #2a2a2a);
            border-radius: 8px 8px 0 0;
        }

        .section-title {
            margin: 0;
            font-size: 16px;
            font-weight: 500;
            color: var(--fg-color, #ffffff);
        }

        .generation-section {
            border-color: var(--primary-color, #4a9eff);
        }

        .generation-section .section-header {
            background: linear-gradient(135deg, var(--primary-color, #4a9eff) 0%, var(--primary-dark, #357abd) 100%);
        }

        .generation-section .section-title {
            color: white;
        }

        .tag-library-section {
            border-color: var(--success-color, #6bcf7f);
        }

        .tag-library-section .section-header {
            background: linear-gradient(135deg, var(--success-color, #6bcf7f) 0%, var(--success-dark, #4a9a5a) 100%);
            cursor: pointer;
        }

        .saved-prompts-section {
            border-color: var(--warning-color, #ffa726);
        }

        .saved-prompts-section .section-header {
            background: linear-gradient(135deg, var(--warning-color, #ffa726) 0%, var(--warning-dark, #f57c00) 100%);
            cursor: pointer;
        }

        .saved-prompts-section .section-title {
            color: white;
        }

        /* Saved Prompts Component Styles */
        .saved-prompts-component {
            padding: 0;
        }

        .saved-prompts-header {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }

        .category-container {
            display: flex;
            gap: 4px;
            align-items: center;
        }

        .search-input, .category-filter {
            flex: 1;
            min-width: 120px;
            padding: 8px;
            border: 1px solid var(--border-color, #444);
            border-radius: 4px;
            background: var(--bg-color, #1a1a1a);
            color: var(--fg-color, #ffffff);
        }

        .add-category-btn {
            width: 32px;
            height: 32px;
            padding: 0;
            background: var(--success-color, #6bcf7f);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .add-category-btn:hover {
            background: var(--success-dark, #4a9a5a);
        }

        .save-prompt-btn {
            padding: 8px 16px;
            background: var(--primary-color, #4a9eff);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            white-space: nowrap;
        }

        .save-prompt-btn:hover {
            background: var(--primary-dark, #357abd);
        }

        .prompts-list {
            max-height: 400px;
            overflow-y: auto;
            border: 1px solid var(--border-color, #444);
            border-radius: 4px;
            background: var(--bg-color-tertiary, #1e1e1e);
        }

        .prompt-card {
            padding: 12px;
            border-bottom: 1px solid var(--border-color, #444);
            cursor: pointer;
            transition: background-color 0.2s;
        }

        .prompt-card:hover {
            background: var(--bg-color-secondary, #2a2a2a);
        }

        .prompt-card:last-child {
            border-bottom: none;
        }

        .prompt-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .prompt-name {
            margin: 0;
            font-size: 14px;
            font-weight: 500;
            color: var(--primary-color, #4a9eff);
        }

        .prompt-actions {
            display: flex;
            gap: 4px;
        }

        .load-btn, .delete-btn {
            padding: 4px 8px;
            font-size: 12px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
        }

        .load-btn {
            background: var(--success-color, #6bcf7f);
            color: white;
        }

        .delete-btn {
            background: var(--error-color, #ff6b6b);
            color: white;
            width: 24px;
            height: 24px;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .prompt-preview {
            font-size: 12px;
            color: var(--text-secondary, #cccccc);
            margin-bottom: 8px;
            line-height: 1.4;
        }

        .prompt-meta {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: var(--text-tertiary, #888);
        }

        .category {
            background: var(--bg-color-secondary, #2a2a2a);
            padding: 2px 6px;
            border-radius: 2px;
            font-weight: 500;
        }

        .empty-state, .error-state {
            text-align: center;
            padding: 32px 16px;
            color: var(--text-secondary, #cccccc);
        }

        .empty-content h4 {
            margin: 0 0 8px 0;
            color: var(--fg-color, #ffffff);
        }

        /* Dialog Styles */
        .dialog-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        }

        .save-prompt-dialog {
            background: var(--bg-color, #1a1a1a);
            border: 1px solid var(--border-color, #444);
            border-radius: 8px;
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
        }

        .add-category-dialog {
            background: var(--bg-color, #1a1a1a);
            border: 1px solid var(--border-color, #444);
            border-radius: 8px;
            width: 90%;
            max-width: 400px;
        }

        .dialog-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            border-bottom: 1px solid var(--border-color, #444);
        }

        .dialog-header h3 {
            margin: 0;
            color: var(--fg-color, #ffffff);
        }

        .close-btn {
            background: none;
            border: none;
            color: var(--text-secondary, #cccccc);
            font-size: 18px;
            cursor: pointer;
            padding: 4px;
        }

        .dialog-content {
            padding: 16px;
        }

        .form-group {
            margin-bottom: 16px;
        }

        .form-group label {
            display: block;
            margin-bottom: 4px;
            font-weight: 500;
            color: var(--fg-color, #ffffff);
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 8px;
            border: 1px solid var(--border-color, #444);
            border-radius: 4px;
            background: var(--bg-color-tertiary, #1e1e1e);
            color: var(--fg-color, #ffffff);
            font-family: inherit;
        }

        .form-group textarea {
            resize: vertical;
            min-height: 60px;
        }

        .help-text {
            display: block;
            margin-top: 4px;
            font-size: 11px;
            color: var(--text-tertiary, #888);
            font-style: italic;
        }

        .dialog-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            padding: 16px;
            border-top: 1px solid var(--border-color, #444);
        }

        .cancel-btn {
            padding: 8px 16px;
            background: var(--bg-color-secondary, #2a2a2a);
            color: var(--fg-color, #ffffff);
            border: 1px solid var(--border-color, #444);
            border-radius: 4px;
            cursor: pointer;
        }

        .primary-btn {
            padding: 8px 16px;
            background: var(--primary-color, #4a9eff);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }

        .primary-btn:hover {
            background: var(--primary-dark, #357abd);
        }

        .collapsible-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            user-select: none;
        }

        .collapse-btn {
            background: none;
            border: none;
            color: white;
            font-size: 12px;
            cursor: pointer;
            padding: 4px;
            border-radius: 3px;
            transition: background-color 0.2s ease;
        }

        .collapse-btn:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .section-content {
            padding: 16px;
        }

        .tag-library-section.collapsed .section-content {
            display: none;
        }

        .tag-library-fallback {
            padding: 16px;
            text-align: center;
            color: var(--text-secondary, #cccccc);
        }

        .tag-library-fallback h4 {
            color: var(--error-color, #ff6b6b);
            margin: 0 0 12px 0;
        }

        .tag-library-fallback p {
            margin: 8px 0;
            font-size: 14px;
        }

        .loading-state {
            padding: 32px 16px;
            text-align: center;
            color: var(--text-secondary, #cccccc);
            font-size: 14px;
        }

        .loading-state::before {
            content: '';
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid var(--border-color, #444);
            border-radius: 50%;
            border-top-color: var(--primary-color, #4a9eff);
            animation: spin 1s linear infinite;
            margin-right: 8px;
            vertical-align: middle;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .tag-insertion-feedback {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            font-weight: 500;
        }

        /* Responsive design */
        @media (max-width: 768px) {
            .prompt-builder-header {
                padding: 12px;
            }

            .prompt-builder-content {
                padding: 12px;
            }

            .prompt-builder-title {
                font-size: 18px;
            }
        }
    `;

    document.head.appendChild(style);
}

/**
 * Cleanup function for the prompt builder tab
 * @param {HTMLElement} container - The container to clean up
 */
export function destroyPromptBuilderTab(container) {
    // Remove styles
    const styles = document.getElementById('prompt-builder-styles');
    if (styles) {
        styles.remove();
    }

    // Clear container
    if (container) {
        container.innerHTML = '';
        container.className = '';
    }
}

export default createPromptBuilderTab;

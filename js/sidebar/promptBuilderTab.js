/**
 * Prompt Builder Tab - Main tab component for prompt generation and management
 */

import { promptGenerationComponent } from '../promptBuilder/promptGeneration.js';
import { tagLibraryComponent } from '../promptBuilder/tagLibrary.js';
import { savedPromptsComponent } from '../promptBuilder/savedPrompts.js';
import { copyToClipboard } from '../components/clipboard.js';
import { loadSidebarStyle } from './sidebarStyles.js';

/**
 * Creates the main Prompt Builder tab content
 * @param {HTMLElement} container - The container element for the tab
 * @returns {Object} - Tab utility object
 */
export function createPromptBuilderTab(container) {
    // Clear any existing content
    container.innerHTML = '';
    
    // Create wrapper for better styling
    const wrapper = document.createElement('div');
    wrapper.className = 'prompt-builder-tab prompt-builder-wrapper';

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

    // Load external prompt builder styles
    loadSidebarStyle('prompt-builder-styles', 'extensions/comfyui_sageutils/sidebar/promptBuilder.css');
    
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
            <div class="prompt-builder-fallback__content">
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
                    <div class="prompt-builder-fallback__content">
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
            <div class="prompt-builder-fallback__content">
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
    section.classList.add('collapsed');
    
    // Add collapsible functionality
    let isCollapsed = true; // Default: collapsed
    
    const toggleCollapse = () => {
        isCollapsed = !isCollapsed;
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
                <div class="prompt-builder-fallback__content">
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
    feedback.classList.remove('tag-insertion-feedback--hidden');
    feedback.classList.add('tag-insertion-feedback');
    
    // Auto-hide after 2 seconds
    setTimeout(() => {
        feedback.classList.add('tag-insertion-feedback--hidden');
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 300);
    }, 2000);
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
    }
}

export default createPromptBuilderTab;

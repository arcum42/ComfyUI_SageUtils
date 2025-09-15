/**
 * Prompt Builder Tab - Main tab component for prompt generation and management
 */

import { promptGenerationComponent } from '../components/promptBuilder/promptGeneration.js';

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

    wrapper.appendChild(contentArea);
    container.appendChild(wrapper);

    // Add styles
    addPromptBuilderStyles();
    
    // Return utility object like other tabs
    return {
        wrapper,
        generationSection,
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

        .prompt-builder-fallback {
            padding: 16px;
            text-align: center;
            color: var(--text-secondary, #cccccc);
        }

        .prompt-builder-fallback h4 {
            color: var(--error-color, #ff6b6b);
            margin: 0 0 12px 0;
        }

        .prompt-builder-fallback p {
            margin: 8px 0;
            font-size: 14px;
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

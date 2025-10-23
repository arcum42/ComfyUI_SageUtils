/**
 * LLM Tab Header Component
 * Creates the header section with title and description
 */

/**
 * Creates the header section
 * @returns {HTMLElement} - Header element
 */
export function createHeader() {
    const header = document.createElement('div');
    header.className = 'llm-header';
    header.setAttribute('role', 'banner');
    
    const title = document.createElement('h2');
    title.textContent = 'LLM Chat';
    title.className = 'llm-title';
    title.id = 'llm-tab-title';
    title.setAttribute('aria-label', 'LLM Chat Interface');
    
    const description = document.createElement('p');
    description.textContent = 'Chat with language models using Ollama or LM Studio';
    description.className = 'llm-description';
    
    header.appendChild(title);
    header.appendChild(description);
    
    return header;
}

/**
 * LLM Tab Header Component
 * Creates the header section with title and description
 */

import { loadHtmlTemplate, createElementFromTemplate } from '../../../utils/htmlTemplateLoader.js';

let llmHeaderTemplate = null;

async function getLlmHeaderTemplate() {
    if (!llmHeaderTemplate) {
        llmHeaderTemplate = await loadHtmlTemplate('extensions/comfyui_sageutils/sidebar/llmTab/partials/llmHeader.html');
    }
    return llmHeaderTemplate;
}

/**
 * Creates the header section
 * @returns {Promise<HTMLElement>} - Header element
 */
export async function createHeader() {
    const template = await getLlmHeaderTemplate();
    return createElementFromTemplate(template);
}

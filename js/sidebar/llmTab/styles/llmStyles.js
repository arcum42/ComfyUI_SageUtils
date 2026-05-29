/**
 * LLM Tab Styles
 * Connects the LLM tab to the shared sidebar stylesheet loader.
 */

import { loadSidebarStyle } from '../../sidebarStyles.js';

/**
 * Load LLM tab stylesheet via shared sidebar style loader.
 */
export function addLLMStyles() {
    loadSidebarStyle('llm-tab-styles', 'extensions/comfyui_sageutils/sidebar/llmTab/styles/llmStyles.css');
}

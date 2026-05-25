/**
 * LLM Tab Styles
 * All CSS-in-JS styles for the LLM tab
 */

/**
 * Add LLM tab styles to the document
 */
export function addLLMStyles() {
    const styleId = "llm-tab-styles";

  // Remove existing styles if they exist
    const existingStyles = document.getElementById(styleId);
    if (existingStyles) {
    existingStyles.remove();
    }

  // Create and append the CSS link
    const link = document.createElement("link");
    link.id = styleId;
    link.rel = "stylesheet";
    link.type = "text/css";

  // Path per ComfyUI convention (omit js/ in URL)
    link.href = "extensions/comfyui_sageutils/sidebar/llmTab/styles/llmStyles.css";
    document.head.appendChild(link);
}

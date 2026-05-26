const STYLE_LINK_SELECTOR = 'link[data-prompt-builder-styles]';
const STYLE_HREF = 'extensions/comfyui_sageutils/promptBuilder/promptBuilder.css';

export function ensurePromptBuilderStyles() {
    if (typeof document === 'undefined') return;
    if (document.querySelector(STYLE_LINK_SELECTOR)) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = STYLE_HREF;
    link.dataset.promptBuilderStyles = 'true';
    document.head.appendChild(link);
}

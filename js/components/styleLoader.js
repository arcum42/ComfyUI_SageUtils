const STYLE_LINK_SELECTOR = 'link[data-sage-component-styles]';
const STYLE_HREF = 'extensions/comfyui_sageutils/components/components.css';

export function loadComponentStyles(moduleName = 'unknown') {
    const debugPrefix = `[SageUtils] ${moduleName} loadComponentStyles`;
    console.log(`${debugPrefix}: start`);

    try {
        const existingLink = document.querySelector(STYLE_LINK_SELECTOR);
        if (existingLink) {
            console.log(`${debugPrefix}: already loaded`);
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = STYLE_HREF;
        link.dataset.sageComponentStyles = 'true';
        if (!document.head) {
            console.warn(`${debugPrefix}: document.head is not ready`);
        }
        document.head.appendChild(link);

        console.log(`${debugPrefix}: injected stylesheet`);
    } catch (err) {
        console.error(`${debugPrefix} failed`, err);
        throw err;
    }
}

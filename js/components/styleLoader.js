const STYLE_LINK_SELECTOR = 'link[data-sage-component-styles]';
const STYLE_HREFS = [
    'extensions/comfyui_sageutils/components/buttons.css',
    'extensions/comfyui_sageutils/components/forms.css',
    'extensions/comfyui_sageutils/components/layout.css',
    'extensions/comfyui_sageutils/components/dialogs.css',
    'extensions/comfyui_sageutils/components/gallery.css',
];

export function loadComponentStyles(moduleName = 'unknown') {
    const debugPrefix = `[SageUtils] ${moduleName} loadComponentStyles`;
    console.log(`${debugPrefix}: start`);

    try {
        const existingLink = document.querySelector(STYLE_LINK_SELECTOR);
        if (existingLink) {
            console.log(`${debugPrefix}: already loaded`);
            return;
        }

        if (!document.head) {
            console.warn(`${debugPrefix}: document.head is not ready`);
            return;
        }

        STYLE_HREFS.forEach((href) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = href;
            link.dataset.sageComponentStyles = 'true';
            document.head.appendChild(link);
            console.log(`${debugPrefix}: injected stylesheet ${href}`);
        });
    } catch (err) {
        console.error(`${debugPrefix} failed`, err);
        throw err;
    }
}

const STYLE_LINK_SELECTOR = 'link[data-sage-component-styles]';
const STYLE_HREFS = [
    'extensions/comfyui_sageutils/components/buttons.css',
    'extensions/comfyui_sageutils/components/forms.css',
    'extensions/comfyui_sageutils/components/layout.css',
    'extensions/comfyui_sageutils/components/dialogs.css',
    'extensions/comfyui_sageutils/components/gallery.css',
];

let stylesLoaded = false;

export function loadComponentStyles(moduleName = 'unknown') {
    if (stylesLoaded) {
        return;
    }

    try {
        const existingLink = document.querySelector(STYLE_LINK_SELECTOR);
        if (existingLink) {
            stylesLoaded = true;
            return;
        }

        if (!document.head) {
            console.warn(`[SageUtils] ${moduleName} loadComponentStyles: document.head is not ready`);
            return;
        }

        STYLE_HREFS.forEach((href) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = href;
            link.dataset.sageComponentStyles = 'true';
            document.head.appendChild(link);
        });
        stylesLoaded = true;
    } catch (err) {
        console.error(`[SageUtils] ${moduleName} loadComponentStyles failed`, err);
        throw err;
    }
}

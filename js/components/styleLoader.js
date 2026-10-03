import { loadSidebarStyle } from '../sidebar/sidebarStyles.js';

const STYLES = [
    { id: 'sage-component-buttons-styles', href: 'components/buttons.css' },
    { id: 'sage-component-forms-styles', href: 'components/forms.css' },
    { id: 'sage-component-layout-styles', href: 'components/layout.css' },
    { id: 'sage-component-dialogs-styles', href: 'components/dialogs.css' },
    { id: 'sage-component-gallery-styles', href: 'components/gallery.css' },
];

let stylesLoaded = false;

export function loadComponentStyles(moduleName = 'unknown') {
    if (stylesLoaded) {
        return;
    }

    try {
        if (!document.head) {
            console.warn(`[SageUtils] ${moduleName} loadComponentStyles: document.head is not ready`);
            return;
        }

        STYLES.forEach(({ id, href }) => loadSidebarStyle(id, href));
        stylesLoaded = true;
    } catch (err) {
        console.error(`[SageUtils] ${moduleName} loadComponentStyles failed`, err);
        throw err;
    }
}

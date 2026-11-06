import { loadSidebarStyle } from '../sidebar/sidebarStyles.js';

const STYLES = [
    { id: 'sage-component-tokens-styles', href: 'components/tokens.css' },
    { id: 'sage-component-patterns-styles', href: 'components/patterns.css' },
    { id: 'sage-component-file-manager-styles', href: 'components/fileManager.css' },
    { id: 'sage-component-buttons-styles', href: 'components/buttons.css' },
    { id: 'sage-component-forms-styles', href: 'components/forms.css' },
    { id: 'sage-component-layout-styles', href: 'components/layout.css' },
    { id: 'sage-component-dialogs-styles', href: 'components/dialogs.css' },
    { id: 'sage-component-gallery-styles', href: 'components/gallery.css' },
];

let stylesPromise = null;

/**
 * Load shared component stylesheets once.
 * @returns {Promise<boolean>} Resolves true when all loaded; a failure allows a later retry
 */
export function loadComponentStyles(moduleName = 'unknown') {
    if (stylesPromise) {
        return stylesPromise;
    }

    try {
        if (!document.head) {
            console.warn(`[SageUtils] ${moduleName} loadComponentStyles: document.head is not ready`);
            return Promise.resolve(false);
        }

        stylesPromise = Promise.all(STYLES.map(({ id, href }) => loadSidebarStyle(id, href)))
            .then((results) => {
                const ok = results.every(Boolean);
                if (!ok) {
                    stylesPromise = null;
                }
                return ok;
            });
        return stylesPromise;
    } catch (err) {
        console.error(`[SageUtils] ${moduleName} loadComponentStyles failed`, err);
        throw err;
    }
}

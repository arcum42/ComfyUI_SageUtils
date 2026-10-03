import { resolveExtensionAssetPath } from "../shared/extensionPaths.js";

export async function loadSidebarStyle(styleId, href) {
    if (typeof document === 'undefined' || !document.head) {
        return;
    }

    if (document.getElementById(styleId)) {
        return;
    }
    try {
        const link = document.createElement('link');
        link.id = styleId;
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = await resolveExtensionAssetPath(href);
        if (document.getElementById(styleId)) {
            return;
        }
        document.head.appendChild(link);
    } catch (error) {
        console.warn(`Failed to load sidebar stylesheet: ${href}`, error);
    }
}

export function loadSidebarStyles(styles) {
    styles.forEach(({ id, href }) => loadSidebarStyle(id, href));
}
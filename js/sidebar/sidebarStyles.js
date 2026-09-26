import { BASE_URLS } from "../shared/constants.js";

export function loadSidebarStyle(styleId, href) {
    if (typeof document === 'undefined' || !document.head) {
        return;
    }

    if (document.getElementById(styleId)) {
        return;
    }
    let full_href = "";

    full_href = BASE_URLS[0] + href;
    const response = fetch(full_href, {
        cache: 'no-store',
        credentials: 'same-origin'
    });

    if (!response.ok) {
        full_href = BASE_URLS[1] + href;
    }

    const link = document.createElement('link');

    link.id = styleId;
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = full_href;
    document.head.appendChild(link);
}

export function loadSidebarStyles(styles) {
    styles.forEach(({ id, href }) => loadSidebarStyle(id, href));
}
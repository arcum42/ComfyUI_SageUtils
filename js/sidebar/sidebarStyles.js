export function loadSidebarStyle(styleId, href) {
    if (typeof document === 'undefined' || !document.head) {
        return;
    }

    if (document.getElementById(styleId)) {
        return;
    }

    const link = document.createElement('link');
    link.id = styleId;
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = href;
    document.head.appendChild(link);
}

export function loadSidebarStyles(styles) {
    styles.forEach(({ id, href }) => loadSidebarStyle(id, href));
}

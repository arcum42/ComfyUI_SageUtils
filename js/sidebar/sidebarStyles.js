import { resolveExtensionAssetPath } from "../shared/extensionPaths.js";

const pendingLoads = new Map();
const failedLoads = new Map();

function waitForLink(link, href) {
    if (link.sheet) {
        return Promise.resolve(true);
    }
    return new Promise((resolve, reject) => {
        link.addEventListener('load', () => resolve(true), { once: true });
        link.addEventListener('error', () => reject(new Error(`Stylesheet failed to load: ${href}`)), { once: true });
    });
}

/**
 * Load a stylesheet once. Concurrent calls share one promise, a failed load removes
 * its link so a later call can retry, and the promise rejects only after the error is logged.
 * @returns {Promise<boolean>} Resolves true when the stylesheet is applied, false on failure
 */
export function loadSidebarStyle(styleId, href) {
    if (typeof document === 'undefined' || !document.head) {
        return Promise.resolve(false);
    }
    if (pendingLoads.has(styleId)) {
        return pendingLoads.get(styleId);
    }

    const existing = document.getElementById(styleId);
    if (existing && existing.sheet) {
        return Promise.resolve(true);
    }

    const task = (async () => {
        let link = existing;
        try {
            if (!link) {
                link = document.createElement('link');
                link.id = styleId;
                link.rel = 'stylesheet';
                link.type = 'text/css';
                link.href = await resolveExtensionAssetPath(href);
                document.head.appendChild(link);
            }
            const ok = await waitForLink(link, href);
            failedLoads.delete(styleId);
            return ok;
        } catch (error) {
            console.warn(`Failed to load sidebar stylesheet: ${href}`, error);
            link?.remove();
            failedLoads.set(styleId, href);
            return false;
        } finally {
            pendingLoads.delete(styleId);
        }
    })();

    pendingLoads.set(styleId, task);
    return task;
}

export function loadSidebarStyles(styles) {
    return Promise.all(styles.map(({ id, href }) => loadSidebarStyle(id, href)));
}


/** Stylesheets that failed to load and have not since succeeded. */
export function getFailedStyles() {
    return Array.from(failedLoads, ([id, href]) => ({ id, href }));
}

/**
 * Resolve once every in-flight stylesheet load has settled, or after timeoutMs.
 * @returns {Promise<boolean>} True when nothing is pending or failed
 */
export async function whenStylesSettled(timeoutMs = 4000) {
    const pending = Promise.all(pendingLoads.values());
    const timeout = new Promise((resolve) => setTimeout(resolve, timeoutMs));
    await Promise.race([pending, timeout]);
    return pendingLoads.size === 0 && failedLoads.size === 0;
}

/** Retry every failed stylesheet. @returns {Promise<boolean>} True when all now load */
export async function retryFailedStyles() {
    const failed = getFailedStyles();
    const results = await Promise.all(failed.map(({ id, href }) => loadSidebarStyle(id, href)));
    return results.every(Boolean);
}

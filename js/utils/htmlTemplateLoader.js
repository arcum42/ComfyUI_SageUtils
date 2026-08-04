const htmlTemplateCache = new Map();

function escapeHtml(value) {
    return value.replace(/[&<>"]|\'/g, (char) => {
        switch (char) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#39;';
            default: return char;
        }
    });
}

function getTemplateValue(key, data) {
    return key.split('.').reduce((current, part) => {
        return current && current[part] !== undefined ? current[part] : undefined;
    }, data);
}

function isTemplateLoaderDebugEnabled() {
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        if (new URLSearchParams(window.location.search).get('sageutils_template_debug') === '1') {
            return true;
        }
    } catch {
        // ignore malformed URL search
    }

    try {
        return window.localStorage?.getItem('sageutils_template_debug') === 'true';
    } catch {
        return false;
    }
}

let extensionBasePathCache = null;

function getExtensionBasePath() {
    if (extensionBasePathCache !== null) {
        return extensionBasePathCache;
    }

    if (typeof document === 'undefined') {
        extensionBasePathCache = null;
        return null;
    }

    const script = document.currentScript || Array.from(document.scripts || []).find((scriptEl) => {
        return scriptEl.src && scriptEl.src.includes('/extensions/') && scriptEl.src.endsWith('/utils/htmlTemplateLoader.js');
    });

    if (!script || !script.src) {
        extensionBasePathCache = null;
        return null;
    }

    try {
        const url = new URL(script.src, window.location.origin);
        const parts = url.pathname.split('/').filter(Boolean);
        const extIndex = parts.indexOf('extensions');
        if (extIndex !== -1 && parts.length > extIndex + 1) {
            extensionBasePathCache = '/' + parts.slice(0, extIndex + 2).join('/');
            return extensionBasePathCache;
        }
    } catch (error) {
        // ignore - fallback below
    }

    extensionBasePathCache = null;
    return null;
}

function resolveTemplateFetchPaths(templatePath) {
    if (templatePath.startsWith('/') || templatePath.startsWith('http://') || templatePath.startsWith('https://')) {
        const paths = [templatePath];
        if (isTemplateLoaderDebugEnabled()) {
            console.debug('[htmlTemplateLoader] resolveTemplateFetchPaths', templatePath, paths);
        }
        return paths;
    }

    if (templatePath.startsWith('extensions/')) {
        const defaultPath = '/' + templatePath;
        const paths = [defaultPath];
        const basePath = getExtensionBasePath();
        if (basePath) {
            const pathRest = templatePath.split('/').slice(2).join('/');
            const altPath = `${basePath}/${pathRest}`;
            if (altPath !== defaultPath) {
                paths.push(altPath);
            }
        }
        if (isTemplateLoaderDebugEnabled()) {
            console.debug('[htmlTemplateLoader] resolveTemplateFetchPaths', templatePath, paths, { basePath });
        }
        return paths;
    }

    const href = new URL(templatePath, window.location.origin + '/').href;
    if (isTemplateLoaderDebugEnabled()) {
        console.debug('[htmlTemplateLoader] resolveTemplateFetchPaths', templatePath, [href]);
    }
    return [href];
}

async function tryFetchTemplate(templatePath, fetchPath) {
    if (isTemplateLoaderDebugEnabled()) {
        console.debug('[htmlTemplateLoader] tryFetchTemplate', { templatePath, fetchPath });
    }

    const response = await fetch(fetchPath, {
        cache: 'no-store',
        credentials: 'same-origin'
    });
    if (!response.ok) {
        const error = new Error(`Unable to load HTML template: ${templatePath} (requested ${fetchPath}, status ${response.status})`);
        error.status = response.status;
        throw error;
    }
    return response.text();
}

async function fetchTemplateWithRetry(templatePath, fetchPath, retries = 2, delayMs = 120) {
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            return await tryFetchTemplate(templatePath, fetchPath);
        } catch (error) {
            lastError = error;
            if (attempt === retries || error.status !== 404) {
                throw error;
            }
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
    throw lastError;
}

export async function loadHtmlTemplate(templatePath) {
    if (typeof fetch === 'undefined') {
        return '';
    }

    if (htmlTemplateCache.has(templatePath)) {
        return htmlTemplateCache.get(templatePath);
    }

    const fetchPaths = resolveTemplateFetchPaths(templatePath);
    if (isTemplateLoaderDebugEnabled()) {
        console.debug('[htmlTemplateLoader] loadHtmlTemplate', { templatePath, fetchPaths });
    }

    let lastError = null;

    for (const path of fetchPaths) {
        try {
            const text = await fetchTemplateWithRetry(templatePath, path);
            htmlTemplateCache.set(templatePath, text);
            return text;
        } catch (error) {
            lastError = error;
            if (error.status !== 404 && error.name !== 'TypeError') {
                break;
            }
        }
    }

    throw lastError || new Error(`Unable to load HTML template: ${templatePath}`);
}

export async function preloadHtmlTemplates(templatePaths = []) {
    if (!Array.isArray(templatePaths)) {
        return;
    }

    const preloads = templatePaths.map(async (templatePath) => {
        try {
            await loadHtmlTemplate(templatePath);
        } catch (error) {
            console.warn(`Failed to preload HTML template: ${templatePath}`, error);
        }
    });

    await Promise.all(preloads);
}

export function renderHtmlTemplate(templateString, data = {}) {
    return templateString
        .replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, key) => {
            const value = getTemplateValue(key, data);
            return value == null ? '' : String(value);
        })
        .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
            const value = getTemplateValue(key, data);
            return value == null ? '' : escapeHtml(String(value));
        });
}

export function createElementFromTemplate(templateString, data = {}) {
    if (typeof document === 'undefined') {
        return null;
    }

    const rendered = renderHtmlTemplate(templateString, data).trim();
    const template = document.createElement('template');
    template.innerHTML = rendered;

    if (template.content.childElementCount === 1) {
        return template.content.firstElementChild;
    }

    return template.content;
}

export async function loadAndCreateHtmlTemplate(templatePath, data = {}) {
    const templateString = await loadHtmlTemplate(templatePath);
    return createElementFromTemplate(templateString, data);
}

export function clearHtmlTemplateCache(templatePath) {
    if (templatePath) {
        htmlTemplateCache.delete(templatePath);
        return;
    }

    htmlTemplateCache.clear();
}

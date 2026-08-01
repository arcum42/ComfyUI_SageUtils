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

function resolveTemplateFetchPaths(templatePath) {
    if (templatePath.startsWith('/') || templatePath.startsWith('http://') || templatePath.startsWith('https://')) {
        return [templatePath];
    }

    if (templatePath.startsWith('extensions/')) {
        return ['/' + templatePath];
    }

    return [new URL(templatePath, window.location.origin + '/').href];
}

async function tryFetchTemplate(templatePath, fetchPath) {
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

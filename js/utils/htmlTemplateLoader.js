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

export async function loadHtmlTemplate(templatePath) {
    if (typeof fetch === 'undefined') {
        return '';
    }

    if (htmlTemplateCache.has(templatePath)) {
        return htmlTemplateCache.get(templatePath);
    }

    const response = await fetch(templatePath, { cache: 'force-cache' });
    if (!response.ok) {
        throw new Error(`Unable to load HTML template: ${templatePath} (${response.status})`);
    }

    const text = await response.text();
    htmlTemplateCache.set(templatePath, text);
    return text;
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

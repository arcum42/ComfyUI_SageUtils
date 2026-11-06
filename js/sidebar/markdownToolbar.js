const FORMATS = [
    { label: 'Bold', icon: 'B', className: 'bold', before: '**', after: '**' },
    { label: 'Italic', icon: 'I', className: 'italic', before: '*', after: '*' },
    { label: 'Strikethrough', icon: 'S', className: 'strike', before: '~~', after: '~~' },
    { label: 'Heading', icon: 'H', linePrefix: '## ' },
    { label: 'Bulleted list', icon: 'UL', linePrefix: '- ' },
    { label: 'Numbered list', icon: 'OL', linePrefix: (index) => `${index + 1}. ` },
    { label: 'Blockquote', icon: '>', linePrefix: '> ' },
    { label: 'Inline code', icon: '</>', before: '`', after: '`' },
    { label: 'Link', icon: 'Link', before: '[', after: '](url)', selectSuffix: 'url' }
];

export function applyMarkdownFormat(textarea, format) {
    let start = textarea.selectionStart;
    let end = textarea.selectionEnd;
    const value = textarea.value;
    let replacement;
    let selectionStart;
    let selectionEnd;

    if (format.linePrefix) {
        start = start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1;
        const lastSelected = end > start && value[end - 1] === '\n' ? end - 1 : end;
        const lineEnd = value.indexOf('\n', lastSelected);
        end = lineEnd === -1 ? value.length : lineEnd;
        replacement = value.slice(start, end).split('\n').map((line, index) => {
            const prefix = typeof format.linePrefix === 'function' ? format.linePrefix(index) : format.linePrefix;
            return prefix + line;
        }).join('\n');
        selectionStart = start;
        selectionEnd = start + replacement.length;
    } else {
        const selected = value.slice(start, end);
        replacement = format.before + selected + format.after;
        if (format.selectSuffix) {
            selectionStart = start + replacement.lastIndexOf(format.selectSuffix);
            selectionEnd = selectionStart + format.selectSuffix.length;
        } else {
            selectionStart = start + format.before.length;
            selectionEnd = selectionStart + selected.length;
        }
    }

    textarea.setRangeText(replacement, start, end, 'select');
    textarea.focus();
    textarea.setSelectionRange(selectionStart, selectionEnd);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

export function createMarkdownToolbar(editor) {
    const toolbar = document.createElement('div');
    toolbar.className = 'markdown-toolbar';
    toolbar.setAttribute('role', 'group');
    toolbar.setAttribute('aria-label', 'Markdown formatting');
    toolbar.hidden = true;

    for (const format of FORMATS) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'markdown-toolbar-button';
        if (format.className) button.classList.add(`markdown-toolbar-button--${format.className}`);
        button.textContent = format.icon;
        button.title = format.label;
        button.setAttribute('aria-label', format.label);
        button.addEventListener('mousedown', (event) => event.preventDefault());
        button.addEventListener('click', () => applyMarkdownFormat(editor.textEditor, format));
        toolbar.appendChild(button);
    }

    editor.container.insertBefore(toolbar, editor.textEditor);
    return {
        update(filename) {
            toolbar.hidden = !filename || !/\.(md|markdown)$/i.test(filename);
        }
    };
}

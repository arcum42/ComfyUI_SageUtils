import assert from 'node:assert/strict';
import test from 'node:test';
import { applyMarkdownFormat, createMarkdownToolbar } from '../js/sidebar/markdownToolbar.js';

function textarea(value, start, end = start) {
    return {
        value,
        selectionStart: start,
        selectionEnd: end,
        events: [],
        setRangeText(text, from, to) {
            this.value = this.value.slice(0, from) + text + this.value.slice(to);
        },
        setSelectionRange(from, to) {
            this.selectionStart = from;
            this.selectionEnd = to;
        },
        focus() { this.focused = true; },
        dispatchEvent(event) { this.events.push(event); }
    };
}

test('inline formatting preserves the selection and dispatches input', () => {
    const editor = textarea('one two', 4, 7);
    applyMarkdownFormat(editor, { before: '**', after: '**' });
    assert.equal(editor.value, 'one **two**');
    assert.deepEqual([editor.selectionStart, editor.selectionEnd], [6, 9]);
    assert.equal(editor.focused, true);
    assert.equal(editor.events[0].type, 'input');
    assert.equal(editor.events[0].bubbles, true);
});

test('empty selections place the caret between markers and links select the URL', () => {
    const empty = textarea('hello', 5);
    applyMarkdownFormat(empty, { before: '*', after: '*' });
    assert.equal(empty.value, 'hello**');
    assert.deepEqual([empty.selectionStart, empty.selectionEnd], [6, 6]);
    const link = textarea('site', 0, 4);
    applyMarkdownFormat(link, { before: '[', after: '](url)', selectSuffix: 'url' });
    assert.equal(link.value, '[site](url)');
    assert.equal(link.value.slice(link.selectionStart, link.selectionEnd), 'url');
});

test('line formatting covers selected lines without including the next line', () => {
    const editor = textarea('one\ntwo\nthree', 1, 8);
    applyMarkdownFormat(editor, { linePrefix: (index) => `${index + 1}. ` });
    assert.equal(editor.value, '1. one\n2. two\nthree');
    assert.equal(editor.value.slice(editor.selectionStart, editor.selectionEnd), '1. one\n2. two');
    const firstEmptyLine = textarea('\nnext', 0);
    applyMarkdownFormat(firstEmptyLine, { linePrefix: '> ' });
    assert.equal(firstEmptyLine.value, '> \nnext');
});

test('toolbar is Markdown-only and its buttons apply formats through the editor', () => {
    const originalDocument = globalThis.document;
    globalThis.document = {
        createElement(tag) {
            return {
                tag, children: [], attributes: {}, listeners: {},
                classList: { add() {} },
                setAttribute(name, value) { this.attributes[name] = value; },
                addEventListener(name, callback) { this.listeners[name] = callback; },
                appendChild(child) { this.children.push(child); }
            };
        }
    };
    try {
        const textEditor = textarea('text', 0, 4);
        const container = { insertBefore(element, before) { this.toolbar = element; assert.equal(before, textEditor); } };
        const toolbar = createMarkdownToolbar({ container, textEditor });
        assert.equal(container.toolbar.hidden, true);
        toolbar.update('notes/README.MARKDOWN');
        assert.equal(container.toolbar.hidden, false);
        const bold = container.toolbar.children.find(button => button.attributes['aria-label'] === 'Bold');
        bold.listeners.click();
        assert.equal(textEditor.value, '**text**');
        toolbar.update('notes.txt');
        assert.equal(container.toolbar.hidden, true);
        toolbar.update(null);
        assert.equal(container.toolbar.hidden, true);
    } finally {
        globalThis.document = originalDocument;
    }
});

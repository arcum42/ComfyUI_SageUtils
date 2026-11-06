/**
 * Cross-tab text handoff helpers: shows what is being sent and lets the user
 * choose Append or Replace when the destination already has content.
 */

import { showOverlayModal } from '../components/modalA11y.js';
import { loadComponentStyles } from '../components/styleLoader.js';

const PREVIEW_LIMIT = 400;

// One open prompt per destination; a newer request supersedes an older one
const activePrompts = new Map();

function truncate(text) {
    const trimmed = String(text).trim();
    return trimmed.length > PREVIEW_LIMIT ? `${trimmed.slice(0, PREVIEW_LIMIT)}...` : trimmed;
}

/**
 * Ask whether incoming text should be appended to or replace existing content.
 * @param {Object} options
 * @param {string} options.destination - Destination label, e.g. "LLM prompt"
 * @param {string} options.source - Where the text came from
 * @param {string} options.text - Incoming text
 * @returns {Promise<'append'|'replace'|null>} null when cancelled or superseded
 */
export function askHandoffMode({ destination, source, text }) {
    loadComponentStyles('handoff.js');
    activePrompts.get(destination)?.();

    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'sage-handoff-overlay';

        const surface = document.createElement('div');
        surface.className = 'sage-handoff-dialog';

        const title = document.createElement('h3');
        title.className = 'sage-handoff-title';
        title.textContent = `Send to ${destination}`;

        const intro = document.createElement('p');
        intro.className = 'sage-handoff-intro';
        intro.textContent = `Content from ${source} is ready. ${destination} already has text.`;

        const preview = document.createElement('pre');
        preview.className = 'sage-handoff-preview';
        preview.textContent = truncate(text);
        preview.tabIndex = 0;
        preview.setAttribute('aria-label', 'Preview of incoming content');

        const buttons = document.createElement('div');
        buttons.className = 'sage-handoff-buttons';

        let settled = false;
        const finish = (value) => {
            if (settled) return;
            settled = true;
            if (activePrompts.get(destination) === cancel) activePrompts.delete(destination);
            overlay.remove();
            resolve(value);
        };
        const cancel = () => finish(null);
        activePrompts.set(destination, cancel);

        const addButton = (label, value, kind) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `sage-button sage-button--medium sage-button--${kind} sage-button--no-margin`;
            button.textContent = label;
            button.addEventListener('click', () => finish(value));
            buttons.appendChild(button);
            return button;
        };
        const appendButton = addButton('Append', 'append', 'primary');
        addButton('Replace', 'replace', 'secondary');
        addButton('Cancel', null, 'secondary');

        surface.append(title, intro, preview, buttons);
        overlay.appendChild(surface);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cancel();
        });
        surface.setAttribute('aria-labelledby', 'sage-handoff-title');
        title.id = 'sage-handoff-title';

        showOverlayModal(overlay, { surface });
        appendButton.focus();
    });
}

/**
 * Apply incoming text to a textarea following the handoff contract:
 * append === true appends, append === false replaces, undefined asks when the
 * textarea already holds different text.
 * @param {HTMLTextAreaElement} textarea
 * @param {Object} data - Bus message data ({ text, append, source })
 * @param {Object} options
 * @param {string} options.destination - Destination label
 * @param {string} [options.separator='\n']
 * @returns {Promise<'append'|'replace'|null>} Mode applied, or null if cancelled
 */
export async function applyIncomingText(textarea, data, { destination, separator = '\n' }) {
    const incoming = data?.text;
    if (!textarea || !incoming) return null;

    const existing = textarea.value;
    let mode;
    if (data.append === true) {
        mode = 'append';
    } else if (data.append === false || !existing.trim() || existing.trim() === String(incoming).trim()) {
        mode = 'replace';
    } else {
        mode = await askHandoffMode({
            destination,
            source: data.source || 'another tab',
            text: incoming
        });
        if (!mode) return null;
    }

    // Re-read after the prompt in case the user typed while it was open
    const current = textarea.value;
    textarea.value = mode === 'append' && current ? `${current}${separator}${incoming}` : incoming;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    return mode;
}

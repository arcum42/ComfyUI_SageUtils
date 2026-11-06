/**
 * Command palette: a searchable list of safe sidebar actions.
 * Commands are { id, label, hint?, run }. Built on modalA11y.
 */
import { showOverlayModal } from './modalA11y.js';

let openPalette = null;

export function openCommandPalette(commands) {
    if (openPalette) {
        openPalette.remove();
    }

    const overlay = document.createElement('div');
    overlay.className = 'sage-palette-overlay';

    const surface = document.createElement('div');
    surface.className = 'sage-palette';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'sage-palette-input';
    input.placeholder = 'Type a command...';
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-controls', 'sage-palette-list');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-label', 'Command search');

    const list = document.createElement('ul');
    list.className = 'sage-palette-list';
    list.id = 'sage-palette-list';
    list.setAttribute('role', 'listbox');

    surface.append(input, list);
    overlay.appendChild(surface);

    let matches = [];
    let active = 0;

    const close = () => overlay.remove();

    const render = () => {
        const q = input.value.trim().toLowerCase();
        matches = commands.filter(c => !q || c.label.toLowerCase().includes(q));
        active = Math.min(active, Math.max(matches.length - 1, 0));
        list.replaceChildren();
        matches.forEach((cmd, i) => {
            const li = document.createElement('li');
            li.className = 'sage-palette-item';
            li.id = `sage-palette-opt-${i}`;
            li.setAttribute('role', 'option');
            li.setAttribute('aria-selected', i === active ? 'true' : 'false');
            li.textContent = cmd.label;
            if (cmd.hint) {
                const hint = document.createElement('span');
                hint.className = 'sage-palette-hint';
                hint.textContent = cmd.hint;
                li.appendChild(hint);
            }
            li.addEventListener('click', () => run(cmd));
            list.appendChild(li);
        });
        if (!matches.length) {
            const empty = document.createElement('li');
            empty.className = 'sage-palette-empty';
            empty.textContent = 'No matching commands';
            list.appendChild(empty);
        }
        input.setAttribute('aria-activedescendant', matches.length ? `sage-palette-opt-${active}` : '');
    };

    const run = (cmd) => {
        close();
        try {
            cmd.run();
        } catch (error) {
            console.error('[CommandPalette] command failed:', error);
        }
    };

    input.addEventListener('input', () => { active = 0; render(); });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!matches.length) return;
            active = (active + (e.key === 'ArrowDown' ? 1 : matches.length - 1)) % matches.length;
            render();
            list.children[active]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (matches[active]) run(matches[active]);
        }
    });
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });

    render();
    showOverlayModal(overlay, { surface, label: 'Command palette' });
    input.focus();
    openPalette = overlay;
    return overlay;
}

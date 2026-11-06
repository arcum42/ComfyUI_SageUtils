/**
 * Shared modal accessibility behavior: dialog semantics, focus trap,
 * Escape handling for the topmost modal, and focus restore on release.
 */

const FOCUSABLE_SELECTOR = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
].join(',');

// Active modals, topmost last, so only the top one reacts to Escape and Tab
const activeModals = [];

/**
 * List visible focusable elements inside a root
 * @param {HTMLElement} root
 * @returns {HTMLElement[]}
 */
export function getFocusableElements(root) {
    return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR))
        .filter((el) => !el.hidden && el.getClientRects().length > 0);
}

/**
 * Activate modal behavior for a dialog that is already attached to the document.
 * @param {HTMLElement} dialogEl - The dialog surface (receives role and focus containment)
 * @param {Object} [options]
 * @param {Function|null} [options.onEscape] - Called on Escape; omit for non-dismissable modals
 * @param {HTMLElement|null} [options.initialFocus] - Element to focus first
 * @param {string} [options.label] - aria-label when the dialog has no aria-labelledby
 * @returns {Function} release - Removes handlers and restores focus; safe to call twice
 */
export function activateModal(dialogEl, options = {}) {
    const { onEscape = null, initialFocus = null, label = '' } = options;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (!dialogEl.hasAttribute('role')) dialogEl.setAttribute('role', 'dialog');
    dialogEl.setAttribute('aria-modal', 'true');
    if (label && !dialogEl.hasAttribute('aria-labelledby') && !dialogEl.hasAttribute('aria-label')) {
        dialogEl.setAttribute('aria-label', label);
    }
    if (!dialogEl.hasAttribute('tabindex')) dialogEl.tabIndex = -1;

    const token = {};
    let released = false;

    const handleKeyDown = (e) => {
        if (activeModals[activeModals.length - 1] !== token) return;

        if (e.key === 'Escape') {
            if (onEscape) {
                e.preventDefault();
                e.stopPropagation();
                onEscape();
            }
            return;
        }

        if (e.key !== 'Tab') return;

        const focusable = getFocusableElements(dialogEl);
        if (focusable.length === 0) {
            e.preventDefault();
            dialogEl.focus();
            return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (!dialogEl.contains(active)) {
            e.preventDefault();
            first.focus();
        } else if (e.shiftKey && (active === first || active === dialogEl)) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
        }
    };

    activeModals.push(token);
    document.addEventListener('keydown', handleKeyDown, true);

    const target = initialFocus || dialogEl.querySelector('[autofocus]') || getFocusableElements(dialogEl)[0] || dialogEl;
    target.focus();

    return function release() {
        if (released) return;
        released = true;
        document.removeEventListener('keydown', handleKeyDown, true);
        const index = activeModals.indexOf(token);
        if (index !== -1) activeModals.splice(index, 1);
        if (previousFocus && previousFocus.isConnected && typeof previousFocus.focus === 'function') {
            previousFocus.focus();
        }
    };
}

/**
 * Append a hand-rolled overlay to the body and make it an accessible modal.
 * The modal is released automatically when the overlay leaves the document,
 * so existing overlay.remove() close paths keep working.
 * @param {HTMLElement} overlay - Backdrop element
 * @param {Object} [options]
 * @param {HTMLElement} [options.surface] - Dialog surface; defaults to the overlay's first child
 * @param {string} [options.label] - Accessible name
 * @param {boolean} [options.dismissable=true] - Whether Escape removes the overlay
 * @returns {Function} release
 */
export function showOverlayModal(overlay, options = {}) {
    const { surface = overlay.firstElementChild || overlay, label = 'Dialog', dismissable = true } = options;
    document.body.appendChild(overlay);
    const release = activateModal(surface, {
        label,
        onEscape: dismissable ? () => overlay.remove() : null
    });
    const observer = new MutationObserver(() => {
        if (!overlay.isConnected) {
            observer.disconnect();
            release();
        }
    });
    observer.observe(document.body, { childList: true });
    return release;
}

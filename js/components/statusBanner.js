/**
 * Shared status banner and empty-state builders (styles in patterns.css).
 * Text is always set with textContent, never HTML.
 */

/**
 * @param {Object} options
 * @param {'info'|'success'|'warning'|'error'} [options.type='info']
 * @param {string} options.message
 * @param {string} [options.actionLabel] - Adds an action button when provided with onAction
 * @param {Function} [options.onAction]
 * @returns {HTMLElement} Banner; errors use role=alert, others role=status
 */
export function createStatusBanner({ type = 'info', message, actionLabel, onAction }) {
    const banner = document.createElement('div');
    banner.className = `sage-banner sage-banner--${type}`;
    banner.setAttribute('role', type === 'error' ? 'alert' : 'status');

    const text = document.createElement('div');
    text.className = 'sage-banner__message';
    text.textContent = message;
    banner.appendChild(text);

    if (actionLabel && typeof onAction === 'function') {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sage-button sage-button--small sage-button--secondary sage-button--no-margin sage-banner__action';
        button.textContent = actionLabel;
        button.addEventListener('click', onAction);
        banner.appendChild(button);
    }

    return banner;
}

/**
 * @param {Object} options
 * @param {string} options.title
 * @param {string} [options.message]
 * @param {string} [options.actionLabel]
 * @param {Function} [options.onAction]
 * @returns {HTMLElement}
 */
export function createEmptyState({ title, message, actionLabel, onAction }) {
    const empty = document.createElement('div');
    empty.className = 'sage-empty-state';

    const heading = document.createElement('div');
    heading.className = 'sage-empty-state__title';
    heading.textContent = title;
    empty.appendChild(heading);

    if (message) {
        const body = document.createElement('div');
        body.textContent = message;
        empty.appendChild(body);
    }

    if (actionLabel && typeof onAction === 'function') {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sage-button sage-button--medium sage-button--primary sage-empty-state__action';
        button.textContent = actionLabel;
        button.addEventListener('click', onAction);
        empty.appendChild(button);
    }

    return empty;
}

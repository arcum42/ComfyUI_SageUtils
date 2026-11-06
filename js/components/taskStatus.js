/**
 * Shared long-task status pattern (styles in patterns.css).
 * One element that shows running progress, the outcome, and retry/cancel actions.
 * Text is always set with textContent. Errors announce as role=alert, the rest as role=status.
 */

/**
 * @param {Object} [options]
 * @param {number} [options.autoHideMs=2500] - Delay before a success message hides; 0 keeps it
 * @returns {Object} Controller with container and start/update/succeed/fail/cancelled/hide/destroy
 */
export function createTaskStatus({ autoHideMs = 2500 } = {}) {
    const container = document.createElement('div');
    container.className = 'sage-task-status';
    container.hidden = true;

    const header = document.createElement('div');
    header.className = 'sage-task-status__header';
    const titleEl = document.createElement('div');
    titleEl.className = 'sage-task-status__title';
    const actions = document.createElement('div');
    actions.className = 'sage-task-status__actions';
    header.append(titleEl, actions);

    const messageEl = document.createElement('div');
    messageEl.className = 'sage-task-status__message';

    const bar = document.createElement('div');
    bar.className = 'sage-task-status__bar';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    const fill = document.createElement('div');
    fill.className = 'sage-task-status__fill';
    bar.appendChild(fill);

    container.append(header, messageEl, bar);

    let hideTimer = null;
    let destroyed = false;

    const clearTimer = () => {
        if (hideTimer !== null) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
    };

    const addButton = (label, handler) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sage-button sage-button--small sage-button--secondary sage-button--no-margin';
        button.textContent = label;
        button.addEventListener('click', handler);
        actions.appendChild(button);
    };

    const setState = (state) => {
        container.dataset.state = state;
        container.setAttribute('role', state === 'error' ? 'alert' : 'status');
        container.hidden = false;
    };

    const setProgress = (percent) => {
        if (typeof percent === 'number' && Number.isFinite(percent)) {
            const value = Math.max(0, Math.min(100, percent));
            fill.style.setProperty('--sage-progress-width', `${value}%`);
            bar.setAttribute('aria-valuenow', String(Math.round(value)));
            bar.classList.remove('sage-task-status__bar--indeterminate');
        } else {
            fill.style.removeProperty('--sage-progress-width');
            bar.removeAttribute('aria-valuenow');
            bar.classList.add('sage-task-status__bar--indeterminate');
        }
    };

    const api = {
        container,

        /**
         * @param {string} title
         * @param {Object} [options]
         * @param {string} [options.message]
         * @param {Function} [options.onCancel] - Only pass when the operation can really be cancelled
         */
        start(title, { message = '', onCancel } = {}) {
            if (destroyed) return;
            clearTimer();
            titleEl.textContent = title;
            messageEl.textContent = message;
            actions.replaceChildren();
            if (typeof onCancel === 'function') addButton('Cancel', onCancel);
            bar.hidden = false;
            setProgress(null);
            setState('running');
        },

        /** @param {number|null} percent - null shows an indeterminate bar */
        update(percent, message) {
            if (destroyed || container.dataset.state !== 'running') return;
            setProgress(percent);
            if (message) messageEl.textContent = message;
        },

        succeed(message = 'Done') {
            if (destroyed) return;
            clearTimer();
            messageEl.textContent = message;
            actions.replaceChildren();
            bar.hidden = true;
            setState('success');
            if (autoHideMs > 0) {
                hideTimer = setTimeout(() => api.hide(), autoHideMs);
            }
        },

        /**
         * @param {string} message - What went wrong and what to try
         * @param {Object} [options]
         * @param {Function} [options.onRetry]
         */
        fail(message, { onRetry } = {}) {
            if (destroyed) return;
            clearTimer();
            messageEl.textContent = message;
            actions.replaceChildren();
            if (typeof onRetry === 'function') addButton('Retry', onRetry);
            addButton('Dismiss', () => api.hide());
            bar.hidden = true;
            setState('error');
        },

        cancelled(message = 'Cancelled') {
            if (destroyed) return;
            clearTimer();
            messageEl.textContent = message;
            actions.replaceChildren();
            bar.hidden = true;
            setState('cancelled');
            hideTimer = setTimeout(() => api.hide(), autoHideMs || 2500);
        },

        hide() {
            clearTimer();
            container.hidden = true;
            delete container.dataset.state;
        },

        destroy() {
            destroyed = true;
            clearTimer();
            container.remove();
        }
    };

    return api;
}

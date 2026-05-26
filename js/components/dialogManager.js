/**
 * Dialog Manager for SageUtils Cache Browser
 * Handles modal dialogs and overlays
 */

import { loadComponentStyles as ensureComponentStyles } from './styleLoader.js';

console.log('[SageUtils] dialogManager.js imported');

function loadComponentStyles() {
    ensureComponentStyles('dialogManager.js');
}

/**
 * Ensure shared component styles are loaded
 */
function addDialogStyles() {
    loadComponentStyles();
}

/**
 * Create a modal dialog
 * @param {Object} options - Dialog configuration options
 * @returns {Object} - Dialog object with methods and elements
 */
export function createDialog(options = {}) {
    const {
        title = 'Dialog',
        content = '',
        width = '500px',
        height = 'auto',
        showCloseButton = true,
        showFooter = true,
        closeOnOverlayClick = true,
        closable = true,
        onClose = null
    } = options;

    const effectiveShowCloseButton = closable && showCloseButton;
    const effectiveCloseOnOverlayClick = closable && closeOnOverlayClick;
    
    addDialogStyles();
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    
    // Create dialog container
    const dialog = document.createElement('div');
    dialog.className = 'dialog-container';
    dialog.style.setProperty('--dialog-width', width);
    dialog.style.setProperty('--dialog-height', height);
    
    // Create header
    const header = document.createElement('div');
    header.className = 'dialog-header';
    
    const titleElement = document.createElement('h3');
    titleElement.className = 'dialog-title';
    titleElement.textContent = title;
    header.appendChild(titleElement);
    
    if (showCloseButton) {
        const closeButton = document.createElement('button');
        closeButton.className = 'dialog-close';
        closeButton.innerHTML = '×';
        header.appendChild(closeButton);
    }
    
    // Create content area
    const contentArea = document.createElement('div');
    contentArea.className = 'dialog-content';
    if (typeof content === 'string') {
        contentArea.innerHTML = content;
    } else {
        contentArea.appendChild(content);
    }
    
    // Create footer
    const footer = document.createElement('div');
    footer.className = 'dialog-footer';
    
    // Assemble dialog
    dialog.appendChild(header);
    dialog.appendChild(contentArea);
    if (showFooter) {
        dialog.appendChild(footer);
    }
    
    overlay.appendChild(dialog);
    
    // Event handlers
    const closeDialog = () => {
        overlay.classList.add('closing');
        document.removeEventListener('keydown', handleKeyDown);
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            if (onClose) onClose();
        }, 200);
    };
    
    if (effectiveShowCloseButton) {
        const closeButton = header.querySelector('.dialog-close');
        if (closeButton) {
            closeButton.addEventListener('click', closeDialog);
        }
    }
    
    if (effectiveCloseOnOverlayClick) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeDialog();
            }
        });
    }
    
    // ESC key to close
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            closeDialog();
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    document.addEventListener('keydown', handleKeyDown);
    
    return {
        overlay,
        dialog,
        header,
        titleElement,
        contentArea,
        footer,
        show() {
            document.body.appendChild(overlay);
        },
        close: closeDialog,
        setTitle(newTitle) {
            titleElement.textContent = newTitle;
        },
        setContent(newContent) {
            if (typeof newContent === 'string') {
                contentArea.innerHTML = newContent;
            } else {
                contentArea.innerHTML = '';
                contentArea.appendChild(newContent);
            }
        },
        addFooterButton(text, onClick, style = {}) {
            const button = document.createElement('button');
            button.className = 'dialog-footer-button';
            button.textContent = text;

            const buttonStyle = typeof style === 'string' ? { variant: style } : style || {};
            const background = buttonStyle.background;
            const color = buttonStyle.color;
            const isSecondary = background === '#666' || buttonStyle.variant === 'secondary';
            const isDanger = background === '#d32f2f' || buttonStyle.variant === 'danger';
            const isSuccess = background === '#4CAF50' || buttonStyle.variant === 'success';

            if (isSecondary) {
                button.classList.add('dialog-footer-button--secondary');
            } else if (isDanger) {
                button.classList.add('dialog-footer-button--danger');
            } else if (isSuccess) {
                button.classList.add('dialog-footer-button--success');
            } else if (background) {
                button.classList.add('dialog-footer-button--custom');
                button.style.setProperty('--dialog-footer-button-bg', background);
            }

            if (color) {
                button.classList.add('dialog-footer-button--custom');
                button.style.setProperty('--dialog-footer-button-color', color);
            }

            if (typeof buttonStyle === 'object' && !Array.isArray(buttonStyle)) {
                Object.entries(buttonStyle).forEach(([key, value]) => {
                    if (key !== 'background' && key !== 'color' && key !== 'variant') {
                        button.style[key] = value;
                    }
                });
            }
            button.addEventListener('click', onClick);
            footer.appendChild(button);
            return button;
        }
    };
}

/**
 * Show a confirmation dialog
 * @param {string} message - Confirmation message
 * @param {string} title - Dialog title
 * @returns {Promise<boolean>} - True if confirmed, false if cancelled
 */
export function confirmDialog(message, title = 'Confirm') {
    return new Promise((resolve) => {
        const dialog = createDialog({
            title,
            content: `<p class="dialog-message">${message}</p>`,
            width: '400px',
            onClose: () => resolve(false)
        });
        
        dialog.addFooterButton('Cancel', () => {
            dialog.close();
            resolve(false);
        }, { background: '#666' });
        
        dialog.addFooterButton('Confirm', () => {
            dialog.close();
            resolve(true);
        }, { background: '#d32f2f' });
        
        dialog.show();
    });
}

/**
 * Show an alert dialog
 * @param {string} message - Alert message
 * @param {string} title - Dialog title
 * @returns {Promise<void>} - Resolves when dialog is closed
 */
export function alertDialog(message, title = 'Alert') {
    return new Promise((resolve) => {
        const dialog = createDialog({
            title,
            content: `<p class="dialog-message">${message}</p>`,
            width: '400px',
            onClose: () => resolve()
        });
        
        dialog.addFooterButton('OK', () => {
            dialog.close();
            resolve();
        });
        
        dialog.show();
    });
}

/**
 * Show a prompt dialog
 * @param {string} message - Prompt message
 * @param {string} defaultValue - Default input value
 * @param {string} title - Dialog title
 * @returns {Promise<string|null>} - Input value or null if cancelled
 */
export function promptDialog(message, defaultValue = '', title = 'Input') {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = defaultValue;
        input.className = 'dialog-input';
        
        const content = document.createElement('div');
        content.innerHTML = `<p class="dialog-message">${message}</p>`;
        content.appendChild(input);
        
        const dialog = createDialog({
            title,
            content,
            width: '400px',
            onClose: () => resolve(null)
        });
        
        dialog.addFooterButton('Cancel', () => {
            dialog.close();
            resolve(null);
        }, { background: '#666' });
        
        dialog.addFooterButton('OK', () => {
            dialog.close();
            resolve(input.value);
        });
        
        dialog.show();
        input.focus();
        input.select();
        
        // Handle Enter key
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                dialog.close();
                resolve(input.value);
            }
        });
    });
}

/**
 * Create an image preview dialog
 * @param {string} imageSrc - Image source URL
 * @param {string} title - Dialog title
 * @returns {Object} - Dialog object
 */
export function createImageDialog(imageSrc, title = 'Image Preview') {
    const img = document.createElement('img');
    img.src = imageSrc;
    img.className = 'dialog-image-preview';
    
    const dialog = createDialog({
        title,
        content: img,
        width: 'auto',
        height: 'auto',
        showFooter: false
    });
    
    dialog.show();
    return dialog;
}

/**
 * Create a metadata preview dialog
 * @param {Object} metadata - Metadata object to display
 * @param {string} title - Dialog title
 * @returns {Object} - Dialog object
 */
export function createMetadataDialog(metadata, title = 'Metadata') {
    const content = document.createElement('div');
    content.className = 'dialog-metadata-content';
    
    content.textContent = JSON.stringify(metadata, null, 2);
    
    const dialog = createDialog({
        title,
        content,
        width: '700px',
        height: 'auto'
    });
    
    dialog.addFooterButton('Copy to Clipboard', () => {
        navigator.clipboard.writeText(JSON.stringify(metadata, null, 2)).then(() => {
            // Temporarily change button text to show success
            const button = dialog.footer.querySelector('button');
            if (!button) {
                return;
            }

            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.classList.add('dialog-feedback-button-success');
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('dialog-feedback-button-success');
            }, 1000);
        }).catch((error) => {
            console.warn('[SageUtils] dialogManager.createMetadataDialog clipboard copy failed', error);
        });
    });

    dialog.show();
    return dialog;
}

// Progress dialog functionality moved to progressBar.js
export { createProgressDialog, createInlineProgressBar } from './progressBar.js';

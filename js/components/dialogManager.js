/**
 * Dialog Manager for SageUtils Cache Browser
 * Handles modal dialogs and overlays
 */

/**
 * Dialog styles
 */
const DIALOG_STYLES = {
    overlay: `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(3px);
    `,
    dialog: `
        background: #2a2a2a;
        border: 1px solid #555;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.7);
        max-width: 90%;
        max-height: 90%;
        overflow: auto;
        animation: dialogFadeIn 0.2s ease-out;
    `,
    header: `
        padding: 15px 20px;
        border-bottom: 1px solid #444;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #353535;
        border-radius: 8px 8px 0 0;
    `,
    title: `
        color: #fff;
        font-size: 16px;
        font-weight: bold;
        margin: 0;
    `,
    closeButton: `
        background: none;
        border: none;
        color: #999;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
    `,
    content: `
        padding: 20px;
        color: #fff;
    `,
    footer: `
        padding: 15px 20px;
        border-top: 1px solid #444;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        background: #353535;
        border-radius: 0 0 8px 8px;
    `
};

/**
 * Add dialog animation styles to document
 */
function addDialogStyles() {
    if (document.getElementById('dialog-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'dialog-styles';
    style.textContent = `
        @keyframes dialogFadeIn {
            from {
                opacity: 0;
                transform: scale(0.95);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }
        
        .dialog-overlay.closing {
            animation: dialogFadeOut 0.2s ease-in;
        }
        
        @keyframes dialogFadeOut {
            from {
                opacity: 1;
            }
            to {
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
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
        onClose = null
    } = options;
    
    addDialogStyles();
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.style.cssText = DIALOG_STYLES.overlay;
    
    // Create dialog container
    const dialog = document.createElement('div');
    dialog.className = 'dialog-container';
    dialog.style.cssText = DIALOG_STYLES.dialog + `width: ${width}; height: ${height};`;
    
    // Create header
    const header = document.createElement('div');
    header.className = 'dialog-header';
    header.style.cssText = DIALOG_STYLES.header;
    
    const titleElement = document.createElement('h3');
    titleElement.style.cssText = DIALOG_STYLES.title;
    titleElement.textContent = title;
    header.appendChild(titleElement);
    
    if (showCloseButton) {
        const closeButton = document.createElement('button');
        closeButton.className = 'dialog-close';
        closeButton.style.cssText = DIALOG_STYLES.closeButton;
        closeButton.innerHTML = '×';
        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.backgroundColor = '#555';
            closeButton.style.color = '#fff';
        });
        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.backgroundColor = 'transparent';
            closeButton.style.color = '#999';
        });
        header.appendChild(closeButton);
    }
    
    // Create content area
    const contentArea = document.createElement('div');
    contentArea.className = 'dialog-content';
    contentArea.style.cssText = DIALOG_STYLES.content;
    if (typeof content === 'string') {
        contentArea.innerHTML = content;
    } else {
        contentArea.appendChild(content);
    }
    
    // Create footer
    const footer = document.createElement('div');
    footer.className = 'dialog-footer';
    footer.style.cssText = DIALOG_STYLES.footer;
    
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
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            if (onClose) onClose();
        }, 200);
    };
    
    if (showCloseButton) {
        const closeButton = header.querySelector('.dialog-close');
        closeButton.addEventListener('click', closeDialog);
    }
    
    if (closeOnOverlayClick) {
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
            button.textContent = text;
            button.style.cssText = `
                padding: 8px 16px;
                background: #007acc;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                ${Object.entries(style).map(([k, v]) => `${k}: ${v}`).join('; ')}
            `;
            button.addEventListener('mouseenter', () => {
                button.style.backgroundColor = '#005a9e';
            });
            button.addEventListener('mouseleave', () => {
                button.style.backgroundColor = style.background || '#007acc';
            });
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
            content: `<p style="margin: 0; font-size: 14px; line-height: 1.5;">${message}</p>`,
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
            content: `<p style="margin: 0; font-size: 14px; line-height: 1.5;">${message}</p>`,
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
        input.style.cssText = `
            width: 100%;
            padding: 8px;
            margin-top: 10px;
            background: #333;
            color: #fff;
            border: 1px solid #555;
            border-radius: 4px;
            font-size: 14px;
            box-sizing: border-box;
        `;
        
        const content = document.createElement('div');
        content.innerHTML = `<p style="margin: 0 0 10px 0; font-size: 14px; line-height: 1.5;">${message}</p>`;
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
    img.style.cssText = `
        max-width: 100%;
        max-height: 70vh;
        object-fit: contain;
        display: block;
        margin: 0 auto;
    `;
    
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
    content.style.cssText = `
        font-family: monospace;
        font-size: 12px;
        line-height: 1.4;
        white-space: pre-wrap;
        max-height: 60vh;
        overflow-y: auto;
        background: #1e1e1e;
        padding: 15px;
        border-radius: 4px;
        border: 1px solid #444;
    `;
    
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
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.style.background = '#4CAF50';
            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = '#007acc';
            }, 1000);
        });
    });
    
    dialog.show();
    return dialog;
}

// Progress dialog functionality moved to progressBar.js
export { createProgressDialog, createInlineProgressBar } from './progressBar.js';

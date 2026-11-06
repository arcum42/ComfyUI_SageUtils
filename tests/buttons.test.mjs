import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.document = {
    createElement() {
        return {
            disabled: false,
            classList: { add() {} },
            style: { setProperty() {} },
            listeners: {},
            addEventListener(type, handler) { this.listeners[type] = handler; },
            click() {
                if (!this.disabled) this.listeners.click?.();
            }
        };
    }
};

const { createButton } = await import('../js/components/buttons.js');

test('initially disabled button invokes its handler after being enabled', () => {
    let clicks = 0;
    const button = createButton('Save', { disabled: true, onClick: () => clicks++ });
    button.click();
    assert.equal(clicks, 0);
    button.disabled = false;
    button.click();
    assert.equal(clicks, 1);
    button.disabled = true;
    button.click();
    assert.equal(clicks, 1);
});

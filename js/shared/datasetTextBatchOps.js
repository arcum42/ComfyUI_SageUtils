/**
 * Batch Operations Panel Component
 * Builds UI for creating missing text files, append/prepend, and find/replace.
 * Delegates the actual operations to callbacks provided by the caller.
 */

import { createButton, BUTTON_VARIANTS } from '../components/buttons.js';
import { createInput, createRadioGroup } from '../components/formElements.js';
import { notifications } from './notifications.js';
import { createCollapsiblePanel } from '../components/collapsiblePanel.js';

/**
 * Create the Batch Operations panel
 * @param {Object} options
 * @param {Function} options.onCreateMissing - async () => Promise<void>
 * @param {Function} options.onAppendStart - async (text: string) => Promise<void>
 * @param {Function} options.onAppendEnd - async (text: string) => Promise<void>
 * @param {Function} options.onReplaceAll - async (findText: string, replaceText: string) => Promise<void>
 * @returns {HTMLElement} Panel element
 */
export function createBatchOpsPanel({ onCreateMissing, onAppendStart, onAppendEnd, onReplaceAll, onTrimAll, onDedupLinesAll } = {}) {
  const panel = document.createElement('div');
  panel.style.cssText = `
    display: block;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 10px;
    background: #3a3a3a;
    padding: 10px;
    border-radius: 4px;
    border: 1px solid #555;
  `;

  // Use shared collapsible panel (Unicode carets explicitly enabled per user override)
  const section = createCollapsiblePanel({ titleText: 'Batch Operations', defaultExpanded: true, useUnicodeCarets: true });
  // NOTE: Using Unicode caret glyphs (▾/▸) here by explicit override of the ASCII-only rule.
  // Some search tools may not work properly around these characters; edit with care.
  // Scope selector
  const scopeRow = document.createElement('div');
  scopeRow.style.cssText = `
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 6px;
  `;
  const scopeLabel = document.createElement('label');
  scopeLabel.textContent = 'Scope:';
  scopeLabel.style.cssText = `
    color: #fff;
    font-size: 12px;
    min-width: 60px;
  `;
  const { container: scopeRadiosContainer, radios: scopeRadios } = createRadioGroup('batch-scope', [
    { value: 'folder', label: 'Current folder', checked: true },
    { value: 'current', label: 'Current image' }
  ], { layout: 'horizontal' });
  scopeRow.appendChild(scopeLabel);
  scopeRow.appendChild(scopeRadiosContainer);

  const content = section.contentEl;

  // Buttons row container
  const buttonsRow = document.createElement('div');
  buttonsRow.style.cssText = `
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  `;

  // Create Missing Text
  const createMissingBtn = createButton('Create Missing Text', {
    variant: BUTTON_VARIANTS.SUCCESS,
    size: 'small',
    style: { marginTop: '0' }
  });
  createMissingBtn.addEventListener('click', async () => {
    if (onCreateMissing) {
      const scope = (scopeRadios && scopeRadios.find(r => r.radio.checked)?.radio.value) || 'folder';
      await onCreateMissing({ scope });
    }
  });

  // Append/Prepend group
  const appendGroup = document.createElement('div');
  appendGroup.style.cssText = `
    display: flex;
    gap: 5px;
    align-items: center;
  `;

  const appendTextInput = createInput({
    type: 'text',
    placeholder: 'Text to append...',
    style: { width: '220px', padding: '6px 10px', background: '#555', border: '1px solid #666', fontSize: '12px' }
  });

  const prependBtn = createButton('Prepend All', {
    variant: BUTTON_VARIANTS.PRIMARY,
    size: 'small',
    style: { marginTop: '0' }
  });

  const appendBtn = createButton('Append All', {
    variant: BUTTON_VARIANTS.PRIMARY,
    size: 'small',
    style: { marginTop: '0' }
  });

  prependBtn.addEventListener('click', async () => {
    const text = appendTextInput.value.trim();
    if (!text) {
      notifications.warning('Please enter text to prepend.');
      return;
    }
    if (onAppendStart) {
      const scope = (scopeRadios && scopeRadios.find(r => r.radio.checked)?.radio.value) || 'folder';
      await onAppendStart(text, { scope });
    }
  });

  appendBtn.addEventListener('click', async () => {
    const text = appendTextInput.value.trim();
    if (!text) {
      notifications.warning('Please enter text to append.');
      return;
    }
    if (onAppendEnd) {
      const scope = (scopeRadios && scopeRadios.find(r => r.radio.checked)?.radio.value) || 'folder';
      await onAppendEnd(text, { scope });
    }
  });

  appendGroup.appendChild(appendTextInput);
  appendGroup.appendChild(prependBtn);
  appendGroup.appendChild(appendBtn);

  // Find/Replace group
  const replaceGroup = document.createElement('div');
  replaceGroup.style.cssText = `
    display: flex;
    gap: 5px;
    align-items: center;
    margin-top: 8px;
  `;

  const findTextInput = createInput({
    type: 'text',
    placeholder: 'Find...',
    style: { width: '180px', padding: '6px 10px', background: '#555', border: '1px solid #666', fontSize: '12px' }
  });

  const replaceTextInput = createInput({
    type: 'text',
    placeholder: 'Replace...',
    style: { width: '180px', padding: '6px 10px', background: '#555', border: '1px solid #666', fontSize: '12px' }
  });

  const replaceAllBtn = createButton('Replace All', {
    variant: BUTTON_VARIANTS.WARNING,
    size: 'small',
    style: { marginTop: '0' }
  });

  // Replace options row
  const replaceOptions = document.createElement('div');
  replaceOptions.style.cssText = `
    display: flex;
    gap: 10px;
    align-items: center;
    margin-top: 6px;
    color: #ddd;
    font-size: 12px;
  `;
  // Options are always visible when panel is expanded; no separate Advanced toggle

  const caseSensitiveCheckbox = document.createElement('input');
  caseSensitiveCheckbox.type = 'checkbox';
  caseSensitiveCheckbox.id = 'batch-case-sensitive';
  const caseSensitiveLabel = document.createElement('label');
  caseSensitiveLabel.htmlFor = 'batch-case-sensitive';
  caseSensitiveLabel.textContent = 'Case sensitive';

  const wholeWordCheckbox = document.createElement('input');
  wholeWordCheckbox.type = 'checkbox';
  wholeWordCheckbox.id = 'batch-whole-word';
  const wholeWordLabel = document.createElement('label');
  wholeWordLabel.htmlFor = 'batch-whole-word';
  wholeWordLabel.textContent = 'Whole word';

  const regexCheckbox = document.createElement('input');
  regexCheckbox.type = 'checkbox';
  regexCheckbox.id = 'batch-regex';
  const regexLabel = document.createElement('label');
  regexLabel.htmlFor = 'batch-regex';
  regexLabel.textContent = 'Regex';

  replaceOptions.appendChild(caseSensitiveCheckbox);
  replaceOptions.appendChild(caseSensitiveLabel);
  replaceOptions.appendChild(wholeWordCheckbox);
  replaceOptions.appendChild(wholeWordLabel);
  replaceOptions.appendChild(regexCheckbox);
  replaceOptions.appendChild(regexLabel);

  replaceAllBtn.addEventListener('click', async () => {
    const findText = findTextInput.value;
    const replaceText = replaceTextInput.value;
    if (!findText) {
      notifications.warning('Please enter text to find.');
      return;
    }
    if (onReplaceAll) {
      const scope = (scopeRadios && scopeRadios.find(r => r.radio.checked)?.radio.value) || 'folder';
      await onReplaceAll(findText, replaceText, {
        caseSensitive: !!caseSensitiveCheckbox.checked,
        wholeWord: !!wholeWordCheckbox.checked,
        useRegex: !!regexCheckbox.checked,
        scope
      });
    }
  });

  replaceGroup.appendChild(findTextInput);
  replaceGroup.appendChild(replaceTextInput);
  replaceGroup.appendChild(replaceAllBtn);

  // Assemble
  panel.appendChild(section.container);
  content.appendChild(scopeRow);
  content.appendChild(buttonsRow);
  buttonsRow.appendChild(appendGroup);
  content.appendChild(replaceGroup);
  content.appendChild(replaceOptions);

  // Utility buttons row
  const utilRow = document.createElement('div');
  utilRow.style.cssText = `
    display: flex;
    gap: 8px;
    margin-top: 10px;
  `;

  const trimAllBtn = createButton('Trim Whitespace All', {
    variant: BUTTON_VARIANTS.PRIMARY,
    size: 'small',
    style: { marginTop: '0' }
  });
  trimAllBtn.addEventListener('click', async () => {
    if (onTrimAll) {
      const scope = (scopeRadios && scopeRadios.find(r => r.radio.checked)?.radio.value) || 'folder';
      await onTrimAll({ scope });
    }
  });

  const dedupBtn = createButton('Deduplicate Lines All', {
    variant: BUTTON_VARIANTS.PRIMARY,
    size: 'small',
    style: { marginTop: '0' }
  });
  dedupBtn.addEventListener('click', async () => {
    if (onDedupLinesAll) {
      const scope = (scopeRadios && scopeRadios.find(r => r.radio.checked)?.radio.value) || 'folder';
      await onDedupLinesAll({ scope });
    }
  });

  utilRow.appendChild(createMissingBtn);
  utilRow.appendChild(trimAllBtn);
  utilRow.appendChild(dedupBtn);
  content.appendChild(utilRow);

  // Update labels based on scope (remove "All" when scope is current)
  const updateScopeLabels = () => {
    const scope = (scopeRadios && scopeRadios.find(r => r.radio.checked)?.radio.value) || 'folder';
    prependBtn.textContent = scope === 'current' ? 'Prepend' : 'Prepend All';
    appendBtn.textContent = scope === 'current' ? 'Append' : 'Append All';
    trimAllBtn.textContent = scope === 'current' ? 'Trim Whitespace' : 'Trim Whitespace All';
    dedupBtn.textContent = scope === 'current' ? 'Deduplicate Lines' : 'Deduplicate Lines All';
    // createMissingBtn stays as 'Create Missing Text'
  };
  // Attach change listeners to radios
  if (scopeRadios && Array.isArray(scopeRadios)) {
    scopeRadios.forEach(({ radio }) => {
      radio.addEventListener('change', updateScopeLabels);
    });
  }
  updateScopeLabels();

  return panel;
}

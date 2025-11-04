/**
 * LLM Generation Panel Component
 * Builds the preset selector, append/overwrite mode, and action buttons.
 * Delegates generation work to callbacks provided by the caller.
 */

import { createButton, BUTTON_VARIANTS } from '../components/buttons.js';
import { createSelect, createRadioGroup } from '../components/formElements.js';
import { notifications } from './notifications.js';
import { getPresets } from '../llm/llmPresetAPI.js';
import { confirmDialog } from '../components/dialogManager.js';
import { createCollapsiblePanel } from '../components/collapsiblePanel.js';

/**
 * Create the LLM generation panel
 * @param {Object} options
 * @param {Function} options.onGenerateCurrent - async (presetId: string, isAppend: boolean) => Promise<void>
 * @param {Function} options.onGenerateAll - async (presetId: string, isAppend: boolean) => Promise<void>
 * @returns {HTMLElement} Panel element
 */
export function createLLMGenerationPanel({ onGenerateCurrent, onGenerateAll, batchCount = null } = {}) {
  const llmPanel = document.createElement('div');
  llmPanel.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 15px;
    background: #3a3a3a;
    padding: 10px;
    border-radius: 4px;
    border: 1px solid #555;
  `;

  // Use shared collapsible panel (Unicode carets explicitly enabled per user override)
  const section = createCollapsiblePanel({ titleText: 'AI Generate Description', defaultExpanded: true, useUnicodeCarets: true });
  // NOTE: Using Unicode caret glyphs (▾/▸) here by explicit override of the ASCII-only rule.
  // Some search tools may not work properly around these characters; edit with care.
  const content = section.contentEl;

  // Preset selection row
  const presetRow = document.createElement('div');
  presetRow.style.cssText = `
    display: flex;
    gap: 10px;
    align-items: center;
  `;

  const presetLabel = document.createElement('label');
  presetLabel.textContent = 'Preset:';
  presetLabel.style.cssText = `
    color: #fff;
    font-size: 12px;
    min-width: 50px;
  `;

  const presetSelect = createSelect({
    className: 'llm-preset-select-dataset',
    items: [{ value: '', text: 'Loading presets...' }],
    style: { flex: '1', background: '#555', border: '1px solid #666', padding: '6px' }
  });

  // Load presets
  (async () => {
    try {
      const presets = await getPresets();
      presetSelect.innerHTML = '';
      const placeholderOption = document.createElement('option');
      placeholderOption.value = '';
      placeholderOption.textContent = 'Select a preset...';
      presetSelect.appendChild(placeholderOption);

      for (const [id, preset] of Object.entries(presets)) {
        if (preset.model) {
          const option = document.createElement('option');
          option.value = id;
          option.textContent = `${preset.name} (${preset.model})`;
          presetSelect.appendChild(option);
        }
      }
    } catch (error) {
      console.error('Error loading presets:', error);
      presetSelect.innerHTML = '<option value="">Error loading presets</option>';
    }
  })();

  presetRow.appendChild(presetLabel);
  presetRow.appendChild(presetSelect);

  // Mode selection (Append/Overwrite)
  const modeRow = document.createElement('div');
  modeRow.style.cssText = `
    display: flex;
    gap: 15px;
    align-items: center;
  `;

  const modeLabel = document.createElement('label');
  modeLabel.textContent = 'Mode:';
  modeLabel.style.cssText = `
    color: #fff;
    font-size: 12px;
    min-width: 50px;
  `;

  const { container: radioGroup, radios } = createRadioGroup('llm-mode', [
    { value: 'append', label: 'Append', checked: true },
    { value: 'overwrite', label: 'Overwrite' }
  ], {
    layout: 'horizontal'
  });
  const appendRadio = radios[0].radio;

  modeRow.appendChild(modeLabel);
  modeRow.appendChild(radioGroup);

  // Buttons row
  const llmButtonsRow = document.createElement('div');
  llmButtonsRow.style.cssText = `
    display: flex;
    gap: 8px;
  `;

  const generateCurrentBtn = createButton('Generate for Current Image', {
    variant: BUTTON_VARIANTS.PRIMARY,
    size: 'medium',
    style: { flex: '1', marginTop: '0' }
  });

  const generateAllBtn = createButton('Generate for All Images', {
    variant: BUTTON_VARIANTS.WARNING,
    size: 'medium',
    style: { flex: '1', marginTop: '0' }
  });

  llmButtonsRow.appendChild(generateCurrentBtn);
  llmButtonsRow.appendChild(generateAllBtn);

  llmPanel.appendChild(section.container);
  content.appendChild(presetRow);
  content.appendChild(modeRow);
  content.appendChild(llmButtonsRow);

  // Event handlers
  generateCurrentBtn.addEventListener('click', async () => {
    const presetId = presetSelect.value;
    if (!presetId) {
      notifications.warning('Please select a preset first.');
      return;
    }

    const isAppend = appendRadio.checked;

    generateCurrentBtn.disabled = true;
    generateCurrentBtn.textContent = 'Generating...';
    try {
      if (onGenerateCurrent) {
        await onGenerateCurrent(presetId, isAppend);
      }
      notifications.success('Description generated successfully!');
    } catch (error) {
      notifications.error(`Generation failed: ${error.message}`);
    } finally {
      generateCurrentBtn.disabled = false;
      generateCurrentBtn.textContent = 'Generate for Current Image';
    }
  });

  generateAllBtn.addEventListener('click', async () => {
    const presetId = presetSelect.value;
    if (!presetId) {
      notifications.warning('Please select a preset first.');
      return;
    }

    const isAppend = appendRadio.checked;

    const message = batchCount !== null
      ? `Generate descriptions for ${batchCount} images using the selected preset? This may take a while.`
      : 'Generate descriptions for all images using the selected preset? This may take a while.';
    const confirmed = await confirmDialog(message, 'Confirm Batch Generation');
    if (!confirmed) return;

    if (onGenerateAll) {
      await onGenerateAll(presetId, isAppend);
    }
  });

  // Toggle behavior handled by shared component

  return llmPanel;
}

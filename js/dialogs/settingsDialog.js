/**
 * Settings Dialog
 * Provides a UI for configuring SageUtils settings
 * Currently focuses on LLM provider configuration (Ollama and LM Studio)
 */

import { api } from '../../../../scripts/api.js';
import { createDialog } from '../components/dialogManager.js';
import { handleError } from '../shared/errorHandler.js';
import { notifications } from '../shared/notifications.js';
import { app } from '../../../../scripts/app.js';

/**
 * Mapping between backend setting keys and ComfyUI setting IDs
 */
const SETTING_KEY_TO_ID_MAP = {
  'enable_lmstudio': 'SageUtils.LLM Providers.enable_lmstudio',
  'enable_ollama': 'SageUtils.LLM Providers.enable_ollama',
  'ollama_custom_url': 'SageUtils.Local Custom Ollama URL.ollama_custom_url',
  'ollama_use_custom_url': 'SageUtils.Local Custom Ollama URL.ollama_use_custom_url',
  'lmstudio_custom_url': 'SageUtils.Local Custom LM Studio URL.lmstudio_custom_url',
  'lmstudio_use_custom_url': 'SageUtils.Local Custom LM Studio URL.lmstudio_use_custom_url'
};

/**
 * Show the settings dialog
 */
export async function showSettingsDialog() {
  const content = document.createElement('div');
  content.style.cssText = `
    min-width: 600px;
    max-width: 700px;
    min-height: 400px;
  `;

  const dialog = createDialog({
    title: 'SageUtils Settings',
    content: content,
    width: '650px',
    height: 'auto',
    showFooter: true,
    closeOnOverlayClick: false
  });

  // Create loading indicator
  const loadingSection = document.createElement('div');
  loadingSection.style.cssText = `
    text-align: center;
    padding: 40px;
    color: #888;
  `;
  loadingSection.innerHTML = `
    <div style="font-size: 16px; margin-bottom: 10px;">Loading settings...</div>
    <div style="font-size: 12px;">Please wait</div>
  `;
  content.appendChild(loadingSection);

  // Show the dialog
  dialog.show();

  try {
    // Load current settings
    const response = await api.fetchApi('/sage_utils/settings');
    if (!response.ok) {
      throw new Error(`Failed to load settings: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Loaded settings from API:', result);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to load settings');
    }

    const settings = result.settings;
    console.log('Settings object:', settings);

    // Clear loading and build settings UI
    content.innerHTML = '';
    buildSettingsUI(content, settings, dialog);

  } catch (error) {
    content.innerHTML = `
      <div style="color: #f44336; padding: 20px; text-align: center;">
        <div style="font-size: 16px; margin-bottom: 10px;">Error loading settings</div>
        <div style="font-size: 14px; opacity: 0.8;">${error.message}</div>
      </div>
    `;
    handleError(error, 'Failed to load settings');
  }
}

/**
 * Build the settings UI
 * @param {HTMLElement} container - Container element
 * @param {Object} settings - Current settings data
 * @param {Object} dialog - Dialog instance
 */
function buildSettingsUI(container, settings, dialog) {
  // Create main settings container
  const settingsContainer = document.createElement('div');
  settingsContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 20px;
  `;

  // LLM Integration Section
  const llmSection = createLLMSection(settings);
  settingsContainer.appendChild(llmSection);

  container.appendChild(settingsContainer);

  // Add footer buttons
  dialog.addFooterButton('Save', async () => {
    await saveSettings(dialog, settingsContainer, settings);
  }, 'primary');

  dialog.addFooterButton('Reset to Defaults', async () => {
    if (confirm('Are you sure you want to reset all settings to their default values?')) {
      await resetSettings(dialog);
    }
  });

  dialog.addFooterButton('Cancel', () => {
    dialog.close();
  });
}

/**
 * Create LLM Integration settings section
 * @param {Object} settings - Current settings
 * @returns {HTMLElement} Section element
 */
function createLLMSection(settings) {
  const section = document.createElement('div');
  section.style.cssText = `
    padding: 15px;
    background: #1e1e1e;
    border-radius: 6px;
    border: 1px solid #444;
  `;

  const title = document.createElement('h3');
  title.textContent = 'LLM Integration';
  title.style.cssText = `
    margin: 0 0 15px 0;
    color: #4CAF50;
    font-size: 16px;
    font-weight: 600;
  `;
  section.appendChild(title);

  // Ollama settings
  const ollamaGroup = createProviderGroup('Ollama', settings, 'ollama');
  section.appendChild(ollamaGroup);

  // Separator
  const separator = document.createElement('div');
  separator.style.cssText = `
    height: 1px;
    background: #444;
    margin: 15px 0;
  `;
  section.appendChild(separator);

  // LM Studio settings
  const lmstudioGroup = createProviderGroup('LM Studio', settings, 'lmstudio');
  section.appendChild(lmstudioGroup);

  return section;
}

/**
 * Create settings group for a provider (Ollama or LM Studio)
 * @param {string} providerName - Display name of the provider
 * @param {Object} settings - Current settings
 * @param {string} providerKey - Key prefix (ollama or lmstudio)
 * @returns {HTMLElement} Provider group element
 */
function createProviderGroup(providerName, settings, providerKey) {
  const group = document.createElement('div');
  group.style.cssText = 'margin-bottom: 15px;';

  // Enable checkbox
  const enableKey = `enable_${providerKey}`;
  const enableSetting = settings[enableKey];
  const enableCheckbox = createCheckbox(
    `Enable ${providerName}`,
    enableSetting ? enableSetting.current_value : true,
    enableKey
  );
  group.appendChild(enableCheckbox.container);

  // Custom URL checkbox
  const useCustomUrlKey = `${providerKey}_use_custom_url`;
  const useCustomUrlSetting = settings[useCustomUrlKey];
  const customUrlCheckbox = createCheckbox(
    `Use custom URL for ${providerName}`,
    useCustomUrlSetting ? useCustomUrlSetting.current_value : false,
    useCustomUrlKey
  );
  customUrlCheckbox.container.style.marginLeft = '20px';
  group.appendChild(customUrlCheckbox.container);

  // Custom URL input
  const customUrlKey = `${providerKey}_custom_url`;
  const customUrlSetting = settings[customUrlKey];
  const customUrlInput = createTextInput(
    `${providerName} URL`,
    customUrlSetting ? customUrlSetting.current_value : '',
    customUrlKey,
    `e.g., http://localhost:${providerKey === 'ollama' ? '11434' : '1234'}`
  );
  customUrlInput.container.style.marginLeft = '40px';
  customUrlInput.container.style.marginTop = '10px';
  
  // Show/hide URL input based on checkbox
  const updateUrlInputVisibility = () => {
    customUrlInput.container.style.display = 
      customUrlCheckbox.checkbox.checked ? 'block' : 'none';
  };
  updateUrlInputVisibility();
  customUrlCheckbox.checkbox.addEventListener('change', updateUrlInputVisibility);

  group.appendChild(customUrlInput.container);

  return group;
}

/**
 * Create a checkbox input
 * @param {string} label - Label text
 * @param {boolean} checked - Initial checked state
 * @param {string} settingKey - Setting key
 * @returns {Object} Object with container and checkbox elements
 */
function createCheckbox(label, checked, settingKey) {
  const container = document.createElement('div');
  container.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  `;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = `setting-${settingKey}`;
  checkbox.checked = checked;
  checkbox.dataset.settingKey = settingKey;
  checkbox.style.cssText = 'cursor: pointer;';

  const labelElement = document.createElement('label');
  labelElement.htmlFor = `setting-${settingKey}`;
  labelElement.textContent = label;
  labelElement.style.cssText = `
    color: #ccc;
    font-size: 14px;
    cursor: pointer;
    user-select: none;
  `;

  container.appendChild(checkbox);
  container.appendChild(labelElement);

  return { container, checkbox };
}

/**
 * Create a text input field
 * @param {string} label - Label text
 * @param {string} value - Initial value
 * @param {string} settingKey - Setting key
 * @param {string} placeholder - Placeholder text
 * @returns {Object} Object with container and input elements
 */
function createTextInput(label, value, settingKey, placeholder = '') {
  const container = document.createElement('div');
  container.style.cssText = 'margin-bottom: 10px;';

  const labelElement = document.createElement('label');
  labelElement.textContent = label;
  labelElement.style.cssText = `
    display: block;
    color: #ccc;
    font-size: 13px;
    margin-bottom: 5px;
  `;

  const input = document.createElement('input');
  input.type = 'text';
  input.id = `setting-${settingKey}`;
  input.value = value || '';
  input.placeholder = placeholder;
  input.dataset.settingKey = settingKey;
  input.style.cssText = `
    width: 100%;
    padding: 8px;
    background: #2a2a2a;
    border: 1px solid #555;
    border-radius: 4px;
    color: #ccc;
    font-size: 13px;
    box-sizing: border-box;
  `;

  container.appendChild(labelElement);
  container.appendChild(input);

  return { container, input };
}

/**
 * Save settings
 * @param {Object} dialog - Dialog instance
 * @param {HTMLElement} container - Settings container
 * @param {Object} originalSettings - Original settings for reference
 */
async function saveSettings(dialog, container, originalSettings) {
  try {
    // Collect all setting inputs
    const inputs = container.querySelectorAll('[data-setting-key]');
    const updates = {};

    inputs.forEach(input => {
      const key = input.dataset.settingKey;
      let value;

      if (input.type === 'checkbox') {
        value = input.checked;
      } else {
        value = input.value;
      }

      updates[key] = value;
    });

    console.log('Saving settings:', updates);

    // Send update request
    const response = await api.fetchApi('/sage_utils/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Failed to save settings: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Save result:', result);

    if (!result.success) {
      throw new Error(result.error || 'Failed to save settings');
    }

    // Update ComfyUI settings to reflect the changes
    for (const [key, value] of Object.entries(updates)) {
      const settingId = SETTING_KEY_TO_ID_MAP[key];
      if (settingId && app.extensionManager && app.extensionManager.setting) {
        try {
          await app.extensionManager.setting.set(settingId, value);
          console.log(`Updated ComfyUI setting ${settingId} to:`, value);
        } catch (error) {
          console.warn(`Could not update ComfyUI setting ${settingId}:`, error);
        }
      }
    }

    // Show success notification
    if (notifications && notifications.show) {
      notifications.show('Settings saved successfully', 'success');
    }

    // Close dialog
    dialog.close();

  } catch (error) {
    console.error('Error saving settings:', error);
    handleError(error, 'Failed to save settings');
    if (notifications && notifications.show) {
      notifications.show('Failed to save settings: ' + error.message, 'error');
    }
  }
}

/**
 * Reset all settings to defaults
 * @param {Object} dialog - Dialog instance
 */
async function resetSettings(dialog) {
  try {
    const response = await api.fetchApi('/sage_utils/settings/reset', {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error(`Failed to reset settings: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to reset settings');
    }

    // Show success notification
    if (notifications && notifications.show) {
      notifications.show('Settings reset to defaults', 'success');
    }

    // Close and reopen dialog to show new values
    dialog.close();
    setTimeout(() => showSettingsDialog(), 100);

  } catch (error) {
    handleError(error, 'Failed to reset settings');
    if (notifications && notifications.show) {
      notifications.show('Failed to reset settings: ' + error.message, 'error');
    }
  }
}

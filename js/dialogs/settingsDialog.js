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
import { createCheckbox, createRadioGroup, createInput } from '../components/formElements.js';

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

  // Tab Visibility Section
  const tabVisibilitySection = createTabVisibilitySection(settings);
  settingsContainer.appendChild(tabVisibilitySection);

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

  // Default provider selection
  const defaultProviderGroup = createDefaultProviderSelector(settings);
  section.appendChild(defaultProviderGroup);

  // Separator after default provider
  const topSeparator = document.createElement('div');
  topSeparator.style.cssText = `
    height: 1px;
    background: #444;
    margin: 15px 0;
  `;
  section.appendChild(topSeparator);

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
 * Create default LLM provider selector
 * @param {Object} settings - Current settings
 * @returns {HTMLElement} Default provider selector group
 */
function createDefaultProviderSelector(settings) {
  const group = document.createElement('div');
  group.style.cssText = 'margin-bottom: 15px;';

  const label = document.createElement('label');
  label.textContent = 'Default LLM Provider:';
  label.style.cssText = `
    display: block;
    color: #ccc;
    font-size: 14px;
    margin-bottom: 8px;
    font-weight: 500;
  `;
  group.appendChild(label);

  const description = document.createElement('div');
  description.textContent = 'Select which provider to use by default when opening the LLM tab';
  description.style.cssText = `
    color: #888;
    font-size: 12px;
    margin-bottom: 10px;
    font-style: italic;
  `;
  group.appendChild(description);

  // Get current setting
  const defaultProviderSetting = settings['default_llm_provider'];
  const currentValue = defaultProviderSetting ? defaultProviderSetting.current_value : 'ollama';

  // Create radio button group
  const radioItems = [
    { value: 'ollama', label: 'Ollama' },
    { value: 'lmstudio', label: 'LM Studio' }
  ];

  const { container: radioContainer } = createRadioGroup('default_llm_provider', radioItems, {
    selectedValue: currentValue,
    layout: 'horizontal',
    style: {
      display: 'flex',
      gap: '20px',
      marginLeft: '10px'
    }
  });

  // Add data attributes to radios for settings management
  const radios = radioContainer.querySelectorAll('input[type="radio"]');
  radios.forEach(radio => {
    radio.dataset.settingKey = 'default_llm_provider';
  });

  group.appendChild(radioContainer);

  return group;
}

/**
 * Create Tab Visibility settings section
 * @param {Object} settings - Current settings
 * @returns {HTMLElement} Section element
 */
function createTabVisibilitySection(settings) {
  const section = document.createElement('div');
  section.style.cssText = `
    padding: 15px;
    background: #1e1e1e;
    border-radius: 6px;
    border: 1px solid #444;
  `;

  const title = document.createElement('h3');
  title.textContent = 'Sidebar Tab Visibility';
  title.style.cssText = `
    margin: 0 0 15px 0;
    color: #4CAF50;
    font-size: 16px;
    font-weight: 600;
  `;
  section.appendChild(title);

  const description = document.createElement('p');
  description.textContent = 'Control which tabs are visible in the sidebar. Changes take effect immediately.';
  description.style.cssText = `
    margin: 0 0 15px 0;
    color: #888;
    font-size: 13px;
    font-style: italic;
  `;
  section.appendChild(description);

  // Create a grid for tab checkboxes
  const tabsGrid = document.createElement('div');
  tabsGrid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  `;

  // Define tabs with their settings keys and display names
  const tabs = [
    { key: 'show_models_tab', label: 'Models' },
    { key: 'show_files_tab', label: 'Files' },
    { key: 'show_search_tab', label: 'Search (Civitai)' },
    { key: 'show_gallery_tab', label: 'Gallery' },
    { key: 'show_prompts_tab', label: 'Prompts' },
    { key: 'show_llm_tab', label: 'LLM' }
  ];

  // Create checkbox for each tab
  tabs.forEach(tab => {
    const setting = settings[tab.key];
    const { container, checkbox } = createCheckbox(tab.label, {
      checked: setting ? setting.current_value : true,
      id: `setting-${tab.key}`
    });
    
    // Add setting key to checkbox for saving later
    checkbox.dataset.settingKey = tab.key;
    
    container.style.marginBottom = '5px';
    tabsGrid.appendChild(container);
  });

  section.appendChild(tabsGrid);

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
  const { container: enableContainer, checkbox: enableCheckbox } = createCheckbox(
    `Enable ${providerName}`,
    {
      checked: enableSetting ? enableSetting.current_value : true,
      id: `setting-${enableKey}`
    }
  );
  enableCheckbox.dataset.settingKey = enableKey;
  group.appendChild(enableContainer);

  // Custom URL checkbox
  const useCustomUrlKey = `${providerKey}_use_custom_url`;
  const useCustomUrlSetting = settings[useCustomUrlKey];
  const { container: customUrlCheckboxContainer, checkbox: customUrlCheckbox } = createCheckbox(
    `Use custom URL for ${providerName}`,
    {
      checked: useCustomUrlSetting ? useCustomUrlSetting.current_value : false,
      id: `setting-${useCustomUrlKey}`
    }
  );
  customUrlCheckbox.dataset.settingKey = useCustomUrlKey;
  customUrlCheckboxContainer.style.marginLeft = '20px';
  group.appendChild(customUrlCheckboxContainer);

  // Custom URL input
  const customUrlKey = `${providerKey}_custom_url`;
  const customUrlSetting = settings[customUrlKey];
  const { container: customUrlInputContainer, input: customUrlInput } = createTextInput(
    `${providerName} URL`,
    customUrlSetting ? customUrlSetting.current_value : '',
    customUrlKey,
    `e.g., http://localhost:${providerKey === 'ollama' ? '11434' : '1234'}`
  );
  customUrlInputContainer.style.marginLeft = '40px';
  customUrlInputContainer.style.marginTop = '10px';
  
  // Show/hide URL input based on checkbox
  const updateUrlInputVisibility = () => {
    customUrlInputContainer.style.display = 
      customUrlCheckbox.checked ? 'block' : 'none';
  };
  updateUrlInputVisibility();
  customUrlCheckbox.addEventListener('change', updateUrlInputVisibility);

  group.appendChild(customUrlInputContainer);

  return group;
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
  const input = createInput({
    type: 'text',
    id: `setting-${settingKey}`,
    value: value || '',
    placeholder: placeholder,
    style: {
      width: '100%',
      padding: '8px',
      background: '#2a2a2a',
      border: '1px solid #555',
      borderRadius: '4px',
      color: '#ccc',
      fontSize: '13px',
      boxSizing: 'border-box'
    }
  });

  input.dataset.settingKey = settingKey;

  const container = document.createElement('div');
  container.style.cssText = 'margin-bottom: 10px;';

  const labelElement = document.createElement('label');
  labelElement.textContent = label;
  labelElement.htmlFor = `setting-${settingKey}`;
  labelElement.style.cssText = `
    display: block;
    color: #ccc;
    font-size: 13px;
    margin-bottom: 5px;
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
      } else if (input.type === 'radio') {
        // Only get value from checked radio button
        if (input.checked) {
          value = input.value;
        } else {
          // Skip unchecked radio buttons
          return;
        }
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

    // Check if any tab visibility settings changed
    const tabVisibilityKeys = [
      'show_models_tab',
      'show_files_tab', 
      'show_search_tab',
      'show_gallery_tab',
      'show_prompts_tab',
      'show_llm_tab'
    ];
    const tabVisibilityChanged = Object.keys(updates).some(key => tabVisibilityKeys.includes(key));

    // If tab visibility changed, reload the sidebar
    if (tabVisibilityChanged) {
      try {
        const { reloadCacheSidebar } = await import('../sidebar/cacheSidebar.js');
        await reloadCacheSidebar();
        console.log('Sidebar reloaded due to tab visibility changes');
      } catch (error) {
        console.error('Failed to reload sidebar:', error);
        if (notifications && notifications.show) {
          notifications.show('Settings saved but sidebar reload failed. Please refresh the page.', 'warning');
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

    // Reload the sidebar since tab visibility may have changed
    try {
      const { reloadCacheSidebar } = await import('../sidebar/cacheSidebar.js');
      await reloadCacheSidebar();
      console.log('Sidebar reloaded after settings reset');
    } catch (error) {
      console.error('Failed to reload sidebar:', error);
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

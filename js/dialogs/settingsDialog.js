/**
 * Settings Dialog
 * Provides a UI for configuring SageUtils settings
 * Currently focuses on LLM provider configuration (REST providers, OpenAI, and Native)
 */

import { api } from '../../../../scripts/api.js';
import { createDialog } from '../components/dialogManager.js';
import { handleError } from '../shared/errorHandler.js';
import { notifications } from '../shared/notifications.js';
import { app } from '../../../../scripts/app.js';
import { createCheckbox, createRadioGroup, createInput } from '../components/formElements.js';
import { javascriptTimer, uiTimer, printTimingReport } from '../shared/performanceTimer.js';
import {
  TAB_VISIBILITY_CONFIG,
  hasTabVisibilityUpdates,
  normalizeTabVisibilitySettings
} from '../shared/sidebarVisibility.js';

/**
 * Mapping between backend setting keys and ComfyUI setting IDs
 */
const SETTING_KEY_TO_ID_MAP = {
  'enable_lmstudio_rest': 'SageUtils.LLM Providers.enable_lmstudio_rest',
  'enable_ollama_rest': 'SageUtils.LLM Providers.enable_ollama_rest',
  'enable_openai': 'SageUtils.LLM Providers.enable_openai',
  'openai_api_key': 'SageUtils.OpenAI.openai_api_key',
  'openai_use_custom_url': 'SageUtils.OpenAI.openai_use_custom_url',
  'openai_base_url': 'SageUtils.OpenAI.openai_base_url',
  'ollama_custom_url': 'SageUtils.Local Custom Ollama URL.ollama_custom_url',
  'ollama_use_custom_url': 'SageUtils.Local Custom Ollama URL.ollama_use_custom_url',
  'ollama_api_key': 'SageUtils.Ollama.ollama_api_key',
  'lmstudio_custom_url': 'SageUtils.Local Custom LM Studio URL.lmstudio_custom_url',
  'lmstudio_use_custom_url': 'SageUtils.Local Custom LM Studio URL.lmstudio_use_custom_url',
  'lmstudio_api_token': 'SageUtils.LM Studio.lmstudio_api_token'
};

/**
 * Show the settings dialog
 */
export async function showSettingsDialog() {
  const content = document.createElement('div');
  content.className = 'settings-dialog-content';

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
  loadingSection.className = 'dialog-loading-section';
  loadingSection.innerHTML = `
    <div class="dialog-loading-title">Loading settings...</div>
    <div class="dialog-loading-subtitle">Please wait</div>
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
      <div class="dialog-error-message">
        <div class="dialog-loading-title">Error loading settings</div>
        <div class="dialog-loading-subtitle">${error.message}</div>
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
  settingsContainer.className = 'settings-dialog-content';

  // LLM Integration Section
  const llmSection = createLLMSection(settings);
  settingsContainer.appendChild(llmSection);

  // Tab Visibility Section
  const tabVisibilitySection = createTabVisibilitySection(settings);
  settingsContainer.appendChild(tabVisibilitySection);

  // Performance & Telemetry Section (frontend-only)
  const perfSection = createPerformanceSection();
  settingsContainer.appendChild(perfSection);

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
  section.className = 'settings-section';

  const title = document.createElement('h3');
  title.textContent = 'LLM Integration';
  title.className = 'settings-section-title';
  section.appendChild(title);

  // Default provider selection
  const defaultProviderGroup = createDefaultProviderSelector(settings);
  section.appendChild(defaultProviderGroup);

  // Separator after default provider
  const topSeparator = document.createElement('div');
  topSeparator.className = 'settings-divider';
  section.appendChild(topSeparator);

  // Ollama settings
  const ollamaGroup = createProviderGroup('Ollama', settings, 'ollama_rest', 'ollama');
  section.appendChild(ollamaGroup);

  // Separator
  const separator = document.createElement('div');
  separator.className = 'settings-divider';
  section.appendChild(separator);

  // OpenAI settings
  const openaiGroup = createOpenAIProviderGroup(settings);
  section.appendChild(openaiGroup);

  // Separator
  const openaiSeparator = document.createElement('div');
  openaiSeparator.className = 'settings-divider';
  section.appendChild(openaiSeparator);

  // LM Studio settings
  const lmstudioGroup = createProviderGroup('LM Studio', settings, 'lmstudio_rest', 'lmstudio');
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
  group.className = 'settings-group';

  const label = document.createElement('label');
  label.textContent = 'Default LLM Provider:';
  label.className = 'settings-label';
  group.appendChild(label);

  const description = document.createElement('div');
  description.textContent = 'Select which provider to use by default in the LLM tab and provider-switching LLM v3 nodes';
  description.className = 'settings-description';
  group.appendChild(description);

  // Get current setting
  const defaultProviderSetting = settings['default_llm_provider'];
  const currentValue = defaultProviderSetting ? defaultProviderSetting.current_value : 'lmstudio_rest';

  // Create radio button group
  const radioItems = [
    { value: 'lmstudio_rest', label: 'LM Studio' },
    { value: 'ollama_rest', label: 'Ollama' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'native', label: 'Native (CLIP)' }
  ];

  const { container: radioContainer } = createRadioGroup('default_llm_provider', radioItems, {
    selectedValue: currentValue,
    layout: 'horizontal',
    className: 'settings-radio-group'
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
  section.className = 'settings-section';

  const title = document.createElement('h3');
  title.textContent = 'Sidebar Tab Visibility';
  title.className = 'settings-section-title';
  section.appendChild(title);

  const description = document.createElement('p');
  description.textContent = 'Control which tabs are visible in the sidebar. Changes take effect immediately.';
  description.className = 'settings-description';
  section.appendChild(description);

  // Create a grid for tab checkboxes
  const tabsGrid = document.createElement('div');
  tabsGrid.className = 'tabs-grid';

  const visibilitySettings = normalizeTabVisibilitySettings(settings);

  // Create checkbox for each tab
  TAB_VISIBILITY_CONFIG.forEach((tab) => {
    const { container, checkbox } = createCheckbox(tab.label, {
      checked: visibilitySettings[tab.settingKey],
      id: `setting-${tab.settingKey}`
    });
    
    // Add setting key to checkbox for saving later
    checkbox.dataset.settingKey = tab.settingKey;
    
    container.classList.add('settings-item-spacing');
    tabsGrid.appendChild(container);
  });

  section.appendChild(tabsGrid);

  return section;
}

/**
 * Create settings group for a provider
 * @param {string} providerName - Display name of the provider
 * @param {Object} settings - Current settings
 * @param {string} providerKey - Enable flag key suffix (e.g., ollama_rest)
 * @param {string} urlKeyPrefix - URL key prefix (ollama or lmstudio)
 * @returns {HTMLElement} Provider group element
 */
function createProviderGroup(providerName, settings, providerKey, urlKeyPrefix) {
  const group = document.createElement('div');
  group.className = 'settings-group';

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
  const useCustomUrlKey = `${urlKeyPrefix}_use_custom_url`;
  const useCustomUrlSetting = settings[useCustomUrlKey];
  const { container: customUrlCheckboxContainer, checkbox: customUrlCheckbox } = createCheckbox(
    `Use custom URL for ${providerName}`,
    {
      checked: useCustomUrlSetting ? useCustomUrlSetting.current_value : false,
      id: `setting-${useCustomUrlKey}`
    }
  );
  customUrlCheckbox.dataset.settingKey = useCustomUrlKey;
  customUrlCheckboxContainer.classList.add('settings-indent');
  group.appendChild(customUrlCheckboxContainer);

  // Custom URL input
  const customUrlKey = `${urlKeyPrefix}_custom_url`;
  const customUrlSetting = settings[customUrlKey];
  const { container: customUrlInputContainer, input: customUrlInput } = createTextInput(
    `${providerName} URL`,
    customUrlSetting ? customUrlSetting.current_value : '',
    customUrlKey,
    `e.g., http://localhost:${urlKeyPrefix === 'ollama' ? '11434' : '1234'}`
  );
  customUrlInputContainer.classList.add('settings-indent', 'settings-indent-large');
  
  // Show/hide URL input based on checkbox
  const updateUrlInputVisibility = () => {
    customUrlInputContainer.classList.toggle('hidden', !customUrlCheckbox.checked);
  };
  updateUrlInputVisibility();
  customUrlCheckbox.addEventListener('change', updateUrlInputVisibility);

  group.appendChild(customUrlInputContainer);

  if (urlKeyPrefix === 'lmstudio' || urlKeyPrefix === 'ollama') {
    const tokenKey = urlKeyPrefix === 'ollama' ? 'ollama_api_key' : 'lmstudio_api_token';
    const tokenLabel = urlKeyPrefix === 'ollama' ? 'Ollama API Key' : 'LM Studio API Token';
    const tokenPlaceholder = urlKeyPrefix === 'ollama' ? 'Optional bearer key' : 'Optional bearer token';
    const tokenSetting = settings[tokenKey];
    const { container: tokenInputContainer, input: tokenInput } = createTextInput(
      tokenLabel,
      tokenSetting ? tokenSetting.current_value : '',
      tokenKey,
      tokenPlaceholder
    );
    tokenInput.type = 'password';
    tokenInput.autocomplete = 'off';
    tokenInputContainer.classList.add('settings-indent', 'settings-indent-large');
    group.appendChild(tokenInputContainer);
  }

  return group;
}

/**
 * Create OpenAI settings group with API key and custom URL fields
 * @param {Object} settings - Current settings
 * @returns {HTMLElement} OpenAI group element
 */
function createOpenAIProviderGroup(settings) {
  const group = document.createElement('div');
  group.className = 'settings-group';
  const enableSetting = settings[enableKey];
  const { container: enableContainer, checkbox: enableCheckbox } = createCheckbox(
    'Enable OpenAI',
    {
      checked: enableSetting ? enableSetting.current_value : false,
      id: `setting-${enableKey}`
    }
  );
  enableCheckbox.dataset.settingKey = enableKey;
  group.appendChild(enableContainer);

  const useCustomUrlKey = 'openai_use_custom_url';
  const useCustomUrlSetting = settings[useCustomUrlKey];
  const { container: customUrlCheckboxContainer, checkbox: customUrlCheckbox } = createCheckbox(
    'Use custom URL for OpenAI',
    {
      checked: useCustomUrlSetting ? useCustomUrlSetting.current_value : false,
      id: `setting-${useCustomUrlKey}`
    }
  );
  customUrlCheckbox.dataset.settingKey = useCustomUrlKey;
  customUrlCheckboxContainer.classList.add('settings-indent');
  customUrlCheckboxContainer.classList.add('settings-indent-large');
  group.appendChild(customUrlCheckboxContainer);

  const baseUrlKey = 'openai_base_url';
  const baseUrlSetting = settings[baseUrlKey];
  const { container: baseUrlInputContainer } = createTextInput(
    'OpenAI Base URL',
    baseUrlSetting ? baseUrlSetting.current_value : '',
    baseUrlKey,
    'e.g., https://api.openai.com'
  );
  baseUrlInputContainer.classList.add('settings-indent', 'settings-indent-large');

  const updateUrlInputVisibility = () => {
    baseUrlInputContainer.classList.toggle('hidden', !customUrlCheckbox.checked);
  };
  updateUrlInputVisibility();
  customUrlCheckbox.addEventListener('change', updateUrlInputVisibility);

  group.appendChild(baseUrlInputContainer);

  const apiKeyKey = 'openai_api_key';
  const apiKeySetting = settings[apiKeyKey];
  const { container: apiKeyInputContainer, input: apiKeyInput } = createTextInput(
    'OpenAI API Key',
    apiKeySetting ? apiKeySetting.current_value : '',
    apiKeyKey,
    'sk-...'
  );
  apiKeyInput.type = 'password';
  apiKeyInput.autocomplete = 'off';
  apiKeyInputContainer.classList.add('settings-indent', 'settings-indent-large');
  group.appendChild(apiKeyInputContainer);

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
    className: 'settings-input'
  });

  input.dataset.settingKey = settingKey;

  const container = document.createElement('div');
  container.className = 'settings-input-container';

  const labelElement = document.createElement('label');
  labelElement.textContent = label;
  labelElement.htmlFor = `setting-${settingKey}`;
  labelElement.className = 'settings-input-label';

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
    const tabVisibilityChanged = hasTabVisibilityUpdates(updates);

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

    // Apply local-only performance settings (handled after dialog close for snappy UI)
    try {
      const localInputs = container.querySelectorAll('[data-local-setting]');
      const localUpdates = {};
      localInputs.forEach(input => {
        const key = input.dataset.localSetting;
        if (!key) return;
        const value = input.type === 'checkbox' ? !!input.checked : input.value;
        localUpdates[key] = value;
      });

      // Persist to localStorage and apply immediately
      if (Object.keys(localUpdates).length > 0) {
        if (typeof localUpdates.perf_monitoring === 'boolean') {
          localStorage.setItem('sageutils_perf_monitoring', String(localUpdates.perf_monitoring));
          if (localUpdates.perf_monitoring) {
            javascriptTimer.enable?.();
            uiTimer.enable?.();
          } else {
            javascriptTimer.disable?.();
            uiTimer.disable?.();
          }
        }
        if (typeof localUpdates.send_timing === 'boolean') {
          localStorage.setItem('sageutils_send_timing', String(localUpdates.send_timing));
        }
        if (typeof localUpdates.print_timing === 'boolean') {
          localStorage.setItem('sageutils_print_timing', String(localUpdates.print_timing));
          if (localUpdates.print_timing) {
            // Optional: print a short report immediately for confirmation
            try { printTimingReport(javascriptTimer); } catch {}
          }
        }
        console.log('[Settings] Updated local performance settings:', localUpdates);
      }
    } catch (e) {
      console.warn('[Settings] Failed to apply local performance settings:', e);
    }

  } catch (error) {
    console.error('Error saving settings:', error);
    handleError(error, 'Failed to save settings');
    if (notifications && notifications.show) {
      notifications.show('Failed to save settings: ' + error.message, 'error');
    }
  }
}

/**
 * Create Performance & Telemetry settings section (frontend-only)
 * Uses localStorage flags and immediate runtime toggles; does not hit backend
 */
function createPerformanceSection() {
  const section = document.createElement('div');
  section.className = 'settings-section';

  const title = document.createElement('h3');
  title.textContent = 'Performance & Telemetry';
  title.className = 'settings-section-title';
  section.appendChild(title);

  const note = document.createElement('div');
  note.textContent = 'These options affect local performance monitoring and telemetry upload.';
  note.className = 'settings-description';
  section.appendChild(note);

  const grid = document.createElement('div');
  grid.className = 'settings-grid';

  // Current values from localStorage
  const perfMonitoring = localStorage.getItem('sageutils_perf_monitoring') === 'true';
  const sendTiming = localStorage.getItem('sageutils_send_timing') === 'true';
  const printTiming = localStorage.getItem('sageutils_print_timing') === 'true';

  // Enable performance monitoring
  {
    const { container, checkbox } = createCheckbox('Enable performance monitoring', {
      checked: perfMonitoring,
      id: 'perf-monitoring-checkbox'
    });
    checkbox.dataset.localSetting = 'perf_monitoring';
    grid.appendChild(container);
  }

  // Send timing to server
  {
    const { container, checkbox } = createCheckbox('Send timing telemetry to server', {
      checked: sendTiming,
      id: 'perf-sendtiming-checkbox'
    });
    checkbox.dataset.localSetting = 'send_timing';
    grid.appendChild(container);
  }

  // Print timing to console
  {
    const { container, checkbox } = createCheckbox('Print timing report to console', {
      checked: printTiming,
      id: 'perf-printtiming-checkbox'
    });
    checkbox.dataset.localSetting = 'print_timing';
    grid.appendChild(container);
  }

  section.appendChild(grid);

  // Action buttons row
  const actions = document.createElement('div');
  actions.className = 'settings-actions';

  const btn = (label, onClick, variant = 'default') => {
    const b = document.createElement('button');
    b.textContent = label;
    b.className = `settings-action-button ${variant === 'primary' ? 'primary' : ''}`;
    b.addEventListener('click', onClick);
    return b;
  };

  // Send timing now
  actions.appendChild(btn('Send timing now', async () => {
    try {
      await javascriptTimer.sendTimingDataToServer?.();
      notifications?.show?.('Timing data sent', 'success');
    } catch (e) {
      notifications?.show?.('Failed to send timing data', 'error');
    }
  }, 'primary'));

  // Reset collected timing
  actions.appendChild(btn('Reset collected timing', () => {
    try {
      javascriptTimer.reset?.();
      uiTimer.reset?.();
      notifications?.show?.('Timing data reset', 'info');
    } catch (e) {
      notifications?.show?.('Failed to reset timing data', 'error');
    }
  }));

  // Print report now
  actions.appendChild(btn('Print timing report', () => {
    try {
      printTimingReport(javascriptTimer);
    } catch (e) {
      console.warn('Failed to print timing report', e);
    }
  }));

  section.appendChild(actions);

  return section;
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

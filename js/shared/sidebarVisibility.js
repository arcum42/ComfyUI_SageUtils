/**
 * Shared sidebar visibility config and mapping helpers.
 *
 * Keeps tab visibility mapping logic in one place so sidebar startup and
 * settings updates use the same canonical transformation.
 */

export const TAB_VISIBILITY_CONFIG = [
  { settingKey: 'show_models_tab', tabId: 'models', label: 'Models' },
  { settingKey: 'show_files_tab', tabId: 'notes', label: 'Files' },
  { settingKey: 'show_search_tab', tabId: 'civitai', label: 'Search (Civitai)' },
  { settingKey: 'show_gallery_tab', tabId: 'gallery', label: 'Gallery' },
  { settingKey: 'show_prompts_tab', tabId: 'promptBuilder', label: 'Prompts' },
  { settingKey: 'show_llm_tab', tabId: 'llm', label: 'LLM' }
];

export const TAB_VISIBILITY_KEYS = TAB_VISIBILITY_CONFIG.map((item) => item.settingKey);

export const DEFAULT_TAB_VISIBILITY_SETTINGS = Object.freeze(
  TAB_VISIBILITY_CONFIG.reduce((acc, item) => {
    acc[item.settingKey] = true;
    return acc;
  }, {})
);

function readSettingValue(rawValue, fallbackValue = true) {
  if (rawValue === undefined || rawValue === null) {
    return fallbackValue;
  }

  if (typeof rawValue === 'object' && 'current_value' in rawValue) {
    return rawValue.current_value !== false;
  }

  return rawValue !== false;
}

/**
 * Normalize arbitrary visibility input into a canonical boolean settings map.
 * Accepts either plain booleans or backend setting objects ({ current_value }).
 */
export function normalizeTabVisibilitySettings(rawSettings = {}, defaults = DEFAULT_TAB_VISIBILITY_SETTINGS) {
  const normalized = {};

  TAB_VISIBILITY_CONFIG.forEach(({ settingKey }) => {
    const fallbackValue = defaults[settingKey] !== false;
    normalized[settingKey] = readSettingValue(rawSettings[settingKey], fallbackValue);
  });

  return normalized;
}

/**
 * Convert canonical settings map into TabManager visibility map.
 */
export function toTabVisibilityMap(settings = {}, options = {}) {
  const { ensureOneVisible = true, fallbackTabId = 'models' } = options;
  const normalized = normalizeTabVisibilitySettings(settings);

  const tabMap = TAB_VISIBILITY_CONFIG.reduce((acc, { settingKey, tabId }) => {
    acc[tabId] = normalized[settingKey] !== false;
    return acc;
  }, {});

  if (ensureOneVisible && !Object.values(tabMap).some(Boolean)) {
    tabMap[fallbackTabId] = true;
  }

  return tabMap;
}

export function hasTabVisibilityUpdates(updates = {}) {
  return Object.keys(updates).some((key) => TAB_VISIBILITY_KEYS.includes(key));
}

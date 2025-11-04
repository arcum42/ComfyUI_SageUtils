/**
 * Dataset Text API Wrapper
 * Centralizes calls for checking, reading, and saving dataset text files.
 */

import { api } from '../../../../scripts/api.js';

/**
 * Check if a dataset text file exists for an image
 * @param {string} imagePath
 * @returns {Promise<{exists: boolean}>}
 */
export async function check(imagePath) {
  const response = await api.fetchApi('/sage_utils/check_dataset_text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_path: imagePath })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to check dataset text');
  }

  return { exists: !!result.exists };
}

/**
 * Read the dataset text file for an image
 * @param {string} imagePath
 * @returns {Promise<{content: string}>}
 */
export async function read(imagePath) {
  const response = await api.fetchApi('/sage_utils/read_dataset_text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_path: imagePath })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to read dataset text');
  }

  return { content: result.content || '' };
}

/**
 * Save content to the dataset text file for an image
 * @param {string} imagePath
 * @param {string} content
 * @returns {Promise<void>}
 */
export async function save(imagePath, content) {
  const response = await api.fetchApi('/sage_utils/save_dataset_text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_path: imagePath, content })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to save dataset text');
  }
}

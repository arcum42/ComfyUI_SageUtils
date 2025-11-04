/**
 * Shared Dataset Text Operations
 * Provides helper(s) for iterating over images in the current folder
 * and aggregating results/errors in a consistent way.
 */

import { selectors } from './stateManager.js';
import { notifications } from './notifications.js';

/**
 * Iterate over all images in the current folder and apply an async operation.
 * Aggregates numeric counters returned by the per-item handler and collects errors uniformly.
 *
 * @param {Function} onItem - async function(image) returning an object of numeric counters to aggregate
 * @returns {Promise<{processed:number, errors:string[]} & Record<string, number>>}
 */
export async function processImagesInCurrentFolder(onItem) {
  const allImages = selectors.galleryImages();
  if (!allImages || allImages.length === 0) {
    notifications.warning('No images found in current folder.');
    return { processed: 0, errors: [] };
  }

  const errors = [];
  let processed = 0;
  const counters = {};

  for (const image of allImages) {
    try {
      const result = await onItem(image);
      if (result && typeof result === 'object') {
        for (const [key, value] of Object.entries(result)) {
          if (typeof value === 'number') {
            counters[key] = (counters[key] || 0) + value;
          }
        }
      }
      processed++;
    } catch (error) {
      const name = image.filename || image.name || (image.path ? image.path.split('/').pop() : 'Unknown');
      errors.push(`${name}: ${error.message}`);
    }
  }

  return { processed, errors, ...counters };
}

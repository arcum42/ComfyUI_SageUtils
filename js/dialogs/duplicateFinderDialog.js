/**
 * Duplicate Image Finder Dialog
 * Scans for duplicate images by hash and allows selective deletion
 */

import { api } from '../../../../scripts/api.js';
import { createDialog } from '../components/dialogManager.js';
import { handleError } from '../shared/errorHandler.js';

/**
 * Show duplicate finder dialog
 * @param {string} folderPath - Path to the folder to scan
 * @param {boolean} includeSubfolders - Whether to include subfolders in the scan
 * @param {Function} onComplete - Callback function when operation completes
 */
export async function showDuplicateFinderDialog(folderPath, includeSubfolders = false, onComplete = null) {
  const content = document.createElement('div');
  content.className = 'dialog-content-wide';

  const dialog = createDialog({
    title: 'Find Duplicate Images',
    content: content,
    width: '900px',
    height: 'auto',
    showFooter: true,
    closeOnOverlayClick: false
  });

  // Create scanning section
  const scanSection = document.createElement('div');
  scanSection.className = 'dialog-panel';

  const folderInfo = document.createElement('div');
  folderInfo.className = 'dialog-info-text';
  folderInfo.innerHTML = `
    <div class="dialog-info-line"><strong>Scanning folder:</strong> ${folderPath}</div>
  `;
  scanSection.appendChild(folderInfo);

  // Add checkbox for including subfolders
  const subfolderCheckboxContainer = document.createElement('div');
  subfolderCheckboxContainer.className = 'dialog-checkbox-row';

  const subfolderCheckbox = document.createElement('input');
  subfolderCheckbox.type = 'checkbox';
  subfolderCheckbox.id = 'include-subfolders-checkbox';
  subfolderCheckbox.checked = includeSubfolders;
  subfolderCheckbox.className = 'sage-checkbox-input';

  const subfolderLabel = document.createElement('label');
  subfolderLabel.htmlFor = 'include-subfolders-checkbox';
  subfolderLabel.textContent = 'Include subfolders in scan';
  subfolderLabel.className = 'dialog-checkbox-label';

  subfolderCheckboxContainer.appendChild(subfolderCheckbox);
  subfolderCheckboxContainer.appendChild(subfolderLabel);
  scanSection.appendChild(subfolderCheckboxContainer);

  const progressContainer = document.createElement('div');
  progressContainer.className = 'dialog-progress-panel';

  const progressText = document.createElement('div');
  progressText.className = 'dialog-progress-status';
  progressText.textContent = 'Initializing scan...';
  progressContainer.appendChild(progressText);

  const progressBarOuter = document.createElement('div');
  progressBarOuter.className = 'dialog-progress-bar';

  const progressBarInner = document.createElement('div');
  progressBarInner.className = 'dialog-progress-fill';
  progressBarOuter.appendChild(progressBarInner);

  const progressPercent = document.createElement('div');
  progressPercent.className = 'dialog-progress-text';
  progressPercent.textContent = '0%';
  progressBarOuter.appendChild(progressPercent);

  progressContainer.appendChild(progressBarOuter);
  scanSection.appendChild(progressContainer);

  content.appendChild(scanSection);

  // Create results section (initially hidden)
  const resultsSection = document.createElement('div');
  resultsSection.className = 'dialog-results-section hidden';
  content.appendChild(resultsSection);

  // Show the dialog
  dialog.show();

  // Add scan button to start the scan
  const scanButton = dialog.addFooterButton('Start Scan', async () => {
    // Disable scan button during scan
    scanButton.disabled = true;
    
    // Get the current checkbox value
    const includeSubfoldersValue = subfolderCheckbox.checked;
    
    // Start scanning
    try {
      progressText.textContent = 'Scanning for duplicate images...';
      progressBarInner.style.width = '50%';
      progressPercent.textContent = '50%';

      const response = await api.fetchApi('/sage_utils/find_duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder_path: folderPath,
          include_subfolders: includeSubfoldersValue
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to find duplicates');
      }

      // Update progress to complete
      progressBarInner.style.width = '100%';
      progressPercent.textContent = '100%';
      progressText.textContent = `Scan complete: ${result.total_images} images scanned`;

      // Hide scan section and show results
      setTimeout(() => {
        scanSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');
        displayDuplicates(resultsSection, result, dialog, folderPath, onComplete);
      }, 500);

    } catch (error) {
      progressText.textContent = 'Error: ' + error.message;
    progressText.classList.add('error');
    progressBarInner.classList.add('error');
      
      // Re-enable scan button on error
      scanButton.disabled = false;
    }
  }, { background: '#4CAF50' });

  dialog.addFooterButton('Cancel', () => {
    dialog.close();
    if (onComplete) onComplete();
  }, { background: '#666' });
}

/**
 * Display duplicate results and allow user to select which files to delete
 * @param {HTMLElement} container - Container element
 * @param {Object} result - Results from duplicate scan
 * @param {Object} dialog - Dialog object
 * @param {string} folderPath - Original folder path
 * @param {Function} onComplete - Callback function
 */
function displayDuplicates(container, result, dialog, folderPath, onComplete) {
  container.innerHTML = '';

  // Summary section
  const summary = document.createElement('div');
  summary.className = 'dialog-results-summary';

  if (result.duplicate_groups === 0) {
    summary.innerHTML = `
      <div class="dialog-summary-title">No duplicates found!</div>
      <div class="dialog-summary-message">All ${result.total_images} images in this folder are unique.</div>
    `;
    container.appendChild(summary);

    dialog.addFooterButton('Close', () => {
      dialog.close();
      if (onComplete) onComplete();
    }, { background: '#4CAF50' });

    return;
  }

  summary.innerHTML = `
    <div class="dialog-summary-title">Found ${result.duplicate_groups} duplicate group${result.duplicate_groups !== 1 ? 's' : ''}</div>
    <div class="dialog-summary-message">Total images scanned: ${result.total_images}<br>
      Total duplicate files: ${result.total_duplicates} (can be deleted)
    </div>
    <div class="dialog-summary-tip">Tip: For each group, keep one image and delete the rest. Uncheck any duplicates you want to keep.</div>
  `;
  container.appendChild(summary);

  // Duplicate groups
  const groupsContainer = document.createElement('div');
  groupsContainer.className = 'dialog-results-grid';

  // Track which images to delete (all duplicates except first by default)
  const imagesToDelete = new Set();

  result.duplicates.forEach((group, groupIndex) => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'dialog-group';

    const groupHeader = document.createElement('div');
    groupHeader.className = 'dialog-group-header';
    groupHeader.innerHTML = `
      <span>Duplicate Group ${groupIndex + 1} - ${group.length} copies (${group[0].size_human})</span>
      <button class="dialog-select-all-btn">Select All Duplicates</button>
    `;
    groupDiv.appendChild(groupHeader);

    const imageGrid = document.createElement('div');
    imageGrid.className = 'dialog-image-grid';

    group.forEach((image, index) => {
      const imageItem = createDuplicateImageItem(image, index === 0, (checked) => {
        if (checked) {
          imagesToDelete.add(image.path);
        } else {
          imagesToDelete.delete(image.path);
        }
        updateDeleteButton();
      });
      imageGrid.appendChild(imageItem);

      // Auto-select all duplicates except the first one
      if (index > 0) {
        imagesToDelete.add(image.path);
      }
    });

    groupDiv.appendChild(imageGrid);
    groupsContainer.appendChild(groupDiv);

    // Select all button functionality
    const selectAllBtn = groupHeader.querySelector('.select-all-btn');
    selectAllBtn.addEventListener('click', () => {
      group.forEach((image, index) => {
        if (index > 0) {
          const checkbox = imageGrid.children[index].querySelector('input[type="checkbox"]');
          checkbox.checked = true;
          imagesToDelete.add(image.path);
        }
      });
      updateDeleteButton();
    });
  });

  container.appendChild(groupsContainer);

  // Footer buttons
  const deleteButton = dialog.addFooterButton('Delete Selected (0)', async () => {
    await deleteDuplicates(Array.from(imagesToDelete), dialog, folderPath, onComplete);
  }, { background: '#d32f2f' });

  deleteButton.disabled = true;

  dialog.addFooterButton('Cancel', () => {
    dialog.close();
    if (onComplete) onComplete();
  }, { background: '#666' });

  // Update delete button text and state
  function updateDeleteButton() {
    const count = imagesToDelete.size;
    deleteButton.textContent = `Delete Selected (${count})`;
    deleteButton.disabled = count === 0;
  }

  // Initial update
  updateDeleteButton();
}

/**
 * Create a duplicate image item with checkbox
 * @param {Object} image - Image object
 * @param {boolean} isOriginal - Whether this is marked as the original
 * @param {Function} onToggle - Callback when checkbox is toggled
 * @returns {HTMLElement} Image item element
 */
function createDuplicateImageItem(image, isOriginal, onToggle) {
  const item = document.createElement('div');
  item.className = 'duplicate-image-item';
  if (isOriginal) {
    item.classList.add('duplicate-original');
  }

  // Thumbnail
  const thumbnail = document.createElement('div');
  thumbnail.className = 'duplicate-thumbnail';

  const img = document.createElement('img');
  img.className = 'duplicate-thumbnail-img';

  // Load thumbnail
  api.fetchApi('/sage_utils/thumbnail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_path: image.path,
      size: 'small'
    })
  }).then(response => {
    if (response.ok) {
      return response.blob();
    }
    throw new Error('Failed to load thumbnail');
  }).then(blob => {
    img.src = URL.createObjectURL(blob);
  }).catch(() => {
    thumbnail.innerHTML = '<div class="dialog-no-preview">No preview</div>';
  });

  thumbnail.appendChild(img);
  item.appendChild(thumbnail);

  // Info section
  const info = document.createElement('div');
  info.className = 'duplicate-info';

  const title = document.createElement('div');
  title.className = 'duplicate-info-title';
  title.title = image.filename;
  title.textContent = image.filename;

  const subtitle = document.createElement('div');
  subtitle.className = 'duplicate-info-subtitle';
  subtitle.textContent = image.size_human;

  info.appendChild(title);
  info.appendChild(subtitle);
  item.appendChild(info);

  // Checkbox section
  const checkboxContainer = document.createElement('div');
  checkboxContainer.className = 'duplicate-checkbox-row';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = !isOriginal;
  checkbox.disabled = isOriginal;
  checkbox.className = 'sage-checkbox-input';

  const label = document.createElement('label');
  label.className = `duplicate-checkbox-label ${isOriginal ? 'keep' : 'delete'}`;
  label.textContent = isOriginal ? 'Keep (Original)' : 'Delete';

  if (!isOriginal) {
    checkbox.addEventListener('change', (e) => {
      onToggle(e.target.checked);
      item.classList.toggle('duplicate-selected', e.target.checked);
    });

    label.addEventListener('click', () => {
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event('change'));
    });
  }

  checkboxContainer.appendChild(checkbox);
  checkboxContainer.appendChild(label);
  item.appendChild(checkboxContainer);

  // Set initial state for checked items
  if (!isOriginal && checkbox.checked) {
    item.classList.add('duplicate-selected');
  }

  return item;
}

/**
 * Delete selected duplicate images
 * @param {Array<string>} imagePaths - Array of image paths to delete
 * @param {Object} dialog - Dialog object
 * @param {string} folderPath - Original folder path
 * @param {Function} onComplete - Callback function
 */
async function deleteDuplicates(imagePaths, dialog, folderPath, onComplete) {
  if (imagePaths.length === 0) {
    return;
  }

  // Show confirmation dialog
  const confirmMessage = `
    Are you sure you want to delete ${imagePaths.length} duplicate image${imagePaths.length !== 1 ? 's' : ''}?
    <br><br>
    <strong class="dialog-warning-text">This action cannot be undone!</strong>
  `;

  const confirmed = await showConfirmDialog(confirmMessage);
  if (!confirmed) {
    return;
  }

  // Show progress
  const progressOverlay = document.createElement('div');
  progressOverlay.className = 'dialog-progress-overlay';

  const progressText = document.createElement('div');
  progressText.className = 'dialog-progress-overlay-text';
  progressText.textContent = 'Deleting duplicates...';
  progressOverlay.appendChild(progressText);

  const progressBarOuter = document.createElement('div');
  progressBarOuter.className = 'dialog-progress-overlay-bar';

  const progressBarInner = document.createElement('div');
  progressBarInner.className = 'dialog-progress-overlay-fill';
  progressBarOuter.appendChild(progressBarInner);

  progressOverlay.appendChild(progressBarOuter);
  dialog.contentArea.classList.add('dialog-content--relative');
  dialog.contentArea.appendChild(progressOverlay);

  try {
    const response = await api.fetchApi('/sage_utils/delete_images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_paths: imagePaths
      })
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const result = await response.json();

    progressBarInner.style.width = '100%';

    // Show results
    setTimeout(async () => {
      progressOverlay.remove();

      if (result.deleted > 0) {
        await showAlertDialog(`
          Successfully deleted ${result.deleted} duplicate image${result.deleted !== 1 ? 's' : ''}!
          ${result.failed > 0 ? `<br><br><span class="dialog-warning-text">Failed to delete ${result.failed} file${result.failed !== 1 ? 's' : ''}.</span>` : ''}
        `, 'Deletion Complete');
      } else {
        await showAlertDialog('No files were deleted.', 'Deletion Failed');
      }

      dialog.close();
      if (onComplete) onComplete();
    }, 500);

  } catch (error) {
    progressOverlay.remove();
    handleError(error, 'Failed to delete duplicates');
    await showAlertDialog(`Error: ${error.message}`, 'Deletion Failed');
  }
}

/**
 * Show confirmation dialog
 * @param {string} message - Message to display
 * @returns {Promise<boolean>} True if confirmed
 */
async function showConfirmDialog(message) {
  return new Promise((resolve) => {
    const confirmDialog = createDialog({
      title: 'Confirm Deletion',
      content: `<div class="dialog-confirm-message">${message}</div>`,
      width: '450px',
      onClose: () => resolve(false)
    });

    confirmDialog.addFooterButton('Cancel', () => {
      confirmDialog.close();
      resolve(false);
    }, { background: '#666' });

    confirmDialog.addFooterButton('Delete', () => {
      confirmDialog.close();
      resolve(true);
    }, { background: '#d32f2f' });

    confirmDialog.show();
  });
}

/**
 * Show alert dialog
 * @param {string} message - Message to display
 * @param {string} title - Dialog title
 * @returns {Promise<void>}
 */
async function showAlertDialog(message, title = 'Alert') {
  return new Promise((resolve) => {
    const alertDialog = createDialog({
      title: title,
      content: `<div class="dialog-alert-message">${message}</div>`,
      width: '400px',
      onClose: () => resolve()
    });

    alertDialog.addFooterButton('OK', () => {
      alertDialog.close();
      resolve();
    }, { background: '#4CAF50' });

    alertDialog.show();
  });
}

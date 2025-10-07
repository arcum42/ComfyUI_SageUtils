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
  content.style.cssText = `
    min-width: 800px;
    max-width: 1000px;
    min-height: 500px;
  `;

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
  scanSection.style.cssText = `
    margin-bottom: 20px;
    padding: 15px;
    background: #1e1e1e;
    border-radius: 6px;
    border: 1px solid #444;
  `;

  const folderInfo = document.createElement('div');
  folderInfo.style.cssText = 'color: #ccc; margin-bottom: 10px; font-size: 13px;';
  folderInfo.innerHTML = `
    <div style="margin-bottom: 8px;"><strong>Scanning folder:</strong> ${folderPath}</div>
  `;
  scanSection.appendChild(folderInfo);

  // Add checkbox for including subfolders
  const subfolderCheckboxContainer = document.createElement('div');
  subfolderCheckboxContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 15px;
  `;

  const subfolderCheckbox = document.createElement('input');
  subfolderCheckbox.type = 'checkbox';
  subfolderCheckbox.id = 'include-subfolders-checkbox';
  subfolderCheckbox.checked = includeSubfolders;
  subfolderCheckbox.style.cssText = 'cursor: pointer;';

  const subfolderLabel = document.createElement('label');
  subfolderLabel.htmlFor = 'include-subfolders-checkbox';
  subfolderLabel.textContent = 'Include subfolders in scan';
  subfolderLabel.style.cssText = `
    color: #ccc;
    font-size: 13px;
    cursor: pointer;
    user-select: none;
  `;

  subfolderCheckboxContainer.appendChild(subfolderCheckbox);
  subfolderCheckboxContainer.appendChild(subfolderLabel);
  scanSection.appendChild(subfolderCheckboxContainer);

  const progressContainer = document.createElement('div');
  progressContainer.style.cssText = `
    margin-top: 15px;
    padding: 12px;
    background: #2a2a2a;
    border-radius: 4px;
    border: 1px solid #555;
  `;

  const progressText = document.createElement('div');
  progressText.style.cssText = 'color: #4CAF50; margin-bottom: 8px; font-size: 14px;';
  progressText.textContent = 'Initializing scan...';
  progressContainer.appendChild(progressText);

  const progressBarOuter = document.createElement('div');
  progressBarOuter.style.cssText = `
    width: 100%;
    height: 20px;
    background: #333;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #555;
    position: relative;
  `;

  const progressBarInner = document.createElement('div');
  progressBarInner.style.cssText = `
    width: 0%;
    height: 100%;
    background: linear-gradient(90deg, #4CAF50, #66BB6A);
    transition: width 0.3s ease;
  `;
  progressBarOuter.appendChild(progressBarInner);

  const progressPercent = document.createElement('div');
  progressPercent.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 11px;
    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
  `;
  progressPercent.textContent = '0%';
  progressBarOuter.appendChild(progressPercent);

  progressContainer.appendChild(progressBarOuter);
  scanSection.appendChild(progressContainer);

  content.appendChild(scanSection);

  // Create results section (initially hidden)
  const resultsSection = document.createElement('div');
  resultsSection.style.cssText = 'display: none;';
  content.appendChild(resultsSection);

  // Show the dialog
  dialog.show();

  // Add scan button to start the scan
  const scanButton = dialog.addFooterButton('Start Scan', async () => {
    // Disable scan button during scan
    scanButton.disabled = true;
    scanButton.style.opacity = '0.5';
    scanButton.style.cursor = 'not-allowed';
    
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
        scanSection.style.display = 'none';
        resultsSection.style.display = 'block';
        displayDuplicates(resultsSection, result, dialog, folderPath, onComplete);
      }, 500);

    } catch (error) {
      progressText.textContent = 'Error: ' + error.message;
      progressText.style.color = '#f44336';
      progressBarInner.style.background = '#f44336';
      handleError(error, 'Failed to scan for duplicates');
      
      // Re-enable scan button on error
      scanButton.disabled = false;
      scanButton.style.opacity = '1';
      scanButton.style.cursor = 'pointer';
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
  summary.style.cssText = `
    padding: 15px;
    background: #1e1e1e;
    border-radius: 6px;
    border: 1px solid #444;
    margin-bottom: 20px;
  `;

  if (result.duplicate_groups === 0) {
    summary.innerHTML = `
      <div style="color: #4CAF50; font-size: 16px; font-weight: bold; margin-bottom: 10px;">
        No duplicates found!
      </div>
      <div style="color: #ccc; font-size: 13px;">
        All ${result.total_images} images in this folder are unique.
      </div>
    `;
    container.appendChild(summary);

    dialog.addFooterButton('Close', () => {
      dialog.close();
      if (onComplete) onComplete();
    }, { background: '#4CAF50' });

    return;
  }

  summary.innerHTML = `
    <div style="color: #ff9800; font-size: 16px; font-weight: bold; margin-bottom: 10px;">
      Found ${result.duplicate_groups} duplicate group${result.duplicate_groups !== 1 ? 's' : ''}
    </div>
    <div style="color: #ccc; font-size: 13px;">
      Total images scanned: ${result.total_images}<br>
      Total duplicate files: ${result.total_duplicates} (can be deleted)
    </div>
    <div style="color: #888; font-size: 12px; margin-top: 8px; font-style: italic;">
      Tip: For each group, keep one image and delete the rest. Uncheck any duplicates you want to keep.
    </div>
  `;
  container.appendChild(summary);

  // Duplicate groups
  const groupsContainer = document.createElement('div');
  groupsContainer.style.cssText = `
    max-height: 450px;
    overflow-y: auto;
    padding: 10px;
    background: #2a2a2a;
    border-radius: 6px;
    border: 1px solid #444;
  `;

  // Track which images to delete (all duplicates except first by default)
  const imagesToDelete = new Set();

  result.duplicates.forEach((group, groupIndex) => {
    const groupDiv = document.createElement('div');
    groupDiv.style.cssText = `
      margin-bottom: 20px;
      padding: 15px;
      background: #1e1e1e;
      border-radius: 6px;
      border: 1px solid #555;
    `;

    const groupHeader = document.createElement('div');
    groupHeader.style.cssText = `
      font-weight: bold;
      color: #fff;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #444;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    groupHeader.innerHTML = `
      <span>Duplicate Group ${groupIndex + 1} - ${group.length} copies (${group[0].size_human})</span>
      <button class="select-all-btn" style="
        padding: 4px 12px;
        background: #666;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      ">Select All Duplicates</button>
    `;
    groupDiv.appendChild(groupHeader);

    const imageGrid = document.createElement('div');
    imageGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 10px;
    `;

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
  deleteButton.style.opacity = '0.5';
  deleteButton.style.cursor = 'not-allowed';

  dialog.addFooterButton('Cancel', () => {
    dialog.close();
    if (onComplete) onComplete();
  }, { background: '#666' });

  // Update delete button text and state
  function updateDeleteButton() {
    const count = imagesToDelete.size;
    deleteButton.textContent = `Delete Selected (${count})`;
    deleteButton.disabled = count === 0;
    deleteButton.style.opacity = count === 0 ? '0.5' : '1';
    deleteButton.style.cursor = count === 0 ? 'not-allowed' : 'pointer';
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
  item.style.cssText = `
    background: #2a2a2a;
    border: 2px solid ${isOriginal ? '#4CAF50' : '#555'};
    border-radius: 6px;
    padding: 8px;
    position: relative;
    display: flex;
    flex-direction: column;
  `;

  // Thumbnail
  const thumbnail = document.createElement('div');
  thumbnail.style.cssText = `
    width: 100%;
    height: 120px;
    background: #1e1e1e;
    border-radius: 4px;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  `;

  const img = document.createElement('img');
  img.style.cssText = `
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  `;

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
    thumbnail.innerHTML = '<div style="color: #888; font-size: 12px;">No preview</div>';
  });

  thumbnail.appendChild(img);
  item.appendChild(thumbnail);

  // Info section
  const info = document.createElement('div');
  info.style.cssText = 'color: #ccc; font-size: 11px; margin-bottom: 8px;';
  info.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 3px; overflow: hidden; text-overflow: ellipsis;" title="${image.filename}">
      ${image.filename}
    </div>
    <div style="color: #888;">${image.size_human}</div>
  `;
  item.appendChild(info);

  // Checkbox section
  const checkboxContainer = document.createElement('div');
  checkboxContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: auto;
  `;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = !isOriginal;
  checkbox.disabled = isOriginal;
  checkbox.style.cssText = 'cursor: pointer;';

  const label = document.createElement('label');
  label.style.cssText = `
    color: ${isOriginal ? '#4CAF50' : '#fff'};
    font-size: 11px;
    cursor: ${isOriginal ? 'default' : 'pointer'};
    user-select: none;
  `;
  label.textContent = isOriginal ? 'Keep (Original)' : 'Delete';

  if (!isOriginal) {
    checkbox.addEventListener('change', (e) => {
      onToggle(e.target.checked);
      item.style.borderColor = e.target.checked ? '#d32f2f' : '#555';
    });

    label.addEventListener('click', () => {
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event('change'));
    });
  }

  checkboxContainer.appendChild(checkbox);
  checkboxContainer.appendChild(label);
  item.appendChild(checkboxContainer);

  // Set initial border color for checked items
  if (!isOriginal && checkbox.checked) {
    item.style.borderColor = '#d32f2f';
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
    <strong style="color: #ff9800;">This action cannot be undone!</strong>
  `;

  const confirmed = await showConfirmDialog(confirmMessage);
  if (!confirmed) {
    return;
  }

  // Show progress
  const progressOverlay = document.createElement('div');
  progressOverlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    z-index: 1000;
  `;

  const progressText = document.createElement('div');
  progressText.style.cssText = 'color: #4CAF50; font-size: 16px; margin-bottom: 15px;';
  progressText.textContent = 'Deleting duplicates...';
  progressOverlay.appendChild(progressText);

  const progressBarOuter = document.createElement('div');
  progressBarOuter.style.cssText = `
    width: 300px;
    height: 24px;
    background: #333;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #555;
    position: relative;
  `;

  const progressBarInner = document.createElement('div');
  progressBarInner.style.cssText = `
    width: 0%;
    height: 100%;
    background: linear-gradient(90deg, #4CAF50, #66BB6A);
    transition: width 0.3s ease;
  `;
  progressBarOuter.appendChild(progressBarInner);

  progressOverlay.appendChild(progressBarOuter);
  dialog.contentArea.style.position = 'relative';
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
          ${result.failed > 0 ? `<br><br><span style="color: #ff9800;">Failed to delete ${result.failed} file${result.failed !== 1 ? 's' : ''}.</span>` : ''}
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
      content: `<div style="font-size: 14px; line-height: 1.6;">${message}</div>`,
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
      content: `<div style="font-size: 14px; line-height: 1.6;">${message}</div>`,
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

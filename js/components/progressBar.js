/**
 * Progress Bar Components
 * Centralized progress bar implementations for various UI contexts
 */

import { createDialog } from './dialogManager.js';
import { loadComponentStyles as ensureComponentStyles } from './styleLoader.js';

console.log('[SageUtils] progressBar.js imported');

function loadComponentStyles() {
  ensureComponentStyles('progressBar.js');
}

/**
 * Create a basic progress bar component
 * @param {string} [labelText='Progress...'] - Label text for the progress bar
 * @returns {Object} Progress bar component with container and control methods
 */
export function createProgressBar(labelText = 'Progress...') {
  loadComponentStyles();

  const container = document.createElement('div');
  container.classList.add('sage-progress-container');

  const label = document.createElement('div');
  label.classList.add('sage-progress-label');
  label.textContent = labelText;

  const barOuter = document.createElement('div');
  barOuter.classList.add('sage-progress-bar-outer');

  const barInner = document.createElement('div');
  barInner.classList.add('sage-progress-bar-inner');

  const text = document.createElement('div');
  text.classList.add('sage-progress-text');
  text.textContent = '0%';

  barInner.appendChild(text);
  barOuter.appendChild(barInner);
  container.appendChild(label);
  container.appendChild(barOuter);

  return {
    container,
    show: () => container.classList.add('open'),
    hide: () => container.classList.remove('open'),
    update: (percent) => {
      const clamped = Math.max(0, Math.min(100, percent));
      barInner.style.setProperty('--sage-progress-width', `${clamped}%`);
      text.textContent = `${Math.round(clamped)}%`;
    },
    setLabel: (newLabel) => label.textContent = newLabel
  };
}

/**
 * Create a progress dialog
 * @param {string} [title='Progress'] - Dialog title
 * @param {string} [initialMessage='Processing...'] - Initial progress message
 * @returns {Object} - Dialog object with updateProgress method
 */
export function createProgressDialog(title = 'Progress', initialMessage = 'Processing...') {
  loadComponentStyles();

  const progressContainer = document.createElement('div');
  progressContainer.classList.add('sage-progress-dialog-body');

  const messageElement = document.createElement('div');
  messageElement.classList.add('sage-progress-dialog-msg');
  messageElement.textContent = initialMessage;

  const progressBarContainer = document.createElement('div');
  progressBarContainer.classList.add('sage-progress-dialog-bar');

  const progressBar = document.createElement('div');
  progressBar.classList.add('sage-progress-dialog-fill');

  const progressText = document.createElement('div');
  progressText.classList.add('sage-progress-dialog-text');
  progressText.textContent = '0%';

  progressBarContainer.appendChild(progressBar);
  progressBarContainer.appendChild(progressText);

  progressContainer.appendChild(messageElement);
  progressContainer.appendChild(progressBarContainer);

  const dialog = createDialog({
    title,
    content: progressContainer,
    width: '450px',
    height: 'auto',
    showFooter: false,
    closable: false // Prevent manual closing during progress
  });

  // Add updateProgress method to dialog
  dialog.updateProgress = (percentage, message) => {
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    progressBar.style.setProperty('--sage-progress-width', `${clampedPercentage}%`);
    if (message) {
      messageElement.textContent = message;
    }

    // Add pulse effect for active progress
    if (clampedPercentage < 100) {
      progressBar.classList.add('sage-progress-pulse');
      progressBar.classList.remove('sage-inline-progress-complete');
      messageElement.classList.remove('sage-progress-dialog-msg--success');
    } else {
      progressBar.classList.remove('sage-progress-pulse');
      progressBar.classList.add('sage-inline-progress-complete');
      messageElement.classList.add('sage-progress-dialog-msg--success');
    }
  };

  return dialog;
}

/**
 * Create an inline progress bar component for embedding in UI
 * @param {Object} [options={}] - Configuration options
 * @param {string} [options.title] - Progress title
 * @param {string} [options.initialMessage] - Initial progress message
 * @param {boolean} [options.showPercentage] - Whether to show percentage text
 * @returns {Object} - Progress component with container and control methods
 */
export function createInlineProgressBar(options = {}) {
  loadComponentStyles();

  const {
    title = 'Progress',
    initialMessage = 'Processing...',
    showPercentage = true
  } = options;

  const container = document.createElement('div');
  container.classList.add('sage-inline-progress-container');

  const titleElement = document.createElement('div');
  titleElement.classList.add('sage-inline-progress-title');
  titleElement.textContent = title;

  const messageElement = document.createElement('div');
  messageElement.classList.add('sage-inline-progress-message');
  messageElement.textContent = initialMessage;

  const progressBarContainer = document.createElement('div');
  progressBarContainer.classList.add('sage-inline-progress-bar');

  const progressBar = document.createElement('div');
  progressBar.classList.add('sage-inline-progress-fill');

  let progressText = null;
  if (showPercentage) {
    progressText = document.createElement('div');
    progressText.classList.add('sage-inline-progress-text');
    progressText.textContent = '0%';
    progressBarContainer.appendChild(progressText);
  }

  progressBarContainer.appendChild(progressBar);

  container.appendChild(titleElement);
  container.appendChild(messageElement);
  container.appendChild(progressBarContainer);

  // Control methods
  const component = {
    container,
    
    show() {
      container.classList.add('open');
    },
    
    hide() {
      container.classList.remove('open');
    },
    
    updateProgress(percentage, message) {
      const clampedPercentage = Math.max(0, Math.min(100, percentage));
      progressBar.style.setProperty('--sage-progress-width', `${clampedPercentage}%`);
      
      if (progressText) {
        progressText.textContent = `${Math.round(clampedPercentage)}%`;
      }
      
      if (message) {
        messageElement.textContent = message;
      }
      
      // Visual feedback for progress state
      if (clampedPercentage < 100) {
        progressBar.classList.add('sage-inline-progress-active');
        progressBar.classList.remove('sage-inline-progress-complete');
      } else {
        progressBar.classList.remove('sage-inline-progress-active');
        progressBar.classList.add('sage-inline-progress-complete');
      }
    },
    
    updateTitle(newTitle) {
      titleElement.textContent = newTitle;
    },
    
    updateMessage(message) {
      messageElement.textContent = message;
    },
    
    reset() {
      progressBar.style.setProperty('--sage-progress-width', '0%');
      if (progressText) {
        progressText.textContent = '0%';
      }
      messageElement.textContent = initialMessage;
      progressBar.classList.remove('sage-inline-progress-active', 'sage-inline-progress-complete');
    }
  };

  return component;
}

/**
 * Create a dataset-specific progress dialog with image preview
 * @param {string} [title='Generating Descriptions'] - Dialog title
 * @returns {Object} - Dialog with progress tracking and preview elements
 */
export function createDatasetProgressDialog(title = 'Generating Descriptions') {
  loadComponentStyles();

  const progressOverlay = document.createElement('div');
  progressOverlay.classList.add('sage-progress-overlay');

  const progressDialog = document.createElement('div');
  progressDialog.classList.add('sage-progress-dialog');

  const progressTitle = document.createElement('h3');
  progressTitle.textContent = title;
  progressTitle.classList.add('sage-progress-title');

  const progressText = document.createElement('div');
  progressText.classList.add('sage-progress-dialog-msg');
  progressText.textContent = 'Processing...';

  const progressBar = document.createElement('div');
  progressBar.classList.add('sage-progress-dialog-bar');

  const progressFill = document.createElement('div');
  progressFill.classList.add('sage-progress-dialog-fill');

  progressBar.appendChild(progressFill);

  const statusText = document.createElement('div');
  statusText.classList.add('sage-progress-status-text');

  // Preview container for image and text
  const previewContainer = document.createElement('div');
  previewContainer.classList.add('sage-preview-container');

  const previewLabel = document.createElement('div');
  previewLabel.classList.add('sage-preview-label');
  previewLabel.textContent = 'Last Generated';

  const imagePreview = document.createElement('img');
  imagePreview.classList.add('sage-image-preview');

  const textPreview = document.createElement('div');
  textPreview.classList.add('sage-text-preview');

  previewContainer.appendChild(previewLabel);
  previewContainer.appendChild(imagePreview);
  previewContainer.appendChild(textPreview);

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.classList.add('sage-progress-cancel-btn');

  progressDialog.appendChild(progressTitle);
  progressDialog.appendChild(progressText);
  progressDialog.appendChild(progressBar);
  progressDialog.appendChild(statusText);
  progressDialog.appendChild(previewContainer);
  progressDialog.appendChild(cancelBtn);

  progressOverlay.appendChild(progressDialog);

  // Close method
  const close = () => {
    if (progressOverlay.parentNode) {
      progressOverlay.parentNode.removeChild(progressOverlay);
    }
  };

  // Show method
  const show = () => {
    document.body.appendChild(progressOverlay);
  };

  return {
    dialog: progressOverlay,
    elements: {
      titleText: progressTitle,
      progressText,
      progressBar,
      progressFill,
      statusText,
      imagePreview,
      textPreview,
      cancelBtn
    },
    show,
    close
  };
}

/**
 * Create an inline HTML progress indicator (for quick inline use)
 * @param {number} current - Current progress value
 * @param {number} total - Total value
 * @param {string} [message=''] - Progress message
 * @returns {string} HTML string for progress display
 */
export function createInlineProgressHTML(current, total, message = '') {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  return `
    <div class="sage-inline-progress-html-title">Loading...</div>
    <div class="sage-inline-progress-html-message">${message || 'Processing...'}</div>
    <div class="sage-inline-progress-html-summary">
      ${current} / ${total} items
    </div>
    <div class="sage-inline-progress-html-bar">
      <div class="sage-inline-progress-html-fill" style="--sage-inline-progress-width: ${percentage}%;">${percentage}%</div>
    </div>
  `;
}

/**
 * Create a simple progress container for batch rendering
 * @param {Object} options - Configuration options
 * @param {string} [options.message='Loading...'] - Progress message
 * @returns {Object} Container element and update function
 */
export function createBatchProgressIndicator(options = {}) {
  const { message = 'Loading...' } = options;
  
  const progressContainer = document.createElement('div');
  progressContainer.classList.add('sage-batch-progress-container');

  const updateProgress = (processedCount, totalCount) => {
    const percentage = Math.round((processedCount / totalCount) * 100);
    progressContainer.innerHTML = `
      <div class="sage-batch-progress-summary">
        ${message} ${processedCount}/${totalCount} (${percentage}%)
      </div>
      <div class="sage-batch-progress-track">
        <div class="sage-batch-progress-fill" style="--sage-batch-progress-width: ${percentage}%;"></div>
      </div>
    `;
  };

  return {
    container: progressContainer,
    update: updateProgress
  };
}

/**
 * Progress Bar Components
 * Centralized progress bar implementations for various UI contexts
 */

import { createDialog } from './dialogManager.js';

/**
 * Create a basic progress bar component
 * @param {string} [labelText='Progress...'] - Label text for the progress bar
 * @returns {Object} Progress bar component with container and control methods
 */
export function createProgressBar(labelText = 'Progress...') {
  const container = document.createElement('div');
  container.style.cssText = `
    margin-top: 10px;
    display: none;
  `;

  const label = document.createElement('div');
  label.style.cssText = `
    color: #fff;
    font-size: 12px;
    margin-bottom: 5px;
  `;
  label.textContent = labelText;

  const barOuter = document.createElement('div');
  barOuter.style.cssText = `
    width: 100%;
    height: 20px;
    background: #333;
    border: 1px solid #555;
    border-radius: 4px;
    overflow: hidden;
  `;

  const barInner = document.createElement('div');
  barInner.style.cssText = `
    height: 100%;
    background: linear-gradient(90deg, #9C27B0, #E91E63);
    width: 0%;
    transition: width 0.3s ease;
    position: relative;
  `;

  const text = document.createElement('div');
  text.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 11px;
    font-weight: bold;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
  `;
  text.textContent = '0%';

  barInner.appendChild(text);
  barOuter.appendChild(barInner);
  container.appendChild(label);
  container.appendChild(barOuter);

  return {
    container,
    show: () => container.style.display = 'block',
    hide: () => container.style.display = 'none',
    update: (percent) => {
      const clamped = Math.max(0, Math.min(100, percent));
      barInner.style.width = `${clamped}%`;
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
  const progressContainer = document.createElement('div');
  progressContainer.style.cssText = `
    padding: 30px;
    min-width: 400px;
    text-align: center;
  `;

  const messageElement = document.createElement('div');
  messageElement.style.cssText = `
    margin-bottom: 20px;
    color: #fff;
    font-size: 14px;
    min-height: 20px;
  `;
  messageElement.textContent = initialMessage;

  const progressBarContainer = document.createElement('div');
  progressBarContainer.style.cssText = `
    width: 100%;
    height: 20px;
    background: #444;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 15px;
    position: relative;
  `;

  const progressBar = document.createElement('div');
  progressBar.style.cssText = `
    height: 100%;
    background: linear-gradient(90deg, #4CAF50, #66BB6A);
    width: 0%;
    transition: width 0.3s ease;
    border-radius: 10px;
  `;

  const progressText = document.createElement('div');
  progressText.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #fff;
    font-size: 12px;
    font-weight: bold;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
  `;
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
    progressBar.style.width = `${clampedPercentage}%`;
    progressText.textContent = `${Math.round(clampedPercentage)}%`;

    if (message) {
      messageElement.textContent = message;
    }

    // Add pulse effect for active progress
    if (clampedPercentage < 100) {
      progressBar.style.animation = 'progressPulse 2s ease-in-out infinite';
    } else {
      progressBar.style.animation = 'none';
      progressBar.style.background = '#4CAF50';
      messageElement.style.color = '#4CAF50';
    }
  };

  // Add CSS animation for progress bar pulse effect
  if (!document.getElementById('progress-bar-styles')) {
    const style = document.createElement('style');
    style.id = 'progress-bar-styles';
    style.textContent = `
      @keyframes progressPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
    `;
    document.head.appendChild(style);
  }

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
  const {
    title = 'Progress',
    initialMessage = 'Processing...',
    showPercentage = true
  } = options;

  const container = document.createElement('div');
  container.style.cssText = `
    background: #2a2a2a;
    border: 1px solid #555;
    border-radius: 8px;
    padding: 15px;
    margin: 10px 0;
    display: none;
    transition: all 0.3s ease;
  `;

  const titleElement = document.createElement('div');
  titleElement.style.cssText = `
    color: #fff;
    font-weight: bold;
    margin-bottom: 8px;
    font-size: 13px;
  `;
  titleElement.textContent = title;

  const messageElement = document.createElement('div');
  messageElement.style.cssText = `
    color: #ccc;
    font-size: 12px;
    margin-bottom: 12px;
    min-height: 16px;
  `;
  messageElement.textContent = initialMessage;

  const progressBarContainer = document.createElement('div');
  progressBarContainer.style.cssText = `
    width: 100%;
    height: 16px;
    background: #444;
    border-radius: 8px;
    overflow: hidden;
    position: relative;
  `;

  const progressBar = document.createElement('div');
  progressBar.style.cssText = `
    height: 100%;
    background: linear-gradient(90deg, #4CAF50, #66BB6A);
    width: 0%;
    transition: width 0.3s ease;
    border-radius: 8px;
  `;

  let progressText = null;
  if (showPercentage) {
    progressText = document.createElement('div');
    progressText.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #fff;
      font-size: 10px;
      font-weight: bold;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
      pointer-events: none;
    `;
    progressText.textContent = '0%';
    progressBarContainer.appendChild(progressText);
  }

  progressBarContainer.appendChild(progressBar);

  container.appendChild(titleElement);
  container.appendChild(messageElement);
  container.appendChild(progressBarContainer);

  // Add CSS animation for progress bar pulse effect if not already added
  if (!document.getElementById('inline-progress-styles')) {
    const style = document.createElement('style');
    style.id = 'inline-progress-styles';
    style.textContent = `
      @keyframes inlineProgressPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.8; }
      }
      .inline-progress-active {
        animation: inlineProgressPulse 2s ease-in-out infinite;
      }
      .inline-progress-complete {
        background: #4CAF50 !important;
        animation: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Control methods
  const component = {
    container,
    
    show() {
      container.style.display = 'block';
    },
    
    hide() {
      container.style.display = 'none';
    },
    
    updateProgress(percentage, message) {
      const clampedPercentage = Math.max(0, Math.min(100, percentage));
      progressBar.style.width = `${clampedPercentage}%`;
      
      if (progressText) {
        progressText.textContent = `${Math.round(clampedPercentage)}%`;
      }
      
      if (message) {
        messageElement.textContent = message;
      }
      
      // Visual feedback for progress state
      if (clampedPercentage < 100) {
        progressBar.classList.add('inline-progress-active');
        progressBar.classList.remove('inline-progress-complete');
      } else {
        progressBar.classList.remove('inline-progress-active');
        progressBar.classList.add('inline-progress-complete');
      }
    },
    
    updateTitle(newTitle) {
      titleElement.textContent = newTitle;
    },
    
    updateMessage(message) {
      messageElement.textContent = message;
    },
    
    reset() {
      progressBar.style.width = '0%';
      if (progressText) {
        progressText.textContent = '0%';
      }
      messageElement.textContent = initialMessage;
      progressBar.classList.remove('inline-progress-active', 'inline-progress-complete');
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
  const progressOverlay = document.createElement('div');
  progressOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  const progressDialog = document.createElement('div');
  progressDialog.style.cssText = `
    background: #2d2d2d;
    border-radius: 8px;
    padding: 20px;
    min-width: 500px;
    max-width: 700px;
    border: 1px solid #555;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  `;

  const progressTitle = document.createElement('h3');
  progressTitle.textContent = title;
  progressTitle.style.cssText = `
    color: #fff;
    margin: 0 0 15px 0;
    font-size: 16px;
  `;

  const progressText = document.createElement('div');
  progressText.style.cssText = `
    color: #fff;
    margin-bottom: 10px;
    font-size: 14px;
  `;
  progressText.textContent = 'Processing...';

  const progressBar = document.createElement('div');
  progressBar.style.cssText = `
    width: 100%;
    height: 20px;
    background: #555;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 15px;
  `;

  const progressFill = document.createElement('div');
  progressFill.style.cssText = `
    width: 0%;
    height: 100%;
    background: #4CAF50;
    transition: width 0.3s;
  `;

  progressBar.appendChild(progressFill);

  const statusText = document.createElement('div');
  statusText.style.cssText = `
    color: #aaa;
    font-size: 12px;
    margin-bottom: 15px;
    font-family: monospace;
  `;

  // Preview container for image and text
  const previewContainer = document.createElement('div');
  previewContainer.style.cssText = `
    background: #1a1a1a;
    border-radius: 4px;
    padding: 10px;
    margin-bottom: 15px;
    max-height: 300px;
    overflow-y: auto;
  `;

  const previewLabel = document.createElement('div');
  previewLabel.style.cssText = `
    color: #888;
    font-size: 11px;
    margin-bottom: 8px;
    text-transform: uppercase;
  `;
  previewLabel.textContent = 'Last Generated';

  const imagePreview = document.createElement('img');
  imagePreview.style.cssText = `
    max-width: 100%;
    max-height: 150px;
    object-fit: contain;
    display: block;
    margin-bottom: 10px;
    border-radius: 4px;
  `;

  const textPreview = document.createElement('div');
  textPreview.style.cssText = `
    color: #ccc;
    font-size: 12px;
    line-height: 1.5;
    word-wrap: break-word;
  `;

  previewContainer.appendChild(previewLabel);
  previewContainer.appendChild(imagePreview);
  previewContainer.appendChild(textPreview);

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = `
    background: #f44336;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    width: 100%;
  `;

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
    <div style="font-size: 24px; margin-bottom: 15px;">Loading...</div>
    <div style="margin-bottom: 10px;">${message || 'Processing...'}</div>
    <div style="color: #ccc; font-size: 13px; margin-bottom: 15px;">
      ${current} / ${total} items
    </div>
    <div style="
      width: 100%;
      max-width: 400px;
      height: 24px;
      background: #333;
      border-radius: 12px;
      overflow: hidden;
      margin: 0 auto;
      border: 1px solid #555;
    ">
      <div style="
        width: ${percentage}%;
        height: 100%;
        background: linear-gradient(90deg, #4CAF50, #66BB6A);
        transition: width 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
      ">${percentage}%</div>
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
  progressContainer.style.cssText = `
    grid-column: 1 / -1;
    text-align: center;
    padding: 20px;
    background: #2a2a2a;
    border-radius: 6px;
    margin-bottom: 15px;
  `;

  const updateProgress = (processedCount, totalCount) => {
    const percentage = Math.round((processedCount / totalCount) * 100);
    progressContainer.innerHTML = `
      <div style="color: #4CAF50; margin-bottom: 10px;">
        ${message} ${processedCount}/${totalCount} (${percentage}%)
      </div>
      <div style="
        width: 100%;
        height: 8px;
        background: #333;
        border-radius: 4px;
        overflow: hidden;
      ">
        <div style="
          width: ${percentage}%;
          height: 100%;
          background: linear-gradient(90deg, #4CAF50, #66BB6A);
          transition: width 0.3s ease;
        "></div>
      </div>
    `;
  };

  return {
    container: progressContainer,
    update: updateProgress
  };
}

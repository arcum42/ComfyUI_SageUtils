// Widget utilities for Sage Utils nodes
// This file contains common widget creation and manipulation functions

import { ComfyWidgets } from "../../../../scripts/widgets.js";
import { renderMarkdown, ensureMarkdownStyles } from "../shared/markdown.js";
import { loadComponentStyles as ensureComponentStyles } from './styleLoader.js';

console.log('[SageUtils] display.js imported');

function loadComponentStyles() {
  ensureComponentStyles('display.js');
}

/**
 * Creates a basic text output widget for a node.
 * @param {Object} node - The node instance.
 * @param {Object} app - The ComfyUI app instance.
 * @param {string} widgetName - The name of the widget (default: "output").
 * @returns {Object} - The created widget.
 */
export function createTextOutputWidget(node, app, widgetName = "output") {
  let w = node.widgets?.find((w) => w.name === widgetName);
  
  if (!w) {
    w = ComfyWidgets["STRING"](
      node,
      widgetName,
      ["STRING", { multiline: true }],
      app
    ).widget;
    w.inputEl.readOnly = true;
    w.inputEl.classList.add('sage-text-output-widget');
  }
  
  return w;
}

/**
 * Updates a text widget with content, handling both arrays and strings.
 * @param {Object} widget - The widget to update.
 * @param {Object} message - The message object containing text.
 */
export function updateTextWidget(widget, message) {
  // Defensive: handle message["text"] as array or string
  if (Array.isArray(message["text"])) {
    widget.value = message["text"].join("");
  } else if (typeof message["text"] === "string") {
    widget.value = message["text"];
  } else {
    widget.value = String(message["text"] ?? "");
  }
}

/**
 * Sets up proper HTML markdown display for a text widget.
 * @param {Object} widget - The text widget.
 * @param {string} content - The markdown content to render.
 */
export function setupMarkdownDisplay(widget, content) {
  // Set the textarea value for fallback
  widget.value = content;
  
  console.log("Setting up markdown display, content length:", content.length);
  
  // Ensure widget is properly initialized
  if (!widget.inputEl) {
    console.warn("Widget inputEl not available, retrying in 100ms...");
    setTimeout(() => {
      if (widget.inputEl) {
        setupMarkdownDisplay(widget, content);
      } else {
        console.error("Widget still not initialized after delay, falling back to text display");
      }
    }, 100);
    return;
  }
  
  if (!widget.inputEl.parentElement) {
    console.warn("Widget parentElement not available, retrying in 100ms...");
    setTimeout(() => {
      if (widget.inputEl && widget.inputEl.parentElement) {
        setupMarkdownDisplay(widget, content);
      } else {
        console.error("Widget parent still not available after delay, falling back to text display");
      }
    }, 100);
    return;
  }
  
  console.log("Widget is properly initialized, proceeding with markdown setup");
  
  // Remove any existing markdown overlay
  if (widget.markdownOverlay) {
    widget.markdownOverlay.remove();
    widget.markdownOverlay = null;
    widget.inputEl?.classList.remove('sage-hidden-input');
  }
  
  loadComponentStyles();

  // Create markdown display overlay
  const markdownDiv = document.createElement('div');
  markdownDiv.classList.add('markdown-overlay');
  const renderedHTML = renderMarkdown(content);
  console.log("Rendered HTML length:", renderedHTML.length);
  markdownDiv.innerHTML = renderedHTML;
  
  console.log("Created markdown div with HTML:", markdownDiv.innerHTML.substring(0, 200) + "...");
  
  // Hide the textarea
  widget.inputEl.classList.add('sage-hidden-input');
  console.log("Hiding textarea for markdown overlay");
  
  // Make sure the parent has position relative for absolute positioning
  const parent = widget.inputEl.parentElement;
  if (getComputedStyle(parent).position === 'static') {
    parent.classList.add('sage-overlay-parent');
  }
  
  // Insert the overlay
  parent.appendChild(markdownDiv);
  console.log("Appended markdown overlay to parent, parent children count:", parent.children.length);
  
  // Store reference for cleanup
  widget.markdownOverlay = markdownDiv;
  
  // Add styles for markdown elements
  ensureMarkdownStyles();
  
  // Add a small delay to ensure the overlay is properly rendered
  setTimeout(() => {
    console.log("Final check - overlay visibility:", getComputedStyle(markdownDiv).visibility);
    console.log("Final check - overlay display:", getComputedStyle(markdownDiv).display);
    console.log("Final check - overlay z-index:", getComputedStyle(markdownDiv).zIndex);
  }, 100);
}

/**
 * Sets up image display for a text widget.
 * @param {Object} widget - The text widget.
 * @param {string} filename - The image filename to display.
 */
export function setupImageDisplay(widget, filename) {
  // Set the textarea value to show filename
  widget.value = `Displaying image: ${filename}`;
  
  if (widget.inputEl && widget.inputEl.parentElement) {
    // Remove any existing overlays
    const existingOverlay = widget.inputEl.parentElement.querySelector('.markdown-overlay, .image-overlay, .video-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
      widget.inputEl.classList.remove('sage-hidden-input');
    }
    
    // Create image display overlay
    const imageDiv = document.createElement('div');
    imageDiv.className = 'image-overlay';
    
    loadComponentStyles();

    // Create image element
    const img = document.createElement('img');
    img.classList.add('display-overlay-media');
    // Construct the URL for the image in the notes directory
    img.src = `/sage_utils/read_note?filename=${encodeURIComponent(filename)}`;
    img.alt = filename;
    
    imageDiv.appendChild(img);
    
    // Hide the textarea
    widget.inputEl.classList.add('sage-hidden-input');
    
    // Make sure the parent has position relative for absolute positioning
    const parent = widget.inputEl.parentElement;
    if (getComputedStyle(parent).position === 'static') {
      parent.classList.add('sage-overlay-parent');
    }
    
    // Insert the overlay
    parent.appendChild(imageDiv);
    
    // Store reference for cleanup
    widget.imageOverlay = imageDiv;
    
    // Handle image load errors
    img.onerror = function() {
      imageDiv.innerHTML = `
        <div class="display-error-container">
          <p class="display-error-heading">Failed to load image: ${filename}</p>
          <p class="display-error-text">Image may not exist or format may not be supported</p>
        </div>
      `;
    };
    
    // Handle successful image load
    img.onload = function() {
      console.log(`Successfully loaded image: ${filename}`);
    };
  }
}

/**
 * Sets up video display for a text widget.
 * @param {Object} widget - The text widget.
 * @param {string} filename - The video filename to display.
 * @param {boolean} isSupported - Whether the video format is browser-supported.
 */
export function setupVideoDisplay(widget, filename, isSupported = true) {
  // Set the textarea value to show filename
  widget.value = `Displaying video: ${filename}`;
  
  if (widget.inputEl && widget.inputEl.parentElement) {
    // Remove any existing overlays
    const existingOverlay = widget.inputEl.parentElement.querySelector('.markdown-overlay, .image-overlay, .video-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
      widget.inputEl.classList.remove('sage-hidden-input');
    }
    
    // Create video display overlay
    const videoDiv = document.createElement('div');
    videoDiv.className = 'video-overlay';
    
    if (!isSupported) {
      // Show format not supported message
      const extension = filename.split('.').pop().toUpperCase();
      videoDiv.innerHTML = `
        <div class="display-error-container">
          <h3 class="display-error-heading">Video Format Not Supported</h3>
          <p class="display-error-text"><strong>${filename}</strong></p>
          <p class="display-error-text">${extension} format is not supported by browsers.</p>
          <div class="display-error-box">
            <p class="display-error-item display-error-success">✅ Supported formats:</p>
            <p class="display-error-item">• MP4 (H.264/H.265) - Best compatibility</p>
            <p class="display-error-item">• WebM (VP8/VP9) - Good for web</p>
            <p class="display-error-item">• OGG (Theora) - Open source</p>
            <p class="display-error-item">• M4V - Apple format</p>
            <p class="display-error-item display-error-warning">❌ Unsupported formats:</p>
            <p class="display-error-item">• MKV, AVI, MOV, WMV, FLV</p>
          </div>
          <p class="display-error-text">Convert your video to MP4 or WebM for browser playback.</p>
        </div>
      `;
    } else {
      // Create video element for supported formats
      const video = document.createElement('video');
      video.classList.add('display-overlay-media');
      video.controls = true;
      video.preload = 'metadata';
      video.src = `/sage_utils/read_note?filename=${encodeURIComponent(filename)}`;
      
      videoDiv.appendChild(video);
      
      // Handle video load errors
      video.onerror = function() {
        videoDiv.innerHTML = `
        <div class="display-error-container">
          <h3 class="display-error-heading">Failed to load video: ${filename}</h3>
          <p class="display-error-text">The file may be corrupted or the codec may not be supported</p>
          <p class="display-error-text">Try converting to H.264 MP4 for best compatibility</p>
        </div>
      `;
      };
      
      // Handle successful video load
      video.onloadedmetadata = function() {
        console.log(`Successfully loaded video: ${filename} (${video.videoWidth}x${video.videoHeight})`);
      };
      
      // Handle when video data is loaded
      video.onloadeddata = function() {
        console.log(`Video data loaded for: ${filename}`);
      };
    }
    
    // Hide the textarea
    widget.inputEl.classList.add('sage-hidden-input');
    
    // Make sure the parent has position relative for absolute positioning
    const parent = widget.inputEl.parentElement;
    if (getComputedStyle(parent).position === 'static') {
      parent.classList.add('sage-overlay-parent');
    }
    
    // Insert the overlay
    parent.appendChild(videoDiv);
    
    // Store reference for cleanup
    widget.videoOverlay = videoDiv;
  }
}
